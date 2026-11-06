import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, readdirSync, lstatSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { inputFiles, expectedBaseline, eligible, parseVenueAddress, addressConflicts, prepareDataset,
  candidatesFor, safeContacts, json } from '../scripts/training-venues/prepare.mjs'
import { geocodingFor, validateVenueResult, validateResultProvenance, verifyMapping } from '../scripts/training-venues/validate.mjs'
import { generate, projectPath, generatedFiles, resolveOutputPlan } from '../scripts/prepare-training-venues.mjs'
import { sha256 } from '../scripts/qld-geocoder/export.mjs'
import { parseCsv, reconcileResults, resultHeader } from '../scripts/qld-geocoder/compare.mjs'
import { providerDisplayLinks } from '../src/data/providerLinks.ts'
import { adaptPlayOnDataset, groupProviderLocations } from '../src/playOnProviders.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const evidence = resolve(root, 'output/workflow/2026-11-06/training-venue-geocoding')
const inputDirectory = join(evidence, 'inputs')
const hasInputs = inputFiles.every(([file]) => existsSync(join(inputDirectory, file)))
const privateTest = (name, fn) => test(name, { skip: hasInputs ? false : 'Exact private research snapshots are not present; see training-venue README.' }, fn)
const providerBaseline = JSON.parse(readFileSync(resolve(root, 'data/playon/4115-basketball.json')))
const inputs = hasInputs ? inputFiles.map(([file, digest]) => ({ file, sha256: digest, bytes: readFileSync(join(inputDirectory, file)).length })) : []
const raw = hasInputs ? JSON.parse(readFileSync(join(inputDirectory, inputFiles[0][0]))) : null
const decision = hasInputs ? JSON.parse(readFileSync(join(inputDirectory, inputFiles[1][0]))) : null
const prepared = hasInputs ? prepareDataset(raw, decision, providerBaseline, inputs, providerDisplayLinks) : null

function syntheticResult(site, overrides = {}) {
  const row = prepared.mapping.rows.find(row => row.physicalSiteId === site.physicalSiteId)
  return { ...Object.fromEntries(resultHeader.map(key => [key, ''])), InputIndex: String(row?.rowNumber ?? 1),
    'Address to Validate': site.address.streetAddress, LOCALITY: `${site.address.suburb} ${site.address.postcode}`,
    'Primary Address': site.address.streetAddress, Locality: site.address.suburb, Postcode: site.address.postcode,
    Longitude: '153.05', Latitude: '-27.50', GeocodeType: 'PC', Confidence: '100',
    FullAddress: `${site.address.streetAddress} ${site.address.suburb} QLD ${site.address.postcode}`, ...overrides }
}

function syntheticCsv(rows) {
  const escape = value => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
  return [resultHeader, ...rows.map(row => resultHeader.map(key => row[key]))].map(row => row.map(escape).join(',')).join('\r\n') + '\r\n'
}

test('address parser preserves ranges, suffixes, directions and intersections without inventing postcode', () => {
  const range = parseVenueAddress(' 94–120  Springwood Road, Rochedale South QLD 4123 ')
  assert.equal(range.streetAddress, '94-120 Springwood Road')
  assert.equal(range.suburb, 'Rochedale South')
  assert.equal(range.postcode, '4123')
  assert.equal(range.kind, 'numbered-street')
  assert.equal(range.exportable, true)
  assert.equal(parseVenueAddress('2A Ross Llewellyn Drive, Booval QLD 4304').streetAddress, '2A Ross Llewellyn Drive')
  assert.equal(parseVenueAddress('109 Weedon Street West, Mansfield QLD 4122').streetAddress, '109 Weedon Street West')
  const corner = parseVenueAddress('Corner Mount Cotton and Degan Roads, Capalaba QLD 4157')
  assert.equal(corner.kind, 'intersection')
  assert.equal(corner.exportable, true)
  assert.equal(corner.streetAddress, 'Corner Mount Cotton and Degan Roads')
  const partial = parseVenueAddress('3–27 Windemere Road, Alexandra Hills')
  assert.equal(partial.postcode, null)
  assert.equal(partial.exportable, false)
  assert.equal(partial.reason, 'missing-explicit-postcode')
  assert.equal(parseVenueAddress(null).reason, 'missing-address-text')
  assert.equal(parseVenueAddress('Name, South Street, Jimboomba QLD 4280').reason, 'named-address-incompatible-with-safe-unquoted-csv')
  assert.throws(() => parseVenueAddress('12 Example\nStreet, Sample QLD 4115'), /control character/)
})

