import ClubMap from './ClubMap'
import { clubs } from './data/clubs'
import { useLocation } from './useLocation'

export default function App() {
  const location = useLocation()

  return (
    <main className="app">
      <header>
        <h1>Youth Sports Finder</h1>
        <label>Sport <select defaultValue="Basketball"><option value="Basketball">Basketball</option></select></label>
      </header>
      <div className="information">
        <p role="status">{location.message}</p>
        <p>Demo: fictional basketball clubs around Brisbane. Pan and zoom to explore; select a marker for details.</p>
      </div>
      {location.pending
        ? <div className="location-loading" aria-label="Waiting for location">Preparing your map…</div>
        : <ClubMap center={location.center} clubs={clubs} />}
    </main>
  )
}
