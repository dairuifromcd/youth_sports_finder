import { isDeepStrictEqual } from 'node:util'
import { sha256 } from '../qld-geocoder/export.mjs'
import { parseCsv, resultHeader } from '../qld-geocoder/compare.mjs'
import { inputFiles, prepareDataset, parseVenueAddress, json } from './prepare.mjs'
import { validateResultProvenance, validateVenueResult, normalizedTrainingStreet } from './validate.mjs'
import { prepareCoverageBatch, batchFiles, targetSiteIds } from './coverage-batch.mjs'

export const phase2aDirectory = 'output/workflow/2026-11-13/training-venue-coverage-phase2a'
export const phase2bDirectory = 'output/workflow/2026-11-13/training-venue-coverage-phase2b'
export const partialBatchPins = Object.freeze({
  batchId: 'training-venue-coverage-phase2a',
  uploadSha256: '55ddf60779f3e234df8eb6b3e5be01914476c574ad1033e2f82a7beccd6a1e25',
  mappingSha256: '62621fee85d26045cf2e5aa54f9514a087e197b77805ec2917cef1dfd0a8e8d1',
  registrySha256: '6e69f16e9bce3d92e887a1429b898de60fe985c120e0ddcde4bba10c8f304708',
  manifestSha256: 'f77447addc8837a78c77ca91b514f1d88287a1128732019af381327b8b21e652',
  productionSha256: '89f3a14af91d1396f16b1a1663b6066301474b6f62beacfaba8eee69b069577d',
})
const checkedBatches = new WeakMap()
const batchDigest = batch => sha256(JSON.stringify(batch, (_key, value) => value instanceof Map ? [...value] : value))
const fail = message => { throw new Error(message) }
const sameIds = (a, b) => isDeepStrictEqual([...a].sort(), [...b].sort())
const statusSummary = sites => Object.fromEntries(['Accepted', 'Ambiguous', 'Rejected', 'Pending'].map(s => [s, sites.filter(x => x.status === s).length]))

/** Fixed reviewed trust anchors; hashes establish correspondence, not source truth.
 * QA must independently review the pinned original semantic source/campus chain.
 * No caller-supplied reviewed/identity boolean or new evidence registry is accepted.
 */
export function loadReviewedPartialBatch(read) {
  const registryBytes = read(`${phase2aDirectory}/reviewed/registry.json`)
  const manifestBytes = read(`${phase2aDirectory}/reviewed/manifest.json`)
  if (sha256(registryBytes) !== partialBatchPins.registrySha256 || sha256(manifestBytes) !== partialBatchPins.manifestSha256) fail('Reviewed registry/manifest SHA-256 drift')
  const coverage = prepareCoverageBatch(registryBytes, manifestBytes, read)
  for (const name of batchFiles) {
    if (!Buffer.from(coverage.outputs[name]).equals(read(`${phase2aDirectory}/batch/${name}`))) fail(`Phase 2A artifact drift: ${name}`)
  }
  const uploadBytes = read(`${phase2aDirectory}/batch/addresses.csv`), mappingBytes = read(`${phase2aDirectory}/batch/address-mapping.json`)
  verifyPartialMapping(uploadBytes, mappingBytes)
  const researchDirectory = 'output/workflow/2026-11-06/training-venue-geocoding/inputs'
  const originalInputs = inputFiles.map(([file, hash]) => {
    const bytes = read(`${researchDirectory}/${file}`)
    if (sha256(bytes) !== hash) fail(`Original research SHA-256 drift: ${file}`)
    return bytes
  })
  const prepared = prepareDataset(JSON.parse(originalInputs[0]), JSON.parse(originalInputs[1]),
    JSON.parse(read('data/playon/4115-basketball.json')), inputFiles.map(([file, hash], i) => ({ file, sha256: hash, bytes: originalInputs[i].length })))
  const productionBytes = read('data/benchmarks/training-venue-geocoding/venue-geocoding-results.json')
  if (sha256(productionBytes) !== partialBatchPins.productionSha256) fail('Production baseline drift; requires explicit new review')
  const production = JSON.parse(productionBytes)
  if (production.sites.length !== 58 || !isDeepStrictEqual(statusSummary(production.sites), { Accepted: 16, Ambiguous: 11, Rejected: 1, Pending: 30 })) fail('Protected production baseline mismatch')
  const batch = { coverage, prepared, production, uploadBytes, mappingBytes, registry: JSON.parse(registryBytes),
    pins: { ...partialBatchPins }, reviewedArtifactHashes: Object.fromEntries(batchFiles.map(name => [name, sha256(coverage.outputs[name])])) }
  checkedBatches.set(batch, batchDigest(batch))
  return batch
}

