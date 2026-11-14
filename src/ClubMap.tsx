import { useEffect, useRef, useState } from 'react'
import { Map, Marker, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { initialZoom, mapStyle, pilotBounds } from './config'
import { keepProviderPopupInView } from './providerPopup'
import type { TrainingLocation } from './pilot'
import { safeSourceUrl } from './pilot'
import type { ViewportBounds } from './types'

setWorkerUrl(workerUrl)

function providerPopup(group: TrainingLocation, onSelect: (id: string) => void): HTMLElement {
  const content = document.createElement('div')
  content.className = 'provider-popup-body'
  const addText = (tag: string, text: string) => {
    const element = document.createElement(tag)
    element.textContent = text
    content.append(element)
  }
  const addLink = (text: string, url: string) => {
    const href = safeSourceUrl(url)
    if (!href) return
    const link = document.createElement('a')
    link.textContent = text
    link.href = href
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    content.append(link)
  }
  for (const venue of group.venues) {
    addText('h2', venue.name)
    addText('p', venue.address)
    addText('p', `${venue.coordinates?.precision.replaceAll('_', ' ')} · ${venue.coordinates?.source}. Approximate location; not a hall entrance.`)
    if (venue.coordinates) addLink('Coordinate source', venue.coordinates.sourceUrl)
  }
  addText('p', 'Confirmed regular training for:')
  const list = document.createElement('ul')
  for (const club of group.clubs) {
    const entry = document.createElement('li')
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = club.name
    button.addEventListener('click', () => onSelect(club.id))
    entry.append(button)
    if (club.eligibilityNote) {
      const note = document.createElement('p')
      note.textContent = club.eligibilityNote
      entry.append(note)
    }
    list.append(entry)
  }
  content.append(list)
  for (const relation of group.relationships) addLink('Training source', relation.sourceUrl)
  return content
}

interface ClubMapProps {
  /** Initial center only; subsequent renders preserve the user's viewport. */
  center: [number, number]
  groups: TrainingLocation[]
  onViewportChange?: (bounds: ViewportBounds) => void
  onSelectClub: (id: string) => void
  focusRequest?: { venueId: string }
}

export default function ClubMap({ center, groups, onViewportChange, onSelectClub, focusRequest }: ClubMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const initialCenter = useRef(center)
  const viewportCallback = useRef(onViewportChange)
  const selectionCallback = useRef(onSelectClub)
  const providerMarkers = useRef<globalThis.Map<string, Marker>>(new globalThis.Map())
  const [status, setStatus] = useState('Loading map…')

  useEffect(() => {
    viewportCallback.current = onViewportChange
  }, [onViewportChange])

  useEffect(() => {
    selectionCallback.current = onSelectClub
  }, [onSelectClub])

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
    // Report real initial and moveend bounds for the optional local list filter.
    reportViewport()
    return () => { map.off('moveend', reportViewport) }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // MapLibre positions and clips these markers as the viewport changes.
    const markers = groups.map((group) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'club-marker'
      button.setAttribute('aria-label', `View training venue: ${group.venues.map(venue => venue.name).join(', ')}; ${group.clubs.length} clubs`)
      button.textContent = group.clubs.length === 1 ? '●' : String(group.clubs.length)
      const popup = new Popup({ anchor: 'bottom', offset: 18, maxWidth: '320px',
        className: 'provider-popup', focusAfterOpen: false })
        .setDOMContent(providerPopup(group, id => selectionCallback.current(id)))
      const marker = new Marker({ element: button })
        .setLngLat([group.longitude, group.latitude])
        .setPopup(popup)
        .addTo(map)
      // Cancel native button activation/keypress replay after focus moves into the popup.
      button.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        event.stopPropagation()
        marker.togglePopup()
      })
      keepProviderPopupInView(map, popup, button)
      group.venues.forEach(venue => providerMarkers.current.set(venue.id, marker))
      return marker
    })
    const registry = providerMarkers.current
    return () => {
      markers.forEach((marker) => marker.remove())
      registry.clear()
    }
  }, [groups])

  useEffect(() => {
    if (!focusRequest) return
    const map = mapRef.current
    const marker = providerMarkers.current.get(focusRequest.venueId)
    if (!map || !marker) return
    const { lng, lat } = marker.getLngLat()
    // Focus the nearest world copy if the user has panned across the dateline.
    const longitude = lng + 360 * Math.round((map.getCenter().lng - lng) / 360)
    container.current?.closest('section')?.scrollIntoView({ block: 'nearest' })
    map.easeTo({ center: [longitude, lat], zoom: Math.max(map.getZoom(), 13) })
    marker.getPopup()?.setLngLat([longitude, lat]).addTo(map)
  }, [focusRequest])

  return (
    <section className="map-area" aria-label="SWM regular training venue map">
      <div className="map-toolbar">
        <button type="button" className="pilot-area-button" onClick={() => mapRef.current?.fitBounds(pilotBounds, { padding: 35 })}>View SWM pilot area</button>
      </div>
      <div className="map-surface">
        <div className="map" ref={container} />
        {status && <p className="map-status" role="status">{status}</p>}
      </div>
    </section>
  )
}
