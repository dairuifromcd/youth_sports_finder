import { createAddressPriorityReviewer, addressPriorityRecordHash } from './address-priority.mjs'
import { serializeAddressCsv, sha256, geocoderUrl, guideUrl } from '../qld-geocoder/export.mjs'

export const targetSiteIds = Object.freeze(['PS007', 'PS008', 'PS010', 'PS013', 'PS026', 'PS034', 'PS041',
  'PS043', 'PS045', 'PS048', 'PS050', 'PS051', 'PS052', 'PS073', 'PS093', 'PS094', 'PS095'])
export const batchFiles = Object.freeze(['addresses.csv', 'address-mapping.json', 'address-review-results.json',
  'address-evidence-manifest.json', 'batch-preparation-summary.json', 'government-result-provenance.template.json', 'UPLOAD-INSTRUCTIONS.md'])
const json = value => JSON.stringify(value, null, 2) + '\n'
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const sorted = values => [...values].sort()
const fail = message => { throw new Error(message) }

/** Only consume an offline, independently reviewed overlay and its separate frozen
 * manifest. This function deliberately does not create either trust artifact.
 * read(path) must enforce project containment; fixtures use an in-memory reader.
 */
export function prepareCoverageBatch(registryBytes, manifestBytes, read) {
  const registry = JSON.parse(registryBytes), manifest = JSON.parse(manifestBytes)
  if (manifest.reviewStage !== 'independently-reviewed-by-qa' || !manifest.reviewEvidence ||
      manifest.registrySha256 !== sha256(registryBytes) || registry.schemaVersion !== 1 ||
      registry.reviewMode !== 'offline-source-role-review' || !/^\d{4}-\d{2}-\d{2}$/.test(registry.reviewedOn) ||
      registry.batchId !== 'training-venue-coverage-phase2a' || !Array.isArray(registry.sites) ||
      !equal(sorted(registry.sites.map(s => s.physicalSiteId)), targetSiteIds)) fail('Unreviewed registry, schema, batch or exact target set')
  const documents = new Map()
  if (!Array.isArray(registry.files) || !registry.files.length) fail('Missing original evidence files')
  for (const file of registry.files) {
    if (documents.has(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256 ?? '')) fail('Duplicate or unbound evidence file')
    const bytes = read(file.path)
    if (sha256(bytes) !== file.sha256) fail(`Original evidence file drift: ${file.path}`)
    documents.set(file.path, JSON.parse(bytes))
  }
  const refValue = ref => {
    const document = documents.get(ref.path)
    const values = ref.collection ? document?.[ref.collection] : document
    if (!Array.isArray(values)) fail('Missing evidence collection')
    const matches = values.filter(value => value[ref.idKey] === ref.id)
    if (matches.length !== 1 || addressPriorityRecordHash(matches[0]) !== ref.sha256) fail(`Missing/tampered original record: ${ref.id}`)
    return matches[0]
  }
  const records = new Map(registry.records.map(record => [record.id, record]))
  const reviewer = createAddressPriorityReviewer({ records: registry.records, manifest: manifest.records })
  for (const record of registry.records) {
    if (!Array.isArray(record.originRefs) || !record.originRefs.length) fail(`Missing original lineage: ${record.id}`)
    record.originRefs.forEach(refValue)
  }
  const reviews = registry.sites.toSorted((a, b) => a.physicalSiteId.localeCompare(b.physicalSiteId)).map(site => {
    if (site.productionStatus !== 'Pending' || !site.campusId || !Array.isArray(site.associations) || !site.associations.length) fail('Invalid original site state/relationships')
    const productionSite = refValue(site.productionSiteRef)
    const originalSite = refValue(site.originalSiteRef)
    if (!Array.isArray(site.campusIdentityEvidence) || !site.campusIdentityEvidence.length) fail('Missing campus identity evidence')
    site.campusIdentityEvidence.forEach(refValue)
    if (productionSite.physicalSiteId !== site.physicalSiteId || productionSite.status !== 'Pending' ||
        originalSite.physicalSiteId !== site.physicalSiteId || !equal(sorted(originalSite.venueIds), sorted(site.venueIds))) fail('Wrong site or production state')
    const providers = new Set(), venues = new Set(), associations = new Set()
    for (const binding of site.associations) {
      const association = refValue(binding.associationRef)
      const evidence = binding.evidenceRefs.map(refValue), sources = binding.sourceRefs.map(refValue)
      const observations = binding.observationRefs.map(refValue), accesses = binding.accessRefs.map(refValue)
      if (association.physicalSiteId !== site.physicalSiteId || association.associationId !== binding.associationId ||
          association.venueId !== binding.venueId || association.providerId !== binding.providerId ||
          association.regularTrainingAssessment?.isRegularWeeklyTeamTraining !== true ||
          association.regularTrainingAssessment?.recommendedForParentReference !== true ||
          !['Current Confirmed', 'Official Listed — Current Status Unknown'].includes(association.regularTrainingAssessment?.temporalStatus) ||
          !evidence.length || !sources.length || !observations.length ||
          evidence.some(e => !association.evidenceIds.includes(e.evidenceId) || e.sourceIds.some(id => !sources.some(s => s.sourceId === id))) ||
          sources.some(s => !(s.observationIds ?? []).length || s.observationIds.some(id => !observations.some(o => (o.id ?? o.observationId) === id)) ||
            (s.localAccessRecordIds ?? []).some(id => !accesses.some(a => a.accessRecordId === id))) ||
          accesses.some(a => !sources.some(s => s.sourceId === a.sourceId))) fail(`Broken ordinary training chain: ${binding.associationId}`)
      const training = records.get(binding.trainingRecordId)
      if (training?.kind !== 'training' || training.associationId !== association.associationId || training.providerId !== association.providerId ||
          training.venueId !== association.venueId || !site.trainingRecordIds.includes(training.id)) fail('Wrong training registry relationship')
      providers.add(association.providerId); venues.add(association.venueId); associations.add(association.associationId)
    }
    if (!equal(sorted(providers), sorted(site.providerIds)) || !equal(sorted(venues), sorted(site.venueIds)) ||
        !equal(sorted(associations), sorted(site.associationIds)) || site.trainingRecordIds.length !== site.associations.length) fail('Wrong mapping identity set')
    const decision = reviewer(site)
    return { ...site, ...decision, existingProductionStatus: site.productionStatus,
      historicalGovernmentBatchReference: registry.historicalGovernmentBatchReference,
      remainingGeographicLimitations: site.limitations }
  })
  const rows = []
  for (const review of reviews) {
    if (review.decision !== 'candidate-for-later-query') continue
    const address = review.preferredQuery.address
    // Single numbered street only; names/administrative labels/PO boxes cannot
    // pass merely because the general helper has complete string components.
    if (!/^\d+[a-z]?$/i.test(address.number) ||
        !/^[\p{L}][\p{L} .'-]*\s(?:Street|St|Road|Rd|Drive|Dr|Avenue|Ave|Way|Terrace|Tce|Court|Ct|Lane|Ln|Place|Pl|Crescent|Cres|Boulevard|Blvd|Parade|Pde)$/iu.test(address.street) ||
        !/^[\p{L}][\p{L} .'-]*$/u.test(address.suburb) || address.state !== 'QLD' || !/^\d{4}$/.test(address.postcode)) fail('Unsafe or incomplete numbered street components')
    const streetAddress = `${address.number} ${address.street}`, locality = `${address.suburb} ${address.postcode}`
    serializeAddressCsv([{ streetAddress, locality }])
    rows.push({ physicalSiteId: review.physicalSiteId, venueIds: review.venueIds, providerIds: review.providerIds,
      associationIds: review.associationIds, rowNumber: rows.length + 1, inputIndex: rows.length + 1,
      streetAddress, locality, canonicalAddress: `${streetAddress}, ${address.suburb} QLD ${address.postcode}`,
      addressComponents: address, addressRole: review.preferredQuery.addressRole,
      componentProvenance: review.preferredQuery.componentProvenance,
      evidenceBindings: [...new Set([...review.trainingRecordIds, ...review.addressRecordIds, ...(review.relationshipRecordIds ?? [])])].sort()
        .map(id => ({ id, sha256: manifest.records[id] })),
      addressKey: sha256(`${review.physicalSiteId}\n${streetAddress}\n${locality}`), queryReadiness: 'candidate-for-later-query',
      holdReasons: [], historicalGovernmentBatchReference: registry.historicalGovernmentBatchReference })
  }
  const csv = serializeAddressCsv(rows), csvHash = sha256(csv)
  const mapping = { schemaVersion: 1, batchId: registry.batchId, sourceResearchVersion: registry.sourceResearchVersion,
    generatedOn: registry.reviewedOn, addressRole: 'training-venue-query-only',
    csv: { file: 'addresses.csv', sha256: csvHash, encoding: 'UTF-8 without BOM', lineEndings: 'CRLF',
      header: ['Address to Validate', 'LOCALITY'], ordering: 'ascending PhysicalSiteId; one row per Ready physical site; no address-only merge',
      rowNumberConvention: '1-based data row excluding header', inputIndexConvention: 'Expected 1-based government InputIndex, independent of output row order; must also verify exact Address to Validate and LOCALITY echoes' },
    rows: rows.map(row => ({ ...row, uploadCsvSha256: csvHash })),
    held: reviews.filter(r => r.decision === 'held-for-evidence').map(r => ({ physicalSiteId: r.physicalSiteId,
      queryReadiness: r.decision, holdReasons: r.holds })),
    importPolicy: 'No import in Phase 2A. Future adapter must bind this batch hash, exact InputIndex AND both original input echoes; reject duplicate/missing/unexpected indices. Never join by result order or use historical mapping.' }
  const summary = { schemaVersion: 1, batchId: registry.batchId, reviewedOn: registry.reviewedOn,
    targetSites: reviews.length, readySites: rows.length, heldSites: reviews.length - rows.length,
    csvSha256: csvHash, mappingSha256: sha256(json(mapping)), registrySha256: manifest.registrySha256,
    productionStatusChanged: false, newAcceptedSites: 0, governmentUpload: 'Not Applicable — not authorized',
    resultImport: 'Not Applicable — not authorized', uiUat: 'Not Applicable',
    readyByRole: Object.fromEntries([...new Set(rows.map(r => r.addressRole))].sort().map(role => [role, rows.filter(r => r.addressRole === role).map(r => r.physicalSiteId)])) }
  return { reviews, mapping, summary, outputs: {
    'addresses.csv': csv,
    'address-mapping.json': json(mapping),
    'address-review-results.json': json({ schemaVersion: 1, batchId: registry.batchId, reviewedOn: registry.reviewedOn,
      mode: 'review-only', status: 'Address preparation only — never Geocoding Accepted', sites: reviews }),
    'address-evidence-manifest.json': json({ schemaVersion: 1, batchId: registry.batchId, registry, manifest,
      limitations: ['Hashes bind offline reviewed records, not source authenticity.', 'Retained reader observations are not original HTML/PDF bytes.',
        'Source access dates do not prove publication date or current training.', 'Independent QA reviews semantic source roles separately.'] }),
    'batch-preparation-summary.json': json(summary),
    'government-result-provenance.template.json': json({ schemaVersion: 1, templateOnly: true, batchId: registry.batchId,
      addressRole: 'training-venue', source: 'qld-government-batch-geocoder', sourceUrl: geocoderUrl,
      uploadCsvSha256: csvHash, resultCsvSha256: null, obtainedOn: null,
      limitations: ['NOT a government result receipt. Fill result hash and actual download date only after separately authorized genuine download.',
        'Campus/property query only; no basketball hall, court or entrance precision claim.'] }),
    'UPLOAD-INSTRUCTIONS.md': `# Phase 2A — Owner review; upload not yet authorized\n\nBatch: ${registry.batchId}. Ready: ${rows.length}; Held: ${reviews.length - rows.length}.\n\nKeep all seven files and reviewed inputs together. Run node scripts/prepare-training-venue-coverage.mjs --check before later use.\n\nAfter separate Owner authorization, open ${guideUrl} and ${geocoderUrl}. Upload ONLY output/workflow/2026-11-13/training-venue-coverage-phase2a/batch/addresses.csv (UTF-8, no BOM, CRLF, two columns, header included; Address / Automatic / CSV settings subject to actual current interface). Never upload mapping, research or evidence. Government service may retain submitted address strings. No upload occurred in Phase 2A.\n\nUpload SHA-256: ${csvHash}\nMapping SHA-256: ${summary.mappingSha256}\n\nSave the genuine downloaded result unchanged to output/workflow/2026-11-13/training-venue-coverage-phase2a/received/government-results.csv. Do not reorder, edit or overwrite historical results. Copy the template to received/government-result-provenance.json only after download; record genuine source, actual obtained date, batch ID, exact upload hash, genuine result hash and observed limitations. Null fields intentionally remain unfilled now.\n\nPhase 2B proposal (not implemented or authorized): introduce a partial-batch adapter using this separate mapping. Verify CSV/mapping/receipt hashes, complete schema, expected InputIndex set AND exact original address/locality echoes. Reconcile independent of result order; fail on duplicates, missing/unknown rows or source drift. Preserve every original government row and both batch provenances. Apply unchanged strict site/campus/address/coordinate/PC/confidence/building/parcel gates; only explicitly reviewed outcomes can update those 17 sites. Preserve old28 results and the other41 sites, all IDs, association scopes and PS079's exclusive proof. Rebuild through a separately approved merge pipeline with full regression QA. Never feed this partial result to the old full28 importer or overwrite its mapping.\n\nReady is not Accepted. Queries target school campuses or venue properties, never verified hall/entrance coordinates. No REST query, government result import, production regeneration, frontend integration or publication is part of Phase 2A.\n`,
  } }
}
