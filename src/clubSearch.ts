import type { Club, ViewportBounds } from './types'

export const overpassEndpoint = 'https://overpass-api.de/api/interpreter'

export function clubSearchQuery(bounds: ViewportBounds): string {
  const { west, south, east, north } = bounds
  if (![west, south, east, north].every(Number.isFinite) || north < south || east < west) {
    throw new Error('Invalid viewport bounds')
  }
  const wrap = (longitude: number) => ((longitude + 180) % 360 + 360) % 360 - 180
  // Overpass accepts west > east for a viewport crossing the antimeridian.
  const fullWorld = east - west >= 360
  const bbox = [Math.max(-90, south), fullWorld ? -180 : wrap(west),
    Math.min(90, north), fullWorld ? 180 : wrap(east)].join(',')
  const basketball = '["sport"~"(^|;)basketball(;|$)"]["name"]["leisure"!="pitch"]'
  return `[out:json][timeout:25];(
    nwr["club"="sport"]${basketball}(${bbox});
    nwr["leisure"~"^(sports_centre|sports_hall)$"]${basketball}(${bbox});
  );out center tags;`
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function website(value: unknown): string | undefined {
  const candidate = text(value)
  if (!candidate) return undefined
  try {
    const url = new URL(candidate)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}

export function mapClubResults(data: unknown): Club[] {
  if (!record(data) || !Array.isArray(data.elements) || data.remark) {
    // Overpass may return HTTP 200 with a timeout remark and partial results.
    throw new Error('Incomplete or invalid Overpass response')
  }
  const clubs = new Map<string, Club>()
  for (const element of data.elements) {
    if (!record(element) || !record(element.tags)) continue
    const tags = element.tags
    const name = text(tags.name)
    const sport = text(tags.sport)
    const isClub = tags.club === 'sport'
    const isCentre = tags.leisure === 'sports_centre' || tags.leisure === 'sports_hall'
    if ((!isClub && !isCentre) || tags.leisure === 'pitch' || !sport?.split(';').includes('basketball') || !name) continue
    if (/^(basketball|(?:(?:basketball|undercover|covered|indoor|outdoor|public) )*courts?|sports? cent(?:re|er)|sports? hall|[a-z0-9]+ block|block [a-z0-9]+)$/i.test(name)) continue
    if (!['node', 'way', 'relation'].includes(String(element.type)) || !Number.isSafeInteger(element.id)) continue
    const coordinates = element.type === 'node' ? element : element.center
    if (!record(coordinates)) continue
    const { lat, lon } = coordinates
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue
    const street = [text(tags['addr:housenumber']), text(tags['addr:street'])].filter(Boolean).join(' ')
    const address = text(tags['addr:full']) || [street, text(tags['addr:suburb']), text(tags['addr:city']), text(tags['addr:postcode'])].filter(Boolean).join(',') || undefined
    const id = `osm:${element.type}/${element.id}`
    clubs.set(id, {
      id, name, sport: 'Basketball', latitude: lat, longitude: lon, address,
      juniorProgram: null,
      website: website(tags.website) || website(tags['contact:website']),
    })
  }
  return [...clubs.values()]
}

export async function searchClubs(query: string, signal: AbortSignal): Promise<Club[]> {
  const response = await fetch(`${overpassEndpoint}?${new URLSearchParams({ data: query })}`, { signal })
  if (!response.ok) throw new Error(`Overpass request failed (${response.status})`)
  return mapClubResults(await response.json())
}
