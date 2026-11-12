import { isDeepStrictEqual } from 'node:util'
import { geocoderUrl, sha256 } from '../qld-geocoder/export.mjs'
import { reconcileResults, validateResult } from '../qld-geocoder/compare.mjs'
import { canonical, identityEvidence, trainingAddressEvidence, json } from './prepare.mjs'
import { createAliasVerifier } from './aliases.mjs'
import { ps079AliasBinding } from './ps079-alias-binding.mjs'

// A complete pair of wrapping parentheses is formatting, never a fuzzy campus/name alias.
export const normalizedVenueName = value => canonical(value.trim().replace(/^\(([^()]*)\)$/, '$1'))
const streetTypes = { st: 'street', rd: 'road', dr: 'drive', av: 'avenue', ave: 'avenue', ct: 'court', ln: 'lane',
  pl: 'place', cres: 'crescent', pde: 'parade', cl: 'close', tce: 'terrace', blvd: 'boulevard' }
const knownStreetTypes = new Set([...Object.keys(streetTypes), ...Object.values(streetTypes)])

export function normalizedTrainingStreet(value) {
  const tokens = canonical(value).replace(/\./g, '').split(' ')
  const direction = ['w', 'west'].includes(tokens.at(-1)) && knownStreetTypes.has(tokens.at(-2))
  const typeIndex = tokens.length - (direction ? 2 : 1)
  if (direction) tokens[tokens.length - 1] = 'west'
  tokens[typeIndex] = streetTypes[tokens[typeIndex]] ?? tokens[typeIndex]
  return tokens.join(' ')
}

function strictAddressOutcome(address, result) {
  const outcome = validateResult({ streetAddress: address.streetAddress,
    providers: [{ suburb: address.suburb, postcode: address.postcode }] }, result)
  if (outcome.reasons.includes('street-mismatch') && normalizedTrainingStreet(address.streetAddress) === normalizedTrainingStreet(result['Primary Address'])) {
    const remaining = outcome.reasons.filter(reason => reason !== 'street-mismatch')
    // Whole-street equivalence was proved above. Reuse the unchanged validator
    // with that equivalent street view; every original non-street input and all
    // returned metadata remain intact, so it decides hard rejection vs review.
    const recomputed = validateResult({ streetAddress: result['Primary Address'],
      providers: [{ suburb: address.suburb, postcode: address.postcode }] }, result)
    const recomputedDiagnostics = recomputed.status === 'accepted' ? [] : recomputed.reasons
    if (!isDeepStrictEqual(recomputedDiagnostics, remaining)) return outcome
    return { ...outcome, status: recomputed.status, reasons: remaining,
      addressFormatReview: { diagnosticResolved: 'street-mismatch', method: 'Exact training-address tokens after terminal street-type AV/Avenue or W/West direction normalization only',
        sourceStreet: address.streetAddress, returnedStreet: result['Primary Address'], normalizedStreet: normalizedTrainingStreet(address.streetAddress),
        originalStrictStatus: outcome.status, originalStrictReasons: outcome.reasons, otherDiagnosticsRetained: remaining } }
  }
  return outcome
}

export function validateResultProvenance(receipt, resultBytes, csv, validatedOn) {
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  if (!validDate(validatedOn) || !validDate(receipt.obtainedOn) || receipt.obtainedOn > validatedOn ||
      receipt.addressRole !== 'training-venue' || receipt.source !== 'qld-government-batch-geocoder' ||
      receipt.sourceUrl !== geocoderUrl || receipt.uploadCsvSha256 !== sha256(csv) ||
      receipt.resultCsvSha256 !== sha256(resultBytes)) {
    throw new Error('Missing or mismatched genuine-result provenance, role, hashes or validation date')
  }
}

/** Injection is for explicit trusted synthetic fixtures, never a CLI review/proof override. */
export function createVenueResultValidator(aliasEvidenceOptions) {
  const reviewAlias = createAliasVerifier(aliasEvidenceOptions)
  return (site, result, context) => validateVenueResultWithPolicy(site, result, context, reviewAlias)
}