export function verifyPartialMapping(uploadBytes, mappingBytes) {
  if (sha256(uploadBytes) !== partialBatchPins.uploadSha256 || sha256(mappingBytes) !== partialBatchPins.mappingSha256) fail('CSV / Mapping SHA-256 drift')
  const mapping = JSON.parse(mappingBytes)
  if (mapping.batchId !== partialBatchPins.batchId || mapping.schemaVersion !== 1 || mapping.csv?.sha256 !== sha256(uploadBytes) ||
      !sameIds(mapping.rows.map(r => r.physicalSiteId), targetSiteIds) || mapping.rows.some((r, i) => r.inputIndex !== i + 1 || r.rowNumber !== i + 1 || r.uploadCsvSha256 !== sha256(uploadBytes))) fail('Incorrect batch, PhysicalSiteId or InputIndex mapping')
  return mapping
}

/** The inspected 16-column service schema contains one selected record OR an
 * aggregate candidate-count comment. Candidate details in aggregate comments
 * were not returned. Duplicate indices are unsupported extra records, preserved
 * and blocked, never truncated or treated as a first-candidate selection.
 */
export function inspectPartialBatch({ resultBytes, uploadBytes, mappingBytes }) {
  const mapping = verifyPartialMapping(uploadBytes, mappingBytes)
  const errors = [], bytes = Buffer.from(resultBytes)
  let parsed = null
  try { parsed = parseCsv(bytes) } catch (error) { errors.push(`CSV parse failure: ${error.message}`) }
  const header = parsed?.[0] ?? null
  const supported = header !== null && isDeepStrictEqual(header, resultHeader)
  if (parsed && !supported) errors.push('Unsupported actual government result schema; no fields guessed')
  const rawRows = supported ? parsed.slice(1).map((fields, i) => ({
    dataRowNumber: i + 1, csvRecordNumber: i + 2, fields,
    raw: Object.fromEntries(header.map((key, n) => [key, fields[n]])),
  })) : []
  const groups = new Map(mapping.rows.map(row => [row.inputIndex, []]))
  for (const row of rawRows) {
    const index = row.raw.InputIndex
    if (!/^[1-9]\d*$/.test(index) || !Number.isSafeInteger(Number(index))) { errors.push(`Invalid or missing InputIndex at result record ${row.csvRecordNumber}`); continue }
    const expected = mapping.rows.find(r => r.inputIndex === Number(index))
    if (!expected) { errors.push(`Unexpected InputIndex ${index} at result record ${row.csvRecordNumber}`); continue }
    groups.get(Number(index)).push(row)
    if (row.raw['Address to Validate'] !== expected.streetAddress || row.raw.LOCALITY !== expected.locality) errors.push(`Wrong or missing exact address/locality echo for InputIndex ${index}`)
  }
  const entries = mapping.rows.map(row => {
    const records = groups.get(row.inputIndex)
    if (records.length !== 1) errors.push(`${records.length ? 'Duplicate' : 'Missing'} InputIndex ${row.inputIndex}: ${records.length} records`)
    const result = records.length === 1 ? Object.fromEntries(Object.entries(records[0].raw).map(([k, v]) => [k, v.trim()])) : null
    const aggregate = result?.Comment.match(/^(\d+) candidates address records found\.$/)
    const emptySelected = result && ['Primary Address', 'Locality', 'Postcode', 'Longitude', 'Latitude', 'GeocodeType', 'Confidence', 'FullAddress'].every(k => !result[k])
    const candidateCount = aggregate && emptySelected ? Number(aggregate[1]) : result?.Latitude && result.Longitude ? 1 : null
    const responseKind = !result ? 'missing-or-duplicate-result' : aggregate && emptySelected ?
      (candidateCount > 1 ? 'multiple-candidates-aggregate-only' : candidateCount === 0 ? 'no-match' : 'unselected-single-candidate') :
      result.Comment === 'Unable to fulfil parsing Address request' && emptySelected ? 'government-address-parsing-failure' :
      result.Latitude && result.Longitude ? 'selected-candidate-record' : 'incomplete-or-unrecognized-result'
    return { physicalSiteId: row.physicalSiteId, inputIndex: row.inputIndex, inputAddress: row.streetAddress, inputLocality: row.locality,
      originalMapping: row, records, result, candidateCount, responseKind,
      candidateDetailsReturned: responseKind === 'selected-candidate-record',
      exactEchoes: !!result && records[0].raw['Address to Validate'] === row.streetAddress && records[0].raw.LOCALITY === row.locality }
  })
  const distinct = new Set(rawRows.map(r => r.raw.InputIndex).filter(x => /^[1-9]\d*$/.test(x)))
  return { schemaAudit: { schemaVersion: 1, resultCsvSha256: sha256(bytes), byteLength: bytes.length, encoding: parsed ? 'UTF-8 (strict decode succeeded)' : 'Not Verified',
    bom: bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191])), crlfCount: bytes.toString('utf8').split('\r\n').length - 1,
    lfCount: bytes.toString('utf8').split('\n').length - 1, actualHeader: header, supportedSchema: supported,
    totalDataRows: parsed ? parsed.length - 1 : null, distinctInputIndices: distinct.size, observedInputOrder: rawRows.map(r => r.raw.InputIndex),
    candidateRepresentation: 'One selected result or aggregate count in Comment; aggregate candidate addresses/coordinates were not returned.',
    crs: { rawCrsField: null, explicitlyDeclaredByCsv: false, interpretation: 'Latitude/Longitude geographic degree fields under existing Batch policy; exact datum/CRS not independently declared by CSV; no reprojection or spatial footprint claim.' } },
    reconciliation: { schemaVersion: 1, batchId: mapping.batchId, uploadCsvSha256: sha256(uploadBytes), mappingSha256: sha256(mappingBytes), resultCsvSha256: sha256(bytes),
      valid: errors.length === 0, errors, rawRows, sites: entries,
      summary: { submitted: mapping.rows.length, returnedRows: parsed ? parsed.length - 1 : null, distinctInputIndices: distinct.size,
        all17Mapped: entries.every(e => e.records.length === 1 && e.exactEchoes),
        uniqueSelectedCandidates: entries.filter(e => e.responseKind === 'selected-candidate-record').length,
        multipleCandidateInputs: entries.filter(e => e.responseKind === 'multiple-candidates-aggregate-only').length,
        noMatchInputs: entries.filter(e => e.responseKind === 'no-match').length,
        governmentParsingFailures: entries.filter(e => e.responseKind === 'government-address-parsing-failure').length,
        resultCsvParsingFailures: parsed ? 0 : 1,
        rawPC100: entries.filter(e => e.result?.GeocodeType === 'PC' && e.result.Confidence === '100').length } } }
}

