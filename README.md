# Youth Sports Finder

A React + TypeScript + Vite map and searchable list of Queensland Play On Basketball providers in a fixed Algester / postcode 4115 pilot sample (25 km directory radius). Provider addresses are not verified training or game venues; junior programs and availability are not verified.

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

## Configuration and provider data

- `src/config.ts`: fallback center/name, initial zoom, pilot-area view, and basemap style.
- `src/data/playOn.ts`: static import of `data/benchmarks/qld-geocoder/stage-b/validated.json`.
- `src/playOnProviders.ts`: typed adapter and pure text/bounds/group selectors.
- `src/ProviderList.tsx`: distinct provider entries and explicit address focus actions.
- `src/clubSearch.ts` and `src/useClubSearch.ts`: retained, inactive TASK-003 Overpass POC.
- `src/data/clubs.ts`: historical fictional fixtures; not used by the app.
- `src/ClubMap.tsx`: persistent MapLibre instance, supplied with grouped provider-address points.

The default list includes all 54 provider identities. Search matches name, suburb
and postcode. Only 25 accepted Queensland address points are mapped at 19 locations;
29 list-only providers remain searchable. Shared addresses use one marker with
separate selectable organisations. Pins are property centroids of listed provider
addresses, not activity locations. Counts are regression expectations for this snapshot.

“Only in current map view” is OFF by default. It filters the fixed list using real
map bounds and excludes list-only providers while active; it does not discover new
providers. “All providers” restores text matches. Marker popup selections highlight
the distinct list entry; list actions focus an address only on explicit click.
“View 4115 pilot area” returns to the sample area from any initial device location.

Only the OpenFreeMap basemap requires internet access during normal use. No automatic
Overpass or geocoder requests occur. A malformed fixed dataset shows an explicit
error rather than falling back to discovery. No backend or database is used.

## Browser checks

1. Deny location permission: verify the fallback message and Brisbane map.
2. Verify 54 list entries, 25 address focus actions and 19 markers; use the pilot-area button.
3. Search each baseline club; only Runcorn Rockets, Cannons Southside and Sunnybank
   Hills Hurricanes have accepted address pins. Search Booval and select two of the
   seven separate providers through its single grouped marker.
4. Pan far away with map filtering OFF: 54 entries remain. Turn filtering ON to
   see only accepted providers in actual bounds, then OFF to restore the full list.
5. Confirm search/marker changes preserve the map and viewport; exercise empty
   search and empty-map-filter messages and their clear actions.
6. Allow location (or emulate coordinates): verify the initial center follows it;
   denial, unavailable location and timeout retain the Brisbane fallback.
7. Check a narrow viewport, keyboard access, popups and list/address focus. Block
   discovery endpoints and confirm no requests to them on load, pan, zoom or search.

`npm test` uses Node's built-in test runner and TypeScript stripping (Node 22.12+)
to test pilot data invariants, trust boundaries, search/bounds/grouping and retained
POC pipelines without network calls. See `docs/tasks/TASK-007.md` for the handoff.

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
The raw ingestion JSON is not imported by the React app. TASK-007 instead consumes
the separate TASK-006 validated artifact described above.
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

## Queensland Government geocoding benchmark

Prepare the fixed TASK-004 sample for a manual government batch upload:

```sh
npm run benchmark:qld-geocoder -- --export
```

This offline command writes `data/benchmarks/qld-geocoder/addresses.csv`,
`addresses-smoke.csv` and `address-mapping.json`. The CSVs use the official sample's
header (`Address to Validate,LOCALITY`) and safe unquoted, comma-free fields;
the sidecar preserves exact source addresses, all provider IDs and provenance,
manual-review entries, source/CSV hashes and TASK-005 baseline statuses. Repeated
exports of unchanged inputs are byte-identical. No dependencies were added.

Current reconciliation: 54 providers, 40 unique source addresses; 39 exported
addresses covering 53 providers, plus one intersection address for manual review.
The CLI checks that the existing TASK-005 data still corresponds to the source.
It does not call a geocoder, import results or change the app.

Upload **`addresses-smoke.csv` first** at the [official batch form](https://geocode.information.qld.gov.au/):
choose **Address**, **Automatic**, **Includes header row? Yes**, and **CSV** output.
Save the original response unchanged as
`data/benchmarks/qld-geocoder/government-smoke-results.csv`. Check that address/locality
are parsed and the universal illegal-character error is gone before uploading the
full `addresses.csv`; save that unchanged response as `government-results.csv` in the
same folder. Keep the exact input CSVs and mapping together. The original failed
response is preserved as `government-results-failed-2026-11-01.csv`. The diagnosis,
smoke-to-full row mapping and exact protocol are in
[TASK-006](docs/tasks/TASK-006.md#stage-a2-remediation-implementation-result).

The supplied smoke CSV confirmed Stage A2 input parsing. Government records may be
returned in a different order; never associate coordinates by output position alone.
Coordinates continue to mean Play On provider addresses; activity locations require
confirmation from the clubs.

The corrected full government CSV has now been supplied and Stage B is complete.
Reproduce the offline validation and comparison (no service calls):

```sh
npm run benchmark:qld-geocoder:compare -- --validated-on 2026-11-01
```

The explicit date records this validation, not the government's upload/check time
(which is absent from its CSV). Inputs are the original Play On and TASK-005 files,
the frozen upload/sidecar pair and `government-results.csv`; missing rows, duplicate
indices, inconsistent echoed inputs, schema changes and hash mismatches fail before
output replacement. Results join on `InputIndex` **and** input address/locality,
never returned row order. Do not regenerate the submitted Stage A files while
retaining responses from their previous export.

Outputs under `data/benchmarks/qld-geocoder/stage-b/` are `validated.json` (all 54
providers), `comparison.json` and `report.md`. Raw coordinates cover 34 providers;
conservative validation accepts 25 (46.30%), with 19 ambiguous, 1 rejected and 9
requiring review. PC is treated as a property centroid. Confidence 100 alone is
insufficient: address agreement, precision, ranges/suffixes and coordinate evidence
are checked. The report documents the policy and limitations. Stage B did not
connect any data to the app or select production geocoding infrastructure.

## Local-only research inputs

Raw provider-link research, training-venue datasets, government training-result
evidence and workflow logs remain local and are not published with the code.
The application uses the approved generated provider links and Provider Address
dataset already included in the repository. Training-venue tools and audit tests
require the exact private inputs described in their task documents; a fresh clone
does not include those inputs or reproduce the full private-data audit by itself.
The same-site alias review index is versioned as validator policy metadata, not as
a publicly approved training-venue feed. Machine-specific `.codex/config.toml`
settings also remain local; see `.codex/WORKFLOW.md` for the project workflow.
