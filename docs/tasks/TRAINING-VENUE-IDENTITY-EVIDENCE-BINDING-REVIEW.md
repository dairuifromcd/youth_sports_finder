# Training Venue Identity Evidence Binding Review

**Complete — Independent QA Pass (2026-11-11).** All ten sites reviewed; three
new Accepted sites, seven retained Ambiguous. Final counts: **9 / 18 / 1 / 30**.
Browser UAT: **Not Applicable**. Work stops here for Owner review.

## Approved task — 2026-11-11

Owner authorises an offline review of existing private Training Venue Research and
the genuine Queensland Government batch results, followed by minimal site-specific
identity binding, formal regeneration and independent QA where evidence suffices.
The supplied request is authoritative. This document records this separate task;
the Stage A/B/C and PS079 reports remain historical and must not be overwritten.

Review all ten sites: PS003, PS009, PS027, PS032, PS066, PS070, PS071, PS072,
PS075 and R2L-PS001. Phase A is read-only for product code, data and original
evidence. Save a machine-readable review matrix and a report for each site before
Phase B. A high government confidence, matching address, or original identity
boolean alone cannot prove a physical site's identity.

Phase B may bind only evidence-supported sites. Prefer the existing
`identityBindings` / `identityEvidence()` mechanism; any necessary correction must
stay narrow, preserve strict defaults and include positive and negative tests.
Preserve PS079's exact-row Confidence-97 exception and campus-level limitation.
Schools can be accepted only at campus level; venue/entrance identity and current
training use are separate conclusions. Do not invent or amend source evidence,
coordinates, government results or original upload/index mapping.

## Baseline, boundaries and workflow

- Initial HEAD: `99ceafd730ba6ebc35a5c1eb45f458e779237041`; initial working tree clean.
- Training baseline: 54 Providers / 70 Associations / 58 Physical Sites; 30
  Providers with references; temporal classes 32 Current Confirmed / 38 Official
  Listed — Current Status Unknown. Geocoding: 6 Accepted / 21 Ambiguous /
  1 Rejected / 30 Pending.
- Provider Address baseline is separate: 54 Providers / 25 Accepted addresses /
  19 grouped markers / 29 list-only Providers.
- Evidence root (Git-ignored):
  `output/workflow/2026-11-11/training-venue-identity-evidence-binding-review/`.
  Retain before/after hashes, full generated-data baseline, review matrix,
  individual findings, source/binding references, command logs and tested versions.
- Actual custom roles spawned as `developer` → `/root/developer` and `qa` →
  `/root/qa`; both returned their injected configuration markers without reading
  TOML files to obtain them. Runtime details are retained privately in the evidence
  root. QA is independent by instruction, with inherited parent permissions.
- Main owns this task document and final handoff. Developer owns scoped evidence
  review, implementation and self-check. QA owns independent audit and verification.
  Maximum three targeted repair rounds. Browser UAT: **Not Applicable**.
- No new external requests or external research, personal browsers, service launch,
  installation, project-external writes, frontend/map/Provider Address changes,
  publication, deployment, commit, push or TASK-008. Keep runtime cache/temp paths
  inside this project. Further external research requires separate owner approval.
- PS044, PS046, R2L-PS002, eight no-coordinate results and 30 held/Pending sites
  are outside the binding scope. Preserve their existing outcomes and addresses.

## Required independent acceptance

QA must independently inspect all ten findings and any new binding's original
official source/Evidence ID/Source ID/URL/hash/date, matching Physical Site/Venue,
canonical address and unchanged government coordinates. Verify no unsupported
campus/building/parcel inference, high-confidence shortcut or artificial override.
Preserve the original six Accepted records, PS079 proof, shared associations,
54/70/58 identities, 30 Pending records and one Rejected outcome. Raw research and
private evidence must stay ignored and absent from frontend imports and build.

Execute `npm test`, `npm run check`, `npm run lint`, `npm run build`,
`git diff --check`, and the formal genuine-result import plus deterministic
`--check` using all real result/provenance/date parameters. Add appropriate
independent negative and regression checks. Unavailable checks are Not Verified;
do not report overall Pass until all necessary acceptance is verified.

## Implementation Result

Phase A completed before implementation: **10/10 reviewed, 3 Binding Ready,
7 Further Evidence Needed**. Main and the independent custom QA role inspected
the original local records and agree on the partition. The machine-readable
matrix and ten individual reports are retained in `phase-a/`; independent QA's
pre-review is in `qa/pre-review/` under this task's ignored evidence root.

