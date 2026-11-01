import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clubSearchQuery, mapClubResults, searchClubs } from '../src/clubSearch.ts'

const node = (id, tags, extra = {}) => ({ type: 'node', id, lat: -27.47, lon: 153.02, tags, ...extra })
const clubTags = { name: 'Example Basketball Association', club: 'sport', sport: 'basketball' }

test('queries clubs and named centres, excludes pitches, uses south/west/north/east', () => {
  const query = clubSearchQuery({ west: 152, south: -28, east: 154, north: -27 })
  assert.match(query, /nwr\["club"="sport"\]/)
  assert.match(query, /sports_centre\|sports_hall/)
  assert.match(query, /\["name"\]\["leisure"!="pitch"\]\(-28,152,-27,154\)/)
  assert.match(query, /out center tags/)
  assert.equal(query, clubSearchQuery({ west: 512, south: -28, east: 514, north: -27 }))
})

test('handles antimeridian, repeated worlds, and invalid coordinates', () => {
  assert.match(clubSearchQuery({ west: 170, south: -10, east: 190, north: 10 }), /\(-10,170,10,-170\)/)
  assert.match(clubSearchQuery({ west: -240, south: -95, east: 240, north: 95 }), /\(-90,-180,90,180\)/)
  assert.throws(() => clubSearchQuery({ west: NaN, south: 0, east: 10, north: 10 }))
})

test('maps nodes, ways and relations with stable IDs and unknown junior status', () => {
  const results = mapClubResults({ elements: [
    node(1, { ...clubTags, name: 'Junior Basketball Association', website: 'https://example.org', 'addr:housenumber': '12', 'addr:street': 'Test St' }),
    { type: 'way', id: 1, center: { lat: -27.4, lon: 153 }, tags: { name: 'Named Arena', leisure: 'sports_centre', sport: 'volleyball;basketball' } },
    { type: 'relation', id: 1, center: { lat: -27.5, lon: 153.1 }, tags: clubTags },
  ] })
  assert.deepEqual(results.map(club => club.id), ['osm:node/1', 'osm:way/1', 'osm:relation/1'])
  assert.ok(results.every(club => club.juniorProgram === null))
  assert.equal(results[0].address, '12 Test St')
  assert.equal(results[0].website, 'https://example.org/')
  assert.equal(results[1].address, undefined)
})

test('rejects courts, unnamed/generic venues, other sports and malformed coordinates', () => {
  assert.deepEqual(mapClubResults({ elements: [
    node(1, { name: 'Local Court', leisure: 'pitch', sport: 'basketball' }),
    node(2, { ...clubTags, leisure: 'pitch' }),
    node(3, { leisure: 'sports_hall', sport: 'basketball' }),
    node(4, { name: 'Basketball Court', leisure: 'sports_centre', sport: 'basketball' }),
    node(5, { ...clubTags, sport: 'football' }),
    node(6, clubTags, { lat: 91 }),
    node(7, clubTags, { lat: 'unknown' }),
    node(8, { name: 'Undercover courts', leisure: 'sports_centre', sport: 'basketball' }),
    node(9, { name: 'R Block', leisure: 'sports_hall', sport: 'basketball' }),
    null,
  ] }), [])
})

test('deduplicates external IDs and rejects unsafe or malformed website links', () => {
  const item = node(1, { ...clubTags, website: 'javascript:alert(1)', 'contact:website': 'https://example.org/contact' })
  const results = mapClubResults({ elements: [item, item, node(2, { ...clubTags, website: 'not a URL' })] })
  assert.equal(results.length, 2)
  assert.equal(results[0].website, 'https://example.org/contact')
  assert.equal(results[1].website, undefined)
})

test('empty results succeed; invalid and partial Overpass responses fail', () => {
  assert.deepEqual(mapClubResults({ elements: [] }), [])
  for (const data of [null, {}, { elements: {} }, { elements: [], remark: 'runtime error: Query timed out' }]) {
    assert.throws(() => mapClubResults(data))
  }
})

test('fetch sends the query and abort signal, and rejects HTTP and JSON failures', async (t) => {
  const signal = new AbortController().signal
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(new URL(url).origin, 'https://overpass-api.de')
    assert.equal(new URL(url).searchParams.get('data'), 'query')
    assert.equal(options.signal, signal)
    return new Response(JSON.stringify({ elements: [] }))
  })
  assert.deepEqual(await searchClubs('query', signal), [])
  globalThis.fetch.mock.mockImplementation(async () => new Response('busy', { status: 429 }))
  await assert.rejects(searchClubs('query', signal), /429/)
  globalThis.fetch.mock.mockImplementation(async () => new Response('invalid JSON'))
  await assert.rejects(searchClubs('query', signal))
})
