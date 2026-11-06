# Training Venue Data Preparation & Geocoding

## Latest Stage B/C result — 2026-11-06

**Complete — Stage B/C and the same-site alias supplement. Independent QA Pass.** The owner supplied
the original Stage B/C request, a genuine government CSV, explicit permission for
PS079 official-source verification, and the actual download date (2026-11-06,
Brisbane time). The same-site supplement overrides the original pre-rejection of
PS079. The Stage A record below remains historical.

Current actual result: **Accepted 6 / Ambiguous 21 / Rejected 1 / Pending 30**.
All 54 Providers, 70 Associations and 58 Physical Sites remain. The 28 results join
by InputIndex AND exact upload echoes AND verified hashes, never output order.
Twenty rows contain candidate coordinate pairs; eight contain none. Only the six
Accepted coordinate pairs reach the internal, publication-unapproved slim dataset.
There is no UI/map/Provider Address integration or publication.

### Genuine inputs and formal interface

- Owner-supplied original: /Users/rui/Downloads/OutputLocations-AddressInputs-134384122538529148.csv.
- Exact ignored working copy: output/workflow/2026-11-06/training-venue-same-site-aliases/inputs/government-results.csv.
- Result SHA-256: af93783481c4b2917abe63b98355776631bffd7d2beb376e11847983b481a8af.
- Upload SHA-256: bae3b00032a43f0b86e92d270851f4507c248e6a2d43c814dd321e70d3a778e2.
- Genuine receipt: output/workflow/2026-11-06/training-venue-same-site-aliases/government-result-provenance.json. obtainedOn and
  validatedOn are 2026-11-06; date is explicitly owner-confirmed, not inferred.
- Original and working government bytes remain unchanged; all 16 canonical parsed
  values are retained per imported result, including Lot/Plan, building name and
  original confidence. The unchanged TASK-006 parser trims outer cell whitespace:
  28 Comment cells have trailing whitespace in the original CSV. The result field
  named rawGovernmentRow contains those canonical parsed values, not literal cell
  bytes. The original CSV remains authoritative. No synthetic fixture is imported.

Formal command (project-local npm cache/TMPDIR as in the evidence logs):

```sh
npm run prepare:training-venues -- --results output/workflow/2026-11-06/training-venue-same-site-aliases/inputs/government-results.csv --result-provenance output/workflow/2026-11-06/training-venue-same-site-aliases/government-result-provenance.json --validated-on 2026-11-06
```

Use the same command with --check to compare all seven generated files. A plain
Stage A rerun intentionally refuses to discard already imported government results.
Repeat import and same-argument check were byte-identical in Developer self-check.

### Accepted positions and evidence

| Physical Site | Venue | Accepted latitude, longitude | Precision | Independent identity support |
| --- | --- | --- | --- | --- |
| PS023 | Camp Hill State Infants and Primary School — multipurpose hall | -27.49130463, 153.07861568 | campus-level | P2-E024 |
| PS037 | Moreton Bay Boys’ College | -27.47223751, 153.17384728 | campus-level | P2-E028 |
| PS060 | JBS Arena — Ipswich Basketball Stadium | -27.6109996, 152.80035615 | venue-level | P2-E031 |
| PS076 | Centenary State High School | -27.53761307, 152.94006406 | campus-level | P2-E022 |
| PS077 | Corinda State High School | -27.54608523, 152.98797236 | campus-level | P2-E033 |
| PS079 | Wynnum State High School | -27.4542584, 153.17627525 | campus-level | PS079-OFFICIAL-CHAIN-20261106 |

PC means a property/campus location here; no basketball hall or entrance accuracy
is claimed. Five school/college positions are campus-level; PS060 is venue-level.
PS079 retains Confidence 97. Its exact-row review is independently resolved only
by the approved official school/Council/address-registration/parcel/spatial chain;
all default strict validation and other-site gates remain in effect. Full source
URLs, raw hashes, school-number limitation, Lot/Plan comparison, address alias and
geometry assessment are recorded separately in
[the PS079 supplement](TRAINING-VENUE-SAME-SITE-ALIASES.md).

### All 28 government result conclusions

