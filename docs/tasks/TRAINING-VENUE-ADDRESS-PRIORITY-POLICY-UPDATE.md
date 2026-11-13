# Training Venue Address Priority & Location Verification Policy Update

Execution: **2026-11-13, Australia/Brisbane**. **Implementation Pass; independent
QA Pass. Stopped for Owner acceptance.**

## Approved scope and acceptance

The Owner approved training-specific address priority, five distinct address roles,
a minimal repeatable review-only decision helper, PS069/PS030 cases, tests and
independent QA before Phase 2A. Original request and detailed private evidence are
retained in `output/workflow/2026-11-13/training-venue-address-priority-policy/`.
No Phase 2A preparation, new government query/upload, coordinate import, production
regeneration, frontend or Provider Address change, publication or Git write is authorised.

Required acceptance: prefer the club's supported ordinary-team training address;
keep access information independent; use school/operator material as support or
missing-component supplementation without overwriting the club's address; block
unproved physical equivalence; preserve strict government acceptance, PS079's
exclusive exception and all production/source/history records. Include executable
positive/negative tests, actual case outputs, data preservation and independent QA.

## Preflight and protected baseline

Actual HEAD: `3665c9900914d775800cc6262c075029675f7413`. The initial tree already
contained untracked `TRAINING-VENUE-GEOCODING-COVERAGE-RESEARCH.md`; it belongs to
Phase 1 and is retained unchanged. Main read the required geocoding, alias,
acceptance policy/implementation, coverage research and benchmark records, and
the actual ignored Phase 1 matrix, official sources, decision queue, API feasibility
and independent QA. The private research and genuine CSV/provenance are present.

Main froze 166 existing files, including all seven formal generated artifacts,
Provider Address, source research, government proof/CSV, Phase 1 evidence and
existing product/tests/task records. `before-manifest.json` and `baseline.json`
retain hashes, sizes, modification times and complete Accepted records.

| Metric | Required unchanged baseline |
| --- | ---: |
| Providers / eligible associations / physical sites | 54 / 70 / 58 |
| Current Confirmed / Official Listed — Current Status Unknown | 32 / 38 |
| Accepted / Ambiguous / Rejected / Pending | 16 / 11 / 1 / 30 |
| Separate Provider Address total / accepted / markers / list-only | 54 / 25 / 19 / 29 |
| Existing Accepted coordinates and precision | All 16 identical |

## Address roles and binding policy

1. **Club Training Location Address:** official club material, or a qualifying
   governing association's direct statement, identifies this club's ordinary team
   training at the specific physical site. This is the preferred query target.
   Office/postal, competition, classes-only and directory entries do not qualify.
2. **Training Venue Access / Entrance Address:** a separately evidenced entrance,
   gate, parking, driveway or walking instruction. Retain for future arrival
   guidance; never substitute its address/coordinate for the training venue.
3. **School / Venue Administrative Address:** official school/operator contact or
   campus address. It may complete genuinely missing components, establish the
   specific campus or provide campus-level targeting when the club names only
   the venue. It cannot replace a complete explicit club training address.
4. **Government Registered Property Address:** official property/address/parcel
   verification material. It establishes only the facts it actually supports;
   property registration does not establish the correct training entrance.
5. **Owner-Reported Location Lead:** retain as **Unverified Owner Location Lead**.
   It directs investigation and never becomes an official address or proof through
   a caller-supplied approval flag, map observation or nearby location.

Evidence must retain source/record IDs, original address, checked/publication/season
dates and content scope. A hash verifies correspondence to a reviewed snapshot,
not the truth or official status of its contents. Trusted role interpretation must
be independently reviewed against that original evidence. Sharing an address at
the same proven site never creates a training association for another provider.

## Decision procedure and current versus revised decisions

Validate source, stable site/campus/association linkage and reviewed record hashes;
then distinguish roles. Select the explicit qualifying training address before
administrative support. Fill missing components only from the correct specific
site, retaining per-component lineage and every original claim. Keep entrance and
Owner leads in separate outputs. Competing specific training addresses require
review of season, publisher, specificity and publication dates; priority alone
cannot settle two plausible contradictory claims. Access dates are not publication
dates, and this task does not refresh training status.

