# TASK-006 — Queensland Government Address Geocoding Benchmark

## Status
**Current (2026-11-01): Complete — Stage B validation and comparison implemented against the owner's corrected full government CSV. All 54 providers reconcile; 25 accepted provider-address matches. The app remains unchanged.**

The original Stage A Implementation Result below is retained as a historical record. Its status (`Stage A complete — awaiting official output CSV`) described the state **before** the first manual government submission and is superseded by this dated update. Do not rewrite that record as though the first submission succeeded.

## Owner Summary

**Why:** TASK-005 geocoded only 19 of 54 Play On Basketball providers around postcode 4115 using public Nominatim. We need to test a more suitable Australian address source before integrating the data into the map.

**This task will:** Produce a small, reproducible benchmark using the Queensland Government's official batch address geocoder. Generate an upload-ready CSV and a separate record mapping; when the official result CSV is available, validate, reconcile and compare it with TASK-005.

**This task will NOT:** Change the website, change Play On ingestion, guess locations, import national G-NAF, or build a production geocoding service.

**Owner check:** Review the 54-provider coverage results and spot-check five known addresses. A manual upload to the government geocoder website may be needed; report that as a blocker rather than fabricating results.

## Background and Evidence

- TASK-004 source: `data/playon/4115-basketball.json` (54 providers, ~40 unique normalized addresses).
- TASK-005 output: `data/derived/4115-basketball-geocoded.json` (19 matched, 27 unmatched, 8 ambiguous), plus existing Nominatim cache.
- Queensland Government's official geocoder explicitly accepts address CSV batches of up to 5,000 records and provides CSV results. Follow the official **two-column input** convention: street address and locality. Automatic mode accepts only a single high-confidence candidate; ambiguous addresses need review.
- The public Queensland Property Location Service is described as free, but published PLSplus materials conflict on authentication. **Do not assume an unattended REST API is accessible** or implement undocumented endpoints in this task.

Official documentation:

- https://www.qld.gov.au/environment/land/title/addressing/geocoder
- https://geocode.information.qld.gov.au/
- https://www.data.qld.gov.au/dataset/property-location-service

## Goal

Determine whether the Queensland Government address geocoder materially improves reliable address-to-coordinate coverage of this fixed Play On sample, while preserving evidence and keeping the workflow small.

## Scope: Stage A — Prepare the Official Batch

Implement a small Node.js CLI, consistent with the existing repository conventions, e.g.:

`npm run benchmark:qld-geocoder -- --export`

It must:

1. Read the existing TASK-004 source JSON; fail clearly if the expected structure is absent.
2. Deduplicate by normalized **source address**, not by provider name. Preserve separate provider identities for shared addresses.
3. Export an upload-ready CSV under `data/benchmarks/qld-geocoder/` with precisely the fields required by the Queensland Government's documented address-batch format (street address, locality; include postcode in locality where known). Do not insert commas within the data fields.
4. Generate a sidecar JSON linking each exported row/unique address to all original provider IDs, exact Play On address, and relevant source metadata. Use deterministic row ordering and keys.
5. Avoid substituting club name, training venue, or an inferred alternative address. Flag any source string that cannot be reliably split into the documented address/locality fields for manual review instead of silently dropping or modifying it.
6. Document the exact manual procedure: visit the official geocoder, choose **Address**, **Automatic** batch mode, upload the generated CSV, and save the government **CSV** output into a stated local input path.

Do **not** automatically upload anything or automate the government website. Manual upload is an intentional, bounded step.

## Scope: Stage B — Validate and Compare the Returned Results

When a real official government result CSV is available:

1. Inspect its actual column schema and use it as the source of truth. If no real result CSV is present, do not guess the schema or manufacture live outcomes. It is acceptable to leave the import stage explicitly pending.
2. Implement a small import/compare CLI only once the schema is known; keep it independent of React and TASK-005's existing geocoding implementation.
3. Link results back to source addresses using stable row/unique-ID evidence. **Do not trust output ordering alone**, since unresolved addresses may be omitted. Fail rather than misassociate an output coordinate to the wrong provider.
4. Accept coordinates only when returned address components and confidence/geocode type support the source address. Treat location/suburb, postcode, street and house number mismatches as reasons for rejection/manual review. Distinguish a property/building/access-point location from a temporary or coarse point. Do not silently treat all geocode types as equally precise.
5. Preserve all 54 providers in the comparison, including those without usable coordinates. Keep Queensland results separate from TASK-005's original Nominatim output and preserve provenance (source, URL, checked date, returned address, confidence, geocode type if provided).
6. Compare `matched / unmatched / ambiguous / needs-review` against the TASK-005 baseline. Include the number of additional trustworthy matches, and any cases where Queensland and Nominatim disagree. Never claim a target match rate was achieved without result evidence.
7. Store only the minimal derived evidence needed for this benchmark, with appropriate Queensland Government attribution.

## Mandatory Spot Checks

Report the exact Play On source address and Queensland result for:

- Algester Hawks Basketball Club Inc. — 31 Endiandra Street, Algester QLD 4115
- Runcorn Rockets Basketball Club Inc. — 132 Hill Road, Runcorn QLD 4113
- Cannons Southside Inc — 15 Algester Road, Algester QLD 4115
- River City Hornets Basketball Club Inc. — 90 Klumpp Road, Upper Mount Gravatt QLD 4122
- Sunnybank Hills Hurricanes Basketball Club Incorporated — 16 Lorikeet Way, Crestmead QLD 4132

Report addresses shared by multiple providers separately, and call out the seven providers previously associated with `2A Ross Llewellyn Drive`.

Coordinates still mean **Play On provider address**, **NOT** training venue or game venue. Do not alter this product decision.

## Constraints

- No change to React, MapLibre, app data loading, map interaction, or marker behaviour.
- No change to TASK-004 ingestion, existing Play On JSON, or TASK-005 geocoding source/cache/output.
- No enrichment of website/Facebook links in this task.
- No new backend, database, scheduler, subagents, large dependencies, or recurring job.
- No nationwide G-NAF dataset download, bulk harvesting, undocumented APIs, service bypassing, or browser automation.
- No approximated suburb centroids or invented coordinates for unresolved addresses.
- Reuse Node.js and current repo conventions; prefer no new dependencies.
- If the government site is unavailable, document the blocker and finish Stage A. Do not substitute another geocoder without approval.

## Verification and Acceptance

Stage A is complete when:

- Export CLI generates a valid Queensland-format address CSV and deterministic sidecar mapping from current TASK-004 data.
- The number of exported addresses, skipped/manual-review entries, and mapped provider records reconciles to all 54 source providers.
- Shared addresses are deduplicated in export without losing any provider identities.
- Unit tests cover parsing, deduplication, deterministic output, ambiguous input, and row-to-provider mapping.
- `npm test`, `npm run check`, `npm run lint`, `npm run build`, and `git diff --check` pass (or existing unrelated failures are clearly documented).
- No existing app behaviour or source files change unexpectedly.

