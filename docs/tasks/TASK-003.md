# TASK-003 — Real Basketball Club Discovery with OpenStreetMap

## Status

Complete

## Goal

Replace the fictional basketball club fixtures with real geographic basketball club discovery based on the current map viewport.

Use OpenStreetMap data through the Overpass API.

This task is for discovery only. Do not attempt to determine whether a club actually offers junior programs.

## Context

TASK-002 added viewport reporting without recreating the MapLibre map.

The application can now receive geographic bounds whenever the user finishes panning or zooming.

The next step is to use those bounds to retrieve real basketball-related organisations.

## Data Source

Use OpenStreetMap through an Overpass API endpoint.

Prefer results explicitly tagged as basketball sports clubs:

* `club=sport`
* `sport=basketball`

Basketball-related sports centres or halls may be included only if they have a meaningful name and are clearly useful as candidate organisations.

Do not include ordinary basketball courts or pitches merely because they have `sport=basketball`.

## Search Behaviour

When the initial viewport becomes available:

* search the current viewport for basketball club candidates.

When the user finishes panning or zooming:

* search the new viewport;
* replace the displayed club results without recreating the map.

Avoid issuing duplicate requests for identical bounds.

A small delay or simple request-control mechanism may be introduced only if needed to prevent obviously redundant calls.

## Result Mapping

Convert external results into the application's club model.

Use stable external identifiers where possible.

Populate available fields such as:

* id
* name
* latitude
* longitude
* website

Do not invent missing values.

Junior-program status must not be inferred from the organisation name.

If the existing model requires a boolean `juniorProgram`, change the model so an unknown/unverified state can be represented accurately.

## User Interface

Replace the fictional-data message with a clear indication that club candidates come from OpenStreetMap.

For youth/junior status, display an honest state such as:

`Junior program: Not verified`

Do not claim that an organisation offers youth programs unless the source explicitly establishes that fact.

Provide loading, empty-result, and search-error feedback without making the map unusable.

## Engineering Constraints

Keep MapLibre and the existing basemap.

Do not add:

* Google Places;
* Google Maps;
* a backend;
* database persistence;
* official sporting-body scraping;
* AI classification;
* registration data;
* caching infrastructure;
* marker clustering.

Keep the external-data logic outside `ClubMap`.

`ClubMap` should remain concerned with map display and viewport interaction rather than data retrieval.

## Acceptance Criteria

The task is complete when:

* fictional club fixtures are no longer used as the normal data source;
* the initial map viewport triggers a real basketball-club search;
* moving or zooming the map searches the new viewport;
* search results update markers without recreating the map;
* ordinary basketball courts are not intentionally returned as clubs;
* unknown junior-program status is represented honestly;
* loading, empty, and error states work;
* a failed Overpass request leaves the map usable;
* TypeScript checking, linting, and production build pass.

## Prototype Limitation

The public Overpass API is suitable for this prototype but must not be treated as the final production-scale service.

OpenStreetMap coverage may be incomplete.

Absence from the search results does not mean that a real basketball club does not exist.

## Completion Handoff

Append an `Implementation Result` containing:

### Status

Complete or Blocked.

### Changed

Main files/components changed.

### Decisions

Important implementation decisions and the exact OSM tags queried.

### Verification

Commands run, browser checks performed, and results.

Include at least one real geographic area used for verification.

### Data Quality Observations

Record examples of useful results, missing clubs, irrelevant results, or tagging inconsistencies discovered during testing.

### Remaining Issues

Known limitations and suggested follow-up work.

Do not implement junior-program verification and do not create the next task.

## Implementation Result

### Status

Complete.

### Changed

* `src/clubSearch.ts`: viewport query construction, Overpass retrieval, validation, and mapping to club candidates.
* `src/useClubSearch.ts`: duplicate-query suppression, request cancellation, stale-response protection, loading/error state, and manual retry.
* `src/App.tsx`: connected the existing TASK-002 callback to search; replaced fixture usage with real results and OSM attribution/coverage messaging.
* `src/types.ts` and `src/ClubMap.tsx`: optional addresses, nullable junior-program status, honest popup text, and ordinary website labels. External retrieval remains outside `ClubMap`; its map lifecycle is preserved.
* `src/styles.css`: search feedback overlay that does not resize the map when loading, empty, or error messages change.
* `tests/clubSearch.test.mjs`, `package.json`, and `eslint.config.js`: seven Node test cases and `npm test`, with no added dependencies.
* `README.md`, `src/config.ts`, and this task: updated usage, configuration comments, and handoff.

### Decisions