| Index | Physical Site | Submitted → returned | Type / confidence | Status | Main reason |
| ---: | --- | --- | --- | --- | --- |
| 1 | PS003 | 11 Hamish Street, Calamvale 4116 → 11 HAMISH ST  CALAMVALE QLD 4116 | PC / 100 | Ambiguous | 缺少已登记的独立官方场地身份绑定 |
| 2 | PS004 | 56 Zahel Street, Carina 4152 → (no selected coordinate) | — / — | Ambiguous | 9 个候选，无选定坐标 |
| 3 | PS005 | 85 North Road, Lindum 4178 → 85 NORTH RD  WYNNUM WEST QLD 4178 | PC / 97 | Rejected | Lindum → Wynnum West，独立同校园别名未成立；97 |
| 4 | PS009 | 109 Weedon Street West, Mansfield 4122 → 109 WEEDON ST W  MANSFIELD QLD 4122 | PC / 100 | Ambiguous | ST W / Street West 格式已确认等价；仍缺少身份绑定 |
| 5 | PS023 | 676 Old Cleveland Road, Camp Hill 4152 → 676 OLD CLEVELAND RD  CAMP HILL QLD 4152 | PC / 100 | Accepted | 完整地址一致、100/PC及独立官方学校证据 |
| 6 | PS027 | 134A Parkland Drive, Springfield Central 4300 → 134A PARKLAND DR  SPRINGFIELD CENTRAL QLD 4300 | PC / 100 | Ambiguous | 缺少已登记的独立官方场地身份绑定 |
| 7 | PS030 | 41 Colwyn Street, Wishart 4122 → (no selected coordinate) | — / — | Ambiguous | 11 个候选，无选定坐标 |
| 8 | PS031 | 90 Klumpp Road, Upper Mount Gravatt 4122 → (no selected coordinate) | — / — | Ambiguous | 2 个候选，无选定坐标 |
| 9 | PS032 | 249 Priestdale Road, Rochedale 4123 → 249 PRIESTDALE RD  ROCHEDALE QLD 4123 | PC / 100 | Ambiguous | 缺少已登记的独立官方场地身份绑定 |
| 10 | PS037 | 302 Manly Road, Manly West 4179 → 302 MANLY RD  MANLY WEST QLD 4179 | PC / 100 | Accepted | 完整地址一致、100/PC及独立官方学院证据 |
| 11 | PS044 | 146 Bryants Road, Shailer Park 4128 → 146-170 BRYANTS RD  SHAILER PARK QLD 4128 | PC / 98 | Ambiguous | 146 → 146–170、未核实的建筑标签及98，保留复核 |
| 12 | PS046 | 94-120 Springwood Road, Rochedale South 4123 → 94-120 SPRINGWOOD RD  ROCHEDALE SOUTH QLD 4123 | PC / 100 | Ambiguous | 门牌范围及未核实的旧建筑名称，保留复核 |
| 13 | PS049 | 2036 Wynnum Road, Wynnum West 4178 → (no selected coordinate) | — / — | Ambiguous | 75 个候选，无选定坐标 |
| 14 | PS060 | 2A Ross Llewellyn Drive, Booval 4304 → 2A ROSS LLEWELLYN DR  BOOVAL QLD 4304 | PC / 100 | Accepted | 完整地址一致、100/PC及独立运营方证据 |
| 15 | PS066 | 18 Parkway Avenue, South Ripley 4306 → 18 PARKWAY AV  SOUTH RIPLEY QLD 4306 | PC / 100 | Ambiguous | AV / Avenue 格式已确认等价；仍缺少身份绑定 |
| 16 | PS067 | 25 Cothill Road, Booval 4304 → (no selected coordinate) | — / — | Ambiguous | 22 个候选，无选定坐标 |
| 17 | PS069 | 966 Gowan Road, Stretton 4116 → (no selected coordinate) | — / — | Ambiguous | 4 个候选，无选定坐标 |
| 18 | PS070 | 312 Warrigal Road, Eight Mile Plains 4113 → 312 WARRIGAL RD  EIGHT MILE PLAINS QLD 4113 | PC / 100 | Ambiguous | 缺少已登记的独立官方场地身份绑定 |
| 19 | PS071 | 590 Mains Road, Nathan 4111 → 590 MAINS RD  NATHAN QLD 4111 | PC / 100 | Ambiguous | 缺少已登记的独立官方场地身份绑定 |
| 20 | PS072 | 132 Hill Road, Runcorn 4113 → 132 HILL RD  RUNCORN QLD 4113 | PC / 100 | Ambiguous | 缺少已登记的独立官方场地身份绑定 |
| 21 | PS075 | 77 Symons Road, Sunnybank Hills 4109 → 77 SYMONS RD  SUNNYBANK HILLS QLD 4109 | PC / 100 | Ambiguous | 缺少已登记的独立官方场地身份绑定 |
| 22 | PS076 | 1 Moolanda Street, Jindalee 4074 → 1 MOOLANDA ST  JINDALEE QLD 4074 | PC / 100 | Accepted | 完整地址一致、100/PC及独立官方学校证据 |
| 23 | PS077 | 46 Pratten Street, Corinda 4075 → 46 PRATTEN ST  CORINDA QLD 4075 | PC / 100 | Accepted | 完整外括号名称格式已确认等价；100/PC及独立官方学校证据 |
| 24 | PS078 | 63 Ernest Street, Manly 4179 → (no selected coordinate) | — / — | Ambiguous | 17 个候选，无选定坐标 |
| 25 | PS079 | 25 Peel Street, Manly 4179 → 77 BUDERIM ST  WYNNUM QLD 4178 | PC / 97 | Accepted | 官方同校园双地址/地块/空间证据；97原样保留并经专属精确行裁定 |
| 26 | R2L-PS001 | 17 Beauvardia Street, Cannon Hill 4170 → 17 BEAUVARDIA ST  CANNON HILL QLD 4170 | PC / 100 | Ambiguous | 尚未登记到独立身份绑定；已有研究证据可优先审查 |
| 27 | R2L-PS002 | 54 Prospect Road, Mitchelton 4053 → 54A PROSPECT RD  MITCHELTON QLD 4053 | PC / 99 | Ambiguous | 54 → 54A 及99，缺少该地址变体的独立证据 |
| 28 | PS020 | Corner Mount Cotton and Degan Roads, Capalaba 4157 → (no selected coordinate) | — / — | Ambiguous | 政府地址解析失败；无选定坐标 |

