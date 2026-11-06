import type { ViewportBounds } from './types'

export interface ProviderPoint {
  latitude: number
  longitude: number
  precision: 'property-centroid'
}

export interface PlayOnProvider {
  id: string
  name: string
  activities: string[]
  address?: string
  suburb?: string
  postcode?: string
  source: 'qld-play-on'
  sourceUrl?: string
  sourceLastChecked: string
  mapPoint?: ProviderPoint
}

export interface ProviderLocation extends ProviderPoint {
  id: string
  providers: PlayOnProvider[]
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredText(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Missing provider data')
  return value
}

function optionalText(value: unknown): string | undefined {
  return value === undefined ? undefined : requiredText(value)
}

export function safeSourceUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined
  } catch {
    return undefined
  }
}

function validPoint(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === 'number' && typeof longitude === 'number' &&
    Number.isFinite(latitude) && Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
}

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0

/** Consume selected Stage B fields only. Raw evidence and Nominatim never enter the view model. */
export function adaptPlayOnDataset(data: unknown) {
  if (!record(data) || data.version !== 1 || !Array.isArray(data.providers) || !data.providers.length ||
    !record(data.provenance) || data.provenance.source !== 'qld-government-geocoder' ||
    data.provenance.addressRole !== 'provider-address') throw new Error('Invalid Play On dataset')
  const validatedOn = requiredText(data.provenance.validatedOn)
  const attribution = requiredText(data.provenance.attribution)
  const ids = new Set<string>()
  const providers: PlayOnProvider[] = data.providers.map((item: unknown) => {
    if (!record(item) || item.source !== 'qld-play-on' || !record(item.qldGeocode) ||
      !Array.isArray(item.activities) || !item.activities.includes('Basketball') ||
      !item.activities.every(activity => typeof activity === 'string' && activity.trim())) {
      throw new Error('Invalid provider record')
    }
    const id = requiredText(item.id)
    if (ids.has(id)) throw new Error(`Duplicate provider ID: ${id}`)
    ids.add(id)
    const geocode = item.qldGeocode
    if (!['accepted', 'ambiguous', 'needs-review', 'rejected', 'unmatched'].includes(String(geocode.status)) ||
      geocode.source !== 'qld-government-geocoder' || geocode.addressRole !== 'provider-address') {
      throw new Error(`Invalid geocode record: ${id}`)
    }
    let mapPoint: ProviderPoint | undefined
    if (geocode.status === 'accepted') {
      if (!validPoint(geocode.latitude, geocode.longitude) || geocode.precision !== 'property-centroid') {
        throw new Error(`Invalid accepted provider point: ${id}`)
      }
      mapPoint = {
        latitude: geocode.latitude as number,
        longitude: geocode.longitude as number,
        precision: geocode.precision,
      }
    }
    return {
      id, name: requiredText(item.name), activities: [...item.activities] as string[],
      address: optionalText(item.address), suburb: optionalText(item.suburb), postcode: optionalText(item.postcode),
      source: 'qld-play-on', sourceUrl: safeSourceUrl(item.sourceUrl),
      sourceLastChecked: requiredText(item.sourceLastChecked), mapPoint,
    }
  })
  providers.sort((a, b) => compare(normalize(a.name), normalize(b.name)) || compare(a.id, b.id))
  return { providers, validatedOn, attribution }
}

/** Inclusive bounds, including MapLibre's unwrapped longitudes and antimeridian bounds. */
export function pointInBounds(point: ProviderPoint, bounds: ViewportBounds): boolean {
  const { west, south, east, north } = bounds
  if (!validPoint(point.latitude, point.longitude) || ![west, south, east, north].every(Number.isFinite) ||
    south < -90 || north > 90 || south > north || point.latitude < south || point.latitude > north) return false
  if (Math.abs(east - west) >= 360) return true
  const span = ((east - west) % 360 + 360) % 360
  const offset = ((point.longitude - west) % 360 + 360) % 360
  // Longitude wrapping can introduce tiny rounding differences at an edge.
  const epsilon = 1e-9
  return offset <= span + epsilon || 360 - offset <= epsilon
}

export function searchProviders(providers: PlayOnProvider[], query: string): PlayOnProvider[] {
  const search = normalize(query)
  return providers.filter(provider => normalize([provider.name, provider.suburb, provider.postcode].filter(Boolean).join(' ')).includes(search))
}

export function filterProviders(providers: PlayOnProvider[], query: string, onlyInView = false, bounds?: ViewportBounds): PlayOnProvider[] {
  return searchProviders(providers, query).filter(provider => !onlyInView ||
    (provider.mapPoint !== undefined && bounds !== undefined && pointInBounds(provider.mapPoint, bounds)))
}

/** Exact selected coordinates group overlapping pins, never provider identities. */
export function groupProviderLocations(providers: PlayOnProvider[]): ProviderLocation[] {
  const groups = new Map<string, ProviderLocation>()
  for (const provider of providers) {
    const point = provider.mapPoint
    if (!point) continue
    const id = `${point.latitude},${point.longitude}`
    const group = groups.get(id)
    if (group) group.providers.push(provider)
    else groups.set(id, { ...point, id, providers: [provider] })
  }
  return [...groups.values()]
}