Different roles and different strings do not alone prove a substantive conflict.
They also do not prove same-campus or same-parcel equivalence. Record the role
difference, keep the preferred research query, and hold any unproved physical
relationship separately. No nearest/first/highest-confidence candidate shortcut,
nearby house-number inference, same-name/postcode merge or campus-to-hall precision
upgrade is permitted.

| Situation | Existing formal / Phase 1 handling | Revised review-only decision |
| --- | --- | --- |
| Complete club training and different school administrative address | No explicit reusable role-priority selector; Phase 1 retains discrepancy | Club query preferred; school claim retained separately; unresolved physical relationship still held |
| Club training address and a separate entrance | Original evidence retains access distinctions | Explicit independent access role; never a venue-centre coordinate |
| Club gives venue name or partial address | Existing reviewed school/operator supplement | Complete only missing components for the proven site; retain component lineage |
| Two incompatible current training addresses | Unresolved source conflict | Hold; fixed publisher order cannot decide |
| Government registered address differs | Existing strict matching / site-specific alias proof | Investigate physical relation; no generic alias or acceptance exemption |
| Owner map lead | No official acceptance authority | Explicit unverified lead; never official by assertion |
| Multiple government candidates / no selected coordinate | Ambiguous | Still Ambiguous regardless of preferred query |

This is a new explicit review mechanism. It does not claim the old formal importer
automatically replaced club addresses with school addresses.

## Case decisions and limited Phase 1 impact

**PS069:** the original club training-address and ordinary-team evidence supports
retaining the club's Junior/Primary campus query. Keep the school P–6 administrative
address independently. The Owner's possible entrance remains unverified. The
Secondary campus is explicitly excluded. Detailed addresses and source chains are
in `main/case-study-evidence.json` and the private case report.

The genuine government row reports **four candidates**, with no selected address,
coordinate, PC, confidence or parcel data. The four candidate records themselves
are absent; neither a map observation nor changing the preferred address can select
them. Missing evidence includes exact registered candidate addresses/provenance,
target Junior-campus/property linkage, any claimed alternative-address equivalence
and, for a future hall/entrance claim, specific independently verified geometry.
Retain **Ambiguous**, no Accepted coordinates.

Recommend **C → B — Automated Candidate Resolution Possible**, only in this separate
review overlay: the official club target and Junior-campus role already support a
bounded investigation without another Owner choice between the training and
administrative address. B is conditional research, not permission to execute queries,
not A-ready, not resolved equivalence and not Accepted. Future candidate/parcel
retrieval requires its own approved scope and verified service contract.

**PS030:** retain the club hall address as the preferred research target. The
unnumbered school administrative street supplies context, and the historical
alternative numbered-property/lot statement remains a limited lead. No proof
establishes the original and alternative house numbers as one parcel. The genuine
row reports **11 candidates** and no selected coordinate; keep **Ambiguous** and
the conservative **C** research classification.

Only the other five existing C rows received a limited read-only impact check.
Their identity/locality/suffix/range conflicts receive no automatic release. The
historical 42-row matrix remains byte-identical: A17/B15/C7/D3. If the Owner adopts
this recommendation, the separate work overlay is A17/B16/C6/D3. No formal status,
coordinate or historical classification was changed.

**Phase 2A's 17 A cases:** keep the existing work pool. Its future approved
preparation must apply this role-first selection and lineage check before emitting
queries. Do not replace club addresses simply because an administrative source is
newer or authoritative for a different role. No 17-case batch, manifest or new
full-site research was prepared here, and their future query outcomes remain
Not Verified.

## Strict acceptance and safety boundary

