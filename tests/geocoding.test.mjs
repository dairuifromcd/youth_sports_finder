import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cacheKey, normalizeAddress, parseCandidates, selectResult, geocodeProviders, loadCache, defaultEndpoint } from '../scripts/geocoding/geocode.mjs'

const provider = { id: 'qld-play-on:synthetic', name: 'Synthetic Club', activities: ['Basketball'],
  address: '12 Test Road, Example Queensland 4115', suburb: 'Example', postcode: '4115',
  source: 'qld-play-on', sourceUrl: 'https://example.test/providers', sourceLastChecked: '2026-01-01T00:00:00Z' }
const candidate = (changes = {}) => ({ lat: '-27.6', lon: '153.0', display_name: '12 Test Road, Example, Queensland, 4115, Australia',
  address: { country_code: 'au', state: 'Queensland', postcode: '4115', suburb: 'Example', road: 'Test Road', house_number: '12', ...changes } })
const select = body => selectResult(provider, parseCandidates(body))

test('address normalization and cache keys are deterministic without conflating house numbers/units', () => {
  assert.equal(normalizeAddress(' １２ Test ROAD,  Example\nQueensland 4115 '), normalizeAddress(provider.address))
  assert.equal(cacheKey('12 Test ROAD, Example Queensland 4115'), cacheKey(provider.address))
  assert.notEqual(cacheKey(provider.address), cacheKey(provider.address.replace('12', '13')))
  assert.notEqual(cacheKey('1/12 Test Road'), cacheKey('112 Test Road'))
})
test('matching coordinates, street precision, and provenance-independent selection', () => {
  assert.equal(select([candidate()]).status, 'matched')
  assert.equal(select([candidate()]).latitude, -27.6)
  assert.equal(select([candidate()]).precision, 'house-number')
  assert.equal(selectResult({ ...provider, address: provider.address.replace('12 ', '') }, parseCandidates([candidate()])).precision, 'street')
})
test('rejects postcode, locality, state, country, street and house-number conflicts or missing evidence', () => {
  for (const changes of [{ postcode: '4000' }, { suburb: 'Elsewhere' }, { state: 'Victoria' }, { country_code: 'nz' },
    { road: 'Other Road' }, { house_number: '14' }, { house_number: undefined }, { postcode: undefined },
    { suburb: 'Elsewhere', city: 'Example' }, { 'ISO3166-2-lvl4': 'AU-VIC' }]) {
    const result = select([candidate(changes)])
    assert.equal(result.status, 'unmatched', JSON.stringify(changes))
    assert.equal(result.latitude, undefined)
    assert.ok(result.rejected.length)
  }
  assert.equal(select([candidate({ suburb: undefined, town: 'Example' })]).status, 'matched')
})
test('no results, multiple plausible results and duplicate coordinates', () => {
  assert.equal(select([]).reason, 'no-results')
  const result = select([candidate(), { ...candidate(), lat: '-27.61' }])
  assert.equal(result.status, 'ambiguous')
  assert.equal(result.latitude, undefined)
  assert.equal(select([candidate(), candidate()]).status, 'matched')
  assert.equal(select([candidate({ postcode: '4000' }), candidate()]).status, 'matched')
})
test('malformed responses are errors, not unmatched', () => {
  for (const body of [{ error: 'busy' }, null, [null], [{ ...candidate(), lat: '' }], [{ ...candidate(), lon: '181' }],
    [{ ...candidate(), address: [] }], [candidate({ postcode: 4115 })], [{ ...candidate(), display_name: undefined }]]) {
    assert.throws(() => parseCandidates(body), /Malformed/)
  }
})

