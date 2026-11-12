# Training Venue Geocoding Acceptance Policy Implementation

Execution date: **2026-11-12, Australia/Brisbane**. Status: **Implementation Pass; independent QA Pass; stopped for Owner review**.

## Approved Policy and Implementation Scope

The Owner explicitly approved the 2026-11-12 Policy Review and its two decisions:
(1) an official governing association may directly identify a club's ordinary weekly
team training venue; membership/competition/community directories alone do not
establish that relationship; (2) a reliable official address may be reused across
providers at the same specific physical site, without creating an association.
The approved request is retained only in the Git-ignored task evidence directory.

Exact-address acceptance requires a complete reviewed official training/address
chain, strict genuine government matching and no substantive conflict. A complete
club-published address does not universally need a second venue-owner source.
Existing school/operator supplements remain necessary when they supply missing
components. Unresolved identity/campus/building/address conflicts, all default
PC/100 protections and the separate PS079 alias/parcel/exact-row adjudication stay
in effect. Accepted means sufficient location evidence, without refreshing training
status, age/team scope, dates, access restrictions or disclosure approval.

Authorised work: narrow training-venue implementation, seven reviewed address
bindings, existing genuine-result regeneration, tests, independent QA and internal
documentation. No frontend, Provider Address changes, new research/external access,
new upload, publication, Git mutation, deployment or subsequent task is authorised.
Browser UAT and browser/server lifecycle: **Not Applicable**.

## Preflight and Frozen Baseline

Actual HEAD: `02228bed0587791a10acedb3ee2b308689440f98`; initial working tree clean.
Main verified the private research, the complete 28-row policy matrix, genuine
result and provenance are present. The local Brisbane date was checked before
selecting `--validated-on 2026-11-12`; government `obtainedOn` remains 2026-11-06
and original source checks remain 2026-11-05/06.

Evidence root (Git-ignored):
`output/workflow/2026-11-12/training-venue-acceptance-implementation/`.
Main froze 131 existing source/data/history/input/evidence files with SHA-256,
size, mtime and inode; all seven generated artifacts and all 58 result records
were copied into `before-generated/` before implementation. Receipt hashes,
28 government rows / 448 canonical cells, and the matrix's current statuses agree.

Actual custom `developer` and `qa` roles returned their injected loading markers;
agent IDs and markers are retained in `role-runtime-manifest.json`. QA independence
is procedural; both roles inherit parent permissions, without technical read-only
isolation. Maximum three targeted repair/independent regression rounds.

| Metric | Before | After |
| --- | ---: | ---: |
| Providers / eligible associations / physical sites | 54 / 70 / 58 | 54 / 70 / 58 |
| Current Confirmed / Official Listed — Current Status Unknown | 32 / 38 | 32 / 38 |
| Accepted / Ambiguous / Rejected / Pending | 9 / 18 / 1 / 30 | 16 / 11 / 1 / 30 |
| Providers with accepted training sites | 9 | 16 |
| Associations linked to accepted sites | 10 | 21 |
| Separate Provider Address providers / accepted / markers / list-only | 54 / 25 / 19 / 29 | 54 / 25 / 19 / 29 |

## Technical Decisions and Files Changed

The implementation adds a frozen, site-specific official address chain for each
of the seven approved targets. It verifies original source/evidence/observation/
access records, provider/site/venue/association records, canonical address and
component provenance by hash. Existing association qualification and scope are
retained independently of address publishing; the Eagles poster cannot add a
Dunk Star ordinary training association. A separate narrow registry checks the
existing governing-association direct-training statements; membership, competition
or community-directory substitutions fail closed.

The exact-address branch now requires a reviewed `trainingAddressEvidence` chain
and the original structural identity flag after every strict government check.
Seven proofs use `club-published-address`. Existing identity proofs continue as
`official-site-supplement` with their original source role separately retained;
none is converted into an owner certification. The original ten-entry registry,
three reviewed identity bindings, PS079-specific proof and seven-output CLI safety
constraints remain. Neither PS079's alias branch nor the public projection contract
changes. Missing original supplementation cannot be hidden by a generic waiver.

Changed/new tracked source and tests:

- `scripts/training-venues/prepare.mjs`, `validate.mjs`.
- New `scripts/training-venues/reviewed-training-address-bindings.mjs`.
- New `tests/training-venues-address-policy.test.mjs`; adjusted
  `training-venues.test.mjs`, `training-venues-identity.test.mjs` and
  `training-venues-aliases.test.mjs`.
