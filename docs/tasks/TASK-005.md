# TASK-005 — Geocode Play On Providers for Map Use

## Status

Complete

## Goal

Geocode the Play On provider addresses produced by TASK-004 so they can later be displayed as markers on the Youth Sports Finder map.

This task is a geocoding proof of concept for the existing 4115 Basketball dataset.

Do not connect the geocoded dataset to the application map yet.

## Context

TASK-004 validated Queensland Government Play On as a strong organisation-discovery source.

The current dataset:

`data/playon/4115-basketball.json`

contains 54 Basketball providers returned by the Play On directory for the configured search around postcode 4115.

Play On addresses should be treated as **provider addresses**, not as guaranteed training or game venues.

The product deliberately does not attempt to maintain changing training locations. Users will later be directed to club websites or Facebook pages for current training and competition details.

The intended flow is:

Play On monthly ingestion
→ provider address
→ geocoding
→ latitude/longitude
→ later website/Facebook enrichment
→ later map integration

## Scope

Implement an offline/batch geocoding step that:

1. reads the existing Play On JSON output;
2. geocodes each provider address;
3. validates the returned location conservatively;
4. records successful coordinates and geocoding provenance;
5. records unmatched or ambiguous addresses without inventing coordinates;
6. writes a separate derived JSON dataset;
7. produces a concise geocoding summary.

Do not modify the original Play On ingestion output.

## Input

Use:

`data/playon/4115-basketball.json`

as the default input.

Keep the input path configurable.

The geocoder must use the Play On address as the source address.

Do not search for training venues, club names, websites, Facebook pages, or alternative addresses.

## Geocoding Provider

For this proof of concept, use the public OpenStreetMap Nominatim search service deliberately and conservatively.

The public service is suitable only for this small proof of concept and must not be treated as the long-term production geocoding backend.

Implementation requirements:

- use the Nominatim `/search` API, not the debugging/details endpoint;
- identify the application with a valid custom `User-Agent`;
- make requests sequentially;
- never exceed 1 request per second;
- cache successful and unsuccessful results locally so the same address is not repeatedly requested;
- make the geocoding endpoint configurable so it can later be replaced by another provider or a self-hosted service;
- do not implement autocomplete, reverse-grid searching, POI harvesting, or any unrelated Nominatim use.

Do not schedule recurring geocoding in this task.

A future production implementation may use a different geocoding provider.

## Query Behaviour

Geocode the full Play On address.

Restrict results to Australia where supported.

Use a small result limit.

Prefer the best result only when it is reasonably consistent with the source address.

The implementation should compare available returned address information against the Play On source data where practical, especially:

- postcode;
- suburb/locality;
- state/country.

Do not accept an obviously conflicting result merely because it is the first search result.

If no acceptable result exists, mark the provider as unmatched.

If multiple plausible results cannot be distinguished safely, mark the provider as ambiguous rather than selecting arbitrarily.

Do not fall back to searching by organisation name.

## Local Cache

Add a local geocoding cache under an appropriate path such as:

`data/geocoding/cache.json`

The exact path may be adjusted if another project convention is cleaner.

Cache entries should be keyed deterministically from the normalized source address.

The cache must allow repeated development/test runs without repeatedly calling Nominatim for addresses that have already been attempted.

Cache both:

- successful results;
- explicit unmatched results.

Do not cache transient network/server failures as permanent unmatched results.

The cache is derived data and must not modify TASK-004 source records.

## Output

Write a separate derived dataset such as:

`data/derived/4115-basketball-geocoded.json`

Each output record should preserve the original Play On provider information and add geocoding information.

A conceptually suitable shape is:

```ts
type GeocodedPlayOnProvider = PlayOnProvider & {
  geocode: {
    status: 'matched' | 'unmatched' | 'ambiguous'
    latitude?: number
    longitude?: number
    matchedAddress?: string
    source: 'osm-nominatim'
    sourceLastChecked: string
  }
}
```

The exact TypeScript/JSON shape may be adjusted if a simpler structure fits the project better.

Requirements:

