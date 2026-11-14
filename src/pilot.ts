export interface PilotClub {
  id: string
  name: string
  associationId: string
  website?: string | null
  sourceUrl: string
  checkedAt: string
  eligibilityNote?: string | null
}
export interface PilotVenue {
  id: string
  name: string
  address: string
  suburb?: string
  coordinates?: {
    longitude: number
    latitude: number
    source: string
    sourceUrl: string
    precision: string
    matchedAddress?: string
  } | null
}
export interface ClubVenue {
  id: string
  clubId: string
  venueId: string
  activityType: string
  evidenceStatus: string
  sourceUrl: string
  sourceDate?: string | null
  checkedAt: string
}
export interface Pilot {
  associations: { id: string; name: string; sourceUrl: string }[]
  clubs: PilotClub[]
  venues: PilotVenue[]
  clubVenues: ClubVenue[]
  summary: { checkedAt: string; gnafStatus?: string; coordinateAttribution?: string }
}
export interface TrainingLocation {
  id: string
  longitude: number
  latitude: number
  venues: PilotVenue[]
  clubs: PilotClub[]
  relationships: ClubVenue[]
}
export function safeSourceUrl(value?: string | null): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined
  } catch { return undefined }
}
export function confirmedVenues(pilot: Pilot, clubId: string): PilotVenue[] {
  const ids = new Set(pilot.clubVenues.filter(relation => relation.clubId === clubId &&
    relation.evidenceStatus === 'confirmed_regular' && relation.activityType === 'regular_team_training').map(relation => relation.venueId))
  return pilot.venues.filter(venue => ids.has(venue.id))
}
export function trainingLocations(pilot: Pilot, clubs = pilot.clubs): TrainingLocation[] {
  const groups = new Map<string, TrainingLocation>()
  for (const club of clubs) {
    for (const venue of confirmedVenues(pilot, club.id)) {
      const point = venue.coordinates
      if (!point || !Number.isFinite(point.longitude) || !Number.isFinite(point.latitude) ||
        point.longitude < 138 || point.longitude > 154 || point.latitude < -29.2 || point.latitude > -9 ||
        !point.precision || !safeSourceUrl(point.sourceUrl)) continue
      const key = `${point.longitude},${point.latitude}`
      const group = groups.get(key) ?? { id: venue.id, longitude: point.longitude, latitude: point.latitude,
        venues: [], clubs: [], relationships: [] }
      if (!group.venues.some(item => item.id === venue.id)) group.venues.push(venue)
      if (!group.clubs.some(item => item.id === club.id)) group.clubs.push(club)
      for (const relation of pilot.clubVenues.filter(item => item.clubId === club.id && item.venueId === venue.id &&
        item.evidenceStatus === 'confirmed_regular' && item.activityType === 'regular_team_training')) {
        if (!group.relationships.some(item => item.id === relation.id)) group.relationships.push(relation)
      }
      groups.set(key, group)
    }
  }
  return [...groups.values()]
}
export function searchPilot(pilot: Pilot, query: string): PilotClub[] {
  const text = query.trim().toLocaleLowerCase()
  return pilot.clubs.filter(club => [club.name, ...confirmedVenues(pilot, club.id)
    .flatMap(venue => [venue.name, venue.address, venue.suburb ?? ''])]
    .some(value => value.toLocaleLowerCase().includes(text)))
}
export function parsePilot(value: unknown): Pilot {
  const pilot = value as Pilot
  if (!pilot || !Array.isArray(pilot.associations) || !Array.isArray(pilot.clubs) ||
    !Array.isArray(pilot.venues) || !Array.isArray(pilot.clubVenues) || !pilot.summary?.checkedAt ||
    pilot.clubs.some(club => !club.id || !club.name || !club.sourceUrl) ||
    pilot.venues.some(venue => !venue.id || !venue.name || typeof venue.address !== 'string')) {
    throw new Error('The SWM pilot data could not be read. Rebuild it with the local pipeline.')
  }
  return pilot
}
