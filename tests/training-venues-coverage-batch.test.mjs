import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync, existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { prepareCoverageBatch, targetSiteIds, batchFiles } from '../scripts/training-venues/coverage-batch.mjs'
import { coverageDirectory, coverageOutputPlan, safeCoveragePath } from '../scripts/prepare-training-venue-coverage.mjs'
import { addressPriorityRecordHash, addressRoles } from '../scripts/training-venues/address-priority.mjs'
import { sha256 } from '../scripts/qld-geocoder/export.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const privatePath = `${coverageDirectory}/reviewed`
const present = existsSync(resolve(root, privatePath, 'registry.json')) && existsSync(resolve(root, privatePath, 'manifest.json'))
const privateTest = (name, fn) => test(name, { skip: present ? false : 'Not Verified: private independently reviewed Phase 2A registry/manifest absent.' }, fn)
const reader = path => readFileSync(resolve(root, path))
const originalRegistryBytes = present ? reader(`${privatePath}/registry.json`) : null
const originalManifestBytes = present ? reader(`${privatePath}/manifest.json`) : null
const registry = present ? JSON.parse(originalRegistryBytes) : null
const originalManifest = present ? JSON.parse(originalManifestBytes) : null
const run = (bytes = originalRegistryBytes, manifest = originalManifestBytes, read = reader) => prepareCoverageBatch(bytes, manifest, read)
// Explicit trusted synthetic overlays exercise semantic policy changes. These
// resealed fixtures never reach the CLI, private reviewed files or output batch.
function trustedFixture(edit) {
  const fixture = structuredClone(registry)
  edit(fixture)
  const bytes = JSON.stringify(fixture)
  const manifest = { ...originalManifest, registrySha256: sha256(bytes),
    records: Object.fromEntries(fixture.records.map(r => [r.id, addressPriorityRecordHash(r)])) }
  return run(bytes, JSON.stringify(manifest))
}

privateTest('all17 real reviewed site chains produce exactly one independent row each', () => {
  const result = run()
  assert.deepEqual(result.mapping.rows.map(r => r.physicalSiteId), targetSiteIds)
  assert.equal(result.summary.readySites, 17)
  assert.equal(result.summary.heldSites, 0)
  assert.deepEqual(Object.keys(result.outputs), batchFiles)
  for (const review of result.reviews) {
    assert.equal(review.decision, 'candidate-for-later-query')
    assert.ok(review.trainingRelationships.length)
    assert.ok(review.trainingRelationships.every(r => r.originRefs.length && r.associationId))
    assert.equal(review.existingProductionStatus, 'Pending')
    assert.equal(review.acceptedCoordinates, null)
    assert.equal(review.precision, null)
    assert.equal(review.productionStatusChanged, false)
  }
})

privateTest('club partial components and name-only school supplements retain exact provenance', () => {
  const result = run(), byId = new Map(result.reviews.map(r => [r.physicalSiteId, r]))
  for (const id of ['PS026', 'PS048', 'PS073']) {
    const p = byId.get(id).preferredQuery
    assert.equal(p.addressRole, addressRoles.training)
    assert.equal(p.componentProvenance.postcode, `${id}:official-campus-address`)
  }
  assert.equal(byId.get('PS048').preferredQuery.componentProvenance.number, 'PS048:club-training-address')
  assert.equal(byId.get('PS073').preferredQuery.componentProvenance.suburb, 'PS073:official-campus-address')
  assert.equal(byId.get('PS007').preferredQuery.addressRole, addressRoles.administrative)
  assert.notEqual(byId.get('PS007').trainingRelationships[0].sourceId, byId.get('PS007').preferredQuery.recordId)
  assert.equal(byId.get('PS008').preferredQuery.address.suburb, 'Carindale')
  assert.equal(byId.get('PS034').preferredQuery.address.number, '15a')
})

privateTest('special access, campus and historical contact roles remain separate', () => {
  const reviews = new Map(run().reviews.map(r => [r.physicalSiteId, r]))
  assert.match(reviews.get('PS050').originalAddressAndAccess[0].address.formatted, /Paddington/)
  assert.equal(reviews.get('PS050').preferredQuery.address.suburb, 'Milton')
  assert.equal(reviews.get('PS050').roleDifferences.length, 0)
  for (const [id, text] of [['PS051', /Cecil/], ['PS052', /Glenlyon.*Moola/], ['PS073', /Gate1.*Gate3/]]) {
    assert.ok(reviews.get(id).accessGuidance.some(g => text.test(g.guidance)))
    assert.ok(reviews.get(id).accessGuidance.every(g => g.addressRole === addressRoles.access))
    assert.equal(reviews.get(id).preferredQuery.locationClaim, id === 'PS073' ? 'training-location-target-unverified' : 'campus-level-target-unverified')
  }
})