The helper is isolated from `prepare.mjs`, the formal CLI, `validate.mjs`, Provider
Address and all frontend imports. Its output is review-only and cannot grant
Accepted status or coordinates. Formal PC/100, exact number/suffix/street/direction,
suburb/postcode/QLD, full return, valid coordinates, building/campus identity,
ranges/multiple candidates and real source/provenance/index/echo/hash checks remain.
PS079's six-artifact, parcel/spatial, exact-row Confidence 97 adjudication remains
exclusive to that site and genuine row. No new hall/entrance or manual-coordinate
acceptance path is introduced.

Actual loaded custom `developer` and `qa` roles returned their injected markers;
agent IDs and runtime markers are saved privately. QA independence is procedural,
not a separate technical read-only sandbox. Up to three directed repair rounds.
**UAT / browser lifecycle: Not Applicable**; no UI change or browser session.

## Implementation Result

New files only:

- `scripts/training-venues/address-priority.mjs`: `addressRoles`,
  `addressPriorityRecordHash()` and `createAddressPriorityReviewer()`.
- `tests/training-venues-address-priority.test.mjs`: 17 new positive/negative
  policy tests, using synthetic reviewed overlays and necessary public case facts.
- This new task document. All pre-existing implementation, tests and task records
  are protected and unchanged.

The reviewer receives an independently reviewed registry and separate SHA-256
manifest. Record kinds are source, ordinary training relationship, address and
physical relationship; requests select pinned IDs for a particular site/campus.
The registry and manifest are snapshots, preventing caller/output mutation from
rewriting the reviewed facts. This is an explicit trust boundary: callers must
review official publication, role meaning and original evidence before pinning an
overlay. Hashing a self-authored claim alone does not certify it.

Outputs retain the preferred query and component lineage, separate role differences,
unresolved holds, original address evidence, training relationships, excluded other
campuses, access guidance and unverified Owner leads. Decision values are
`candidate-for-later-query` or `held-for-evidence`; `acceptedCoordinates` and
`precision` remain null and `productionStatusChanged` remains false. A query
candidate is not a geocoding result. Conflicting concrete targets remain held;
their deterministic audit ordering is not selection of a valid coordinate.

Main's private two-case overlay pins original Source/Evidence/Association/
Observation records and Phase 1 source observations by exact-record hashes,
also verifying the original input file hashes. Its role interpretations are
explicitly review decisions. Executed `main/replay-case-decisions.mjs` produces
`main/case-decisions.json`: both cases preserve the club target and geographic
hold, with no accepted point. Detailed source/role/coordinate ledgers stay ignored.

Developer self-check: **154/154 tests Pass**, zero failures/skips; lint, type check,
build and diff check Pass. The existing Vite large-chunk warning remains. Its
evidence records exact commands, exit codes and hashes of both new code/test files.
Main's independently executed preservation audit confirms all 166 existing files'
bytes, sizes and modification times unchanged, all required baselines unchanged,
and all 16 full Accepted records identical. No formal preparation/import command
was executed; existing tests use isolated synthetic output fixtures.

## Verification evidence and remaining limits

| Verification | Developer | Independent QA |
| --- | --- | --- |
| `npm test` | Pass: 154/154, no failed/skipped tests | Pass: 154/154, no failed/skipped tests |
| `npm run check`, `npm run lint`, `npm run build` | Pass | Pass |
| `git diff --check` | Pass | Pass |
| Additional adversarial helper cases | Covered by 17 new tests | Pass: 18 independently authored checks |
| Original-record/hash/case replay audit | Main actual replay Pass | Pass: 48 checks |
| Original data/Accepted/baseline audit | 166 protected files unchanged | Pass: 30 independently executed checks |
| UAT / browser lifecycle | Not Applicable | Not Applicable |

**Independent QA Pass, no blocking finding, zero product repair rounds.** Main
directly reviewed the actual QA report, raw command logs, 30 data checks, 18
adversarial checks, 48 case checks, five scope/mtime/privacy checks and tested
code/evidence hashes. QA independently reviewed original records and replayed both
cases; Developer's self-check was not used as the independent conclusion.
The existing build-size warning is retained; no new UI or bundle change is involved.
Formal production generation/import was not performed. Live source freshness,
candidate detail retrieval, same-parcel equivalence, actual hall/entrance positions
and future PC/100 yield remain **Not Verified** and are not required claims here.

