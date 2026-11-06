# TASK-007 — Play On Basketball Map + Complete Provider List (4115 Pilot)

## Status

**Draft for owner review — Chat design, NOT implemented.**

This task follows completed TASK-001 through TASK-006. It is not an authorization to start Codex or TASK-008.

## Owner Summary

**Why:** The current React/MapLibre app still uses TASK-003's live Overpass prototype, which has poor coverage of real youth basketball organisations. TASK-004 through TASK-006 created a fixed, auditable Play On sample and conservative Queensland address-coordinate validation. Families should be able to find the recorded organisations even when their provider addresses cannot be safely mapped.

**This task WILL:** Use the fixed 4115 Basketball Play On sample as the default discovery data; show all 54 provider records in a searchable list by default; render map markers only for 25 accepted provider-address records (19 distinct locations); offer an **opt-in** “Only in current map view” list filter; keep multi-provider addresses distinct; and disclose data limitations.

**This task WILL NOT:** Add a real-time Australia-wide provider search, fetch/geocode new addresses, automatically resolve uncertain locations, verify junior programs, gather websites/Facebook links, create a season/venue database, implement an account/backend, or change the established geocoding acceptance policy.

**Owner check:** With Basketball selected, confirm all seven named baseline clubs are findable by name; only the three Queensland-accepted baseline clubs receive pins; the other four remain discoverable in the list. Confirm panning the map does not silently shrink the default list.

## 1. Context and Source of Truth

Read the project-root `AGENTS.md` and `docs/tasks/TASK-001.md` through `TASK-006.md` (including latest Completion Handoffs) before implementation.

Current stack: React / TypeScript / Vite / MapLibre GL JS. TASK-002 separates map lifetime from marker updates and emits initial/`moveend` bounds. TASK-003 provides Overpass discovery code and viewport-query handling, **currently the application's active path**. Preserve useful code but do not use Overpass as the default Basketball data source in this pilot.

**Approved input**: `data/benchmarks/qld-geocoder/stage-b/validated.json` generated in TASK-006. It contains the original Play On provider fields plus `qldGeocode`. The source is a **fixed Play On Basketball query for postcode 4115 / Algester within the government's 25 km search radius**. It is not a live list for every viewport or all of Queensland, and is not necessarily a complete list of all clubs.

Verified frozen sample as of TASK-006:

| Measure | Expected |
| --- | ---: |
| Total distinct provider records | 54 |
| Distinct original source addresses | 40 |
| Providers with accepted Queensland provider-address points | 25 |
| Distinct accepted map locations | 19 |
| Providers without an accepted point | 29 |
| Government status breakdown | accepted 25 / ambiguous 19 / needs-review 9 / rejected 1 |

These are **fixed-sample regression expectations**, not hard-coded global business rules. If the source file differs, detect/report source drift; never fabricate missing entities, silently change acceptance policy, or pretend that new counts are verified.

**Important terminology:** A Play On record is a `provider` or `organisation`. This directory also includes schools and multi-activity groups. Do not label every entry a confirmed junior basketball club. A Queensland `PC` marker is a **property centroid for the listed provider address**, NOT a verified training venue, home court, game venue, entrance, or a location at which a specific club necessarily operates.

## 2. Approved Product Decision — Option A

**Default mode = Complete list.** After the page loads and Basketball is selected, all 54 recorded provider entries are eligible to appear in the list regardless of map viewport, accepted geocode status, or current map position.

**Optional mode = Only in current map view.** An explicit user-controlled toggle or checkbox applies a viewport constraint to the list. It is **OFF by default**. The filter includes only providers with `qldGeocode.status === 'accepted'`, a selected valid latitude/longitude pair, and a point inside the current MapLibre bounds. Provider records without selected points cannot qualify for a geographic bounds test and are therefore excluded **only while that option is ON**. The interface must explain this and make it easy to turn the filter OFF.

Moving/zooming the map updates bounds, but **must not shrink the complete list while the filter is OFF**. Switching back OFF instantly restores all entries matching the current text query without requiring another network request.

This is a local **filter of the fixed 54-provider snapshot**, not a new API query for the area shown on the map. Communicate that distinction in the UI.

## 3. Data Adapter and Trust Boundary

Add a small, typed frontend adapter outside `ClubMap` to consume the **already validated** TASK-006 artifact. Prefer existing repo conventions and a build-time/static JSON import. Do not call the Queensland government site, Nominatim, Overpass, or another provider service to populate this default dataset.

For map eligibility use *only* selected fields under `qldGeocode`:

```ts
provider.qldGeocode.status === 'accepted' &&
Number.isFinite(provider.qldGeocode.latitude) &&
Number.isFinite(provider.qldGeocode.longitude)
```

- Never use `qldGeocode.rawCoordinateAvailable` as marker eligibility.
- Never use `qldGeocode.evidence.rawLatitude/rawLongitude` for any marker, focus action, distance, or viewport filter.
- Do not use TASK-005 Nominatim coordinates to fill gaps, including Nominatim `matched` cases rejected/ambiguous under the Stage B Queensland policy. No automatic source fusion.
- Retain unique original `provider.id`; do not replace identity with an `addressKey`, address string or map coordinate.
- Preserve original provider names/addresses/provenance and the Queensland provider-address precision label. Do not invent a website, link, juvenile programme, age band, venue, schedule or registration state.
- Validate the data shape sufficiently to avoid rendering malformed/missing points or losing providers silently; handle a bad fixed dataset with a visible non-fabricated error or a clear build/test failure.
- `comparison.json` is benchmark evidence, **not** the application data source. Do not modify `validated.json` or the TASK-004/005/006 pipelines.