privateTest('CSV bytes, mapping ordering, hashes, rowNumber and expected InputIndex are deterministic', () => {
  const a = run(), b = run()
  assert.deepEqual(a.outputs, b.outputs)
  const csv = a.outputs['addresses.csv']
  assert.equal(csv.charCodeAt(0) === 0xfeff, false)
  assert.equal(csv.replaceAll('\r\n', '').includes('\n'), false)
  assert.equal(csv.split('\r\n')[0], 'Address to Validate,LOCALITY')
  assert.equal(csv.split('\r\n').filter(Boolean).length, 18)
  a.mapping.rows.forEach((row, index) => {
    assert.equal(row.rowNumber, index + 1)
    assert.equal(row.inputIndex, index + 1)
    assert.equal(csv.split('\r\n')[index + 1], `${row.streetAddress},${row.locality}`)
    assert.equal(row.uploadCsvSha256, sha256(csv))
  })
  assert.equal(a.summary.mappingSha256, sha256(a.outputs['address-mapping.json']))
  assert.match(a.mapping.importPolicy, /InputIndex AND both original input echoes/)
  assert.equal(a.mapping.rows.length, new Set(a.mapping.rows.map(r => r.physicalSiteId)).size)
})

privateTest('reversed trusted site order still produces identical sorted CSV and mapping', () => {
  const fixture = trustedFixture(r => r.sites.reverse())
  assert.equal(fixture.outputs['addresses.csv'], run().outputs['addresses.csv'])
  assert.equal(fixture.outputs['address-mapping.json'], run().outputs['address-mapping.json'])
})

privateTest('unreviewed, missing, tampered registry/manifest and letter suffix fail closed', () => {
  for (const mutate of [r => { r.records.find(x => x.id === 'PS034:official-campus-address').address.number = '15' },
    r => { r.sites[0].venueIds = ['WRONG'] }, r => { r.sites[0].campusId = 'WRONG' }]) {
    const bad = structuredClone(registry); mutate(bad)
    assert.throws(() => run(JSON.stringify(bad)), /Unreviewed/)
  }
  assert.throws(() => run(originalRegistryBytes, '{}'), /Unreviewed/)
  const bad = { ...originalManifest, reviewStage: 'Developer prepared' }
  assert.throws(() => run(originalRegistryBytes, JSON.stringify(bad)), /Unreviewed/)
  assert.throws(() => run(originalRegistryBytes, originalManifestBytes, () => Buffer.from('{}')), /drift/)
})

privateTest('missing source/evidence/observation/access files or records never pass', () => {
  for (const record of registry.records.filter(r => r.kind === 'training').slice(0, 3)) {
    for (const ref of record.originRefs) {
      assert.throws(() => run(originalRegistryBytes, originalManifestBytes, path => {
        if (path === ref.path) throw new Error('Missing original evidence')
        return reader(path)
      }), /Missing original/)
    }
  }
  for (const kind of ['source', 'training']) {
    assert.throws(() => trustedFixture(r => { r.records.splice(r.records.findIndex(x => x.kind === kind), 1) }), /source|relationship|site|Unbound/i)
  }
  const missingAddress = trustedFixture(r => { r.records.splice(r.records.findIndex(x => x.kind === 'address'), 1) })
  assert.equal(missingAddress.reviews[0].decision, 'held-for-evidence')
  assert.equal(missingAddress.mapping.rows.some(r => r.physicalSiteId === targetSiteIds[0]), false)
})

privateTest('duplicate site, wrong mapping venue/provider/association and missing campus binding fail closed', () => {
  for (const edit of [r => { r.sites[0].physicalSiteId = r.sites[1].physicalSiteId },
    r => { r.sites[0].providerIds = ['WRONG'] }, r => { r.sites[0].venueIds = ['WRONG'] },
    r => { r.sites[0].associationIds = ['WRONG'] }, r => { r.sites[0].associations[0].venueId = 'WRONG' },
    r => { r.sites[0].campusIdentityEvidence = [] }, r => { r.sites[0].productionStatus = 'Accepted' }]) {
    assert.throws(() => trustedFixture(edit))
  }
})

