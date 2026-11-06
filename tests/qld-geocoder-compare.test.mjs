import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { benchmark, distanceMetres, parseCsv, reconcileResults, resultHeader, validateResult } from '../scripts/qld-geocoder/compare.mjs'
import { sha256 } from '../scripts/qld-geocoder/export.mjs'
import { renderReport } from '../scripts/qld-geocoder/report.mjs'

const base = new URL('../data/benchmarks/qld-geocoder/', import.meta.url)
const inputs = {
  sourceBytes: await readFile(new URL('../data/playon/4115-basketball.json', import.meta.url)),
  baselineBytes: await readFile(new URL('../data/derived/4115-basketball-geocoded.json', import.meta.url)),
  uploadBytes: await readFile(new URL('addresses.csv', base)),
  mappingBytes: await readFile(new URL('address-mapping.json', base)),
  resultsBytes: await readFile(new URL('government-results.csv', base)), validatedOn: '2026-11-01',
}
const mapping = JSON.parse(inputs.mappingBytes)
const csv = rows => Buffer.from(rows.map(row => row.map(value => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value).join(',')).join('\r\n') + '\r\n')
const actualRows = parseCsv(inputs.resultsBytes)
const group = { streetAddress: '12 Example Road', providers: [{ suburb: 'Test Suburb', postcode: '4115' }] }
function result(overrides = {}) {
  const row = Object.fromEntries(resultHeader.map(key => [key, '']))
  Object.assign(row, { InputIndex: '1', 'Address to Validate': '12 Example Road', LOCALITY: 'Test Suburb 4115',
    'Primary Address': '12 EXAMPLE RD', Locality: 'TEST SUBURB', Postcode: '4115', Latitude: '-27.5', Longitude: '153.1',
    Confidence: '100', GeocodeType: 'PC' }, overrides)
  row.FullAddress = overrides.FullAddress ?? `${row['Primary Address']}  ${row.Locality} QLD ${row.Postcode}`
  return row
}
const noSelection = outcome => {
  assert.equal(Object.hasOwn(outcome, 'latitude'), false)
  assert.equal(Object.hasOwn(outcome, 'longitude'), false)
}

test('strict CSV parsing supports proper quotes, escaped quotes, commas, newlines, BOM and no final newline', () => {
  assert.deepEqual(parseCsv(Buffer.from('\ufeffA,B\r\n"one,two","three""four"\r\n"line\nbreak",tail')), [['A', 'B'], ['one,two', 'three"four'], ['line\nbreak', 'tail']])
  for (const text of ['A,A\n1,2', 'A,B\n1', 'A,B\n\n', 'A,B\n"unclosed,2', 'A,B\n"closed"x,2', 'A,B\nstray"quote,2']) {
    assert.throws(() => parseCsv(Buffer.from(text)), /CSV/)
  }
  assert.throws(() => parseCsv(Buffer.from([0xff])), /encoded data/)
})

test('real reordered full results reconcile on InputIndex AND echoed input, never output position', () => {
  const original = reconcileResults(inputs.resultsBytes, mapping)
  const reverse = reconcileResults(csv([actualRows[0], ...actualRows.slice(1).reverse()]), mapping)
  for (const group of mapping.rows) assert.deepEqual(reverse.get(group.rowNumber), original.get(group.rowNumber))
  assert.equal(original.size, 39)
  assert.equal(original.get(26).Comment, '11 candidates address records found.')
  assert.deepEqual(benchmark({ ...inputs, resultsBytes: csv([actualRows[0], ...actualRows.slice(1).reverse()]) }).validated.providers,
    benchmark(inputs).validated.providers)
})

test('duplicate, missing, invalid, unexpected and conflicting records fail before any unsafe join', () => {
  const mutated = mutate => {
    const rows = structuredClone(actualRows); mutate(rows)
    return () => reconcileResults(csv(rows), mapping)
  }
  assert.throws(mutated(rows => rows.pop()), /Missing government/)
  assert.throws(mutated(rows => rows.push(rows[1])), /duplicate InputIndex/)
  assert.throws(mutated(rows => { rows[1][0] = '40' }), /Unexpected or duplicate/)
  assert.throws(mutated(rows => { rows[1][0] = '0' }), /Invalid government InputIndex/)
  assert.throws(mutated(rows => { rows[1][1] = 'A different street' }), /conflicts with original/)
  assert.throws(mutated(rows => { rows[1][2] = 'Wrong locality 4000' }), /conflicts with original/)
  assert.throws(mutated(rows => { rows[0][0] = 'uniqueID' }), /Unexpected government result schema/)
})

