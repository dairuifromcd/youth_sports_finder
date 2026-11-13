# Training Venue Geocoding Coverage — Phase 2B

Execution date: **2026-11-13, Australia/Brisbane**. Scope: genuine government
result intake, strict validation and independent partial-batch dry-run reconciliation.

**Phase 2B Dry-Run Pass — Awaiting Owner Approval for Production Merge.**

## Approved scope and fixed acceptance requirements

The Owner authorised a new isolated adapter, necessary tests, internal reports and
independent QA. Production merge, coordinate publication, frontend/Provider Address
changes, source-result rewriting, new external requests, uploads, installations,
Git commit/push/PR and deployment are not authorised. This task stops for Owner
review after the dry-run. Browser UAT and browser/server lifecycle are **Not Applicable**.

Read the project AGENTS/workflow, acceptance policy review and implementation,
address-priority update, Phase 2A, backup feasibility and benchmark README, together
with actual strict validators, preparation scripts, related tests, historical
government inputs and all Phase 2A CSV/mapping/review/manifest/registry artifacts.
The approved request is retained privately; it defines the required negative tests,
full 58-site dry-run and production-preservation criteria.

Exact batch ID, frozen CSV/mapping hashes, original InputIndex, both original input
echoes and PhysicalSiteId must agree. No result-order join or first-candidate choice
is allowed. All strict address, number/suffix, locality/postcode/QLD, coordinates,
PC/100, full-address/comment, conflict, building/campus and complete reviewed
training/address evidence requirements apply. PS079's historical exact-row exception
does not extend to this batch. Campus/property points never establish a hall, court
or entrance location, current training occurrence or source freshness.

## Protected baseline and genuine-result preflight

Initial HEAD: `95e98d0d75d8ef4d62ae1b39a938a752e1b6362f`. Six pre-existing untracked
Phase 1/2A/backup files remain protected. Main froze **19,769 existing files** with
SHA-256, byte size and mtime before implementation. Evidence root:
`output/workflow/2026-11-13/training-venue-coverage-phase2b/` (Git-ignored).

| Protected metric | Baseline |
| --- | ---: |
| Providers / eligible associations / physical sites | 54 / 70 / 58 |
| Accepted / Ambiguous / Rejected / Pending | 16 / 11 / 1 / 30 |
| Current Confirmed / Official Listed Unknown | 32 / 38 |
| Providers / associations with accepted sites | 16 / 21 |
| Provider Address total / Accepted / grouped markers / list-only | 54 / 25 / 19 / 29 |
| Historical government rows / canonical cells | 28 / 448 |

The genuine received CSV is 2,981 bytes, UTF-8 without BOM, 18 CRLF records
including header, with the actual 16-column schema inspected before implementation.
Its raw SHA-256 is
`a60c292b9f08a46f62dacc38b44740717b4dc751fd61be04e05ddd433e5602e9`.
There are **17 data rows and 17 distinct InputIndex**, exactly 1–17. All input street
and locality echoes match the reviewed mapping. Rows 3 and 10 appear last and
report three and eleven candidates respectively; individual candidate records are
absent. Fifteen rows contain selected coordinate pairs; nine contain PC/100.

Upload SHA-256:
`55ddf60779f3e234df8eb6b3e5be01914476c574ad1033e2f82a7beccd6a1e25`.
Mapping SHA-256:
`62621fee85d26045cf2e5aa54f9514a087e197b77805ec2917cef1dfd0a8e8d1`.
Both agree with the approved baseline. The received raw CSV and all existing batch
artifacts are protected against edits.

Provenance was initially missing. The Owner explicitly confirmed in this chat that
the file was downloaded unchanged from the stated Queensland Government service
on **2026-11-13**. Main then created a new
`training-venue-coverage-phase2a/received/government-result-provenance.json`; its
hash is `9134f255109359a4bed44ed95d1ec0026ad4225b48f003ee51ffae953ce8dd4b`.
The confirmation is retained in `main/owner-provenance-confirmation.json`.
No date was inferred from file modification time. Hash/echo checks establish file
correspondence; genuine origin rests on that retained Owner declaration.

Actual custom `developer` and `qa` roles returned their configured loading markers;
canonical IDs and responses are in `role-runtime-manifest.json`. QA non-editing is
procedural; both inherit parent permissions. Maximum three targeted repair rounds.

## Implementation and strict dry-run outcomes

New isolated files:

- `scripts/training-venues/partial-batch-reconciliation.mjs`.
- `scripts/reconcile-training-venue-coverage.mjs`.
- `tests/training-venues-partial-batch.test.mjs`.
- This task overview. All earlier source, tests, data and history remain protected.

The loader pins the reviewed registry, separate manifest, upload, mapping and
production baseline, replays all seven Phase 2A artifacts and checks the underlying
source records. It rebuilds the original preparation context read-only. The adapter
calls the unchanged strict venue validator with the reviewed query address. Only
the sole missing legacy-registry training/address-chain diagnostic can be supplied
by the separately pinned full Phase 2A training/address/campus evidence chain.
No other diagnostic is removed. Query readiness alone, a caller-supplied boolean
or self-authored evidence cannot grant acceptance. QA separately reviewed the
original source observations and role/campus relationships for all 17 sites.

Malformed schemas, missing/duplicate/unexpected indices, wrong echoes and invalid
provenance block formal validation for the batch. All raw records are retained;
extra candidates are never silently dropped. The inspected service schema returns
one selected record or a candidate-count summary, rather than candidate-detail rows.
Missing provenance yields an unchanged projected production state and no new
Accepted conclusion. Negative tests use isolated synthetic derivatives only.

All 17 queried sites are currently Pending in production. The genuine dry-run
produces **9 Accepted / 7 Ambiguous / 1 Rejected** for this batch:

| Site(s) | Strict simulated outcome | Reason / precision |
| --- | --- | --- |
| PS007, PS008, PS013, PS034, PS041, PS043, PS052, PS073 | Accepted | Exact strict PC/100 plus complete reviewed chain; campus-level |
| PS050 | Accepted | Exact strict PC/100 plus complete reviewed chain; venue/property-level |
| PS010 | Ambiguous | Three candidates reported, no selected address or coordinates; details absent |
| PS048 | Ambiguous | Eleven candidates reported, no selected address or coordinates; details absent |
| PS026 | Rejected | Returned locality differs; confidence 97; no approved alias or confidence exception |
| PS045 | Ambiguous | Returned number range, confidence 98 and unbound building label |
| PS051 | Ambiguous | Confidence 99 |
| PS093 | Ambiguous | Returned number range, confidence 98 and unbound bushland building label |
| PS094, PS095 | Ambiguous | Returned number ranges and confidence 98 |

There are **15 selected single-record results, two multiple-candidate summaries,
zero no-match returns and zero government/CSV parsing failures**. Nine meet PC/100
and all nine also satisfy the full reviewed strict chain in this simulation.
The eight unresolved sites above remain constrained; no nearest/first candidate,
range, locality or PS079 exception resolves them automatically.

The full 58-site simulation changes **16 / 11 / 1 / 30 → 25 / 18 / 2 / 13**.
Accepted coverage changes **16 → 21 distinct Providers** and **21 → 32 existing
eligible associations**, increases of **5 and 11**. These are set differences
against existing accepted coverage. All other 41 site records and all 16 existing
Accepted records remain exactly equal. The original 28 results and provenance
remain separately retained alongside the new result receipt. Production remains
**16 / 11 / 1 / 30**; no simulated output is consumed by the frontend.
`main/full-58-site-status-comparison.json` explicitly lists the current and simulated
status, accepted coordinates and precision for every site. The complete differences
also distinguish absent fields from explicit nulls; Main independently replayed all
**195 field differences** to reconstruct all 17 changed records exactly.

PS043's existing association status/currentness limitations, PS073's season scope,
PS008's locality identity, PS034's exact suffix, PS050's historical contact/address
roles and PS051/PS052's independent access guidance remain intact. No new parcel
equivalence, training-currentness or hall/entrance claim is established.
The CSV does not explicitly declare datum/CRS; reports retain that limitation and
the existing Batch latitude/longitude degree interpretation without reprojection
or independent geodetic certification.

Reproduce only the isolated dry-run from the project root:

```sh
node scripts/reconcile-training-venue-coverage.mjs --validated-on 2026-11-13
node scripts/reconcile-training-venue-coverage.mjs --validated-on 2026-11-13 --check
```

The CLI accepts only validation date and deterministic check; its output allowlist
is fixed to this ignored Phase 2B directory. It rejects traversal, production/public
redirects, symlinks and shared hardlink targets. Replay skips byte-identical files.
It never sends this partial result to the old 28-row importer or writes production.

## Implementation Result