Prefer keeping benchmark-only detailed `evidence` out of UI text. Showing source, address role and the `validatedOn`/original Play On checked date is sufficient; do not imply `sourceLastChecked: null` is a known government check timestamp.

## 4. Complete List, Search and States

Provide a compact list alongside/under the existing map. Avoid a wholesale redesign. On initial load, show all **54 provider records**, in a deterministic alphabetical order by organisation name, with ID as a stable tie-breaker.

List item minimal content:

- Exact provider/organisation name; listed Play On address and suburb/postcode if provided.
- A truthful mapping state: **“Provider address mapped”** (only accepted) or **“Map location not verified”** (all other statuses). This status is about location, not organisation legitimacy.
- A short, visible data-source/meaning statement (e.g. “Queensland Play On listing; mapped pins show listed provider addresses, not training venues”). Do not assert junior programme or enrolment availability.
- If useful, link to the record's existing valid HTTP(S) `sourceUrl` with an accurate label such as **“View Play On directory search”**; the existing URL is a government **search-result page**, not a dedicated club homepage. Do not label it “Official club website”. Do not fabricate website/Facebook links. A separate link-enrichment task can follow.

Add a text search covering **name, suburb, postcode**, ignoring casing and incidental whitespace (simple deterministic substring matching is sufficient). No remote search, fuzzy organisation merging, aliases unsupported by evidence, or paid sorting. Clearing the query restores the complete list whenever the viewport toggle is OFF.

Text search affects both list entries and visible marker-group membership. The viewport toggle further constrains **the list**, not the underlying fixed dataset. Search and toggle combine with logical AND for list results; the map can continue to naturally clip visible markers to its own viewport. Do not auto-pan on every keystroke.

Use accurate counters: e.g. “54 providers in the pilot sample”, “25 providers have accepted address points”, “19 mapped locations”, and an active-filter result count. Distinguish providers from pins and refrain from claiming “54 nearby clubs”. A 0-result query must explain whether it is a text match failure or a current-map filter limitation, with a simple clear-filter action.

When the toggle is ON, display a concise explanation that providers with unverified map locations are excluded **from this filtered view only** and are still available under All providers. Keep a one-click path to return to the complete list.

## 5. Map Markers and Shared Addresses

Reuse existing `ClubMap` and TASK-002 viewport callback. Updating data/search/list selection must **not recreate MapLibre**, reset map center/zoom, or re-trigger Overpass requests.

- On the unfiltered, empty-search pilot dataset, render **19 marker locations representing 25 separate providers**.
- Group separate provider IDs that share an accepted location/address so overlapping markers do not hide identities. The shared address `2A Ross Llewellyn Drive, Booval QLD 4304` must show that **seven** separate providers are represented at one point. This is not generic map clustering and must not merge their list records.
- A marker/popup should show the full organisation name for single-provider points or a short list of all providers at shared points; each provider should remain selectable/identifiable. Clicking a provider in a multi-provider popup should allow the user to find/highlight its distinct list entry using the same ID. Implement a minimal, accessible interaction rather than a new directory/detail-page system.
- An accepted provider's list entry may offer “Show provider address on map”, which focuses the selected accepted point **only on an explicit click** (not while typing or scrolling). Never show such an action for an unlocated provider.
- A search term that matches only unlocated providers should show the matching list entries and **no invented pins**.
- Map popups/pin-related text must say provider address / property centroid, NOT training location. Never calculate or display distance to a training venue.

Check whether the existing `ClubMap` marker API can represent address groups cleanly. Make the smallest necessary type/prop change; keep data conversion outside the map component. Do not introduce an external clustering library.

## 6. Viewport and Pilot-Area Behaviour

- Reuse the real MapLibre bounds from the initial callback and `moveend`; do not estimate bounds from postcode names.
- Implement a small, testable bounds predicate with safe handling of valid latitude/longitude, longitude wrapping/antimeridian cases where the existing map permits them, and inclusive boundary semantics. Do not build a general spatial engine.
- The “Only in current map view” control must be disabled or clearly pending until real bounds are ready. With the option active, panning/zooming must update the list without duplicate requests or a map remount.
- Preserve the existing browser geolocation and Brisbane fallback behaviour from TASK-001/002 unless a small adjustment is unavoidable. Because this is a fixed postcode-4115 pilot and users may open it elsewhere, make it obvious how to see the **4115 pilot map area** if the initial map is away from the sample. A small “View 4115 pilot area” control may be added if the current UI lacks an equivalent; it must not masquerade as “Search this location”. Do not silently claim that the 54 providers are near the user's current device location.
- Search results must **not** expand when the user moves outside the fixed sample footprint. Never represent viewport changes as discovering new government providers.

## 7. Existing OSM/Overpass POC

The normal pilot UI should use Play On / validated Queensland data, **not** the live TASK-003 Overpass results. No automatic Overpass request should fire on initial load, pan, zoom, search or retry in the normal pilot flow.

Retain TASK-003 source files and existing test fixtures as an archived engineering POC where practical. The task does **not** require a user-facing data-source selector or a multi-provider abstraction. Do not silently mix OSM facility candidates into Play On entries, or silently fall back to Overpass when the static data is missing. If source-compatibility constraints require small edits, document them clearly.

Keep existing map style, basemap attribution, map lifecycle and browser location permission/error flow working.

## 8. Hard Scope Exclusions

