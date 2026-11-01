# TASK-004 — Play On Basketball Ingestion Proof of Concept

## Status

Complete

## Goal

Build a small ingestion proof of concept that retrieves Basketball activity providers near postcode 4115 from the Queensland Government Play On! Activity Provider Directory and converts them into normalized local JSON data.

This task validates Play On as an organisation-discovery source.

Do not connect Play On data to the map yet.

## Context

TASK-003 demonstrated that OpenStreetMap/Overpass is useful for geographic facilities but has poor coverage of actual junior basketball organisations.

A ground-truth review around postcode 4115 found multiple real junior basketball clubs that are represented in the Play On directory but are not reliably discoverable through OSM.

The intended long-term model is:

Play On
→ organisation discovery
→ normalization and provenance
→ later enrichment from associations, club websites, Facebook and geospatial sources
→ application data

Play On is expected to be synchronised infrequently, approximately once per month, rather than queried for every user map interaction.

## Source

Use the public Queensland Government Play On! Activity Provider Directory:

`https://www.qld.gov.au/recreation/sports/funding/playon/find-provider`

Use its public search/pagination mechanism.

For this proof of concept, search for:

* activity: Basketball
* location/postcode: 4115
* radius: approximately 20 km

Keep these values configurable rather than embedding them deeply in parsing logic.

Do not crawl unrelated Play On pages or the entire Queensland directory.

## Implementation Approach

Implement a Node-based ingestion command that:

1. Requests the Play On search results.
2. Follows result pagination when required.
3. Parses provider records from the returned HTML.
4. Normalizes the required fields.
5. Deduplicates records.
6. Writes the resulting dataset to a local JSON file.
7. Produces a short ingestion summary.

The ingestion should run independently of the React application.

Use Node's existing capabilities where practical.

One lightweight HTML parsing dependency is acceptable if it materially improves parser reliability.

Do not use browser automation such as Playwright for the ingestion implementation.

## Output

Create a normalized output such as:

`data/playon/4115-basketball.json`

The exact path may be adjusted if an existing project convention is more appropriate.

Each record should contain only information needed for organisation discovery.

Suggested shape:

```ts
type PlayOnProvider = {
  id: string
  name: string
  activities: string[]
  address?: string
  suburb?: string
  postcode?: string

  source: 'qld-play-on'
  sourceUrl: string
  sourceLastChecked: string
}
```

If the upstream page exposes a stable provider identifier, use it.

If no stable identifier exists, create a deterministic identifier from normalized provider information and document that limitation.

Do not invent missing values.

## Data Minimisation

Do not ingest or persist:

* personal contact names;
* email addresses;
* phone numbers;
* logos;
* photographs;
* descriptive text copied from providers.

Website and Facebook enrichment are not part of this task.

Those fields will be handled separately from their appropriate sources.

## Provenance

Every record must retain enough provenance to establish where it came from.

At minimum record:

* source = `qld-play-on`
* source URL or query URL
* date/time last checked

Keep source-derived data distinguishable from information that may later be added from other sources.

## Request Behaviour

This is a low-frequency ingestion process, not a realtime API client.

Keep requests conservative:

* fetch pages sequentially;
* avoid concurrent bulk requests;
* do not repeatedly request the same page;
* stop pagination when there are no more results;
* guard against pagination loops;
* fail clearly if the directory structure cannot be parsed.

A small delay between pagination requests is acceptable.

Do not implement a scheduler. The command will be run manually for this proof of concept.

## Parser Design

Keep fetching and HTML parsing separate enough that parser behaviour can be tested without calling the live Queensland Government website.

Do not tightly couple parsing to unrelated page content.

If required fields cannot be identified for a result, skip or flag that result rather than fabricating data.

The parser should tolerate optional fields being absent.

## Ground-Truth Comparison

After ingestion, compare the resulting provider names against this known South West Brisbane sample:

* Algester Hawks Basketball Club
* Runcorn Rockets
* Cannons Southside
* River City Hornets
* Rochedale Wildcats
* Sunnybank Hills Hurricanes
* Dunk Star Basketball Club
* St Philomena Seawolves

Name variations are expected.

This list is for coverage evaluation only.

Do not hard-code these organisations into the ingested dataset.

The ingestion must reflect what Play On actually returns.

## Coverage Report

After the live verification run, include in the Completion Handoff:

* total Basketball providers returned;
* which ground-truth organisations were matched;
* which were not matched;
* name variations observed;
* obvious irrelevant results;
* pagination behaviour;
* any fields that proved unreliable.

Do not silently modify the parser just to force the ground-truth list to match.

We are evaluating the source as well as the implementation.

## Tests

Add tests covering at least:

* parsing multiple provider records;
* missing optional address fields;
* multiple activities;
* duplicate providers;
* empty results;
* malformed/unexpected result markup;
* pagination termination if pagination logic can be tested independently.

Tests should use local/synthetic HTML fixtures rather than depending on the live Play On site.

Do not store real provider email addresses or phone numbers in test fixtures.

## Engineering Constraints

Do not:

* connect Play On results to `ClubMap`;
* remove the existing Overpass implementation;
* create a backend service;
* add a database;
* implement scheduled jobs;
* scrape the whole Queensland directory;
* add club website enrichment;
* add Facebook enrichment;
* perform automatic entity matching with OSM;
* copy provider email or phone details;
* redesign the existing React application.

This task is specifically an ingestion and source-quality proof of concept.

## Acceptance Criteria

The task is complete when:

* a single documented command can perform the 4115 Basketball ingestion;
* the Play On search results are retrieved without browser automation;
* all relevant result pages are handled;
* provider records are converted into normalized JSON;
* contact email and phone data are not persisted;
* duplicate records are handled;
* provenance is preserved;
* parser tests pass without internet access;
* a live ingestion run succeeds or any source-side failure is clearly documented;
* the ground-truth comparison is recorded;
* TypeScript/checking, linting and existing application tests still pass;
* the existing application behaviour is unchanged.

## Completion Handoff

Append an `Implementation Result` section containing:

### Status

Complete or Blocked.

### Changed

Files, scripts, dependencies and npm commands added or changed.

### Source Behaviour

Document:

* actual Play On query URL/parameters used;
* pagination mechanism discovered;
* relevant HTML structure assumptions;
* whether any stable upstream provider identifier exists.

### Ground-Truth Results

Provide a simple table:

| Ground-truth organisation | Found  | Returned name |
| ------------------------- | ------ | ------------- |
| Algester Hawks            | Yes/No | ...           |
| Runcorn Rockets           | Yes/No | ...           |
| ...                       | ...    | ...           |

Also report the total provider count.

### Data Quality Observations

Record:

* useful fields;
* missing fields;
* misleading addresses;
* naming inconsistencies;
* irrelevant results;
* anything important for future entity matching.

### Verification

Commands run and results, including:

* ingestion command;
* tests;
* TypeScript/check;
* lint;
* production build or existing project verification.

### Remaining Issues

Known limitations and recommended next step.

Do not integrate Play On data into the map and do not create TASK-005.

## Implementation Result

### Status

Complete.

### Changed

* `scripts/ingest-playon.mjs`: standalone Node CLI, configurable activity/postcode/locality/radius/output, official locality lookup, and concise JSON summary.
* `scripts/playon/parse.mjs`: source-specific HTML parsing, normalized discovery fields, deterministic IDs, deduplication, and pagination validation.
* `scripts/playon/ingest.mjs`: sequential requests, timeouts, loop/repeated-page detection, ten-page guard, and atomic JSON output after successful ingestion.
* `data/playon/4115-basketball.json`: 54 live source-derived providers; no manually inserted ground-truth records.
* `tests/playon.test.mjs` and `tests/fixtures/playon-providers.html`: 11 offline tests with synthetic HTML and synthetic contact values to verify their exclusion.
* `package.json` / `package-lock.json`: added `npm run ingest:playon` and development dependency `node-html-parser` 9.0.4. Existing `npm test` also runs the new tests.
* `eslint.config.js`: Node globals for ingestion scripts. `README.md`: command, options, output, request limits, and identity limitations.
* No application source files or Overpass behavior were changed by TASK-004. Play On JSON is not connected to the map. No scheduler, backend, database, enrichment, or next task was added.

