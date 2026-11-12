import { isDeepStrictEqual } from 'node:util'
import { guideUrl, geocoderUrl, serializeAddressCsv, sha256 } from '../qld-geocoder/export.mjs'
import { providerLinkLabels, safeProviderLinkUrl } from '../../src/providerLinks.ts'
import { reviewedIdentityEvidence } from './reviewed-identity-bindings.mjs'

export const inputFiles = [
  ['youth_training_venues_phase2_revised_local.json', '29c8f7726466bcc72bfd5e5bba5cf657370f272e74b9a8dbea757823cb433dde'],
  ['Youth_Sports_Finder_Training_Venue_Product_Data_Decisions_2026-11-06.json', 'd413041b503e7bf3f503275fce02b7fa4177f33305831801fbd920775de08ae0'],
  ['Youth_Sports_Finder_Training_Venue_Product_Data_Decisions_2026-11-06.md', '6d1ab3c8dff69f4e913dcbddf8cbe2805de4cb4941b8716048365824017b1f41'],
]
export const expectedBaseline = { providers: 54, eligibleAssociations: 70, currentConfirmed: 32, officialListed: 38,
  referenceProviders: 30, physicalSites: 58, currentPhysicalSites: 28,
  tiers: { A: 27, B: 2, C: 13, D: 14, E: 2 }, manualReviewAssociations: 8 }
export const temporalClasses = ['Current Confirmed', 'Official Listed — Current Status Unknown']
const decisionTemporal = { current_confirmed: temporalClasses[0], official_listed_time_unknown: temporalClasses[1] }
export const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0
export const sortedUnique = values => [...new Set(values)].sort(compare)
export const clean = value => value.normalize('NFKC').trim().replace(/[–—−]/g, '-').replace(/\s+/g, ' ')
export const canonical = value => clean(value).toLowerCase()
export const json = value => JSON.stringify(value, null, 2) + '\n'

function index(records, key) {
  const result = new Map()
  for (const record of records) {
    if (typeof record?.[key] !== 'string' || !record[key] || result.has(record[key])) throw new Error(`Missing/duplicate ${key}`)
    result.set(record[key], record)
  }
  return result
}

export function eligible(association) {
  const assessment = association.regularTrainingAssessment
  return assessment?.isRegularWeeklyTeamTraining === true && assessment.recommendedForParentReference === true &&
    temporalClasses.includes(assessment.temporalStatus)
}

export function addressConflicts(address) {
  const conflicts = address?.conflicts ?? []
  const resolutions = address?.conflictResolutions ?? []
  const resolved = address?.phase2Validation?.status === 'Resolved' && resolutions.some(resolution =>
    resolution.status === 'Resolved' && canonical(resolution.acceptedValue) === canonical(address.formatted))
  return { historical: conflicts, resolutions, unresolved: conflicts.filter(conflict =>
    conflict.status === 'Unresolved' || (!resolved && conflict.status !== 'Resolved')),
  localityAlternatives: address?.localityAlternatives ?? [] }
}

