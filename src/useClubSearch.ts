import { useCallback, useEffect, useState } from 'react'
import { clubSearchQuery, searchClubs } from './clubSearch'
import type { Club, ViewportBounds } from './types'

export function useClubSearch() {
  const [query, setQuery] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [clubs, setClubs] = useState<Club[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const onViewportChange = useCallback((bounds: ViewportBounds) => {
    // Identical queries leave state unchanged, including duplicate initial events.
    setQuery(clubSearchQuery(bounds))
  }, [])

  useEffect(() => {
    if (!query) return
    let active = true
    const controller = new AbortController()
    setClubs([])
    setStatus('loading')
    // Coalesce initial resize/moveend bursts and rapid consecutive gestures.
    const delay = setTimeout(() => {
      void searchClubs(query, controller.signal).then((results) => {
        if (active) {
          setClubs(results)
          setStatus('ready')
        }
      }).catch(() => {
        if (active) setStatus('error')
      }).finally(() => clearTimeout(timeout))
    }, 250)
    const timeout = setTimeout(() => controller.abort(), 30000)
    return () => {
      active = false
      clearTimeout(delay)
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query, attempt])

  return { clubs, status, onViewportChange, retry: () => setAttempt(value => value + 1) }
}
