import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { writeDataset } from '../playon/ingest.mjs'

export const defaultEndpoint = 'https://nominatim.openstreetmap.org/search'
export const defaultUserAgent = 'YouthSportsFinder-ProviderAddress-POC/1.0 (+https://github.com/dairuifromcd/youth_sports_finder)'
export const attribution = '© OpenStreetMap contributors; ODbL https://www.openstreetmap.org/copyright'
export const normalizeAddress = value => (value ?? '').normalize('NFKC').toLowerCase().replace(/[,\s]+/g, ' ').trim()
export const cacheKey = address => createHash('sha256').update(normalizeAddress(address)).digest('hex')
const canonical = value => normalizeAddress(value).replace(/\./g, '').replace(/\b(rd|st|ave|dr|mt|qld)\b/g,
  word => ({ rd: 'road', st: 'street', ave: 'avenue', dr: 'drive', mt: 'mount', qld: 'queensland' })[word])

// Persist only the address evidence used for selection, never full API responses.
export function parseCandidates(body) {
  if (!Array.isArray(body) || body.length > 5) throw new Error('Malformed geocoder response: expected up to five results')
  return body.map(item => {
    if (!item || typeof item.lat !== 'string' || !item.lat.trim() || typeof item.lon !== 'string' || !item.lon.trim()
      || !Number.isFinite(Number(item.lat)) || Math.abs(Number(item.lat)) > 90
      || !Number.isFinite(Number(item.lon)) || Math.abs(Number(item.lon)) > 180
      || typeof item.display_name !== 'string' || !item.display_name.trim()
      || !item.address || typeof item.address !== 'object' || Array.isArray(item.address)) {
      throw new Error('Malformed geocoder response: invalid location/address')
    }
    const address = {}
    for (const key of ['country_code', 'state', 'ISO3166-2-lvl4', 'postcode', 'suburb', 'town', 'village', 'city_district', 'city', 'locality', 'road', 'house_number']) {
      if (item.address[key] !== undefined) {
        if (typeof item.address[key] !== 'string') throw new Error('Malformed geocoder address field')
        address[key] = item.address[key]
      }
    }
    return { latitude: Number(item.lat), longitude: Number(item.lon), matchedAddress: item.display_name, address }
  })
}