### Unaccepted sites and next evidence priorities

The 10 coordinate candidates without a registered independent identity
binding are PS003, PS009, PS027, PS032, PS066, PS070, PS071, PS072, PS075, R2L-PS001. High confidence is not
proof that a point represents the intended campus/venue. This means the current
validated registry is insufficient; it does not claim that every underlying
research source lacks useful evidence. R2L-PS001's existing official-source research
is a useful next binding-review candidate.

Seven no-coordinate results are multiple-candidate returns: PS004 (9), PS030 (11), PS031 (2), PS049 (75), PS067 (22), PS069 (4), PS078 (17).
PS020 is an explicit government address-parsing failure. Neither category gets
a point. There are no invented suburb centroids or fallback Provider Address points.

PS005 remains Rejected by strict locality comparison (Lindum vs Wynnum West), with
no independently verified same-campus exception. This rejects the current match;
it does not assert Iona College is absent from that locality. PS044 remains
Ambiguous for 146 vs 146–170, label and confidence qualifications; R2L-PS002 remains
Ambiguous for 54 vs 54A and confidence 99. They do not inherit PS079's exception.
PS046's range/old school label also remains unaccepted.

All 30 unsubmitted sites remain **Pending**, with their complete result records
deep-equal to the captured Stage A originals. They are:

- Tier B: PS047.
- Tier C: PS001, PS008, PS013, PS021, PS024, PS025, PS026, PS045, PS048, PS050, PS051, PS052, PS063.
- Tier D: PS002, PS006, PS007, PS010, PS019, PS034, PS041, PS042, PS043, PS064, PS073, PS093, PS094, PS095.
- Tier E: PS059, R2L-PS003.

Tier totals remain A27/B2/C13/D14/E2, address enrichment improvement zero. Five
other Stage A artifacts (inventory, associations, addresses, mapping and preparation)
remain byte-identical. PS059/R2L-PS003 unresolved conflicts and PS044/PS076 historical
resolutions remain intact.

Most useful future evidence work, only if separately authorised: review existing
official identity evidence for R2L-PS001 and the other identity-binding gaps; independently
check PS005 locality aliases, PS044 property range and R2L-PS002 number suffix;
resolve PS046's name/range; review the seven genuine multi-candidate returns and
PS020's parsing-compatible intersection input. No such additional lookup is started.

### Implementation and independent acceptance

