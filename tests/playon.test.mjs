import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { buildSearchUrl, resolveLocality, parseProviderPage, deduplicateProviders, providerId } from '../scripts/playon/parse.mjs'
import { ingestProviders, writeDataset } from '../scripts/playon/ingest.mjs'

const fixture = await readFile(new URL('./fixtures/playon-providers.html', import.meta.url), 'utf8')
const url = buildSearchUrl({ activity: 'Basketball', postcode: '4115', radius: 25,
  locality: { name: 'ALGESTER', latitude: '-27.61273', longitude: '153.03255' } })
const context = { sourceUrl: url, checkedAt: '2026-09-11T00:00:00.000Z', activity: 'Basketball' }
const card = (name = 'Synthetic Club', address = '') => `<div class="card"><h3 class="card-title">${name}</h3><dl>${address}<dt>Activities:</dt><dd><ul><li>Basketball</li></ul></dd></dl></div>`
const page = (body, next) => `<div id="qg-search-results">${body}${next ? `<ul class="pagination"><li class="next"><a href="${next.replaceAll('&', '&amp;')}">Next</a></li></ul>` : ''}</div>`
const pageUrl = number => { const value = new URL(url); value.searchParams.set('page', String(number)); return value.href }

test('parses multiple cards, entities, optional addresses and multiple activities with provenance', () => {
  const { providers, nextUrl } = parseProviderPage(fixture, context)
  assert.equal(providers.length, 2)
  assert.equal(providers[0].name, 'Example Hoops & Recreation Inc.')
  assert.deepEqual(providers[0].activities, ['Basketball', 'Wheelchair Basketball'])
  assert.equal(providers[0].address, '12 Example Road, Example Suburb Queensland 4115')
  assert.equal(providers[0].suburb, 'Example Suburb')
  assert.equal(providers[0].postcode, '4115')
  assert.equal(providers[0].source, 'qld-play-on')
  assert.equal(providers[0].sourceUrl, url)
  assert.equal(providers[0].sourceLastChecked, context.checkedAt)
  assert.equal(Object.hasOwn(providers[1], 'address'), false)
  assert.equal(Object.hasOwn(providers[1], 'postcode'), false)
  assert.equal(nextUrl, null)
})

test('allowlist excludes contacts, websites and unrelated autocomplete data', () => {
  const { providers } = parseProviderPage(fixture, context)
  const allowed = ['id', 'name', 'activities', 'address', 'suburb', 'postcode', 'source', 'sourceUrl', 'sourceLastChecked']
  assert.ok(providers.every(provider => Object.keys(provider).every(key => allowed.includes(key))))
  assert.doesNotMatch(JSON.stringify(providers), /Synthetic Contact|example\.invalid|0000000000|Autocomplete Only/)
  const result = parseProviderPage(page(card('Safe Club', '<dt>Address:</dt><dd>synthetic@example.invalid</dd>')), context)
  assert.equal(Object.hasOwn(result.providers[0], 'address'), false)
})

test('IDs ignore formatting differences; duplicates merge activities without merging distinct addresses', () => {
  assert.equal(providerId('Example Club Inc.', '12 Test Rd'), providerId(' EXAMPLE  CLUB INC ', '12 test rd'))
  assert.notEqual(providerId('Example Club', '12 Test Rd'), providerId('Example Club', '14 Test Rd'))
  const { providers } = parseProviderPage(fixture, context)
  const result = deduplicateProviders([providers[0], { ...providers[0], activities: ['Basketball', 'Netball'] }])
  assert.equal(result.length, 1)
  assert.deepEqual(result[0].activities, ['Basketball', 'Netball', 'Wheelchair Basketball'])
})

test('retains an unstructured address without inventing suburb or postcode', () => {
  const result = parseProviderPage(page(card('Example Club', '<dt>Address:</dt><dd>Example Community Hall</dd>')), context)
  assert.equal(result.providers[0].address, 'Example Community Hall')
  assert.equal(Object.hasOwn(result.providers[0], 'suburb'), false)
})