export function auditPartialProvenance({ receipt, receiptError = null, resultBytes, uploadBytes, validatedOn }) {
  const errors = []
  if (receiptError) errors.push(receiptError)
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) errors.push('Missing or unreadable Owner-supplied genuine-result provenance')
  else {
    if (receipt.schemaVersion !== 1 || receipt.templateOnly !== false || receipt.batchId !== partialBatchPins.batchId) errors.push('Wrong batch/schema or template-only provenance')
    if (typeof receipt.ownerDeclaration !== 'string' || !receipt.ownerDeclaration.trim()) errors.push('Owner declaration of genuine unchanged government export is missing')
    try { validateResultProvenance(receipt, resultBytes, uploadBytes, validatedOn) } catch (error) { errors.push(error.message) }
  }
  return { schemaVersion: 1, valid: errors.length === 0, status: errors.length ? 'Blocked — no formal coordinate validation or new Accepted conclusion' : 'Valid Owner declaration and exact file correspondence',
    errors, validatedOn, actualDownloadDate: receipt?.obtainedOn ?? null, receipt: receipt ?? null,
    calculatedResultCsvSha256: sha256(resultBytes), calculatedUploadCsvSha256: sha256(uploadBytes),
    limitation: 'Hashes do not independently prove government authenticity. Download date must be explicitly confirmed by Owner, never inferred from mtime.' }
}

