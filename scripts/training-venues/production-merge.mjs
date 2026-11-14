import { isDeepStrictEqual } from 'node:util'
import { sha256 } from '../qld-geocoder/export.mjs'
import { candidatesFor, json } from './prepare.mjs'
import { loadHistoricalBaseline, historicalPins, historicalOutputPins, historicalResultPath, historicalReceiptPath } from './historical-baseline.mjs'
import { loadReviewedPartialBatch, validatePartialBatch, partialBatchPins, phase2aDirectory, phase2bDirectory } from './partial-batch-reconciliation.mjs'
import { renderPartialReports } from '../reconcile-training-venue-coverage.mjs'

export const productionDirectory = 'data/benchmarks/training-venue-geocoding'
export const phase2cDirectory = 'output/workflow/2026-11-13/training-venue-coverage-phase2c'
export const coverageResultPins = Object.freeze({
  resultSha256: 'a60c292b9f08a46f62dacc38b44740717b4dc751fd61be04e05ddd433e5602e9',
  receiptSha256: '9134f255109359a4bed44ed95d1ec0026ad4225b48f003ee51ffae953ce8dd4b',
  obtainedOn: '2026-11-13', validatedOn: '2026-11-13',
})
export const acceptedCoverageSites = Object.freeze(['PS007', 'PS008', 'PS013', 'PS034', 'PS041', 'PS043', 'PS050', 'PS052', 'PS073'])
export const ambiguousCoverageSites = Object.freeze(['PS010', 'PS045', 'PS048', 'PS051', 'PS093', 'PS094', 'PS095'])
const exact = (actual, expected, message) => { if (!isDeepStrictEqual(actual, expected)) throw new Error(message) }
const pinnedRead = (read, path, hash) => { const bytes = read(path); if (sha256(bytes) !== hash) throw new Error(`Production input SHA-256 drift: ${path}`); return bytes }

/** No dry-run output is a coordinate input. Revalidate genuine files, then
 * compare the reconstructed review against every approved Phase 2B report. */
export function buildProductionMerge(read) {
  const historical = loadHistoricalBaseline(read), batch = loadReviewedPartialBatch(read)
  const resultBytes = pinnedRead(read, `${phase2aDirectory}/received/government-results.csv`, coverageResultPins.resultSha256)
  const receiptBytes = pinnedRead(read, `${phase2aDirectory}/received/government-result-provenance.json`, coverageResultPins.receiptSha256)
  const receipt = JSON.parse(receiptBytes)
  if (receipt.obtainedOn !== coverageResultPins.obtainedOn) throw new Error('Coverage download date drift')
  const result = validatePartialBatch(batch, { resultBytes, receipt, validatedOn: coverageResultPins.validatedOn })
  if (!result.validation.formalValidationExecuted || !result.provenance.valid || !result.reconciliation.valid) throw new Error('Strict dual-batch validation failed')
  for (const [name, bytes] of Object.entries(renderPartialReports(result))) {
    if (!read(`${phase2bDirectory}/${name}`).equals(Buffer.from(bytes))) throw new Error(`Approved Phase 2B report drift: ${name}`)
  }
  for (const [status, ids] of [['Accepted', acceptedCoverageSites], ['Ambiguous', ambiguousCoverageSites], ['Rejected', ['PS026']]]) {
    exact(result.validation.sites.filter(s => s.proposedStatus === status).map(s => s.physicalSiteId).sort(), [...ids], `Unexpected ${status} site set`)
  }
  exact(result.dryRun.afterSummary, { Accepted: 25, Ambiguous: 18, Rejected: 2, Pending: 13 }, 'Unexpected production status summary')
  const references = (mapping, sites, batchId, sourceHash) => mapping.rows.map(row => {
    const site = sites.find(s => s.physicalSiteId === row.physicalSiteId), evidence = site.governmentEvidence
    if (!evidence || evidence.inputIndex !== row.rowNumber || evidence.inputAddress !== row.streetAddress || evidence.inputLocality !== row.locality) throw new Error('Batch/site/index/address proof mismatch')
    return { batchId, physicalSiteId: row.physicalSiteId, inputIndex: evidence.inputIndex,
      queryAddress: evidence.inputAddress, queryLocality: evidence.inputLocality,
      resultCsvSha256: sourceHash, canonicalGovernmentRowSha256: sha256(json(evidence.rawGovernmentRow)) }
  })
  const manifest = { schemaVersion: 1, inputIndexScope: 'batch-local; never globally unique',
    historicalBaselineSha256: historicalOutputPins['venue-geocoding-results.json'],
    batches: [
      { batchId: historicalPins.batchId, obtainedOn: historicalPins.obtainedOn, validatedOn: historicalPins.validatedOn,
        resultPath: historicalResultPath, resultCsvSha256: historicalPins.resultSha256,
        provenancePath: historicalReceiptPath, provenanceSha256: historicalPins.receiptSha256,
        uploadPath: `${productionDirectory}/addresses.csv`, uploadCsvSha256: historicalOutputPins['addresses.csv'],
        mappingPath: `${productionDirectory}/address-mapping.json`, mappingSha256: historicalOutputPins['address-mapping.json'],
        governmentResultProvenance: historical.geocoding.governmentResultProvenance,
        rows: references(historical.prepared.mapping, historical.geocoding.sites, historicalPins.batchId, historicalPins.resultSha256) },
      { batchId: partialBatchPins.batchId, obtainedOn: coverageResultPins.obtainedOn, validatedOn: coverageResultPins.validatedOn,
        resultPath: `${phase2aDirectory}/received/government-results.csv`, resultCsvSha256: coverageResultPins.resultSha256,
        provenancePath: `${phase2aDirectory}/received/government-result-provenance.json`, provenanceSha256: coverageResultPins.receiptSha256,
        uploadPath: `${phase2aDirectory}/batch/addresses.csv`, uploadCsvSha256: partialBatchPins.uploadSha256,
        mappingPath: `${phase2aDirectory}/batch/address-mapping.json`, mappingSha256: partialBatchPins.mappingSha256,
        registrySha256: partialBatchPins.registrySha256, manifestSha256: partialBatchPins.manifestSha256,
        governmentResultProvenance: result.dryRun.newGovernmentResultProvenance,
        rows: references(batch.coverage.mapping, result.dryRun.sites, partialBatchPins.batchId, coverageResultPins.resultSha256) },
    ],
    provenanceLimitation: 'Hashes and exact echoes establish correspondence; genuine government origin depends on retained Owner declarations. Independent batches may use different government data versions; no common version is asserted.',
  }
  const geocoding = { ...historical.geocoding, summary: result.dryRun.afterSummary, sites: result.dryRun.sites, dualBatchSources: manifest }
  for (const site of historical.geocoding.sites.filter(s => !result.validation.sites.some(v => v.physicalSiteId === s.physicalSiteId))) {
    exact(geocoding.sites.find(s => s.physicalSiteId === site.physicalSiteId), site, 'Protected full record drift')
  }
  const candidates = candidatesFor(historical.prepared, geocoding)
  for (const venue of candidates.venues) {
    const site = geocoding.sites.find(s => s.physicalSiteId === venue.physicalSiteId)
    if (site.status !== 'Accepted' && (venue.coordinates !== null || venue.precision !== null)) throw new Error('Nonaccepted coordinates leaked into candidate projection')
  }
  const outputs = { ...historical.outputs, 'venue-geocoding-results.json': json(geocoding), 'training-venue-candidates.json': json(candidates) }
  return { historical, result, manifest, geocoding, candidates, outputs }
}