No:

- New sport beyond Basketball, nationwide search, postcode autocomplete, arbitrary location discovery API or recurring data sync.
- Backend, authentication, user accounts, database, scheduler, AI matching/recommendation or payment features.
- New live geocoder requests, guessing/coarse centroids, relaxing Stage B acceptance, or production geocoder selection.
- Training venue / home court / game schedule / season / fee database, travel time/distance promises or routing.
- Club homepage/Facebook enrichment, contact detail harvesting, reviews, verification of junior age groups or registration status.
- Automatic club deduplication based on common addresses; schools and multi-sport organisations must not be silently discarded.
- New large dependencies, global state library, marker clustering package, broad CSS rewrite, or unrelated restructuring.
- Starting TASK-008.

## 9. Acceptance Criteria — Deterministic Data and UI

**Data and privacy / truthfulness**

1. Default empty-query list has **54 unique provider IDs**, and clearing filters restores 54 from anywhere on the map.
2. Exactly **25 accepted providers** may yield a map focus action; they occupy **19 distinct marker locations** in the frozen sample. No other provider has selected map coordinates, marker focus or geographic filtering eligibility.
3. All **29 nonaccepted** providers remain findable in the complete list, including rejected and withheld intersection cases. No raw evidence coordinates are used.
4. All **seven** named baseline clubs are findable via their name substrings. Runcorn Rockets, Cannons Southside and Sunnybank Hills Hurricanes have accepted address markers; Algester Hawks, River City Hornets, Rochedale Wildcats and Dunk Star remain list-only. Nominatim's street-level Rochedale baseline does not override Stage B.
5. The seven distinct `2A Ross Llewellyn Drive` providers remain individually searchable/listed, while one grouped marker exposes all seven; its popup does not suggest shared training locations.
6. Source attribution, fixed-sample limits and the provider-address-not-training-venue disclaimer appear clearly. Schools/multi-sport providers are not all described as verified junior clubs; URLs are labeled honestly.

**Interaction**

7. With viewport-only filter **OFF** (default), any pan/zoom leaves the complete list count unchanged, aside from any active text query.
8. With filter **ON**, the list includes only accepted providers whose points fall in the actual current map bounds; pan/zoom updates it, and switching OFF restores the unfiltered query result instantly.
9. Search combines predictably with the viewport-only filter; a search for an ambiguous baseline club still finds it when viewport-only is OFF, with no marker.
10. Search, markers, popups, marker selection, empty/error states and pilot-area reset work on desktop and narrow/mobile layout. No map reset/remount on provider list changes or marker updates.
11. No automatic Overpass or geocoding network requests fire during normal pilot use. Basemap tile requests are unaffected and do not count as discovery requests.

**Engineering**

12. `src/` uses a narrow typed adapter + pure filter/grouping functions and existing components; no data-quality logic is reimplemented ad hoc in popups.
13. No modifications to raw TASK-004 records, TASK-005 results or TASK-006 validated/benchmark evidence. No silent fallback to lower-quality data.
14. `npm test`, `npm run check`, `npm run lint`, `npm run build`, and `git diff --check` pass, or pre-existing unrelated failures are precisely documented.
15. Focused tests cover all sample invariants, seven club searches, default-off and opt-in viewport filtering, boundaries/world wrap, address grouping, unsafe raw-coordinate exclusion, no duplicate IDs, deterministic sorting and safe source links. Verify the map lifecycle and interactions with a practical browser smoke test using the repo's existing means; no new dependency just to add a browser test framework.

## 10. Implementation Guidance (not a prescribed architecture)

Implement the smallest maintainable path, likely:

- A `PlayOnProvider`/view model or adapter over `validated.json`.
- Pure selectors for `isAccepted`, text matching, visible-bounds matching, and grouping accepted points.
- A compact `ProviderList` UI and minimal search + viewport-filter controls.
- A small adaptation to the current `App` orchestration and `ClubMap` props/popups.

Prefer existing component conventions. Ensure the existing map instance remains mounted when the list changes. The repository, not this historical task document, is the authority for current file names/type signatures; inspect it first. If a major unforeseen architectural limitation blocks this bounded design, report the finding rather than expanding scope unilaterally.

## 11. Required Verification / Owner Test Script

Use local deterministic data with live discovery network requests blocked. Exercise:

1. Open the pilot with geolocation denied; verify fallback and a clear route to the 4115 sample area.
2. Clear query and disable map-area toggle; verify 54 list records and the 25/19 map/provider counts.
3. Search each of the seven benchmark names; verify all seven entries can be found and mapping states are correct.
4. Search `Dunk Star` and `Algester Hawks`; results stay in the list while no marker appears for either.
5. Search `Runcorn Rockets` and explicitly focus its property-address pin.
6. Search for `Booval`, verify seven providers and one grouped marker; select two distinct organisations.
7. With viewport-only OFF, pan far away and zoom; the default list stays at 54. Turn it ON and verify it shows only located providers in bounds. Turn it OFF and verify all 54 return.
8. Confirm no `evidence.rawLatitude/rawLongitude` is plotted. Verify no Overpass/geocoder discovery calls occur. Check mobile layout and map instance continuity.

## 12. Completion Handoff — for Codex to append after implementation

Append an `Implementation Result` to this file, preserving this design:

1. **Status** — Complete or Blocked; distinguish functional UI success from remaining product data limitations.
2. **Changed files and rationale**, including the exact static import path and any old Overpass code kept inactive.
3. **Data reconciliation** — 54 providers / 25 mapped providers / 19 distinct pins / 29 list-only; seven baseline clubs and Booval shared address.
4. **Behaviour verified** — complete-list default, text search, optional viewport filter and marker ↔ list interaction.
5. **Source/data guarantees** — accepted-only coordinates, no raw evidence points, provider-address warning, source attribution, no invented links.
6. **Checks and browser smoke tests** — actual commands and outcomes, including network and map-remount observations.
7. **Remaining issues** — limitations of the fixed 4115 sample, unknown club URLs and junior programs, and any follow-up decision needed.

Do **not** start TASK-008, link enrichment or production geocoding as part of this handoff.

---

## Implementation Result / Completion Handoff — 2026-11-02

### Final status

**Complete.** This approved implementation supersedes the historical draft status
above. The original specification and prior task history are preserved. Functional
pilot behaviour is complete; provider-address accuracy, directory coverage, junior
programs and current activity venues remain subject to the source limitations below.

### Changed files and architectural decisions

- `src/data/playOn.ts` statically imports exactly
  `../../data/benchmarks/qld-geocoder/stage-b/validated.json`. Invalid data produces
  a visible error; there is no remote discovery or lower-quality fallback.
- `src/playOnProviders.ts` adds a narrow typed adapter and pure search, inclusive
  bounds and exact-coordinate grouping selectors. Malformed records/accepted
  points and duplicate IDs fail clearly. Sorting uses normalized names, with ID
  as a stable tie-breaker. Coordinates enter the view model only from accepted
  `qldGeocode.latitude/longitude`; raw evidence and Nominatim are never copied.
  The adapter reads the established precision label without redoing Stage B policy.
- `src/App.tsx` supplies the complete local directory, name/suburb/postcode search,
  default-OFF bounds checkbox, accurate provider/location counters and truthful
  source/precision/validation-date text. Viewport filtering constrains the list;
  text search constrains both the list and marker-group membership.
- `src/ProviderList.tsx` retains individual provider IDs, exact names/addresses,
  mapping states, original Play On checked dates, safe HTTP(S) directory-search
  links and accepted-address-only focus buttons. Popup selections focus/scroll
  to distinct list entries; repeated selections work too. Selecting from a popup
  turns the viewport filter OFF to ensure the entry is accessible.
- `src/ClubMap.tsx` keeps TASK-002's map lifetime, initial/moveend bounds and resize
  handling. Small marker updates replace groups without replacing the map or
  changing center/zoom. Popups identify every provider and its listed address.
  Explicit list focus sets the popup position and brings the map into view.
- `src/config.ts` adds a fixed pilot-area view; fallback/geolocation and the
  OpenFreeMap style remain. `src/styles.css` adds the compact directory panel and
  stacked mobile layout, with room for basemap attribution.
- `tests/playOnProviders.test.mjs` adds 11 focused offline tests.
  `README.md` documents current pilot use and the archived POC.
- TASK-003's `src/clubSearch.ts`, `src/useClubSearch.ts`, fixtures and tests remain
  unchanged and inactive. The normal app no longer imports the Overpass hook.
  No dependencies, npm scripts or lockfile were changed by TASK-007; pre-existing
  TASK-006 working-tree changes were preserved.

### Data reconciliation and baseline clubs

All **54 distinct provider IDs** are preserved: **25 mapped providers** at
**19 distinct locations**, plus **29 list-only providers**. Counts are computed
from the dataset, with fixed-snapshot regression expectations in tests.

| Baseline search | Found individually | Address mapping |
| --- | --- | --- |
| Algester Hawks | Yes | List-only; ambiguous |
| Runcorn Rockets | Yes | Accepted property centroid |
| Cannons Southside | Yes | Accepted property centroid |
| River City Hornets | Yes | List-only; ambiguous |
| Rochedale Wildcats | Yes | List-only; ambiguous; Nominatim is not substituted |
| Sunnybank Hills Hurricanes | Yes | Accepted property centroid in listed Crestmead address |
| Dunk Star | Yes | List-only; ambiguous |

Booval's `2A Ross Llewellyn Drive` retains seven separate searchable entries:
Brothers, Central Bulldogs, Easts, Mt Crosby, Ripley Valley, Springfield Brumbies
and Swifts Comets. One marker labelled **7** exposes all seven names in its popup;
selecting different names highlights their different IDs. A narrower name query
changes this marker's membership without merging or deleting provider identities.

### Verification

- `npm test` — **63 passed** (11 new tests plus all 52 existing tests). Covers
  frozen counts/IDs and original fields, seven baseline searches, whitespace/case,
  suburb/postcode search, default/opt-in filters, logical AND, grouping, exact
  boundaries, shifted worlds/antimeridian/full-world bounds, raw/Nominatim
  exclusion, malformed data, duplicate IDs, stable sorting and safe links.
- `npm run check`, `npm run lint`, `npm run build`, `git diff --check` — passed.
  The existing Vite large-bundle warning remains non-blocking.
- Practical **Chromium via Playwright CLI** against local Vite with real basemap
  resources, at **1440×1000** and **390×844** — passed. Temporary harness scripts,
  instrumentation and screenshots are under ignored `output/playwright/task007-*`;
  no browser framework or test hooks were added to application source.
- Checked denied-location Brisbane fallback, pending bounds (disabled checkbox
  while the complete list is already available), successful remote-device
  geolocation, timeout fallback, and a deliberately malformed dataset showing
  the visible error with no fabricated records/pins or fallback requests.