The training wrapper adds site-specific same-site proof validation, retains
Lot/Plan/raw fields, and resolves only PS079's exact Confidence-97 review. Known
wrong campuses stay Rejected; unknown building labels stay Ambiguous. Harmless
outer parentheses, terminal AV/Avenue and trailing W/West are normalized only for
validation, without altering raw return values. PS009/PS066 stay Ambiguous because
normalizing format does not prove site identity. Shared TASK-006 Provider Address
code/results and all frontend files are unchanged.

Developer self-check and initial independent QA: 120 tests passed, zero failed/skipped;
type check, lint, build, genuine-result --check and diff --check passed. Initial
independent QA nevertheless found one classification defect: after a proven street
format difference was removed, a remaining review-only diagnostic incorrectly kept
the old Rejected status. Six counterfactual cases demonstrate it. The actual dataset
remains 6/21/1/30; no coordinate was wrongly accepted. One targeted repair/regression
round resolved it. Initial 48-case independent negative audit records 42 Pass
and six same-root failures; this Fail is preserved rather than hidden by the suite.
Final independent replay passed **48/48**, with **14 additional classification
guards** passing. All six original failures now return Ambiguous with no Accepted
point, retaining their original strict diagnostics. Source/geometry and actual-data
audits passed independently and remain applicable by unchanged artifact hashes.

Final independent tests: **129/129, 0 failed, 0 skipped**. npm check, lint, build,
git diff --check and the full genuine-results/receipt/date command with --check all
passed (exit 0). Existing Vite chunk-size and Node experimental warnings remain;
none was hidden by configuration changes. All runtime cache/temp output was local
to this task. Initial 120-test Fail history is preserved under qa/initial/;
final independent code/data/evidence versions and raw logs are under qa/round-1/.
This Stage B/C round used one targeted repair. The earlier Stage A repair remains
separate historical evidence. No required data/QA item is left Not Verified.
Evidence root: output/workflow/2026-11-06/training-venue-same-site-aliases/. See developer/final/, qa/source-review.*,
main/PS079-independent-proof-audit.json, main/actual-data-audit.json and
main/stage-a-before-import/manifest.json. See qa/report.md and qa/round-1/report.md
for final acceptance, qa/round-1/tested-version.json for 18 code/data and eight
evidence/input hashes, and main/final-review.json plus final-tested-version.json
for Main's final direct evidence/version checks. Browser/UI UAT and browser/server
lifecycle are Not Applicable: neither browser nor server was started.

This implementation uses the already loaded actual custom developer/qa roles,
reconfirmed via injected markers. It does not claim a UAT browser run. No production
deployment, Git commit, Facebook access, provider contact or TASK-008 work occurred.
No additional user action is required to complete this approved data task. The
unresolved candidates need evidence only if a future task is separately approved.
Implementation stops here, awaiting owner review; no website integration is started.

---

## Historical Stage A result — 2026-11-06

**Stage A Complete — Awaiting External Geocoding Results.** Independent QA: **Stage A
Pass** after one targeted repair round. All required offline acceptance checks pass.
Actual training-venue government geocoding and coordinate validation: **Pending /
Not Verified**. Browser/UI UAT and browser/server lifecycle: **Not Applicable**;
no browser or service was started. This is not an overall Complete declaration.

Accepted **0** / Ambiguous **0** / Rejected **0** / Pending **58**. All 54 Provider
identities, 70 eligible relationships and 58 physical sites are retained. Prepared
tiers remain A27/B2/C13/D14/E2; address enrichment improvement is zero. The official
batch contains 28 safe rows, while 30 sites are held with explicit reasons.
The existing application remains 54 providers / 25 mapped / 19 grouped markers /
29 list-only. No UI integration, publication, deployment or Git commit occurred.

## Authority and scope

Approved request: owner's pasted task dated 2026-11-06, retained privately in
`output/workflow/2026-11-06/training-venue-geocoding/approved-request.txt`.
The three supplied decision/research files are inputs; their embedded historical
instructions do not supersede the owner's request. This is independent of TASK-008.

Implement an offline, deterministic training-venue data pipeline, official Queensland
batch export, conservative import/validation, privacy-filtered internal candidates,
tests and a manual handoff. No UI, map, provider-link, search, historical TASK-004–007,
or accepted provider-address changes. No publication, commit, deployment, dependency
installation, external request, browser automation or new service is authorised.
All writes and runtime cache/temp output stay in this project.