test('verified hashes and full sidecar/source reconciliation reject stale, tampered and mismatched evidence', () => {
  assert.throws(() => benchmark({ ...inputs, uploadBytes: Buffer.concat([inputs.uploadBytes, Buffer.from('\n')]) }), /SHA-256 mismatch/)
  assert.throws(() => benchmark({ ...inputs, sourceBytes: Buffer.from('[]') }), /SHA-256 mismatch/)
  assert.throws(() => benchmark({ ...inputs, baselineBytes: Buffer.from('[]') }), /SHA-256 mismatch/)
  for (const mutate of [m => { m.rows[0].providers.pop() }, m => { m.rows[0].rowNumber = 2 }, m => { m.summary.totalProviders = 53 }, m => { m.manualReview = [] }]) {
    const changed = structuredClone(mapping); mutate(changed)
    assert.throws(() => benchmark({ ...inputs, mappingBytes: Buffer.from(JSON.stringify(changed)) }), /does not reconcile/)
  }
  for (const validatedOn of [undefined, 'yesterday', '2026-02-30']) assert.throws(() => benchmark({ ...inputs, validatedOn }), /actual validation date/)
  const smokeBytes = inputs.resultsBytes.subarray(0, 20)
  assert.throws(() => benchmark({ ...inputs, resultsBytes: smokeBytes }), /schema/)
})

test('the actual smoke output cannot substitute for the complete government batch', async () => {
  const resultsBytes = await readFile(new URL('government-smoke-results.csv', base))
  assert.throws(() => benchmark({ ...inputs, resultsBytes }), /conflicts with original input address\/locality/)
  assert.equal(sha256(inputs.resultsBytes), 'd34d29a77196bdc04ea8c21f9d2cb7c2c261e70a865b9964162ef130db008a01')
})

test('accepts only consistent complete property-centroid evidence, with conservative unit handling', () => {
  const accepted = validateResult(group, result())
  assert.equal(accepted.status, 'accepted')
  assert.equal(accepted.precision, 'property-centroid')
  assert.equal(accepted.latitude, -27.5)
  assert.deepEqual(accepted.reasons, ['exact-source-address-components-confidence-100-PC'])
  const unitGroup = { ...group, streetAddress: 'unit 1/12 Example Road' }
  assert.equal(validateResult(unitGroup, result({ 'Primary Address': 'UNIT 1 12 EXAMPLE RD' })).status, 'accepted')
  assert.equal(validateResult(unitGroup, result({ 'Primary Address': 'UNIT 2 12 EXAMPLE RD' })).status, 'rejected')
  assert.equal(validateResult(unitGroup, result()).status, 'needs-review')
})

test('high confidence never overrides locality/postcode/street/house/state/coordinate conflicts', () => {
  const cases = [
    [{ Locality: 'WRONG SUBURB' }, 'locality-mismatch'], [{ Postcode: '4000' }, 'postcode-mismatch'],
    [{ 'Primary Address': '12 ANOTHER RD' }, 'street-mismatch'], [{ 'Primary Address': '14 EXAMPLE RD' }, 'house-number-mismatch'],
    [{ FullAddress: '12 EXAMPLE RD TEST SUBURB NSW 4115' }, 'state-mismatch'],
    [{ Latitude: '' }, 'invalid-or-incomplete-coordinate-pair'], [{ Longitude: 'NaN' }, 'invalid-or-incomplete-coordinate-pair'],
    [{ Longitude: '1e2' }, 'invalid-or-incomplete-coordinate-pair'], [{ Latitude: '91' }, 'invalid-or-incomplete-coordinate-pair'],
    [{ Latitude: '0' }, 'coordinates-outside-broad-queensland-bounds'],
  ]
  for (const [overrides, reason] of cases) {
    const outcome = validateResult(group, result(overrides))
    assert.equal(outcome.status, 'rejected', reason)
    assert.ok(outcome.reasons.includes(reason), reason)
    noSelection(outcome)
  }
})

