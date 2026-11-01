import ClubMap from './ClubMap'
import { useClubSearch } from './useClubSearch'
import { useLocation } from './useLocation'

export default function App() {
  const location = useLocation()
  const search = useClubSearch()

  return (
    <main className="app">
      <header>
        <h1>Youth Sports Finder</h1>
        <label>Sport <select defaultValue="Basketball"><option value="Basketball">Basketball</option></select></label>
      </header>
      <div className="information">
        <p role="status">{location.message}</p>
        <p>Basketball club candidates from <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>. Junior programs are not verified.</p>
        <p>Coverage may be incomplete; no results does not mean no clubs exist. Pan and zoom to explore.</p>
      </div>
      {location.pending
        ? <div className="location-loading" aria-label="Waiting for location">Preparing your map…</div>
        : <div className="map-results">
          <ClubMap center={location.center} clubs={search.clubs} onViewportChange={search.onViewportChange} />
          <p className="search-status" role="status">
            {search.status === 'loading' && 'Searching this map area…'}
            {search.status === 'ready' && (search.clubs.length
              ? `${search.clubs.length} basketball club candidates found.`
              : 'No basketball club candidates found in this map area.')}
            {search.status === 'error' && <>Club search is unavailable. You can still pan and zoom. <button type="button" onClick={search.retry}>Retry search</button></>}
          </p>
        </div>}
    </main>
  )
}