test('strict ordinary-training selector excludes academy, skills, games, history and unconfirmed claims', () => {
  const base = { regularTrainingAssessment: { isRegularWeeklyTeamTraining: true, recommendedForParentReference: true,
    temporalStatus: 'Current Confirmed' } }
  assert.equal(eligible(base), true)
  for (const category of ['academy', 'skills', 'game-only', 'school-only', 'holiday-camp']) {
    assert.equal(eligible({ activity: category, regularTrainingAssessment: { ...base.regularTrainingAssessment,
      isRegularWeeklyTeamTraining: false } }), false)
  }
  for (const temporalStatus of ['Historical', 'Unconfirmed', 'Not Found']) {
    assert.equal(eligible({ regularTrainingAssessment: { ...base.regularTrainingAssessment, temporalStatus } }), false)
  }
  assert.equal(eligible({}), false)
})

test('safe contact projection uses accepted website/page types and rejects groups, posts and type mismatches', () => {
  assert.deepEqual(safeContacts([
    { type: 'independent_club_website', url: 'https://club.example.org/' },
    { type: 'facebook_page', url: 'https://www.facebook.com/OfficialClub' },
    { type: 'facebook_group', url: 'https://www.facebook.com/groups/123' },
    { type: 'facebook_page', url: 'https://www.facebook.com/OfficialClub/posts/123' },
    { type: 'facebook_page', url: 'https://evil.example.org/' },
    { type: 'independent_club_website', url: 'https://www.facebook.com/OfficialClub' },
    { type: 'unknown', url: 'https://club.example.org/' },
  ]), [{ type: 'facebook_page', url: 'https://www.facebook.com/OfficialClub' }, { type: 'website', url: 'https://club.example.org/' }])
})

privateTest('pinned inputs independently reconcile the complete 54/70/58 identity and temporal baseline', () => {
  inputFiles.forEach(([name, digest]) => assert.equal(sha256(readFileSync(join(inputDirectory, name))), digest))
  assert.deepEqual(prepared.context.baseline, expectedBaseline)
  assert.deepEqual(prepared.associations.map(a => a.associationId).sort(), decision.associationCandidates.map(a => a.associationId).sort())
  assert.equal(new Set(prepared.inventory.map(s => s.physicalSiteId)).size, 58)
  assert.equal(prepared.associations.filter(a => a.temporalClassification === 'Current Confirmed').length, 32)
  assert.equal(prepared.associations.filter(a => a.temporalClassification.startsWith('Official Listed')).length, 38)
  assert.equal(prepared.associations.filter(a => a.manualReviewRequired).length, 8)
  for (const a of prepared.associations) {
    const original = raw.providerVenueAssociations.find(row => row.associationId === a.associationId)
    assert.equal(original.regularTrainingAssessment.isRegularWeeklyTeamTraining, true)
    assert.equal(original.regularTrainingAssessment.recommendedForParentReference, true)
    assert.equal(a.teamAgeScope, original.regularTrainingAssessment.scope)
    for (const key of ['providerId', 'venueId', 'physicalSiteId']) assert.equal(a[key], original[key])
  }
})

privateTest('one physical site produces one upload row and retains every shared provider/association', () => {
  assert.equal(prepared.mapping.rows.length, 28)
  assert.equal(prepared.mapping.held.length, 30)
  assert.equal(new Set(prepared.mapping.rows.map(row => row.physicalSiteId)).size, 28)
  assert.equal(new Set([...prepared.mapping.rows, ...prepared.mapping.held].map(row => row.physicalSiteId)).size, 58)
  for (const site of prepared.inventory) {
    const related = prepared.associations.filter(a => a.physicalSiteId === site.physicalSiteId)
    assert.deepEqual(site.providerIds, [...new Set(related.map(a => a.providerId))].sort())
    assert.deepEqual(site.associationIds, related.map(a => a.associationId).sort())
  }
  assert.ok(prepared.inventory.some(s => s.providerIds.length > 1))
  assert.equal(prepared.mapping.rows.slice(0, 27).every(row => row.tier === 'A'), true)
  assert.equal(prepared.mapping.rows.at(-1).physicalSiteId, 'PS020')
  assert.equal(prepared.mapping.held.find(s => s.physicalSiteId === 'PS047').reason, 'named-address-incompatible-with-safe-unquoted-csv')
})

