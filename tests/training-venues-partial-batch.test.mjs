import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdirSync, mkdtempSync, symlinkSync, linkSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { sha256 } from '../scripts/qld-geocoder/export.mjs'
import { resultHeader } from '../scripts/qld-geocoder/compare.mjs'
import { loadReviewedPartialBatch, validatePartialBatch, inspectPartialBatch, phase2aDirectory, phase2bDirectory,
  partialBatchPins, verifyPartialMapping } from '../scripts/training-venues/partial-batch-reconciliation.mjs'
import { partialOutputPlan, safePartialRead, renderPartialReports } from '../scripts/reconcile-training-venue-coverage.mjs'

const realAvailable = existsSync(`${phase2aDirectory}/reviewed/registry.json`) && existsSync(`${phase2aDirectory}/received/government-results.csv`)
const real = realAvailable ? {} : { skip: 'Not Verified — private reviewed research and genuine government result unavailable in this checkout' }
const read = path => readFileSync(path)
const actualDate = '2026-11-13'
const load = () => loadReviewedPartialBatch(read)
let cached
const batch = () => cached ??= load()
const csv = rows => Buffer.from(rows.map(row => row.map(value => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value).join(',')).join('\r\n') + '\r\n')
const rowsFor = () => batch().coverage.mapping.rows.map(m => {
  const fields = Object.fromEntries(resultHeader.map(h => [h, '']))
  return { ...fields, InputIndex: String(m.inputIndex), 'Address to Validate': m.streetAddress, LOCALITY: m.locality,
    'Primary Address': m.streetAddress.toUpperCase(), Locality: m.addressComponents.suburb.toUpperCase(), Postcode: m.addressComponents.postcode,
    Longitude: '153', Latitude: '-27', GeocodeType: 'PC', Confidence: '100',
    FullAddress: `${m.streetAddress.toUpperCase()} ${m.addressComponents.suburb.toUpperCase()} QLD ${m.addressComponents.postcode}` }
})
const bytesFor = rows => csv([resultHeader, ...rows.map(r => resultHeader.map(h => r[h]))])
const receiptFor = bytes => ({ schemaVersion: 1, templateOnly: false, batchId: partialBatchPins.batchId,
  addressRole: 'training-venue', source: 'qld-government-batch-geocoder', sourceUrl: 'https://geocode.information.qld.gov.au/',
  uploadCsvSha256: partialBatchPins.uploadSha256, resultCsvSha256: sha256(bytes), obtainedOn: actualDate,
  ownerDeclaration: 'Explicitly synthetic trusted test receipt; never a real government declaration or production input.' })
const run = (rows = rowsFor(), override = {}) => {
  const resultBytes = bytesFor(rows)
  return validatePartialBatch(batch(), { resultBytes, receipt: receiptFor(resultBytes), validatedOn: actualDate, ...override })
}
const site = (result, id = 'PS007') => result.validation.sites.find(s => s.physicalSiteId === id)
const replaceFull = row => { row.FullAddress = `${row['Primary Address']} ${row.Locality} QLD ${row.Postcode}` }

