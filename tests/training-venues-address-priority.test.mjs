import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAddressPriorityReviewer, addressPriorityRecordHash, addressRoles as roles } from '../scripts/training-venues/address-priority.mjs'

// Synthetic reviewed overlays test policy behavior, not live source authenticity.
// Public case address strings below do not include private evidence or coordinates.
const address = (number = '10', street = 'Training Road') => ({ number, street, suburb: 'Example', state: 'QLD', postcode: '4116' })
const source = (id, publisherRole) => ({ id, kind: 'source', publisherRole, url: `https://${id}.example/official` })
const claim = (id, addressRole, sourceId, value, extra = {}) => ({ id, kind: 'address', physicalSiteId: 'TEST-SITE', campusId: 'junior',
  sourceId, addressRole, purpose: { [roles.training]: 'ordinary-team-training', [roles.access]: 'training-access',
    [roles.administrative]: 'administrative', [roles.government]: 'registered-property', [roles.owner]: 'unverified-location-lead' }[addressRole],
  address: value, ...extra })
const training = { id: 'team', kind: 'training', physicalSiteId: 'TEST-SITE', campusId: 'junior',
  sourceId: 'club', activity: 'ordinary-team-training', providerId: 'original-provider', venueName: 'Named Junior Campus',
  checkedOn: '2026-11-06', teamScope: 'ordinary teams', temporalStatus: 'Official Listed — Current Status Unknown' }
const defaults = [source('club', 'club'), source('school', 'school-operator'), source('gov', 'government'),
  source('owner', 'owner'), source('association', 'governing-association'), training]
const relation = (ids, conclusion = 'same-training-site') => ({ id: 'physical-proof', kind: 'relationship', sourceId: 'gov',
  physicalSiteId: 'TEST-SITE', campusId: 'junior', addressIds: ids, conclusion })
function fixture(additions, changes = {}) {
  const records = structuredClone([...defaults, ...additions])
  const manifest = Object.fromEntries(records.map(record => [record.id, addressPriorityRecordHash(record)]))
  const review = createAddressPriorityReviewer({ records, manifest })
  const request = { physicalSiteId: 'TEST-SITE', campusId: 'junior', trainingRecordIds: ['team'],
    addressRecordIds: additions.filter(r => r.kind === 'address').map(r => r.id),
    relationshipRecordIds: additions.filter(r => r.kind === 'relationship').map(r => r.id), ...changes }
  return { records, manifest, review, request, result: review(request) }
}

test('complete club training address wins over a separately proven school administrative address', () => {
  const { result } = fixture([claim('gym', roles.training, 'club', address()),
    claim('office', roles.administrative, 'school', address('20')), relation(['gym', 'office'])])
  assert.equal(result.decision, 'candidate-for-later-query')
  assert.equal(result.preferredQuery.recordId, 'gym')
  assert.equal(result.preferredQuery.address.number, '10')
  assert.deepEqual(result.roleDifferences, [{ trainingRecordId: 'gym', supportingRecordId: 'office',
    interpretation: 'different-address-roles', physicalRelationship: 'reviewed-same-training-site' }])
  assert.equal(result.evidence.length, 2)
})

test('different roles are distinguished while unproven physical equivalence remains held', () => {
  const { result } = fixture([claim('gym', roles.training, 'club', address()), claim('office', roles.administrative, 'school', address('12'))])
  assert.equal(result.preferredQuery.address.number, '10')
  assert.equal(result.roleDifferences[0].interpretation, 'different-address-roles')
  assert.ok(result.holds.includes('physical-relationship-unverified:gym:office'))
  assert.equal(result.decision, 'held-for-evidence')
})

test('club entrance stays independent and its coordinates cannot become hall coordinates', () => {
  const { result } = fixture([claim('gym', roles.training, 'club', address()),
    claim('gate', roles.access, 'club', address('8'), { coordinates: { latitude: -27, longitude: 153 }, precision: 'entrance' })])
  assert.equal(result.decision, 'candidate-for-later-query')
  assert.equal(result.preferredQuery.address.number, '10')
  assert.equal(result.accessGuidance[0].id, 'gate')
  assert.equal(result.acceptedCoordinates, null)
  assert.equal(result.precision, null)
  const onlyGate = fixture([claim('gate', roles.access, 'club', address())]).result
  assert.equal(onlyGate.preferredQuery, null)
})

test('name-only training relationship permits complete school campus target without inventing club components', () => {
  const { result } = fixture([claim('office', roles.administrative, 'school', address())])
  assert.equal(result.decision, 'candidate-for-later-query')
  assert.equal(result.preferredQuery.addressRole, roles.administrative)
  assert.equal(result.preferredQuery.locationClaim, 'campus-level-target-unverified')
})