- This task document and the training-venue benchmark README.

Changed ignored data: `venue-inventory.json` (new address-chain metadata),
`venue-geocoding-results.json` (seven upgrades, proof/basis and validation date),
and `training-venue-candidates.json` (seven accepted coordinate/precision pairs).
The other four generated files retain their exact bytes. Private research and
proofs remain outside frontend imports and public build artifacts.

## Actual Seven-Site Outcomes

All seven strict checks passed during formal generation. No target remains
Ambiguous. The complete private address/coordinate/source/association ledger is
`main/newly-accepted-site-ledger.json` under the ignored evidence root.

| Site | Outcome and precision | Retained distinction/limitation |
| --- | --- | --- |
| PS003 — Calamvale Community College | Accepted / campus-level | Campus address vs entrances; three associations retain their individual temporal classes |
| PS009 — Eagles Sports Complex | Accepted / venue-level | Shared official club poster supplies address; BK Owls/Hornets relationships remain separate; no Dunk Star association added |
| PS066 — RVSSC / Raptordome | Accepted / campus-level | Raptordome belongs to this campus; Amare remains separate |
| PS070 — Warrigal Road State School | Accepted / campus-level | Ordinary team rows remain distinct from TrainingOnly and broad time windows |
| PS071 — Nissan Arena | Accepted / venue-level | Hornets and Rockets team scopes and cancellation/court dates remain separate |
| PS072 — Runcorn State High School | Accepted / campus-level | Original temporary unavailability preserved; point is not a stadium entrance |
| PS075 — Sunnybank Hills State School | Accepted / campus-level | Ordinary team training remains distinct from ELITES, TrainingOnly and holiday programs |

These are exact original government PC/100 pairs. Government raw rows and confidence
were not edited. The seven upgrades increase distinct Provider coverage by seven
and association coverage by eleven; no new Provider, association or site is added.

## Formal Regeneration and Main Audit

The genuine inputs were reused without upload or modification:

```sh
npm run prepare:training-venues -- --results output/workflow/2026-11-06/training-venue-same-site-aliases/inputs/government-results.csv --result-provenance output/workflow/2026-11-06/training-venue-same-site-aliases/government-result-provenance.json --validated-on 2026-11-12
```

Repeat import and the same command plus `--check` exited 0. Main independently
compared semantic fields using Python: 776 assertions pass, including all 448
canonical government cells; exact input echoes; only seven status changes;
original nine coordinate/precision/identity/alias proofs; all 30 complete Pending
records; original upload/mapping bytes, inode and mtime; stable inventory identities,
associations/scopes, and Provider Address 54/25/19/29. New proof metadata and date
changes are separately recorded, not mistaken for unchanged whole-JSON bytes.
The old Stage A/B/C, identity and policy-review records remain intact.

## Independent QA

**Pass, zero product repair rounds.** Main directly reviewed the independent
custom QA report, raw logs, command exit codes, data/negative/privacy audits,
repeat-generation file identity and all 134 tested product/input/document hashes.
No code, test, source input or formal data changed after this independent run.
Only this task's final QA/handoff wording and the README's QA status were completed
subsequently; the final handoff manifest records those documentation differences.

| Independent check | Actual result |
| --- | --- |
| `npm test` | Pass — 137 passed, 0 failed, 0 skipped |
| `npm run check` | Pass — exit 0 |
| `npm run lint` | Pass — exit 0 |
| `npm run build` | Pass — exit 0; existing Vite large-chunk warning retained |
| `git diff --check` | Pass — exit 0 |
| Genuine CSV/provenance/date full-parameter `--check` | Pass — all seven files match |
| Independent repeat formal generation | Pass — all seven hashes, bytes, inodes and mtimes unchanged |
| Independent Python data audit | Pass — 1,184 assertions |
| Independent positive/negative audit | Pass — 499 cases |
| Independent source/privacy/scope/version audit | Pass — no private proof/raw-input frontend leakage |
| Browser UAT and browser/server lifecycle | Not Applicable — no frontend change or session |

