import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync, symlinkSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { inputFiles, prepareDataset, identityEvidence, json } from '../scripts/training-venues/prepare.mjs'
import { reviewedIdentityBindings } from '../scripts/training-venues/reviewed-identity-bindings.mjs'
import { geocodingFor, validateVenueResult } from '../scripts/training-venues/validate.mjs'
import { generate, generatedFiles } from '../scripts/prepare-training-venues.mjs'
import { providerDisplayLinks } from '../src/data/providerLinks.ts'

const root = resolve(import.meta.dirname, '..')
const inputDirectory = join(root, 'output/workflow/2026-11-06/training-venue-geocoding/inputs')
const hasInputs = inputFiles.every(([file]) => existsSync(join(inputDirectory, file)))
const privateTest = (name, fn) => test(name, { skip: hasInputs ? false : 'Private frozen research inputs absent.' }, fn)
const raw = hasInputs ? JSON.parse(readFileSync(join(inputDirectory, inputFiles[0][0]))) : null
const decision = hasInputs ? JSON.parse(readFileSync(join(inputDirectory, inputFiles[1][0]))) : null
const inputs = hasInputs ? inputFiles.map(([file, sha256]) => ({ file, sha256, bytes: readFileSync(join(inputDirectory, file)).length })) : []
const prepare = () => prepareDataset(raw, decision, JSON.parse(readFileSync(join(root, 'data/playon/4115-basketball.json'))), inputs, providerDisplayLinks)
const governmentDirectory = join(root, 'output/workflow/2026-11-06/training-venue-same-site-aliases')
const external = hasInputs ? { receipt: JSON.parse(readFileSync(join(governmentDirectory, 'government-result-provenance.json'))),
  resultBytes: readFileSync(join(governmentDirectory, 'inputs/government-results.csv')), validatedOn: '2026-11-06' } : null

privateTest('the three reviewed official identity chains remain valid alongside the approved training-address policy', () => {
  const prepared = prepare(), imported = geocodingFor(prepared, external)
  assert.deepEqual(imported.summary, { Accepted: 16, Ambiguous: 11, Rejected: 1, Pending: 30 })
  const expected = { PS027: [-27.69203784, 152.90831134, 'venue-level'], PS032: [-27.58734613, 153.11170009, 'campus-level'],
    'R2L-PS001': [-27.46989304, 153.08449395, 'campus-level'] }
  for (const [id, [latitude, longitude, precision]] of Object.entries(expected)) {
    const site = imported.sites.find(s => s.physicalSiteId === id)
    assert.equal(site.status, 'Accepted'); assert.equal(site.precision, precision)
    assert.deepEqual(site.acceptedCoordinates, { latitude, longitude })
    assert.deepEqual(site.acceptedCoordinates, site.candidateCoordinates)
    assert.equal(site.identityEvidence.length, 1)
    assert.equal(site.identityEvidence[0].schema, 'frozen-site-specific-research-chain-v1')
    assert.equal(site.identityEvidence[0].reviewedOn, '2026-11-11')
  }
  for (const id of ['PS003','PS009','PS066','PS070','PS071','PS072','PS075']) {
    const site = imported.sites.find(s => s.physicalSiteId === id)
    assert.equal(site.status, 'Accepted'); assert.deepEqual(site.acceptedCoordinates, site.candidateCoordinates)
    assert.deepEqual(site.identityEvidence, [])
    assert.equal(site.trainingAddressEvidence[0].sourceRole, 'club-published-address')
  }
  assert.ok(Object.isFrozen(reviewedIdentityBindings))
})