privateTest('batch bytes match the captured official header/CRLF/unquoted schema and deterministic mapping', () => {
  const official = readFileSync(resolve(root, 'tests/fixtures/qld-address-input-example.csv'), 'utf8')
  assert.equal(prepared.csv.split('\r\n')[0], official.split('\r\n')[0])
  assert.equal(prepared.csv.includes('"'), false)
  assert.equal(prepared.csv.replaceAll('\r\n', '').includes('\n'), false)
  const [header, ...rows] = parseCsv(Buffer.from(prepared.csv))
  assert.deepEqual(header, ['Address to Validate', 'LOCALITY'])
  prepared.mapping.rows.forEach(row => assert.deepEqual(rows[row.rowNumber - 1], [row.streetAddress, row.locality]))
  assert.equal(prepared.mapping.csv.sha256, sha256(prepared.csv))
})

privateTest('unresolved locality/range conflicts stay held while resolved historical conflicts are preserved', () => {
  for (const id of ['PS059', 'R2L-PS003']) {
    const site = prepared.inventory.find(s => s.physicalSiteId === id)
    assert.equal(site.preparedTier, 'E')
    assert.ok(site.unresolvedConflicts.length)
    assert.equal(site.address.exportable, false)
    const result = validateVenueResult(site, syntheticResult(site), prepared.context)
    assert.equal(result.status, 'Ambiguous')
    assert.equal(result.acceptedCoordinates, null)
  }
  for (const id of ['PS044', 'PS076']) {
    const site = prepared.inventory.find(s => s.physicalSiteId === id)
    assert.equal(site.preparedTier, 'A')
    assert.equal(site.unresolvedConflicts.length, 0)
    assert.ok(site.conflictHistory[0].historical.length)
    assert.ok(site.conflictHistory[0].resolutions.length)
  }
  const unknown = addressConflicts({ formatted: '12 Example Street', conflicts: [{ sourceValues: ['a', 'b'] }] })
  assert.equal(unknown.unresolved.length, 1)
})

privateTest('offline C/D inventory remains intact with inspected evidence and honest zero completion', () => {
  assert.equal(prepared.preparation.summary.addressesImproved, 0)
  assert.deepEqual(prepared.preparation.summary.originalTiers, prepared.preparation.summary.preparedTiers)
  for (const site of prepared.inventory.filter(s => ['C', 'D'].includes(s.originalTier))) {
    assert.equal(site.address.exportable, false)
    assert.equal(site.addressChanged, false)
    assert.equal(site.offlineAddressReview.networkLookupPerformed, false)
    assert.ok(site.offlineAddressReview.reason)
    assert.equal(site.offlineAddressReview.evidenceIdsInspected.length > 0, true)
    if (site.originalTier === 'D') assert.equal(site.address.normalized, null)
    if (site.originalTier === 'C') assert.equal(site.address.postcode, null)
  }
})

privateTest('generation is byte deterministic across reordered raw arrays and decision inventories', () => {
  const reordered = structuredClone(raw), decisionReordered = structuredClone(decision)
  for (const key of ['providers', 'venues', 'physicalSites', 'providerVenueAssociations', 'sources', 'evidence']) reordered[key].reverse()
  decisionReordered.associationCandidates.reverse(); decisionReordered.physicalSiteInventory.reverse()
  const again = prepareDataset(reordered, decisionReordered, [...providerBaseline].reverse(), inputs, providerDisplayLinks)
  for (const key of ['inventory', 'associations', 'csv', 'mapping', 'preparation']) assert.deepEqual(again[key], prepared[key])
})

privateTest('baseline, exact-ID, evidence and activity drift fail closed rather than changing coverage', () => {
  for (const mutate of [
    r => r.providers.pop(), r => r.providerVenueAssociations.find(eligible).regularTrainingAssessment.isRegularWeeklyTeamTraining = false,
    r => r.providerVenueAssociations.find(eligible).physicalSiteId = 'PS-no-such-site',
    r => r.evidence.splice(r.evidence.findIndex(e => e.evidenceId === prepared.associations[0].evidenceIds[0]), 1),
  ]) {
    const changed = structuredClone(raw); mutate(changed)
    assert.throws(() => prepareDataset(changed, decision, providerBaseline, inputs))
  }
  const changedDecision = structuredClone(decision)
  changedDecision.associationCandidates[0].venueId = 'wrong-campus'
  assert.throws(() => prepareDataset(raw, changedDecision, providerBaseline, inputs), /mapping mismatch/)
})