privateTest('wrong campus cannot replace the original training campus', () => {
  const result = trustedFixture(r => { r.records.find(x => x.kind === 'training').campusId = 'WRONG-CAMPUS' })
  assert.equal(result.reviews[0].decision, 'held-for-evidence')
  assert.ok(result.reviews[0].holds.some(h => /different-training-campus/.test(h)))
})

privateTest('games, holiday, skills and venue directory activity cannot become ordinary training', () => {
  for (const activity of ['competition', 'holiday', 'skill-training', 'venue-directory', 'membership']) {
    const result = trustedFixture(r => {
      const site = r.sites[0]
      for (const id of site.trainingRecordIds) r.records.find(x => x.id === id).activity = activity
    })
    assert.equal(result.reviews[0].decision, 'held-for-evidence')
    assert.equal(result.mapping.rows.some(r => r.physicalSiteId === targetSiteIds[0]), false)
  }
})

privateTest('entrance-only and Owner-only proposals cannot replace a training query', () => {
  for (const role of ['access', 'owner']) {
    const result = trustedFixture(r => {
      const site = r.sites[0], address = r.records.find(x => x.id === site.addressRecordIds[0])
      if (role === 'access') {
        address.sourceId = r.records.find(x => x.id === site.trainingRecordIds[0]).sourceId
        address.addressRole = addressRoles.access; address.purpose = 'training-access'
      } else {
        const source = r.records.find(x => x.id === address.sourceId)
        source.publisherRole = 'owner'; address.addressRole = addressRoles.owner; address.purpose = 'unverified-location-lead'
      }
    })
    assert.equal(result.reviews[0].decision, 'held-for-evidence')
    assert.equal(result.reviews[0].preferredQuery, null)
  }
})

privateTest('number ranges, intersections and incomplete numbers stay held without weakening helper', () => {
  for (const number of ['15-17', '15/17', '', '15 a', 'Cnr']) {
    const result = trustedFixture(r => { r.records.find(x => x.id === 'PS034:official-campus-address').address.number = number })
    assert.equal(result.reviews.find(r => r.physicalSiteId === 'PS034').decision, 'held-for-evidence')
    assert.equal(result.mapping.rows.some(r => r.physicalSiteId === 'PS034'), false)
  }
})

privateTest('CSV formula injection, comma, quote, controls and unsafe street/suburb components never export', () => {
  for (const [field, value] of [['street', '=HYPERLINK Road'], ['street', '+Formula Road'], ['street', '@Formula Road'],
    ['street', 'Safe, Road'], ['street', 'Safe" Road'], ['street', 'Safe\nRoad'], ['suburb', 'Safe\tLocality'],
    ['street', 'PO Box'], ['street', 'Road & Other Road'], ['street', 'Street\u007fRoad']]) {
    assert.throws(() => trustedFixture(r => { r.records.find(x => x.id === 'PS034:official-campus-address').address[field] = value }), /Unsafe|safe unquoted/)
  }
})

privateTest('an explicit club target is retained while a differing unproved administrative address stays held', () => {
  const result = trustedFixture(r => {
    const address = r.records.find(x => x.id === 'PS048:club-training-address')
    address.address = { ...address.address, number: '99', state: 'QLD', postcode: '4178' }
  })
  const review = result.reviews.find(r => r.physicalSiteId === 'PS048')
  assert.equal(review.preferredQuery.address.number, '99')
  assert.equal(review.preferredQuery.addressRole, addressRoles.training)
  assert.equal(review.decision, 'held-for-evidence')
  assert.ok(review.holds.some(h => h.startsWith('physical-relationship-unverified')))
})