test('partial club address receives only compatible missing school components and retains per-component provenance', () => {
  const { result } = fixture([claim('gym', roles.training, 'club', { number: '10', street: 'Training Road' }),
    claim('office', roles.administrative, 'school', address())])
  assert.equal(result.decision, 'candidate-for-later-query')
  assert.deepEqual(result.preferredQuery.address, address())
  assert.equal(result.preferredQuery.componentProvenance.number, 'gym')
  assert.equal(result.preferredQuery.componentProvenance.postcode, 'office')
  const incompatible = fixture([claim('gym', roles.training, 'club', { number: '10', street: 'Training Road' }),
    claim('office', roles.administrative, 'school', address('20'))]).result
  assert.equal(incompatible.preferredQuery.address.number, '10')
  assert.equal(incompatible.preferredQuery.address.postcode, undefined)
  assert.equal(incompatible.decision, 'held-for-evidence')
})

test('governing association must directly state ordinary training; membership/competition/course is insufficient', () => {
  const ordinary = { ...training, id: 'association-team', sourceId: 'association' }
  const good = fixture([ordinary, claim('gym', roles.training, 'association', address())], { trainingRecordIds: ['association-team'] }).result
  assert.equal(good.decision, 'candidate-for-later-query')
  for (const activity of ['membership', 'competition', 'course', 'holiday', 'office', 'postal']) {
    const result = fixture([{ ...ordinary, activity }, claim('gym', roles.training, 'association', address(), { purpose: activity })],
      { trainingRecordIds: ['association-team'] }).result
    assert.equal(result.decision, 'held-for-evidence')
    assert.equal(result.preferredQuery, null)
  }
})

test('shared physical-site address evidence can be reused without creating a publishing-provider training association', () => {
  const shared = source('another-club', 'club')
  const { result } = fixture([shared, claim('shared-gym', roles.training, 'another-club', address(), { publisherProviderId: 'other-provider' })])
  assert.equal(result.decision, 'candidate-for-later-query')
  assert.deepEqual(result.trainingRelationships.map(r => r.id), ['team'])
  assert.equal(result.trainingRelationships[0].providerId, 'original-provider')
  assert.equal(result.trainingRelationships[0].checkedOn, '2026-11-06')
})

test('owner lead is never official, usable as supplementation, campus proof or Accepted coordinates', () => {
  const { result } = fixture([claim('lead', roles.owner, 'owner', address())])
  assert.equal(result.ownerLeads[0].status, 'Unverified Owner Location Lead')
  assert.equal(result.preferredQuery, null)
  assert.equal(result.acceptedCoordinates, null)
  const disguised = fixture([claim('gym', roles.training, 'owner', address(), { reviewed: true })]).result
  assert.equal(disguised.preferredQuery, null)
  assert.ok(disguised.holds.some(h => h.includes('source-role-or-purpose-mismatch')))
})

test('recent contradictory concrete training targets remain blocked independent of publisher, dates and ordering', () => {
  const records = [claim('a-gym', roles.training, 'club', address(), { publishedOn: '2026-11-12' }),
    claim('b-gym', roles.training, 'association', address('20'), { publishedOn: '2026-11-13' })]
  const first = fixture(records).result, reversed = fixture(records.toReversed()).result
  assert.equal(first.decision, 'held-for-evidence')
  assert.deepEqual(first.holds, reversed.holds)
  assert.equal(first.preferredQuery.recordId, reversed.preferredQuery.recordId)
})

test('secondary campus never replaces junior and wrong training campus fails closed', () => {
  const { result } = fixture([claim('junior-gym', roles.training, 'club', address()),
    claim('secondary', roles.administrative, 'school', address('226', 'Illaweena Street'), { campusId: 'secondary' })])
  assert.equal(result.preferredQuery.recordId, 'junior-gym')
  assert.deepEqual(result.excluded, [{ recordId: 'secondary', reason: 'different-campus' }])
  const wrong = fixture([{ ...training, id: 'secondary-team', campusId: 'secondary' },
    claim('office', roles.administrative, 'school', address())], { trainingRecordIds: ['secondary-team'] }).result
  assert.equal(wrong.decision, 'held-for-evidence')
  assert.equal(wrong.preferredQuery, null)
})

test('PS069 review retains 966 training, 990 administration and 960 unverified lead without resolving four unknown candidates', () => {
  const { result } = fixture([claim('966-training', roles.training, 'club', address('966', 'Gowan Road')),
    claim('990-campus', roles.administrative, 'school', address('990', 'Gowan Road')),
    claim('960-lead', roles.owner, 'owner', { number: '960', street: 'Gowan Road' }),
    claim('226-secondary', roles.administrative, 'school', address('226', 'Illaweena Street'), { campusId: 'secondary' })],
  { governmentCandidates: 4, acceptedCoordinates: { latitude: -27, longitude: 153 }, reviewed: true })
  assert.equal(result.preferredQuery.address.number, '966')
  assert.equal(result.ownerLeads[0].address.number, '960')
  assert.equal(result.evidence.find(r => r.id === '990-campus').addressRole, roles.administrative)
  assert.ok(result.holds.includes('physical-relationship-unverified:966-training:990-campus'))
  assert.equal(result.decision, 'held-for-evidence')
  assert.equal(result.acceptedCoordinates, null)
})

