import { realpathSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { safePartialRead } from './reconcile-training-venue-coverage.mjs'
import { buildProductionMerge } from './training-venues/production-merge.mjs'
import { loadHistoricalBaseline, historicalOutputPins } from './training-venues/historical-baseline.mjs'
import { writeProductionOutputs, productionOutputPlan, readProductionFile } from './training-venues/production-output.mjs'
import { sha256 } from './qld-geocoder/export.mjs'
import { json } from './training-venues/prepare.mjs'

const root = realpathSync(fileURLToPath(new URL('..', import.meta.url)))
export function assertKnownProductionState(projectRoot, outputs) {
  const plan = productionOutputPlan(projectRoot)
  const current = Object.fromEntries(Object.entries(plan.files).map(([name, path]) => {
    if (!existsSync(path)) throw new Error(`Missing formal output: ${name}; no output written`)
    return [name, sha256(readProductionFile(projectRoot, path))]
  }))
  const historical = Object.keys(current).every(name => current[name] === historicalOutputPins[name])
  const merged = Object.keys(current).every(name => current[name] === sha256(outputs[name]))
  if (!historical && !merged) throw new Error('Unknown or mixed formal production state; no output written')
}
export function generateProduction({ check = false, historicalCheck = false } = {}) {
  const read = path => safePartialRead(root, path)
  if (historicalCheck) {
    const historical = loadHistoricalBaseline(read)
    return { mode: 'historical-check', productionWritePerformed: false, summary: historical.geocoding.summary,
      sha256: sha256(historical.outputs['venue-geocoding-results.json']),
      outputHashes: Object.fromEntries(Object.entries(historical.outputs).map(([name, bytes]) => [name, sha256(bytes)])) }
  }
  const merge = buildProductionMerge(read)
  // Unknown prior state must never be repaired implicitly. Only the approved
  // historical seven-file state or this deterministic dual-batch state can enter.
  assertKnownProductionState(root, merge.outputs)
  const output = writeProductionOutputs(root, merge.outputs, { check })
  return { ...output, summary: merge.geocoding.summary, publicDisplayApproved: false,
    batches: merge.manifest.batches.map(b => ({ batchId: b.batchId, rows: b.rows.length, resultCsvSha256: b.resultCsvSha256 })),
    coverage: merge.result.dryRun.coverage }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { check: { type: 'boolean', default: false }, 'historical-check': { type: 'boolean', default: false } }, allowPositionals: false })
    if (values.check && values['historical-check']) throw new Error('Choose either --check or --historical-check')
    console.log(json(generateProduction({ check: values.check, historicalCheck: values['historical-check'] })))
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
