# SWM Pirates V2 MVP — Implementation Result

**Status: Partial Pass — G-NAF Not Verified.** Real public-source discovery, address checks, official campus fallback, static export and the local map work. No real G-NAF dataset was available in this worktree; the official download catalogue returned HTTP 403 during this task. No large dataset or paid geocoder was used. Synthetic unit tests verify the adapter rules only.

Tested on 2026-11-14, branch `basketball-v2`, baseline HEAD `ba9ce04219a1851796ced94ddb1fa7e9f8557cd6`, with uncommitted task changes. Final pipeline SHA-256: `3d6f0058f3590c43f50579eb295739a28eb49daf09aaf77c2b31843e7e09defe`. Latest real source check: 19:28 Australia/Brisbane; offline rebuilding preserves original source times.

## Implementation and execution

```sh
npm run pipeline:swm                 # bounded live collection / valid cache reuse
npm run pipeline:swm -- --offline    # no network; rebuild collected sources
npm run pipeline:swm -- --refresh    # refresh the sources
npm run dev -- --host 127.0.0.1      # start the local map
```

The standard-library Python adapter parses the actual SWM affiliated-club section. The eight expected names are a coverage comparison, not manufactured records. Each discovered club receives source attempts, stable IDs and affiliation/junior evidence. Current regular training, historical information and unresolved candidates are kept distinct. Raw pages and local CSV/SQLite indexes stay under ignored `data/v2/private/`; approved local frontend exports are under `public/data/v2/`.

School aliases require official physical-address corroboration before G-NAF or campus fallback. Conflicting addresses and distinct geocoding candidates remain unresolved. The pipeline protects existing outputs on systemic discovery failures. Seven-day caches include failed requests; offline rebuilding retains original timestamps. Current summer-season confirmation expires outside the stated season or when evidence is over 30 days old.

The app loads only V2 JSON, searches club/confirmed venue/suburb, retains clubs without coordinates, opens venue popups from the list and selects clubs from markers. Shared physical points produce one marker. Precision, training sources, coordinate sources, school eligibility and incomplete coverage are visible; V1 provider address data is not imported by the V2 app/map.

## Real data results

| Metric | Actual |
| --- | ---: |
| Associations discovered | 1 |
| Clubs discovered / attempted | 8 / 8 |
| Clubs with confirmed regular training | 3 |
| Unique confirmed training venues | 8 |
| G-NAF matched venues | 0 — Not Verified |
| Verified official campus fallback coordinates | 2 |
| Mapped venues | 2 |
| Review queue items | 22 |

The official names include the area notes for Cannons and Hornets. After removing those area notes for baseline comparison, no club is missing or additional.

| Club | Training result | Location / map result |
| --- | --- | --- |
| Algester Hawks | Yugumbir and Calamvale auxiliary candidates; current official training unverified | No marker |
| Cannons Southside (Calamvale area) | Calamvale hall candidate; undated/current weekly use unverified | No marker |
| River City Hornets (Mt Gravatt area) | Confirmed weekly Hibiscus Stadium and Eagles Sports Complex; official update 2026-11-08 | Both await coordinates; Hibiscus is shared with Rockets |
| Rochedale Wildcats | No confirmed ordinary team training venue; school prospectus requires review | No marker |
| Runcorn Rockets | Six confirmed venues: Calamvale, Hibiscus, Nissan Arena, Runcorn SHS, Stretton Primary and Warrigal Road SS | Runcorn SHS mapped; other five remain unresolved. Calamvale source unavailable, Stretton/Warrigal address conflicts retained |
| Sunnybank Hills Hurricanes | Current 2026/27 team training at Sunnybank Hills State School | Official school campus fallback mapped |
| St. Philomena Seawolves | Competition evidence alone does not establish training; school students only | No marker; restriction retained |
| Dunk Star Basketball Club | Five mixed training/game candidates; Term 3 2026 schedule historical | No marker |

Fallback coordinates are school/campus points, not halls or entrances. Identity, centre code and official physical address were checked against Department of Education sources; the publisher says positional accuracy has not been independently verified. CC BY 4.0 attribution is preserved and displayed.

## Sources and limits