test('PS030 retains 41 training and unnumbered Morella administration; historical 57 lot lead proves no equivalence', () => {
  const { result } = fixture([claim('41-training', roles.training, 'club', address('41', 'Colwyn Street')),
    claim('Morella-campus', roles.administrative, 'school', { street: 'Morella Street', suburb: 'Example', state: 'QLD', postcode: '4116' }),
    claim('57-historical', roles.owner, 'owner', address('57', 'Colwyn Street'), { lotPlanLead: '473/SP172108' })])
  assert.equal(result.preferredQuery.address.number, '41')
  assert.ok(result.holds.includes('physical-relationship-unverified:41-training:Morella-campus'))
  assert.equal(result.ownerLeads[0].address.number, '57')
  assert.equal(result.acceptedCoordinates, null)
})

test('nearby numbers, matching campus names, postcode, distances and reviewed booleans never establish physical equivalence', () => {
  const { result } = fixture([claim('gym', roles.training, 'club', address(), { campusName: 'Same School', reviewed: true }),
    claim('office', roles.administrative, 'school', address('11'), { campusName: 'Same School', distanceMetres: 2 })],
  { sameCampus: true, physicalRelationshipVerified: true })
  assert.equal(result.decision, 'held-for-evidence')
  assert.equal(result.roleDifferences[0].physicalRelationship, 'unverified')
})

test('missing/wrong source, site, record and tampered evidence or manifest fail closed', () => {
  const { records, manifest, review, request } = fixture([claim('gym', roles.training, 'club', address())])
  for (const patch of [{ addressRecordIds: ['missing'] }, { trainingRecordIds: ['missing'] }, { physicalSiteId: 'WRONG' }]) {
    const result = review({ ...request, ...patch })
    assert.equal(result.decision, 'held-for-evidence')
    assert.equal(result.acceptedCoordinates, null)
  }
  const bad = structuredClone(records); bad.at(-1).address.number = '999'
  assert.throws(() => createAddressPriorityReviewer({ records: bad, manifest }), /Unbound/)
  assert.throws(() => createAddressPriorityReviewer({ records, manifest: { ...manifest, gym: '0'.repeat(64) } }), /Unbound/)
  const missingSource = records.filter(r => r.id !== 'club')
  assert.throws(() => createAddressPriorityReviewer({ records: missingSource,
    manifest: Object.fromEntries(missingSource.map(r => [r.id, addressPriorityRecordHash(r)])) }), /Missing source/)
})

test('registry/request mutation cannot rewrite trusted source roles or addresses', () => {
  const { records, manifest, review, request } = fixture([claim('gym', roles.training, 'club', address())])
  records.at(-1).address.number = '999'; manifest.gym = '0'.repeat(64)
  const first = review({ ...request, address: address('999'), sourceRole: 'government', reviewed: true })
  first.evidence[0].address.number = '888'
  assert.equal(review(request).preferredQuery.address.number, '10')
  assert.equal(review(request).evidence[0].recordSha256, addressPriorityRecordHash({ ...records.at(-1), address: address() }))
})

test('government registration alone cannot create a training query and no case inherits PS079 alias or confidence97 acceptance', () => {
  assert.equal(fixture([claim('property', roles.government, 'gov', address())]).result.preferredQuery, null)
  for (const physicalSiteId of ['PS069', 'PS030', 'PS079', 'UNRELATED']) {
    const inputs = [claim('gym', roles.training, 'club', address(), { physicalSiteId })]
    const { result } = fixture(inputs, { physicalSiteId, confidence: '97', sameSiteAlias: 'PS079', accepted: true })
    assert.equal(result.mode, 'review-only')
    assert.equal(result.acceptedCoordinates, null)
    assert.equal(result.precision, null)
    assert.equal(result.productionStatusChanged, false)
  }
})

test('ranges, missing postcode and conflicting school supplementation stay held and originals remain untouched', () => {
  for (const value of [address('10-12'), { ...address(), postcode: '' }, { ...address(), number: undefined }]) {
    const { records, review, request, result } = fixture([claim('gym', roles.training, 'club', value)])
    const before = structuredClone(records)
    assert.equal(result.decision, 'held-for-evidence')
    assert.ok(result.holds.includes('incomplete-or-non-single-number-query-address'))
    review(request); assert.deepEqual(records, before)
  }
  const { result } = fixture([claim('gym', roles.training, 'club', { number: '10', street: 'Training Road' }),
    claim('a-school', roles.administrative, 'school', address()),
    claim('b-school', roles.administrative, 'school', { ...address(), postcode: '4000' })])
  assert.equal(result.decision, 'held-for-evidence')
  assert.ok(result.holds.includes('conflicting-supplement:postcode'))
})