function diagnosticChecks(entry) {
  const r = entry.result, m = entry.originalMapping
  if (!r) return { formalValidation: false, reason: 'No uniquely reconcilable result' }
  const a = m.addressComponents, number = r['Primary Address'].match(/^(\d+[a-z]?(?:-\d+[a-z]?)?)\s+/i)?.[1] ?? null
  return { formalValidation: false, inputNumber: a.number, returnedNumber: number,
    exactNumberIncludingSuffix: number?.toLowerCase() === a.number.toLowerCase(), returnedRange: !!number?.includes('-'),
    exactNumberedStreetAddress: normalizedTrainingStreet(r['Primary Address']) === normalizedTrainingStreet(m.streetAddress),
    exactStreetNameTypeDirection: normalizedTrainingStreet(r['Primary Address'].replace(/^\d+[a-z]?(?:-\d+[a-z]?)?\s+/i, '')) ===
      normalizedTrainingStreet(m.streetAddress.replace(/^\d+[a-z]?(?:-\d+[a-z]?)?\s+/i, '')),
    inputSuburb: a.suburb, returnedSuburb: r.Locality, exactSuburb: r.Locality.toLowerCase() === a.suburb.toLowerCase(),
    inputPostcode: a.postcode, returnedPostcode: r.Postcode, exactPostcode: r.Postcode === a.postcode,
    fullAddressDeclaresQueensland: /\bQLD\s+\d{4}$/i.test(r.FullAddress), rawPC100: r.GeocodeType === 'PC' && r.Confidence === '100',
    selectedCoordinatePresent: !!r.Latitude && !!r.Longitude, returnedBuildingLabel: r['Complex-Building Name'],
    caution: 'Raw component diagnostics only; not an acceptance decision or proof of campus/property identity.' }
}

/** Reuse the unchanged venue validator for all strict return/identity/conflict
 * checks. Only its sole absent legacy-registry chain diagnostic can be bridged
 * by the pinned, replayed, independently reviewed Phase 2A full chain. This is
 * an isolated partial-batch proof adapter, never a validator exemption.
 */
function validateReviewedEntry(batch, entry) {
  const original = batch.prepared.inventory.find(s => s.physicalSiteId === entry.physicalSiteId)
  const review = batch.coverage.reviews.find(s => s.physicalSiteId === entry.physicalSiteId)
  const row = entry.originalMapping
  if (!original || !review || !sameIds(original.venueIds, row.venueIds) || !sameIds(original.providerIds, row.providerIds) || !sameIds(original.associationIds, row.associationIds) ||
      !isDeepStrictEqual(review.preferredQuery.address, row.addressComponents) || !original.originalVenueIdentityResolved ||
      review.decision !== 'candidate-for-later-query' || review.holds.length || !review.trainingRelationships.length ||
      !review.evidence.length || review.trainingRelationships.length !== original.associationIds.length) fail(`Incomplete reviewed campus/training/address chain: ${entry.physicalSiteId}`)
  const site = { ...original, address: parseVenueAddress(row.canonicalAddress) }
  const outcome = validateVenueResult(site, entry.result, batch.prepared.context)
  if (outcome.status !== 'Ambiguous' || !isDeepStrictEqual(outcome.reasons, ['complete-reviewed-official-training-address-chain-required'])) return outcome
  // No return condition can reach here unless every existing strict rule passed.
  // Copy the complete pinned proof, including role differences/access/limitations;
  // do not promote an address-only record into an ordinary-training association.
  return { ...outcome, status: 'Accepted', acceptedCoordinates: outcome.candidateCoordinates, precision: original.precisionWhenValidated,
    trainingAddressEvidence: { adapter: 'phase2a-pinned-reviewed-chain-v1', registrySha256: partialBatchPins.registrySha256,
      manifestSha256: partialBatchPins.manifestSha256, campusId: review.campusId,
      trainingRelationships: review.trainingRelationships, originalAddressEvidence: review.evidence,
      componentProvenance: review.preferredQuery.componentProvenance, campusIdentityEvidence: review.campusIdentityEvidence,
      roleReview: review.roleReview, roleDifferences: review.roleDifferences, excluded: review.excluded,
      limitations: review.limitations, originalAddressAndAccess: review.originalAddressAndAccess },
    reasons: ['All unchanged strict government return checks passed; pinned Phase 2A full official training/address/campus evidence chain supplies the previously absent legacy-registry proof.',
      'Campus/venue property location only; basketball hall, court, entrance, cadastral equivalence and current training occurrence are not newly verified.'] }
}