**Pass.** The isolated adapter, 53 new tests and genuine dry-run are complete.
Independent custom QA **Pass**, with no unresolved implementation or report defect.
The eight correctly nonaccepted results are strict-policy outcomes, not adapter
failures or authority to investigate them externally. Production remains unchanged.

| Required verification | Independent result |
| --- | --- |
| `npm test` | Pass — 226/226, zero failures or skips |
| `npm run check`, `npm run lint`, `npm run build` | Pass — exit 0; existing Vite chunk warning retained |
| `git diff --check` and new untracked-file whitespace | Pass |
| Genuine generation, repeat generation, full `--check` | Pass — all seven hashes, sizes and mtimes unchanged |
| Independently authored adversarial module / CLI safety audits | Pass — 73 / 18 cases |
| Independent actual-schema / original-source preflight | Pass — 1,504 assertions; all 17 source/campus chains read |
| Independent data / preservation / diff / privacy audit | Pass — 553 assertions; 19,769 protected files unchanged; 195 differences reconstruct all changes |
| Browser UAT and browser/server lifecycle | Not Applicable — no frontend change or session |

Developer independently passed the same required commands. Its initial unused-test-
import lint failure is retained; the import was removed and the final full checks
passed. One targeted QA reporting repair separated numbered-address equality from
street-name/type/direction equality, with a genuine four-range regression test.
No acceptance outcome or validator requirement changed. QA's initial audit-script
hash/import assumptions and their corrections are separately retained; they were
not product defects or grounds to weaken requirements.

Main directly reviewed QA's report, actual command outcomes and logs, source/data/
negative/safety evidence and all **90 QA-tested file pins** before status integration.
Main independently verified all protected SHA-256/size/mtime values, Provider Address
54/25/19/29, all 58 current/proposed records, exact government values/provenance,
coverage set differences and all 195 field changes. Only this final status/handoff
documentation was subsequently integrated; tested code, inputs and seven reports
remain unchanged. Exact code/report pins are retained in `qa/tested-version.json`
and final Main integration evidence.

## Evidence and completion handoff

All paths below are relative to the ignored Phase 2B evidence root:

| Deliverable | Evidence |
| --- | --- |
| Authority, loaded roles, actual source/date declaration | `approved-request.txt`, `role-runtime-manifest.json`, `main/owner-provenance-confirmation.json` |
| Genuine-file hash and preflight | `preflight-report.md`, `main/preflight.json` |
| Actual schema / candidate representation | `government-result-schema-audit.json` |
| Source/date/batch/upload/result receipt validation | `result-provenance-audit.json` |
| Exact index/echo/Site reconciliation and raw records | `partial-batch-reconciliation.json` |
| Every Site's checks, proofs, actual values and unresolved issues | `site-by-site-validation.json` |
| Complete 58-site simulation and both provenances | `dry-run-merge.json` |
| Complete before/after changes and coverage | `dry-run-differences.json`, `coverage-improvement-report.md` |
| Explicit current/simulated status for all 58 Sites | `main/full-58-site-status-comparison.json` |
| Production/history protection and Main independent diff audit | `production-preservation-audit.json`, `main/independent-dry-run-audit.json` |
| Developer self-check / tested version | `developer/report.md`, `developer/final-command-outcomes.json`, `developer/tested-version.json` |
| Independent QA / tested version | `qa/report.md`, `qa/commands.json`, `qa/tested-version.json` |
| Fourteen direct Owner handoff answers | `COMPLETION-HANDOFF.md` |
| Final integration version and scope | `main/final-integration-audit.json`, `final-evidence-manifest.json` |

Remaining **Not Verified** limits: original full HTML/PDF/image bytes, live source
freshness and actual current training/venue-use permission, unreturned candidate
details, any new parcel equivalence or surveyed footprint, independent exact datum/
CRS certification and hall/court/entrance coordinates. These are not claimed by
this offline dry-run. Original association dates, scopes and restrictions remain.

Owner should review the specific nine Accepted points and their campus/property
precision, seven Ambiguous / one Rejected dispositions and a separately scoped
production merge retaining both batches/proofs and all protected records. Further
investigation of eight unresolved sites and any frontend/public release require
their own authorisation. No production merge command or release was started.

No external request, new geocoding API, government submission, project-external
resource modification, installation, commit/push/PR, deployment or publication
occurred. **Stopped for Owner acceptance; no subsequent phase is started.**