function validateVenueResultWithPolicy(site, result, context, reviewAlias) {
  const { Latitude, Longitude } = result
  const decimal = value => /^-?\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value))
  const coordinates = decimal(Latitude) && decimal(Longitude) && Math.abs(Number(Latitude)) <= 90 && Math.abs(Number(Longitude)) <= 180
    ? { latitude: Number(Latitude), longitude: Number(Longitude) } : null
  const base = { physicalSiteId: site.physicalSiteId, candidateCoordinates: coordinates, acceptedCoordinates: null,
    precision: null, coordinateSource: geocoderUrl, method: 'Queensland Government manual batch CSV',
    returnedAddress: { primaryAddress: result['Primary Address'], locality: result.Locality, postcode: result.Postcode,
      fullAddress: result.FullAddress, buildingName: result['Complex-Building Name'], lotNumber: result.LotNumber, planNumber: result.PlanNumber },
    confidence: result.Confidence || null, geocodeType: result.GeocodeType || null,
    governmentEvidence: { inputIndex: Number(result.InputIndex), inputAddress: result['Address to Validate'],
      inputLocality: result.LOCALITY, rawLatitude: Latitude, rawLongitude: Longitude, comment: result.Comment,
      rawGovernmentRow: { ...result } },
    evidenceReferences: site.addressEvidence.map(e => e.evidenceId), identityEvidence: identityEvidence(site, context),
    unresolvedAddressConflicts: site.unresolvedConflicts }
  if (site.unresolvedConflicts.length) return { ...base, status: 'Ambiguous', reasons: ['unresolved-address-conflict-blocks-acceptance'] }
  if (!Latitude && !Longitude) {
    const emptyReturn = ['Primary Address', 'Locality', 'Postcode', 'Confidence', 'GeocodeType', 'FullAddress'].every(key => !result[key])
    const candidates = result.Comment.match(/^(\d+) candidates address records found\.$/)
    if (emptyReturn && candidates) return { ...base, status: Number(candidates[1]) > 0 ? 'Ambiguous' : 'Rejected',
      governmentOutcome: Number(candidates[1]) > 0 ? 'multiple-candidates-without-selected-coordinate' : 'no-candidates',
      candidateCount: Number(candidates[1]), reasons: [Number(candidates[1]) > 0 ? 'multiple-government-candidates' : 'no-government-candidates'] }
    if (emptyReturn && result.Comment === 'Unable to fulfil parsing Address request') return { ...base,
      status: 'Ambiguous', governmentOutcome: 'address-parsing-failure', reasons: ['government-address-parsing-failure-no-selected-coordinate'] }
    const incomplete = validateResult({ streetAddress: site.address.streetAddress,
      providers: [{ suburb: site.address.suburb, postcode: site.address.postcode }] }, result)
    return { ...base, status: incomplete.status === 'rejected' || incomplete.status === 'unmatched' ? 'Rejected' : 'Ambiguous',
      governmentOutcome: 'incomplete-result-without-coordinates', reasons: incomplete.reasons }
  }
  const buildingName = result['Complex-Building Name']
  const recognizedName = buildingName && site.aliases.some(alias => normalizedVenueName(alias) === normalizedVenueName(buildingName))
  const otherVenue = buildingName && !recognizedName && [...context.venues.values()].find(venue => venue.physicalSiteId !== site.physicalSiteId &&
    [venue.venueName, ...(venue.aliases ?? [])].some(name => normalizedVenueName(name) === normalizedVenueName(buildingName)))
  if (otherVenue || (buildingName && /\b(?:different|other|another)\s+campus\b/i.test(buildingName))) return { ...base,
    status: 'Rejected', conflictingVenueId: otherVenue?.venueId ?? null, reasons: ['returned-venue-or-campus-identity-mismatch'] }
  const unknownNameReasons = buildingName && !recognizedName ? ['returned-building-label-needs-independent-identity-review'] : []
  if (/suburb|locality|street.?midpoint|street.?centre|road.?centre/i.test(result.GeocodeType)) {
    return { ...base, status: 'Rejected', reasons: ['low-precision-locality-or-street-midpoint'] }
  }
  if (site.address.kind !== 'numbered-street') {
    return { ...base, status: 'Ambiguous', reasons: ['named-or-intersection-site-needs-independent-location-review'] }
  }
  const aliasReview = reviewAlias(site, result, coordinates)
  const matchedAddress = aliasReview?.aliasAddress ?? site.address
  let evidenceBase = aliasReview ? { ...base, sameSiteAlias: aliasReview,
    originalInputAddress: { streetAddress: site.address.streetAddress, suburb: site.address.suburb, postcode: site.address.postcode } } : base
  let outcome = strictAddressOutcome(matchedAddress, result)
  if (outcome.addressFormatReview) evidenceBase = { ...evidenceBase, addressFormatReview: outcome.addressFormatReview }
  const approvedResolution = ps079AliasBinding.confidenceReviewResolution
  const resolveConfidence = aliasReview?.status === 'Verified' && aliasReview.bindingId === ps079AliasBinding.bindingId &&
    aliasReview.schema === 'official-address-parcel-chain-v1' && !unknownNameReasons.length &&
    outcome.status === 'needs-review' && outcome.reasons.length === 1 && outcome.reasons[0] === approvedResolution.reason &&
    result.Confidence === approvedResolution.observedConfidence && result.GeocodeType === approvedResolution.geocodeType &&
    sha256(json(result)) === approvedResolution.rawGovernmentRowSha256 &&
    aliasReview.confidenceReviewResolution?.rawGovernmentRowSha256 === approvedResolution.rawGovernmentRowSha256
  if (resolveConfidence) {
    evidenceBase = { ...evidenceBase, confidenceReviewAdjudication: { originalConfidence: result.Confidence,
      resolvedReason: approvedResolution.reason, rawGovernmentRowSha256: approvedResolution.rawGovernmentRowSha256,
      rationale: approvedResolution.rationale, automaticValidationStatus: outcome.status, automaticValidationReasons: outcome.reasons } }
    outcome = { ...outcome, status: 'accepted', reasons: [] }
  }
  if (outcome.status !== 'accepted') return { ...evidenceBase,
    status: outcome.status === 'rejected' || outcome.status === 'unmatched' || aliasReview?.status === 'Rejected' ? 'Rejected' : 'Ambiguous',
    reasons: [...outcome.reasons, ...unknownNameReasons, ...(aliasReview?.reasons ?? [])] }
  if (unknownNameReasons.length) return { ...evidenceBase, status: 'Ambiguous', reasons: unknownNameReasons }
  if (aliasReview) {
    if (aliasReview.status !== 'Verified' || !site.originalVenueIdentityResolved) return { ...evidenceBase,
      status: aliasReview.status === 'Rejected' ? 'Rejected' : 'Ambiguous',
      reasons: [...aliasReview.reasons, ...(!site.originalVenueIdentityResolved ? ['original-physical-site-identity-unresolved'] : [])] }
    return { ...evidenceBase, status: 'Accepted', acceptedCoordinates: coordinates, precision: 'campus-level',
      reasons: [...aliasReview.reasons, ...(resolveConfidence ? [approvedResolution.rationale] : []), 'Returned address passes the unchanged strict government-address validator against its independently proven alias, with any sole confidence review explicitly adjudicated.',
        'Official same-campus/parcel location only; basketball hall and gym entrance are not verified.'] }
  }
  const trainingAddress = trainingAddressEvidence(site, context)
  if (!site.originalVenueIdentityResolved || !trainingAddress.length) return { ...evidenceBase,
    status: 'Ambiguous', reasons: ['complete-reviewed-official-training-address-chain-required'] }
  return { ...evidenceBase, status: 'Accepted', acceptedCoordinates: coordinates, precision: site.precisionWhenValidated,
    trainingAddressEvidence: trainingAddress,
    reasons: ['Exact address/locality/postcode plus confidence 100 and PC; complete reviewed official training-address chain.',
      'Position is the official campus/venue property location; basketball hall and gym entrance are not verified.'] }
}