- Verified 54 list entries, 25 explicit focus actions and 19 marker locations;
  searched all seven baseline names and checked their mapping states; verified
  unlocated-only searches produce no markers. Runcorn's explicit focus reaches
  its selected property coordinate and opens a correctly positioned popup.
- Verified all seven Booval popup names, distinct list selections, mobile focus
  and scrolling, keyboard Enter/Space marker activation and empty-state actions.
  Desktop/mobile screenshots were visually inspected; no horizontal overflow.
- Native mouse drag and zoom controls preserve the 54-entry default list.
  Moving to `[0, 0]` with filtering OFF retains 54; switching ON returns zero;
  “All providers” restores 54 immediately. Pilot reset plus filtering returns 25;
  zooming to Runcorn at zoom 15 returns one. Compared filtered IDs directly with
  accepted points inside actual `map.getBounds()` values; search combines with
  the filter and OFF immediately restores unlocated query matches.
- Map/canvas object identities remain unchanged across searches, marker changes,
  selections, pan/zoom, filtering, pilot reset and desktop/mobile resize. Map
  construction count remains **2 → 2**, reflecting only initial development
  StrictMode setup/cleanup replay. Search alone preserves center and zoom.
- Compared all rendered marker coordinates directly against the unique accepted
  selected-coordinate set: exact agreement. Blocked Overpass, Nominatim and
  Queensland geocoder/discovery endpoints throughout the main flow and observed
  **zero attempted discovery requests**, including startup/error probes.
- Protected-file SHA-256 audit: TASK-004 source, TASK-005 output/cache and all
  Stage B results are unchanged. `validated.json` remains
  `c6650ebffda0bdd3417545e47be3782b97e6daf3763faa5d81c85bcb14de1c07`.

### Remaining issues, guarantees and scope

No blocking issues or material specification deviations remain. The fixed sample
is not a live or exhaustive club directory, and panning outside it does not add
providers. All pins represent listed provider-address property centroids, never
verified training/game venues, entrances or organisation occupancy. Source URLs
are existing Play On search pages, not invented club homepages. Original Play On
check dates and the Stage B validation date are shown separately; the unknown
government check timestamp is not fabricated.

Basemap internet/WebGL requirements and external style road-shield/missing-sprite
warnings remain; the final smoke runs had no console errors. Browser validation
was Chromium only. The existing bundle-size warning remains outside this task.

No TASK-004/005/006 data, pipelines or acceptance policies were modified. No live
geocoding, data refresh, enrichment, verified junior programs, training venues,
nationwide/arbitrary-location discovery, backend, database, accounts or extra
sports were implemented. **TASK-008 and follow-up features were not started.**

---

## TASK-007 UAT Remediation Result — 2026-11-02

### Status

**F01/F02 remediation implemented; ready for independent Work retesting.**
The independent Work UAT failures supersede the earlier statement that no blocking
issues remained. The checks below are implementation-side Chromium verification,
not a declaration that independent owner/Work UAT passed. One agent performed this
focused remediation; TASK-008 and follow-up features were not started.

### Diagnosis from the actual DOM

- **F01:** MapLibre renders a `.maplibregl-popup` containing a tip and
  `.maplibregl-popup-content`. The old `max-height: 320px; overflow-y: auto` only
  constrained the content, not the complete positioned popup. MapLibre's automatic
  anchor selection could put the 330px overall popup below a marker when neither
  side had enough room. The map's `overflow: hidden` then clipped it. Scrolling
  the content to its maximum did not move the clipped popup back into the map.
  Reproduced `scrollTop = 513`: Swifts Comets was still below the map.
- **F02:** The same positioning problem caused Runcorn's mobile popup to extend
  35px below the map. The absolutely positioned pilot reset button overlapped the
  provider-address explanation: button Y=314–352, explanation Y=313–355.
- **F03:** The historical evidence established popup visibility without a reliable
  assertion of the actual keyboard focus destination. It cannot establish a focus
  pass from the narrative alone. Focus is now explicit, and tests inspect
  `document.activeElement` after the complete Enter/Space key action, dismissal
  and provider selection. Native keypress/default activation replay is prevented
  when focus moves from the marker into the popup.

### Changed files and decisions

- `src/ClubMap.tsx`: adds a dedicated popup body, uses a stable bottom anchor,
  and connects popup fitting/focus handling. Enter/Space activate the marker once.
  The pilot reset button moves into a normal toolbar row above the map surface;
  it is no longer an overlay that can obscure popup text or attribution.
- `src/providerPopup.ts`: narrowly scoped popup helper plus pure viewport/offset
  calculations. On open/resize it measures the map, tip and actual navigation/
  attribution footprints, limits popup width/content height to the usable area,
  and pans only as needed to fit the whole popup. It waits for an existing address
  focus animation to finish. Resize observers handle map/control size changes and
  are disconnected on close. A consistent 8px gutter is spacing, not a correction
  for a particular screenshot. No fixed viewport-height assumptions remain.
- `src/styles.css`: the popup content is a bounded flex shell; its separate
  `.provider-popup-body` scrolls internally. The close button remains outside the
  scroll region, while body padding preserves access to the final item. Toolbar
  layout replaces the old desktop/mobile floating reset-button offsets.
- `tests/providerPopup.test.mjs`: three focused offline regressions for measured
  control footprints, constrained map dimensions and camera fitting offsets.