// Only whitespace and range punctuation change. No postcode or suburb is inferred.
export function parseVenueAddress(value) {
  if (!value) return { raw: value ?? null, normalized: null, streetAddress: null, suburb: null, postcode: null,
    kind: 'missing', exportable: false, reason: 'missing-address-text' }
  if (typeof value !== 'string' || [...value].some(character => character.codePointAt(0) < 32 || character.codePointAt(0) === 127)) {
    throw new Error('Invalid/control character in venue address')
  }
  const normalized = clean(value)
  const parts = normalized.split(',').map(part => part.trim())
  const tail = parts.at(-1).match(/^([\p{L}][\p{L} .'-]*?)(?:\s+(?:Queensland|QLD))?(?:\s+(\d{4}))?$/iu)
  const streetAddress = parts.length > 1 ? parts.slice(0, -1).join(', ') : normalized
  const suburb = parts.length > 1 && tail ? tail[1] : null
  const postcode = tail?.[2] ?? null
  const kind = /^(?:corner|cnr|intersection)\b/i.test(streetAddress) ? 'intersection' :
    /^\d+[a-z]?(?:-\d+[a-z]?)?\s+/i.test(streetAddress) ? 'numbered-street' : 'named-or-street-only'
  const reason = !suburb ? 'unparsed-locality' : !postcode ? 'missing-explicit-postcode' :
    /[",]/.test(streetAddress) ? 'named-address-incompatible-with-safe-unquoted-csv' : null
  return { raw: value, normalized, streetAddress, suburb, postcode, kind, exportable: !reason, reason }
}

export function calculateTier(venues) {
  if (venues.some(venue => addressConflicts(venue.address).unresolved.length)) return 'E'
  const address = parseVenueAddress(venues.find(venue => venue.address?.formatted)?.address.formatted)
  if (!address.normalized) return 'D'
  if (!address.postcode) return 'C'
  return address.kind === 'numbered-street' ? 'A' : 'B'
}

export function validateInputs(raw, decision, providerBaseline) {
  const providers = index(raw.providers, 'providerId'), venues = index(raw.venues, 'venueId')
  const sites = index(raw.physicalSites, 'physicalSiteId'), associations = index(raw.providerVenueAssociations, 'associationId')
  const evidence = index(raw.evidence, 'evidenceId'), sources = index(raw.sources, 'sourceId')
  const selected = [...associations.values()].filter(eligible).sort((a, b) => compare(a.associationId, b.associationId))
  const candidateMap = index(decision.associationCandidates, 'associationId')
  const inventoryMap = index(decision.physicalSiteInventory, 'physicalSiteId')
  for (const association of selected) {
    const candidate = candidateMap.get(association.associationId), venue = venues.get(association.venueId)
    if (!candidate || ['providerId', 'venueId', 'physicalSiteId'].some(key => candidate[key] !== association[key]) ||
        !providers.has(association.providerId) || !venue || venue.physicalSiteId !== association.physicalSiteId ||
        !sites.has(association.physicalSiteId) || decisionTemporal[candidate.temporalClass] !== association.regularTrainingAssessment.temporalStatus ||
        candidate.ordinaryWeeklyTeamTraining !== true) throw new Error(`Association mapping mismatch: ${association.associationId}`)
    for (const id of sortedUnique([...association.evidenceIds, ...association.regularTrainingAssessment.evidenceIds,
      ...association.regularTrainingAssessment.temporalEvidenceIds])) {
      if (!evidence.has(id)) throw new Error(`Missing association evidence: ${id}`)
    }
  }
  if (selected.length !== candidateMap.size) throw new Error('Decision candidates differ from eligible raw associations')
  const tiers = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  for (const id of sortedUnique(selected.map(a => a.physicalSiteId))) {
    const site = inventoryMap.get(id), original = sites.get(id)
    if (!site) throw new Error(`Missing decision physical site: ${id}`)
    const associated = selected.filter(a => a.physicalSiteId === id)
    const venueIds = sortedUnique(associated.map(a => a.venueId))
    if (!isDeepStrictEqual(venueIds, [...site.venueIds].sort(compare)) ||
        venueIds.some(venueId => !original.venueIds.includes(venueId)) ||
        !isDeepStrictEqual(sortedUnique(associated.map(a => a.providerId)), [...site.providerIds].sort(compare)) ||
        !isDeepStrictEqual(associated.map(a => a.associationId).sort(compare), [...site.associationIds].sort(compare))) {
      throw new Error(`Physical site mapping mismatch: ${id}`)
    }
    const physicalVenues = venueIds.map(id => venues.get(id)), tier = calculateTier(physicalVenues)
    if (tier !== site.addressPreparationTier[0]) throw new Error(`Address tier differs from reviewed inventory: ${id}`)
    if (site.formattedAddressFromResearch !== (physicalVenues.find(v => v.address?.formatted)?.address.formatted ?? null)) {
      throw new Error(`Decision address differs from original venue: ${id}`)
    }
    tiers[tier]++
  }
  const baseline = { providers: providers.size, eligibleAssociations: selected.length,
    currentConfirmed: selected.filter(a => a.regularTrainingAssessment.temporalStatus === temporalClasses[0]).length,
    officialListed: selected.filter(a => a.regularTrainingAssessment.temporalStatus === temporalClasses[1]).length,
    referenceProviders: new Set(selected.map(a => a.providerId)).size,
    physicalSites: new Set(selected.map(a => a.physicalSiteId)).size,
    currentPhysicalSites: new Set(selected.filter(a => a.regularTrainingAssessment.temporalStatus === temporalClasses[0]).map(a => a.physicalSiteId)).size,
    tiers, manualReviewAssociations: selected.filter(a => a.regularTrainingAssessment.manualReviewRequired).length }
  if (!isDeepStrictEqual(baseline, expectedBaseline) || inventoryMap.size !== baseline.physicalSites) {
    throw new Error(`Training venue baseline mismatch; no output written: ${JSON.stringify(baseline)}`)
  }
  const actualProviders = [...providers.values()].map(p => [p.providerId, p.providerName]).sort(([a], [b]) => compare(a, b))
  const expectedProviders = providerBaseline.map(p => [p.id, p.name]).sort(([a], [b]) => compare(a, b))
  if (!isDeepStrictEqual(actualProviders, expectedProviders)) throw new Error('Original Play On provider identities changed')
  const observations = new Map((raw.browserObservations ?? []).map(record => [record.observationId ?? record.id, record]))
  const accessRecords = new Map((raw.localAccessRecords ?? []).map(record => [record.accessRecordId, record]))
  return { providers, venues, sites, evidence, sources, observations, accessRecords, selected, candidateMap, inventoryMap, baseline }
}

function evidenceReference(evidence, sources) {
  return { evidenceId: evidence.evidenceId, claimType: evidence.claimType, checkedOn: evidence.checkedOn,
    sourceIds: [...evidence.sourceIds].sort(compare), sources: evidence.sourceIds.map(id => {
      const source = sources.get(id)
      if (!source) throw new Error(`Missing evidence source: ${id}`)
      return { sourceId: id, url: source.url, sourceType: source.sourceType, contentScope: source.contentScope ?? null }
    }).sort((a, b) => compare(a.sourceId, b.sourceId)),
    // Address-only support is needed for internal audit. Other research prose is never copied.
    support: evidence.claimType === 'physical_address_and_access' || evidence.claimType === 'venue_identity_or_address'
      ? evidence.summary : null }
}

// Frozen site-specific source bindings, reviewed against the supplied research.
// The source URL AND evidence ID AND canonical address must agree; no boolean review override exists.
export const identityBindings = [
  ['PS005', 'P2-E023', 'P2-S036', 'https://www.ionacollege.com.au/contact'],
  ['PS023', 'P2-E024', 'P2-S037', 'https://camphillipss.eq.edu.au/our-school/contact-us'],
  ['PS037', 'P2-E028', 'P2-S040', 'https://www.mbbc.qld.edu.au/contact'],
  ['PS044', 'P2-E021', 'P2-S027', 'https://cornubiaparksportscentre.com/'],
  ['PS049', 'P2-E030', 'P2-S041', 'https://wynnumwestss.eq.edu.au/our-school/contact-us'],
  ['PS060', 'P2-E031', 'P2-S058', 'https://ipswichbasketball.com.au/contact-us'],
  ['PS067', 'P2-E032', 'P2-S056', 'https://www.shbooval.qld.edu.au/'],
  ['PS076', 'P2-E022', 'P2-S007', 'https://centenaryshs.eq.edu.au/our-school/contact-us'],
  ['PS077', 'P2-E033', 'P2-S043', 'https://corindashs.eq.edu.au/our-school/contact-us'],
  ['PS078', 'P2-E027', 'P2-S039', 'https://manlyss.eq.edu.au/our-school/contact-us'],
]

export function identityEvidence(site, context) {
  const proofs = []
  for (const [physicalSiteId, evidenceId, sourceId, url] of identityBindings) {
    if (physicalSiteId !== site.physicalSiteId) continue
    const evidence = context.evidence.get(evidenceId), source = context.sources.get(sourceId)
    const venue = context.venues.get(evidence?.venueId)
    if (!evidence || !source || source.url !== url || !evidence.sourceIds.includes(sourceId) ||
        evidence.physicalSiteId !== physicalSiteId || venue?.physicalSiteId !== physicalSiteId ||
        evidence.addressResult !== 'Resolved' || venue.address?.phase2Validation?.status !== 'Resolved' ||
        canonical(venue.address.phase2Validation.canonicalFormatted) !== canonical(site.address.normalized) ||
        !canonical(evidence.summary).startsWith(canonical(site.address.normalized))) continue
    proofs.push({ physicalSiteId, venueId: venue.venueId, evidenceId, sourceId, url,
      canonicalAddress: site.address.normalized, sourceRole: 'direct-official-site-address',
      evidenceSha256: sha256(json(evidence)), checkedOn: evidence.checkedOn,
      limitation: 'Official physical site/campus address; exact basketball hall or entrance is not verified.' })
  }
  return [...proofs, ...reviewedIdentityEvidence(site, context)]
}

export function reviewCodes(assessment, notes = []) {
  const text = notes.join(' ')
  return sortedUnique([
    ...(assessment.manualReviewRequired ? ['manual-review-required'] : []),
    ...(assessment.restricted_evidence_review_required ? ['source-disclosure-review-required'] : []),
    ...(/冲突|不一致|conflict/i.test(text) ? ['conflicting-claims'] : []),
    ...(/取消|关闭|暂停|天气|不可用|cancel|clos/i.test(text) ? ['cancellation-or-access-qualification'] : []),
    ...(/临时|改馆|调表|temporary/i.test(text) ? ['temporary-relocation-does-not-change-permanent-site'] : []),
    ...(/具体|逐队|仅|队伍|teams?|U\d/i.test(assessment.scope ?? '') ? ['team-or-age-scope-must-be-preserved'] : []),
    ...(/当前|本季|季节|赛季|年份|时效|season|2025|Term1/i.test(text) ? ['temporal-qualification'] : []),
    ...(/入口|hall|court|校园|campus/i.test(text) ? ['campus-or-space-qualification'] : []),
    ...(notes.length ? ['review-original-association-limitations'] : []),
  ])
}

export function safeContacts(acceptedLinks) {
  return acceptedLinks.flatMap(link => {
    if (link.type !== 'facebook_page' && providerLinkLabels[link.type] !== 'Website') return []
    const url = safeProviderLinkUrl(link.url, link.type)
    return url ? [{ type: link.type === 'facebook_page' ? 'facebook_page' : 'website', url }] : []
  }).sort((a, b) => compare(a.type + a.url, b.type + b.url))
}

export function prepareDataset(raw, decision, providerBaseline, inputs, providerContacts = {}) {
  const context = validateInputs(raw, decision, providerBaseline)
  context.providerContacts = providerContacts
  const associations = context.selected.map(association => {
    const a = association.regularTrainingAssessment, c = context.candidateMap.get(association.associationId)
    return { associationId: association.associationId, providerId: association.providerId, venueId: association.venueId,
      physicalSiteId: association.physicalSiteId, activityType: 'Regular Weekly Club/Team Training', activityScope: a.scope,
      temporalClassification: a.temporalStatus, asOfDate: raw.asOfDate, teamAgeScope: a.scope,
      originalTeamAgeScope: association.ageOrTeamScope ?? null,
      evidenceIds: sortedUnique([...association.evidenceIds, ...a.evidenceIds, ...a.temporalEvidenceIds]),
      manualReviewRequired: a.manualReviewRequired, sourceDisclosureReviewRequired: a.restricted_evidence_review_required,
      reviewLimitations: c.manualReviewNotes, reviewCodes: reviewCodes(a, c.manualReviewNotes),
      publicDisplayApproved: false }
  })
  const inventory = [...context.inventoryMap.values()].sort((a, b) => compare(a.physicalSiteId, b.physicalSiteId)).map(candidate => {
    const physicalVenues = candidate.venueIds.map(id => context.venues.get(id))
    const linkedEvidence = raw.evidence.filter(e => physicalVenues.some(v => e.venueId === v.venueId ||
      e.relatedVenueIds?.includes(v.venueId)) || e.physicalSiteId === candidate.physicalSiteId)
    const addressEvidenceIds = sortedUnique(physicalVenues.flatMap(v => v.address?.addressEvidenceIds ?? []))
    const address = parseVenueAddress(candidate.formattedAddressFromResearch)
    const conflicts = physicalVenues.map(v => ({ venueId: v.venueId, ...addressConflicts(v.address) }))
    const unresolvedConflicts = conflicts.flatMap(c => c.unresolved)
    const tier = candidate.addressPreparationTier[0]
    const holdReason = unresolvedConflicts.length ? 'unresolved-address-conflict' : address.reason
    const site = { physicalSiteId: candidate.physicalSiteId, venueIds: [...candidate.venueIds].sort(compare),
      venueName: candidate.venueName, aliases: sortedUnique(physicalVenues.flatMap(v => [v.venueName, ...v.aliases])),
      providerIds: [...candidate.providerIds].sort(compare), associationIds: [...candidate.associationIds].sort(compare),
      temporalClassifications: sortedUnique(candidate.temporalClasses.map(value => decisionTemporal[value])),
      address: { ...address, raw: candidate.formattedAddressFromResearch, exportable: !holdReason, reason: holdReason },
      originalTier: tier, preparedTier: tier, addressChanged: false,
      addressEvidence: addressEvidenceIds.map(id => {
        if (!context.evidence.has(id)) throw new Error(`Missing address evidence: ${id}`)
        return evidenceReference(context.evidence.get(id), context.sources)
      }),
      conflictHistory: conflicts, unresolvedConflicts,
      offlineAddressReview: { evidenceIdsInspected: linkedEvidence.map(e => e.evidenceId).sort(compare),
        addressEvidenceIdsInspected: addressEvidenceIds, outcome: 'no-new-supported-components',
        reason: tier === 'D' ? 'No linked official address evidence supplies a physical address; no provider-address substitution.' :
          tier === 'C' ? 'Linked evidence does not supply the missing postcode/components; no locality/postcode inference.' :
          tier === 'E' ? 'Existing authoritative evidence retains contradictory claims; no new independent resolution.' :
          'Existing supplied address retained; normalized spacing and range punctuation only.',
        networkLookupPerformed: false },
      geocodingReadiness: holdReason ? 'Held' : 'ReadyForGovernmentBatch', holdReason,
      originalVenueIdentityResolved: physicalVenues.every(v => v.physicalIdentityResolved === true),
      precisionWhenValidated: /school|college|campus/i.test(candidate.venueName) ? 'campus-level' : 'venue-level',
      inputs }
    site.identityEvidence = identityEvidence(site, context)
    return site
  })
  // A before B; shared sites generate one row each. Never merge different IDs by address/name.
  const rows = inventory.filter(s => s.address.exportable).sort((a, b) => compare(a.preparedTier, b.preparedTier) ||
    compare(a.physicalSiteId, b.physicalSiteId)).map((site, i) => ({ rowNumber: i + 1,
    physicalSiteId: site.physicalSiteId, venueIds: site.venueIds, providerIds: site.providerIds, associationIds: site.associationIds,
    streetAddress: site.address.streetAddress, locality: `${site.address.suburb} ${site.address.postcode}`,
    addressKey: sha256(`${site.physicalSiteId}\n${site.address.normalized}`), tier: site.preparedTier }))
  const csv = serializeAddressCsv(rows)
  const mapping = { schemaVersion: 1, addressRole: 'training-venue', guideUrl, geocoderUrl, inputs,
    csv: { file: 'addresses.csv', sha256: sha256(csv), header: ['Address to Validate', 'LOCALITY'], encoding: 'UTF-8 without BOM',
      lineEndings: 'CRLF', quoting: 'unquoted',
      rowNumberConvention: '1-based data row excluding header; join government InputIndex plus exact address/locality echo, never result order' },
    rows, held: inventory.filter(s => !s.address.exportable).map(s => ({ physicalSiteId: s.physicalSiteId,
      reason: s.holdReason, originalAddress: s.address.raw, originalTier: s.originalTier })) }
  const preparation = { schemaVersion: 1, inputs, baseline: context.baseline,
    summary: { totalSites: inventory.length, originalTiers: context.baseline.tiers, preparedTiers: context.baseline.tiers,
      addressesImproved: 0, safelyExported: rows.length, held: mapping.held.length, externalLookupPerformed: false },
    sites: inventory.map(s => ({ physicalSiteId: s.physicalSiteId, originalTier: s.originalTier, preparedTier: s.preparedTier,
      originalAddress: s.address.raw, normalizedAddress: s.address.normalized, addressChanged: s.addressChanged,
      readiness: s.geocodingReadiness, holdReason: s.holdReason, offlineReview: s.offlineAddressReview,
      evidenceIds: s.addressEvidence.map(e => e.evidenceId), unresolvedConflicts: s.unresolvedConflicts })) }
  return { context, associations, inventory, csv, mapping, preparation }
}

export function candidatesFor(prepared, geocoding) {
  const bySite = new Map(geocoding.sites.map(site => [site.physicalSiteId, site]))
  return { schemaVersion: 1, status: 'Internal candidates — publication not approved', publicDisplayApproved: false,
    asOfDate: '2026-11-06', temporalMeaning: { [temporalClasses[0]]: 'Research supports the dated relationship as of 2026-11-06; no live attendance guarantee.',
      [temporalClasses[1]]: 'Official ordinary-training reference; current season use is unconfirmed.' },
    providers: [...prepared.context.providers.values()].sort((a, b) => compare(a.providerId, b.providerId)).map(provider => ({
      providerId: provider.providerId, providerName: provider.providerName,
      officialContacts: safeContacts(prepared.context.providerContacts[provider.providerId] ?? []),
      physicalSiteIds: sortedUnique(prepared.associations.filter(a => a.providerId === provider.providerId).map(a => a.physicalSiteId)) })),
    venues: prepared.inventory.map(site => ({ physicalSiteId: site.physicalSiteId, venueIds: site.venueIds,
      venueName: site.venueName, coordinates: bySite.get(site.physicalSiteId).acceptedCoordinates,
      precision: bySite.get(site.physicalSiteId).precision })),
    associations: prepared.associations.map(a => ({ associationId: a.associationId, providerId: a.providerId,
      venueId: a.venueId, physicalSiteId: a.physicalSiteId, activityType: a.activityType,
      temporalClassification: a.temporalClassification,
      teamAgeTags: sortedUnique((a.teamAgeScope ?? '').match(/\bU\d{1,2}\b/gi) ?? []),
      scopeReviewRequired: true, scopeReference: `eligible-associations.json#${a.associationId}`,
      reviewCodes: a.reviewCodes, manualReviewRequired: a.manualReviewRequired,
      sourceDisclosureReviewRequired: a.sourceDisclosureReviewRequired,
      restrictions: ['Verify documented team/age scope before use.', 'Confirm current arrangements with the club.', 'No detailed schedule or enrolment inference.'] })) }
}