Two verification-script corrections are retained, without changing product or
acceptance requirements: Main's initial private replay had an extra parent in its
module path and failed before writing a result; corrected replay passes. An initial
QA adversarial assertion expected a held result while the helper rejected the
invalid Owner relationship at construction; QA retained the initial failure and
corrected its assertion to recognise that fail-closed result. No independent
product repair round has been needed.

Evidence root: `output/workflow/2026-11-13/training-venue-address-priority-policy/`.

| Deliverable | Private evidence |
| --- | --- |
| Owner request, loaded roles and starting version | `approved-request.txt`, `role-runtime-manifest.json`, `baseline.json` |
| Protected input/production/history snapshot | `before-manifest.json` |
| Policy and current/revised decisions | This task document; final snapshot in evidence README |
| Actual PS069/PS030 original chains and source limits | `main/case-study-evidence.json`, `main/case-studies-and-phase2-guidance.md` |
| Repeatable role decisions and original record hashes | `main/replay-case-decisions.mjs`, `main/case-decisions.json` |
| Limited C-case impact and Phase 2A rules | `main/limited-classification-impact.json`, case report and this policy |
| Code/test inventory | `main/implementation-files.json` |
| Developer self-check and tested hashes | `developer/report.md`, `developer/self-check.json`, command logs |
| Independent QA | `qa/report.md`, `qa/tested-version.json`, `qa/commands.json`, command logs, `independent-data-audit.json`, `independent-negative-audit.json`, `case-overlay-audit.json`, `safety-audit.json` |
| Main zero-change audit and executed commands | `main/audit-preservation.py`, `main/final-preservation-audit.json`, `main/command-outcomes.json` |

## Completion Handoff

1. **Has the policy been implemented?** Yes, as an executable, review-only role and
   address-selection mechanism. Club ordinary-team training targets take priority;
   this does not alter formal government-result acceptance.
2. **What changed?** One isolated helper, one 17-test file and this task document.
   New private review overlays reference original evidence without altering it.
   No existing product/test/data interface changed.
3. **PS069 handling?** Preserve the club training query; retain school administrative
   address and unverified Owner entrance lead separately; exclude Secondary campus.
   Keep geographic and four-candidate holds, Ambiguous, and no point.
4. **Can PS069 change C to B?** Recommend B in a separate proposed work overlay,
   because the target is sufficiently explicit for bounded candidate/parcel
   investigation. It is neither A-ready nor permission to run that investigation.
   Historical Phase 1 classification stays unchanged.
5. **PS030 and similar safeguards?** Preserved. Club address remains preferred;
   historical alternative property/administrative street do not prove equivalence.
   PS030 stays Ambiguous/C and the other five C cases receive no automatic release.
6. **Are all 16 Accepted unchanged?** Yes. Complete records, coordinates, precision,
   original source proofs and all seven formal artifacts are byte-identical.
7. **Do the 17 A cases need changed handling?** Their work pool remains 17. A future
   approved preparation must apply role priority and component/source lineage;
   this task did not prepare their batch or update their proposed addresses.
8. **Further Owner approval?** Required before Phase 2A, any new query/upload/API
   integration, candidate/parcel investigation, formal coordinate adjudication,
   hall/entrance precision path, publication or deployment. No such approval is
   requested or assumed by this implementation.
9. **Independent QA final result?** **Pass**, no blocking finding and no product
   repair round; all required implementation/preservation checks passed. UAT is
   Not Applicable. Out-of-scope live and hall/entrance claims remain Not Verified.

No external access, API query, government upload, formal production regeneration,
project-external resource modification, commit, push, PR, deployment or publication
occurred. Commands used existing dependencies with project-local cache/temp paths.
Final integration only records QA results and handoff; code, tests, case decisions
and protected production/history files remain the independently reviewed versions.

**Stopped after this policy task. Await Owner acceptance; Phase 2A has not started.**
