# TASK-001 — Basketball Map Vertical Slice

## Status

Complete

## Goal

Build the first working vertical slice of Youth Sports Finder.

A user should be able to open the application, view an interactive map, select Basketball, and see youth basketball clubs near the current map area.

## Scope

Create a React + TypeScript + Vite application using MapLibre GL JS.

Implement:

* a simple application header;
* a sport selector containing Basketball;
* browser geolocation;
* an interactive map;
* fixture basketball club data;
* club markers;
* a popup when a marker is selected;
* basic loading and geolocation-error states.

## Fixture Data

Create enough fictional basketball clubs at different coordinates to make map interaction meaningful.

Club records should include:

* id
* name
* sport
* latitude
* longitude
* address
* juniorProgram
* website

Do not call any real club API in this task.

## Map Behaviour

When geolocation succeeds:

* center the initial map near the user's location.

When geolocation is unavailable or permission is denied:

* use a reasonable configurable fallback location;
* keep the application functional.

Only Basketball needs to be supported.

Markers should naturally appear or disappear as their locations enter or leave the visible map viewport.

The implementation should make it possible to replace fixture data with a real viewport-based club provider later.

Do not build that provider yet.

## User Interface

Keep the interface deliberately simple.

The page should contain:

* application title;
* sport selector;
* map occupying most of the page.

Selecting a club marker should show:

* club name;
* address;
* whether it has a junior program;
* website if available.

Do not spend substantial effort on visual design.

## Engineering Constraints

Do not add:

* backend services;
* database;
* authentication;
* Google Maps or Google Places;
* OpenStreetMap search APIs;
* state-management frameworks unless clearly necessary;
* unnecessary abstraction layers.

Use existing library capabilities wherever practical.

## Acceptance Criteria

The implementation is complete when:

* the application starts locally;
* the map renders successfully;
* Basketball can be selected;
* browser geolocation is requested;
* denial of location permission does not break the application;
* fixture basketball clubs appear on the map;
* panning and zooming work;
* markers correctly correspond to their geographic positions;
* clicking a marker shows club information;
* the application builds successfully.

## Completion Handoff

Before finishing, append an `Implementation Result` section to this document containing:

### Status

Complete or Blocked.

### Changed

Main files or components created or changed.

### Decisions

Any implementation choices that future tasks should know.

### Verification

Commands run and their results.

### Remaining Issues

Known problems, limitations, or follow-up work.

Do not create the next task.

## Implementation Result

### Status

Complete — implemented and verified on 2026-09-11.

### Changed

* Created the React + TypeScript + Vite scaffold: `package.json`, npm lockfile,
  `index.html`, TypeScript/Vite/ESLint configuration, and `.gitignore`.
* Added `src/App.tsx`, `src/main.tsx`, and `src/styles.css` for the simple header,
  Basketball selector, location status, and responsive map layout.
* Added `src/useLocation.ts` for browser geolocation, loading feedback, and
  denial/unavailable/position-error/timeout fallback messages.
* Added `src/ClubMap.tsx` for MapLibre rendering, navigation controls, accessible
  marker buttons, club popups, loading/error feedback, resizing, and cleanup.
* Added `src/types.ts`, `src/data/clubs.ts`, and `src/config.ts` for typed club
  records, nine fictional Brisbane-area clubs, and configurable map defaults.
* Added `README.md` with local setup, npm commands, configuration notes, and
  manual browser checks.

### Decisions

* Basketball is the only option and is selected initially. All fixtures represent
  fictional junior clubs; some omit a website to exercise optional popup content.
  Available websites use reserved `example.com` placeholder URLs.
* Brisbane (`[153.0251, -27.4698]`, longitude first) is the fallback, at zoom 11.
  Change the fallback name/coordinates and zoom in `src/config.ts`.
* Resolve geolocation before mounting the map so successful location access sets
  its initial center. Request options use a 10-second acquisition timeout and a
  five-minute cached-position allowance. Cleanup ignores stale location callbacks.
* Use the OpenFreeMap Bright basemap with MapLibre's native attribution. Only
  basemap resources are fetched; club records stay local. No club/search API,
  backend, database, authentication, or provider layer was added.
* Pass club records into the map as props. Native MapLibre markers stay anchored
  to coordinates and are clipped by the map viewport; a future task can supply
  different records without moving fixture retrieval into the map component.
* Use MapLibre 6.9.0, with its worker bundled through Vite's `?worker&url` import
  as described in the [MapLibre Vite setup](https://maplibre.org/maplibre-gl-js/docs/#installation).
  The initial 5.x dependency was replaced after npm reported a critical advisory;
  the final dependency installation reported zero vulnerabilities.
* Use DOM text nodes for popup content. Map instances, markers, and resize
  observers are cleaned up on unmount, including React StrictMode remounts.

### Verification

* `npm run check` — passed strict TypeScript checking.
* `npm run lint` — passed ESLint.
* `npm run build` — passed, including the final HTML change and the separately
  bundled MapLibre worker. Vite reported a non-fatal large-chunk warning.
* `npm run dev -- --host 127.0.0.1` — started successfully at port 5173 after
  allowing local port binding outside the execution sandbox.
* `npm run preview -- --host 127.0.0.1` — served the production build at port 4173.
* Playwright CLI `open` / `run-code` browser checks passed against development and
  production builds using real basemap tiles:
  * native location request and permission-denial fallback;
  * Basketball selection; club name/address/junior-program popup content;
  * popup website present with the correct URL, and omitted when unavailable;
  * zoom buttons and drag panning move projected marker positions;
  * zooming out increases in-viewport markers from six to nine, including Ipswich;
  * successful browser-emulated geolocation centers the matching fixture within
    three screen pixels of the map center;
  * keyboard Enter opens a focused marker's popup;
  * 390 × 844 mobile viewport has no horizontal page overflow;
  * simulated unavailable geolocation, position error, and timeout each show the
    appropriate message and leave the map and popups functional;
  * loading states resolve, and the production worker loads real vector tiles.
* Captured and visually inspected desktop and mobile screenshots. Local browser
  artifacts are ignored under `output/playwright/`; production screenshot also
  captured there. Final browser runs had zero console errors.
* Dependency installation required network access and a temporary npm cache
  because the sandbox blocked DNS and the existing user cache had permission
  errors. The final install audit reported zero vulnerabilities.

### Remaining Issues

* Fixtures are intentionally fixed around Brisbane. Users elsewhere need to pan
  there to see these fictional clubs; no real nearby-club discovery is implemented.
* Basemap rendering requires internet access and a browser with WebGL support.
* OpenFreeMap Bright emits three non-fatal road-shield filter warnings under
  MapLibre 6.9.0. Tiles, markers, and interactions rendered successfully.
* Vite warns about the approximately 1.27 MB minified main JavaScript chunk
  (354 KB gzip); bundle optimization is deferred beyond this vertical slice.
* Browser verification used Chromium. No persistent automated test suite or
  cross-browser verification was added; repeatable manual steps are in README.
* No next task was created and no future features were implemented.