- `tests/browser/provider-popup-uat.mjs`: retained, dependency-free browser
  regression callable by the existing Playwright CLI. It measures real popup,
  scroll region, button and control rectangles; checks hit-testing and actual
  focus; selects all seven providers at each size; captures screenshots and
  asserts map continuity/no discovery requests. Runtime instrumentation stays
  inside the browser test, with no application test globals.
- This task document records results. No data adapter, search/filter policy,
  dependency, package script, geolocation or other product functionality changed
  during remediation. Existing uncommitted TASK-006/007 work was preserved.

### Before/after measurements

CSS pixels, from `getBoundingClientRect()` after layout settles. Overflow is the
amount below the map, not merely below the popup's internal scroll viewport.
The toolbar takes 55px from the previous map surface at these sizes, and the
popup is fitted to that smaller actual surface.

| Case | Before | After |
| --- | --- | --- |
| 1470×672 Booval, maximum scroll | Map bottom 672; popup bottom 770; Swifts button Y=661–688 (**16px clipped**), scrollTop 513 | Map Y=227–672; popup Y=235–620; Swifts Y=480–528, scrollTop 500; **fully visible and hit-testable** |
| 390×844 Booval, maximum scroll (375px content width) | Map bottom 422; popup bottom 559; Swifts Y=450–477 (**entirely below map**), scrollTop 513 | Map Y=55–422; popup Y=62–349; Swifts Y=209–257, scrollTop 598; **fully visible and hit-testable** |
| 390×844 Runcorn | Popup bottom 457 vs map bottom 422 (**35px overflow**); reset overlapped explanation | Popup Y=62–349 within map Y=55–422; title, explanation, provider action and complete address visible together; reset is above the map |
| 390×568, constrained mobile height | Additional robustness check | Actual map height 285; popup Y=62–267; Swifts Y=127–175 at maximum scroll; single-provider action also reachable at maximum scroll |
| 1470×480, constrained desktop height | Additional robustness check | Actual map height 253; popup Y=234–427; Swifts Y=287–335 at maximum scroll; single-provider action also reachable at maximum scroll |

The independent report measured 17px desktop clipping; this reproduction measured
16px with the local browser's layout. Both reproduce the same failure. At all five
tested sizes the complete popup stays within the map and does not intersect the
pilot reset, navigation or attribution controls. Short layouts deliberately use
internal scrolling; the final action and its address can be reached in full.

### Keyboard, selection and regression results

- At **1440×1000**, one Enter and one Space each opened the shared marker and
  placed actual focus on **Brothers Basketball Club Ipswich Inc**, the first
  provider button (`popup.contains(document.activeElement) === true`). The key
  did not additionally activate/select that provider. Escape dismissed the popup
  and restored marker focus. The close button also restored marker focus.
- Every one of the seven Booval providers was clicked and selected separately
  at **1470×672, 1440×1000, 390×844, 390×568 and 1470×480**. Each selection focused
  its matching distinct list entry. Marker mouse activation and clicking the map
  canvas outside the popup to dismiss it remain functional. An already open popup
  also refits on resize.
- **54 providers / 25 mapped providers / 19 locations / 29 list-only** remain.
  All seven baseline name searches passed: only Runcorn Rockets, Cannons Southside
  and Sunnybank Hills Hurricanes have pins; Algester Hawks, River City Hornets,
  Rochedale Wildcats and Dunk Star remain list-only.
- Filtering defaults OFF. Moving to `[0,0]` retains 54 entries; ON returns zero;
  All providers restores 54. Pilot reset + ON returns 25, with IDs compared to real
  MapLibre bounds; zooming to Runcorn at zoom 15 returns one. Search AND bounds,
  switching OFF to restore unlocated matches, clearing filters and native mouse
  pan/zoom all passed. Text search alone leaves the camera unchanged.
- Map/canvas identities stayed unchanged through the popup, keyboard, resize,
  search, selection, filter and pan/zoom interactions. Construction count stayed
  **2 → 2** (only initial development StrictMode replay).
- Discovery/geocoding endpoints were blocked and monitored: **zero attempted
  requests**. Basemap resources remained enabled.
- SHA-256 audit verified **29 protected data/pipeline/TASK-004/005/006 files**
  unchanged. `validated.json` still hashes to
  `c6650ebffda0bdd3417545e47be3782b97e6daf3763faa5d81c85bcb14de1c07`.

### Verification commands and evidence

- `npm test` — **66 passed**, including the three new popup tests.
- `npm run check` — passed.
- `npm run lint` — passed, including the retained browser test.
- `npm run build` — passed; existing large-bundle warning remains.
- `git diff --check` — passed; new remediation files also checked separately.
- Real Chromium via the existing Playwright CLI, against
  `npm run dev -- --host 127.0.0.1` — the focused popup matrix and broader regression
  both passed. The focused regression is repeatable in an open local-app session
  with `playwright-cli run-code --filename=tests/browser/provider-popup-uat.mjs`.

Screenshots were captured with the basemap loaded and visually inspected:

- [1470×672 Booval at maximum scroll](../../output/playwright/task007-uat-after-1470x672-Booval-last.png)
- [1440×1000 actual keyboard focus](../../output/playwright/task007-uat-after-1440x1000-keyboard.png)
- [390×844 Booval at maximum scroll](../../output/playwright/task007-uat-after-390x844-Booval-last.png)
- [390×844 Runcorn and unobstructed explanation](../../output/playwright/task007-uat-after-390x844-Runcorn.png)
- [390×568 constrained-height shared popup](../../output/playwright/task007-uat-after-390x568-Booval-last.png)
- [1470×480 constrained-height shared popup](../../output/playwright/task007-uat-after-1470x480-Booval-last.png)