test('partial batch complete valid synthetic return exercises all 17 strict proof chains', real, () => {
  const result = run()
  assert.equal(result.validation.newStrictAccepted, 17)
  assert.equal(result.dryRun.afterSummary.Accepted, 33)
  assert.equal(result.reconciliation.summary.all17Mapped, true)
  assert.equal(result.dryRun.productionWritePerformed, false)
  assert.equal(result.dryRun.publicationApproved, false)
  assert.ok(result.validation.sites.every(s => s.validation.trainingAddressEvidence.adapter === 'phase2a-pinned-reviewed-chain-v1'))
})
test('partial genuine result retains all 17 indices, exact echoes and actual candidate counts', real, () => {
  const resultBytes = read(`${phase2aDirectory}/received/government-results.csv`)
  const result = validatePartialBatch(batch(), { resultBytes, receipt: JSON.parse(read(`${phase2aDirectory}/received/government-result-provenance.json`)), validatedOn: actualDate })
  assert.equal(sha256(resultBytes), 'a60c292b9f08a46f62dacc38b44740717b4dc751fd61be04e05ddd433e5602e9')
  assert.deepEqual(result.reconciliation.summary, { submitted: 17, returnedRows: 17, distinctInputIndices: 17, all17Mapped: true,
    uniqueSelectedCandidates: 15, multipleCandidateInputs: 2, noMatchInputs: 0, governmentParsingFailures: 0, resultCsvParsingFailures: 0, rawPC100: 9 })
  assert.equal(result.validation.newStrictAccepted, 9)
  assert.deepEqual(result.dryRun.afterSummary, { Accepted: 25, Ambiguous: 18, Rejected: 2, Pending: 13 })
  assert.equal(result.dryRun.coverage.additionalProviders.length, 5)
  assert.equal(result.dryRun.coverage.additionalAssociations.length, 11)
  assert.equal(site(result, 'PS010').candidateCount, 3)
  assert.equal(site(result, 'PS048').candidateCount, 11)
  assert.equal(site(result, 'PS026').proposedStatus, 'Rejected')
  assert.ok(site(result, 'PS093').unresolvedIssues.includes('returned-building-label-needs-independent-identity-review'))
  assert.equal(site(result, 'PS034').validation.acceptedCoordinates.latitude, Number(site(result, 'PS034').rawLatitude))
  assert.ok(result.dryRun.newGovernmentResultProvenance.ownerDeclaration)
  assert.equal(result.dryRun.newGovernmentResultProvenance.obtainedOn, actualDate)
})
test('partial reconciliation does not depend on returned row ordering', real, () => {
  const rows = rowsFor(), ordered = run(rows), reversed = run([...rows].reverse())
  assert.deepEqual(ordered.validation.sites.map(s => [s.physicalSiteId, s.proposedStatus]), reversed.validation.sites.map(s => [s.physicalSiteId, s.proposedStatus]))
  assert.equal(reversed.reconciliation.sites[0].records[0].dataRowNumber, 17)
})
for (const [label, mutate] of [
  ['duplicate InputIndex and extra row', rows => rows.push({ ...rows[0] })],
  ['duplicate InputIndex representing different candidate', rows => rows.push({ ...rows[0], Longitude: '152' })],
  ['missing InputIndex result row', rows => rows.pop()],
  ['missing InputIndex field', rows => { rows[0].InputIndex = '' }],
  ['unexpected InputIndex', rows => { rows[0].InputIndex = '18' }],
  ['incorrect street address echo', rows => { rows[0]['Address to Validate'] += ' wrong' }],
  ['missing address echo', rows => { rows[0]['Address to Validate'] = '' }],
  ['incorrect locality echo', rows => { rows[0].LOCALITY = 'Wrong 4000' }],
  ['echo padded with whitespace', rows => { rows[0].LOCALITY += ' ' }],
]) test(`partial blocks whole batch on ${label} without dropping any raw records`, real, () => {
  const rows = rowsFor(); mutate(rows); const result = run(rows)
  assert.equal(result.reconciliation.valid, false)
  assert.equal(result.validation.formalValidationExecuted, false)
  assert.equal(result.validation.newStrictAccepted, 0)
  assert.equal(result.reconciliation.rawRows.length, rows.length)
  assert.deepEqual(result.dryRun.sites, batch().production.sites)
})
for (const [label, mutation, expected] of [
  ['missing latitude', r => { r.Latitude = '' }, 'invalid-or-incomplete-coordinate-pair'],
  ['missing coordinate pair', r => { r.Latitude = ''; r.Longitude = '' }, 'result-evidence-without-coordinates'],
  ['invalid coordinate', r => { r.Latitude = 'NaN' }, 'invalid-or-incomplete-coordinate-pair'],
  ['coordinate outside QLD', r => { r.Latitude = '-40' }, 'coordinates-outside-broad-queensland-bounds'],
  ['confidence 99', r => { r.Confidence = '99' }, 'confidence-not-100'],
  ['invalid confidence', r => { r.Confidence = '100.0' }, 'confidence-not-100'],
  ['low confidence 97 cannot inherit PS079', r => { r.Confidence = '97' }, 'confidence-not-100'],
  ['unsupported type', r => { r.GeocodeType = 'GC' }, 'unsupported-or-missing-geocode-type'],
  ['low precision street centre', r => { r.GeocodeType = 'street midpoint' }, 'low-precision-locality-or-street-midpoint'],
  ['wrong number', r => { r['Primary Address'] = '9999 OTHER ROAD'; replaceFull(r) }, 'house-number-mismatch'],
  ['number suffix added', r => { r['Primary Address'] = r['Primary Address'].replace(/^\d+/, '$&A'); replaceFull(r) }, 'house-number-suffix-changed'],
  ['returned range', r => { r['Primary Address'] = r['Primary Address'].replace(/^\d+/, '$&-999'); replaceFull(r) }, 'house-number-range-requires-review'],
  ['wrong suburb', r => { r.Locality = 'WRONG'; replaceFull(r) }, 'locality-mismatch'],
  ['wrong postcode', r => { r.Postcode = '4000'; replaceFull(r) }, 'postcode-mismatch'],
  ['wrong state', r => { r.FullAddress = r.FullAddress.replace('QLD', 'NSW') }, 'state-mismatch'],
  ['government comment', r => { r.Comment = 'review' }, 'government-comment-requires-review'],
  ['unknown building', r => { r['Complex-Building Name'] = 'UNREVIEWED BUILDING' }, 'returned-building-label-needs-independent-identity-review'],
  ['wrong campus', r => { r['Complex-Building Name'] = 'Different campus' }, 'returned-venue-or-campus-identity-mismatch'],
]) test(`partial strict policy retains blocker: ${label}`, real, () => {
  const rows = rowsFor(); mutation(rows[0]); const result = run(rows), s = site(result)
  assert.notEqual(s.proposedStatus, 'Accepted')
  assert.equal(s.acceptedCoordinates, null)
  assert.ok(s.unresolvedIssues.includes(expected), s.unresolvedIssues.join(','))
})
test('partial exact alphabetic number suffix is preserved, removing it cannot pass', real, () => {
  const rows = rowsFor(), r = rows.find(x => x.InputIndex === '6')
  r['Primary Address'] = r['Primary Address'].replace(/^\d+[A-Z]/, match => match.slice(0, -1)); replaceFull(r)
  const s = site(run(rows), 'PS034')
  assert.notEqual(s.proposedStatus, 'Accepted')
  assert.ok(s.unresolvedIssues.includes('house-number-suffix-changed'))
})
for (const [comment, expected, count] of [
  ['3 candidates address records found.', 'Ambiguous', 3],
  ['0 candidates address records found.', 'Rejected', 0],
  ['Unable to fulfil parsing Address request', 'Ambiguous', null],
]) test(`partial aggregate/no-match/parsing response: ${comment}`, real, () => {
  const rows = rowsFor(), old = rows[0]
  rows[0] = Object.fromEntries(resultHeader.map(h => [h, ['InputIndex', 'Address to Validate', 'LOCALITY'].includes(h) ? old[h] : h === 'Comment' ? comment : '']))
  const result = run(rows), s = site(result)
  assert.equal(s.proposedStatus, expected); assert.equal(s.candidateCount, count); assert.equal(s.acceptedCoordinates, null)
  assert.equal(s.rawGovernmentRecords.length, 1)
})
for (const [label, mutate] of [
  ['wrong source URL', r => { r.sourceUrl = 'https://invalid.example/' }],
  ['wrong source', r => { r.source = 'other' }],
  ['wrong address role', r => { r.addressRole = 'provider-address' }],
  ['wrong batch ID', r => { r.batchId = 'historical28' }],
  ['wrong result hash', r => { r.resultCsvSha256 = '0'.repeat(64) }],
  ['wrong upload hash', r => { r.uploadCsvSha256 = '0'.repeat(64) }],
  ['template-only receipt', r => { r.templateOnly = true }],
  ['missing actual download date', r => { delete r.obtainedOn }],
  ['invalid calendar date', r => { r.obtainedOn = '2026-02-30' }],
  ['future download date', r => { r.obtainedOn = '2026-11-14' }],
  ['missing Owner declaration', r => { delete r.ownerDeclaration }],
]) test(`partial provenance blocks coordinate validation: ${label}`, real, () => {
  const rows = rowsFor(), bytes = bytesFor(rows), receipt = receiptFor(bytes); mutate(receipt)
  const result = run(rows, { receipt })
  assert.equal(result.provenance.valid, false)
  assert.equal(result.validation.formalValidationExecuted, false)
  assert.equal(result.validation.newStrictAccepted, 0)
  assert.ok(result.validation.sites.every(s => s.validation === null && s.acceptedCoordinates === null))
  assert.deepEqual(result.dryRun.sites, batch().production.sites)
})
test('partial missing provenance never infers hypothetical Accepted from raw PC100', real, () => {
  const result = run(rowsFor(), { receipt: null })
  assert.equal(result.reconciliation.summary.rawPC100, 17)
  assert.equal(result.validation.newStrictAccepted, 0)
  assert.equal(result.dryRun.afterSummary.Accepted, 16)
  assert.ok(result.validation.sites.every(s => s.validation === null && s.proposedStatus === 'Pending'))
})
test('partial parser fails closed for unsupported headers and malformed UTF8/CSV', real, () => {
  for (const resultBytes of [Buffer.from('InputIndex,Latitude\r\n1,-27\r\n'), Buffer.from([0xff, 0xfe]), Buffer.from('"unclosed')]) {
    const result = validatePartialBatch(batch(), { resultBytes, receipt: receiptFor(resultBytes), validatedOn: actualDate })
    assert.equal(result.reconciliation.valid, false)
    assert.equal(result.validation.formalValidationExecuted, false)
    assert.equal(result.validation.newStrictAccepted, 0)
    assert.equal(result.schemaAudit.supportedSchema, false)
  }
})
test('partial hash drift and wrong PhysicalSiteId fail before result association', real, () => {
  assert.throws(() => verifyPartialMapping(Buffer.concat([batch().uploadBytes, Buffer.from('\n')]), batch().mappingBytes), /SHA-256 drift/)
  const mapping = structuredClone(batch().coverage.mapping); mapping.rows[0].physicalSiteId = 'PS079'
  assert.throws(() => verifyPartialMapping(batch().uploadBytes, Buffer.from(JSON.stringify(mapping))), /SHA-256 drift/)
  assert.throws(() => loadReviewedPartialBatch(path => path.endsWith('reviewed/manifest.json') ? Buffer.from('{}') : read(path)), /registry\/manifest SHA-256 drift/)
  assert.throws(() => inspectPartialBatch({ resultBytes: bytesFor(rowsFor()), uploadBytes: batch().uploadBytes, mappingBytes: Buffer.from('{}') }), /SHA-256 drift/)
})
test('partial trusted prepared/evidence snapshots cannot be mutated into an override', real, () => {
  const mutated = load(); mutated.prepared.inventory[0].originalVenueIdentityResolved = true; mutated.coverage.reviews[0].roleReview = 'forged'
  assert.throws(() => validatePartialBatch(mutated, { resultBytes: bytesFor(rowsFor()), receipt: null, validatedOn: actualDate }), /mutated/)
  assert.throws(() => validatePartialBatch({ ...batch() }, {}), /fixed pinned reviewed batch/)
})
test('partial dry-run preserves all16 Accepted, old28 full records and other41 byte-equivalent records', real, () => {
  const result = run(), d = result.dryRun
  assert.ok(Object.values(d.preservation).every(Boolean))
  assert.equal(d.changes.length, 17)
  assert.equal(d.sites.length, 58)
  const old28 = batch().production.sites.filter(s => s.governmentEvidence)
  assert.equal(old28.length, 28)
  for (const old of old28) assert.deepEqual(d.sites.find(s => s.physicalSiteId === old.physicalSiteId), old)
  for (const old of batch().production.sites.filter(s => s.status === 'Accepted')) assert.deepEqual(d.sites.find(s => s.physicalSiteId === old.physicalSiteId), old)
  const delta = d.changes[0].differences
  assert.ok(delta.some(x => x.beforePresent === false && x.afterPresent === true))
  assert.ok(delta.every(x => typeof x.beforePresent === 'boolean' && typeof x.afterPresent === 'boolean'))
  assert.deepEqual(d.originalGovernmentResultProvenance, batch().production.governmentResultProvenance)
})
test('partial reports are deterministic and candidate coordinates have no frontend import path', real, () => {
  const result = run(), first = renderPartialReports(result), second = renderPartialReports(result)
  assert.deepEqual(first, second)
  assert.equal(JSON.parse(first['dry-run-merge.json']).publicationApproved, false)
  const scan = path => readdirSync(path, { withFileTypes: true }).flatMap(f => f.isDirectory() ? scan(`${path}/${f.name}`) : /\.(ts|tsx|js|jsx|css|json)$/.test(f.name) ? [read(`${path}/${f.name}`).toString()] : [])
  assert.ok(scan('src').every(source => !source.includes('partial-batch-reconciliation') && !source.includes('reconcile-training-venue-coverage') && !source.includes('training-venue-coverage-phase2b')))
})
test('partial output boundary blocks production, path escapes, symlink and shared hardlink writes', () => {
  const parent = resolve(phase2bDirectory, 'developer/test-tmp'); mkdirSync(parent, { recursive: true })
  const root = mkdtempSync(resolve(parent, 'safety-'))
  try {
    assert.throws(() => partialOutputPlan(root, 'data/benchmarks/training-venue-geocoding'), /isolated Phase 2B/)
    assert.throws(() => partialOutputPlan(root, '../escape'), /escapes project/)
    const directory = resolve(root, phase2bDirectory); mkdirSync(directory, { recursive: true })
    const regular = resolve(root, 'protected.json'); writeFileSync(regular, 'protected')
    const target = resolve(directory, 'dry-run-merge.json'); symlinkSync(regular, target)
    assert.throws(() => partialOutputPlan(root), /Symlink/)
    rmSync(target); linkSync(regular, target)
    assert.throws(() => partialOutputPlan(root), /unshared/)
    assert.equal(read(regular).toString(), 'protected')
    assert.throws(() => safePartialRead(root, '../outside'), /escapes project/)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('partial range diagnostics distinguish matching road from mismatching numbered address', real, () => {
  const result = validatePartialBatch(batch(), { resultBytes: read(`${phase2aDirectory}/received/government-results.csv`),
    receipt: JSON.parse(read(`${phase2aDirectory}/received/government-result-provenance.json`)), validatedOn: actualDate })
  for (const id of ['PS045', 'PS093', 'PS094', 'PS095']) {
    const diagnostics = site(result, id).technicalDiagnostics
    assert.equal(diagnostics.exactStreetNameTypeDirection, true)
    assert.equal(diagnostics.exactNumberedStreetAddress, false)
    assert.equal(diagnostics.exactNumberIncludingSuffix, false)
    assert.equal(diagnostics.returnedRange, true)
    assert.equal(Object.hasOwn(diagnostics, 'exactStreet'), false)
  }
})