export function selectResult(provider, candidates) {
  const rejected = []
  const plausible = []
  const street = canonical(provider.address?.split(',')[0]).replace(/^unit\s+\w+\//, '')
  const number = street.match(/^([\d]+[a-z]?(?:-[\d]+[a-z]?)?)\s+/)?.[1]
  const road = number ? street.slice(number.length).trim() : street
  for (const candidate of candidates) {
    const a = candidate.address
    const reasons = []
    if (a.country_code !== 'au') reasons.push('country missing or conflicting')
    if (canonical(a.state) !== 'queensland' && a['ISO3166-2-lvl4'] !== 'AU-QLD') reasons.push('state missing or conflicting')
    if (a.state && canonical(a.state) !== 'queensland') reasons.push('conflicting state')
    if (a['ISO3166-2-lvl4'] && a['ISO3166-2-lvl4'] !== 'AU-QLD') reasons.push('conflicting state code')
    if (provider.postcode && a.postcode !== provider.postcode) reasons.push('postcode missing or conflicting')
    // Suburb is more specific than city; do not allow a broad city match to hide a suburb conflict.
    const locality = a.suburb ?? a.town ?? a.village ?? a.locality ?? a.city_district ?? a.city
    if (provider.suburb && canonical(locality) !== canonical(provider.suburb)) reasons.push('locality missing or conflicting')
    if (!road || canonical(a.road) !== road) reasons.push('street missing or conflicting')
    if (number && canonical(a.house_number) !== number) reasons.push('house number missing or conflicting')
    if (reasons.length) rejected.push({ matchedAddress: candidate.matchedAddress, reasons })
    else plausible.push(candidate)
  }
  // Identical responses may be duplicates; distinct coordinates remain ambiguous.
  const unique = [...new Map(plausible.map(c => [`${c.latitude},${c.longitude}`, c])).values()]
  if (unique.length === 1) {
    const { latitude, longitude, matchedAddress } = unique[0]
    return { status: 'matched', latitude, longitude, matchedAddress, precision: number ? 'house-number' : 'street', rejected }
  }
  return { status: unique.length ? 'ambiguous' : 'unmatched',
    reason: unique.length ? 'multiple-plausible-results' : candidates.length ? 'no-consistent-result' : 'no-results',
    plausibleResults: unique.map(({ latitude, longitude, matchedAddress }) => ({ latitude, longitude, matchedAddress })), rejected }
}

export async function loadCache(path, endpoint) {
  let cache
  try { cache = JSON.parse(await readFile(path, 'utf8')) }
  catch (error) {
    if (error.code === 'ENOENT') return { version: 1, endpoint, attribution, entries: {} }
    throw error
  }
  if (cache.version !== 1 || cache.endpoint !== endpoint || !cache.entries || typeof cache.entries !== 'object' || Array.isArray(cache.entries)) {
    throw new Error('Invalid cache or endpoint mismatch; use a separate cache for each endpoint')
  }
  for (const [key, entry] of Object.entries(cache.entries)) {
    if (!entry || typeof entry.normalizedAddress !== 'string' || cacheKey(entry.normalizedAddress) !== key
      || !Number.isFinite(Date.parse(entry.sourceLastChecked)) || !Array.isArray(entry.candidates)) throw new Error('Invalid cache entry')
    // Revalidate persisted evidence before trusting a cache file.
    parseCandidates(entry.candidates.map(c => ({ lat: String(c.latitude), lon: String(c.longitude), display_name: c.matchedAddress, address: c.address })))
  }
  return cache
}

export async function geocodeProviders({ providers, cache, cachePath, outputPath, endpoint = defaultEndpoint,
  userAgent = defaultUserAgent, fetchImpl = fetch, pause = delay, now = () => new Date().toISOString() }) {
  if (!Array.isArray(providers) || providers.some(p => !p || typeof p.id !== 'string' || p.source !== 'qld-play-on'
    || ['address', 'suburb', 'postcode'].some(k => p[k] !== undefined && typeof p[k] !== 'string'))) throw new Error('Invalid Play On dataset')
  const summary = { providers: providers.length, matched: 0, unmatched: 0, ambiguous: 0, error: 0, pending: 0,
    cacheHits: 0, liveRequests: 0, rejectedResults: 0 }
  let failure
  const output = []
  for (const provider of providers) {
    const normalizedAddress = normalizeAddress(provider.address)
    const key = cacheKey(provider.address)
    let entry = cache.entries[key]
    let geocode
    if (!normalizedAddress) geocode = { status: 'unmatched', reason: 'missing-source-address' }
    else if (entry) summary.cacheHits++
    else if (!failure) {
      // Gap after completion, including the first request, also makes immediate reruns conservative.
      await pause(1100)
      const url = new URL(endpoint)
      url.search = new URLSearchParams({ q: provider.address, format: 'jsonv2', addressdetails: '1', countrycodes: 'au', limit: '5', 'accept-language': 'en' }).toString()
      summary.liveRequests++
      try {
        const response = await fetchImpl(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' },
          redirect: 'error', signal: AbortSignal.timeout(30000) })
        if (!response.ok) throw new Error(`HTTP ${response.status}; batch stopped, no automatic retry`)
        entry = { normalizedAddress, sourceLastChecked: now(), candidates: parseCandidates(await response.json()) }
      } catch (error) {
        failure = error.message
        geocode = { status: 'error', reason: failure, sourceLastChecked: now(), retryable: true }
      }
      if (entry) {
        cache.entries[key] = entry
        await writeDataset(cachePath, cache)
      }
    }
    if (entry) geocode = { ...selectResult(provider, entry.candidates), sourceLastChecked: entry.sourceLastChecked }
    geocode ??= { status: 'pending', reason: 'batch-stopped-before-request', retryable: true }
    geocode = { ...geocode, source: 'osm-nominatim', endpoint, addressRole: 'provider-address', attribution }
    output.push({ ...provider, geocode })
    summary[geocode.status]++
    summary.rejectedResults += geocode.rejected?.length ?? 0
  }
  // Partial useful output includes every provider and explicitly marks incomplete attempts.
  await writeDataset(outputPath, output)
  return { summary, failure, output }
}
