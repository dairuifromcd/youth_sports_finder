# Training Venue Geocoding Coverage Improvement — Phase 2A

Execution date: **2026-11-13, Australia/Brisbane**. Status: **Phase 2A Implementation Pass — Batch Ready for Owner Review**.

## Approved scope

The Owner approved reviewed address supplements and isolated offline batch preparation for exactly the 17 Phase 1 A-class Pending physical sites. The original request is preserved in the ignored evidence root. Ready means `candidate-for-later-query`, never Geocoding Accepted. Insufficient evidence must remain `held-for-evidence`; 17 is a review pool, not a mandatory upload count.

No government upload, API/address query, genuine-result import, coordinate/status change, production regeneration, Provider Address or frontend change, external investigation, commit/push/PR, deployment, publication or subsequent phase is authorised. UAT and browser/server lifecycle are **Not Applicable**.

## Preflight and protected baseline

Actual HEAD: `95e98d0d75d8ef4d62ae1b39a938a752e1b6362f`. Initial working tree contains only the pre-existing untracked Phase 1 coverage research overview. It exists locally and remains untouched. No remote lookup or Git mutation is needed.

Evidence root: `output/workflow/2026-11-13/training-venue-coverage-phase2a/` (Git-ignored). Before implementation, Main froze 4,148 existing source, tests, production data, raw research, government/provenance, proof and historical evidence files, with SHA-256, byte size and modification time. Full 58-site results and existing Accepted records are retained in `baseline.json`; all 17 target IDs join the original Pending set and original venue/provider/association IDs.

| Protected metric | Required unchanged |
| --- | ---: |
| Providers / eligible associations / physical sites | 54 / 70 / 58 |
| Current Confirmed / Official Listed — Current Status Unknown | 32 / 38 |
| Accepted / Ambiguous / Rejected / Pending | 16 / 11 / 1 / 30 |
| Providers / associations linked to Accepted sites | 16 / 21 |
| Provider Address total / accepted / markers / list-only | 54 / 25 / 19 / 29 |

All seven formal training artifacts, 28-row government batch and 448 canonical government cells, receipt/provenance, 16 Accepted coordinates/precision/proofs and PS079-only exception remain protected. Detailed internal source chains, addresses, observations and hashes remain outside tracked documentation and frontend data.

Actual custom `developer` and `qa` roles were spawned and returned their configured loading markers. The role/runtime manifest records their IDs and responses; QA non-editing rules are procedural, not separate technical isolation. Maximum three defect repair/regression rounds.

## Review and implementation requirements

Use the existing `createAddressPriorityReviewer` without altering its review-only boundary. Frozen reviewed source, training, address and relationship records must retain original source/evidence/observation/access/association lineage and independently audited hashes. Runtime hash matching establishes correspondence, not source truth or address-role correctness. Do not construct a trust registry from arbitrary request input.

Prefer explicit ordinary-team club training addresses; supplement only genuinely missing components from the identified school/operator. Retain entrance/parking, administrative, historical contact and unverified Owner leads separately. School/operator campus targeting is allowed when the club names only the venue; it does not establish a hall, court, entrance, parcel alias or current training occurrence. Original checked/publication/season dates and access limits remain unchanged. Retained text observations do not imply original HTML/PDF bytes were archived.

Particular review requirements: PS008 same school identity with Carindale locality rather than substituting the name Carina; PS034 exact suffix; PS050 historical locality/contact role without automatic alias proof; PS051 and PS052 independent parking/access guidance; PS026 and PS045 named centres within the identified campus, without entrance precision claims.

The new CSV must use UTF-8 without BOM, CRLF and the exact two-column unquoted header. No private metadata columns, unreviewed punctuation/control characters, inferred number, range/intersection substitution or Site merge. Stable Site ordering, one data row per Ready Site, explicit row/InputIndex conventions, source pins, CSV hash and historical batch reference are required. Repeated preparation and `--check` must compare deterministic full artifacts.

## Phase 2B partial reconciliation proposal

A later separately approved adapter must select the new batch by its unique ID/schema and exact upload CSV hash, retain the new mapping unchanged, and require a genuine unchanged government result plus actual source/download date and result hash. Validate real schema and every unique InputIndex against both original street and locality echoes; never join by result order. Reject duplicates, unexpected/missing rows, wrong echoes or forged provenance before changing any production output.

