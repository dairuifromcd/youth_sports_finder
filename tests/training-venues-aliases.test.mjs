import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { test } from 'node:test'
import { createVenueResultValidator, validateVenueResult, normalizedVenueName, normalizedTrainingStreet } from '../scripts/training-venues/validate.mjs'
import { createAliasVerifier, footprintMembership, verifiedAliasBindings } from '../scripts/training-venues/aliases.mjs'
import { resultHeader, reconcileResults, parseCsv } from '../scripts/qld-geocoder/compare.mjs'
import { sha256 } from '../scripts/qld-geocoder/export.mjs'
import { json } from '../scripts/training-venues/prepare.mjs'

const inputAddress = { streetAddress: '25 Peel Street', suburb: 'Manly', postcode: '4179' }
const aliasAddress = { streetAddress: '77 Buderim Street', suburb: 'Wynnum', postcode: '4178' }
const site = { physicalSiteId: 'PS079', venueIds: ['V079'], venueName: 'Wynnum State High School',
  aliases: ['Wynnum State High School'], address: { ...inputAddress, kind: 'numbered-street' },
  unresolvedConflicts: [], originalVenueIdentityResolved: true, addressEvidence: [{ evidenceId: 'SYNTHETIC-ADDRESS' }],
  precisionWhenValidated: 'campus-level' }
const context = { evidence: new Map(), sources: new Map(), venues: new Map() }
const coordinate = { latitude: -27.5, longitude: 153.05 }

function result(overrides = {}) {
  return { ...Object.fromEntries(resultHeader.map(key => [key, ''])), InputIndex: '1',
    'Address to Validate': inputAddress.streetAddress, LOCALITY: 'Manly 4179',
    'Primary Address': aliasAddress.streetAddress, Locality: aliasAddress.suburb, Postcode: aliasAddress.postcode,
    'Complex-Building Name': 'Wynnum State High School', LotNumber: 'SYNTHETIC-LOT', PlanNumber: 'SYNTHETIC-PLAN',
    Longitude: '153.05', Latitude: '-27.50', GeocodeType: 'PC', Confidence: '100',
    FullAddress: '77 Buderim Street Wynnum QLD 4178', ...overrides }
}

// Trust is injected only into the test factory, with explicit in-memory synthetic artifacts.
// These bytes are never written to the production registry, government CSV or generated data.
function fixture() {
  const parcel = { lotNumber: 'SYNTHETIC-LOT', planNumber: 'SYNTHETIC-PLAN' }
  const identity = { physicalSiteId: 'PS079', venueId: 'V079', campusId: 'SYNTHETIC-CAMPUS', officialSiteName: site.venueName }
  const geometry = { type: 'Polygon', coordinates: [[[153, -27.55], [153.1, -27.55], [153.1, -27.45], [153, -27.45], [153, -27.55]]] }
  const footprint = { type: 'Feature', id: 'SYNTHETIC-PARCEL-FEATURE', properties: { lot: parcel.lotNumber, plan: parcel.planNumber }, geometry }
  const documents = new Map([
    ['synthetic/school.html', Buffer.from('SYNTHETIC official-school document fixture; not genuine external evidence.')],
    ['synthetic/council.html', Buffer.from('SYNTHETIC council two-address same-campus registration fixture; not genuine evidence.')],
    ['synthetic/parcel.geojson', Buffer.from(json(footprint))],
  ])
  const evidence = [
    { role: 'school-current-address', authority: 'official-school', sourceUrl: 'https://synthetic-school.invalid/contact',
      file: 'synthetic/school.html', reviewedFacts: { ...identity, currentOfficialAddress: inputAddress } },
    { role: 'council-same-site-registration', authority: 'local-government', sourceUrl: 'https://synthetic-council.invalid/address-register',
      file: 'synthetic/council.html', reviewedFacts: { ...identity, siteAddresses: [inputAddress, aliasAddress], parcel } },
    { role: 'authoritative-parcel-footprint', authority: 'queensland-government-cadastre', sourceUrl: 'https://synthetic-cadastre.invalid/parcel',
      file: 'synthetic/parcel.geojson', reviewedFacts: { ...identity, crs: 'EPSG:4326', parcel, featureId: footprint.id,
        propertyKeys: { lotNumber: 'lot', planNumber: 'plan' } } },
  ].map(reference => ({ ...reference, independentOfGeocoder: true, sha256: sha256(documents.get(reference.file)) }))
  const binding = { ...identity, bindingId: 'SYNTHETIC-VERIFIED-ALIAS', reviewRecordId: 'SYNTHETIC-INDEPENDENT-REVIEW',
    reviewedOn: '2026-11-06', inputAddress, aliasAddress, parcel, evidence }
  const options = { bindings: [binding], loadEvidence: path => {
    if (!documents.has(path)) throw new Error('Synthetic evidence unavailable')
    return documents.get(path)
  }, proposed: [] }
  return { binding, documents, footprint, options, validator: createVenueResultValidator(options) }
}