privateTest('every pinned identity evidence/source/venue/observation/access record fails closed if absent or altered', () => {
  const prepared = prepare(), imported = geocodingFor(prepared, external)
  for (const binding of reviewedIdentityBindings) {
    const site = prepared.inventory.find(s => s.physicalSiteId === binding.physicalSiteId)
    const row = imported.sites.find(s => s.physicalSiteId === binding.physicalSiteId).governmentEvidence.rawGovernmentRow
    for (const [collection, references] of Object.entries(binding.records)) for (const [id] of references) {
      for (const missing of [true, false]) {
        const context = { ...prepared.context, [collection]: new Map(prepared.context[collection]) }
        if (missing) context[collection].delete(id)
        else context[collection].set(id, { ...context[collection].get(id), injectedApproval: true })
        const result = validateVenueResult(site, row, context)
        assert.equal(result.status, 'Ambiguous', `${binding.physicalSiteId}/${collection}/${id}/${missing}`)
        assert.equal(result.acceptedCoordinates, null); assert.deepEqual(result.identityEvidence, [])
      }
    }
    for (const alteredSite of [{ ...site, address: { ...site.address, normalized: site.address.normalized + ' alternate' } },
      { ...site, venueIds: ['different-campus'] }, { ...site, venueIds: [...site.venueIds, 'different-campus'] },
      ...['streetAddress','suburb','postcode'].map(key => ({ ...site, address: { ...site.address, [key]: 'wrong' } })),
      { ...site, physicalSiteId: 'PS003' }]) {
      assert.deepEqual(identityEvidence(alteredSite, prepared.context), [])
    }
    const substitutedSite = { ...site, address: { ...site.address, streetAddress: '999 Wrong Road' } }
    assert.notEqual(validateVenueResult(substitutedSite, { ...row, 'Address to Validate': '999 Wrong Road',
      'Primary Address': '999 Wrong Road', FullAddress: `999 Wrong Road ${row.Locality} QLD ${row.Postcode}` }, prepared.context).status, 'Accepted')
    for (const overrides of [{ Confidence: '99' }, { GeocodeType: 'Street Midpoint' }, { Locality: 'Other' },
      { Postcode: '4000' }, { Latitude: '0', Longitude: '0' }, { 'Primary Address': '999 Wrong Road' },
      { 'Complex-Building Name': 'Another Campus' }, { Comment: 'Review required' }]) {
      assert.notEqual(validateVenueResult(site, { ...row, ...overrides }, prepared.context).status, 'Accepted')
    }
  }
})

privateTest('unmodified official pipeline outputs retain inode and mtime and unsafe unchanged targets still fail before writes', () => {
  const anchor = join(root, 'output/workflow/2026-11-06/training-venue-geocoding/generated-tests')
  mkdirSync(anchor, { recursive: true })
  const directory = mkdtempSync(join(anchor, 'identity-no-rewrite-')), output = join(directory, 'output')
  try {
    generate({ 'output-dir': output })
    const before = new Map(generatedFiles.map(file => [file, { bytes: readFileSync(join(output, file)), stat: statSync(join(output, file), { bigint: true }) }]))
    generate({ 'output-dir': output })
    for (const [file, original] of before) {
      const stat = statSync(join(output, file), { bigint: true })
      assert.equal(stat.ino, original.stat.ino); assert.equal(stat.mtimeNs, original.stat.mtimeNs)
      assert.deepEqual(readFileSync(join(output, file)), original.bytes)
    }
    // Late unsafe unchanged target prevents even an earlier stale output being replaced.
    writeFileSync(join(output, generatedFiles[0]), 'stale')
    const staleStat = statSync(join(output, generatedFiles[0]), { bigint: true })
    const target = generatedFiles.at(-1), sentinel = join(directory, 'owned-sentinel.json')
    writeFileSync(sentinel, before.get(target).bytes); rmSync(join(output, target)); symlinkSync(sentinel, join(output, target))
    assert.throws(() => generate({ 'output-dir': output }), /regular direct file|symlink/)
    assert.equal(readFileSync(join(output, generatedFiles[0]), 'utf8'), 'stale')
    assert.equal(statSync(join(output, generatedFiles[0]), { bigint: true }).ino, staleStat.ino)
    assert.deepEqual(readFileSync(sentinel), before.get(target).bytes)
    assert.ok(json(reviewedIdentityBindings).includes('R2L-E178'))
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