### Source Behaviour

* Source: [Play On Activity Provider Directory](https://www.qld.gov.au/recreation/sports/funding/playon/find-provider). The public form submits a GET to the same page, with server-rendered provider cards; browser automation is not needed.
* Actual initial query: [Basketball within 25 km of Algester, postcode 4115](https://www.qld.gov.au/recreation/sports/funding/playon/find-provider?name=&activity=Basketball&locality=ALGESTER&location=4115&latitude=-27.61273&longitude=153.03255&distance=25).
* Parameters: `name=`, `activity=Basketball`, `locality=ALGESTER`, `location=4115`, `latitude=-27.61273`, `longitude=153.03255`, `distance=25`. The public radius options are 10/25/50/100/250/1000 km, so 25 km is the closest supported option to the requested approximate 20 km.
* Coordinates are resolved from the page's [public locality lookup](https://www.qld.gov.au/__data/assets/file/0019/135343/qld_locality.json). Both ALGESTER and PARKINSON map to 4115. With no explicit `--locality`, the command chooses the first matching locality alphabetically and reports it. This is a locality-centered search, not a postcode-boundary or postcode-centroid search.
* Results are in `#qg-search-results .card`, with `h3.card-title`, and `dl dt` / adjacent `dd` fields labelled `Address:` and `Activities:`. Activities are separate `li` elements. The parser ignores the large autocomplete list and all other card fields; it never copies entire cards or stores response HTML.
* Pagination uses `.pagination .next a[href]`, preserving the search parameters and adding `page=2`, then `page=3`. The live run retrieved 20, 20, and 14 cards; page 3 had no Next link. Requests were sequential, with 500 ms between result pages. No page was requested twice within the ingestion run.
* Empty results use an empty results container plus a separate `.qg-pagination-count` notice beginning `No organisations found`. This was verified with a scoped synthetic nonmatching organisation-name search. A missing container or unexplained empty container fails clearly instead of writing a false empty dataset.
* Pagination must remain on the same directory path with identical search parameters and advance one page. Repeated pages, changed scope, invalid markup, and the ten-page safety limit fail before output is replaced. There are no automatic retries.
* No stable upstream provider identifier was exposed in the inspected cards. IDs are `qld-play-on:` plus 24 hexadecimal characters from SHA-256 of a normalized name/address pair. Case, whitespace, and punctuation variations do not alter the ID; material name/address changes can. Activities are not part of the ID. Duplicates merge activity lists and retain the first page's provenance; separate names at one address remain distinct.
* Every record contains `source=qld-play-on`, its result-page URL, and the run's UTC `sourceLastChecked` timestamp. The only other fields are ID, organisation name, activities, and optional address/suburb/postcode. Suburb/postcode are extracted only from a recognizable final address line; no missing values are invented.

### Ground-Truth Results

Live check: **2026-09-11T13:24:05.538Z**. **54 providers**, 54 unique IDs, zero duplicate records removed, zero skipped cards.

| Ground-truth organisation | Found | Returned name |
| --- | --- | --- |
| Algester Hawks Basketball Club | Yes | Algester Hawks Basketball Club Inc. |
| Runcorn Rockets | Yes | Runcorn Rockets Basketball Club Inc. |
| Cannons Southside | Yes | Cannons Southside Inc |
| River City Hornets | Yes | River City Hornets Basketball Club Inc. |
| Rochedale Wildcats | Yes | Rochedale Wildcats Basketball Club INC |
| Sunnybank Hills Hurricanes | Yes | Sunnybank Hills Hurricanes Basketball Club Incorporated |
| Dunk Star Basketball Club | Yes | Dunk Star Junior Basketball Club |
| St Philomena Seawolves | No confirmed match | St Philomena School — possible match; the source does not identify the Seawolves alias |

Seven clear name matches and one possible school-level match. The school record is preserved as returned, with Basketball and Netball activities, and is not renamed or automatically linked to Seawolves. This comparison is a manual source-coverage review, not an input to ingestion or automatic entity matching.

### Data Quality Observations

* Names and structured activity lists are useful organisation-discovery signals. All 54 returned providers explicitly list Basketball. Some also list Wheelchair Basketball or unrelated activities; all supplied activities are retained.
* All 54 records supplied an address with a parseable suburb and postcode in this run. Some lack street numbers, for example Rochedale Wildcats (`Klumpp Road`) and West Brisbane Falcons (`Dixon Street`). Address presence is not proof of a training venue.
* Several distinct clubs share association/facility addresses: Dunk Star, River City Hornets and South Western Metro at 90 Klumpp Road; multiple clubs at 56 Zahel Street; and seven Ipswich-area clubs at 2A Ross Llewellyn Drive. These were deliberately not merged by address alone.
* Sunnybank Hills Hurricanes is listed in Crestmead; Carina Cobras is listed in Wynnum. These may be administrative/contact locations rather than places where families attend training. No geocoding or venue verification was performed, and addresses must not be treated as verified map coordinates later.
* Naming varies in capitalization and legal suffixes (`Inc.`, `INC`, `Incorporated`), and Dunk Star includes `Junior`. `HORNETS BASKETBALL CLUB INC` also appears separately from River City Hornets; substring matching would be unsafe.
* The source is broader than a directory of dedicated basketball clubs: schools, community organisations, Boys' Brigade, SCALA Indigenous Corporation, and Punjabi community sports clubs are included. Their listed Basketball activity makes them valid source results, but their suitability as publicly accessible junior basketball clubs remains unverified. None was removed merely to improve the ground-truth comparison.
* The school entry for St Philomena is a useful possible match but requires later independent confirmation. The ingestion does not infer junior programs from names or voucher registration.
* The radius is the source's locality-centered filter. The proof of concept retains what that filter returns and makes no claim that the displayed address is a verified venue or that source coverage is complete.

### Verification

* `npm run ingest:playon` — succeeded after allowing network access outside the sandbox; fetched one official locality lookup and three scoped result pages, then wrote the normalized dataset. No browser automation was used.
* `npm test` — 18 tests passed (11 new Play On tests plus 7 existing application tests), without live network calls. Coverage includes multiple records/activities, missing optional fields, contact exclusion, deterministic identity/deduplication, empty results, malformed cards, wrong activity, scoped pagination, loop/repeated-page/limit handling, failed requests, locality selection, and JSON writing.
* `npm run check` — passed.
* `npm run lint` — passed.
* `npm run build` — passed; the existing Vite main-bundle size warning remains. Generated application asset hashes are unchanged from TASK-003, confirming that the ingestion is not included in the application bundle.
* `git diff --check` — passed.
* Output audit — passed: 54 unique IDs; only the nine allowed discovery/provenance keys; no email, `mailto:` or `tel:` content; zero missing address/suburb/postcode fields. Synthetic tests also prove phone/contact-name/website fields are excluded.

### Remaining Issues

* HTML selectors and field labels are source-specific and may need maintenance if the directory changes. Failures preserve the last successful output rather than silently replacing it with partial data.
* Deterministic name/address IDs are not persistent upstream IDs. Future source corrections may require reconciliation; this task adds no matching framework.
* The 25 km source option and Algester locality center should remain explicit when comparing future coverage. Changing the selected locality or radius can change results.
* Recommended next step: independently confirm ambiguous organisation aliases and whether listed addresses represent venues before considering map integration. Contact collection and website/Facebook enrichment were not performed.