privateTest('full compatible club training address wins and a shared address never merges distinct site IDs', () => {
  const result = trustedFixture(r => {
    const site = r.sites.find(s => s.physicalSiteId === 'PS048')
    const club = r.records.find(x => x.id === 'PS048:club-training-address')
    club.address = { ...r.records.find(x => x.id === 'PS048:official-campus-address').address }
    // Synthetic complete club address proves priority in the reusable pipeline.
    site.addressRecordIds = [club.id]
    const a = r.records.find(x => x.id === 'PS007:official-campus-address')
    const b = r.records.find(x => x.id === 'PS010:official-campus-address')
    b.address = structuredClone(a.address)
  })
  const review = result.reviews.find(r => r.physicalSiteId === 'PS048')
  assert.equal(review.preferredQuery.recordId, 'PS048:club-training-address')
  assert.equal(review.decision, 'candidate-for-later-query')
  assert.equal(result.mapping.rows.length, 17)
})

privateTest('historical aliases and PS079 confidence/parcel flags cannot grant acceptance', () => {
  const result = trustedFixture(r => {
    for (const site of r.sites) Object.assign(site, { sameSiteAlias: 'PS079', confidence: '97', parcelVerified: true,
      acceptedCoordinates: { latitude: 0, longitude: 0 }, precision: 'entrance', reviewed: true })
  })
  assert.ok(result.reviews.every(r => r.acceptedCoordinates === null && r.precision === null && !r.productionStatusChanged))
  assert.equal(result.summary.newAcceptedSites, 0)
})

privateTest('government result receipt fields remain explicitly blank and input/echo/index forgeries have no importer', () => {
  const result = trustedFixture(r => {
    r.resultCsvSha256 = '0'.repeat(64); r.obtainedOn = '2026-11-13'
    r.sites[0].inputIndex = 999; r.sites[0].echo = 'fake'
  })
  const template = JSON.parse(result.outputs['government-result-provenance.template.json'])
  assert.equal(template.templateOnly, true)
  assert.equal(template.resultCsvSha256, null)
  assert.equal(template.obtainedOn, null)
  assert.equal(result.mapping.rows[0].inputIndex, 1)
  for (const option of ['--results', '--result-provenance', '--input-index', '--output-dir', '--registry']) {
    const process = spawnSync(globalThis.process.execPath, ['scripts/prepare-training-venue-coverage.mjs', option, 'fake'], { cwd: root, encoding: 'utf8' })
    assert.equal(process.status, 1)
    assert.match(process.stderr, /Unknown option/)
  }
})

test('output traversal, public/production redirects and symlink chains are refused', () => {
  const temporaryBase = resolve(root, coverageDirectory, 'developer/tmp')
  mkdirSync(temporaryBase, { recursive: true })
  const fixture = mkdtempSync(resolve(temporaryBase, 'safety-'))
  try {
    for (const output of ['../escape', 'src', 'public', 'data/benchmarks/training-venue-geocoding', coverageDirectory]) {
      assert.throws(() => coverageOutputPlan(fixture, output))
    }
    const batch = resolve(fixture, coverageDirectory, 'batch')
    mkdirSync(batch, { recursive: true })
    const ordinary = resolve(fixture, 'ordinary.txt'); writeFileSync(ordinary, 'safe')
    symlinkSync(ordinary, resolve(batch, 'addresses.csv'))
    assert.throws(() => coverageOutputPlan(fixture), /Symlink/)
    assert.throws(() => safeCoveragePath(fixture, '../elsewhere'), /escapes/)
    assert.equal(readFileSync(ordinary, 'utf8'), 'safe')
  } finally { rmSync(fixture, { recursive: true, force: true }) }
})

privateTest('running preparation and deterministic check preserve all seven old batch artifacts and16 Accepted data', () => {
  const directory = resolve(root, 'data/benchmarks/training-venue-geocoding')
  const names = ['addresses.csv', 'address-mapping.json', 'venue-inventory.json', 'eligible-associations.json',
    'address-preparation-results.json', 'venue-geocoding-results.json', 'training-venue-candidates.json']
  const before = names.map(name => sha256(readFileSync(resolve(directory, name))))
  for (const args of [[], ['--check']]) {
    const process = spawnSync(globalThis.process.execPath, ['scripts/prepare-training-venue-coverage.mjs', ...args], { cwd: root, encoding: 'utf8' })
    assert.equal(process.status, 0, process.stderr)
  }
  assert.deepEqual(names.map(name => sha256(readFileSync(resolve(directory, name)))), before)
  const rows = JSON.parse(readFileSync(resolve(directory, 'venue-geocoding-results.json'))).sites
  assert.equal(rows.filter(r => r.status === 'Accepted').length, 16)
  assert.equal(rows.filter(r => r.status === 'Pending').length, 30)
})