- preserve the Play On provider `id`;
- preserve Play On provenance;
- keep geocoding provenance separate from Play On provenance;
- do not overwrite the Play On address with the geocoder's formatted address;
- do not invent latitude or longitude when no acceptable result exists.

## Address Semantics

The coordinates represent the geocoded **Play On provider address**.

They must not be labelled in code or data as:

- training venue;
- game venue;
- home court;
- activity location.

Future UI can simply label this value as `Address` and direct users to the club website/Facebook page for current activity locations.

## Resumability

The command should be safe to interrupt and rerun.

Use the local cache so completed addresses do not need to be queried again.

Do not require all 54 providers to succeed before writing useful derived output.

A transient failure should be reported clearly and should not corrupt existing cache/output data.

Use atomic writes where practical.

## CLI

Add one documented command, for example:

`npm run geocode:playon`

The exact command name may be adjusted if another naming convention fits the project better.

Useful options may include:

- input path;
- output path;
- cache path;
- geocoding endpoint;
- user-agent/contact configuration if required.

Keep the default command simple.

Do not add a scheduler.

## Tests

Tests must not call the live Nominatim service.

Use mocked/synthetic geocoder responses.

Cover at least:

- successful address match;
- postcode/locality validation;
- clearly conflicting result rejected;
- no-result response;
- ambiguous results;
- malformed geocoder response;
- transient HTTP/network failure;
- cache hit avoiding a network request;
- unmatched result cache behaviour;
- deterministic address normalization/cache key;
- preservation of Play On provider fields and provenance;
- geocoding provenance kept separate from Play On provenance.

Existing TASK-003 and TASK-004 tests must continue to pass.

## Live Verification

Perform one live proof-of-concept run against the current 54-provider TASK-004 dataset.

Respect the Nominatim public-service usage policy throughout the run.

Record:

- total providers;
- matched count;
- unmatched count;
- ambiguous count;
- cache hits;
- live requests;
- any rejected conflicting results;
- any source addresses that geocode unexpectedly.

Manually inspect at least these known records:

- Algester Hawks Basketball Club Inc.
- Runcorn Rockets Basketball Club Inc.
- Cannons Southside Inc
- River City Hornets Basketball Club Inc.
- Sunnybank Hills Hurricanes Basketball Club Incorporated

The purpose is to verify address-to-coordinate quality, not to search for training venues.

## Engineering Constraints

Do not:

- connect the derived data to `ClubMap`;
- change existing map behaviour;
- remove the TASK-003 Overpass implementation;
- change TASK-004 Play On ingestion behaviour;
- modify `data/playon/4115-basketball.json`;
- search for club training locations;
- search by club name when address geocoding fails;
- add website enrichment;
- add Facebook enrichment;
- add fuzzy organisation matching;
- add a database;
- add a backend;
- add scheduled jobs;
- geocode the whole Queensland Play On directory;
- use browser automation for geocoding;
- add unrelated refactoring.

Keep this task focused on turning the existing Play On provider addresses into responsibly validated map coordinates.

## Acceptance Criteria

The task is complete when:

- one documented command geocodes the current Play On dataset;
- source Play On JSON remains unchanged;
- coordinates are stored in a separate derived dataset;
- successful geocodes preserve provider identity and both source provenances;
- conflicting results are not silently accepted;
- unmatched/ambiguous providers remain representable without fake coordinates;
- requests are sequential and rate-limited;
- a local cache prevents repeated geocoding of previously attempted addresses;
- transient failures are distinguished from genuine unmatched results;
- offline unit tests pass;
- existing tests, TypeScript checks, linting, and production build pass;
- a live 54-provider proof-of-concept run is documented;
- existing application behaviour remains unchanged.

## Completion Handoff

Append an `Implementation Result` section containing:

### Status

Complete or Blocked.

### Changed

Files, scripts, dependencies, npm commands, cache/output files, and configuration added or changed.

### Geocoding Behaviour

Document:

- endpoint used;
- query parameters;
- User-Agent behaviour;
- request rate;
- cache design;
- address normalization;
- result-selection/validation rules;
- how matched, unmatched, ambiguous, and transient failures are represented.

