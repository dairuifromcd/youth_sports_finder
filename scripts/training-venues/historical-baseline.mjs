import { sha256 } from '../qld-geocoder/export.mjs'
import { inputFiles, prepareDataset, candidatesFor, json } from './prepare.mjs'
import { geocodingFor, verifyMapping } from './validate.mjs'
import { providerDisplayLinks } from '../../src/data/providerLinks.ts'

export const historicalDirectory = 'output/workflow/2026-11-06/training-venue-geocoding'
export const historicalResultPath = 'output/workflow/2026-11-06/training-venue-same-site-aliases/inputs/government-results.csv'
export const historicalReceiptPath = 'output/workflow/2026-11-06/training-venue-same-site-aliases/government-result-provenance.json'
export const historicalPins = Object.freeze({ batchId: 'training-venue-historical-2026-11-06', obtainedOn: '2026-11-06', validatedOn: '2026-11-12',
  resultSha256: 'af93783481c4b2917abe63b98355776631bffd7d2beb376e11847983b481a8af',
  receiptSha256: '8fe0de4d769d2e83d9c90aba03ddbb0ae91d840d062d774be4ce483b37de3658' })
export const historicalOutputPins = Object.freeze({
  'venue-inventory.json': '9ca80b36203397065b9e1e95218f1f8ef7886cd61e91f74c673ee6e7bc1c772a',
  'eligible-associations.json': 'fc6db570de318263066889d3c1921f7f23e174390b99e7739c87e73523553c0f',
  'addresses.csv': 'bae3b00032a43f0b86e92d270851f4507c248e6a2d43c814dd321e70d3a778e2',
  'address-mapping.json': '17b7f4f914f069410826b460abebbc78210a9de0e9fa350e464a007fa8f8ef87',
  'address-preparation-results.json': 'bd60ef9ad80a1eda64134c0123b925feadcdab53b76a9011aad62ac9bd9b8b75',
  'venue-geocoding-results.json': '89f3a14af91d1396f16b1a1663b6066301474b6f62beacfaba8eee69b069577d',
  'training-venue-candidates.json': 'ca678d94b284de3bb3a1a9650d347d7c3d45bdde7cb89be2c28e29286f225e4c',
})
const pinned = (read, path, hash) => {
  const bytes = read(path)
  if (sha256(bytes) !== hash) throw new Error(`Historical input SHA-256 drift: ${path}`)
  return bytes
}

/** Resolve the one frozen Phase 2A historical reference without rewriting its
 * reviewed registry. All bytes are independently reconstructed and hash-pinned. */
export function historicalEvidenceReader(read) {
  return path => path === 'data/benchmarks/training-venue-geocoding/venue-geocoding-results.json'
    ? Buffer.from(loadHistoricalBaseline(read).outputs['venue-geocoding-results.json']) : read(path)
}

/** Reconstruct the approved historical state, never reading mutable production results. */
export function loadHistoricalBaseline(read) {
  const bytes = inputFiles.map(([file, hash]) => pinned(read, `${historicalDirectory}/inputs/${file}`, hash))
  const raw = JSON.parse(bytes[0]), decision = JSON.parse(bytes[1])
  const inputs = inputFiles.map(([file, hash], i) => ({ file, sha256: hash, bytes: bytes[i].length }))
  const prepared = prepareDataset(raw, decision, JSON.parse(read('data/playon/4115-basketball.json')), inputs, providerDisplayLinks)
  const resultBytes = pinned(read, historicalResultPath, historicalPins.resultSha256)
  const receiptBytes = pinned(read, historicalReceiptPath, historicalPins.receiptSha256), receipt = JSON.parse(receiptBytes)
  if (receipt.obtainedOn !== historicalPins.obtainedOn) throw new Error('Historical download date drift')
  const geocoding = geocodingFor(prepared, { resultBytes, receipt, validatedOn: historicalPins.validatedOn })
  const outputs = {
    'venue-inventory.json': json({ schemaVersion: 1, status: 'Internal audit inventory — not approved for publication',
      asOfDate: raw.asOfDate, inputs, summary: prepared.preparation.summary, sites: prepared.inventory }),
    'eligible-associations.json': json({ schemaVersion: 1, status: 'Internal audit — not a frontend data feed', inputs,
      providers: [...prepared.context.providers.values()].map(p => ({ providerId: p.providerId, providerName: p.providerName }))
        .sort((a, b) => a.providerId < b.providerId ? -1 : 1), associations: prepared.associations }),
    'addresses.csv': prepared.csv, 'address-mapping.json': json(prepared.mapping),
    'address-preparation-results.json': json(prepared.preparation), 'venue-geocoding-results.json': json(geocoding),
    'training-venue-candidates.json': json(candidatesFor(prepared, geocoding)),
  }
  for (const [name, hash] of Object.entries(historicalOutputPins)) {
    if (sha256(outputs[name]) !== hash) throw new Error(`Historical rebuilt output SHA-256 drift: ${name}`)
  }
  verifyMapping(prepared, JSON.parse(outputs['address-mapping.json']), Buffer.from(outputs['addresses.csv']))
  return { prepared, geocoding, outputs, resultBytes, receipt, receiptBytes }
}