- [SWM official junior club directory](https://www.piratesbasketball.net.au/juniorclub): actual affiliated-club records; the separate competition VENUES list is excluded.
- [Rockets official 2026/27 training page](https://www.rocketsbasketball.com.au/menu5.php?id=946871): weekly team table; temporary school unavailability notices are kept outside the extraction.
- [Hurricanes current registration page](https://www.sunnybankhillshurricanes.com.au/menu5.php?id=946399): current team-training relationship and address.
- [Hornets official training page](https://www.rivercityhornets.com.au/menu5.php?id=942411): dated weekly team-training evidence; no children’s team PDFs fetched.
- [Runcorn SHS contact](https://runcornshs.eq.edu.au/our-school/contact-us), [Sunnybank Hills SS contact](https://sunnybankhillsss.eq.edu.au/our-school/contact-us), Queensland government school-location API layers 5/4: address and campus coordinates.
- [Official school data licence and disclaimer](https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Society/SchoolsAndSchoolCatchments/MapServer/info/iteminfo): CC BY 4.0.
- [Official G-NAF entry](https://www.industry.gov.au/publications/geocoded-national-address-file-g-naf-and-administrative-boundaries-ab-data): no usable local data, catalogue access blocked; licence/package size not verified sufficiently to download.

Full attempted URLs, input hashes and detailed internal reasons remain in ignored private run records; public exports retain minimal source/date/status metadata. Facebook was not authenticated or bypassed. Raw HTML, children’s details, G-NAF source data and private research are absent from frontend exports. Static exports are for local review; publication needs separate authorization.

## Verification

- Real pipeline execution: Pass, successful live collection and cache-based execution; final offline rebuild exit 0.
- V2 tests: Pass, 12 Python and 5 Node tests. Covers parser/current dates, exact/ambiguous matching, invalid coordinates, source gating, shared markers, raw address priority, address conflicts, all-source failure preservation and real JSON/GeoJSON consistency.
- TypeScript / Lint / Build: Pass, each exit 0. Build retains MapLibre's non-blocking large-bundle warning.
- Full inherited `npm test`: Fail — initial run 115 pass, 125 skipped, 3 failures caused by absent V1 private input files (`provider-links-round3.json`, `address-mapping.json`, `venue-geocoding-results.json`). No tests deleted, no private backups accessed.
- Independent QA: Pass, 27/27 real integrity/source checks and 17/17 final repeat-run checks; entity records and IDs stable, GeoJSON/review byte-identical, systemic-failure outputs preserved. Two repair rounds completed; no unresolved QA defects. Evidence: `output/qa/swm-mvp/final-report.md`.
- Browser UAT: Pass for tested desktop 1440×900 and mobile 390×844 real-data flows, including search, list-only clubs, school restriction, 2 markers, source links, two-way map/list navigation and Enter/Escape. Console empty; screenshots captured and visually inspected. A real shared multi-club marker remains Not Verified because no such venue has coordinates in this sample; unit and data tests cover sharing. Dedicated IAB tab 1 viewport reset and close both resolved; Main checked `output/playwright/swm-mvp/closure.json`. No browser-process exit or cache deletion inferred.
- G-NAF real data execution: Not Verified; the 2 map points use government school campus fallback.

## Key changed files

- `scripts/v2/run_pipeline.py`, `tests/v2/test_pipeline.py`: collection, evidence processing, offline geocoder, export and pipeline tests.
- `public/data/v2/{pilot.json,venues.geojson,review.json,summary.json}`: minimized generated data.
- `src/{App.tsx,ClubMap.tsx,pilot.ts,SourceLink.tsx,config.ts,styles.css}`, `index.html`: V2 data integration and UI.
- `tests/pilot.test.mjs`: frontend rules and real generated-data consistency.
- `package.json`, `.gitignore`, `README.md`, `data/v2/README.md`, `docs/V2-SCOPE.md`, this result: commands, private-input exclusions and task documentation.

No automatic commit, push, deployment, Cloudflare project, V1 worktree/tag modification or next-Association work was performed. Final QA/UAT evidence is under `output/qa/swm-mvp/` and `output/playwright/swm-mvp/`.

## Owner-authorized public commit review

Owner accepted Partial Pass and separately authorized the MVP commit/push.
Before staging, public exports were minimized: no contacts, collection attempts,
raw transformations, copied evidence prose, local errors or input manifests.
Full operational records remain in Git-ignored `data/v2/private/runs/`; the
public review queue uses neutral short reasons. Source links, verification
status, original check dates, campus precision, attribution and G-NAF Not
Verified remain public. The source websites were checked for usage statements:
club-site copyright is respected by exporting only minimal factual records in
our own schema, not copying their content or asserting an open licence for it.
Government school data has an explicit CC BY 4.0 licence; its attribution and
accuracy disclaimer remain in the pilot and standalone GeoJSON. No unresolved
privacy or licensing issue was identified for this minimized payload.

The earlier implementation QA/UAT records refer to the pre-minimization build.
Commit review regression checks cover the minimized JSON, unchanged marker and
club relationships, 12 Python / 6 Node tests, TypeScript, Lint and Build.
Historical V1 private-input failures and real G-NAF Not Verified remain unchanged.