### Live Results

Report:

| Metric | Result |
| --- | --- |
| Providers | ... |
| Matched | ... |
| Unmatched | ... |
| Ambiguous | ... |
| Cache hits | ... |
| Live requests | ... |

Also record notable geocoding-quality observations.

### Spot Checks

Record the returned location/address quality for:

- Algester Hawks;
- Runcorn Rockets;
- Cannons Southside;
- River City Hornets;
- Sunnybank Hills Hurricanes.

Do not substitute training venues for Play On addresses.

### Verification

Record commands and results for:

- geocoding command;
- tests;
- TypeScript/check;
- lint;
- production build;
- `git diff --check`.

### Remaining Issues

Document what is still required before the derived Play On data is connected to the map.

Explicitly note that the public Nominatim service is not being selected as the permanent production geocoding infrastructure.

Do not integrate the derived data into the map and do not create TASK-006.

## Implementation Result

### Status

Complete.

### Changed

- Added `scripts/geocode-playon.mjs`: configurable standalone CLI and local process lock, source/output/cache path protection, clear failure exit and summary.
- Added `scripts/geocoding/geocode.mjs`: address normalization, response validation, conservative selection, persistent cache and resumable batch processing. Reuses TASK-004's existing atomic JSON writer without modifying it.
- Added `tests/geocoding.test.mjs`: 11 offline synthetic tests. Existing TASK-003/TASK-004 tests remain unchanged.
- Added `npm run geocode:playon` to `package.json` and documented command/options, usage policy, attribution, cache and recovery in `README.md`. No dependencies added or changed for TASK-005.
- Added `data/geocoding/cache.json`: 40 unique normalized address attempts, including empty responses and ambiguous candidates.
- Added `data/derived/4115-basketball-geocoded.json`: all 54 original providers plus separate geocoding information.
- Updated this task's status and Completion Handoff. Existing unrelated working-tree changes were preserved. No application files, TASK-004 ingestion modules or source JSON were changed by this task. No enrichment, map integration or TASK-006 was added.

### Geocoding Behaviour

