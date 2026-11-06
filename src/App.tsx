import { useCallback, useMemo, useState } from 'react'
import ClubMap from './ClubMap'
import ProviderList from './ProviderList'
import { playOnPilot } from './data/playOn'
import { filterProviders, groupProviderLocations, searchProviders } from './playOnProviders'
import type { ViewportBounds } from './types'
import { useLocation } from './useLocation'

const providers = playOnPilot.dataset?.providers ?? []
const mappedProviders = providers.filter(provider => provider.mapPoint).length
const mappedLocations = groupProviderLocations(providers).length

export default function App() {
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [bounds, setBounds] = useState<ViewportBounds>()
  const [onlyInView, setOnlyInView] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<{ providerId: string }>()
  const [focusRequest, setFocusRequest] = useState<{ providerId: string }>()
  const groups = useMemo(() => groupProviderLocations(searchProviders(providers, query)), [query])
  const results = filterProviders(providers, query, onlyInView, bounds)
  const selectProvider = useCallback((id: string) => {
    setOnlyInView(false)
    setSelectedProvider({ providerId: id })
  }, [])
  const clearFilters = () => { setQuery(''); setOnlyInView(false) }

  return (
    <main className="app">
      <header>
        <h1>Youth Sports Finder</h1>
        <label>Sport <select defaultValue="Basketball"><option value="Basketball">Basketball</option></select></label>
      </header>
      <div className="information">
        <p role="status">{location.message}</p>
        <p>Fixed Queensland Play On Basketball sample: Algester / postcode 4115, directory search radius 25 km. This is not live discovery or a complete directory of clubs.</p>
        <p>Pins show listed provider addresses (property centroids), <strong>not verified training or game venues</strong>. Junior programs and availability are not verified.</p>
        {playOnPilot.dataset && <p className="source-note">{playOnPilot.dataset.attribution}. Address validation: {playOnPilot.dataset.validatedOn}; government check date unknown.</p>}
      </div>
      <div className="map-results">
        {location.pending
          ? <div className="location-loading" aria-label="Waiting for location">Preparing your map…</div>
          : <ClubMap center={location.center} groups={groups} onViewportChange={setBounds}
            onSelectProvider={selectProvider} focusRequest={focusRequest} />}
        <section className="provider-panel" aria-label="Provider directory">
          <h2>Play On providers</h2>
          {playOnPilot.error ? <p role="alert">{playOnPilot.error}</p> : <>
            <p>{providers.length} providers in the pilot sample. {mappedProviders} providers have accepted address points at {mappedLocations} mapped locations; {providers.length - mappedProviders} are list-only.</p>
            <label htmlFor="provider-search">Search name, suburb or postcode</label>
            <input id="provider-search" type="search" value={query} onChange={event => setQuery(event.target.value)} />
            <label className="viewport-option"><input type="checkbox" checked={onlyInView} disabled={!bounds}
              onChange={event => setOnlyInView(event.target.checked)} />Only in current map view</label>
            {!bounds && <p>Map-view filtering is available when map bounds are ready.</p>}
            {onlyInView
              ? <p>Filtering this fixed sample by map bounds. Unverified map locations are excluded from this view only. <button type="button" onClick={() => setOnlyInView(false)}>All providers</button></p>
              : <p>The complete list stays available as you pan and zoom.</p>}
            <p role="status">{results.length} matching providers</p>
            {(query || onlyInView) && <button type="button" onClick={clearFilters}>Clear filters</button>}
            {!results.length && <p>{onlyInView
              ? 'No providers match in the current map view. Turn off the map filter to include list-only and out-of-view providers.'
              : 'No providers match this text search. Clear filters to see the complete list.'}</p>}
            <ProviderList providers={results} selectedProvider={selectedProvider} onShowAddress={providerId => setFocusRequest({ providerId })} />
          </>}
        </section>
      </div>
    </main>
  )
}