Stage B is complete **only** when:

- A genuine official output CSV has been received and independently parsed.
- All 54 providers reconcile; no unmatched address is silently assigned a point.
- A before/after comparison and spot-check report has been produced.

If manual upload/output is pending, mark status `Stage A complete — awaiting official output CSV` rather than `Complete`, and give the owner precise next actions.

## Completion Handoff

Append `Implementation Result` to this task with:

1. **Status** — Complete / Stage A complete — awaiting CSV / Blocked.
2. **Changed files and commands**.
3. **Official batch input** — file path, unique address count, total provider count, manual-review rows.
4. **Manual action** — exact government page, form options and where to save returned CSV.
5. **Actual Queensland results** — only if official CSV exists; otherwise explicitly `Not run / pending`.
6. **Baseline comparison** — TASK-005 baseline 19/27/8 vs evidence-backed Queensland outcome, if available.
7. **Spot checks** — actual result or `Pending` for each named provider.
8. **Verification** — commands/results.
9. **Remaining issues / recommendation** — whether and how a later task should incorporate this provider.

Do not begin map integration, website/Facebook enrichment, or TASK-007.

## Implementation Result

### Status

**Stage A complete — awaiting official output CSV.** Stage B is **Not run / pending**.
No genuine government output CSV exists in the current repository. No import schema,
Queensland coordinates, confidence assessments or live coverage results have been
invented. No upload, browser automation, API request or alternative geocoder was used.

### Changed files and commands

- Added `scripts/benchmark-qld-geocoder.mjs` and `npm run benchmark:qld-geocoder -- --export`.
  This offline CLI reads only the existing TASK-004 source and TASK-005 derived output.
  Fixed output paths prevent accidental configuration over source/cache files.
- Added `scripts/qld-geocoder/export.mjs`: source/baseline structure checks, conservative
  address splitting, deterministic grouping, CSV serialization and sidecar generation.
- Added `tests/qld-geocoder.test.mjs`: seven offline tests covering parsing, uncertain
  inputs, shared addresses, deterministic output, source provenance, mapping and
  reconciliation of the fixed dataset. Existing tests remain unchanged.
- Generated `data/benchmarks/qld-geocoder/addresses.csv` and
  `data/benchmarks/qld-geocoder/address-mapping.json`.
- Updated `README.md`, the npm scripts in `package.json`, and this task handoff.
  No new dependencies or lockfile changes. No existing application, ingestion or
  TASK-005 implementation/cache/output changes.

### Official batch input

| Metric | Result |
| --- | --- |
| Source | `data/playon/4115-basketball.json` |
| TASK-005 baseline | `data/derived/4115-basketball-geocoded.json` |
| Upload CSV | `data/benchmarks/qld-geocoder/addresses.csv` |
| Sidecar | `data/benchmarks/qld-geocoder/address-mapping.json` |
| Total provider records / distinct IDs | 54 / 54 |
| Unique normalized source addresses | 40 |
| Exported data rows, excluding header | 39 |
| Providers represented in upload | 53 |
| Manual-review addresses / providers | 1 / 1 |
| Lost or silently skipped providers | 0 |

