import { parseArgs } from 'node:util'
import { resolve, dirname } from 'node:path'
import { readFile, mkdir, open, rm, realpath } from 'node:fs/promises'
import { defaultEndpoint, defaultUserAgent, loadCache, geocodeProviders } from './geocoding/geocode.mjs'

try {
  const { values } = parseArgs({ options: {
    input: { type: 'string', default: 'data/playon/4115-basketball.json' },
    output: { type: 'string', default: 'data/derived/4115-basketball-geocoded.json' },
    cache: { type: 'string', default: 'data/geocoding/cache.json' },
    endpoint: { type: 'string', default: process.env.NOMINATIM_ENDPOINT ?? defaultEndpoint },
    'user-agent': { type: 'string', default: process.env.NOMINATIM_USER_AGENT ?? defaultUserAgent },
    help: { type: 'boolean' },
  } })
  if (values.help) {
    console.log('npm run geocode:playon -- [--input path] [--output path] [--cache path] [--endpoint https://host/search] [--user-agent application/contact]')
  } else {
    const endpoint = new URL(values.endpoint)
    if (!['https:', 'http:'].includes(endpoint.protocol) || !endpoint.pathname.endsWith('/search') || endpoint.search || endpoint.hash || endpoint.username || endpoint.password) throw new Error('Endpoint must be an HTTP(S) /search URL without query, credentials or fragment')
    if (!values['user-agent'].trim() || /[\r\n]/.test(values['user-agent'])) throw new Error('Supply a valid identifying User-Agent')
    const input = await realpath(resolve(values.input))
    const outputPath = resolve(values.output)
    const cachePath = resolve(values.cache)
    // Resolve existing symlinks/parents before comparing to protect the source file.
    const identity = async path => {
      try { return await realpath(path) } catch (error) {
        if (error.code !== 'ENOENT') throw error
        return resolve(await identity(dirname(path)), path.slice(dirname(path).length + 1))
      }
    }
    const paths = await Promise.all([input, outputPath, cachePath, resolve('data/playon/4115-basketball.json')].map(identity))
    if (paths[1] === paths[0] || paths[2] === paths[0] || paths[1] === paths[2] || paths[1] === paths[3] || paths[2] === paths[3]) throw new Error('Input/source, output and cache must use separate paths')
    // One local CLI at a time, even if callers choose different cache files.
    const lock = resolve('data/geocoding/.geocode.lock')
    await mkdir(dirname(lock), { recursive: true })
    let handle
    try { handle = await open(lock, 'wx') } catch (error) {
      if (error.code === 'EEXIST') throw new Error(`Geocoding lock exists: ${lock}. If no geocoding process is running, remove this stale lock and rerun.`)
      throw error
    }
    try {
      await handle.writeFile(String(process.pid))
      const providers = JSON.parse(await readFile(input, 'utf8'))
      const cache = await loadCache(cachePath, endpoint.href)
      const result = await geocodeProviders({ providers, cache, cachePath, outputPath, endpoint: endpoint.href, userAgent: values['user-agent'] })
      console.log(JSON.stringify({ input, output: outputPath, cache: cachePath, ...result.summary, failure: result.failure }, null, 2))
      if (result.failure) process.exitCode = 1
    } finally {
      await handle.close()
      await rm(lock)
    }
  }
} catch (error) {
  console.error(`Play On geocoding failed: ${error.message}`)
  process.exitCode = 1
}
