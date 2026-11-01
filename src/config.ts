// MapLibre coordinates are [longitude, latitude]. Change these together to
// configure the fallback. Club searches use the resulting map viewport.
export const fallbackLocation = {
  label: 'Brisbane',
  center: [153.0251, -27.4698] as [number, number],
}

export const initialZoom = 11
// Basemap tiles only; club retrieval is configured separately in clubSearch.ts.
export const mapStyle = 'https://tiles.openfreemap.org/styles/bright'