export const validateVenueResult = createVenueResultValidator()

export function geocodingFor(prepared, external = null) {
  let results = null
  if (external) {
    validateResultProvenance(external.receipt, external.resultBytes, prepared.csv, external.validatedOn)
    // Rebuild comparison is performed by the CLI before this function. Hash/echo/index are all required.
    if (prepared.mapping.csv.sha256 !== sha256(prepared.csv)) throw new Error('Upload/mapping hash mismatch')
    results = reconcileResults(external.resultBytes, prepared.mapping)
  }
  const sites = prepared.inventory.map(site => {
    const mapping = prepared.mapping.rows.find(row => row.physicalSiteId === site.physicalSiteId)
    if (results && mapping) return validateVenueResult(site, results.get(mapping.rowNumber), prepared.context)
    return { physicalSiteId: site.physicalSiteId, status: 'Pending', candidateCoordinates: null, acceptedCoordinates: null,
      coordinateSource: null, method: null, returnedAddress: null, confidence: null, geocodeType: null, precision: null,
      governmentEvidence: null, evidenceReferences: site.addressEvidence.map(e => e.evidenceId),
      identityEvidence: site.identityEvidence, unresolvedAddressConflicts: site.unresolvedConflicts,
      reasons: mapping ? ['Awaiting genuine Queensland Government results for this training-venue batch.'] :
        [`Address held from upload: ${site.holdReason}. No coordinates fabricated.`] }
  })
  const summary = Object.fromEntries(['Accepted', 'Ambiguous', 'Rejected', 'Pending'].map(status =>
    [status, sites.filter(site => site.status === status).length]))
  return { schemaVersion: 1, addressRole: 'training-venue', inputs: prepared.mapping.inputs,
    stageB: external ? 'Genuine owner-supplied result imported; provenance declarations retained' : 'Pending — no applicable government result supplied',
    stageC: external ? 'Offline conservative validation executed' : 'Pending — validation logic tested with synthetic fixtures only',
    governmentResultProvenance: external ? { ...external.receipt, validatedOn: external.validatedOn,
      provenanceLimitation: 'Hashes/echoes establish file correspondence; authenticity depends on the owner-supplied government export.' } : null,
    summary, sites }
}

export function verifyMapping(prepared, suppliedMapping, uploadBytes) {
  if (!isDeepStrictEqual(suppliedMapping, prepared.mapping) || !Buffer.from(prepared.csv).equals(uploadBytes)) {
    throw new Error('Supplied training-venue upload/mapping differs from deterministic source export')
  }
}
