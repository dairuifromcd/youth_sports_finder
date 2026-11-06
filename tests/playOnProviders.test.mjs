import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  adaptPlayOnDataset, filterProviders, groupProviderLocations, pointInBounds, safeSourceUrl, searchProviders,
} from '../src/playOnProviders.ts'

const source = JSON.parse(readFileSync(new URL('../data/benchmarks/qld-geocoder/stage-b/validated.json', import.meta.url), 'utf8'))
const original = JSON.parse(readFileSync(new URL('../data/playon/4115-basketball.json', import.meta.url), 'utf8'))
const { providers } = adaptPlayOnDataset(source)
const world = { west: -180, east: 180, south: -90, north: 90 }
const farAway = { west: -5, east: 5, south: -5, north: 5 }
const point = (longitude, latitude = 0) => ({ longitude, latitude, precision: 'property-centroid' })

test('frozen pilot reconciles 54 original IDs, 25 accepted providers, 19 locations and 29 list-only', () => {
  assert.equal(providers.length, 54)
  assert.equal(new Set(providers.map(p => p.id)).size, 54)
  assert.deepEqual(new Set(providers.map(p => p.id)), new Set(original.map(p => p.id)))
  assert.equal(providers.filter(p => p.mapPoint).length, 25)
  assert.equal(providers.filter(p => !p.mapPoint).length, 29)
  assert.equal(groupProviderLocations(providers).length, 19)
  assert.deepEqual(source.summary.providerOutcomes, { accepted: 25, unmatched: 0, ambiguous: 19, rejected: 1, 'needs-review': 9 })
  for (const provider of providers) {
    const raw = source.providers.find(p => p.id === provider.id)
    for (const key of ['name', 'address', 'suburb', 'postcode', 'source', 'sourceUrl', 'sourceLastChecked', 'activities']) {
      assert.deepEqual(provider[key], raw[key])
    }
    assert.equal(Boolean(provider.mapPoint), raw.qldGeocode.status === 'accepted')
    if (provider.mapPoint) assert.deepEqual(provider.mapPoint, {
      latitude: raw.qldGeocode.latitude, longitude: raw.qldGeocode.longitude, precision: raw.qldGeocode.precision,
    })
    assert.equal('evidence' in provider, false)
    assert.equal('geocode' in provider, false)
  }
})

test('all seven baseline clubs are searchable with exactly three accepted address locations', () => {
  for (const [query, mapped] of [
    ['Algester Hawks', false], ['Runcorn Rockets', true], ['Cannons Southside', true],
    ['River City Hornets', false], ['Rochedale Wildcats', false], ['Sunnybank Hills Hurricanes', true], ['Dunk Star', false],
  ]) {
    const matches = searchProviders(providers, query)
    assert.equal(matches.length, 1, query)
    assert.equal(Boolean(matches[0].mapPoint), mapped, query)
    assert.equal(groupProviderLocations(matches).length, mapped ? 1 : 0)
  }
})

test('search ignores case and incidental whitespace and covers names, suburbs and postcodes', () => {
  assert.deepEqual(searchProviders(providers, '  rUnCoRn   rOckets '), searchProviders(providers, 'Runcorn Rockets'))
  assert.equal(searchProviders(providers, 'BOOVAL').length, 7)
  assert.ok(searchProviders(providers, '4115').length > 0)
  assert.ok(searchProviders(providers, '4115').every(p => p.postcode === '4115'))
  assert.equal(searchProviders(providers, '   ').length, 54)
  assert.equal(searchProviders(providers, 'no such organisation').length, 0)
})

test('complete list is the default regardless of bounds; opt-in map filter combines with search', () => {
  assert.equal(filterProviders(providers, '').length, 54)
  assert.equal(filterProviders(providers, '', false, farAway).length, 54)
  assert.equal(filterProviders(providers, '', true, farAway).length, 0)
  assert.equal(filterProviders(providers, '', true, world).length, 25)
  assert.equal(filterProviders(providers, '', true).length, 0)
  assert.equal(filterProviders(providers, 'Algester Hawks', false, farAway).length, 1)
  assert.equal(filterProviders(providers, 'Algester Hawks', true, world).length, 0)
  const runcorn = searchProviders(providers, 'Runcorn Rockets')[0]
  const { latitude, longitude } = runcorn.mapPoint
  const exact = { west: longitude, east: longitude, south: latitude, north: latitude }
  assert.deepEqual(filterProviders(providers, 'Runcorn Rockets', true, exact), [runcorn])
  assert.deepEqual(filterProviders(providers, '', false, farAway), providers)
})

test('seven Booval identities share one marker; text query changes group membership without merging records', () => {
  const booval = searchProviders(providers, 'Booval')
  const groups = groupProviderLocations(booval)
  assert.equal(groups.length, 1)
  assert.equal(groups[0].providers.length, 7)
  assert.equal(new Set(groups[0].providers.map(p => p.id)).size, 7)
  assert.deepEqual(groups[0].providers, booval)
  assert.ok(booval.every(p => p.address === '2A Ross Llewellyn Drive, Booval Queensland 4304'))
  for (const provider of booval) assert.equal(searchProviders(providers, provider.name).length, 1)
  assert.equal(groupProviderLocations(searchProviders(providers, 'Central Bulldogs'))[0].providers.length, 1)
})

