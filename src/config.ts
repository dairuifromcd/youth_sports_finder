// MapLibre coordinates are [longitude, latitude]. Change these together to
// configure the fallback. The pilot list is independent of the initial location.
export const fallbackLocation = {
  label: 'Brisbane',
  center: [153.0251, -27.4698] as [number, number],
}

export const initialZoom = 11
// A view of the SWM pilot area, not an Association boundary.
export const pilotBounds: [[number, number], [number, number]] = [[152.77, -27.84], [153.29, -27.38]]
// Basemap tiles only; SWM club and venue records are generated locally.
export const mapStyle = 'https://tiles.openfreemap.org/styles/bright'