async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(), 'playon-geocoding-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const cachePath = join(dir, 'cache.json')
  return { cachePath, outputPath: join(dir, 'output.json'), cache: await loadCache(cachePath, defaultEndpoint), pause: async () => {} }
}
test('matched and unmatched cache hits avoid requests; fields and both provenances survive unchanged', async t => {
  for (const body of [[candidate()], []]) {
    const options = await setup(t)
    let calls = 0
    const result = await geocodeProviders({ ...options, providers: [provider, { ...provider, id: 'second' }],
      now: () => '2026-09-12T00:00:00Z', fetchImpl: async (url, init) => {
        calls++
        assert.equal(url.pathname, '/search')
        assert.equal(url.searchParams.get('q'), provider.address)
        assert.equal(url.searchParams.get('countrycodes'), 'au')
        assert.equal(url.searchParams.get('limit'), '5')
        assert.match(init.headers['User-Agent'], /YouthSportsFinder/)
        return { ok: true, json: async () => body }
      } })
    assert.equal(calls, 1)
    assert.equal(result.summary.cacheHits, 1)
    const { geocode, ...original } = result.output[0]
    assert.deepEqual(original, provider)
    assert.equal(geocode.source, 'osm-nominatim')
    assert.equal(geocode.sourceLastChecked, '2026-09-12T00:00:00Z')
    assert.equal(geocode.addressRole, 'provider-address')
    const cache = await loadCache(options.cachePath, defaultEndpoint)
    const rerun = await geocodeProviders({ ...options, cache, providers: [provider], fetchImpl: () => assert.fail('network on cache hit') })
    assert.equal(rerun.summary.liveRequests, 0)
    assert.deepEqual(rerun.output[0], result.output[0])
  }
})
test('ambiguous results are cached and selection remains conservative on rerun', async t => {
  const options = await setup(t)
  await geocodeProviders({ ...options, providers: [provider], fetchImpl: async () => ({ ok: true, json: async () => [candidate(), { ...candidate(), lat: '-27.61' }] }) })
  const cache = await loadCache(options.cachePath, defaultEndpoint)
  const result = await geocodeProviders({ ...options, cache, providers: [provider], fetchImpl: () => assert.fail('network') })
  assert.equal(result.output[0].geocode.status, 'ambiguous')
})
test('HTTP, network, JSON and malformed failures stop requests, preserve progress and can resume', async t => {
  for (const fail of [async () => ({ ok: false, status: 429 }), async () => ({ ok: false, status: 503 }),
    async () => { throw new Error('network unavailable') }, async () => ({ ok: true, json: async () => { throw new Error('invalid JSON') } }),
    async () => ({ ok: true, json: async () => ({ error: 'bad response' }) })]) {
    const options = await setup(t)
    const second = { ...provider, id: 'second', address: provider.address.replace('12', '13') }
    const third = { ...provider, id: 'third', address: provider.address.replace('12', '14') }
    let calls = 0
    const result = await geocodeProviders({ ...options, providers: [provider, second, third, { ...provider, id: 'fourth' }],
      fetchImpl: async () => ++calls === 1 ? { ok: true, json: async () => [candidate()] } : fail() })
    assert.ok(result.failure)
    assert.equal(calls, 2)
    assert.deepEqual(result.output.map(p => p.geocode.status), ['matched', 'error', 'pending', 'matched'])
    const cache = await loadCache(options.cachePath, defaultEndpoint)
    assert.equal(Object.keys(cache.entries).length, 1)
    assert.deepEqual(JSON.parse(await readFile(options.outputPath, 'utf8')), result.output)
    const resumed = await geocodeProviders({ ...options, cache, providers: [provider, second, third], fetchImpl: async () => ({ ok: true, json: async () => [] }) })
    assert.equal(resumed.summary.liveRequests, 2)
    assert.equal(resumed.summary.cacheHits, 1)
  }
})
test('requests are sequential with at least one second before each live request', async t => {
  const options = await setup(t)
  const events = []
  await geocodeProviders({ ...options, providers: [provider, { ...provider, address: provider.address.replace('12', '13') }],
    pause: async ms => { assert.ok(ms >= 1000); events.push('pause') },
    fetchImpl: async () => { events.push('fetch'); return { ok: true, json: async () => { events.push('body'); return [] } } } })
  assert.deepEqual(events, ['pause', 'fetch', 'body', 'pause', 'fetch', 'body'])
})
test('missing source address avoids network; invalid input/cache fails clearly', async t => {
  const options = await setup(t)
  const result = await geocodeProviders({ ...options, providers: [{ ...provider, address: undefined }], fetchImpl: () => assert.fail('network') })
  assert.equal(result.output[0].geocode.reason, 'missing-source-address')
  await assert.rejects(geocodeProviders({ ...options, providers: [{ ...provider, address: 123 }] }), /Invalid Play On/)
  await writeFile(options.cachePath, '{bad')
  await assert.rejects(loadCache(options.cachePath, defaultEndpoint))
  await writeFile(options.cachePath, JSON.stringify({ ...options.cache, endpoint: 'https://other.test/search' }))
  await assert.rejects(loadCache(options.cachePath, defaultEndpoint), /endpoint mismatch/)
})

test('interruption after a completed address preserves cache and previous output for resumption', async t => {
  const options = await setup(t)
  await writeFile(options.outputPath, 'previous output\n')
  let pauses = 0
  await assert.rejects(geocodeProviders({ ...options,
    providers: [provider, { ...provider, address: provider.address.replace('12', '13') }],
    pause: async () => { if (++pauses === 2) throw new Error('simulated interruption') },
    fetchImpl: async () => ({ ok: true, json: async () => [candidate()] }) }), /simulated interruption/)
  assert.equal(await readFile(options.outputPath, 'utf8'), 'previous output\n')
  const cache = await loadCache(options.cachePath, defaultEndpoint)
  assert.equal(Object.keys(cache.entries).length, 1)
  const result = await geocodeProviders({ ...options, cache, providers: [provider], fetchImpl: () => assert.fail('network') })
  assert.equal(result.summary.cacheHits, 1)
})