Resolve only this batch's mapped physical sites while retaining all historical raw rows and proof chains separately. Apply every existing strict address, suffix, locality/postcode/state, coordinate, precision, campus/building/conflict rule. PS079's exact historical exception must not extend to this batch. Prepare an explicit reviewed merge/diff against the then-current 58-site baseline and preserve unrelated outcomes and all old batch provenance. Do not feed the partial return into the old 28-row mapping or overwrite formal JSON directly. No adapter or import is implemented in Phase 2A.

## Reviewed address and batch result

**17 reviewed address chains; 17 Ready; 0 Held; 0 new Accepted.** All remain Pending in production. Independent source-chain, registry semantic review and all required executable regression passed.

PS026, PS048 and PS073 retain their explicitly published club training address components, with only missing components supplied by the same school. PS073 retains the old Season 1, 2026 address/schedule scope separately from its Summer 2026/27 ordinary-training relationship. The other 14 use the official school/operator campus address: PS007, PS008, PS010, PS013, PS034, PS041, PS043, PS045, PS050, PS051, PS052, PS093, PS094 and PS095.

PS008's school-name/locality label remains historical, while the actual identified school supplies Carindale; Cuthred access is independent. PS034 preserves its exact alphabetic suffix. PS050's old Paddington string is a profile/contact address explicitly excluded from ordinary-training inference in the original observation; the operator and club stadium/level descriptions identify the same intended Lang Park venue for the new Milton query. No Paddington/Milton cadastral or locality alias is approved. PS051 Cecil Road and PS052 Glenlyon/Moola remain access/parking guidance. PS026 Nano Nagle and PS045 Multipurpose Centre retain their school relationship without a hall/entrance point claim. PS013's Aussie Hoops address context is not promoted to ordinary-team address evidence.

The script actually invokes the existing address-priority helper. Its private registry, separate frozen record manifest, original record/file hashes and source-role interpretations were independently reviewed by QA. A one-time offline authoring script is audit evidence only, never part of runtime preparation; runtime does not generate its own trust registry. The reviewed 114 records preserve 17 sites and their original relationships. Full private chains and per-component lineage are in the ignored review bundle and generated review/evidence files.

## Artifacts and reproduction

New isolated executable files are `scripts/prepare-training-venue-coverage.mjs` and `scripts/training-venues/coverage-batch.mjs`. The old helper, validator and production pipeline remain unchanged. New `tests/training-venues-coverage-batch.test.mjs` adds 19 positive/negative and preservation tests. All 173 project tests passed, with zero skips.

Run from the project root using existing local Node:

```sh
node scripts/prepare-training-venue-coverage.mjs
node scripts/prepare-training-venue-coverage.mjs --check
```

The CLI accepts only `--check`, uses fixed private reviewed inputs, and writes only the task's independent `batch/` directory. It checks containment, symlinks and shared hardlink output targets, validates all evidence before writes, stages outputs and skips identical files on replay. The private reviewed bundle and original ignored research must remain available for replay; this is not a standalone public data export.

All seven required outputs are in `output/workflow/2026-11-13/training-venue-coverage-phase2a/batch/`: `addresses.csv`, `address-mapping.json`, `address-review-results.json`, `address-evidence-manifest.json`, `batch-preparation-summary.json`, `government-result-provenance.template.json` and `UPLOAD-INSTRUCTIONS.md`.

After separate future upload approval, Owner uploads **only that new batch's `addresses.csv`**. Retain the unchanged mapping and all source artifacts locally. Save a genuine unchanged download at `output/workflow/2026-11-13/training-venue-coverage-phase2a/received/government-results.csv`, and fill a separate `received/government-result-provenance.json` using the template and actual download date/hash. The template deliberately keeps result hash and obtained date null; no government receipt is fabricated. Upload/query/import are Not Applicable for this task.

Main independently checked all 17 canonical addresses against the retained proposals, exact CSV/mapping echoes and indices, component provenance, hash correspondence, safe two-column CRLF bytes, null result metadata and isolation from the original 28-row batch. Final CSV SHA-256: `55ddf60779f3e234df8eb6b3e5be01914476c574ad1033e2f82a7beccd6a1e25`. Final Mapping SHA-256: `62621fee85d26045cf2e5aa54f9514a087e197b77805ec2917cef1dfd0a8e8d1`. These identify this reviewed upload/mapping pair, not a government result.

## Implementation Result

