import { useEffect, useState } from 'react'
import { fallbackLocation } from './config'

type LocationState = {
  center: [number, number]
  pending: boolean
  message: string
}

export function useLocation(): LocationState {
  const [location, setLocation] = useState<LocationState>({
    center: fallbackLocation.center,
    pending: true,
    message: 'Finding your location…',
  })

  useEffect(() => {
    let active = true
    const fallback = (reason: string) => {
      if (active) setLocation({
        center: fallbackLocation.center,
        pending: false,
        message: `${reason} Showing ${fallbackLocation.label}; you can still pan and zoom.`,
      })
    }

    if (!navigator.geolocation) {
      fallback('Geolocation is unavailable in this browser.')
    } else {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (active) setLocation({
            center: [coords.longitude, coords.latitude],
            pending: false,
            message: 'Map centered near your location.',
          })
        },
        (error) => fallback(error.code === 1
          ? 'Location permission was denied.'
          : error.code === 3 ? 'Location request timed out.' : 'Your location could not be determined.'),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      )
    }
    return () => { active = false }
  }, [])

  return location
}