privateTest('no external results means 58 Pending records and zero candidate/accepted coordinates', () => {
  const results = geocodingFor(prepared)
  assert.deepEqual(results.summary, { Accepted: 0, Ambiguous: 0, Rejected: 0, Pending: 58 })
  assert.equal(results.governmentResultProvenance, null)
  for (const site of results.sites) {
    assert.equal(site.candidateCoordinates, null)
    assert.equal(site.acceptedCoordinates, null)
    assert.ok(site.reasons.length)
  }
  const slim = candidatesFor(prepared, results)
  assert.equal(slim.venues.length, 58)
  assert.equal(slim.providers.length, 54)
  assert.equal(slim.associations.length, 70)
  assert.equal(slim.providers.filter(p => !p.physicalSiteIds.length).length, 24)
  assert.equal(slim.venues.every(v => v.coordinates === null), true)
})

privateTest('synthetic exact official campus matches require independent source-bound identity evidence', () => {
  const school = prepared.inventory.find(s => s.physicalSiteId === 'PS005')
  const matched = validateVenueResult(school, syntheticResult(school, { 'Complex-Building Name': 'Iona College' }), prepared.context)
  assert.equal(matched.status, 'Accepted')
  assert.equal(matched.precision, 'campus-level')
  assert.deepEqual(matched.acceptedCoordinates, { latitude: -27.5, longitude: 153.05 })
  assert.ok(matched.identityEvidence.some(e => e.evidenceId === 'P2-E023' && e.sourceId === 'P2-S036' && e.evidenceSha256))
  const unbound = prepared.inventory.find(s => s.physicalSiteId === 'PS003')
  const noIdentity = validateVenueResult({ ...unbound, identityEvidence: [{ reviewed: true, official: true }] }, syntheticResult(unbound), prepared.context)
  assert.equal(noIdentity.status, 'Ambiguous')
  assert.equal(noIdentity.acceptedCoordinates, null)
  const tampered = { ...prepared.context, sources: new Map(prepared.context.sources) }
  tampered.sources.set('P2-S036', { ...tampered.sources.get('P2-S036'), url: 'https://unrelated.eq.edu.au/' })
  assert.equal(validateVenueResult(school, syntheticResult(school), tampered).status, 'Ambiguous')
})

privateTest('wrong campuses/neighbouring venues and locality/postcode mismatches are rejected at confidence 100', () => {
  const site = prepared.inventory.find(s => s.physicalSiteId === 'PS005')
  for (const overrides of [
    { 'Complex-Building Name': 'Iona College — Different Campus' },
    { 'Complex-Building Name': 'Corinda State High School' },
    { Locality: 'Other Suburb' }, { Postcode: '4000' }, { 'Primary Address': '87 North Road' },
    { 'Primary Address': '85 Other Road' }, { Latitude: '0', Longitude: '0' }, { Latitude: 'NaN' },
  ]) {
    const result = validateVenueResult(site, syntheticResult(site, overrides), prepared.context)
    assert.equal(result.status, 'Rejected', json(overrides))
    assert.equal(result.acceptedCoordinates, null)
  }
})

privateTest('suburb centroids/street midpoints, ranges and intersections cannot become precise venue pins', () => {
  const site = prepared.inventory.find(s => s.physicalSiteId === 'PS005')
  for (const GeocodeType of ['Suburb centroid', 'Street Midpoint', 'locality', 'SC', 'SM']) {
    const result = validateVenueResult(site, syntheticResult(site, { GeocodeType }), prepared.context)
    assert.notEqual(result.status, 'Accepted')
    assert.equal(result.acceptedCoordinates, null)
  }
  for (const id of ['PS046', 'PS020']) {
    const special = prepared.inventory.find(s => s.physicalSiteId === id)
    assert.notEqual(validateVenueResult(special, syntheticResult(special), prepared.context).status, 'Accepted')
  }
  for (const overrides of [{ Confidence: '99' }, { Comment: 'Review required' }, { Latitude: '', Longitude: '' }]) {
    assert.notEqual(validateVenueResult(site, syntheticResult(site, overrides), prepared.context).status, 'Accepted')
  }
})