export function validatePartialBatch(batch, { resultBytes, receipt = null, receiptError = null, validatedOn, uploadBytes = batch.uploadBytes, mappingBytes = batch.mappingBytes }) {
  if (!checkedBatches.has(batch)) fail('Validation requires the fixed pinned reviewed batch loader')
  if (checkedBatches.get(batch) !== batchDigest(batch)) fail('Loaded trusted batch mutated')
  // Recheck trust anchors; do not permit caller mutation of the loaded objects.
  if (sha256(json(batch.coverage.mapping)) !== partialBatchPins.mappingSha256 || sha256(json(batch.registry)) !== partialBatchPins.registrySha256 ||
      sha256(json(batch.production)) !== partialBatchPins.productionSha256) fail('Loaded trusted batch mutated')
  const { schemaAudit, reconciliation } = inspectPartialBatch({ resultBytes, uploadBytes, mappingBytes })
  const provenance = auditPartialProvenance({ receipt, receiptError, resultBytes, uploadBytes, validatedOn })
  const permitted = provenance.valid && reconciliation.valid
  const sites = reconciliation.sites.map(entry => {
    const current = batch.production.sites.find(s => s.physicalSiteId === entry.physicalSiteId)
    const technicalDiagnostics = diagnosticChecks(entry)
    const review = batch.coverage.reviews.find(s => s.physicalSiteId === entry.physicalSiteId)
    const outcome = permitted ? validateReviewedEntry(batch, entry) : null
    return { physicalSiteId: entry.physicalSiteId, inputIndex: entry.inputIndex, originalStatus: current.status,
      originalInputAddress: entry.inputAddress, originalInputLocality: entry.inputLocality,
      originalMapping: entry.originalMapping, rawResultReferences: entry.records.map(r => ({ resultCsvSha256: sha256(resultBytes), dataRowNumber: r.dataRowNumber, csvRecordNumber: r.csvRecordNumber })),
      rawGovernmentRecords: entry.records, candidateCount: entry.candidateCount, candidateRepresentation: entry.responseKind,
      actualGeocodeType: entry.result?.GeocodeType ?? null, actualConfidence: entry.result?.Confidence ?? null,
      rawLatitude: entry.result?.Latitude ?? null, rawLongitude: entry.result?.Longitude ?? null, crs: schemaAudit.crs,
      technicalDiagnostics, propertyCampusEvidence: { registrySha256: partialBatchPins.registrySha256,
        campusId: review.campusId, campusIdentityEvidence: review.campusIdentityEvidence,
        trainingRelationships: review.trainingRelationships, originalAddressEvidence: review.evidence,
        preferredQuery: review.preferredQuery, originalAddressAndAccess: review.originalAddressAndAccess,
        roleDifferences: review.roleDifferences, limitations: review.limitations },
      formalValidationExecuted: permitted, validation: outcome, proposedStatus: outcome?.status ?? current.status,
      unresolvedIssues: outcome ? (outcome.status === 'Accepted' ? [] : outcome.reasons) : [...provenance.errors, ...reconciliation.errors],
      acceptedCoordinates: outcome?.acceptedCoordinates ?? null,
      precision: outcome?.precision ?? null }
  })
  const validation = { schemaVersion: 1, batchId: partialBatchPins.batchId, formalValidationExecuted: permitted,
    status: permitted ? 'Strict validation executed for dry-run only' : 'Blocked — formal validation Not Verified',
    newStrictAccepted: sites.filter(s => s.validation?.status === 'Accepted').length,
    newStrictAcceptedMeaning: permitted ? 'All strict return and reviewed full source/campus/address chain conditions met for simulation' : 'Zero authorised conclusions; actual strict acceptance not verified, no hypothetical count inferred',
    sites }
  const dryRun = dryRunMerge(batch.production, batch.prepared.associations, validation, batch.pins)
  dryRun.newGovernmentResultProvenance = provenance.valid ? { ...receipt, validatedOn } : null
  dryRun.newGovernmentResultCsvSha256 = sha256(resultBytes)
  return { schemaAudit, reconciliation, provenance, validation, dryRun }
}