Only PS027 (YMCA's own facility page/calendar), PS032 (the school's own prospectus)
and R2L-PS001 (the school's own contact/location page) have adequate first-party
physical-site address support. PS003, PS009, PS066, PS070, PS071, PS072 and PS075
currently have club/timetable address claims without independent school/facility
identity evidence and remain Ambiguous.

The three ready records predate the old registry's required `addressResult` and
`phase2Validation` fields; R2L also uses `relatedVenueIds` instead of direct
`venueId` / `physicalSiteId`, and its summary does not begin with the canonical
address. This is a structural registration gap. Original records must remain
unchanged; the approved correction is an exact three-site adapter with pinned
source/evidence/venue/observation/access hashes and canonical addresses.

These are frozen research observations dated 2026-11-05/06, reviewed offline on
2026-11-11. Full original HTML/PDF bytes are not retained locally. No new fetch,
parcel geometry, independently verified Lot/Plan ownership, exact hall/court or
public entrance is claimed. Existing relationship temporal classes and team
limitations remain separate from physical-site identity.

Phase B is implemented and independently accepted. Developer self-check:
132 tests passed, 0 failed, 0 skipped; formal import/repeat/check, type check,
lint, build and diff check all exited 0. Independent QA separately executed the
required checks and audits; its final result is recorded below.

### Ten-site completion ledger

| Physical Site | Venue | Evidence finding | Outcome |
| --- | --- | --- | --- |
| PS003 | Calamvale Community College | E160 / S023, S024, S119: club claims; independent college identity/address source missing | Remain Ambiguous |
| PS009 | Eagles Sports Complex | E186 / S050: club timetable poster; facility-owner address source missing | Remain Ambiguous |
| PS027 | YMCA Springfield Central Community Centre | E178 / S065 and official S173 calendar; C065/C174 identify this centre and full address | New Accepted |
| PS032 | Rochedale State High School | E184 / S171 / C172 school prospectus, corroborated by R2L-E197 / R2L-S188 / L-O224 and access record | New Accepted |
| PS066 | Ripley Valley State Secondary College — Raptordome | E205 / S111: club address; independent college campus/Raptordome address source missing | Remain Ambiguous |
| PS070 | Warrigal Road State School | E208 / S119: club timetable; school address source missing | Remain Ambiguous |
| PS071 | Nissan Arena | E209 / S119: club timetable; arena-owner address source missing | Remain Ambiguous |
| PS072 | Runcorn State High School | E210 / S119: club timetable; school address source missing | Remain Ambiguous |
| PS075 | Sunnybank Hills State School | E211 / S141: club registration page; school address source missing | Remain Ambiguous |
| R2L-PS001 | St Oliver Plunkett School | R2L-E178 / R2L-S170 / L-O200 / R2L-ACCESS-L-O200: school contact/location address | New Accepted |

Every row's original Venue ID, canonical address, government candidate coordinates,
returned address, PC/Confidence, Lot/Plan, empty building label, source URLs, source/
evidence hashes, check dates, relationships and limitations are in the private
`phase-a/evidence-review-matrix.json`. Phase A's original statuses remain in that
matrix; this ledger records the subsequent implementation outcome.

### New Accepted coordinates and limits

| Physical Site | Original government latitude, longitude | Precision | Official identity source |
| --- | --- | --- | --- |
| PS027 | -27.69203784, 152.90831134 | venue-level (facility/property) | [YMCA centre](https://ymcaqueensland.org.au/services/community-centres/springfield-central); official calendar corroboration |
| PS032 | -27.58734613, 153.11170009 | campus-level | [School prospectus](https://rochedaleshs.eq.edu.au/SupportAndResources/FormsAndDocuments/Documents/RAS/ras-prospectus.pdf) |
| R2L-PS001 | -27.46989304, 153.08449395 | campus-level | [School contact/location](https://www.stoliverplunkett.qld.edu.au/contacts-links/contact-location-details) |

All three are the unchanged genuine PC / Confidence 100 candidate pairs, accepted
only after independent identity binding and the existing strict result checks.
No coordinate, confidence, uploaded address, source text or government row was
altered. Government Lot/Plan values are retained, not independently certified by
this review. These are facility/campus property positions, with no hall, court,
entrance, public-access or live training guarantee. PS027's training association
remains Official Listed — Current Status Unknown; the two school associations
retain Current Confirmed as of the original research, without a new attendance
claim. Source checks remain 2026-11-05/06, download date 2026-11-06 and this actual
offline validation date 2026-11-11.

The three sites add **3 distinct Providers and 3 Associations**, all three Providers
previously without an Accepted training site: Central Bulldogs Basketball Club
Inc. (A030), Dunk Star Junior Basketball Club (A053), Belmont Saints Basketball
Club Inc. (R2L-A001). Accepted-site Provider coverage increases from 6 to 9.
This does not change the underlying 30 Providers with training references.

Final generated counts: **9 Accepted / 18 Ambiguous / 1 Rejected / 30 Pending**;
54 Providers / 70 Associations / 58 Physical Sites; original temporal split 32/38.
The six pre-existing Accepted records, one Rejected record, all 30 Pending records
and every other non-target result are deep-equal to their real pre-change records.
Shared PS003/PS009/PS071 associations remain unchanged. Provider Address and the
website retain the separate 54/25/19/29 baseline.

### Implementation and modified files

The immutable three-site adapter verifies the exact site, single Venue ID, full
canonical address, individual street/locality/postcode fields and hashes of every
registered original venue, evidence, source, observation and applicable access
record. Missing or changed records cannot produce a proof. The original ten-entry
registry and its `Resolved` gates, shared address validator, training result
validator, aliases and exact PS079 Confidence-97/parcel/precision checks are unchanged.

The formal CLI retains its complete seven-file safety preflight and byte-for-byte
check, but stages/replaces only changed contents. The original uploaded
`addresses.csv`, mapping, associations and address-preparation files retain their
bytes, hashes, inode and nanosecond mtime. A repeat import leaves all seven files
in place. No upload or InputIndex mapping regeneration was performed.

Product/source/document changes:

- `docs/tasks/TRAINING-VENUE-IDENTITY-EVIDENCE-BINDING-REVIEW.md` — this separate task and handoff.
- `scripts/training-venues/reviewed-identity-bindings.mjs` — new three-site frozen binding adapter.
- `scripts/training-venues/prepare.mjs` — expose existing observation/access records to identity checks and append the three-site proof branch.
- `scripts/prepare-training-venues.mjs` — preserve byte-identical outputs after full safety preflight.
- `tests/training-venues-identity.test.mjs` — new real-input binding, negative and no-rewrite/safety tests.
- `tests/training-venues-aliases.test.mjs` — update two current-result count assertions from 6 to 9; historical reports stay unchanged.
- `data/benchmarks/training-venue-geocoding/README.md` — current offline reproduction and limitations, retaining Stage B/C history.

Changed Git-ignored formal outputs in `data/benchmarks/training-venue-geocoding/`:
`venue-inventory.json` (three proofs), `venue-geocoding-results.json` (three upgrades
and actual validation date), `training-venue-candidates.json` (three accepted
coordinate/precision pairs only). All remain internal and unapproved for publication.
The private evidence files are under this task's ignored evidence root; no raw
research was added to tracked source, frontend data or public directories.

### Formal reproduction and evidence

Run the existing script with the genuine local files and all parameters:

```sh
npm run prepare:training-venues -- --results output/workflow/2026-11-06/training-venue-same-site-aliases/inputs/government-results.csv --result-provenance output/workflow/2026-11-06/training-venue-same-site-aliases/government-result-provenance.json --validated-on 2026-11-11 --check
```

The Developer executed the same command without `--check`, repeated import, then
ran `--check`. Each exit status and raw log is retained. npm/cache/config/tmp and
Node compile-cache paths were explicitly isolated under this project; only existing
dependencies were used. No install, browser or server was required.

Evidence paths relative to the task evidence root:

- `approved-request.txt`, `role-runtime-manifest.json`: authority and actual custom-role loading.
- `phase-a/evidence-review-matrix.json`, `review-summary.md`, ten individual site reports: frozen before implementation.
- `developer/before-manifest.json`, `before/`, `before-status.json`, `command-side-effects-review.json`: initial file and effects review.
- `main/pre-phase-b-manifest.json`, `before-generated/`, `independent-phase-a-findings.json`, `phase-b-decision.json`: Main's 105-file original hashes/inodes/mtime, seven real pre-import artifacts and independent decision.
- `developer/report.md`, `command-outcomes.json`, `status-comparison.json`, `output-write-audit.json`, `tested-manifest.json`, `after/`, adjacent logs: self-check, complete before/after comparisons and frozen implementation version.
- `qa/pre-review/`: independently reviewed source chains and ten-site readiness findings.
- `qa/final/report.md`, `commands.json`, `tested-version.json`, adjacent logs: final independent acceptance, six required command runs and 108 tested code/data/document/input hashes.
- `qa/final/independent-data-audit.json`, `data-audit.py`, `data-audit.log`: 364 independent source/data/privacy assertions.
- `qa/final/negative-audit.json`, `negative-audit.mjs`, `negative-audit.log`: 116 independent positive/negative/CLI safety guards.
- `main/final-audit.py`, `final-data-audit.json`: independent Python comparisons of all 28 CSV rows/448 parsed values, unchanged original records and upload file identity.
- `main/final-review.json`, `final-tested-version.json`: Main's direct QA-version/log/data checks and final handoff version, including this final document wording.

Main's independent data audit passes on the frozen implementation: original six
Accepted and all 30 Pending records match exactly, all 28 raw canonical government
rows and 448 parsed cells agree, only the three target statuses change, and 98 of
105 baseline files remain byte-identical. The seven changed baseline files are the
expected existing code/tests/README and three ignored outputs; the new task/module/
test files are separately listed above. Final independent QA separately confirms
these findings.

### Remaining evidence priorities — not executed

Priority is shared sites PS003, PS009 and PS071, followed by PS066 and the three
remaining schools. Each needs the facility/school's own public identity/address
source, including explicit street number, locality and postcode; retain the exact
campus or facility name. Proposed read-only checks are:

| Site | Target official source and specific fact to verify |
| --- | --- |
| PS003 | College contact/location page: 11 Hamish Street, Calamvale 4116; distinguish campus address from Muirhead/School Access Road access descriptions |
| PS009 | Eagles Sports Complex owner/operator venue page: 109 Weedon Street West, Mansfield 4122 and the exact facility identity |
| PS071 | Nissan Arena's own contact/location page: 590 Mains Road, Nathan 4111 and the arena property |
| PS066 | College's own contact/facility page: 18 Parkway Avenue, South Ripley 4306; tie Raptordome to that campus |
| PS070 | School contact/location page: 312 Warrigal Road, Eight Mile Plains 4113 |
| PS072 | School contact/location page: 132 Hill Road, Runcorn 4113; school campus vs stadium/entrance |
| PS075 | School contact/location page: 77 Symons Road, Sunnybank Hills 4109 |

Those target page URLs must be confirmed before requesting separate owner approval;
no unverified URL is presented as an accessed source. Any later query would share
only the public venue name/address with its official host, whose logs may retain
the request. No new lookup is authorised or performed in this task. PS044, PS046,
R2L-PS002, eight no-coordinate returns and the 30 held/Pending sites remain outside
this round, without a changed conclusion.

### Independent QA and completion status

Independent custom QA's final result is **Pass**, with **zero repair rounds**.
Main reviewed its actual report, command records, audit results and tested file
hashes. No implementation/data/test change followed the independent test run;
Main only completed the task-document status/handoff and final evidence manifest.

| Required verification | Independent result |
| --- | --- |
| `npm test` | Pass — 132 passed, 0 failed, 0 skipped |
| `npm run check` | Pass — exit 0 |
| `npm run lint` | Pass — exit 0 |
| `npm run build` | Pass — exit 0; existing Vite large-chunk warning retained |
| `git diff --check` | Pass — exit 0 |
| Genuine result/provenance/date `--check` | Pass — all seven generated files match |
| Independent source/data/privacy audit | Pass — 364 assertions |
| Independent positive/negative/CLI guards | Pass — 116 cases, separate from the npm test total |
| Required acceptance failures | None |
| Browser UAT and browser/server lifecycle | Not Applicable — no session started |

Full original HTML/PDF bytes, current online source freshness, independently
certified Lot/Plan ownership or parcel-footprint membership, exact hall/court,
entrance/public access and live training occurrence are **Not Verified**. These
are explicit precision/source limitations outside the required offline review,
not missing evidence for a claimed entrance or surveyed location. The retained
observations support only the declared facility/campus address identity.

No new external request, project-external file/configuration write, global install,
service/browser launch, Git commit/push, deployment or publication occurred.
All runtime caches, temporary files, build artifacts and private evidence writes
remain inside this project. The original Stage A/B/C and PS079 records remain
intact; the separate Provider Address and frontend data are unchanged. No TASK-008
or later stage was started. **Stop after this handoff and await Owner review.**