**Phase 2A Implementation Pass — Batch Ready for Owner Review.** Independent QA **Pass**, with all mandatory checks executed. UAT/browser lifecycle, government upload/query/import are **Not Applicable**. Ready is not Accepted; all 17 remain Pending in production.

| Independent verification | Final result |
| --- | --- |
| `npm test` | Pass — 173/173, zero failures or skips |
| `npm run check`, `npm run lint`, `npm run build` | Pass — exit 0; existing Vite chunk warning retained |
| `git diff --check` | Pass — exit 0; new files also checked separately |
| Original source-chain audit | Pass — 17/17 original chains and retained official address observations |
| Registry / Batch / independent adversarial checks | Pass — 148 / 82 / 14 checks |
| Preparation, repeat preparation and full `--check` | Pass — all seven hashes, sizes and mtimes unchanged on replay |
| Production/history preservation | Pass — all 4,148 frozen files, all 58 records, all 16 Accepted unchanged |
| Old batch and PS079 | Pass — 28 rows / 448 canonical cells, original hashes/provenance and all six proof artifacts unchanged |
| Privacy and output isolation | Pass — private data ignored; no source-registry leakage to frontend/build |

Developer self-check separately passed the same required commands. One initial self-test wrongly expected missing-address evidence to throw; the helper correctly held the site and excluded its row. The assertion was corrected to check that strict behavior. Independent review identified one evidence-correction round: PS073 empty structured access guidance and PS048 mismatched narrative. Both were repaired before final freeze and independently rechecked, without changing source evidence or relaxing policy. No unresolved blocking finding remains.

QA report: `qa/report.md`; exact tested code/registry/manifest/output pins: `qa/tested-version.json`. Main directly read these reports and raw command/audit records, then independently verified final hashes and protected files. Status-only task/handoff integration is checked separately; tested code, registry and batch files remain unchanged.

Remaining **Not Verified** limits: original HTML/PDF bytes, live source freshness/current training occurrence, any new parcel equivalence, hall/entrance coordinates, future government response contract and actual geocoding yield. These do not form claims of this offline preparation. A checkout missing ignored research explicitly marks real-evidence tests Not Verified and cannot claim this local acceptance without the reviewed inputs.

## Completion handoff and evidence index

All 13 Owner handoff questions are answered by the actual result above: 17 auditable supplements, 17 safe Ready rows, 0 Held; helper and independently reviewed registry used; three club-priority and 14 school/operator targets; special-site roles preserved; complete deterministic separate CSV/mapping; old production/batch unchanged; exactly three new executable/test files and this overview; independent QA Pass; exact upload and receive paths given above; later partial reconciliation requires its own approved adapter and both provenances.

| Deliverable | Private evidence path within task root |
| --- | --- |
| Authority, loaded roles, initial tree/version | `approved-request.txt`, `role-runtime-manifest.json`, `baseline.json` |
| Protected snapshot and preflight | `before-manifest.json`, `main/preflight-report.md`, `developer/preflight.md` |
| Frozen address supplements and original record pins | `reviewed/registry.json`, `reviewed/manifest.json` |
| Complete address roles, component lineage and evidence | `batch/address-review-results.json`, `batch/address-evidence-manifest.json` |
| CSV, mapping, hashes and instructions | `batch/addresses.csv`, `batch/address-mapping.json`, summary and upload instructions |
| Future blank result provenance | `batch/government-result-provenance.template.json` |
| Developer self-check and exact version | `developer/report.md`, `developer/command-outcomes.json`, `developer/tested-version.json` |
| Independent QA and exact version | `qa/report.md`, `qa/tested-version.json`, command logs and audit JSON/scripts |
| Main preservation, isolation and canonical old cells | `main/final-preservation-audit.json`, `main/batch-isolation-and-determinism-audit.json`, `main/old-government-canonical-baseline.json` |
| Later reconciliation design | `PHASE2B-RECONCILIATION-PROPOSAL.md` |
| Completion/version manifest | `COMPLETION-HANDOFF.md`, `main/final-review.json`, `final-evidence-manifest.json` |

No project-external file/configuration change, external request, private browser access, installation, government action, Git commit/push/PR, deployment or publication occurred. Existing caches/temp/logs used by execution were redirected into the project. All work is uncommitted. The pre-existing untracked Phase 1 overview remains untouched.

**Stopped after Phase 2A. Await Owner review and separate government-query authorisation. No batch upload, result import or Phase 2B was started.**