test('bounds are inclusive and handle antimeridian, shifted worlds, full worlds and zero width', () => {
  const bounds = { west: 170, east: 190, south: -10, north: 10 }
  for (const longitude of [170, 180, -180, -175, -170]) assert.equal(pointInBounds(point(longitude, 10), bounds), true)
  assert.equal(pointInBounds(point(-169), bounds), false)
  assert.equal(pointInBounds(point(175, -11), bounds), false)
  assert.equal(pointInBounds(point(-175), { ...bounds, east: -170 }), true)
  assert.equal(pointInBounds(point(175), { ...bounds, west: 530, east: 550 }), true)
  assert.equal(pointInBounds(point(153.07649378), { ...world, west: 513.07649378, east: 514 }), true)
  assert.equal(pointInBounds(point(-45), { ...bounds, west: -240, east: 240 }), true)
  assert.equal(pointInBounds(point(0), { ...world, west: 360, east: 360 }), true)
  assert.equal(pointInBounds(point(1), { ...world, west: 360, east: 360 }), false)
  for (const bad of [{ ...world, west: NaN }, { ...world, south: 10, north: -10 }, { ...world, north: 91 }]) {
    assert.equal(pointInBounds(point(0), bad), false)
  }
  for (const bad of [point(Infinity), point(181), point(0, NaN), point(0, -91)]) assert.equal(pointInBounds(bad, world), false)
})

test('raw evidence, raw availability and Nominatim points never grant map eligibility', () => {
  const data = structuredClone(source)
  for (const provider of data.providers) {
    if (provider.qldGeocode.status === 'accepted') continue
    Object.assign(provider.qldGeocode, {
      rawCoordinateAvailable: true, latitude: -27.6, longitude: 153,
      evidence: { rawLatitude: '-27.6', rawLongitude: '153' },
    })
    provider.geocode = { status: 'matched', latitude: -27.6, longitude: 153 }
    provider.latitude = -27.6
    provider.longitude = 153
  }
  assert.deepEqual(adaptPlayOnDataset(data).providers, providers)
})

test('malformed selected points fail clearly, without falling back to raw evidence', () => {
  for (const [latitude, longitude] of [[undefined, 153], [null, 153], ['-27.6', 153], [NaN, 153], [-91, 153], [-27, 181], [-27, Infinity]]) {
    const data = structuredClone(source)
    Object.assign(data.providers.find(p => p.qldGeocode.status === 'accepted').qldGeocode, { latitude, longitude })
    assert.throws(() => adaptPlayOnDataset(data), /Invalid accepted provider point/)
  }
})

test('bad dataset, missing identities, duplicate IDs and schema drift fail rather than silently losing providers', () => {
  for (const data of [null, {}, { ...source, version: 2 }, { ...source, providers: [] }, { ...source, providers: {} }]) {
    assert.throws(() => adaptPlayOnDataset(data))
  }
  for (const mutate of [
    d => d.providers.push(d.providers[0]),
    d => { delete d.providers[0].id },
    d => { d.providers[0].name = '' },
    d => { d.providers[0].qldGeocode.status = 'matched' },
    d => { d.providers[0].activities = ['Football'] },
    d => { d.providers[0].postcode = 4115 },
  ]) {
    const data = structuredClone(source)
    mutate(data)
    assert.throws(() => adaptPlayOnDataset(data))
  }
})

test('sorting is alphabetical, deterministic across source order, with ID as name tie-breaker', () => {
  assert.deepEqual(adaptPlayOnDataset({ ...source, providers: [...source.providers].reverse() }).providers, providers)
  const data = structuredClone(source)
  data.providers = [data.providers[0], data.providers[1]]
  data.providers[0].name = '  same NAME '
  data.providers[1].name = 'same name'
  assert.deepEqual(adaptPlayOnDataset(data).providers.map(p => p.id), data.providers.map(p => p.id).sort())
})

test('only safe HTTP(S) source links are offered and provenance dates are preserved honestly', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '//example.org', 'not a URL', undefined, 'https://user:password@example.org']) {
    assert.equal(safeSourceUrl(value), undefined)
  }
  assert.equal(safeSourceUrl('https://example.org/search?page=2'), 'https://example.org/search?page=2')
  assert.equal(safeSourceUrl('http://example.org/search'), 'http://example.org/search')
  const data = structuredClone(source)
  data.providers[0].sourceUrl = 'javascript:alert(1)'
  const adapted = adaptPlayOnDataset(data)
  assert.equal(adapted.providers.find(p => p.id === data.providers[0].id).sourceUrl, undefined)
  assert.equal(adapted.validatedOn, '2026-11-01')
  assert.equal(source.provenance.sourceLastChecked, null)
  assert.equal(providers[0].sourceLastChecked, '2026-09-11T13:24:05.538Z')
})
