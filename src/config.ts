// MapLibre coordinates are [longitude, latitude]. Change these together to
// configure the fallback. Fixtures remain at their fictional Brisbane sites.
export const fallbackLocation = {
  label: 'Brisbane',
  center: [153.0251, -27.4698] as [number, number],
}

export const initialZoom = 11
// Basemap tiles only; club data is local and no search API is used.
export const mapStyle = 'https://tiles.openfreemap.org/styles/bright'
