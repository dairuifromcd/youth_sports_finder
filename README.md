# Youth Sports Finder

TASK-001: a React + TypeScript + Vite map with fictional youth basketball clubs.

## Run locally

Use Node.js 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. Geolocation requires localhost or HTTPS.
Allow location access to center near your location; denial, timeout, or unavailable
geolocation falls back to Brisbane. The request times out after 10 seconds.

```sh
npm run check
npm run lint
npm run build
npm run preview
```

## Configuration and fixture data

- `src/config.ts`: fallback center/name, initial zoom, and basemap style.
- `src/data/clubs.ts`: nine fictional clubs in and around Brisbane; websites use
  reserved example.com placeholder URLs. Users elsewhere must pan to Brisbane to
  see this fixed dataset.
- `src/ClubMap.tsx`: MapLibre markers and popups, supplied with club records as props.

The OpenFreeMap basemap requires an internet connection. Its map attribution is
displayed by MapLibre. There are no real club searches or club data APIs, backend,
database, or provider layer.

## Browser checks

1. Deny location permission: verify the fallback message and Brisbane map.
2. Select Basketball and open a marker: verify name, address, junior program, and
   website when present. All fixtures explicitly represent junior clubs.
3. Pan and zoom: markers stay attached to their coordinates; zooming out reveals
   the outer Brisbane-area fixtures.
4. Allow location (or emulate coordinates): verify the initial center follows it.
5. Simulate unavailable geolocation or a timeout: the fallback remains usable.
6. Check a narrow viewport and keyboard access to the selector and markers.
