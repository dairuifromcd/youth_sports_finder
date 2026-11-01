# Youth Sports Finder

A React + TypeScript + Vite map for discovering basketball club candidates from OpenStreetMap in the current viewport. Junior programs are not verified.

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
npm test
npm run build
npm run preview
```

## Configuration and club data

- `src/config.ts`: fallback center/name, initial zoom, and basemap style.
- `src/clubSearch.ts`: Overpass endpoint, bounding-box query, and result mapping.
- `src/useClubSearch.ts`: viewport request control, cancellation, and search state.
- `src/data/clubs.ts`: historical fictional fixtures; not used by the app.
- `src/ClubMap.tsx`: MapLibre markers and popups, supplied with club records as props.

The OpenFreeMap basemap and Overpass search require an internet connection. The
query includes named `club=sport` organisations and named `leisure=sports_centre`
or `leisure=sports_hall` venues with `basketball` in their `sport` tag. It excludes
`leisure=pitch`; generic venue names are also filtered. OSM coverage is incomplete,
and facilities are candidates, not verified youth clubs. Public Overpass is a
prototype service, not a production-scale dependency. No backend or database is used.

## Browser checks

1. Deny location permission: verify the fallback message and Brisbane map.
2. Open a result marker: verify its name, available address/website, and
   `Junior program: Not verified`.
3. Pan and zoom: each completed viewport change searches again; markers update
   while the map retains its center and zoom.
4. Allow location (or emulate coordinates): verify the initial center follows it.
5. Simulate unavailable geolocation or a timeout: the fallback remains usable.
6. Check a narrow viewport and keyboard access to the selector and markers.
7. Verify loading, empty results, and request failure/retry without losing map interaction.

`npm test` uses Node's built-in test runner and TypeScript stripping (Node 22.12+)
to test query construction, response mapping, and request errors without network calls.

## Play On ingestion proof of concept

Run manually with Node 22.12+ after `npm install`:

```sh
npm run ingest:playon
```

This writes `data/playon/4115-basketball.json` and prints a summary of pages,
provider counts, duplicates, and skipped records. It searches Basketball near
postcode 4115 using the directory's 25 km option (the closest supported radius
to 20 km). Coordinates come from the directory's official locality lookup;
when a postcode has several localities, the first alphabetically is selected
and reported. For 4115 this is ALGESTER, not a calculated postcode centroid.

Options remain separate from parsing:

```sh
npm run ingest:playon -- --activity Basketball --postcode 4115 --locality ALGESTER --radius 25 --output data/playon/4115-basketball.json
npm run ingest:playon -- --help
```

The directory offers radii 10, 25, 50, 100, 250 and 1000 km. Keep this proof of
concept scoped to the requested local area; use a different output path when
comparing configurations. It fetches the locality lookup once, then result
pages sequentially with a 500 ms gap, a 30-second request timeout and a ten-page
safety limit. It does not retry automatically. Errors leave an existing dataset
untouched; a successful run replaces it atomically.

The standalone modules under `scripts/playon/` parse only organisation names,
activities, and optional addresses. Each record has a source URL and UTC check
time. No stable provider ID was exposed by the cards, so IDs hash normalized
name/address pairs; source name or address changes can change IDs. Deduplication
only merges that same identity, not distinct organisations sharing a venue.

Raw HTML, contacts, email, phone, websites, Facebook links, images and provider
descriptions are not saved. `node-html-parser` is a development dependency used
only by the ingestion command and synthetic offline parser tests (`npm test`).
The JSON is not imported by the React app. The map continues to use Overpass.
See `docs/tasks/TASK-004.md` for the live coverage report and source limitations.

## Play On provider-address geocoding proof of concept

```sh
npm run geocode:playon
npm run geocode:playon -- --help
```

This manual Node command reads the existing Play On output, caches geocoding
responses in `data/geocoding/cache.json`, and writes all providers with a separate
`geocode` object to `data/derived/4115-basketball-geocoded.json`. The source JSON
and ingestion are unchanged. Coordinates represent **provider addresses**, not
verified training or game venues. The derived data is not connected to the map.

The deliberately selected public Nominatim service is limited to this small
proof of concept. Read its [usage policy](https://operations.osmfoundation.org/policies/nominatim/):
run on one machine, one process at a time; requests are sequential with a 1.1-second
gap after each response, use an identifying User-Agent, and cache every valid
response, including empty and ambiguous results. Do not schedule this command or
run distributed copies. Public Nominatim is not the permanent production service.
Geocoding data: [© OpenStreetMap contributors, ODbL](https://www.openstreetmap.org/copyright).

Options: `--input`, `--output`, `--cache`, `--endpoint`, and `--user-agent`.
The endpoint defaults to `https://nominatim.openstreetmap.org/search` and may also
be configured with `NOMINATIM_ENDPOINT`. Supply a Nominatim-compatible `/search`
endpoint and a separate cache when changing servers. `NOMINATIM_USER_AGENT` or
`--user-agent` overrides the default application/version plus repository URL;
retain a valid application identity/contact. Queries contain only the complete
source address, restricted to Australia, with five results and address details.
There are no club-name searches, alternative-address retries or enrichment.

Matching requires consistent Queensland/Australia, available source postcode
and locality, street and any source house number. Missing required returned
evidence is conservatively rejected. A single distinct plausible coordinate
pair matches; multiple pairs are ambiguous. Exact house-number matching rejects
number ranges that differ. Street-only source addresses can match at street
precision. See TASK-005 for the live quality assessment and limitations.

The versioned, endpoint-bound cache uses SHA-256 of Unicode-normalized,
lowercase addresses with collapsed commas/whitespace; unit separators and house
numbers remain significant. It stores minimal address evidence and the original
geocoding timestamp so selection can be rerun offline without changing Play On
provenance. Keep the cache between runs; there is no automatic expiry or refresh.

Each completed response is written atomically to cache before proceeding.
Network/HTTP/malformed-response failures stop further requests, are not cached,
and produce a nonzero exit with partial output: `error` marks the failed request,
`pending` marks unattempted addresses, while existing cached addresses still
resolve. These statuses have no coordinates, as do `unmatched`/`ambiguous`.
Rerunning resumes from cache. An interrupted run may leave the previous output
intact, but completed cache entries survive; rerun to rebuild the derived output.
The process lock is `data/geocoding/.geocode.lock`. After a forced interruption,
remove a stale lock only after confirming its recorded PID is no longer running.
Invalid cache files fail clearly and are never silently discarded.

`npm test` covers geocoding with synthetic offline responses, including validation,
provenance, cache reuse, partial failure/resumption and sequential throttling.
See `docs/tasks/TASK-005.md` for the Completion Handoff.