Before screenshots are `output/playwright/task007-uat-before-*`. Full after-fix
DOM/focus measurements are in `output/playwright/task007-uat-after.json`; broader
regression results are in `output/playwright/task007-uat-regression.json`. These
generated evidence files are in the existing ignored browser-artifact directory.

### Remaining limitations / stop condition

Independent Work retesting is still required; **independent owner UAT is not
declared passed**. Browser verification here is Chromium only. Very short maps
require scrolling inside the popup, with the close control remaining visible.
Existing basemap sprite/filter and production bundle-size warnings remain.
Fixed-sample, provider-address and junior-program limitations are unchanged.
No source data, geocoding policy, TASK-004/005/006 files, discovery API or unrelated
features were changed. No dependencies were added. **Stop after remediation.**

---

## Implementation Result / Formal UAT Remediation Handoff — 2026-11-04

### Final status and actual roles

**Complete / TASK-007 final Pass for this bounded remediation.** Developer self-check,
independent QA, independent real-browser UAT, screenshot review and Main's independent
browser-close verification all have current evidence. The original design and earlier
handoffs above remain historical records; the earlier pending independent-retest status
is superseded by this result. One product repair round was used; TASK-008 was not started.

Main actually spawned the configured custom roles, not renamed generic agents:

| Role / actual task ID | Injected loading marker | Actual conclusion |
| --- | --- | --- |
| `developer` / `/root/developer` | `YSF-DEVELOPER-1` | Implementation and self-check Pass; did not claim browser/independent acceptance |
| `qa` / `/root/qa` | `YSF-QA-1` | Independent code, data and automated QA Pass |
| `uat` / `/root/uat` | `YSF-UAT-1` | Independent real-browser business/visual UAT Pass |
| Main | Role loading and actual returns independently checked | Final Pass; tested-page close confirmed |

Each agent returned its configured marker without the answer being supplied in its
verification prompt. All inherited parent permissions; QA/UAT were not technically
read-only sandboxes. Exact spawns, permission scope, timings and Main's observations
are in [main-record.md](../../output/workflow/2026-11-04/task007-remediation-01/main-record.md).

### Actual diagnosis, changes and tested version

The incoming working tree already contained the historical F01/F02 fixes: separate
toolbar reset, bounded internal scrolling, stable popup anchor and measured popup
fitting. These were preserved, not re-described as new work. The remaining demonstrated
gap was that a resize/control change during an existing camera animation skipped the
final fit with no retry. Both shared and single popup timing regressions failed against
the pre-change helper and passed after the repair.

- `src/providerPopup.ts`: minimal change to queue one deferred `moveend` fit, remove a
  previous pending fit before replacing it, and cancel it on popup close. No change to
  F03 key handling, map lifetime, provider data, search/filter rules or geocoding policy.
- `tests/providerPopup.test.mjs`: three event/cleanup regressions for shared and single
  resize during movement, plus cancellation on close. Existing geometry tests retained.
- This append-only handoff and task evidence are the only additional deliverables.
  No dependencies, package scripts, backend, APIs or unrelated features were added.

Base HEAD is `1622a0191c00bbd38435de7c0758045edf690d3b`, with existing uncommitted work
preserved. The actual frozen helper SHA-256 is
`67e30ccdd87d59da6c75a298f7cdf007fe9abeaf8f0872cbe94d2f78d65bf521`.
Full working-tree hashes are in
[QA verified-version.json](../../output/workflow/2026-11-04/task007-remediation-01/qa/verified-version.json).
Main rechecked all recorded source/protected hashes after browser close: no differences.

### Developer and independent QA evidence

- [Developer report](../../output/workflow/2026-11-04/task007-remediation-01/developer/report.md)
  and `round-01.patch` preserve the exact change, expected pre-fix failure and self-checks.
  `npm test`: **69/69 Pass**; check, lint and diff check exit 0. Real-browser checks were
  explicitly Not Verified by Developer and left to independent UAT.
- [Independent QA report](../../output/workflow/2026-11-04/task007-remediation-01/qa/report.md):
  `npm test` **69/69**, `npm run check`, `npm run lint`, `npm run build` and
  `git diff --check` all exit **0**. Logs, timings and codes are in `qa/commands.json`.
  QA's independently constructed repair patch exactly matched the handed-off patch.
- QA additionally used installed MapLibre's real Evented implementation to verify
  repeated-resize de-duplication, one final pan, bounded nested moveend, no repeated
  later pan and close/observer cleanup. An initial QA-only ESM import error was corrected
  in its evidence harness; the original failure log is retained. No product assertion
  or acceptance requirement was weakened.
- All **32 protected TASK-004/005/006 data, pipeline, task, fixture/test files** retained
  their captured hashes. `validated.json` remains
  `c6650ebffda0bdd3417545e47be3782b97e6daf3763faa5d81c85bcb14de1c07`.
  The application still uses the static `src/data/playOn.ts` import of
  `../../data/benchmarks/qld-geocoder/stage-b/validated.json`; no raw-evidence/Nominatim
  fallback or new discovery request was introduced.

### Independent real-browser UAT and actual screenshots

The user explicitly approved the isolated project `ysf_browser` scope for
`http://127.0.0.1:5173/`, application resources, existing basemap traffic and the
documented runtime/temp effects. The existing project Vite server was verified and
reused; it was not started or stopped by this round. No personal Chrome session or
other project was accessed. Browser-only response instrumentation measured the actual
MapLibre instance; application source files were not instrumented or changed.

