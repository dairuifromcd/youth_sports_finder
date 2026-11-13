# Training Venue Geocoding Coverage Improvement — Phase 1

## Scope and current result

**Research + Feasibility + Planning Only.** Started 2026-11-12 and completed research on 2026-11-13, Australia/Brisbane. No Phase 2 implementation, formal geocoding import, status change, UI change or publication is authorised by this report. Final independent QA is recorded below.

Actual local HEAD: `3665c9900914d775800cc6262c075029675f7413`; initial working tree was clean. Local data were checked directly, rather than assumed equal to a remote branch. No fetch, commit, push, PR or deployment was performed.

| Protected baseline | Actual result |
| --- | --- |
| Providers / eligible training associations / physical sites | 54 / 70 / 58 |
| Current Confirmed / Official Listed — Current Status Unknown | 32 / 38 |
| Accepted / Ambiguous / Rejected / Pending | 16 / 11 / 1 / 30 |
| Distinct providers / associations linked to Accepted training sites | 16 / 21 |
| Separate Provider Address providers / accepted / grouped markers / list-only | 54 / 25 / 19 / 29 |
| Actual new Accepted sites or coordinates in Phase 1 | 0 |

All 42 unaccepted sites have an individual research conclusion or explicit blocker. The original 16 Accepted records, genuine government return, original research, association qualification and separate Provider Address data remain protected. Detailed addresses, coordinates, private observations and source chains are kept only in Git-ignored evidence.

## Method and source boundaries

Read the existing training geocoding, same-site alias, identity binding, policy review and acceptance implementation records, benchmark README, pipeline, strict government validator and original private research snapshots. Join by stable physical site/venue/provider/eligible association IDs; retain original Evidence/Source/Observation/Access records and government fields. An initial research projection omitted one historical observation key variant; independent QA found it, and the new complete audit corrects it without editing original research. Initial failure evidence remains.

Use bounded, read-only public school/operator/club/government sources to supply missing address components or investigate concrete conflicts. Reuse the original weekly-training qualification and temporal labels. Historical 2026-11-05/06 observations are distinguished from new 2026-11-12/13 access. Access dates are not publication dates or training updates. Reader text may be cached/indexed; original HTML/PDF bytes were not archived. No logged-in private browser, Facebook group, credentials, form submission, account, paid service, CSV upload, server or browser session was used.

Actual custom `developer` and independent `qa` roles were loaded and returned their configured runtime markers. Role/task IDs, markers and reviewed hashes are retained in the private evidence manifest. Their non-editing constraints are procedural, not a separate technical read-only sandbox. Developer's initial turn hit a usage limit; after the Owner requested continuation, it resumed and completed its assigned research. UAT and browser lifecycle are **Not Applicable**.

## Research classifications and success metrics

A/B/C/D below are work classifications, independent of the existing address tiers and production geocoding statuses.

| Classification | Sites | Meaning |
| --- | ---: | --- |
| A — Ready for Automated Geocoding | 17 | Complete supported proposed address; can enter an approved new-query workflow. Genuine strict government matching still required. |
| B — Automated Candidate Resolution Possible | 15 | Conditional candidate/parcel research or structural query preparation; independent identity/address rules still needed. No first/nearest/highest-score selection. |
| C — Manual Owner Decision Required | 7 | Specific unresolved official identity/address differences; obtain the stated proof or retain current unlocated status. Owner cannot waive missing evidence. |
| D — Insufficient Public Evidence | 3 | Named campus known, but sufficient numbered physical address was not recovered; retain Pending and avoid invented numbers. |

| Requested metric | Result |
| --- | --- |
| Actually reviewed | 42 / 42 |
| Sites with new reliable address information | 30; includes missing components and alternative address/spelling/role facts, not 30 completed or accepted addresses |
| Old substantive address conflicts fully resolved | 0; partial corroboration and access-versus-campus clarifications do not count as an accepted alias/parcel resolution |
| Group A, eight no-selected-coordinate cases | 6 conditional B; 2 C with concrete address-role differences |
| Group B, four discrepancy cases | 2 conditional B for further range/name/parcel proof; 2 C for unresolved locality/suffix differences. All retain original production statuses and confidence. |
| Pending 30 | 17 A / 7 B / 3 C / 3 D; 24 potential preparation/research cases, of which 23 have complete proposed numbered query strings |
| A+B work pool | 32; 30 complete proposed query strings, plus 2 conditional structural/unnumbered preparation cases |
| Owner evidence/decision queue | 7; no re-review requested for uncontradicted A/B cases |
| Real-address API tests | 0 of maximum 3; preconditions not established |

