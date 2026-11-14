import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { confirmedVenues, parsePilot, safeSourceUrl, searchPilot, trainingLocations } from '../src/pilot.ts'

const fixture = () => ({
  associations: [{ id: 'swm', name: 'SWM Pirates', sourceUrl: 'https://example.org/directory' }],
  clubs: ['a', 'b', 'list-only'].map(id => ({ id, name: `Club ${id}`, sourceUrl: 'https://example.org/directory' })),
  venues: [{ id: 'school', name: 'School Hall', address: '1 Test Road, Runcorn QLD 4113', suburb: 'Runcorn',
    coordinates: { longitude: 153.08, latitude: -27.59, precision: 'school_campus', source: 'official_campus', sourceUrl: 'https://example.org/school' } }],
  clubVenues: ['a', 'b'].map(clubId => ({ id: clubId, clubId, venueId: 'school', activityType: 'regular_team_training', evidenceStatus: 'confirmed_regular', sourceUrl: 'https://example.org/training' })),
  summary: { checkedAt: '2026-11-14' },
})

test('shared venue produces one marker with both clubs and keeps list-only clubs searchable', () => {
  const pilot = fixture()
  const locations = trainingLocations(pilot)
  assert.equal(locations.length, 1)
  assert.equal(locations[0].clubs.length, 2)
  assert.equal(searchPilot(pilot, '').length, 3)
  assert.equal(searchPilot(pilot, 'Runcorn').length, 2)
  assert.equal(searchPilot(pilot, 'list-only').length, 1)
  assert.equal(confirmedVenues(pilot, 'list-only').length, 0)
})

test('candidates, history and competition relations cannot become training markers', () => {
  for (const status of ['candidate', 'historical', 'unresolved']) {
    const pilot = fixture()
    pilot.clubVenues.forEach(relation => { relation.evidenceStatus = status })
    assert.equal(trainingLocations(pilot).length, 0)
  }
  const pilot = fixture()
  pilot.clubVenues.forEach(relation => { relation.activityType = 'competition' })
  assert.equal(trainingLocations(pilot).length, 0)
})

test('missing, invalid and untraceable coordinates stay list-only', () => {
  for (const point of [null, { longitude: 0, latitude: 0 }, { longitude: NaN, latitude: -27.59 }, { longitude: 153.08, latitude: -27.59, precision: 'campus', sourceUrl: 'javascript:alert(1)' }]) {
    const pilot = fixture()
    pilot.venues[0].coordinates = point
    assert.equal(trainingLocations(pilot).length, 0)
    assert.equal(searchPilot(pilot, '').length, 3)
  }
  assert.equal(safeSourceUrl('javascript:alert(1)'), undefined)
  assert.throws(() => parsePilot({}), /could not be read/)
})

test('V2 app and map have no V1 provider data fallback', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  const map = readFileSync(new URL('../src/ClubMap.tsx', import.meta.url), 'utf8')
  assert.match(app, /data\/v2\/pilot.json/)
  assert.doesNotMatch(app + map, /import.*(?:playOn|playOnProviders|ProviderList)/)
  assert.doesNotMatch(app + map, /Play On providers|View provider address/)
})

test('real generated pilot and GeoJSON agree on confirmed training and coordinate metadata', () => {
  const pilot = parsePilot(JSON.parse(readFileSync(new URL('../public/data/v2/pilot.json', import.meta.url), 'utf8')))
  const geojson = JSON.parse(readFileSync(new URL('../public/data/v2/venues.geojson', import.meta.url), 'utf8'))
  assert.equal(pilot.associations.length, 1)
  assert.ok(pilot.clubs.length > 0)
  assert.equal(new Set(pilot.clubs.map(club => club.id)).size, pilot.clubs.length)
  const locations = trainingLocations(pilot)
  const pointKeys = new Set(geojson.features.map(feature => feature.geometry.coordinates.join(',')))
  assert.equal(locations.length, pointKeys.size)
  for (const feature of geojson.features) {
    const venue = pilot.venues.find(venue => venue.id === feature.properties.venueId)
    assert.ok(venue?.coordinates)
    assert.equal(feature.properties.precision, venue.coordinates.precision)
    assert.equal(feature.properties.sourceUrl, venue.coordinates.sourceUrl)
    for (const clubId of feature.properties.clubIds) {
      assert.ok(confirmedVenues(pilot, clubId).some(item => item.id === venue.id))
    }
  }
})

test('public payload excludes contacts, raw evidence and internal operational details', () => {
  const pilot = JSON.parse(readFileSync(new URL('../public/data/v2/pilot.json', import.meta.url), 'utf8'))
  const forbidden = new Set(['contactUrl', 'discoveryAttempts', 'rawNames', 'rawAddresses', 'addressResolution', 'geocodingNote', 'contentHash', 'basis', 'inputManifest', 'sourceFailures', 'html'])
  function inspect(value) {
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      assert.ok(!forbidden.has(key), `Private field exported: ${key}`)
      inspect(child)
    }
  }
  inspect(pilot)
  const text = JSON.stringify(pilot)
  assert.doesNotMatch(text, /mailto:|<html|\/Users\/|Traceback|urlopen error/)
  const geo = JSON.parse(readFileSync(new URL('../public/data/v2/venues.geojson', import.meta.url), 'utf8'))
  for (const point of geo.features) assert.match(point.properties.attribution, /CC BY 4\.0/)
})
