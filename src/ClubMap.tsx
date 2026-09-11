import { useEffect, useRef, useState } from 'react'
import { Map, Marker, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { initialZoom, mapStyle } from './config'
import type { Club } from './types'

setWorkerUrl(workerUrl)

function clubPopup(club: Club): HTMLElement {
  const content = document.createElement('div')
  const heading = document.createElement('h2')
  heading.textContent = club.name
  const address = document.createElement('p')
  address.textContent = club.address
  const program = document.createElement('p')
  program.textContent = `Junior program: ${club.juniorProgram ? 'Yes' : 'No'}`
  content.append(heading, address, program)
  if (club.website) {
    const link = document.createElement('a')
    link.href = club.website
    link.textContent = 'Website (fictional example)'
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    content.append(link)
  }
  return content
}

export default function ClubMap({ center, clubs }: { center: [number, number]; clubs: Club[] }) {
  const container = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('Loading map…')

  useEffect(() => {
    if (!container.current) return
    let map: Map
    try {
      map = new Map({ container: container.current, style: mapStyle, center, zoom: initialZoom })
    } catch {
      setStatus('The map could not start. Please use a browser with WebGL enabled.')
      return
    }
    map.addControl(new NavigationControl(), 'top-right')
    map.on('load', () => setStatus(''))
    map.on('error', () => setStatus('Some map content could not load. Check your connection and reload.'))

    // MapLibre positions and clips these markers as the viewport changes.
    // Data is passed in so a later task can supply viewport-based results.
    const markers = clubs.map((club) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'club-marker'
      button.setAttribute('aria-label', `View ${club.name}`)
      button.textContent = '●'
      return new Marker({ element: button })
        .setLngLat([club.longitude, club.latitude])
        .setPopup(new Popup({ offset: 18, maxWidth: '280px' }).setDOMContent(clubPopup(club)))
        .addTo(map)
    })
    const observer = new ResizeObserver(() => map.resize())
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      markers.forEach((marker) => marker.remove())
      map.remove()
    }
  }, [center, clubs])

  return (
    <section className="map-area" aria-label="Basketball club map">
      <div className="map" ref={container} />
      {status && <p className="map-status" role="status">{status}</p>}
    </section>
  )
}
