import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { inputFiles, prepareDataset, candidatesFor, trainingAddressEvidence, eligible } from '../scripts/training-venues/prepare.mjs'
import { geocodingFor, validateVenueResult } from '../scripts/training-venues/validate.mjs'
import { reviewedTrainingAddressBindings, reviewedGoverningTrainingBindings,
  reviewedGoverningTrainingRelationship } from '../scripts/training-venues/reviewed-training-address-bindings.mjs'

const root = resolve(import.meta.dirname, '..')
const directory = join(root, 'output/workflow/2026-11-06/training-venue-geocoding/inputs')
const available = inputFiles.every(([file]) => existsSync(join(directory, file)))
const privateTest = (name, fn) => test(name, { skip: available ? false : 'Private frozen research unavailable.' }, fn)
const raw = available ? JSON.parse(readFileSync(join(directory, inputFiles[0][0]))) : null
const decision = available ? JSON.parse(readFileSync(join(directory, inputFiles[1][0]))) : null
const providerBaseline = JSON.parse(readFileSync(join(root, 'data/playon/4115-basketball.json')))
const prepared = available ? prepareDataset(raw, decision, providerBaseline, []) : null
const government = join(root, 'output/workflow/2026-11-06/training-venue-same-site-aliases')
const external = available ? { receipt: JSON.parse(readFileSync(join(government, 'government-result-provenance.json'))),
  resultBytes: readFileSync(join(government, 'inputs/government-results.csv')), validatedOn: '2026-11-12' } : null
const imported = available ? geocodingFor(prepared, external) : null
const fixture = id => ({ site: prepared.inventory.find(s => s.physicalSiteId === id),
  row: imported.sites.find(s => s.physicalSiteId === id).governmentEvidence.rawGovernmentRow })

privateTest('seven genuine PC/100 positions require closed official address and separate training chains', () => {
  assert.deepEqual(imported.summary, { Accepted: 16, Ambiguous: 11, Rejected: 1, Pending: 30 })
  assert.equal(reviewedTrainingAddressBindings.length, 7)
  assert.ok(Object.isFrozen(reviewedTrainingAddressBindings))
  for (const binding of reviewedTrainingAddressBindings) {
    const { site, row } = fixture(binding.physicalSiteId)
    const result = validateVenueResult(site, row, prepared.context)
    assert.equal(result.status, 'Accepted')
    assert.deepEqual(result.acceptedCoordinates, { latitude: Number(row.Latitude), longitude: Number(row.Longitude) })
    assert.equal(result.precision, ['PS009', 'PS071'].includes(binding.physicalSiteId) ? 'venue-level' : 'campus-level')
    assert.deepEqual(result.identityEvidence, [])
    const [proof] = result.trainingAddressEvidence
    assert.equal(proof.sourceRole, 'club-published-address')
    assert.equal(proof.canonicalAddress, site.address.normalized)
    assert.equal(proof.addressComponents.length, 5)
    assert.deepEqual(proof.relationships.map(r => r.associationId).sort(), site.associationIds)
    assert.ok(proof.verifiedRecordHashes.observations.length)
    assert.ok(proof.checkedOn < proof.reviewedOn)
    assert.ok(proof.sources.every(s => s.url.startsWith('https://')))
  }
  for (const id of ['PS023', 'PS027', 'PS032', 'PS037', 'PS060', 'PS076', 'PS077', 'R2L-PS001']) {
    const result = imported.sites.find(s => s.physicalSiteId === id)
    assert.equal(result.status, 'Accepted')
    assert.equal(result.trainingAddressEvidence[0].sourceRole, 'official-site-supplement')
    assert.equal(result.identityEvidence[0].sourceRole, 'direct-official-site-address')
  }
  const ps079 = imported.sites.find(s => s.physicalSiteId === 'PS079')
  assert.equal(ps079.status, 'Accepted'); assert.equal(ps079.confidence, '97')
  assert.ok(ps079.sameSiteAlias); assert.equal(ps079.trainingAddressEvidence, undefined)
})

privateTest('every address, publisher, relationship, provider, observation and access record is hash-bound', () => {
  for (const binding of reviewedTrainingAddressBindings) {
    const { site, row } = fixture(binding.physicalSiteId)
    for (const [collection, references] of Object.entries(binding.records)) for (const [id] of references) {
      for (const missing of [true, false]) {
        const context = { ...prepared.context, [collection]: new Map(prepared.context[collection]) }
        if (missing) context[collection].delete(id)
        else context[collection].set(id, { ...context[collection].get(id), altered: true })
        assert.deepEqual(trainingAddressEvidence(site, context), [], `${site.physicalSiteId}/${collection}/${id}/${missing}`)
        const result = validateVenueResult({ ...site, trainingAddressEvidence: [{ reviewed: true }] }, row, context)
        assert.equal(result.status, 'Ambiguous'); assert.equal(result.acceptedCoordinates, null)
      }
    }
    for (const changed of [{ ...site, physicalSiteId: 'PS079' }, { ...site, venueIds: ['V999'] },
      { ...site, providerIds: ['wrong-provider'] }, { ...site, associationIds: ['fake-training'] },
      ...['normalized', 'streetAddress', 'suburb', 'postcode'].map(key => ({ ...site, address: { ...site.address, [key]: 'wrong' } }))]) {
      assert.deepEqual(trainingAddressEvidence(changed, prepared.context), [])
    }
    const unresolved = validateVenueResult({ ...site, originalVenueIdentityResolved: false }, row, prepared.context)
    assert.equal(unresolved.status, 'Ambiguous')
    const context = { ...prepared.context, selected: prepared.context.selected.filter(a => a.physicalSiteId !== site.physicalSiteId) }
    assert.deepEqual(trainingAddressEvidence(site, context), [])
  }
})

