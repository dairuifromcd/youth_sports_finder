import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { localityUrl, resolveLocality, buildSearchUrl } from './playon/parse.mjs'
import { fetchText, ingestProviders, writeDataset } from './playon/ingest.mjs'

try {
  const { values } = parseArgs({ options: {
    activity: { type: 'string', default: 'Basketball' },
    postcode: { type: 'string', default: '4115' },
    locality: { type: 'string' },
    radius: { type: 'string', default: '25' },
    output: { type: 'string' },
    help: { type: 'boolean' },
  } })
  if (values.help) {
    console.log('npm run ingest:playon -- [--activity Basketball] [--postcode 4115] [--locality ALGESTER] [--radius 25] [--output data/playon/4115-basketball.json]')
  } else {
    if (!values.activity.trim() || !/^\d{4}$/.test(values.postcode) || ![10, 25, 50, 100, 250, 1000].includes(Number(values.radius))) {
      throw new Error('Use an activity, a four-digit postcode and radius 10, 25, 50, 100, 250 or 1000')
    }
    const locality = resolveLocality(JSON.parse(await fetchText(localityUrl)), values.postcode, values.locality)
    const url = buildSearchUrl({ activity: values.activity, postcode: values.postcode, radius: Number(values.radius), locality })
    const result = await ingestProviders({ url, activity: values.activity.trim() })
    const slug = values.activity.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (!slug) throw new Error('Activity must contain letters or digits for the output filename')
    const output = resolve(values.output ?? `data/playon/${values.postcode}-${slug}.json`)
    await writeDataset(output, result.providers)
    console.log(JSON.stringify({ output, activity: values.activity, postcode: values.postcode,
      radiusKm: Number(values.radius), locality, ...result.summary }, null, 2))
  }
} catch (error) {
  // Never include response HTML or contact fields in diagnostics.
  console.error(`Play On ingestion failed: ${error.message}`)
  process.exitCode = 1
}