* Endpoint: `https://overpass-api.de/api/interpreter`, using a GET request with a URL-encoded `data` query. The compact query works with GET; earlier POST verification encountered HTTP 406/504 and connection failures.
* Exact selectors, each using the current `(south,west,north,east)` bounding box:
  * `nwr["club"="sport"]["sport"~"(^|;)basketball(;|$)"]["name"]["leisure"!="pitch"]`
  * `nwr["leisure"~"^(sports_centre|sports_hall)$"]["sport"~"(^|;)basketball(;|$)"]["name"]["leisure"!="pitch"]`
* Query settings are `[out:json][timeout:25]` and `out center tags;`. Semicolon-separated sports are supported. Ways/relations use their returned bounding-box centers, not a claimed entrance location. World-wrapped bounds are normalized, including antimeridian crossings and viewports spanning a full world.
* The mapper rechecks tags, rejects missing/generic names and invalid coordinates, and deduplicates `osm:type/id` identifiers. Generic court names and building labels such as `Undercover courts` and `R Block` are excluded. This is a small conservative filter, not organisation classification.
* Missing addresses/websites stay absent. Only valid HTTP(S) website links are displayed. Every discovered candidate has `juniorProgram: null`; names are never used to infer junior programs.
* Initial bounds and completed viewport changes drive search. Equal query strings do not issue another request. A 250 ms delay coalesces initial resize events and rapid gestures; superseded requests are aborted, and late responses cannot overwrite newer results. A 30-second client timeout surfaces an error. Retry is explicit; there is no automatic retry loop or cache.
* Old markers are cleared when a new search begins, so results from a previous area are not presented as current results. Loading/errors never unmount the map. The feedback overlay prevents status text from changing viewport height and triggering redundant searches.
* Historical fixtures remain available in `src/data/clubs.ts` but are not imported by the application. No backend, alternate-provider framework, clustering, junior verification, or next task was added.

### Verification

* `npm run check` — passed.
* `npm run lint` — passed.
* `npm test` — seven tests passed: query/tag selection, geographic wrapping, external IDs and missing fields, court/generic-name exclusion, website safety, malformed/partial responses, and HTTP/JSON failures. Node 22.17 emits its experimental TypeScript-stripping warning.
* `npm run build` — passed; the existing main-bundle size warning remains.
* `git diff --check` — passed.
* Playwright CLI against `npm run dev -- --host 127.0.0.1` — passed: deterministic browser harness checks cover initial search and denied-location fallback, loading, unknown-junior popups, duplicate bounds, pan/zoom searches, empty results, request cancellation and stale responses, failure/retry, unchanged map/canvas identity and viewport, and mobile layout stability. Browser instrumentation and mocked responses are confined to a temporary harness, not application code.
* Live geographic verification on 2026-09-11: Brisbane, Australia, bounding box south `-27.6`, west `152.95`, north `-27.35`, east `153.15`. A real GET request returned two OSM ways; passing that response through the final mapper retained Nissan Arena and rejected `Undercover courts`. OSM base timestamp: `2026-09-11T12:00:26Z`.
* A clean browser session issued an initial real viewport search and displayed an OSM candidate. It exposed the generic `R Block` result, which was then added to the exclusion regression test. The subsequent live zoom-out request timed out; successful update/race/error behaviors were verified separately using controlled browser responses.

### Data Quality Observations

* [Nissan Arena, OSM way 768981473](https://www.openstreetmap.org/way/768981473): returned at `-27.5598123, 153.0651333` with `leisure=sports_centre`, `sport=netball;basketball`, alternate name `Queensland State Netball Centre`, and website `https://qsnc.com.au/`. Useful as a basketball facility candidate, but this data does not establish a club organisation or junior program. No address was supplied or invented.
* [OSM way 1356111826](https://www.openstreetmap.org/way/1356111826) was named `Undercover courts` despite being tagged `leisure=sports_centre`, `sport=basketball`. This illustrates why excluding only `leisure=pitch` is insufficient. The final mapper excludes this generic result.
* The initial browser viewport also returned `R Block`, a building label that does not identify a useful organisation. The final filter excludes such block labels.
* The successful fixed Brisbane query returned no explicitly tagged `club=sport` organisations. This is a coverage observation, not evidence that no basketball clubs exist. No completeness audit or junior-program verification was performed.

### Remaining Issues

* Public Overpass availability is intermittent: verification encountered overload responses and timeouts. An alternate Private.coffee instance also timed out during investigation; it was not added as a fallback. The app reports search failure and leaves navigation/retry usable.
* OSM tagging is incomplete and inconsistent. Named sports facilities are candidates, not verified clubs, and a small generic-name filter cannot guarantee relevance. Duplicate real organisations represented by different OSM objects may still appear.
* Large viewports may exceed public-service limits; the prototype uses bounded request timeouts rather than adding production infrastructure.
* Existing Vite bundle-size and external basemap road-shield filter warnings remain outside this task's scope.
