import { useCallback, useEffect, useMemo, useState } from 'react'
import { SourceLink } from './SourceLink'
import ClubMap from './ClubMap'
import { confirmedVenues, parsePilot, searchPilot, trainingLocations } from './pilot'
import type { Pilot } from './pilot'

export default function App() {
  const [pilot, setPilot] = useState<Pilot>()
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedClub, setSelectedClub] = useState<string>()
  const [focusRequest, setFocusRequest] = useState<{ venueId: string }>()
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/v2/pilot.json`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
          throw new Error('SWM pilot data is unavailable. Run npm run pipeline:swm, then reload.')
        }
        return response.json()
      })
      .then(data => setPilot(parsePilot(data)))
      .catch((reason: Error) => { if (reason.name !== 'AbortError') setError(reason.message) })
    return () => controller.abort()
  }, [])
  const results = useMemo(() => pilot ? searchPilot(pilot, query) : [], [pilot, query])
  // Shared-venue popups retain all associated clubs during a club-name search.
  const allLocations = useMemo(() => pilot ? trainingLocations(pilot) : [], [pilot])
  const groups = useMemo(() => allLocations.filter(group => group.clubs.some(club => results.some(result => result.id === club.id))), [allLocations, results])
  const selectClub = useCallback((id: string) => { setQuery(''); setSelectedClub(id) }, [])
  useEffect(() => {
    if (!selectedClub) return
    const entry = document.getElementById(selectedClub)
    entry?.scrollIntoView({ block: 'nearest' })
    entry?.focus({ preventScroll: true })
  }, [selectedClub])
  const mappedClubs = new Set(allLocations.flatMap(group => group.clubs.map(club => club.id))).size

  return <main className="app">
    <header><div><p className="eyebrow">BASKETBALL · GREATER BRISBANE</p><h1>Youth Sports Finder</h1></div><span className="pilot-badge">SWM Pirates Pilot</span></header>
    <div className="information">
      <p>Find affiliated junior clubs and their <strong>confirmed regular training venues</strong>.</p>
      <p>Checked: {pilot?.summary.checkedAt.slice(0, 10) ?? 'Loading…'}. School/campus and property points are approximate, not hall entrances. Confirm arrangements with the club.</p>
      <p className="source-note">Coverage is incomplete. Clubs without verified locations stay in the list. {pilot?.summary.gnafStatus && `G-NAF: ${pilot.summary.gnafStatus}. `}<SourceLink url={pilot?.associations[0]?.sourceUrl}>Official junior club directory</SourceLink></p>
      {pilot?.summary.coordinateAttribution && <p className="source-note">{pilot.summary.coordinateAttribution}</p>}
    </div>
    {error ? <p role="alert" className="data-error">{error}</p> : !pilot ? <p role="status" className="location-loading">Loading SWM club directory…</p> :
      <div className="map-results">
        <ClubMap center={[153.065, -27.595]} groups={groups} onSelectClub={selectClub} focusRequest={focusRequest} />
        <section className="provider-panel" aria-label="SWM affiliated junior clubs">
          <h2>Affiliated junior clubs</h2>
          <p>{pilot.clubs.length} clubs · {allLocations.length} training locations · {pilot.clubs.length - mappedClubs} clubs awaiting verified locations</p>
          <label htmlFor="club-search">Search club, venue or suburb</label>
          <input id="club-search" type="search" placeholder="Try Rockets or Runcorn" value={query} onChange={event => setQuery(event.target.value)} />
          <p role="status">{results.length} matching clubs</p>
          {query && <button className="text-button" type="button" onClick={() => setQuery('')}>Clear search</button>}
          {!allLocations.length && <p className="empty-state">No reliably located training venues yet. The club directory remains available.</p>}
          {!results.length && <p>No clubs match. Clear search to see all affiliated clubs.</p>}
          <ul className="provider-list" aria-label="Junior clubs">
            {results.map(club => {
              const venues = confirmedVenues(pilot, club.id)
              return <li key={club.id} id={club.id} tabIndex={-1} className={`provider-entry${selectedClub === club.id ? ' selected' : ''}`}>
                <h3>{club.name}</h3>
                {club.eligibilityNote && <p className="eligibility-note">{club.eligibilityNote}</p>}
                {!venues.length && <p className="mapping-state">Regular training venue not yet verified. Contact the club for current arrangements.</p>}
                {venues.map(venue => {
                  const mapped = allLocations.some(group => group.venues.some(item => item.id === venue.id))
                  const relation = pilot.clubVenues.find(item => item.clubId === club.id && item.venueId === venue.id && item.evidenceStatus === 'confirmed_regular')
                  return <div className="training-venue" key={venue.id}>
                    <p><strong>{venue.name}</strong></p><p>{venue.address || 'Address awaiting verification'}</p>
                    <p className="mapping-state">{mapped ? `${venue.coordinates?.precision.replaceAll('_', ' ')} · ${venue.coordinates?.source}` : 'Confirmed training · location awaiting verification'}</p>
                    {mapped && <button className="show-venue" type="button" onClick={() => setFocusRequest({ venueId: venue.id })}>Show training venue on map</button>}
                    <SourceLink url={relation?.sourceUrl}>Training source</SourceLink>
                    {venue.coordinates && <SourceLink url={venue.coordinates.sourceUrl}>Coordinate source</SourceLink>}
                  </div>
                })}
                <div className="provider-links"><SourceLink url={club.website}>Club information</SourceLink><SourceLink url={club.sourceUrl}>Association affiliation</SourceLink></div>
              </li>
            })}
          </ul>
        </section>
      </div>}
  </main>
}