- Endpoint: `https://nominatim.openstreetmap.org/search`. Configurable via `--endpoint` or `NOMINATIM_ENDPOINT`; replacement must speak the Nominatim search response format. The CLI only accepts an HTTP(S) `/search` endpoint without query, credentials or fragment.
- Parameters follow the [Nominatim Search API](https://nominatim.org/release-docs/latest/api/Search/): `q=<unaltered full Play On address>`, `format=jsonv2`, `addressdetails=1`, `countrycodes=au`, `limit=5`, `accept-language=en`. No organisation names, alternative addresses, details endpoints or other searches are used.
- Default User-Agent: `YouthSportsFinder-ProviderAddress-POC/1.0 (+https://github.com/dairuifromcd/youth_sports_finder)`. `--user-agent` or `NOMINATIM_USER_AGENT` may supply another identifying application/contact value.
- Requests run sequentially on one process/machine, with a 1,100 ms wait before each request, after the previous response has completed. Each request times out after 30 seconds. No automatic retries or redirects. A local lock prevents overlapping CLI runs in this checkout. This manual small proof of concept follows the [public usage policy](https://operations.osmfoundation.org/policies/nominatim/); it must not be scheduled or distributed across machines.
- Cache keys are SHA-256 of NFKC-normalized, lowercase source addresses with commas/whitespace collapsed. House numbers and unit separators remain significant. Shared addresses reuse a response without merging provider identities. Cache version and endpoint are validated; a different endpoint requires a separate cache. Corrupt cache data fails explicitly.
- The cache retains minimal candidate address evidence and numeric coordinates, original query-address normalization, and geocoding check time. Valid empty responses and all ambiguous/rejected candidates are cached, allowing offline reselection if validation changes. No automatic expiry. Network/HTTP/JSON/schema failures are never cached as unmatched.
- Matching requires returned Australia and Queensland evidence; source postcode and locality must agree when supplied. Locality comparison prefers suburb, then town/village/locality/district/city, so a broader city match cannot hide a conflicting suburb. Street names and supplied house numbers must agree. A few exact abbreviations are normalized (`Rd`, `St`, `Ave`, `Dr`, `Mt`, `Qld`); this is not fuzzy organisation matching. For `unit 1/74` formatting, the building number is the address comparison level; no unit precision is claimed.
- Missing required returned evidence is rejected conservatively. House-number ranges must match exactly; a street centroid is rejected when the source supplies a house number. Street-only input may match at explicitly recorded `precision=street`; numbered matches use `precision=house-number`. These precision labels describe agreement with geocoder evidence, not independently verified spatial accuracy.
- One distinct plausible coordinate pair is `matched`. Identical coordinate pairs collapse; multiple distinct plausible pairs are `ambiguous`, regardless of search ranking. None is `unmatched`, with `no-results` or `no-consistent-result` reason. Rejected formatted addresses and reasons are retained for review. Ambiguous candidate coordinates are evidence only; no selected `geocode.latitude`/`longitude` is emitted.
- Play On provider fields, ID, address, source URL and check time are preserved verbatim. Nested `geocode` contains `source=osm-nominatim`, endpoint, its own check time, `addressRole=provider-address`, status and attribution. Cached results keep their original check time. Source addresses are never overwritten.
- Transient/service/malformed failures produce `status=error` with retryable reason and attempt time; further uncached records become `pending` without an invented check time. Cached records still resolve. Neither status has selected coordinates. The CLI exits nonzero and writes useful partial output, without caching these failures. Missing source addresses are explicitly unmatched without a network request or invented geocoder check time.
- Each completed cache response is written atomically before proceeding. Output is atomically replaced at the end, including on a handled request failure. Interruption preserves completed cache work and any previous derived output; rerun rebuilds the full output. A forced interruption can leave `data/geocoding/.geocode.lock`; remove it only after checking its recorded PID is no longer running.
- Cache and output carry [© OpenStreetMap contributors / ODbL attribution](https://www.openstreetmap.org/copyright).

### Live Results

Successful live response timestamps: **2026-09-12T03:27:24.548Z–2026-09-12T03:28:40.934Z**. Input was the existing TASK-004 dataset, not a refreshed ingestion.

| Metric | Result |
| --- | --- |
| Providers | 54 |
| Matched | 19 |
| Unmatched | 27 |
| Ambiguous | 8 |
| Cache hits | 14 during first successful run |
| Live requests | 40 during first successful run |
| Rejected candidate results | 38 across provider records, including reused-address evidence |
| Errors / pending after successful run | 0 / 0 |
| Cache-only verification rerun | 54 cache hits, 0 live requests; identical outcomes |

- The first sandboxed invocation failed at its initial network request (`fetch failed`), wrote one error and 53 pending providers, and cached no failure. Rerunning with network permission completed the live batch above. The failed local attempt is separate from the 40 successful service requests.
- Sixteen matches have house-number precision; three have street precision: Klumpp Road (Rochedale Wildcats), Dixon Street (West Brisbane Falcons), and School Road (Capalaba). These street coordinates are coarse provider-address locations.
- Two source addresses returned no results: `unit 1/74 Sunbeam Street, Annerley Queensland 4103` and `Corner Of Mt Cotton Rd and Degen Rd, Capalaba Queensland 4157`. No simplified or alternative query was attempted.
- Many numbered addresses returned only road geometry. This explains much of the 27 unmatched providers, including all seven providers at `2A Ross Llewellyn Drive`. They retain their source address without selected coordinates.
- Explicit locality conflicts were rejected: Springfield Lakes for the Springfield Central source address, and Toowong for the Auchenflower Dixon Street addresses. Jimboomba's South Street candidates lacked the required local locality evidence. No postcode/state/country conflict was observed in the returned evidence; synthetic tests verify those rejection paths.
- Eight ambiguous providers use four addresses: 12 Monaco Street (two plausible points), 56 Zahel Street (three plausible points shared by five providers), Degen Road (two road points), and 151 Flockton Street (school/church points). The command does not select by provider name or arbitrarily choose a result.
- Number-range differences were rejected, including `300 Mount Cotton Road` versus returned `278-300`, and `1 Beveridge Road` versus `1-15`. This intentionally sacrifices recall rather than silently broadening the source address.
- Returned administrative labels sometimes include Logan City and Brisbane together. The algorithm uses the specific suburb plus state/country/postcode, not these broad labels as proof of an exact location.

### Spot Checks

Manually compared the saved candidate evidence against each original provider address; no venue searches were performed.

| Provider | Source address | Returned evidence and outcome |
| --- | --- | --- |
| Algester Hawks Basketball Club Inc. | 31 Endiandra Street, Algester Queensland 4115 | Endiandra Street, Algester, Queensland 4115; no house number. **Unmatched**; street point rejected and no selected coordinates stored. |
| Runcorn Rockets Basketball Club Inc. | 132 Hill Road, Runcorn Queensland 4113 | Runcorn State High School, 132 Hill Road, Runcorn, Queensland 4113. **Matched**, latitude -27.5938177, longitude 153.0763239. Source address components agree; the school label does not verify training arrangements. |
| Cannons Southside Inc | 15 Algester Road, Algester Queensland 4115 | DAC Constructions, 15 Algester Road, Algester, Queensland 4115. **Matched**, latitude -27.6050099, longitude 153.0423976. The business label is unexpected, but the full address agrees. This is an address match, not organisation identity or venue confirmation. |
| River City Hornets Basketball Club Inc. | 90 Klumpp Road, Upper Mount Gravatt Queensland 4122 | Klumpp Road, Upper Mount Gravatt, Queensland 4122; no house number. **Unmatched**; no selected coordinates. Shared source address is cached once for three separate providers. |
| Sunnybank Hills Hurricanes Basketball Club Incorporated | 16 Lorikeet Way, Crestmead Queensland 4132 | Lorikeet Way, Crestmead, Queensland 4132; no house number. **Unmatched**; no selected coordinates. Crestmead remains the source locality; the club name was not used to substitute Sunnybank Hills. |

### Verification

- `npm run geocode:playon` — successful live 54-provider run after network permission, followed by a successful entirely cached rerun (zero requests).
- `npm test` — **29 passed**, comprising 11 new offline geocoding tests and all 18 existing tests. Tests cover matching, postcode/locality and other conflicts, missing evidence, no results, ambiguity, malformed responses, HTTP 429/503, network/JSON failures, successful/unmatched/ambiguous cache reuse, deterministic keys, provenance preservation, sequential throttling, partial failure/resumption, interrupted progress and invalid cache/input handling. No test calls live Nominatim.
- `npm run check` — passed.
- `npm run lint` — passed.
- `npm run build` — passed; existing Vite bundle-size warning remains. No geocoding data or code is imported into the React app.
- `git diff --check` — passed.
- SHA-256 before/after audit — original Play On JSON, existing application source files and TASK-004 ingestion files unchanged. Source JSON digest: recorded by the verification command; all comparisons passed.
- Derived-data audit — all 54 records preserve every original provider field and both original provenance values exactly. All nonmatched records lack selected latitude/longitude. Cached rerun preserves original geocoding timestamps and outcomes.

### Remaining Issues

- Before map integration, define UI treatment for unmatched/ambiguous records, coarse street precision, attribution and overlapping provider-address coordinates. Display these as provider addresses; matched coordinates do not verify club occupancy or training/game venues.
- House-number coverage and multi-feature ambiguity limit usable matches. A later task can evaluate improved address evidence or another geocoder; no alternate queries, website/Facebook enrichment or organisation matching were introduced here.
- Cache refresh/invalidation and cross-machine rate coordination are not implemented. Keep this manual proof of concept on one machine. Forced termination requires stale-lock cleanup as documented.
- The public Nominatim service is **not selected as permanent production geocoding infrastructure**. A future recurring ingestion/geocoding process needs a separately assessed provider or self-hosted service and its own operational policy.
- Derived data remains disconnected from the map. TASK-004 ingestion and source data remain unchanged.
