import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, statSync, existsSync, symlinkSync, linkSync, renameSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sha256 } from '../scripts/qld-geocoder/export.mjs'
import { buildProductionMerge, productionDirectory, phase2cDirectory, acceptedCoverageSites, ambiguousCoverageSites } from '../scripts/training-venues/production-merge.mjs'
import { loadHistoricalBaseline, historicalOutputPins, historicalResultPath, historicalReceiptPath } from '../scripts/training-venues/historical-baseline.mjs'
import { frozenHistoricalReader, historicalSnapshotPath } from '../scripts/training-venues/historical-reference.mjs'
import { productionOutputPlan, writeProductionOutputs, formalNames } from '../scripts/training-venues/production-output.mjs'
import { phase2aDirectory, phase2bDirectory } from '../scripts/training-venues/partial-batch-reconciliation.mjs'
import { generate } from '../scripts/prepare-training-venues.mjs'
import { assertKnownProductionState } from '../scripts/merge-training-venue-production.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)), read = path => readFileSync(resolve(root, path))
const real = { skip: existsSync(resolve(root, phase2aDirectory, 'received/government-results.csv')) ? false : 'Not Verified: private dual-batch inputs unavailable' }
let cached
const merge = () => cached ??= buildProductionMerge(read)
const fixture = fn => {
  const base = resolve(root, phase2cDirectory, 'developer/tmp'); mkdirSync(base, { recursive: true })
  const dir = mkdtempSync(resolve(base, 'production-'))
  try { return fn(dir) } finally { rmSync(dir, { recursive: true, force: true }) }
}
const synthetic = suffix => Object.fromEntries(formalNames.map(name => [name, `SYNTHETIC SAFETY FIXTURE ONLY ${name} ${suffix}\n`]))
const seed = (dir, outputs) => { const plan = productionOutputPlan(dir); mkdirSync(plan.directory, { recursive: true }); for (const name of formalNames) writeFileSync(plan.files[name], outputs[name]); return plan }