privateTest('government reconciliation uses exact InputIndex plus echoes/hashes, independent of output order', () => {
  const rows = prepared.mapping.rows.map(row => syntheticResult(prepared.inventory.find(s => s.physicalSiteId === row.physicalSiteId)))
  const csv = Buffer.from(syntheticCsv([...rows].reverse()))
  const results = reconcileResults(csv, prepared.mapping)
  assert.equal(results.size, 28)
  const receipt = { addressRole: 'training-venue', source: 'qld-government-batch-geocoder', sourceUrl: 'https://geocode.information.qld.gov.au/',
    uploadCsvSha256: sha256(prepared.csv), resultCsvSha256: sha256(csv), obtainedOn: '2026-11-06', syntheticFixture: true }
  const imported = geocodingFor(prepared, { receipt, resultBytes: csv, validatedOn: '2026-11-06' })
  assert.equal(imported.sites.length, 58)
  assert.equal(imported.summary.Pending, 30)
  assert.ok(imported.sites.some(s => s.candidateCoordinates && s.acceptedCoordinates === null))
  for (const changed of [rows.slice(1), [...rows, rows[0]], rows.map((r, i) => i ? r : { ...r, LOCALITY: 'Wrong 4000' })]) {
    assert.throws(() => reconcileResults(Buffer.from(syntheticCsv(changed)), prepared.mapping), /Missing|duplicate|conflicts/)
  }
  for (const patch of [{ addressRole: 'provider-address' }, { uploadCsvSha256: 'wrong' }, { resultCsvSha256: 'wrong' },
    { obtainedOn: '2026-11-07' }, { sourceUrl: 'https://third-party.example/' }]) {
    assert.throws(() => validateResultProvenance({ ...receipt, ...patch }, csv, prepared.csv, '2026-11-06'), /provenance/)
  }
  assert.throws(() => verifyMapping(prepared, { ...prepared.mapping, addressRole: 'provider-address' }, Buffer.from(prepared.csv)), /differs/)
  assert.throws(() => verifyMapping(prepared, prepared.mapping, Buffer.from(prepared.csv + '\n')), /differs/)
  const providerCsv = readFileSync(resolve(root, 'data/benchmarks/qld-geocoder/government-results.csv'))
  assert.throws(() => reconcileResults(providerCsv, prepared.mapping), /conflicts|Unexpected/)
})