test('a PS079 proposal alone is Ambiguous; only the one independently reviewed production binding can establish trust', () => {
  assert.equal(verifiedAliasBindings.length, 1)
  assert.equal(verifiedAliasBindings[0].physicalSiteId, 'PS079')
  const output = createVenueResultValidator({ bindings: [] })(site, result({ LotNumber: '378', PlanNumber: 'SL6111' }), context)
  assert.equal(output.status, 'Ambiguous')
  assert.equal(output.sameSiteAlias.status, 'Proposed')
  assert.equal(output.acceptedCoordinates, null)
  assert.deepEqual(output.candidateCoordinates, coordinate)
  assert.equal(output.sameSiteAlias.requiredChecks.length, 6)
  const review = JSON.parse(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/same-site-alias-review.json', import.meta.url)))
  assert.equal(review.proposedAliases[0].acceptedCoordinates, null)
  assert.equal(review.proposedAliases[0].candidateCoordinates, null)
})

test('explicit synthetic verified same-campus alias may differ in street/locality/postcode with parcel and spatial proof', () => {
  const { validator } = fixture()
  const row = result(), snapshot = structuredClone(row)
  const output = validator(site, row, context)
  assert.equal(output.status, 'Accepted')
  assert.equal(output.precision, 'campus-level')
  assert.deepEqual(output.acceptedCoordinates, coordinate)
  assert.equal(output.sameSiteAlias.status, 'Verified')
  assert.equal(output.sameSiteAlias.evidence.length, 3)
  assert.equal(output.sameSiteAlias.spatialVerification.membership, 'inside')
  assert.equal(output.originalInputAddress.streetAddress, '25 Peel Street')
  assert.equal(output.returnedAddress.primaryAddress, '77 Buderim Street')
  assert.equal(output.returnedAddress.lotNumber, row.LotNumber)
  assert.equal(output.returnedAddress.planNumber, row.PlanNumber)
  assert.deepEqual(output.governmentEvidence.rawGovernmentRow, snapshot)
  assert.deepEqual(row, snapshot)
})

test('adjacent different school, different campus and generic same-site claims never bypass identity', () => {
  const { validator } = fixture()
  const namedContext = { ...context, venues: new Map([['other', { venueId: 'OTHER-SCHOOL', physicalSiteId: 'OTHER-SITE', venueName: 'Adjacent Different State School', aliases: [] }]]) }
  for (const name of ['Adjacent Different State School', 'Wynnum State High School — Different Campus']) {
    assert.equal(validator(site, result({ 'Complex-Building Name': name }), namedContext).status, 'Rejected')
  }
  const unresolved = validator({ ...site, originalVenueIdentityResolved: false }, result(), context)
  assert.equal(unresolved.status, 'Ambiguous')
  assert.equal(unresolved.acceptedCoordinates, null)
  const spoofed = { ...context, sameSite: true, reviewed: true, independentlyVerified: true,
    aliases: fixture().options.bindings, distanceMetres: 1 }
  assert.notEqual(validateVenueResult(site, result(), spoofed).status, 'Accepted')
})

test('missing, tampered, incomplete or wrong-campus proof artifacts cannot authorize alias coordinates', () => {
  const cases = [
    f => f.documents.delete('synthetic/school.html'),
    f => f.documents.set('synthetic/council.html', Buffer.from('tampered SYNTHETIC evidence')),
    f => f.binding.evidence.pop(),
    f => f.binding.evidence[1].reviewedFacts.campusId = 'OTHER-CAMPUS',
    f => f.binding.evidence[0].reviewedFacts.currentOfficialAddress = { ...aliasAddress, streetAddress: '99 Other Campus Road' },
    f => f.binding.evidence[1].reviewedFacts.siteAddresses = [aliasAddress],
    f => f.binding.evidence[2].reviewedFacts.crs = 'EPSG:3857',
    f => f.binding.evidence[0].sourceUrl = 'https://geocode.information.qld.gov.au/',
    f => f.binding.evidence[0].independentOfGeocoder = false,
  ]
  for (const mutate of cases) {
    const f = fixture(); mutate(f)
    const output = f.validator(site, result(), context)
    assert.equal(output.status, 'Ambiguous')
    assert.equal(output.acceptedCoordinates, null)
    assert.equal(output.sameSiteAlias.status, 'Unverified')
  }
  const arbitrary = createVenueResultValidator({ bindings: [{ physicalSiteId: 'PS079', venueId: 'V079', inputAddress, aliasAddress,
    reviewed: true, verified: true }], proposed: [] })
  assert.equal(arbitrary(site, result(), context).status, 'Ambiguous')
})

test('wrong actual Lot/Plan and coordinates outside authoritative footprint are rejected even nearby', () => {
  const { validator } = fixture()
  for (const patch of [{ LotNumber: 'WRONG-LOT' }, { PlanNumber: 'WRONG-PLAN' }, { LotNumber: '' }, { PlanNumber: '' },
    { Longitude: '153.1001' }, { Latitude: '-27.5501' }]) {
    const output = validator(site, result(patch), context)
    assert.equal(output.status, 'Rejected', json(patch))
    assert.equal(output.acceptedCoordinates, null)
  }
  assert.equal(validator(site, result({ LotNumber: 'WRONG-LOT', Confidence: '97' }), context).status, 'Rejected')
  assert.equal(validator(site, result({ Longitude: '153.1001', Confidence: '97' }), context).status, 'Rejected')
})

const genuineResultPath = new URL('../output/workflow/2026-11-06/training-venue-same-site-aliases/inputs/government-results.csv', import.meta.url)
test('genuine exact PS079 row keeps 97 and is independently adjudicated at campus level without altering its CSV', {
  skip: existsSync(genuineResultPath) ? false : 'Private genuine government export not present; no substitute is generated.',
}, () => {
  const bytes = readFileSync(genuineResultPath), before = sha256(bytes)
  assert.equal(before, 'af93783481c4b2917abe63b98355776631bffd7d2beb376e11847983b481a8af')
  const mappingBytes = readFileSync(new URL('../data/benchmarks/training-venue-geocoding/address-mapping.json', import.meta.url))
  const mapping = JSON.parse(mappingBytes), returned = reconcileResults(bytes, mapping)
  assert.equal(returned.size, 28)
  const row = mapping.rows.find(r => r.physicalSiteId === 'PS079'), government = returned.get(row.rowNumber)
  assert.equal(government.Confidence, '97')
  assert.equal(government.LotNumber, '378')
  assert.equal(government.PlanNumber, 'SL6111')
  const output = validateVenueResult(site, government, context)
  assert.equal(output.status, 'Accepted')
  assert.equal(output.sameSiteAlias.status, 'Verified')
  assert.equal(output.precision, 'campus-level')
  assert.equal(output.confidenceReviewAdjudication.originalConfidence, '97')
  assert.equal(output.confidenceReviewAdjudication.resolvedReason, 'confidence-not-100')
  assert.equal(output.sameSiteAlias.spatialVerification.featureName, null)
  assert.equal(output.sameSiteAlias.spatialVerification.featureNameUsedAsSchoolIdentity, false)
  assert.equal(output.confidence, '97')
  assert.deepEqual(output.governmentEvidence.rawGovernmentRow, government)
  assert.equal(sha256(readFileSync(genuineResultPath)), before)
  assert.deepEqual(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/address-mapping.json', import.meta.url)), mappingBytes)
})

test('venue name normalization removes only a complete plain outer-parenthesis wrapper', () => {
  assert.equal(normalizedVenueName('(CORINDA STATE HIGH SCHOOL)'), normalizedVenueName('Corinda State High School'))
  assert.notEqual(normalizedVenueName('(CORINDA STATE HIGH SCHOOL) OTHER CAMPUS'), normalizedVenueName('Corinda State High School'))
  assert.notEqual(normalizedVenueName('(CORINDA JUNIOR STATE SCHOOL)'), normalizedVenueName('Corinda State High School'))
  assert.notEqual(normalizedVenueName('(SPRINGWOOD ROAD PRIMARY & PRE-SCHOOL)'), normalizedVenueName('Springwood Road State School'))
  assert.notEqual(normalizedVenueName('(CORNUBIA PARK)'), normalizedVenueName('Cornubia Park Sports Centre'))
})

const privateResearchPath = new URL('../output/workflow/2026-11-06/training-venue-geocoding/inputs/youth_training_venues_phase2_revised_local.json', import.meta.url)
test('actual PS077 wrapper format accepts its independently evidenced campus and rejects different campus names', {
  skip: existsSync(genuineResultPath) && existsSync(privateResearchPath) ? false : 'Exact genuine CSV/private address evidence is unavailable.',
}, () => {
  const research = JSON.parse(readFileSync(privateResearchPath))
  const actualContext = { evidence: new Map(research.evidence.map(e => [e.evidenceId, e])), sources: new Map(research.sources.map(s => [s.sourceId, s])),
    venues: new Map(research.venues.map(v => [v.venueId, v])) }
  const inventory = JSON.parse(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/venue-inventory.json', import.meta.url)))
  const mapping = JSON.parse(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/address-mapping.json', import.meta.url)))
  const results = reconcileResults(readFileSync(genuineResultPath), mapping)
  const school = inventory.sites.find(s => s.physicalSiteId === 'PS077'), row = mapping.rows.find(r => r.physicalSiteId === 'PS077')
  const actual = results.get(row.rowNumber), output = validateVenueResult(school, actual, actualContext)
  assert.equal(actual['Complex-Building Name'], '(CORINDA STATE HIGH SCHOOL)')
  assert.equal(output.status, 'Accepted')
  assert.equal(output.precision, 'campus-level')
  assert.equal(output.governmentEvidence.rawGovernmentRow['Complex-Building Name'], actual['Complex-Building Name'])
  for (const name of ['(CORINDA JUNIOR STATE SCHOOL)', '(CORINDA STATE HIGH SCHOOL) DIFFERENT CAMPUS']) {
    assert.notEqual(validateVenueResult(school, { ...actual, 'Complex-Building Name': name }, actualContext).status, 'Accepted')
  }
  assert.equal(validateVenueResult(school, { ...actual, 'Complex-Building Name': '(MANLY STATE SCHOOL)' }, actualContext).status, 'Rejected')
  const noCoordinates = mapping.rows.filter(r => !results.get(r.rowNumber).Latitude && !results.get(r.rowNumber).Longitude)
  assert.equal(noCoordinates.length, 8)
  const classifications = noCoordinates.map(r => validateVenueResult(inventory.sites.find(s => s.physicalSiteId === r.physicalSiteId), results.get(r.rowNumber), actualContext))
  assert.equal(classifications.filter(s => s.governmentOutcome === 'multiple-candidates-without-selected-coordinate').length, 7)
  const parsing = classifications.find(s => s.physicalSiteId === 'PS020')
  assert.equal(parsing.governmentOutcome, 'address-parsing-failure')
  assert.equal(parsing.status, 'Ambiguous')
  assert.equal(parsing.governmentEvidence.comment, 'Unable to fulfil parsing Address request')
  assert.equal(classifications.every(s => s.candidateCoordinates === null && s.acceptedCoordinates === null), true)
})

test('footprint holes, exact boundary, invalid geometry and coordinate validity remain conservative', () => {
  const f = fixture()
  const polygon = structuredClone(f.footprint.geometry)
  polygon.coordinates.push([[153.04, -27.51], [153.06, -27.51], [153.06, -27.49], [153.04, -27.49], [153.04, -27.51]])
  assert.equal(footprintMembership(coordinate, polygon), 'outside')
  assert.equal(footprintMembership({ latitude: -27.5, longitude: 153 }, polygon), 'boundary')
  assert.equal(footprintMembership(coordinate, { type: 'MultiPolygon', coordinates: [f.footprint.geometry.coordinates] }), 'inside')
  assert.throws(() => footprintMembership(coordinate, { type: 'Point', coordinates: [153.05, -27.5] }), /polygon/)
  const boundary = f.validator(site, result({ Longitude: '153' }), context)
  assert.equal(boundary.status, 'Ambiguous')
  for (const patch of [{ Latitude: 'NaN' }, { Longitude: '181' }, { Latitude: '', Longitude: '' }, { Latitude: '0', Longitude: '0' }]) {
    assert.notEqual(f.validator(site, result(patch), context).status, 'Accepted')
  }
})

test('alias still passes the unchanged strict return-address/confidence/type/precision validator', () => {
  const { validator } = fixture()
  for (const patch of [{ Confidence: '99' }, { GeocodeType: 'Suburb centroid' }, { GeocodeType: 'Street Midpoint' },
    { GeocodeType: 'SC' }, { Comment: 'Needs review' }, { FullAddress: 'Inconsistent different address' },
    { Postcode: '4000' }, { 'Primary Address': '79 Buderim Street' }]) {
    const output = validator(site, result(patch), context)
    assert.notEqual(output.status, 'Accepted', json(patch))
    assert.equal(output.acceptedCoordinates, null)
  }
  const abbreviated = validator(site, result({ 'Primary Address': '77 Buderim St', FullAddress: '77 Buderim St Wynnum QLD 4178' }), context)
  assert.equal(abbreviated.status, 'Accepted')
})

test('unresolved source conflict and other physical sites receive no PS079 automatic exception', () => {
  const { validator } = fixture()
  assert.equal(validator({ ...site, unresolvedConflicts: [{ status: 'Unresolved' }] }, result(), context).status, 'Ambiguous')
  for (const physicalSiteId of ['PS005', 'PS044', 'R2L-PS002']) {
    const other = { ...site, physicalSiteId, venueIds: ['OTHER-VENUE'] }
    assert.equal(validateVenueResult(other, result(), context).status, 'Rejected')
    assert.equal(validator(other, result(), context).status, 'Rejected')
  }
  assert.equal(validateVenueResult(site, result({ 'Primary Address': '12 Completely Other Road' }), context).status, 'Rejected')
})

test('same-site alias never relaxes InputIndex/echo joins or mutates result CSV/mapping bytes', () => {
  const sourceMappingBytes = readFileSync(new URL('../data/benchmarks/training-venue-geocoding/address-mapping.json', import.meta.url))
  const uploadBytes = readFileSync(new URL('../data/benchmarks/training-venue-geocoding/addresses.csv', import.meta.url))
  const fullMapping = JSON.parse(sourceMappingBytes), row = fullMapping.rows.find(row => row.physicalSiteId === 'PS079')
  const mapping = { ...fullMapping, rows: [row] }, mappingSnapshot = json(mapping)
  const data = result({ InputIndex: String(row.rowNumber), 'Address to Validate': row.streetAddress, LOCALITY: row.locality })
  const quote = value => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
  const bytes = Buffer.from([resultHeader, resultHeader.map(key => data[key])].map(fields => fields.map(quote).join(',')).join('\r\n') + '\r\n')
  const digest = sha256(bytes)
  const returned = reconcileResults(bytes, mapping).get(row.rowNumber)
  assert.equal(fixture().validator(site, returned, context).status, 'Accepted')
  assert.equal(sha256(bytes), digest)
  assert.equal(json(mapping), mappingSnapshot)
  assert.equal(sha256(uploadBytes), fullMapping.csv.sha256)
  assert.deepEqual(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/address-mapping.json', import.meta.url)), sourceMappingBytes)
  const changed = Buffer.from(bytes.toString().replace(`${row.streetAddress},${row.locality}`, `${row.streetAddress},Wrong 4000`))
  assert.throws(() => reconcileResults(changed, mapping), /conflicts/)
  assert.throws(() => reconcileResults(bytes, { ...mapping, rows: [] }), /Unexpected/)
})

test('production alias verifier cannot consume unregistered externally asserted proof or confidence-only approvals', () => {
  const check = createAliasVerifier({ bindings: [] })
  const noRegistry = check(site, result(), coordinate)
  assert.equal(noRegistry.status, 'Proposed')
  assert.equal(noRegistry.evidence.length, 0)
  assert.notEqual(noRegistry.status, 'Verified')
  const actualResults = JSON.parse(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/venue-geocoding-results.json', import.meta.url)))
  if (!actualResults.governmentResultProvenance) {
    assert.deepEqual(actualResults.summary, { Accepted: 0, Ambiguous: 0, Rejected: 0, Pending: 58 })
    assert.equal(actualResults.sites.find(s => s.physicalSiteId === 'PS079').status, 'Pending')
  } else {
    assert.equal(actualResults.sites.length, 58)
    assert.equal(actualResults.sites.find(s => s.physicalSiteId === 'PS079').confidence, '97')
    assert.equal(actualResults.sites.find(s => s.physicalSiteId === 'PS079').status, 'Accepted')
  }
})

function genuinePs079Row() {
  const mapping = JSON.parse(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/address-mapping.json', import.meta.url)))
  return reconcileResults(readFileSync(genuineResultPath), mapping).get(25)
}

function actualChainFixture() {
  const binding = structuredClone(verifiedAliasBindings[0])
  const documents = new Map(binding.evidence.map(reference => [reference.file, readFileSync(new URL(`../${reference.file}`, import.meta.url))]))
  const options = { bindings: [binding], proposed: [], loadEvidence: file => {
    if (!documents.has(file)) throw new Error('Official evidence removed in negative test')
    return documents.get(file)
  } }
  return { binding, documents, validator: createVenueResultValidator(options),
    changeDocument(role, mutate, recomputeHash = true) {
      const reference = binding.evidence.find(reference => reference.role === role)
      const document = JSON.parse(documents.get(reference.file)); mutate(document)
      const bytes = Buffer.from(json(document)); documents.set(reference.file, bytes)
      if (recomputeHash) reference.sha256 = sha256(bytes)
    } }
}

test('every genuine PS079 field mutation loses the exact-row confidence adjudication and cannot grant acceptance', {
  skip: existsSync(genuineResultPath) ? false : 'Private genuine export is not present.',
}, () => {
  const actual = genuinePs079Row()
  const patches = { InputIndex: '26', 'Address to Validate': '26 Peel Street', LOCALITY: 'Wynnum 4178',
    'Primary Address': '77 Buderim Street', Locality: 'Wynnum', Postcode: '4179', 'Local Government Name': 'OTHER COUNCIL',
    LotNumber: '379', PlanNumber: 'OTHERPLAN', Longitude: '153.17627526', Latitude: '-27.4542585',
    GeocodeType: 'SC', Confidence: '100', FullAddress: '77 BUDERIM ST WYNNUM QLD 4178', 'Complex-Building Name': '(WYNNUM STATE HIGH SCHOOL)', Comment: 'Review' }
  for (const [field, changed] of Object.entries(patches)) {
    const output = validateVenueResult(site, { ...actual, [field]: changed }, context)
    assert.notEqual(output.status, 'Accepted', field)
    assert.equal(output.acceptedCoordinates, null, field)
    assert.equal(output.confidenceReviewAdjudication, undefined, field)
  }
  for (const confidence of ['96', '98', '99']) {
    assert.notEqual(validateVenueResult(site, { ...actual, Confidence: confidence }, context).status, 'Accepted')
  }
})

test('the actual official chain fails closed for missing/tampered evidence, wrong campus, false source facts and unsupported CRS', {
  skip: existsSync(genuineResultPath) ? false : 'Private genuine export is not present.',
}, () => {
  const actual = genuinePs079Row()
  const cases = [
    f => f.documents.delete(f.binding.evidence[0].file),
    f => f.documents.set(f.binding.evidence[0].file, Buffer.from('{}')),
    f => f.binding.campusId = 'OTHER-CAMPUS',
    f => f.changeDocument('school-current-address', doc => doc.physicalAddress.houseNumber = '25'),
    f => f.changeDocument('school-current-address', doc => doc.schoolName = 'Different State High School'),
    f => f.changeDocument('council-campus-registration', doc => doc.placeName = 'Different School (QHR)'),
    f => f.changeDocument('official-dual-address-registration', doc => doc.features[0].attributes.address = '26 Peel Street Wynnum QLD'),
    f => f.changeDocument('official-dual-address-registration', doc => doc.features[1].attributes.plan = 'OTHERPLAN'),
    f => f.changeDocument('authoritative-parcel-source', doc => doc.spatialReference.wkid = 3857),
    f => f.binding.evidence.find(e => e.role === 'official-dual-address-registration').sourceUrl = 'https://unrelated.invalid/',
  ]
  for (const mutate of cases) {
    const f = actualChainFixture(); mutate(f)
    const output = f.validator(site, actual, context)
    assert.notEqual(output.status, 'Accepted')
    assert.equal(output.acceptedCoordinates, null)
    assert.equal(output.confidenceReviewAdjudication, undefined)
  }
})

test('an authoritative footprint hole excludes the actual point even when a negative fixture updates all derivative hashes', {
  skip: existsSync(genuineResultPath) ? false : 'Private genuine export is not present.',
}, () => {
  const f = actualChainFixture(), actual = genuinePs079Row(), x = Number(actual.Longitude), y = Number(actual.Latitude)
  const hole = [[x - 0.00001, y - 0.00001], [x + 0.00001, y - 0.00001], [x + 0.00001, y + 0.00001], [x - 0.00001, y + 0.00001], [x - 0.00001, y - 0.00001]]
  f.changeDocument('authoritative-parcel-source', document => document.features[0].geometry.rings.push(hole))
  const source = f.binding.evidence.find(e => e.role === 'authoritative-parcel-source')
  f.changeDocument('authoritative-parcel-footprint', document => {
    document.geometry.coordinates.push(hole); document.properties.provenance.sourceSha256 = source.sha256
  })
  const output = f.validator(site, actual, context)
  assert.equal(output.status, 'Rejected')
  assert.equal(output.sameSiteAlias.spatialVerification.membership, 'outside')
  assert.equal(output.acceptedCoordinates, null)
})

test('training-only AV/Avenue and terminal W/West formatting preserves street names, direction and numeric suffix safeguards', {
  skip: existsSync(genuineResultPath) && existsSync(privateResearchPath) ? false : 'Exact private sources unavailable.',
}, () => {
  assert.equal(normalizedTrainingStreet('18 PARKWAY AV'), normalizedTrainingStreet('18 Parkway Avenue'))
  assert.equal(normalizedTrainingStreet('109 WEEDON ST W'), normalizedTrainingStreet('109 Weedon Street West'))
  assert.notEqual(normalizedTrainingStreet('109 WEEDON ST E'), normalizedTrainingStreet('109 Weedon Street West'))
  assert.notEqual(normalizedTrainingStreet('109 W STREET'), normalizedTrainingStreet('109 West Street'))
  const research = JSON.parse(readFileSync(privateResearchPath)), actualContext = { evidence: new Map(research.evidence.map(e => [e.evidenceId, e])),
    sources: new Map(research.sources.map(s => [s.sourceId, s])), venues: new Map(research.venues.map(v => [v.venueId, v])) }
  const inventory = JSON.parse(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/venue-inventory.json', import.meta.url)))
  const mapping = JSON.parse(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/address-mapping.json', import.meta.url)))
  const rows = reconcileResults(readFileSync(genuineResultPath), mapping)
  for (const id of ['PS009', 'PS066']) {
    const school = inventory.sites.find(s => s.physicalSiteId === id), row = rows.get(mapping.rows.find(r => r.physicalSiteId === id).rowNumber)
    const output = validateVenueResult(school, row, actualContext)
    assert.equal(output.status, 'Ambiguous')
    assert.equal(output.addressFormatReview.diagnosticResolved, 'street-mismatch')
    assert.equal(output.acceptedCoordinates, null)
    assert.deepEqual(output.governmentEvidence.rawGovernmentRow, row)
    for (const changed of ['109 WEEDON ST E', '109 DIFFERENT ST W', '109A WEEDON ST W']) {
      assert.notEqual(validateVenueResult(school, { ...row, 'Primary Address': changed }, actualContext).status, 'Accepted')
    }
  }
  for (const id of ['PS044', 'PS046']) {
    const school = inventory.sites.find(s => s.physicalSiteId === id), row = rows.get(mapping.rows.find(r => r.physicalSiteId === id).rowNumber)
    const output = validateVenueResult(school, row, actualContext)
    assert.equal(output.status, 'Ambiguous')
    assert.ok(output.reasons.includes('returned-building-label-needs-independent-identity-review'))
    assert.equal(output.acceptedCoordinates, null)
  }
  const school = inventory.sites.find(s => s.physicalSiteId === 'PS077'), row = rows.get(23)
  assert.equal(validateVenueResult(school, { ...row, 'Complex-Building Name': '(WYNNUM STATE HIGH SCHOOL)' }, actualContext).status, 'Rejected')
})

test('formal result projection retains all 58 sites, exact government records and 30 untouched held records with accepted-only coordinates', {
  skip: existsSync(genuineResultPath) ? false : 'Private genuine export is not present.',
}, () => {
  const actualResults = JSON.parse(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/venue-geocoding-results.json', import.meta.url)))
  assert.deepEqual(actualResults.summary, { Accepted: 16, Ambiguous: 11, Rejected: 1, Pending: 30 })
  assert.equal(actualResults.governmentResultProvenance.obtainedOn, '2026-11-06')
  assert.equal(actualResults.governmentResultProvenance.resultCsvSha256, 'af93783481c4b2917abe63b98355776631bffd7d2beb376e11847983b481a8af')
  const mapping = JSON.parse(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/address-mapping.json', import.meta.url)))
  const government = reconcileResults(readFileSync(genuineResultPath), mapping)
  for (const row of mapping.rows) {
    const output = actualResults.sites.find(site => site.physicalSiteId === row.physicalSiteId)
    assert.deepEqual(output.governmentEvidence.rawGovernmentRow, government.get(row.rowNumber))
    if (output.status !== 'Accepted') assert.equal(output.acceptedCoordinates, null)
  }
  const snapshotPath = new URL('../output/workflow/2026-11-06/training-venue-same-site-aliases/main/stage-a-before-import/venue-geocoding-results.json', import.meta.url)
  if (existsSync(snapshotPath)) {
    const before = JSON.parse(readFileSync(snapshotPath))
    for (const held of mapping.held) {
      assert.deepEqual(actualResults.sites.find(s => s.physicalSiteId === held.physicalSiteId), before.sites.find(s => s.physicalSiteId === held.physicalSiteId))
    }
  }
  const slimBytes = readFileSync(new URL('../data/benchmarks/training-venue-geocoding/training-venue-candidates.json', import.meta.url), 'utf8')
  const slim = JSON.parse(slimBytes)
  assert.equal(slim.providers.length, 54)
  assert.equal(slim.associations.length, 70)
  assert.equal(slim.venues.length, 58)
  assert.equal(slim.venues.filter(v => v.coordinates).length, 16)
  for (const venue of slim.venues) assert.deepEqual(venue.coordinates, actualResults.sites.find(s => s.physicalSiteId === venue.physicalSiteId).acceptedCoordinates)
  assert.doesNotMatch(slimBytes, /rawGovernmentRow|sameSiteAlias|confidenceReviewAdjudication|official-evidence|browserObservations|LotNumber|PlanNumber|"sessions"/)
})

let actualFormatFixture
function formatCase(id) {
  if (!actualFormatFixture) {
    const research = JSON.parse(readFileSync(privateResearchPath))
    const mapping = JSON.parse(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/address-mapping.json', import.meta.url)))
    actualFormatFixture = { inventory: JSON.parse(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/venue-inventory.json', import.meta.url))), mapping,
      rows: reconcileResults(readFileSync(genuineResultPath), mapping),
      context: { evidence: new Map(research.evidence.map(e => [e.evidenceId, e])), sources: new Map(research.sources.map(s => [s.sourceId, s])),
        venues: new Map(research.venues.map(v => [v.venueId, v])) } }
  }
  return { school: actualFormatFixture.inventory.sites.find(s => s.physicalSiteId === id),
    row: actualFormatFixture.rows.get(actualFormatFixture.mapping.rows.find(r => r.physicalSiteId === id).rowNumber), context: actualFormatFixture.context }
}

const formatSkip = existsSync(genuineResultPath) && existsSync(privateResearchPath) ? false : 'Exact private sources unavailable.'
const formatReviewCases = [
  ['Confidence', '99', 'confidence-not-100'],
  ['Comment', 'QA review-only comment', 'government-comment-requires-review'],
  ['FullAddress', 'QA inconsistent full address', 'full-address-components-not-consistent-with-queensland'],
]
for (const id of ['PS009', 'PS066']) for (const [field, value, diagnostic] of formatReviewCases) {
  test(`${id} proven street formatting plus ${field} review stays Ambiguous with the original diagnostic audit`, { skip: formatSkip }, () => {
    const { school, row, context } = formatCase(id), changed = { ...row, [field]: value }
    const output = validateVenueResult(school, changed, context)
    assert.equal(output.status, 'Ambiguous')
    assert.equal(output.acceptedCoordinates, null)
    assert.deepEqual(output.reasons, [diagnostic])
    assert.equal(output.addressFormatReview.originalStrictStatus, 'rejected')
    assert.ok(output.addressFormatReview.originalStrictReasons.includes('street-mismatch'))
    assert.ok(output.addressFormatReview.originalStrictReasons.includes(diagnostic))
    assert.deepEqual(output.addressFormatReview.otherDiagnosticsRetained, [diagnostic])
    assert.equal(output.addressFormatReview.sourceStreet, school.address.streetAddress)
    assert.equal(output.addressFormatReview.returnedStreet, row['Primary Address'])
    assert.deepEqual(output.governmentEvidence.rawGovernmentRow, changed)
  })
}

test('recomputing a proven format equivalence preserves hard locality/postcode/state/coordinate conflicts', { skip: formatSkip }, () => {
  for (const id of ['PS009', 'PS066']) {
    const { school, row, context } = formatCase(id)
    for (const [patch, diagnostic] of [
      [{ Locality: 'Different Locality' }, 'locality-mismatch'],
      [{ Postcode: '4000' }, 'postcode-mismatch'],
      [{ FullAddress: `${row['Primary Address']} ${row.Locality} NSW ${row.Postcode}` }, 'state-mismatch'],
      [{ Latitude: 'NaN' }, 'invalid-or-incomplete-coordinate-pair'],
      [{ Latitude: '0', Longitude: '0' }, 'coordinates-outside-broad-queensland-bounds'],
    ]) {
      const changed = { ...row, ...patch }, output = validateVenueResult(school, changed, context)
      assert.equal(output.status, 'Rejected', json(patch))
      assert.equal(output.acceptedCoordinates, null)
      assert.ok(output.reasons.includes(diagnostic))
      assert.ok(output.addressFormatReview.originalStrictReasons.includes(diagnostic))
      assert.ok(output.addressFormatReview.otherDiagnosticsRetained.includes(diagnostic))
      assert.deepEqual(output.governmentEvidence.rawGovernmentRow, changed)
    }
  }
})

test('format recomputation keeps ranges, units, suffixes, directions, street identity, precision and all other reviews guarded', { skip: formatSkip }, () => {
  const { school, row, context } = formatCase('PS066')
  const ranged = { ...school, address: { ...school.address, streetAddress: '18-20 Parkway Avenue' } }
  const rangedRow = { ...row, 'Primary Address': '18-20 PARKWAY AV', FullAddress: `18-20 PARKWAY AV ${row.Locality} QLD ${row.Postcode}` }
  const rangeOutcome = validateVenueResult(ranged, rangedRow, context)
  assert.equal(rangeOutcome.status, 'Ambiguous')
  assert.ok(rangeOutcome.reasons.includes('house-number-range-requires-review'))
  assert.ok(rangeOutcome.addressFormatReview.otherDiagnosticsRetained.includes('house-number-range-requires-review'))
  assert.equal(rangeOutcome.acceptedCoordinates, null)
  const unitSource = { ...school, address: { ...school.address, streetAddress: 'unit 1/18 Parkway Avenue' } }
  const wrongUnit = { ...row, 'Primary Address': 'unit 2/18 PARKWAY AV', FullAddress: `unit 2/18 PARKWAY AV ${row.Locality} QLD ${row.Postcode}` }
  const unitOutcome = validateVenueResult(unitSource, wrongUnit, context)
  assert.equal(unitOutcome.status, 'Rejected')
  assert.ok(unitOutcome.reasons.includes('unit-mismatch'))
  assert.equal(unitOutcome.addressFormatReview, undefined)
  for (const patch of [{ Confidence: '99' }, { Comment: 'Review' }, { GeocodeType: 'SC' }, { GeocodeType: 'Street Midpoint' },
    { 'Primary Address': '18A PARKWAY AV' }, { 'Primary Address': '18 DIFFERENT AV' }]) {
    const output = validateVenueResult(school, { ...row, ...patch }, context)
    assert.notEqual(output.status, 'Accepted')
    assert.equal(output.acceptedCoordinates, null)
  }
  const west = formatCase('PS009')
  const wrongDirection = validateVenueResult(west.school, { ...west.row, 'Primary Address': '109 WEEDON ST E' }, west.context)
  assert.equal(wrongDirection.status, 'Rejected')
  assert.ok(wrongDirection.reasons.includes('street-mismatch'))
  assert.equal(wrongDirection.addressFormatReview, undefined)
})

test('all 448 stored government values are canonical parsed cells while the original CSV retains its 28 trailing Comment spaces', {
  skip: existsSync(genuineResultPath) ? false : 'Private genuine export is not present.',
}, () => {
  const bytes = readFileSync(genuineResultPath), digest = sha256(bytes), [header, ...literalRows] = parseCsv(bytes)
  const mapping = JSON.parse(readFileSync(new URL('../data/benchmarks/training-venue-geocoding/address-mapping.json', import.meta.url)))
  const canonicalRows = reconcileResults(bytes, mapping)
  let matches = 0, commentWhitespaceDifferences = 0
  for (const cells of literalRows) {
    const canonicalRow = canonicalRows.get(Number(cells[header.indexOf('InputIndex')]))
    header.forEach((field, i) => {
      assert.equal(canonicalRow[field], cells[i].trim())
      matches++
      if (field === 'Comment' && canonicalRow[field] !== cells[i]) commentWhitespaceDifferences++
    })
  }
  assert.equal(matches, 448)
  assert.equal(commentWhitespaceDifferences, 28)
  assert.equal(sha256(readFileSync(genuineResultPath)), digest)
})