## Preflight and acceptance baseline

Main read AGENTS.md, .codex/WORKFLOW.md and role configurations, TASK-006 and its
official CSV fixture/export/validation implementation, and Provider Link Enrichment.
All three requested inputs were readable. Before modifications, Main independently
selected associations from authoritative `regularTrainingAssessment` fields and
reconciled IDs with the decision inventory. Counts agree:

| Metric | Required and actual |
| --- | ---: |
| Original provider identities | 54 |
| Eligible ordinary weekly training associations | 70 |
| Current Confirmed / Official Listed | 32 / 38 |
| Providers with references | 30 |
| Physical sites / current-confirmed sites | 58 / 28 |
| Address Tier A / B / C / D / E | 27 / 2 / 13 / 14 / 2 |
| Associations flagged for manual review | 8 |

Retain PS059 and R2L-PS003 as unresolved; preserve PS044 and PS076 historical
conflicts and their recorded resolutions. No fabricated addresses, coordinates,
times, enrolment status or guaranteed attendance. No postcode/name-only site merge.

Raw research is copied only into the already Git-ignored task evidence `inputs/`
directory. It must never enter public/, src/data/, a frontend import or a commit.
Derived candidates remain internal and unapproved for publication.

Required tests cover the owner's twenty criteria: exact provider/association/site
identities and temporal counts; activity exclusion; shared sites; deterministic
generation/check mode; address normalization, ranges, intersections, missing data
and conflicts; result mapping and conservative campus/precision validation; no
invented coordinates or sensitive research leakage; unchanged 54/25/19 app baseline.
Execute npm test/check/lint/build and git diff --check using local dependencies and
project-local npm cache/temp directories. Independent QA must verify the results.
Browser/UI UAT is **Not Applicable** because application files are unchanged; no
server/browser should be launched for process alone. Stage B/C live validation is
**Pending / Not Verified** until genuine applicable government results are supplied.

## Pre-existing working tree and evidence

HEAD at task start: `1622a0191c00bbd38435de7c0758045edf690d3b`.
The tree was already dirty; preserve all existing edits/untracked work.
Exact initial status and SHA-256 file baseline are retained in
`output/workflow/2026-11-06/training-venue-geocoding/task-start-manifest.json`.
Input paths/hashes and independent counts are retained in `preflight.json` beside it.
The baseline represents the working files, not HEAD alone.

| Supplied input | SHA-256 |
| --- | --- |
| `youth_training_venues_phase2_revised_local.json` (schema 3.0-revised-local-research, version 1.0, as of 2026-11-06) | `29c8f7726466bcc72bfd5e5bba5cf657370f272e74b9a8dbea757823cb433dde` |
| `Youth_Sports_Finder_Training_Venue_Product_Data_Decisions_2026-11-06.json` | `d413041b503e7bf3f503275fce02b7fa4177f33305831801fbd920775de08ae0` |
| `Youth_Sports_Finder_Training_Venue_Product_Data_Decisions_2026-11-06.md` | `6d1ab3c8dff69f4e913dcbddf8cbe2805de4cb4941b8716048365824017b1f41` |

Original paths are `/Users/rui/Downloads/<filename>`. Only these explicitly supplied
files were read there; no unrelated personal files were accessed. The working
snapshots have identical bytes and remain under the ignored task evidence directory.

TASK-006's local official example and genuine government response establish the
reused schema; no live website or undocumented API was queried in this task.
Its provider-address results belong to a separate batch and cannot be joined by
row order or represented as this task's training-venue result. The accepted
provider dataset hash is `c6650ebffda0bdd3417545e47be3782b97e6daf3763faa5d81c85bcb14de1c07`.
Main independently counted 54 providers / 25 accepted / 19 distinct coordinate
groups / 29 list-only in `main-app-baseline.json`.

Actual custom role loading is recorded in `role-runtime-manifest.json`:
`developer` → `/root/training_venue_developer` → `YSF-DEVELOPER-1`,
`qa` → `/root/training_venue_qa` → `YSF-QA-1`. Both returned injected configuration
markers without reading their TOML for the answer. Browser/UI UAT is Not Applicable;
no UAT agent or browser execution is claimed. QA inherits the parent permissions;
its non-editing role is not a claim of a separate read-only sandbox.

