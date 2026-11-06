import { parseArgs } from 'node:util'
import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildBatch, buildSmokeBatch, sha256 } from './qld-geocoder/export.mjs'
import { writeDataset } from './playon/ingest.mjs'

try {
  const { values } = parseArgs({ options: { export: { type: 'boolean' }, help: { type: 'boolean' } } })
  if (values.help) {
    console.log('npm run benchmark:qld-geocoder -- --export\nOffline export only. Manual upload and genuine government CSV are required before import/comparison (TASK-006).')
  } else {
    if (!values.export) throw new Error('Specify --export; import/comparison awaits a genuine official result CSV')
    const input = 'data/playon/4115-basketball.json'
    const baseline = 'data/derived/4115-basketball-geocoded.json'
    const sourceBytes = await readFile(resolve(input))
    const baselineBytes = await readFile(resolve(baseline))
    const { csv, mapping } = buildBatch(JSON.parse(sourceBytes), JSON.parse(baselineBytes))
    const expected = { totalProviders: 54, uniqueAddresses: 40, exportedAddresses: 39, exportedProviders: 53,
      manualReviewAddresses: 1, manualReviewProviders: 1 }
    if (Object.entries(expected).some(([key, value]) => mapping.summary[key] !== value)) {
      throw new Error('Fixed TASK-006 sample counts changed; expected 54 providers, 39 export groups / 53 providers and 1 review provider. No files written.')
    }
    const smoke = buildSmokeBatch(mapping)
    mapping.smoke = smoke.mapping
    mapping.inputs = { source: { file: input, sha256: sha256(sourceBytes) }, baseline: { file: baseline, sha256: sha256(baselineBytes) } }
    const directory = resolve('data/benchmarks/qld-geocoder')
    await mkdir(directory, { recursive: true })
    for (const [file, contents] of [['addresses.csv', csv], ['addresses-smoke.csv', smoke.csv]]) {
      const path = resolve(directory, file)
      const temporary = `${path}.${process.pid}.tmp`
      try {
        await writeFile(temporary, contents, { flag: 'wx' })
        await rename(temporary, path)
      } finally {
        await rm(temporary, { force: true })
      }
    }
    await writeDataset(resolve(directory, 'address-mapping.json'), mapping)
    console.log(JSON.stringify({ directory, ...mapping.summary, baseline: mapping.baseline.counts,
      status: 'Stage A2 prepared — awaiting manual compatibility test',
      next: 'Follow docs/tasks/TASK-006.md: owner uploads addresses-smoke.csv first and saves government-smoke-results.csv unchanged. Check parsing before any full upload; Stage B remains pending.' }, null, 2))
  }
} catch (error) {
  console.error(`Queensland geocoder benchmark export failed: ${error.message}`)
  process.exitCode = 1
}