function fullDiff(before, after, path = '', beforePresent = true, afterPresent = true) {
  if (beforePresent === afterPresent && isDeepStrictEqual(before, after)) return []
  if (before === null || after === null || typeof before !== 'object' || typeof after !== 'object' || Array.isArray(before) || Array.isArray(after)) return [{ path: path || '/', beforePresent, afterPresent, before: before ?? null, after: after ?? null }]
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => fullDiff(before[key], after[key], `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`, Object.hasOwn(before, key), Object.hasOwn(after, key)))
}
export function dryRunMerge(production, associations, validation, pins) {
  const byId = new Map(validation.sites.map(s => [s.physicalSiteId, s]))
  const merged = production.sites.map(site => {
    const entry = byId.get(site.physicalSiteId)
    return entry?.validation ? { ...entry.validation, partialBatchProvenance: { ...pins, inputIndex: entry.inputIndex, rawResultReferences: entry.rawResultReferences } } : structuredClone(site)
  })
  const changes = production.sites.flatMap(site => {
    const proposed = merged.find(s => s.physicalSiteId === site.physicalSiteId)
    const differences = fullDiff(site, proposed)
    return differences.length ? [{ physicalSiteId: site.physicalSiteId, oldStatus: site.status, newStatus: proposed.status,
      reason: proposed.reasons, source: byId.get(site.physicalSiteId).rawResultReferences, differences }] : []
  })
  const coverage = sites => {
    const acceptedIds = new Set(sites.filter(s => s.status === 'Accepted').map(s => s.physicalSiteId))
    const covered = associations.filter(a => acceptedIds.has(a.physicalSiteId))
    return { providerIds: [...new Set(covered.map(a => a.providerId))].sort(), associationIds: covered.map(a => a.associationId).sort() }
  }
  const oldCoverage = coverage(production.sites), newCoverage = coverage(merged)
  const targets = new Set(targetSiteIds)
  const unrelatedUnchanged = production.sites.filter(s => !targets.has(s.physicalSiteId)).every(s => isDeepStrictEqual(s, merged.find(m => m.physicalSiteId === s.physicalSiteId)))
  const acceptedUnchanged = production.sites.filter(s => s.status === 'Accepted').every(s => isDeepStrictEqual(s, merged.find(m => m.physicalSiteId === s.physicalSiteId)))
  if (!unrelatedUnchanged || !acceptedUnchanged) fail('Protected unrelated/Accepted record drift in dry-run')
  return { schemaVersion: 1, simulationOnly: true, publicationApproved: false, productionWritePerformed: false,
    formalValidationExecuted: validation.formalValidationExecuted, originalGovernmentResultProvenance: production.governmentResultProvenance,
    originalProductionSummary: production.summary, beforeSummary: statusSummary(production.sites), afterSummary: statusSummary(merged),
    projectedAcceptedIncrease: merged.filter(s => s.status === 'Accepted').length - production.summary.Accepted,
    coverage: { before: oldCoverage, after: newCoverage, additionalProviders: newCoverage.providerIds.filter(id => !oldCoverage.providerIds.includes(id)),
      additionalAssociations: newCoverage.associationIds.filter(id => !oldCoverage.associationIds.includes(id)) },
    preservation: { other41Unchanged: unrelatedUnchanged, all16AcceptedUnchanged: acceptedUnchanged,
      all58Retained: merged.length === 58, original28GovernmentRowsRetained: production.sites.filter(s => s.governmentEvidence).every(s => isDeepStrictEqual(s, merged.find(m => m.physicalSiteId === s.physicalSiteId))) },
    changes, sites: merged }
}