## Implementation Result

Implementation, self-check, independent QA and the first authorised repair/retest
round are complete. QA confirmed the initial path-containment defect is fixed.
The generated address results are:

| Tier | Original | Prepared | Exported | Held |
| --- | ---: | ---: | ---: | ---: |
| A — numbered street | 27 | 27 | 27 | 0 |
| B — named/intersection | 2 | 2 | 1 | 1 |
| C — partial | 13 | 13 | 0 | 13 |
| D — missing text | 14 | 14 | 0 | 14 |
| E — unresolved conflict | 2 | 2 | 0 | 2 |
| Total | 58 | 58 | 28 | 30 |

No address components were added and no Tier was promoted. Existing linked evidence
was inspected offline; QA independently found no reliable complete street/postcode
addition for the 27 C/D sites. Formatting normalizes whitespace and range punctuation
while preserving original strings. PS020's explicit intersection can be submitted
as supplied, but an intersection result still requires cautious location review.
PS047's supplied venue-and-street text contains an additional comma and is held
under the reused unquoted-CSV compatibility rule. The tool does not delete its venue
name, substitute a nearby street number, or claim current remote parser behavior.

The two Tier E sites remain unresolved: PS059 has Mount Crosby / Karana Downs
locality claims; R2L-PS003 has 2–34 / 2–36 Badgen Road claims. Conflict history for
PS044 and PS076 is retained with its prior resolutions. For PS076, the school's
physical address and public vehicle entrance have distinct roles; an eventual
campus pin cannot be described as a gym or public entrance.

The generated geocoding inventory currently reports **Accepted 0 / Ambiguous 0 /
Rejected 0 / Pending 58**. This is absence of applicable external results, not 58
failed government lookups. No training-venue candidate or accepted coordinates have
been invented. Future validation code is being tested with explicitly synthetic
fixtures; those fixtures are not government result evidence.

### Independent verification and repair history

Developer initially ran generation, generated `--check`, npm test (99/99, zero
skipped), type check, lint, build and `git diff --check`, all exit 0. Independent QA
also ran all required checks and audited the actual source/output/bundle. Its data
audit passed, but its initial overall result was **Fail**: an output-file symlink
could redirect a write to another file inside the project. The allowed default
directory anchor was also vulnerable to internal symlink redirection.

QA reproduced the overwrite using only its own generated-tests sentinel; no real
product/raw-input/external file was touched. Actual before/after hashes and the
failure are preserved in `qa/path-symlink-negative.json`. Main authorised one
targeted repair round: immutable allowed directory anchors and complete preflight
of output/temporary/read targets, so rejection occurs before partial output.
Initial code/tests and Developer manifest are preserved in `round-0/`; QA's initial
command/data audit evidence remains in `qa/`. Passing existing tests alone did not
override this independent failure. Final independent regression passed: all 31
negative path cases rejected unsafe targets with unchanged sentinel bytes and no
partial output. Fixed lexical anchors, all-target preflight, no-follow regular-file
reads and staging before replacement are covered. Only the CLI and its tests changed;
all eight benchmark artifacts retained their initial QA hashes. One repair round
was used; the maximum was three.

Main separately recomputed raw selection and verified the seven artifacts, CSV hash
and joins, all 54/70/58 identities, 11 shared sites, 8 review flags, 93 accepted
contact links and null coordinates in `main-independent-audit.json`. All 76 protected
pre-existing files are byte-identical to the task-start snapshot. Removing precisely
the added npm script recreates the original package.json SHA-256. This data/version
audit is independent of the generator, and does not substitute for QA's safety review.

### Final checks and evidence

Independent QA executed the following against the final frozen version:

| Check | Final result |
| --- | --- |
| `npm test` | Pass, exit 0; 102 passed, 0 failed, 0 skipped, including 22 training-data tests |
| `npm run check` | Pass, exit 0 |
| `npm run lint` | Pass, exit 0 |
| `npm run build` | Pass, exit 0; existing Vite chunk-size warning retained |
| `git diff --check` | Pass, exit 0 |
| `npm run prepare:training-venues -- --check` | Pass, exit 0; all seven generated data files byte-identical |
| Independent path/sentinel regressions | Pass, 31 cases; before/after SHA-256 identical, no partial output |
| Owner's twenty acceptance criteria | Offline requirements Pass; actual external results Pending / Not Verified |
| Browser/UI UAT | Not Applicable; no application change or browser run |