test('dual-batch exact new17 and protected41/16 records match approved Phase2B, without simulation metadata', real, () => {
  const m = merge(), approved = JSON.parse(read(`${phase2bDirectory}/dry-run-merge.json`))
  assert.deepEqual(m.geocoding.sites, approved.sites)
  assert.deepEqual(m.geocoding.summary, { Accepted: 25, Ambiguous: 18, Rejected: 2, Pending: 13 })
  for (const key of ['simulationOnly', 'productionWritePerformed', 'beforeSummary', 'afterSummary']) assert.equal(Object.hasOwn(m.geocoding, key), false)
  for (const old of m.historical.geocoding.sites.filter(s => !m.result.validation.sites.some(v => v.physicalSiteId === s.physicalSiteId) || s.status === 'Accepted')) {
    assert.deepEqual(m.geocoding.sites.find(s => s.physicalSiteId === old.physicalSiteId), old)
  }
  assert.deepEqual(m.result.validation.sites.filter(s => s.proposedStatus === 'Accepted').map(s => s.physicalSiteId), acceptedCoverageSites)
  assert.deepEqual(m.result.validation.sites.filter(s => s.proposedStatus === 'Ambiguous').map(s => s.physicalSiteId), ambiguousCoverageSites)
  assert.equal(m.geocoding.sites.find(s => s.physicalSiteId === 'PS026').status, 'Rejected')
  assert.equal(m.geocoding.sites.find(s => s.physicalSiteId === 'PS026').confidence, '97')
  for (const [name, hash] of Object.entries(historicalOutputPins)) if (!['venue-geocoding-results.json', 'training-venue-candidates.json'].includes(name)) assert.equal(sha256(m.outputs[name]), hash)
})
test('independent batch identities retain exact source hashes, dates, provenance, address echoes and local overlapping InputIndex', real, () => {
  const m = merge(), [old, coverage] = m.manifest.batches
  assert.notEqual(old.batchId, coverage.batchId)
  assert.deepEqual(m.geocoding.governmentResultProvenance, m.historical.geocoding.governmentResultProvenance)
  assert.deepEqual([old.rows.length, coverage.rows.length], [28, 17])
  assert.deepEqual([old.obtainedOn, coverage.obtainedOn], ['2026-11-06', '2026-11-13'])
  assert.equal(old.rows[0].inputIndex, coverage.rows[0].inputIndex)
  assert.notEqual(old.rows[0].physicalSiteId, coverage.rows[0].physicalSiteId)
  for (const batch of m.manifest.batches) {
    assert.equal(sha256(read(batch.resultPath)), batch.resultCsvSha256)
    assert.equal(sha256(read(batch.provenancePath)), batch.provenanceSha256)
    assert.equal(sha256(read(batch.mappingPath)), batch.mappingSha256)
    for (const ref of batch.rows) {
      const s = m.geocoding.sites.find(s => s.physicalSiteId === ref.physicalSiteId)
      assert.equal(ref.batchId, batch.batchId); assert.equal(ref.resultCsvSha256, batch.resultCsvSha256)
      assert.equal(ref.inputIndex, s.governmentEvidence.inputIndex)
      assert.equal(ref.queryAddress, s.governmentEvidence.inputAddress)
      assert.equal(ref.queryLocality, s.governmentEvidence.inputLocality)
    }
  }
})
test('25 accepted coordinates preserve precision and exact provider/association coverage with all scope restrictions', real, () => {
  const m = merge(), oldCandidates = JSON.parse(m.historical.outputs['training-venue-candidates.json'])
  assert.equal(m.candidates.publicDisplayApproved, false)
  assert.deepEqual(m.candidates.associations, oldCandidates.associations)
  assert.deepEqual(m.candidates.providers, oldCandidates.providers)
  assert.equal(m.candidates.venues.filter(v => v.coordinates).length, 25)
  for (const v of m.candidates.venues) {
    const s = m.geocoding.sites.find(s => s.physicalSiteId === v.physicalSiteId)
    assert.deepEqual(v.coordinates, s.acceptedCoordinates); assert.equal(v.precision, s.precision)
    if (s.status !== 'Accepted') { assert.equal(v.coordinates, null); assert.equal(v.precision, null) }
    if (acceptedCoverageSites.includes(s.physicalSiteId)) assert.equal(v.precision, s.physicalSiteId === 'PS050' ? 'venue-level' : 'campus-level')
  }
  assert.deepEqual(m.result.dryRun.coverage, JSON.parse(read(`${phase2bDirectory}/dry-run-merge.json`)).coverage)
  assert.deepEqual(m.result.dryRun.coverage.additionalAssociations, ['A009', 'A010', 'A027', 'A059', 'A068', 'A071', 'A073', 'A081', 'A082', 'A084', 'A130'])
  const accepted = new Set(m.geocoding.sites.filter(s => s.status === 'Accepted').map(s => s.physicalSiteId))
  const associations = m.historical.prepared.associations.filter(a => accepted.has(a.physicalSiteId))
  assert.deepEqual([...new Set(associations.map(a => a.providerId))].sort(), m.result.dryRun.coverage.after.providerIds)
  assert.deepEqual(associations.map(a => a.associationId).sort(), m.result.dryRun.coverage.after.associationIds)
})
test('historical reconstruction and Phase2A frozen reference preserve fixed SHA without reading new production state', real, () => {
  const historical = loadHistoricalBaseline(path => { assert.notEqual(path, `${productionDirectory}/venue-geocoding-results.json`); return read(path) })
  assert.equal(sha256(historical.outputs['venue-geocoding-results.json']), historicalOutputPins['venue-geocoding-results.json'])
  assert.deepEqual(buildProductionMerge(path => path === `${productionDirectory}/venue-geocoding-results.json` ? Buffer.from('UNTRUSTED CURRENT PRODUCTION') : read(path)).outputs, merge().outputs)
  assert.equal(sha256(frozenHistoricalReader(read)(`${productionDirectory}/venue-geocoding-results.json`)), historicalOutputPins['venue-geocoding-results.json'])
  assert.throws(() => frozenHistoricalReader(path => path === historicalSnapshotPath ? Buffer.from('{}') : read(path))(`${productionDirectory}/venue-geocoding-results.json`), /snapshot SHA-256 drift/)
})
for (const path of [historicalResultPath, historicalReceiptPath, `${phase2aDirectory}/received/government-results.csv`, `${phase2aDirectory}/received/government-result-provenance.json`, `${phase2aDirectory}/reviewed/registry.json`, `${phase2aDirectory}/reviewed/manifest.json`, `${phase2aDirectory}/batch/addresses.csv`, `${phase2aDirectory}/batch/address-mapping.json`]) {
  test(`dual production rejects missing and hash-drifted source: ${path}`, real, () => {
    assert.throws(() => buildProductionMerge(p => p === path ? Buffer.from('{}') : read(p)), /drift|SHA-256/)
    assert.throws(() => buildProductionMerge(p => { if (p === path) throw new Error('Missing required source'); return read(p) }), /Missing required source/)
  })
}
test('reviewed Phase2B output drift rejects rebuild rather than importing edited simulation', real, () => {
  assert.throws(() => buildProductionMerge(p => p === `${phase2bDirectory}/dry-run-merge.json` ? Buffer.from('{}') : read(p)), /Approved Phase 2B report drift/)
})
test('current formal data is exactly historical or the complete deterministic merged outputs', real, () => {
  const actual = read(`${productionDirectory}/venue-geocoding-results.json`)
  const historical = sha256(actual) === historicalOutputPins['venue-geocoding-results.json']
  const expected = historical ? merge().historical.outputs : merge().outputs
  for (const name of formalNames) assert.ok(read(`${productionDirectory}/${name}`).equals(Buffer.from(expected[name])), name)
  assertKnownProductionState(root, merge().outputs)
})
test('legacy canonical command rejects all normalized production paths before touching any output', () => {
  for (const path of [undefined, productionDirectory, `${productionDirectory}/.`, `${productionDirectory}/../training-venue-geocoding`, resolve(root, productionDirectory)]) {
    assert.throws(() => generate({ 'output-dir': path }), /Single-batch production generation is disabled/)
  }
})
test('transaction stages first, repeat generation and check preserve every byte and mtime', () => fixture(dir => {
  const before = synthetic('BEFORE'), after = synthetic('AFTER'), plan = seed(dir, before)
  assert.throws(() => writeProductionOutputs(dir, after, { check: true }), /stale/)
  assert.equal(existsSync(plan.recovery), false)
  const generated = writeProductionOutputs(dir, after)
  assert.deepEqual(generated.changedFiles, formalNames)
  const attrs = formalNames.map(n => ({ bytes: readFileSync(plan.files[n]), mtime: statSync(plan.files[n]).mtimeMs }))
  assert.deepEqual(writeProductionOutputs(dir, after).changedFiles, [])
  assert.equal(writeProductionOutputs(dir, after, { check: true }).mode, 'check')
  for (const [i, name] of formalNames.entries()) { assert.deepEqual(readFileSync(plan.files[name]), attrs[i].bytes); assert.equal(statSync(plan.files[name]).mtimeMs, attrs[i].mtime) }
  assert.equal(existsSync(plan.active), false)
}))
for (const at of [1, 2, 7]) test(`transaction replacement failure at ${at} restores all original outputs`, () => fixture(dir => {
  const before = synthetic('BEFORE'), after = synthetic('AFTER'), plan = seed(dir, before)
  let calls = 0
  assert.throws(() => writeProductionOutputs(dir, after, { replace: (from, to) => { if (++calls === at) throw new Error('Injected rename failure'); renameSync(from, to) } }), /original bytes restored/)
  for (const name of formalNames) assert.equal(readFileSync(plan.files[name], 'utf8'), before[name])
  assert.equal(existsSync(plan.active), false)
  assert.ok(readdirSync(plan.recovery).some(n => n.startsWith('transaction-')))
}))
test('incomplete rollback retains journal and blocks future check/write', () => fixture(dir => {
  const before = synthetic('BEFORE'), after = synthetic('AFTER'), plan = seed(dir, before)
  let calls = 0
  assert.throws(() => writeProductionOutputs(dir, after, { replace: (from, to) => {
    if (++calls === 2) { writeFileSync(plan.files[formalNames[0]], 'EXTERNAL RACE'); throw new Error('Injected concurrent change') }
    renameSync(from, to)
  } }), /rollback incomplete; ACTIVE journal retained/)
  assert.ok(existsSync(plan.active))
  assert.throws(() => writeProductionOutputs(dir, after), /Incomplete production transaction/)
  assert.throws(() => writeProductionOutputs(dir, after, { check: true }), /Incomplete production transaction/)
}))
test('output allowlist, symlink/hardlink targets, directory chains and unexpected temp files fail safely', () => fixture(dir => {
  const before = synthetic('BEFORE'), after = synthetic('AFTER'), plan = seed(dir, before)
  assert.throws(() => writeProductionOutputs(dir, { ...after, 'unexpected.json': '{}' }), /allowlist/)
  assert.throws(() => writeProductionOutputs(dir, { ...after, 'addresses.csv': null }), /allowlist/)
  const sentinel = resolve(dir, 'sentinel'); writeFileSync(sentinel, 'SENTINEL')
  for (const createLink of [symlinkSync, linkSync]) {
    const target = plan.files['addresses.csv']; rmSync(target); createLink(sentinel, target)
    assert.throws(() => writeProductionOutputs(dir, after), /symlink|unshared/)
    rmSync(target); writeFileSync(target, before['addresses.csv'])
    assert.equal(readFileSync(sentinel, 'utf8'), 'SENTINEL')
  }
  const temporary = resolve(plan.directory, `addresses.csv.${process.pid}.phase2c.tmp`)
  symlinkSync(sentinel, temporary)
  assert.throws(() => writeProductionOutputs(dir, after), /transaction failed/)
  assert.equal(readFileSync(sentinel, 'utf8'), 'SENTINEL')
  for (const name of formalNames) assert.equal(readFileSync(plan.files[name], 'utf8'), before[name])
  rmSync(temporary)
  const saved = `${plan.directory}-saved`; renameSync(plan.directory, saved); symlinkSync(saved, plan.directory)
  assert.throws(() => productionOutputPlan(dir), /symlink/)
}))
test('unknown and mixed existing formal data is never implicitly repaired', real, () => fixture(dir => {
  const m = merge(), plan = seed(dir, m.historical.outputs)
  assertKnownProductionState(dir, m.outputs)
  writeFileSync(plan.files['venue-geocoding-results.json'], m.outputs['venue-geocoding-results.json'])
  assert.throws(() => assertKnownProductionState(dir, m.outputs), /Unknown or mixed/)
  writeFileSync(plan.files['training-venue-candidates.json'], m.outputs['training-venue-candidates.json'])
  assertKnownProductionState(dir, m.outputs)
  writeFileSync(plan.files['addresses.csv'], 'UNEXPECTED DRIFT')
  assert.throws(() => assertKnownProductionState(dir, m.outputs), /Unknown or mixed/)
  rmSync(plan.files['addresses.csv']); assert.throws(() => assertKnownProductionState(dir, m.outputs), /Missing formal output/)
}))
test('output directory cannot be redirected through recovery directory symlinks', () => fixture(dir => {
  const plan = seed(dir, synthetic('BEFORE')), sentinel = resolve(dir, 'sentinel')
  mkdirSync(sentinel); mkdirSync(dirname(plan.recovery), { recursive: true }); symlinkSync(sentinel, plan.recovery)
  assert.throws(() => productionOutputPlan(dir), /symlink/)
  assert.deepEqual(readdirSync(sentinel), [])
}))