[Final UAT report](../../output/workflow/2026-11-04/task007-remediation-01/uat/report.md)
records **Pass** for every required business item:

| Required item | Actual result |
| --- | --- |
| F01 Booval, maximum scroll | Pass at 1470×672, 1440×1000, 390×844, 390×568 and 1470×480. Entire popup fits; complete Swifts Comets button/address is accessible; last button hit-test succeeds. All seven providers separately clicked and focused in the list at every size. |
| F02 Runcorn / reset | Pass at all five sizes. At 390×844 explanation, action and full address are visible; reset is in its toolbar above the map. No reset/navigation/attribution overlap; short views retain scroll access. |
| F03 Enter/Space | Pass at 1440×1000 and 1470×672. Real keys open once, focus the first provider without selecting it; Escape and close restore marker focus. |
| Resize during animation | Pass for shared 1470×1000→1470×480 and single 390×844→390×568. Actual `isMoving` true before/after resize; final popup/action inside map and hit-testable. |
| Fixed sample and baseline searches | 54 distinct entries / 25 map actions / 19 markers / 29 list-only. All seven baseline names found; only Runcorn Rockets, Cannons Southside and Sunnybank Hills Hurricanes have pins. Booval remains seven entries at one shared marker. |
| Search and actual bounds | Default OFF retains 54 through distant move, drag/zoom; ON in distant view gives 0; OFF restores 54. Pilot ON gives exactly 25 IDs compared with actual map bounds. Search AND filter, unlocated query restoration and Runcorn 1→native drag 0→pilot reset 25→OFF 54 pass. |
| Lifecycle / requests | Same actual map/canvas; construction count 2→2 (initial dev StrictMode replay only). Text search preserves camera. Discovery/geocoding blocked and zero attempts recorded; no such external endpoint in network capture. Denied-location fallback and pilot reset pass. |
| Visual / accessibility smoke | **17 real PNGs generated and individually viewed after close**; loaded basemap, desktop/mobile layout, last-item access and visible keyboard focus reviewed. Main additionally viewed six key screenshots independently. |

Key new screenshots (all under this round's evidence directory):

- [1470×672 Booval last item](../../output/workflow/2026-11-04/task007-remediation-01/uat/attempt2-1470x672-Booval-last.png)
- [390×844 Booval last item](../../output/workflow/2026-11-04/task007-remediation-01/uat/attempt2-390x844-Booval-last.png)
- [390×844 Runcorn explanation/reset](../../output/workflow/2026-11-04/task007-remediation-01/uat/attempt2-390x844-Runcorn.png)
- [390×568 short mobile](../../output/workflow/2026-11-04/task007-remediation-01/uat/attempt2-390x568-Booval-last.png)
- [1470×480 short desktop](../../output/workflow/2026-11-04/task007-remediation-01/uat/attempt2-1470x480-Booval-last.png)
- [1470×672 keyboard focus](../../output/workflow/2026-11-04/task007-remediation-01/uat/attempt2-1470x672-keyboard.png)

Actual measurements and assertions are preserved in `uat/attempt2-popup-matrix-return.json`,
`attempt2-regression-return.json`, `attempt2-animation-return.json`,
`attempt2-native-filter-return.json` and `attempt2-filter-count-change-return.json`.
These are current tool returns, not the earlier historical screenshots.

### Browser close, timing and retained attempt history

The shared window began **18:50:15 Brisbane** (08:50:15 UTC); test cutoff was
**19:03:15** and hard cutoff **19:05:15**, reserving **120 seconds** for close/confirmation.

The initial tool connection was reported pending; Main issued a protective stop based
on that outdated observation. It actually returned successfully, and preliminary setup
and page close succeeded. That incomplete attempt remains correctly **Not Verified**
for unexecuted business items in `uat/attempt1-report.md`. No approval/policy rejection
was bypassed. Main resumed the same approved scope as attempt 2, keeping the original
hard deadline; this was not a second product repair round.

After all necessary browser interactions and screenshots, final `browser_close` began
at **19:00:53 Brisbane** (09:00:53 UTC) and returned before **19:01:00**. Main independently
read the original return at **19:01:15**, checked its target provenance and confirmed
`await page.close()` / **`No open tabs`**, over four minutes before the hard deadline.
Screenshots/report review then continued locally; no browser was reopened.

- **Tested-page close: Pass**, supported by
  [original close return](../../output/workflow/2026-11-04/task007-remediation-01/uat/attempt2-browser-close-raw.json)
  and [target/timing context](../../output/workflow/2026-11-04/task007-remediation-01/uat/attempt2-browser-close-context.json).
- **MCP service exit, all Chrome process exit, socket deletion and complete cache/temp
  removal: Not Verified / not asserted.** The page-close return does not establish
  these broader claims. No unknown process or personal browser was terminated.

### Remaining limitations and stop condition

No required remediation acceptance item remains Fail or Not Verified in the final
attempt. Existing fixed-sample/provider-address/junior-program limitations remain;
pins do not establish training/game venues. Browser UAT was Chrome, not other engines,
physical mobile hardware or exhaustive screen-reader testing. These broader checks
were not performed. Existing basemap style/sprite warnings and bundle-size warning
remain; final console has zero errors. Superseded basemap tile requests were cancelled
during rapid camera/viewport changes; key screenshots show the basemap loaded.

Protected data and geocoding policy were unchanged. No deployment, publication,
dependency installation, data refresh or follow-up feature was performed.
**Stop here; do not start TASK-008.**