These numbers describe the research workload. They do not forecast actual new Accepted coordinates. The smallest 17-address query slice has an explicitly hypothetical 0–17 strict-success range; actual yield remains **Not Verified**.

## Government API feasibility

**Anonymous PLS REST operation and PC/100 equivalence: Not Verified.** The [PLS catalog](https://www.data.qld.gov.au/dataset/property-location-service) advertises free, unauthenticated public access; its indexed metadata reports version 1.3. The [PLSplus catalog](https://www.data.qld.gov.au/dataset/property-location-service-plus-public-json) contains conflicting no-auth and now-requires-auth statements. These are distinct interfaces; neither was assumed to share the other's contract.

Direct catalog reads encountered JS verification; metadata navigation had reader/redirect/XML limitations. The exact currently executable public REST operation, current schema, rate/usage conditions, datum and semantic parity were not recovered. No endpoint was guessed, no API failure/HTTP status fabricated, and no service-unavailable claim is made. The permitted address spike was not executed because its prerequisites were not all met. No raw address-query responses exist.

The [official guide](https://www.qld.gov.au/environment/land/title/addressing/geocoder) supports API integration and identifies PLS as the Batch engine. The [current Geocoder interface](https://geocode.information.qld.gov.au/validate) displays a QALI/QSCF migration notice and version 4.0.0.1998. This does not prove that historical Plus/QAMF documentation, current REST variants and the original government CSV use identical data or response semantics. PC remains a property/site position, not a hall/entrance guarantee; a likely-match percentage is not the project's strict acceptance policy.

Official address and parcel layer metadata were also read without site queries. The address-layer schema has components, lot/plan and geocode type but no listed Confidence or postcode; it cannot silently substitute for Batch PC/100. Their differing geometry coordinate systems, paging and record caps require explicit handling. Full service distinctions, all 14 feasibility questions, access limitations and the field-by-field comparison are in the ignored reports.

## Recommendation and minimum Phase 2 proposal

**Recommend staged Hybrid.** Preserve the current data preparation, strict government validation and internal result model. Begin with a reviewed address supplement and an isolated offline new-query manifest for the 17 A sites. Keep original address/tier/provenance, the old 28-row batch and all 16 Accepted records unchanged. A new partial batch needs its own manifest/reconciliation adapter; do not weaken the old exact echo/index/hash checks.

Batch is the currently documented fallback. REST collection and a source-aware result adapter remain conditional on a verified public operation/terms and genuine semantic evidence. Until equivalent fields are demonstrated, an API adapter can produce research candidates only. Missing Confidence, PC, postcode, state, full-address or government echoes cannot be filled with defaults. No other site or new result inherits the PS079 exact-row exception.

The smallest slice removes 17 individual address lookups/transcriptions from the Owner's workload in favour of one reviewed preparation bundle. The safe Batch route still requires an authorised new upload, genuine download and receipt; interactive handling depends on its actual return. A proven future REST lane could remove that upload/download pair and archive candidates automatically, but candidate-click savings and accepted-coordinate yield are unverified. The 15 B investigations, seven C decisions and three D blockers are separate later work, not automatically started.

Phase 2 must independently test source/ID/component binding, missing/tampered proof, ranges/suffixes/locality/campus/building, full candidate enumeration/truncation, API errors/CRS/schema drift, Batch provenance and deterministic replay/diffs. Preserve 54/70/58, 32/38, existing Accepted records, Provider Address 54/25/19/29 and privacy boundaries. Run relevant existing npm checks for implemented changes. Phase 1 did not run product tests/build/import because executable product files were unchanged; research/data/scope checks are independently executed.

## Deliverables and evidence index

Final Git-ignored evidence root:
`output/workflow/2026-11-13/training-venue-coverage-research/`.
Initial session evidence remains under the corresponding 2026-11-12 directory; its Developer pipeline report is explicitly referenced, not overwritten.

| Deliverable | Evidence file |
| --- | --- |
| Current 58-site coverage and 42 blockers | `coverage-baseline.md`, `baseline.json` |
| Full machine-readable and readable 42-site matrix | `final-matrix.json`, `final-matrix.md` |
| Complete original local source/observation/access chain projection | `local-evidence-audit.json` |
| New official address research and dated sources | `official-address-research.md`, `official-address-sources.json`, `pending-research.json`, `developer/group-ab-research.json` |
| API feasibility and actual zero-request decision | `government-api-feasibility.md`, `api-spike-decision.json`, `api-documentation-observations.json`, `access-failures.json` |
| Field-by-field semantic compatibility | `validator-compatibility.md`; initial session `developer/report.md` |
| Batch / REST / Hybrid and Phase 2 scope/QA proposal | `architecture-and-phase2.md` |
| Short seven-case Owner queue | `owner-decision-queue.md`, `owner-decision-queue.json` |
| Independent QA | `qa/report.md`, independent audit JSON/scripts, source checks and reviewed-version manifest |
| Role, version and final preservation evidence | `role-runtime-manifest.json`, `before-manifest.json`, `final-scope-audit.json`, final evidence manifest |
| Counts and completion handoff | `summary.json`, `README.md` and this document |

No private source chain or detailed site/address ledger is copied into this tracked overview.

## Independent QA and Implementation Result

**Pass for Phase 1 research, source classification and planning; independent QA Pass, no blocking finding.** Main directly reviewed the actual QA report and reviewed-version hashes. QA independently verified the production baselines, all 42 original chains/classifications, all 17 A addresses and material source conflicts, the seven-case Owner queue, API guard/compatibility, architecture and privacy boundaries. Its complete local audit passed 19 checks plus 42 row chains; the final audit passed 23 checks plus 42 row reviews. All 99 protected files show zero byte/hash drift, and all six existing PS079 proof artifacts match their production pins.

Initial projection failure, the draft address-info count correction and unverified source leads remain documented. UAT **Not Applicable**. Product tests/build/import were **Not Executed** in this research-only scope. PLS runtime endpoint/conditions/PC100 parity, original HTML/PDF bytes, current training occurrence and future coordinate yield remain **Not Verified**. No safety exception, production change or Phase 2 implementation occurred. Final status-only integration and delivery hashes are recorded in the ignored QA/final evidence records.

## Completion Handoff / approval boundary

1. **How many can enter next-stage automation?** 17 source-complete A cases, plus 15 conditional B preparation/candidate investigations; total work pool 32, not 32 Accepted promises.
2. **How many need Owner decisions?** Seven evidence-specific cases. Decide whether to obtain the stated official clarification or preserve the current unlocated state, rather than guessing candidates.
3. **How many lack sufficient public evidence?** Three insufficient-numbered-address cases; maintain Pending.
4. **Is PLS REST actually usable?** Not Verified; zero address tests and no raw responses, with the unmet prerequisites documented. Official service availability is not disproved.
5. **Recommended route?** Staged Hybrid, starting with offline preparation and existing Batch fallback.
6. **Remaining Owner actions?** Review the proposal, choose targeted proof versus hold for seven C cases, and only after next-phase approval perform any necessary new Batch upload/download/interactive operations. No private browser access is currently requested.
7. **Smallest implementation?** Reviewed address supplement and isolated dry-run/query manifest for 17 A cases, with no automatic current-data overwrite.
8. **What needs approval?** Next-phase code/bindings, new government query batch or REST spike/collector, partial-batch adapter, any site-specific adjudication and any formal internal status regeneration. This report authorises none of them; fees/accounts, UI/publication, Git writes and deployment remain outside scope.
9. **Failures / Not Verified / exceptions?** Initial projection omission was corrected; Developer usage interruption was resumed. PLS executable contract/limits/datum/runtime parity and all future geocode yields remain Not Verified; blocked document targets are recorded. No safety exception was granted or used.

**Stop after research and independent QA; await Owner review. Do not automatically implement Phase 2.**