privateTest('strict government guards apply to all seven address chains without confidence or alias exemptions', () => {
  for (const binding of reviewedTrainingAddressBindings) {
    const { site, row } = fixture(binding.physicalSiteId)
    for (const patch of [{ Confidence: '99' }, { Confidence: '98' }, { Confidence: '97' }, { GeocodeType: 'SC' },
      { GeocodeType: 'Street Midpoint' }, { Comment: 'Review required' }, { Locality: 'Other' }, { Postcode: '4000' },
      { 'Primary Address': '999 Wrong Road' }, { 'Primary Address': site.address.streetAddress.replace(/^\d+/, '$&A') },
      { 'Primary Address': site.address.streetAddress.replace(/^\d+/, '$&-999') },
      { 'Complex-Building Name': 'Unknown Building' }, { 'Complex-Building Name': 'Another Campus' },
      { Latitude: '', Longitude: '' }, { Latitude: 'NaN' }, { Latitude: '0', Longitude: '0' },
      { FullAddress: `${row['Primary Address']} ${row.Locality} NSW ${row.Postcode}` }]) {
      const result = validateVenueResult(site, { ...row, ...patch }, prepared.context)
      assert.notEqual(result.status, 'Accepted', `${site.physicalSiteId}/${JSON.stringify(patch)}`)
      assert.equal(result.acceptedCoordinates, null)
      assert.equal(result.confidenceReviewAdjudication, undefined)
    }
    for (const comment of ['2 candidates address records found.', 'Unable to fulfil parsing Address request']) {
      const empty = { ...row, Comment: comment }
      for (const key of ['Latitude', 'Longitude', 'Primary Address', 'Locality', 'Postcode', 'Confidence', 'GeocodeType', 'FullAddress']) empty[key] = ''
      assert.equal(validateVenueResult(site, empty, prepared.context).status, 'Ambiguous')
    }
  }
})

privateTest('governing association direct club-training statements are accepted and membership/competition substitutions fail', () => {
  assert.ok(reviewedGoverningTrainingBindings.some(b => b.associationId === 'A030'))
  assert.ok(reviewedGoverningTrainingBindings.some(b => b.associationId === 'A132'))
  for (const binding of reviewedGoverningTrainingBindings) {
    const association = prepared.context.associations.get(binding.associationId)
    assert.equal(reviewedGoverningTrainingRelationship(association, prepared.context), true)
    if (['A030', 'A132'].includes(binding.associationId)) {
      assert.equal(association.regularTrainingAssessment.temporalStatus, 'Official Listed — Current Status Unknown')
    }
    for (const summary of ['Club membership directory only.', 'Competition venue and court bookings only.', 'Community directory.']) {
      const changed = structuredClone(raw)
      changed.evidence.find(e => e.evidenceId === binding.evidenceId).summary = summary
      assert.throws(() => prepareDataset(changed, decision, providerBaseline, []), /governing-association direct training/)
      const context = { ...prepared.context, evidence: new Map(prepared.context.evidence) }
      context.evidence.set(binding.evidenceId, { ...context.evidence.get(binding.evidenceId), summary })
      assert.equal(reviewedGoverningTrainingRelationship(association, context), false)
      if (['PS027', 'PS060'].includes(binding.physicalSiteId)) {
        const { site, row } = fixture(binding.physicalSiteId)
        assert.notEqual(validateVenueResult(site, row, context).status, 'Accepted')
      }
    }
  }
})

privateTest('shared-site addresses never create associations or refresh training scope, team, dates or disclosure status', () => {
  const accepted = new Set(imported.sites.filter(s => s.status === 'Accepted').map(s => s.physicalSiteId))
  const associations = prepared.associations.filter(a => accepted.has(a.physicalSiteId))
  assert.equal(associations.length, 21); assert.equal(new Set(associations.map(a => a.providerId)).size, 16)
  assert.equal(prepared.associations.length, 70)
  const eagles = prepared.associations.filter(a => a.physicalSiteId === 'PS009')
  assert.deepEqual(eagles.map(a => a.associationId).sort(), ['A011', 'A112'])
  const addressPublisher = prepared.context.sources.get('S050').providerIds[0]
  assert.ok(eagles.every(a => a.providerId !== addressPublisher))
  const proof = trainingAddressEvidence(fixture('PS009').site, prepared.context)[0]
  assert.ok(proof.publisherSourceIds.includes('S049'))
  assert.ok(proof.verifiedRecordHashes.observations.some(([id]) => id === 'C049'))
  for (const association of prepared.associations) {
    const original = prepared.context.associations.get(association.associationId), assessment = original.regularTrainingAssessment
    assert.equal(association.temporalClassification, assessment.temporalStatus)
    assert.equal(association.activityScope, assessment.scope)
    assert.equal(association.asOfDate, raw.asOfDate)
    assert.equal(association.manualReviewRequired, assessment.manualReviewRequired)
    assert.equal(association.sourceDisclosureReviewRequired, assessment.restricted_evidence_review_required)
  }
  for (const type of ['holiday', 'casual', 'competition', 'skills', 'ELITES', 'TrainingOnly']) {
    assert.equal(eligible({ activityType: type, regularTrainingAssessment: { isRegularWeeklyTeamTraining: false,
      recommendedForParentReference: true, temporalStatus: 'Current Confirmed' } }), false)
  }
  const projection = candidatesFor(prepared, imported)
  assert.equal(projection.publicDisplayApproved, false)
  const serialized = JSON.stringify(projection)
  for (const privateField of ['trainingAddressEvidence', 'verifiedRecordHashes', 'governmentEvidence', 'publisherSourceIds',
    'cdn.shopify.com', 'L-O227']) assert.ok(!serialized.includes(privateField))
})