QA independently checked missing/tampered records and official publication chains,
wrong site/provider/venue/address components, nonofficial/directory substitutions,
unknown building/wrong campus, Confidence 99/98 and non-PC/comment/range returns,
multiple candidates/parsing/missing coordinates, association/activity/scope
isolation, old supplement removal, PS079 proof/exact-row isolation and Provider
Address regression. It read the original sources, rather than inferring credibility
from the new registry alone. A030/A132 retain their original Unknown temporal
status; other associations retain their own original status.

Developer self-check also passed all required commands and 137 tests. Two initial
self-check assertions were corrected: an obsolete slim coordinate count of nine,
and a new test's assumption that all five governing-source relationships had the
same temporal status. Original classifications were retained; no standard or
source was weakened. Initial logs are preserved separately. These were self-check
corrections, not independent QA repair rounds.

### Non-product directory metadata observation

The first broad QA preservation audit stopped with **Fail** on the previous policy
review directory's `.DS_Store` hash change. The initial exception/exit status remain
in `qa/data-audit-initial.log` and `qa/audit-commands-initial.json`. QA and Main
independently identified the Bud1 macOS directory-display metadata format and
retained its before/after hashes, size and inode. The updating process is
**Not Verified**; no attribution is claimed, and the file was not restored or
overwritten by this task.

QA independently classified this one change as non-blocking: it is not a research,
government, evidence, product, formal-output or historical task record. Of the
131 frozen baseline files, **121 remain byte-identical, nine have authorised
substantive changes, and one has this reported non-product metadata drift**.
Every required substantive preservation check passes; no original input/evidence
protection was waived. See `main/finder-metadata-drift.json` and the QA report.

## Remaining Limitations

No new external source verification is authorised. Retained research observations
cannot establish current online freshness, current training occurrence, owner use
permission, precise basketball hall/court/entrance, or independently surveyed
accuracy. Source/temporal/team/access/manual/disclosure restrictions remain.
PS044, PS046, R2L-PS002, PS005, eight no-coordinate government responses and 30
Pending records receive no automatic exemption.

## Implementation Result and Completion Handoff

**Implementation Pass.** The actual seven upgrades produce **16 Accepted /
11 Ambiguous / 1 Rejected / 30 Pending**, with accepted coverage of **16 distinct
Providers / 21 existing eligible associations** (increases of seven and eleven).
There are no retained-Ambiguous exceptions among the seven targets and no failed
or Not Verified required implementation checks. The metadata update origin and
out-of-scope live/source/entrance checks above remain explicitly Not Verified.

Previous Stage A/B/C, PS079, identity and policy-review documents and substantive
private evidence remain unchanged. The website, Provider Address data/validator,
React/MapLibre/search/list code, public projection contract and application imports
are unchanged. No new external access/investigation, government upload, third-party
API, project-external resource write, installation, browser/server launch, Git
commit/push/PR, deployment or publication occurred in this task.

Primary private evidence, relative to the ignored evidence root:

- `approved-request.txt`, `role-runtime-manifest.json`, `before-manifest.json`,
  `before-generated/`, `after-generated/`: approval, loaded roles, original hashes
  and complete before/after seven-output snapshots.
- `main/preflight.json`, `main/full-matrix-source-audit.json`: availability,
  receipt/input checks, all 28 policy rows and original source/evidence projections.
- `developer/seven-address-chain-review.json`, `status-comparison.json`,
  `report.md`, `command-outcomes.json`, adjacent logs and `tested-manifest.json`:
  seven source chains, formal generation/check, self-check and tested version.
- `main/newly-accepted-site-ledger.json`: each exact address, government coordinate,
  precision, source role/hash/observation chain and unchanged association limits.
- `qa/report.md`, `commands.json`, `data-audit-command.json`,
  `independent-data-audit.json`, `independent-negative-audit.json`,
  `independent-safety-audit.json`, `genuine-repeat-audit.json`, raw logs and
  `tested-version.json`: independent execution, data, positive/negative, privacy
  and repeatability acceptance; initial failure evidence remains alongside them.
- `main/final-data-audit.py`, `main/final-data-audit.json`,
  `main/finder-metadata-drift.json`: Main's independent semantic comparison and
  explicit metadata observation.
- `main/final-review.json`, `final-tested-version.json`: Main's direct final
  QA evidence/hash verification, final changed-file list and handoff version.

**Stop here and await Owner review. No website integration or subsequent stage
was started or is automatically authorised by this result.**
