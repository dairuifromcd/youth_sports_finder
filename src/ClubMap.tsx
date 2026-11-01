import { useEffect, useRef, useState } from 'react'
import { Map, Marker, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { initialZoom, mapStyle } from './config'
import type { Club, ViewportBounds } from './types'

setWorkerUrl(workerUrl)

function clubPopup(club: Club): HTMLElement {
  const content = document.createElement('div')
  const heading = document.createElement('h2')
  heading.textContent = club.name
  content.append(heading)
  if (club.address) {
    const address = document.createElement('p')
    address.textContent = club.address
    content.append(address)
  }
  const program = document.createElement('p')
  program.textContent = `Junior program: ${club.juniorProgram === null ? 'Not verified' : club.juniorProgram ? 'Yes' : 'No'}`
  content.append(program)
  if (club.website) {
    const link = document.createElement('a')
    link.href = club.website
    link.textContent = 'Website'
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    content.append(link)
  }
  return content
}

interface ClubMapProps {
  /** Initial center only; subsequent renders preserve the user's viewport. */
  center: [number, number]
  clubs: Club[]
  onViewportChange?: (bounds: ViewportBounds) => void
}

export default function ClubMap({ center, clubs, onViewportChange }: ClubMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const initialCenter = useRef(center)
  const viewportCallback = useRef(onViewportChange)
  const [status, setStatus] = useState('Loading map…')

  useEffect(() => {
    viewportCallback.current = onViewportChange
  }, [onViewportChange])

  useEffect(() => {
    if (!container.current) return
    let map: Map
    try {
      map = new Map({ container: container.current, style: mapStyle, center: initialCenter.current, zoom: initialZoom })
    } catch {
      setStatus('The map could not start. Please use a browser with WebGL enabled.')
      return
    }
    mapRef.current = map
    map.addControl(new NavigationControl(), 'top-right')
    map.on('load', () => setStatus(''))
    map.on('error', () => setStatus('Some map content could not load. Check your connection and reload.'))

    const observer = new ResizeObserver(() => map.resize())
    observer.observe(container.current)
    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const reportViewport = () => {
      const bounds = map.getBounds()
      viewportCallback.current?.({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      })
    }
    map.on('moveend', reportViewport)
    // Supply initial bounds too, so a future search can populate the first view.
    reportViewport()
    return () => { map.off('moveend', reportViewport) }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // MapLibre positions and clips these markers as the viewport changes.
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
    return () => {
      markers.forEach((marker) => marker.remove())
    }
  }, [clubs])

  return (
    <section className="map-area" aria-label="Basketball club map">
      <div className="map" ref={container} />
      {status && <p className="map-status" role="status">{status}</p>}
    </section>
  )
}