test('flags incomplete records and rejects unexpected markup or wrong activity', () => {
  const result = parseProviderPage(page(card() + '<div class="card"><h3 class="card-title">Incomplete</h3></div>'), context)
  assert.equal(result.providers.length, 1)
  assert.equal(result.warnings.length, 1)
  for (const html of ['<html>Service unavailable</html>', page('<article>Unexpected provider</article>'), page('<div class="card">Broken</div>'), page(card().replace('Basketball', 'Football'))]) {
    assert.throws(() => parseProviderPage(html, context))
  }
})

test('parses sequential encoded Next links; rejects loops, foreign URLs and lost scope', () => {
  assert.equal(parseProviderPage(page(card(), pageUrl(2)), context).nextUrl, pageUrl(2))
  for (const next of [url, pageUrl(3), 'https://example.invalid/?page=2', pageUrl(2).replace('Basketball', 'Football')]) {
    assert.throws(() => parseProviderPage(page(card(), next), context))
  }
})

test('recognizes the separate empty notice and terminates without requesting another page', async () => {
  const empty = '<p class="qg-pagination-count">No organisations found matching your search.</p>' + page('')
  assert.deepEqual(parseProviderPage(empty, context).providers, [])
  assert.throws(() => parseProviderPage(page(''), context), /Unrecognized empty/)
  let calls = 0
  const result = await ingestProviders({ url, activity: 'Basketball', fetchPage: async () => { calls++; return empty } })
  assert.equal(calls, 1)
  assert.equal(result.summary.totalProviders, 0)
})

test('fetches each page once in order, deduplicates records, and stops without Next', async () => {
  const requested = []
  let pauses = 0
  const result = await ingestProviders({ url, activity: 'Basketball', checkedAt: context.checkedAt,
    fetchPage: async value => {
      requested.push(value)
      if (value === url) return page(card('First'), pageUrl(2))
      if (value === pageUrl(2)) return page(card('First') + card('Second'))
      throw new Error('Unexpected page')
    }, pause: async milliseconds => { assert.equal(milliseconds, 500); pauses++ },
  })
  assert.deepEqual(requested, [url, pageUrl(2)])
  assert.equal(pauses, 1)
  assert.equal(result.providers.length, 2)
  assert.equal(result.summary.duplicatesRemoved, 1)
})

test('rejects repeated content, pagination limit, and request failures', async () => {
  await assert.rejects(ingestProviders({ url, activity: 'Basketball', pause: async () => {},
    fetchPage: async value => page(card('Same'), value === url ? pageUrl(2) : null),
  }), /Repeated result page/)
  await assert.rejects(ingestProviders({ url, activity: 'Basketball', maxPages: 1,
    fetchPage: async () => page(card(), pageUrl(2)),
  }), /exceeded/)
  await assert.rejects(ingestProviders({ url, activity: 'Basketball', fetchPage: async () => { throw new Error('HTTP 503') } }), /503/)
})

test('official locality lookup resolves postcode deterministically and supports explicit locality', () => {
  const rows = [{ name: 'PARKINSON', pcode: ['4115'], la: '-27.64278', lo: '153.03033' },
    { name: 'ALGESTER', pcode: ['4115'], la: '-27.61273', lo: '153.03255' }]
  assert.equal(resolveLocality(rows, '4115').name, 'ALGESTER')
  assert.equal(resolveLocality(rows, '4115', 'parkinson').name, 'PARKINSON')
  assert.throws(() => resolveLocality(rows, '4000'))
  assert.throws(() => buildSearchUrl({ activity: '', postcode: '4115', radius: 25 }))
})

test('writes only normalized JSON to the chosen local path', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'playon-test-'))
  try {
    const path = join(dir, 'nested', 'providers.json')
    const { providers } = parseProviderPage(fixture, context)
    await writeDataset(path, providers)
    assert.deepEqual(JSON.parse(await readFile(path, 'utf8')), providers)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
