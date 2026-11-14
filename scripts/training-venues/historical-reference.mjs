import { sha256 } from '../qld-geocoder/export.mjs'

export const historicalSnapshotPath = 'output/workflow/2026-11-13/training-venue-coverage-phase2c/baseline/venue-geocoding-results.json'
export const historicalGeocodingSha256 = '89f3a14af91d1396f16b1a1663b6066301474b6f62beacfaba8eee69b069577d'

/** TS-free Phase 2A replay: retain its original reviewed reference semantics.
 * The production command independently rebuilds and proves these same bytes. */
export function frozenHistoricalReader(read) {
  return path => {
    if (path !== 'data/benchmarks/training-venue-geocoding/venue-geocoding-results.json') return read(path)
    const bytes = read(historicalSnapshotPath)
    if (sha256(bytes) !== historicalGeocodingSha256) throw new Error('Historical snapshot SHA-256 drift')
    return bytes
  }
}