privateTest('slim projection is allowlisted and resists injected research prose, schedules and private observations', () => {
  const data = structuredClone(prepared)
  data.associations[0].teamAgeScope = 'U12 limited team; Tuesday 18:00–19:00; PRIVATE_PERSON Cookie=SECRET'
  data.associations[0].reviewLimitations = ['PRIVATE_PERSON facebook group post body Cookie=SECRET']
  data.inventory[0].browserObservations = ['SECRET']
  const slim = candidatesFor(data, geocodingFor(prepared)), bytes = json(slim)
  assert.equal(slim.publicDisplayApproved, false)
  assert.deepEqual(slim.associations[0].teamAgeTags, ['U12'])
  assert.equal(slim.associations[0].scopeReviewRequired, true)
  assert.doesNotMatch(bytes, /PRIVATE_PERSON|SECRET|18:00|Tuesday|browserObservations|reviewLimitations|evidenceIds|"sessions"|accessRecord|cookie|token/i)
  for (const provider of slim.providers) for (const contact of provider.officialContacts) {
    if (contact.type === 'facebook_page') assert.doesNotMatch(contact.url, /\/groups\/|\/posts\//)
    assert.ok(providerDisplayLinks[provider.providerId].some(link => link.url === contact.url))
  }
  assert.ok(slim.associations.every(a => a.restrictions.length && a.scopeReference))
})

privateTest('CLI generation/check are byte reproducible and refuse stale files/hash drift before writing', () => {
  const base = join(evidence, 'generated-tests'); mkdirSync(base, { recursive: true })
  const directory = mkdtempSync(join(base, 'training-venues-'))
  try {
    const output = join(directory, 'output')
    const first = generate({ 'output-dir': output })
    const snapshots = first.outputs.map(file => [file, readFileSync(join(output, file))])
    assert.equal(generate({ 'output-dir': output, check: true }).mode, 'check')
    generate({ 'output-dir': output })
    snapshots.forEach(([file, bytes]) => assert.deepEqual(readFileSync(join(output, file)), bytes))
    writeFileSync(join(output, 'addresses.csv'), 'stale')
    assert.throws(() => generate({ 'output-dir': output, check: true }), /stale/)
    const brokenInputs = join(directory, 'inputs'); mkdirSync(brokenInputs)
    inputFiles.forEach(([file]) => writeFileSync(join(brokenInputs, file), readFileSync(join(inputDirectory, file))))
    writeFileSync(join(brokenInputs, inputFiles[0][0]), '{}')
    const absentOutput = join(directory, 'should-not-exist')
    assert.throws(() => generate({ 'input-dir': brokenInputs, 'output-dir': absentOutput }), /SHA-256 drift/)
    assert.equal(existsSync(absentOutput), false)
    const result = spawnSync(process.execPath, ['--experimental-strip-types', resolve(root, 'scripts/prepare-training-venues.mjs'),
      '--output-dir', absentOutput, '--results', join(directory, 'missing.csv')], { cwd: root, encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /requires/)
    assert.equal(existsSync(absentOutput), false)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

test('output boundaries refuse public/src/dist, raw-input directories, root and external/symlink targets', () => {
  for (const path of ['public', 'src/data', 'dist', '.', 'output/workflow/2026-11-06/training-venue-geocoding/inputs']) {
    assert.throws(() => generate({ 'output-dir': path }), /Output directory/)
  }
  assert.throws(() => projectPath('/private/tmp/forbidden-training-venues'), /inside the current project/)
  const base = join(evidence, 'generated-tests'); mkdirSync(base, { recursive: true })
  const directory = mkdtempSync(join(base, 'boundary-'))
  try {
    symlinkSync('/private/tmp', join(directory, 'outside'))
    assert.throws(() => projectPath(join(directory, 'outside', 'file.json')), /inside the current project/)
    symlinkSync(resolve(root, 'src'), join(directory, 'publish'))
    assert.throws(() => generate({ 'output-dir': join(directory, 'publish') }), /Output directory/)
  } finally { rmSync(directory, { recursive: true, force: true }) }
})

function outputFixture(fn) {
  const base = join(evidence, 'generated-tests'); mkdirSync(base, { recursive: true })
  const directory = mkdtempSync(join(base, 'round-1-path-'))
  const output = join(directory, 'output'), sentinelDirectory = join(directory, 'owned-sentinel')
  mkdirSync(output); mkdirSync(sentinelDirectory)
  try { fn({ directory, output, sentinelDirectory }) }
  finally { rmSync(directory, { recursive: true, force: true }) }
}

privateTest('every output-file and temporary-file symlink is rejected before any partial generation', () => {
  outputFixture(({ output, sentinelDirectory }) => {
    const sentinel = join(sentinelDirectory, 'keep-original.txt'), original = Buffer.from('Owned test sentinel: do not modify.\n')
    writeFileSync(sentinel, original)
    for (const file of generatedFiles) for (const temporary of [false, true]) {
      const name = temporary ? `${file}.${process.pid}.tmp` : file
      const link = join(output, name)
      symlinkSync(sentinel, link)
      assert.throws(() => generate({ 'output-dir': output }), /Unsafe.*output|output temporary/)
      assert.deepEqual(readFileSync(sentinel), original)
      assert.deepEqual(readdirSync(output), [name], `Unexpected partial output before rejecting ${name}`)
      assert.equal(lstatSync(link).isSymbolicLink(), true)
      rmSync(link)
    }
    // A later non-regular target must fail during the whole-plan preflight too.
    mkdirSync(join(output, generatedFiles.at(-1)))
    assert.throws(() => generate({ 'output-dir': output }), /regular direct file/)
    assert.deepEqual(readdirSync(output), [generatedFiles.at(-1)])
    assert.deepEqual(readFileSync(sentinel), original)
  })
})

privateTest('check, import upload/mapping, and previous-result reads reject internal redirects without changing any file', () => {
  outputFixture(({ output, sentinelDirectory }) => {
    generate({ 'output-dir': output })
    const original = new Map(generatedFiles.map(file => [file, readFileSync(join(output, file))]))
    const cases = [
      { file: 'training-venue-candidates.json', options: { check: true } },
      { file: 'addresses.csv', options: { results: 'missing.csv', 'result-provenance': 'missing.json', 'validated-on': '2026-11-06' } },
      { file: 'address-mapping.json', options: { results: 'missing.csv', 'result-provenance': 'missing.json', 'validated-on': '2026-11-06' } },
      { file: 'venue-geocoding-results.json', options: {} },
    ]
    for (const { file, options } of cases) {
      const sentinel = join(sentinelDirectory, file), link = join(output, file)
      writeFileSync(sentinel, original.get(file)); rmSync(link); symlinkSync(sentinel, link)
      assert.throws(() => generate({ 'output-dir': output, ...options }), /regular direct file.*symlink/)
      assert.deepEqual(readFileSync(sentinel), original.get(file))
      for (const other of generatedFiles.filter(name => name !== file)) {
        assert.deepEqual(readFileSync(join(output, other)), original.get(other), `Partial change while rejecting ${file}`)
      }
      assert.deepEqual(readdirSync(output).sort(), [...generatedFiles].sort())
      assert.equal(lstatSync(link).isSymbolicLink(), true)
      rmSync(link); writeFileSync(link, original.get(file))
    }
    assert.equal(generate({ 'output-dir': output, check: true }).mode, 'check')
  })
})

test('fixed lexical default/isolated-test anchors reject directory symlinks in an owned fixture root', () => {
  outputFixture(({ directory, sentinelDirectory }) => {
    const fixtureRoot = join(directory, 'fixture-root'); mkdirSync(fixtureRoot)
    const sentinel = join(sentinelDirectory, 'original.txt'), original = Buffer.from('No fixed-anchor redirection.\n')
    writeFileSync(sentinel, original)
    const benchmarkParent = join(fixtureRoot, 'data/benchmarks'); mkdirSync(benchmarkParent, { recursive: true })
    const defaultLink = join(benchmarkParent, 'training-venue-geocoding')
    symlinkSync(sentinelDirectory, defaultLink)
    assert.throws(() => resolveOutputPlan(undefined, fixtureRoot), /Output directory contains a symlink/)
    assert.throws(() => resolveOutputPlan('data/benchmarks/training-venue-geocoding', fixtureRoot), /Output directory contains a symlink/)
    assert.deepEqual(readFileSync(sentinel), original)
    assert.deepEqual(readdirSync(sentinelDirectory), ['original.txt'])
    const testAnchorParent = join(fixtureRoot, 'output/workflow/2026-11-06/training-venue-geocoding')
    mkdirSync(testAnchorParent, { recursive: true }); symlinkSync(sentinelDirectory, join(testAnchorParent, 'generated-tests'))
    assert.throws(() => resolveOutputPlan('output/workflow/2026-11-06/training-venue-geocoding/generated-tests/case', fixtureRoot),
      /Output directory contains a symlink/)
    assert.deepEqual(readFileSync(sentinel), original)
    assert.deepEqual(readdirSync(sentinelDirectory), ['original.txt'])
    assert.throws(() => resolveOutputPlan(sentinelDirectory, fixtureRoot), /Output directory must be/)
  })
})

test('original application baseline remains 54 providers / 25 mapped / 19 grouped markers / 29 list-only', () => {
  const source = JSON.parse(readFileSync(resolve(root, 'data/benchmarks/qld-geocoder/stage-b/validated.json')))
  const { providers } = adaptPlayOnDataset(source)
  assert.equal(providers.length, 54)
  assert.equal(providers.filter(p => p.mapPoint).length, 25)
  assert.equal(providers.filter(p => !p.mapPoint).length, 29)
  assert.equal(groupProviderLocations(providers).length, 19)
  const manifestPath = join(evidence, 'task-start-manifest.json')
  if (existsSync(manifestPath)) {
    const before = JSON.parse(readFileSync(manifestPath))
    for (const { file, sha256: digest } of before.files.filter(f => /^(?:src\/|data\/benchmarks\/qld-geocoder\/|data\/playon\/|data\/derived\/)/.test(f.file))) {
      assert.equal(sha256(readFileSync(resolve(root, file))), digest, `Protected provider/application artifact changed: ${file}`)
    }
  }
})