The Node experimental type-stripping warning also remains. No warning was suppressed
by weakening configuration. All npm invocations used project-local
`NPM_CONFIG_CACHE=output/workflow/2026-11-06/training-venue-geocoding/npm-cache` and
`TMPDIR=output/workflow/2026-11-06/training-venue-geocoding/tmp` (absolute paths at
runtime). No dependency installation or service launch was needed.

Primary evidence root: `output/workflow/2026-11-06/training-venue-geocoding/`:

- `preflight.json`, `task-start-manifest.json`, `main-app-baseline.json` and
  `role-runtime-manifest.json`: input/version/role/scope baseline.
- `developer/report.md`, `developer/round-1/report.md`, command outcomes, raw logs
  and `developer/round-1/tested-manifest.json`: implementation and final self-check.
- `qa/input-audit.json` and `qa/data-audit.json`: independent input, ID, evidence,
  address, privacy/bundle and protected-file verification.
- `qa/initial/`: original independent Fail, actual overwrite proof and initial
  tested version; `round-0/`: initial CLI/tests and Developer manifest.
- `qa/report.md`: all twenty required criteria and final independent acceptance.
- `qa/round-1/report.md`, `commands.json`, six raw logs, `path-audit.json`, its
  reproducible script and `tested-version.json`: final independent safety/test proof.
- `main-independent-audit.json`, `main-final-review.json`, `main-final-commands.json`
  and `final-tested-version.json`: Main's direct source/output/version checks and
  final evidence review; the last manifest includes this completed task document.

The final QA manifest freezes 14 implementation/package/artifact files. Main checks
their current hashes against that version and compares protected baseline files.
The working-tree hashes, rather than unchanged HEAD alone, identify the tested code.
The complete upload CSV SHA-256 is
`bae3b00032a43f0b86e92d270851f4507c248e6a2d43c814dd321e70d3a778e2`.
Keep it paired with the mapping until genuine results return.

### Generated files

All seven data files are in `data/benchmarks/training-venue-geocoding/`:

| File | Purpose |
| --- | --- |
| `venue-inventory.json` | All 58 sites, original/normalized addresses, aliases, exact relationship IDs, evidence references, conflicts, readiness and input hashes |
| `eligible-associations.json` | All 54 provider identities and the 70 included relationships; authoritative activity/temporal/team scope and original evidence IDs, internal audit only |
| `addresses.csv` | 28 data rows, UTF-8, CRLF, official `Address to Validate,LOCALITY` header, no additional submission fields |
| `address-mapping.json` | Stable site/association/provider mapping, upload SHA-256, held addresses and reasons; never uploaded |
| `address-preparation-results.json` | All 58 address reviews and unchanged original/prepared tiers, no unsupported enrichment |
| `venue-geocoding-results.json` | All 58 explicit Pending outcomes, null candidate/accepted coordinates, reasons and provenance fields |
| `training-venue-candidates.json` | Typed, allowlisted internal projection: all 54 providers, 58 venues and 70 relationships; `publicDisplayApproved: false` |

`README.md` in the same directory gives reproduction, genuine-result receipt schema,
import instructions and limits. New implementation files are
`scripts/prepare-training-venues.mjs`, `scripts/training-venues/prepare.mjs`,
`scripts/training-venues/validate.mjs`, `scripts/training-venues/contract.d.ts`, and
`tests/training-venues.test.mjs`. The sole changed pre-existing file is
`package.json`, adding only `prepare:training-venues`. This task document is new.

The adapter pins all three inputs and independently recomputes eligibility, identity
joins, deduplication and tiers before rendering. Its explicit output-directory
allowlist rejects public/src/dist, raw-input directories, root and symlink redirects.
The established TASK-006 serializer, strict result reader and address validator are
imported without editing any historical file. All seven output bytes are compared
in `--check`; source/count/hash/mapping failures occur before output replacement.
Individual files are replaced via same-directory temporary files and rename; the
seven renames are not a single transaction. After interruption, rerun and check
before use. No current government-result file is present or overwritten.

Contacts in the slim dataset come from the already accepted Provider Link projection
and its existing URL/type validator, with Facebook groups/posts excluded. Raw scope,
notes and schedule text remain only in the internal relationship audit; slim records
retain association references, age tags from the latest assessment, mandatory scope
review and standardized limitations. No browser/session records, personal member
names, internal screenshots or raw research evidence objects are projected.