test('ranges, suffix changes, low/missing confidence, unsupported types and incomplete evidence require review', () => {
  const cases = [
    [{ 'Primary Address': '1-12 EXAMPLE RD' }, 'house-number-range-requires-review'],
    [{ 'Primary Address': '12A EXAMPLE RD' }, 'house-number-suffix-changed'],
    [{ Confidence: '99' }, 'confidence-not-100'], [{ Confidence: '' }, 'confidence-not-100'],
    [{ GeocodeType: 'TP' }, 'unsupported-or-missing-geocode-type'], [{ GeocodeType: '' }, 'unsupported-or-missing-geocode-type'],
    [{ FullAddress: 'OTHER ADDRESS' }, 'full-address-components-not-consistent-with-queensland'],
    [{ 'Primary Address': 'EXAMPLE RD' }, 'house-number-evidence-missing'], [{ Comment: 'Review needed' }, 'government-comment-requires-review'],
    [{ Postcode: '' }, 'missing-returned-locality-or-postcode'],
  ]
  for (const [overrides, reason] of cases) {
    const outcome = validateResult(group, result(overrides))
    assert.equal(outcome.status, 'needs-review', reason)
    assert.ok(outcome.reasons.includes(reason), reason)
    noSelection(outcome)
  }
  assert.equal(validateResult({ ...group, streetAddress: '1-12 Example Road' }, result({ 'Primary Address': '1-12 EXAMPLE RD' })).status, 'needs-review')
  assert.equal(validateResult(group, result({ 'Primary Address': '200-300 EXAMPLE RD' })).status, 'rejected')
})

test('no coordinates retain explicit ambiguity, no-candidate unmatched and unknown-comment review without invented points', () => {
  for (const [comment, status] of [['11 candidates address records found.', 'ambiguous'], ['0 candidates address records found.', 'unmatched'],
    ['1 candidates address records found.', 'needs-review'], ['Unexpected service response', 'needs-review']]) {
    const row = Object.fromEntries(resultHeader.map(key => [key, '']))
    Object.assign(row, { InputIndex: '1', 'Address to Validate': '12 Example Road', LOCALITY: 'Test Suburb 4115', Comment: comment })
    const outcome = validateResult(group, row)
    assert.equal(outcome.status, status)
    noSelection(outcome)
  }
})

test('cross-source coordinate disagreement triggers review without treating Nominatim as truth', () => {
  assert.equal(distanceMetres({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 }), 0)
  assert.equal(distanceMetres({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }), 111195)
  const changed = JSON.parse(inputs.baselineBytes)
  const club = changed.find(provider => provider.name === 'Cannons Southside Inc')
  club.geocode.latitude = -28
  const baselineBytes = Buffer.from(JSON.stringify(changed))
  const sidecar = structuredClone(mapping); sidecar.inputs.baseline.sha256 = sha256(baselineBytes)
  const output = benchmark({ ...inputs, baselineBytes, mappingBytes: Buffer.from(JSON.stringify(sidecar)) })
  const comparison = output.comparison.providers.find(provider => provider.id === club.id)
  const outcome = output.validated.providers.find(provider => provider.id === club.id).qldGeocode
  assert.equal(comparison.materialDisagreement, true)
  assert.equal(outcome.status, 'needs-review')
  assert.ok(outcome.reasons.includes('cross-source-coordinate-disagreement-over-250m'))
  noSelection(outcome)
})

test('actual sample reconciles 54 providers, 27 raw address pairs and conservative accepted coverage', () => {
  const output = benchmark(inputs)
  const { providers, summary } = output.validated
  assert.deepEqual(summary.addressOutcomes, { accepted: 19, unmatched: 0, ambiguous: 12, rejected: 1, 'needs-review': 8 })
  assert.deepEqual(summary.providerOutcomes, { accepted: 25, unmatched: 0, ambiguous: 19, rejected: 1, 'needs-review': 9 })
  assert.equal(summary.rawCoordinateAddresses, 27)
  assert.equal(summary.rawCoordinateProviders, 34)
  assert.equal(summary.additionalTrustworthyMatches, 11)
  assert.equal(summary.previousMatchesNotAccepted, 5)
  assert.equal(summary.acceptedProviderCoveragePercent, 46.3)
  const source = JSON.parse(inputs.sourceBytes)
  assert.equal(new Set(providers.map(provider => provider.id)).size, 54)
  assert.deepEqual(providers.map(({ qldGeocode: outcome, ...provider }) => { if (outcome.status !== 'accepted') noSelection(outcome); return provider }), source)
  const shared = providers.filter(provider => provider.address.startsWith('2A Ross Llewellyn Drive'))
  assert.equal(shared.length, 7)
  assert.ok(shared.every(provider => provider.qldGeocode.status === 'accepted'))
  assert.equal(new Set(shared.map(provider => provider.qldGeocode.addressKey)).size, 1)
  assert.equal(providers.find(provider => provider.name.startsWith('Wellington Point Kings')).qldGeocode.inputIndex, null)
  assert.equal(providers.find(provider => provider.address.startsWith('695 Cavendish')).qldGeocode.status, 'rejected')
  assert.equal(providers.find(provider => provider.address.startsWith('134 Parkland')).qldGeocode.status, 'needs-review')
  assert.equal(output.validated.provenance.sourceLastChecked, null)
  assert.deepEqual(benchmark(inputs), output)
  assert.equal(renderReport(output), renderReport(benchmark(inputs)))
})