The CSV follows the [official two-column batch guidance](https://www.qld.gov.au/environment/land/title/addressing/geocoder):
`address,locality`, with a header, CRLF line endings, no blank records, and no
commas inside either data field. String fields are CSV-quoted. The street component
is retained as supplied (including `unit 1/74`, street-only strings and ranges).
The explicit Queensland/QLD label separates the source suburb and postcode; the
locality column contains that suburb plus its source postcode. No address component
is inferred from a club name, expanded, searched or replaced.

The one manual-review address is **Wellington Point Kings Basketball Club Inc.**:
`Corner Of Mt Cotton Rd and Degen Rd, Capalaba Queensland 4157`.
Although its locality suffix is recognizable, its intersection description is not
automatically converted into a conventional street/property address. It remains in
`manualReview` with reason `intersection-needs-manual-review`, exact source address,
provider ID and provenance. It has no upload row or government outcome. Do not
substitute a nearby street number or centre location to improve coverage.

Grouping uses NFKC-normalized, lowercase source addresses with collapsed whitespace
and normalized comma spacing; unit separators, numbers, ranges and street spelling
remain significant. SHA-256 keys identify groups; groups sort by key and providers
within each group sort by ID. A deterministic representative supplies CSV field
spelling while every original source string is preserved in the sidecar. Conflicting
source locality/postcode metadata sends the whole group to review. Missing or
unrecognized addresses remain reviewable rather than disappearing.

The sidecar records exact exported fields, data-row numbers, normalized-address keys,
all provider IDs/names, exact addresses, suburb/postcode, original Play On provenance,
TASK-005 statuses, and SHA-256 digests of both inputs and the exported CSV. No
generation timestamp makes unchanged runs differ. Each file is atomically replaced;
the pair is not one filesystem transaction, so verify the CSV digest against the
mapping if interrupted and regenerate the pair if it differs.

**Row numbers are local data-row references, not official uniqueIDs.** A later import
must inspect the genuine schema and reconcile returned input fields/uniqueID evidence
against this frozen export. It must fail on uncertain associations, never join solely
by output order, and retain providers whose results are omitted or unresolved.

Source attribution: © The State of Queensland — Play On Activity Provider Directory
and Queensland address and geocode checker. No Queensland geocoding result evidence
is stored yet. Stage B must retain the actual government's returned provenance and
applicable attribution alongside minimal derived evidence.

### Manual action

1. From the project root run `npm run benchmark:qld-geocoder -- --export` if the
   supplied files need regeneration. Keep `addresses.csv` and `address-mapping.json`
   together as the exact pair used for the submission; do not sort/edit the upload
   or regenerate that pair against changed inputs while waiting for its results.
2. Visit [Queensland Geocoder — Batch Processing](https://geocode.information.qld.gov.au/).
   The [government help page](https://www.qld.gov.au/environment/land/title/addressing/geocoder)
   describes the file requirements and processing modes.
3. In **File to be loaded**, choose
   `data/benchmarks/qld-geocoder/addresses.csv` (39 data rows plus header).
4. Set **Validate data type: Address**, **Processing mode: Automatic**,
   **Includes header row?: Yes**, and **Output format required: "csv" file**.
   KML is unnecessary for this benchmark.
5. Click **Submit**, wait for processing, record the displayed processed/error/review
   counts, then use **Save Processed File** to download the government CSV.
6. Save the downloaded file unchanged as
   `data/benchmarks/qld-geocoder/government-results.csv`. Keep all original columns,
   input fields and uniqueID values. Record the actual upload/check date and the form
   settings with the result; do not open and resave through a spreadsheet first.
7. With that genuine file available, inspect its actual schema before implementing
   Stage B. Validate address components, confidence and geocode type; preserve all
   54 providers, with unresolved/rejected entries remaining without selected points.
   The intersection provider still needs separate manual address review and must
   remain in the comparison even though it was not uploaded.

Documentation/form options were checked through read-only public page retrieval on
**2026-11-01**. The fetched form included a generic unexpected-error message alongside
the controls; this does not establish that interactive submission is working or
unavailable. Actual processing availability remains unverified. If submission fails,
retain the prepared files and report the government-site blocker; do not switch
services or use undocumented endpoints. No government website interaction was automated.

### Actual Queensland results

**Not run / pending.** No official result CSV, coordinates, accepted/rejected result
counts, confidence values or geocode types have been received. Input-preparation
manual review is not a measured Queensland `needs-review` result.

### Baseline comparison

The CLI verifies that every baseline record retains its corresponding current
source fields, ID and Nominatim provenance before using its status.

| Metric | TASK-005 Nominatim baseline | Queensland Government |
| --- | --- | --- |
| Providers to reconcile | 54 | 54 required in Stage B |
| Matched | 19 | Pending |
| Unmatched | 27 | Pending |
| Ambiguous | 8 | Pending |
| Needs review | Not a TASK-005 status | Pending |
| Additional trustworthy matches | — | Pending; not measurable yet |
| Coordinates/address disagreements | — | Pending; not measurable yet |

### Spot checks

Exact Play On address strings are retained here. Queensland result values are pending,
and no source address is being interpreted as a verified activity venue.

| Provider | Exact Play On source address | TASK-005 | Queensland result |
| --- | --- | --- | --- |
| Algester Hawks Basketball Club Inc. | 31 Endiandra Street, Algester Queensland 4115 | Unmatched | Pending |
| Runcorn Rockets Basketball Club Inc. | 132 Hill Road, Runcorn Queensland 4113 | Matched | Pending |
| Cannons Southside Inc | 15 Algester Road, Algester Queensland 4115 | Matched | Pending |
| River City Hornets Basketball Club Inc. | 90 Klumpp Road, Upper Mount Gravatt Queensland 4122 | Unmatched | Pending |
| Sunnybank Hills Hurricanes Basketball Club Incorporated | 16 Lorikeet Way, Crestmead Queensland 4132 | Unmatched | Pending |

Shared source addresses are exported once while retaining separate provider identities:

| Exact source address | Providers | Queensland result |
| --- | --- | --- |
| 90 Klumpp Road, Upper Mount Gravatt Queensland 4122 | 3 — Dunk Star Junior Basketball Club; River City Hornets Basketball Club Inc.; South Western Metro Basketball Inc. | Pending |
| 146-170 Bryants Road, Shailer Park Queensland 4128 | 2 — Jazz Basketball Club Inc; Logan Basketball Inc. | Pending |
| 56 Zahel Street, Carina Queensland 4152 | 5 — BK Owls Basketball Club Incorporated; Belmont Saints Basketball Club Inc.; Cyclones Basketball Club Inc; Hoopstars Inc.; Southern Districts Basketball Association Ltd | Pending |
| 16 Dixon Street, Auchenflower Queensland 4066 | 2 — Brisbane Basketball Incorporated; West City Titans Basketball Inc | Pending |
| 2A Ross Llewellyn Drive, Booval Queensland 4304 | 7 — Brothers Basketball Club Ipswich Inc; Central Bulldogs Basketball Club Inc.; Easts Basketball Club Inc.; Mt Crosby Basketball Club Incorporated; Ripley Valley Basketball Club Inc; Springfield Brumbies Basketball Incorporated; Swifts Comets Basketball Club Inc. | Pending |

All seven Ross Llewellyn Drive providers were unmatched in TASK-005. They remain seven
records mapped to one batch address, without an assigned Queensland point. The sidecar
contains each provider ID, source metadata and baseline status for later reconciliation.

### Verification

- `npm run benchmark:qld-geocoder -- --export` — passed; 39 upload rows / 53 mapped
  providers plus 1 review entry / 1 provider; all 54 distinct provider IDs retained.
- Repeated export — identical CSV and sidecar SHA-256 digests. Independent CSV parsing
  confirmed the header, 39 two-field data rows, no embedded commas/blank records,
  and exact CSV-to-sidecar field/row mapping.
- `npm test` — **36 passed**: seven new offline tests and all 29 existing tests.
  No live services are called by tests or the export command.
- `npm run check` — passed.
- `npm run lint` — passed.
- `npm run build` — passed; existing Vite bundle-size warning remains.
- `git diff --check` — passed.
- Protected-file audit — existing `src/`, TASK-004 ingestion/source, TASK-005
  implementation/cache/output, existing tests, TASK-004/TASK-005 documents and
  `package-lock.json` unchanged. Source JSON SHA-256:
  `4807c3edef5ecff78ace40891a922f0afc100c446a58b5d84b3e0d0b97d5c6b5`.

### Remaining issues / recommendation

- The bounded next action is the manual upload and receipt of the original government
  CSV. Stage B implementation, measured comparison, actual five-provider spot checks
  and government result provenance remain pending until that evidence exists.
- Review the withheld intersection address without inventing an alternative. Street-only
  inputs also require careful precision review in Stage B; automatic acceptance by the
  site alone does not prove property/building/access-point precision.
- No production provider recommendation can be made yet. Use the real results to decide
  whether Queensland improves reliable address coverage; separately assess production
  service access/terms before any future recurring workflow.
- Coordinates continue to mean **Play On provider address**, not training or game venue.
  The app/map and both prior pipelines remain unchanged. No enrichment, full G-NAF
  download, backend, scheduler or TASK-007 work was introduced.

---

## 2026-11-01 Addendum — Government CSV Compatibility Remediation (same TASK-006)

### Latest owner-supplied evidence and decision

The owner manually submitted the Stage A exported addresses to Queensland Government Geocoder and supplied the downloaded response `government-results.csv` (39 records). This is a **genuine government response file**, but it is **not usable geocoding evidence** because every row failed input parsing. It must not be compared with TASK-005 as an address-coverage benchmark.

Observed from the exact returned CSV (not an inference):

| Observed field / metric | Result |
| --- | --- |
| Response rows | 39 (`InputIndex` 1–39) |
| `Comment` | All 39: `Invalid String containing illegal characters for current record` |
| `LOCALITY` | Empty in all 39 |
| `Longitude` / `Latitude` | Empty in all 39 |
| `GeocodeType`, `Confidence`, `FullAddress` | Empty in all 39 |
| `Address to Validate` | Contains street text followed by double-quoted locality text, e.g. `31 Endiandra Street "Algester 4115"` |
| Usable new Queensland address matches | 0 from **this failed input submission**, **not** a measure of actual address coverage |

Observed response columns: `InputIndex`, `Address to Validate`, `LOCALITY`, `Primary Address`, `Locality`, `Postcode`, `Local Government Name`, `LotNumber`, `PlanNumber`, `Longitude`, `Latitude`, `GeocodeType`, `Confidence`, `FullAddress`, `Complex-Building Name`, `Comment`.

**Root cause is not established.** A plausible explanation is that the current exporter writes both CSV fields with quotation marks, while the government parser is treating the locality quotation marks as literal input. However, the returned file alone does **not** prove how the original uploaded bytes were formed, and valid CSV quoting is not intrinsically invalid. Other possibilities include header handling, file encoding, delimiter interpretation, or service-specific parsing. Compare the **actual uploaded source bytes** to the official sample and test experimentally; do not hard-code an unproven diagnosis.

Sources: owner-provided government response; [official help and downloadable address input example](https://www.qld.gov.au/environment/land/title/addressing/geocoder); [manual batch upload page](https://geocode.information.qld.gov.au/). The help page calls for exactly two columns (street address, locality including postcode where known) and avoiding embedded commas in field values.

### Narrow remediation scope — Stage A2

Maintain **all** original TASK-006 requirements and constraints. This addendum authorises only a minimal CSV compatibility repair and evidence-preserving regression tests. It does **not** authorize production geocoding, Stage B benchmarking of failed data, map integration, or any additional feature.

1. **Preserve the failure evidence.** Place the owner's original government response, if available in the working repository, unchanged at `data/benchmarks/qld-geocoder/government-results-failed-2026-11-01.csv` (or record its location). Do **not** overwrite it with a regenerated CSV. If not locally available, document the absence; this addendum reproduces the essential observed schema and failure details. Reserve `government-results.csv` for a subsequent, successful new manual batch response and never confuse the two generations.
2. **Diagnose before modifying.** Inspect the existing generated `addresses.csv` as raw bytes, including encoding/BOM, newlines, quoting, header, delimiter and row values. Compare with the government's actual [address input example](https://www.qld.gov.au/environment/land/title/addressing/geocoder). Document what is **confirmed from source files** versus what remains **hypothetical**. Verify that any exporter adjustment still represents two address/locality fields correctly; avoid unproven formatting assumptions.
3. **Smallest possible exporter fix.** If evidence supports the quoting incompatibility, emit unquoted, comma-free fields *only where safe*, using the existing structured street/locality values; otherwise implement the evidence-based compatible form. Never remove essential address components, merge providers, guess a substitute address, or alter the source `data/playon/4115-basketball.json`. Keep original grouping, deterministic ordering, per-provider mapping, and provenance. Do not use brittle string replacement on raw CSV.
4. **Regenerate the paired artifacts atomically where practical:** `data/benchmarks/qld-geocoder/addresses.csv` and `address-mapping.json`. Recompute CSV and input digests and ensure every exported row links unambiguously to its original provider IDs. Reconcile the expected source coverage: 54 providers, 40 unique normalized source addresses, 39 exportable address groups representing 53 providers, and 1 withheld intersection address/provider for manual review (unless input data has legitimately changed; if so stop and report discrepancy rather than silently moving the goalposts). Preserve shared addresses, including seven provider IDs at `2A Ross Llewellyn Drive`.
5. **Prepare a reproducible 3-address smoke-test CSV** (`data/benchmarks/qld-geocoder/addresses-smoke.csv`) from the corrected export, using exactly the same formatting rules. Suggested real test cases: `31 Endiandra Street, Algester 4115` (formerly unmatched), `132 Hill Road, Runcorn 4113` (formerly matched), and `2A Ross Llewellyn Drive, Booval 4304` (shared address). If any case is not present, report rather than invent it. Document each smoke row's corresponding full-export group/key and provider identities. Do not use the smoke-test response to overwrite a full-batch result or automatically assign new coordinates.
6. **Add focused offline regression tests** for exact emitted bytes / structural CSV parse; header handling; absence of stray literal quote characters in fields where not required; comma-free safe output; deterministic reproduction; frozen sidecar digest; preservation of all 54 identities; and mapping of smoke rows to the full export. Tests should reproduce the failure mode without asserting the government parser's undocumented internals.
7. **Keep human interaction explicit.** Codex must not upload, scrape, automate, call undocumented endpoints, or claim any form setting was successfully exercised. Stop after preparing the corrected files and documenting the upload steps. Owner submits the 3-row smoke CSV with **Address → Automatic → Header Yes → CSV**, saves its returned file *unchanged* as `data/benchmarks/qld-geocoder/government-smoke-results.csv`, and records displayed processed/error/review counts. Only after checking actual smoke results should the owner upload the full 39-row `addresses.csv` and save its unchanged output as `data/benchmarks/qld-geocoder/government-results.csv`.
8. **Do not confuse format acceptance with address accuracy.** Smoke acceptance requires evidence that address/locality columns are parsed and that the prior *universal illegal-character failure* no longer occurs. An individual address can still be unmatched, ambiguous, coarse or rejected after parsing; this does not itself indicate CSV-format failure. Only a genuine valid full-batch response may be used in Stage B. If the smoke input still produces universal parser errors, record the blocker and investigate the official file example / site behavior; do not switch geocoders without approval.

### Stage A2 acceptance / stop conditions

**Codex offline remediation is ready for owner validation only when:**

- Relevant source/output bytes and official sample comparison have been inspected and any assumptions identified.
- The corrected full CSV and smoke CSV are reproducible, and the full CSV is verifiably paired with a fresh mapping sidecar (hashes consistent).
- The expected **54 = 53 uploaded + 1 manual-review** provider reconciliation holds; 39 exported address rows + one intersection review address remain distinct; all shared-address provider identities survive.
- New focused tests pass, and `npm test`, `npm run check`, `npm run lint`, `npm run build`, `git diff --check` are run with outcomes recorded.
- No application, TASK-004 source/ingestion, TASK-005 implementation/output/cache or unrelated code changes; no automated government submission.
- Codex appends a **Stage A2 Remediation Implementation Result** to this file recording changed files, diagnosis (verified vs hypothesis), actual generated counts, test results, exact owner upload steps, and a clear `awaiting owner smoke-test CSV` status. The old Stage A handoff remains unchanged.

**External compatibility confirmed only when:** the owner supplies an *actual* smoke-test response showing valid input parsing / absence of the universal illegal-character failure. If not supplied, status stays `Stage A2 prepared — awaiting manual compatibility test`; do not claim the fix works against the service.

**Stage B remains pending** until the owner supplies a genuine correctly parsed *full-batch* government CSV. At that point inspect the actual returned schema and plan / perform Stage B reconciliation under the original requirements. Do not assign coordinates solely by row position or imply that provider addresses are training/game venues.

### Explicit scope boundaries carried forward

- No new backend, database, production geocoding service, scheduler, new data providers, or full G-NAF download.
- No changes to React/MapLibre, application map, viewport search or TASK-003 data path; no club link enrichment and no TASK-007.
- No guessed points, coarse suburb-centroid substitutes, or relaxed coordinate precision standards; do not copy failed response as if it contained successful government geocodes.
- **Map markers represent Play On provider addresses only; not verified practice or match venues.** Do not introduce a seasonal training-venue database.

## Stage A2 Remediation Implementation Result

### Status

**Stage A2 prepared — awaiting manual compatibility test / owner smoke-test CSV.**
Offline repair and checks are complete. No government upload was performed, no
external compatibility success is claimed, and Stage B / TASK-007 were not begun.
The original Implementation Result and the 2026-11-01 addendum above are preserved.

### Diagnosis — verified evidence and remaining hypotheses

The requested dated failure filename was initially absent, but the original response
was available at `data/benchmarks/qld-geocoder/government-results.csv`. Its raw bytes
were inspected: 39 rows, each with the documented illegal-character comment, empty
`LOCALITY` and empty coordinate/confidence/geocode result fields. Quoted locality
text is present in the echoed address. The file was **renamed unchanged** to
`data/benchmarks/qld-geocoder/government-results-failed-2026-11-01.csv`, reserving
`government-results.csv` for a later full response. The archive SHA-256 is
`203d49806cbbb05ac739086109c1967d7407170876ddc3000689aff47e8aca45`.
No successful geocoding or address-coverage conclusion can be drawn from it.

The actual [official address input example](https://www.qld.gov.au/__data/assets/file/0026/563444/address-input-example.csv),
linked from the [official help page](https://www.qld.gov.au/environment/land/title/addressing/geocoder),
was downloaded read-only on 2026-11-01 and inspected as bytes. An exact 547-byte
snapshot is retained in `tests/fixtures/qld-address-input-example.csv`, attributed
to the Queensland Government, with SHA-256
`cc8aa2bdef7f32683d3cc7d10ce80c80b6523897c00ed3cf89f609439cf8ae8c`.

| Property | Original repository upload CSV | Official input example | Revised export |
| --- | --- | --- | --- |
| Header | `address,locality` | `Address to Validate,LOCALITY` | Same as example |
| Field quoting | Both data fields always quoted; 156 quote bytes | No double quotes | Safe unquoted fields |
| Separator | One comma between two fields | Comma | Unchanged |
| Embedded commas | None | None | None |
| Encoding evidence | ASCII-only bytes, valid UTF-8; no BOM | ASCII-only bytes, valid UTF-8; no BOM | Unchanged |
| Record separators | CRLF, including final terminator | CRLF, without final terminator | CRLF, including final terminator |
| Size | 1,518 bytes | 547 bytes | 1,374 bytes |

The original file SHA-256 was
`27db770fba72261061847fef399f086b4e6c9dfde23a15fe283dc2bdc1c4978e`.
Python's strict CSV reader accepted it as a header and 39 two-field data records:
**it was valid quoted CSV**. The official example supports removing optional quoting
for these already comma-free fields and aligning the header. It does not prove
the service rejects CSV quotes, requires those header names, or caused the failure
for either reason. No service parser is simulated or reverse-engineered by the tests.
The final CRLF is retained because it adds no blank record; source address spelling,
case, units, numbers, ranges, localities and postcodes are unchanged.

**Still hypothetical:** literal interpretation of quotes, header interpretation,
upload-time transformations, delimiter handling or another service-specific problem.
The repository bytes were inspected; the exact transmitted payload and original
form settings were not independently captured. Only an actual owner smoke response
can confirm compatibility. Updating header and optional quoting together follows
the published example but will not isolate one causal factor if the smoke succeeds.

### Changed files and commands

- `scripts/qld-geocoder/export.mjs`: one shared serializer emits the official header
  and unquoted fields from structured street/locality values. Empty fields, commas,
  double quotes and control characters fail explicitly before output writes;
  nothing is stripped or replaced in raw CSV. Grouping, row order and provenance
  remain unchanged. A small smoke builder selects three exact existing groups,
  failing if a case is missing/duplicated, and records their full-export references.
- `scripts/benchmark-qld-geocoder.mjs`: retains
  `npm run benchmark:qld-geocoder -- --export`, checks the fixed sample counts before
  writing, exports both CSVs, then writes the sidecar with fresh hashes and smoke
  references. CLI status/next action now direct the owner to the smoke test first.
- Regenerated `data/benchmarks/qld-geocoder/addresses.csv` and `address-mapping.json`;
  added `addresses-smoke.csv` in the same folder. The sidecar's `smoke` entry records
  its digest, full CSV digest, data-row numbers, full row numbers, address keys and
  all associated provider IDs. Existing `rows`, `manualReview`, input hashes and
  TASK-005 baseline data are identical to the prior sidecar.
- Preserved the failed response at the dated archive path above; it is never read
  as usable geocoding evidence by the exporter or assigned coordinates.
- `tests/qld-geocoder.test.mjs`: updated existing CSV expectations; added five focused
  offline tests for exact bytes/header/encoding, unsafe-field rejection, smoke tracing,
  fixed-sample drift rejection, and CLI reproduction of frozen artifact digests.
  Added the exact official example fixture described above.
- `README.md`: replaced the direct-full-upload directions with the smoke-first
  protocol and current pending status. Updated this task status and appended this
  handoff. No dependencies, npm command changes or unrelated features were added.

Each CSV is atomically replaced, and the atomic JSON writer publishes the sidecar
last. These are separate filesystem renames, not one transaction; use the sidecar
hashes to detect an interrupted/mixed pair and rerun the offline export if needed.
The exporter never writes government response filenames. Freeze the exact input
CSVs and sidecar used for an upload while awaiting its results.

### Regenerated artifacts and reconciliation

| Artifact | SHA-256 |
| --- | --- |
| `addresses.csv` | `059910473ecc46b83f262527c4d3461c2ea293e36b73f3e650aa32543c41dee1` |
| `addresses-smoke.csv` | `f2aae6ffe2762596664dddd2c2a803a2b05e9279b4954fb40998a6b8f9f512cb` |
| `address-mapping.json` | `cb48f8e22aa97db3805e5ac40c8f6e5a1c760f171a02a9d4f594026103c9eae6` |

Coverage is unchanged: **54 unique provider IDs = 53 represented in the 39 export
groups + 1 manual-review provider**, across 40 unique source-address groups.
The withheld provider is Wellington Point Kings Basketball Club Inc. at
`Corner Of Mt Cotton Rd and Degen Rd, Capalaba Queensland 4157`. It remains in
`manualReview`, without an upload row or coordinates. All five shared-address
groups and their separate provider identities remain intact. Nominatim baseline:
19 matched / 27 unmatched / 8 ambiguous, with no new Queensland comparison.

Smoke CSV (130 bytes, three data rows plus header):

```csv
Address to Validate,LOCALITY
31 Endiandra Street,Algester 4115
132 Hill Road,Runcorn 4113
2A Ross Llewellyn Drive,Booval 4304
```

Row numbers below exclude the header and are local trace references, not government
IDs or authorization to match a returned coordinate by output position.

| Smoke row | Full export row | Address key | Provider identities |
| --- | --- | --- | --- |
| 1 | 26 | `bbc7da96f9fa7c605395071328edca868c06f21db939c3b0eccc6e8e059d9932` | Algester Hawks Basketball Club Inc. — `qld-play-on:055fd5732213fea8ef7a3129` |
| 2 | 31 | `ccb2301120f8ea73644ee72d30729102c1a5a76cfba12a7bd6e8fd3c8cba58ee` | Runcorn Rockets Basketball Club Inc. — `qld-play-on:6bcfc2cea0bb64c3cb5e995f` |
| 3 | 1 | `007f3cc424ce88e2aca7b72853734bfe4b8c513060b0c694b59a395df994da7e` | The seven separate Ross Llewellyn Drive providers listed below |

Smoke row 3 / full row 1 retains:

| Provider | ID |
| --- | --- |
| Swifts Comets Basketball Club Inc. | `qld-play-on:07ada48dd3106366f08e58d6` |
| Central Bulldogs Basketball Club Inc. | `qld-play-on:1fc29fc13091ada8f7b0be45` |
| Mt Crosby Basketball Club Incorporated | `qld-play-on:49275e447ba4ebb9ba7db228` |
| Brothers Basketball Club Ipswich Inc | `qld-play-on:4cae607f5adebea8ea316581` |
| Springfield Brumbies Basketball Incorporated | `qld-play-on:a9e9938f68991cf0fb997438` |
| Ripley Valley Basketball Club Inc | `qld-play-on:ab52b8a65ff9dd3e5660aeda` |
| Easts Basketball Club Inc. | `qld-play-on:e1e2a1c649e2ddaf4406e285` |

### Exact next owner action — smoke first

1. Keep the regenerated CSVs and paired mapping together. Visit the
   [official batch form](https://geocode.information.qld.gov.au/) yourself.
2. Choose `data/benchmarks/qld-geocoder/addresses-smoke.csv` as **File to be loaded**.
   Set **Address → Automatic → Includes header row? Yes → CSV**. Submit the three
   data rows, record the date/settings and displayed processed/error/review counts,
   then download with **Save Processed File**.
3. Save that original response **unchanged** as
   `data/benchmarks/qld-geocoder/government-smoke-results.csv`. Do not resave through
   a spreadsheet, rename it to the full-result filename, or assign smoke coordinates
   to any providers automatically.
4. **Inspect the actual response before a full upload.** Verify all three input
   cases are accounted for using actual returned input evidence. Check that street
   and locality are recognized as separate address/locality inputs, no locality quote
   wrappers have been carried into address text, and the universal illegal-character
   failure no longer occurs. Missing/dropped records or unclear parsing need review;
   they are not proof of success. An individually unmatched, ambiguous or coarse
   result after correct parsing is an address-quality issue, not by itself a CSV
   compatibility failure. Coordinates are not required merely to establish parsing.
5. If parsing is unclear or the universal error persists, **stop** and retain the
   smoke response plus the counts/settings for investigation. Do not submit the
   full file, change providers or bypass the service. No external success is claimed
   until this actual response has been checked.
6. **Only after the smoke confirms parsing**, upload the paired full `addresses.csv`
   with the same **Address → Automatic → Header Yes → CSV** settings. Record counts
   and date/settings; save the original full response unchanged as
   `data/benchmarks/qld-geocoder/government-results.csv`. Keep the archived failure
   and smoke response separate from this new generation.

### Verification

- `npm run benchmark:qld-geocoder -- --export` — passed, including expected fixed
  counts. Repeated CLI exports in isolated test directories produced identical
  full CSV, smoke CSV and sidecar bytes; all three digests are frozen in regression
  tests and match the delivered files.
- Independent Python strict CSV parsing — passed: exact official header, 39 full
  rows / 3 smoke rows, exactly two fields each, no field commas/quotes/blank records,
  UTF-8 without BOM and CRLF. Full/smoke rows match their sidecar references and
  hashes; source and baseline input digests were verified against actual bytes.
- `npm test` — **41 passed**, including all 36 previous tests and five A2 tests.
- `npm run check` — passed.
- `npm run lint` — passed.
- `npm run build` — passed; existing Vite bundle-size warning remains.
- `git diff --check` — passed; new/previously untracked task files were also checked
  for whitespace errors (excluding unchanged source fixtures/evidence).
- Protected-file/hash audit — application source, TASK-004 ingestion/source,
  TASK-005 implementation/output/cache, prior tests, dependencies and npm commands
  unchanged during A2. The original Stage A handoff and addendum are preserved.
  The archived government failure is byte-identical to the original response.

### Remaining issues / stop condition

Awaiting **owner smoke-test CSV**; no compatible external submission has yet been
demonstrated. The five mandatory Queensland spot checks and any improvement over
the 19/27/8 baseline remain pending. Stage B remains pending until a genuine,
correctly parsed full government CSV exists and its actual schema and stable input
evidence can be inspected. No result import or coordinate validation/comparison
implementation was added in A2. No TASK-007 work, map/React/ingestion/TASK-005
changes, alternate geocoder, invented point, backend or venue data was introduced.
All address semantics remain **Play On provider address**, not training/game venue.

## Stage B Implementation Result / Completion Handoff

### Final status

**Complete.** The genuine corrected full government CSV is present and independently
parsed; all 39 submitted addresses and all 54 source providers reconcile. Stage B
ends at offline validation, comparison and documentation. No map integration or
TASK-007 work was performed. Earlier Stage A/A2 handoffs above remain historical
records; their pending statuses are superseded by this result.

### Changed files and commands

- Added `scripts/compare-qld-geocoder.mjs` and
  `npm run benchmark:qld-geocoder:compare -- --validated-on 2026-11-01`.
  The explicit date is the date of this validation, not an invented government check
  timestamp. The command reads the five required fixed input paths and never calls
  a geocoder or substitutes smoke results.
- Added `scripts/qld-geocoder/compare.mjs`: strict CSV parsing, schema and digest
  checks, input-index/address reconciliation, conservative evidence validation,
  provider-level comparison and documented 250 m coordinate review threshold.
- Added `scripts/qld-geocoder/report.mjs`: deterministic Markdown report with
  raw/validated counts, all unique-address decisions, seven club spot checks,
  shared-address findings, comparison lists and limitations.
- Added `tests/qld-geocoder-compare.test.mjs`: 11 focused offline tests; no live calls.
  Existing Stage A/A2 and TASK-003/004/005 tests are unchanged.
- Generated separate artifacts under `data/benchmarks/qld-geocoder/stage-b/`:
  `validated.json` (all 54 original providers plus `qldGeocode`), `comparison.json`
  (54 provider-level comparisons) and `report.md` (human-readable benchmark).
- Updated `README.md`, this task's current status and appended this handoff;
  added the npm command to `package.json`. No dependencies or lockfile changes.
  Stage A/A2 exporter, inputs, government evidence, application and prior pipelines
  remain unchanged. Source providers' fields/provenance are preserved verbatim.

### Input validation and reconciliation

The actual government header is:

```text
InputIndex,Address to Validate,LOCALITY,Primary Address,Locality,Postcode,Local Government Name,LotNumber,PlanNumber,Longitude,Latitude,GeocodeType,Confidence,FullAddress,Complex-Building Name,Comment
```

The reader supports valid quoted fields, embedded commas/newlines and escaped
quotes, and fails on invalid UTF-8, malformed quoting, duplicate headers, ragged
rows, blank records or schema drift. No undocumented result status column is
invented: coordinates, returned components and `Comment` provide the evidence.

Each returned `InputIndex` must be an expected unique positive integer and its
echoed input street AND locality must agree with the mapped submitted row.
Duplicate, missing, unexpected or inconsistent results fail before output replacement.
The actual return order places coordinate results first and unresolved records
later; output position is never used as a join key. Smoke output alone fails the
required full-address reconciliation.

| Input | Verified SHA-256 |
| --- | --- |
| `data/playon/4115-basketball.json` | `4807c3edef5ecff78ace40891a922f0afc100c446a58b5d84b3e0d0b97d5c6b5` |
| `data/derived/4115-basketball-geocoded.json` | `744cfd47da788c261fe16b500b4e163463674a783c07bcb6b64403b1f47f7916` |
| `addresses.csv` | `059910473ecc46b83f262527c4d3461c2ea293e36b73f3e650aa32543c41dee1` |
| `address-mapping.json` | `cb48f8e22aa97db3805e5ac40c8f6e5a1c760f171a02a9d4f594026103c9eae6` |
| `government-results.csv` | `d34d29a77196bdc04ea8c21f9d2cb7c2c261e70a865b9964162ef130db008a01` |

Recorded source/baseline/upload digests match actual bytes. The sidecar is also
reconstructed from the original source/baseline using Stage A's grouping rules
and verified against its rows, identities, summary, precision role and export
bytes. The mapping file's own digest and government's digest are recorded with
all other input hashes in both Stage B JSON envelopes.

There are 40 unique source addresses: 39 submitted groups representing 53 providers
and one withheld intersection/provider. Shared address groups retain every ID;
all 54 providers appear once in each derived dataset. Derived JSON files and the
report are individually atomically replaced after validation/report rendering;
the three renames are not one transaction. If interrupted, rerun this offline
command and verify their matching provenance/summary. Unchanged inputs and the
same explicit validation date produce byte-identical outputs.

### Validation rules and evidence

Acceptance requires all source street, house number, unit (when present), suburb,
postcode and returned full-address/Queensland components to agree. Normalization
is limited to case, spacing, periods and explicit street-type abbreviations.
No fuzzy organisation matching, alternate address query or candidate selection is used.

Only **Confidence 100 + GeocodeType PC + no government comment**, with the required
component agreement, can be accepted. The confidence threshold is a conservative
project rule, not a published guarantee. **PC is treated as a property centroid**,
not a building entrance, club occupancy check or training/game venue.

Every house-number range is flagged for review, including exact source/returned
range agreement. Altered suffixes, incomplete unit/number evidence, unsupported
types, lower/missing confidence and inconsistent full-address evidence require
review. Clear street, unit/house, locality/postcode/state or coordinate conflicts
are rejected. Decimal coordinates must be finite and within valid world ranges
and broad Queensland sanity bounds; these bounds do not prove location accuracy.

Explicit multiple-candidate comments without coordinates are ambiguous; an
explicit zero-candidate result would be unmatched. Unexpected unresolved evidence
remains needs-review. No unresolved, rejected, withheld or review record receives
selected latitude/longitude. Original raw result coordinates are retained only in
clearly named evidence fields so rejected points remain auditable.

Each outcome records reasons and minimal source result evidence: input index and
echo, returned primary/full address, locality/postcode, confidence/type, comment
and raw coordinate strings. No unused cadastral details or contact data were copied.
Queensland provenance is separate from Play On and Nominatim. Attribution and
validation date are recorded. The government CSV has no upload/check timestamp or
declared coordinate datum; `sourceLastChecked` is explicitly null, not inferred
from filesystem metadata. TASK-005's original timestamps remain unchanged.

### Raw versus validated coverage

| Outcome | Unique source addresses | Providers |
| --- | --- | --- |
| Total sample | 40 | 54 |
| Submitted | 39 | 53 |
| Raw coordinate pairs, before validation | 27 | 34 |
| Accepted | 19 | 25 |
| Unmatched | 0 | 0 |
| Ambiguous | 12 | 19 |
| Rejected | 1 | 1 |
| Needs review, including withheld intersection | 8 | 9 |

Raw provider coordinate availability is **34/54 = 62.96%**; validated provider
coverage is **25/54 = 46.30%**. Accepted source-address coverage is **19/40 = 47.50%**
using all source addresses, including the withheld one. Raw government coordinate
availability must not be reported as the accepted-match rate.

### Comparison with TASK-005

The baseline remains **19 matched / 27 unmatched / 8 ambiguous** (35.19% matched).
Queensland independently accepts 25 provider-address records: **11 additional
accepted providers**, with **5 previously Nominatim-matched providers not accepted**,
for a net accepted-count increase of **6 providers** (11.11 percentage points).

The 11 additions cover five unique addresses: Sunnybank Hills Hurricanes,
The Boys' Brigade Queensland Limited (12 Monaco Street), SCALA Indigenous
Corporation (unit 1/74 Sunbeam Street), Ormiston Crushers, and all seven providers
at 2A Ross Llewellyn Drive. This is provider-address evidence agreement, not a
claim of independently established positional accuracy.

The five prior matches not accepted here are Rochedale Wildcats, West Brisbane
Falcons, Capalaba State College and Carina Cobras (government ambiguous), plus
St Philomena School (61 versus 61–71 Koplick Road, Confidence 98, needs-review).
Three of those baseline matches had coarse street precision. No automatic source
fusion or choice of one geocoder as ground truth was introduced.

There are **15 provider/address pairs** with selected Nominatim coordinates and
raw government coordinates. Haversine separation is **1–167 m**; none exceeds the
documented **250 m** material-disagreement threshold. The report lists every pair,
including St Philomena's nonaccepted raw return. A greater separation would
withhold an otherwise accepted Queensland point for review. This threshold is a
review heuristic; small separation is not accuracy proof, and unselected
Nominatim ambiguous candidates are not treated as selected points.

### Seven baseline-club spot checks

| Provider | Exact Play On source address | Actual Queensland evidence | Outcome |
| --- | --- | --- | --- |
| Algester Hawks Basketball Club Inc. | 31 Endiandra Street, Algester Queensland 4115 | 11 candidates; no coordinates | Ambiguous |
| Runcorn Rockets Basketball Club Inc. | 132 Hill Road, Runcorn Queensland 4113 | `132 HILL RD RUNCORN QLD 4113`; Confidence 100, PC; -27.5930671, 153.07649378 | Accepted property centroid |
| Cannons Southside Inc | 15 Algester Road, Algester Queensland 4115 | `15 ALGESTER RD ALGESTER QLD 4115`; Confidence 100, PC; -27.60509882, 153.04246953 | Accepted property centroid |
| River City Hornets Basketball Club Inc. | 90 Klumpp Road, Upper Mount Gravatt Queensland 4122 | 2 candidates; no coordinates | Ambiguous |
| Sunnybank Hills Hurricanes Basketball Club Incorporated | 16 Lorikeet Way, Crestmead Queensland 4132 | `16 LORIKEET WAY CRESTMEAD QLD 4132`; Confidence 100, PC; -27.69314618, 153.09357227 | Accepted property centroid |
| Rochedale Wildcats Basketball Club INC | Klumpp Road, Upper Mount Gravatt Queensland 4122 | 73 candidates; no coordinates | Ambiguous |
| Dunk Star Junior Basketball Club | 90 Klumpp Road, Upper Mount Gravatt Queensland 4122 | 2 candidates; no coordinates; shares River City Hornets' source group | Ambiguous |

### Shared addresses, mismatches and unresolved cases

- **2A Ross Llewellyn Drive, Booval Queensland 4304:** all seven IDs (Brothers,
  Central Bulldogs, Easts, Mt Crosby, Ripley Valley, Springfield Brumbies and Swifts
  Comets) are accepted separately against `2A ROSS LLEWELLYN DR BOOVAL QLD 4304`,
  Confidence 100 / PC, latitude -27.6109996, longitude 152.80035615. No identities
  were merged and no activity-location claim is made.
- **90 Klumpp Road:** Dunk Star, River City Hornets and South Western Metro remain
  ambiguous (2 candidates). **56 Zahel Street:** five providers remain ambiguous
  (9 candidates). **16 Dixon Street:** two providers remain ambiguous (19 candidates).
- **146–170 Bryants Road:** two providers need review even though the source and
  returned range agree and confidence is 100. **63–65 Degen Road** is similarly
  held for range review at confidence 100.
- Other range reviews: **1 Beveridge → 1–15 Beveridge**, **17 South → 1–17 South**,
  **156 Hubner → 148–156 Hubner**, **61 Koplick → 61–71 Koplick** (all Confidence 98 / PC).
- **134 Parkland Drive → 134A Parkland Drive**, Confidence 99 / PC: needs-review;
  the added house suffix is not silently accepted.
- **695 Cavendish Road, Coorparoo 4151 → 695 Cavendish Road, Holland Park 4121**,
  Confidence 97 / PC: **rejected** for conflicting locality and postcode. No chosen
  coordinates despite the returned point.
- **Wellington Point Kings Basketball Club Inc.**, original
  `Corner Of Mt Cotton Rd and Degen Rd, Capalaba Queensland 4157`: needs-review,
  not submitted, no government input index, evidence or coordinates invented.
- All 12 ambiguous government addresses and their candidate counts are included
  in the report/JSON; their 19 provider records remain present without points.

### Verification

- `npm run benchmark:qld-geocoder:compare -- --validated-on 2026-11-01` — passed;
  39 genuine full-result records reconciled, all 54 original providers preserved.
- Repeated command with identical inputs/date — byte-identical Stage B JSON/report
  outputs, with unchanged original input hashes.
- Independent Python CSV/derived-data audit — passed: header/39 input-index joins,
  27 raw coordinate pairs, source-field/ID preservation, selected coordinates only
  for accepted outcomes, five-file hashes and provider-level comparison counts.
- `npm test` — **52 passed** (11 new tests plus all 41 existing tests), covering
  valid/malformed CSV, reordered/shared rows, missing/duplicate/unexpected indices,
  echo/hash/sidecar conflicts, ambiguity, mismatches, confidence/type/precision,
  coordinate disagreements, deterministic outcomes and refusal of smoke replacement.
- `npm run check` — passed.
- `npm run lint` — passed.
- `npm run build` — passed; existing Vite bundle-size warning remains.
- `git diff --check` — passed; new files also audited for whitespace.
- Protected-file audit — React/MapLibre/source application, TASK-004 ingestion and
  source JSON, TASK-005 scripts/cache/output, Stage A/A2 exporter/CSV/sidecar,
  original government full/smoke/failed responses, prior tests and package lock
  are byte-identical to their pre-Stage-B versions. Prior handoffs preserved.

### Recommendation and remaining limitations

Queensland is suitable as a **candidate source for conservatively validated
provider-address coordinates** in the next phase. Its explicit input echo/index,
property precision and additional accepted numbered-address evidence are useful;
the range/suffix changes and locality conflict prevent unconditional acceptance.
Keep unresolved/review/rejected records representable, retain evidence and source
attribution, and carry property-centroid precision into any separately authorized
future integration. Do not select it as production infrastructure solely from
this small sample's match rate.

The [official batch guide](https://www.qld.gov.au/environment/land/title/addressing/geocoder)
describes manual processing. The [PLS catalogue](https://www.data.qld.gov.au/dataset/property-location-service)
lists CC BY 4.0 and distinguishes public and government access; applicable product
terms, API access, usage limits and licensing must be confirmed separately for
production use. No unattended endpoint, refresh workflow or service bypass was
tested or implemented. The benchmark is manually reproducible, not a production
geocoding pipeline. Nominatim remains a proof-of-concept baseline as well.

Independent spatial accuracy, current occupancy, government upload/check time and
datum remain unverified. The report's distance threshold is not an accuracy
guarantee. No guessed points or alternative addresses resolve uncertain records.
**Accepted points represent Play On provider addresses only; they do not verify
training, competition or other club activities.** The map remains untouched.

