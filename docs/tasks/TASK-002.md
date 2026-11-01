# TASK-002 — Prepare Map for Viewport-Based Club Search

## Status

Complete

## Goal

Prepare the existing map implementation for club results that can change when the user pans or zooms the map.

The map itself must remain mounted while club data changes.

No real club API should be added in this task.

## Context

TASK-001 creates the MapLibre map and club markers inside the same React effect.

The effect currently depends on both `center` and `clubs`.

Future viewport-based searching will replace the club array whenever search results change. Updating club data must not recreate the MapLibre map or reset the user's current viewport.

## Required Changes

Separate the lifecycle of the MapLibre map from the lifecycle of club markers.

The MapLibre map should be created once for the mounted `ClubMap` component and removed only when the component unmounts.

When the `clubs` prop changes:

* keep the existing map instance;
* remove or update the previous club markers;
* render markers for the new club data;
* preserve the user's current center and zoom.

Add a way for the parent component to receive the current visible map bounds after the user finishes panning or zooming.

A simple callback such as `onViewportChange` is sufficient.

The callback should provide the geographic bounds required by a future club-search provider.

Trigger it after meaningful viewport changes, such as MapLibre `moveend`.

Do not call an external search service yet.

## Engineering Constraints

Keep the implementation small.

Do not add:

* backend services;
* real club APIs;
* caching;
* Redux or another state-management framework;
* generic provider frameworks;
* marker clustering;
* debouncing unless it is clearly required for correct behaviour.

Do not redesign unrelated TASK-001 functionality.

## Acceptance Criteria

The task is complete when:

* the map is not recreated when the `clubs` prop changes;
* changing club data updates the markers;
* the current map center and zoom remain unchanged when club data changes;
* panning and zooming still work;
* the parent can receive the current map viewport bounds;
* location fallback behaviour continues to work;
* existing club popups continue to work;
* TypeScript checking, linting, and production build pass.

## Completion Handoff

Before finishing, append an `Implementation Result` section containing:

### Status

Complete or Blocked.

### Changed

Main files or components changed.

### Decisions

Implementation choices future tasks should know.

### Verification

Commands run and results.

### Remaining Issues

Known limitations or suggested follow-up work.

Do not implement a real club data provider and do not create the next task.

## Implementation Result

### Status

Complete.

### Changed

* `src/ClubMap.tsx`: separated map creation/cleanup, viewport events, and marker updates. Club changes replace markers and their popups without replacing the map or changing its viewport.
* `src/types.ts`: added `ViewportBounds` with `west`, `south`, `east`, and `north` geographic coordinates.
* `docs/tasks/TASK-002.md`: recorded this Completion Handoff.

### Decisions

* `center` is the initial center for the mounted component. The existing parent waits for geolocation or fallback before mounting, so location behavior is preserved.
* Optional `onViewportChange` receives initial bounds and bounds after MapLibre `moveend`, including completed pans and zooms. Values come directly from MapLibre without longitude normalization; future search code must account for world wrapping.
* A single viewport listener reads the latest callback from a ref. Replacing a parent callback does not trigger another initial report or recreate the map, avoiding render feedback loops.
* Marker updates rebuild the small fixture marker set and close old popups. No search provider, API, caching, or additional dependencies were added.
* Map, resize observer, markers, and viewport listener are cleaned up on unmount. React development Strict Mode can still perform its normal effect setup/cleanup replay.

### Verification

* `npm run check` — passed.
* `npm run lint` — passed.
* `npm run build` — passed; Vite reports a bundle-size warning for the main JavaScript chunk.
* `npm run dev -- --host 127.0.0.1` and Playwright CLI browser checks — passed using a temporary browser harness. Verified denied-geolocation Brisbane fallback, existing and updated popup content, initial and moveend bounds, replacement and empty club arrays, unchanged map/canvas identity and center/zoom, pan/zoom events, latest callback delivery, and listener/map cleanup on unmount. The harness is outside application source; no test framework was added.

### Remaining Issues

* No blocking issues found. The production bundle-size warning remains outside this task's scope.
* Browser console showed basemap road-shield filter warnings from the existing external map style, with no console errors during the final regression run.
* The app continues to use local fixtures. Connecting viewport bounds to club searching remains future work.
