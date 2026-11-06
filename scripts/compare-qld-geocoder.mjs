import { parseArgs } from 'node:util'
import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { benchmark } from './qld-geocoder/compare.mjs'
import { renderReport } from './qld-geocoder/report.mjs'
import { writeDataset } from './playon/ingest.mjs'

try {
  const { values } = parseArgs({ options: { 'validated-on': { type: 'string' }, help: { type: 'boolean' } } })
  if (values.help) console.log('npm run benchmark:qld-geocoder:compare -- --validated-on YYYY-MM-DD\nOffline full-batch validation only; requires the original corrected government-results.csv and paired sidecar. Date is validation date, not government check time.')
  else {
    const paths = { sourceBytes: 'data/playon/4115-basketball.json', baselineBytes: 'data/derived/4115-basketball-geocoded.json',
      uploadBytes: 'data/benchmarks/qld-geocoder/addresses.csv', mappingBytes: 'data/benchmarks/qld-geocoder/address-mapping.json',
      resultsBytes: 'data/benchmarks/qld-geocoder/government-results.csv' }
    const inputs = {}
    for (const [key, path] of Object.entries(paths)) inputs[key] = await readFile(resolve(path))
    const result = benchmark({ ...inputs, validatedOn: values['validated-on'] })
    // Complete validation and report rendering before replacing any previous output.
    const report = renderReport(result)
    const directory = resolve('data/benchmarks/qld-geocoder/stage-b')
    await mkdir(directory, { recursive: true })
    await writeDataset(resolve(directory, 'validated.json'), result.validated)
    await writeDataset(resolve(directory, 'comparison.json'), result.comparison)
    const path = resolve(directory, 'report.md'), temporary = `${path}.${process.pid}.tmp`
    try { await writeFile(temporary, report, { flag: 'wx' }); await rename(temporary, path) }
    finally { await rm(temporary, { force: true }) }
    console.log(JSON.stringify({ directory, ...result.validated.summary }, null, 2))
  }
} catch (error) {
  console.error(`Queensland benchmark comparison failed; original inputs unchanged: ${error.message}`)
  process.exitCode = 1
}