Future accepted results require both address-component checks and an independently
derived site-specific official evidence binding. The frozen registry initially
covers ten sites; other address matches remain reviewable. It deliberately excludes
the unsupported Wynnum State High School number from identity proof. Blank or high
confidence alone is insufficient. Candidate coordinates remain internal; only
Accepted coordinates can reach the slim projection. School precision is campus-level,
never the basketball hall or entrance. Evidence hashes and provenance are retained.

### All unresolved location IDs

Every physical site remains without an Accepted training location. The complete
58-ID partition below distinguishes waiting for external output from address holds:

- Awaiting genuine government result (28 exported): PS003, PS004, PS005, PS009,
  PS023, PS027, PS030, PS031, PS032, PS037, PS044, PS046, PS049, PS060, PS066,
  PS067, PS069, PS070, PS071, PS072, PS075, PS076, PS077, PS078, PS079,
  R2L-PS001, R2L-PS002, PS020.
- Tier B format hold: PS047 — retained named venue/street text has an extra comma;
  no lossy substitution to meet the conservative unquoted schema.
- Tier C missing reliable postcode/address components: PS001, PS008, PS013, PS021,
  PS024, PS025, PS026, PS045, PS048, PS050, PS051, PS052, PS063.
- Tier D no supported address text: PS002, PS006, PS007, PS010, PS019, PS034,
  PS041, PS042, PS043, PS064, PS073, PS093, PS094, PS095.
- Tier E unresolved conflicting claims: PS059 (locality) and R2L-PS003 (number range).

All held sites retain names, providers, associations and source evidence. A shared
site is exported once per `physicalSiteId`; different sites are not merged because
of matching names or postcodes. None of these records produces a new map marker.

## External geocoding handoff boundary

The offline fallback is the authorised route for this run. No external access is
needed to prepare the files. Based on TASK-006's locally retained official example
and successful historical submission, the owner can later:

1. Keep this task's `addresses.csv` and `address-mapping.json` together without
   editing or regenerating them while awaiting a response.
2. Visit the [Queensland Government geocoder guide](https://www.qld.gov.au/environment/land/title/addressing/geocoder)
   and follow its link to the official batch tool. Use **Address → Automatic →
   Includes header row: Yes → CSV** with this task's CSV. Only the address/locality
   columns are submitted; do not upload mapping, inventory or raw research.
3. Save the genuine returned CSV unchanged as
   `output/workflow/2026-11-06/training-venue-geocoding/government-results.csv`, and record the
   upload date, settings, processed/error/review counts and any displayed limitations.
4. Provide the result for offline import and independent validation. A changed
   response schema requires inspection; do not repair columns to make it pass.
   InputIndex and echoed input address/locality must agree with the frozen mapping;
   result order alone is never sufficient.
5. Review unmatched, ambiguous, campus and range cases. A geocoder property centroid
   is not proof of a basketball-hall entrance. Venue identity and address evidence
   must independently support any Accepted record.

The current remote form and service availability were **Not Verified**; this task
uses retained schema evidence and makes no claim that a new upload succeeded.
Main did not submit any addresses or use the owner's browser/session. Any future
agent-run website lookup, submission or browser use needs separate scope-specific
approval under the owner's external-effects rules. Such a request must identify the
target and data, affected resources, risks, cleanup/recovery and offline alternative.
No such extra action was necessary or requested here.

## Future integration recommendations (not implemented)

Keep training sites separate from Provider Address records and preserve the full
54-provider directory. Named unlocated venues can remain useful list references;
only independently Accepted positions may become training markers under a separately
approved UI task. Preserve physicalSiteId sharing, campus/venue precision, as-of date,
temporal qualifier and team/age restrictions. Resolve the mandatory scope/source
presentation reviews before publication; this internal candidate file is not a
ready-to-publish feed. Confirm current arrangements through existing provider contact
entrances; do not imply attendance, public entry, enrolment or a detailed timetable.

No TASK-008, website/UI integration, deployment, publication or Git commit is started
by this handoff. Stage B requires genuine external output. Automated official address
lookup or submission/browser assistance would require additional explicit approval;
the prepared CSV and owner-run manual submission are the available offline handoff.
