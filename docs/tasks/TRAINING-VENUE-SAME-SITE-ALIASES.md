# Training Venue Stage B/C — Same-site Address Alias Supplement

## Final status — 2026-11-06

**Complete. Independent QA Pass.** Genuine government results, PS079 same-campus
proof and the narrow validator changes have been imported and independently
verified. Final outcomes: **6 Accepted / 21 Ambiguous / 1 Rejected / 30 Pending**.
PS079 is **Accepted / campus-level**, with original Confidence **97** unchanged.
All required checks pass; no required verification is outstanding. Pending and
Ambiguous sites remain accurately unlocated. Browser/UI UAT is Not Applicable.
No website/map change, publication, deployment or subsequent task was performed.

## Authority and scope

Owner's 2026-11-06 supplement overrides conflicting PS079 assumptions and generic
training-venue address-mismatch rules. All other requirements of
TRAINING-VENUE-DATA-GEOCODING.md and the supplied original task remain applicable.
At initial preflight, no separate subsequent Stage B/C prompt or genuine
training-batch government CSV was found in the scoped project files. Main requested
their local paths and permission for official-source lookup; no external access
had then been performed.

Subsequent owner messages supplied the original Stage B/C prompt, the genuine CSV
`/Users/rui/Downloads/OutputLocations-AddressInputs-134384122538529148.csv`, and
explicit approval for the scoped official read-only research. The owner confirmed
downloaded "today, Brisbane time": obtainedOn is **2026-11-06**, not inferred from
file metadata. The initial missing-input observation above is historical.

The supplied CSV SHA-256 is
`af93783481c4b2917abe63b98355776631bffd7d2beb376e11847983b481a8af`;
upload SHA-256 remains
`bae3b00032a43f0b86e92d270851f4507c248e6a2d43c814dd321e70d3a778e2`.
Main independently verified the 16-column schema, 28 unique InputIndex values,
every exact echoed input address/locality, 20 coordinate pairs and 8 absent pairs.
The original bytes are retained only at the ignored task evidence
`inputs/government-results.csv`; genuine receipt is `government-result-provenance.json`.
The original Stage B/C request now also requires formal import, all 58 outcomes,
28 row-by-row conclusions, the 30 original held/Pending sites, precision/evidence,
independent QA and updated official results/candidates/main task report. The PS079
pre-rejection sentence in that original request is superseded by this supplement.

Scope: inspect and narrowly extend the training-venue validator for independently
proven same-campus/site address aliases; preserve strict defaults, exact result
batch joins and all original evidence. Add positive/negative regression and
independent QA. No Provider Address validator/results, React UI, map, searches,
provider links, raw research, government CSV values or publication changes.

## PS079 review requirement

Wynnum State High School (PS079): input `25 Peel Street, Manly QLD 4179`; owner reports
government return `77 Buderim Street, Wynnum QLD 4178` and a possible shared parcel
`378/SL6111`. These statements are leads, not an authenticated CSV, parcel check,
spatial validation or approval to accept coordinates.

The existing research links the school to Peel Street, Manly 4179 via its official
contact page, but explicitly says the school page did not verify number 25.
Retain that limitation. Do not pre-classify the reported alternate address as
Rejected; until adequate independent evidence is available it is Ambiguous for
same-site review. Do not fabricate coordinates or replace a real Pending dataset
record with a purported government result when its CSV is absent.

Required factual checks before any Accepted alias:

1. Current official school address and target campus identity.
2. Council's school/Buderim address registration and provenance.
3. Actual government LotNumber/PlanNumber and building/parcel metadata.
4. Actual coordinate within authoritative school/campus/parcel spatial evidence,
   with reliable identity tying the spatial feature to the school.
5. Independent evidence that the two addresses refer to the same physical site,
   without unresolved different-campus/facility confusion.

An accepted school location is campus-level, never the basketball-hall entrance.
If evidence remains insufficient, report Ambiguous and outstanding checks.

## Implementation acceptance

- Keep strict source street/locality/postcode comparison as the default. Do not
  edit scripts/qld-geocoder/ or any accepted Provider Address artifact.
- Permit a mismatch only via a site-specific, independently reviewed evidence
  binding. No distance threshold, nearby-map appearance, high confidence alone,
  shared postcode or arbitrary boolean approval can authorize an alias.
- Keep exact InputIndex/input-address/locality/hash reconciliation; an alias is
  a validation of a returned address, not a relaxation of the batch join.
- Retain original input and government return fields, Lot/Plan, alias relationship,
  authority URLs, evidence hashes and spatial verification rationale internally.
  Do not alter genuine government CSV bytes. Candidate and accepted coordinates
  remain separate; privacy-filtered downstream output receives Accepted only.
- Keep coordinate validity, precision, campus/building contradictions and unresolved
  conflicts enforced for aliases. Validate the returned address strictly against
  its proven alias; do not disable the generic validator.
- PS079's reported pair is a pending review candidate until verified. It must not
  become Accepted from a proposed registry entry or an owner lead alone.
- PS005, PS044 and R2L-PS002 receive no automatic alias approval or changed physical
  identity from this PS079 supplement. Each requires its own supporting evidence.
- Add positive tests for independently established different addresses and negative
  cases for adjacent different schools, wrong campus, missing/tampered evidence,
  wrong parcel, unsupported spatial membership, coarse points and generic mismatches.
- Preserve all Stage A counts/identities and the existing application 54/25/19/29
  baseline. No browser/UI UAT is needed; mark it Not Applicable.

## Workflow, permissions and evidence

Use the already loaded actual custom Developer and independent QA roles, with role
confirmation recorded for this supplement. Main owns this task document and final
evidence; Developer owns the scoped implementation/tests. No one may revert others'
work. Independent QA does not edit product/data/acceptance requirements. Maximum
three targeted repair rounds. No global configuration or installation changes.

Evidence root: `output/workflow/2026-11-06/training-venue-same-site-aliases/`.
Task-start manifest freezes 91 current project files and their existing dirty status;
the prior Stage A version has no drift. npm cache/tmp must stay under this root.
Retain the Stage A history and evidence. Run npm test/check/lint/build, generated
--check where applicable and git diff --check. Mark genuinely unavailable external
checks Not Verified; do not substitute synthetic fixtures for real evidence.

At the initial scope freeze, external approval was pending. Proposed scope was read-only official school,
Council/open-data and linked Queensland cadastral evidence; public names/addresses,
Lot/Plan and supplied coordinate only, project-local evidence, no login/private
browser/install/service. External work was held until the owner approved.

That request was subsequently explicitly approved. Main accessed the school and
Council pages, documented Queensland cadastral layer/query metadata and three
read-only public spatial queries. The web tool could not read spatial query JSON;
default shell DNS failed. Main then used explicitly approved runtime network
requests for the documented GET endpoints, retaining their exact response bytes
and provenance. No sandbox/global configuration was changed, no endpoint invented,
no TLS protection disabled and no external resource modified. All evidence is under
this task's ignored `main/` and `official-evidence/` directories.

## Evidence-backed implementation decisions

- School contact page publishes Peel Street / Manly 4179 without number 25.
- Council record 2045 identifies Wynnum State High School at 77 Buderim Street /
  Wynnum 4178 and includes L378_SL6111 (also L378_RP226441).
- The independent Queensland address layer returns both `25 Peel Street Wynnum QLD`
  and `77 Buderim Street Wynnum QLD` on lot 378 / plan SL6111. Do not pretend the
  school contact page supplies 25, or Council's page supplies both full addresses.
- Official parcel geometry and an independent server-side point-intersection query
  both locate the actual government point inside 378SL6111. The parcel's feat_name
  is null; campus identity comes from the other official sources, not a fabricated
  geometry label. The derived GeoJSON losslessly preserves official rings/attributes.
- A production PS079-only evidence binding may combine this truthful chain. The
  original Confidence **97** remains intact. Only this exact government-row hash
  may receive independent resolution of the `confidence-not-100` review when all
  other strict checks, parcel identity, authority/hash checks and interior geometry
  checks pass. This does not change the default numeric threshold or authorize any
  other row, confidence, range, comment, unit, campus or precision exception.
- Lossless formatting normalization is permitted only in the training wrapper:
  full outer parentheses around a building label, AV in a street-type position,
  and a trailing direction abbreviation after a recognized street type. Original
  CSV/return values remain unchanged. East/West and different road/campus identities
  must not collapse. PS009/PS066 still need independent identity evidence.
- An unknown returned building label is insufficient identity evidence and stays
  Ambiguous; an exact known different campus/site remains contradictory and Rejected.
  PS044/PS046 names are not automatically declared aliases. All other site-specific
  reviews and the generic Provider Address validator remain independent.

## Implementation Result

Formal import and final independent code QA are complete. Actual results
are **6 Accepted / 21 Ambiguous / 1 Rejected / 30 Pending**. Initial PS079 review was
Ambiguous while genuine evidence was unavailable; the later official proof chain
now supports the independently verified **Accepted / campus-level** decision.
Confidence 97 and original CSV bytes remain unchanged. Evidence and the remaining
unlocated records are reported separately from completed required verification.

The first independent code QA passed all 120 tests and six required commands but
found one status-classification defect in format-normalized counterfactual cases.
It preserved Fail: 42 negative cases passed and six exposed the same cause. Developer
fixed that cause by reusing the unchanged strict validator after whole-street token
equivalence, retaining all remaining diagnostics and the original rejection audit.
Nine additional regression tests bring self-check to 129/129, zero skipped. The
actual 6/21/1/30 result and all data/evidence hashes are unchanged. One targeted
Stage B/C repair round passed independent regression: the original **48/48** cases
and **14** classification guards pass, with the six initial Fail cases corrected.
Final independent **129/129** tests have no failures or skips; check, lint, build,
diff --check and genuine-result --check all exit 0. Stage A's earlier repair remains
separate historical evidence. Browser/UI UAT is Not Applicable.

## PS079 decision and impact

- Final decision: **Accepted**, precision **campus-level**, at latitude
  -27.4542584 / longitude 153.17627525. This is the genuine government's candidate
  selected after independent validation, not a fabricated or moved point.
- Lot/Plan: the genuine return has 378 / SL6111, matching Council and both official
  address records; the exact point is strictly within the matching official polygon.
- Address alias: established for this same physical campus through the combined
  official evidence below. School source does not publish 25, while the independent
  parcel-address records establish the number. Different locality/postcode labels
  are retained; the source input is not overwritten with the canonical return.
- Confidence: 97 remains 97. The sole confidence-review diagnostic is resolved only
  for the exact 16-value canonical row hash and complete independent campus/parcel
  evidence. The default 100/PC rule and every other review/rejection gate remain.
- Precision limits: PC/campus/property position; no basketball-hall entrance, public
  entrance, surveyed accuracy or live training occurrence is claimed. The original
  CSV does not declare datum; comparison uses the official EPSG:4326 geometry.
- Logic added: training-only alias verifier, exact PS079 binding, parsed official
  evidence-chain checks, strict polygon interior and confidence-review audit.
  Shared Provider Address geocoding logic and accepted results are byte-identical.
- Other sites: PS005 remains Rejected without its own verified locality alias;
  PS044 and R2L-PS002 remain Ambiguous for their independent range/suffix/evidence
  questions. PS046's unverified label/range remains Ambiguous. None inherits PS079.
  PS077 can use its existing verified identity after harmless outer-parenthesis
  normalization. PS009/PS066 format equivalence does not supply identity and both
  remain Ambiguous. No other site receives the Confidence-97 exception.
- Independent QA: official-source, parcel, geometry, code, data, privacy and safety
  audits pass. Full 129 tests, 48 negative cases and 14 classification guards pass.
  Initial Fail and 120-test version remain in qa/initial/; final independent proof
  and 18-file/eight-evidence version are in qa/round-1/. No Developer self-test is
  substituted for independent QA.

Only venue-geocoding-results.json and training-venue-candidates.json changed among
the seven formal generated outputs. The other five Stage A files are byte-identical;
30 unsubmitted result records are deep-equal to the captured original Pending data.
All 54 Providers, 70 Associations, 58 sites, 11 shared sites, review flags and team
scope remain. All candidate metadata is deep-equal to Stage A after resetting only
accepted coordinates/precision. Exactly six verified points enter the internal slim
dataset, which remains unapproved for publication. The website and its 19 existing
Provider Address markers remain unchanged.

The parser preserves 448 canonical parsed values. Its unchanged outer-whitespace
trim removes 28 Comment-cell trailing spaces in those parsed values; the exact CSV
bytes, including those spaces, remain intact. The rawGovernmentRow property name
does not imply literal raw-cell byte equality. The full 28-row ledger and remaining
site priorities are in TRAINING-VENUE-DATA-GEOCODING.md.

## Final evidence and handoff

All paths below are relative to
`output/workflow/2026-11-06/training-venue-same-site-aliases/`:

- `inputs/government-results.csv` and `government-result-provenance.json`: genuine
  unchanged government file and owner-confirmed date/upload/result hashes.
- `official-evidence/`: six fixed PS079 source/geometry artifacts; `main/` retains
  actual GET provenance, independent proof/point/canonical-value/data audits and
  the full seven-file Stage A pre-import snapshot.
- `developer/final/`: actual import, deterministic repeat and initial 120-test
  implementation evidence; `developer/round-1/`: fixed classifier and 129-test self-check.
- `qa/source-review.*` and `qa/independent-data-audit.*`: independent source/data
  findings, exact coordinate mapping, privacy and original data comparisons.
- `qa/initial/`: preserved initial Fail, six reproducible countercases and tested version.
- `qa/report.md`: final independent QA summary. `qa/round-1/` contains `report.md`,
  `commands.json`, raw logs, `negative-audit.json`, `classification-guards.json`
  and `tested-version.json`: final Pass, 129 tests, 48 replayed cases and 14 guards,
  with 18 runtime/data and eight evidence/input hashes.
- `main/final-review.json`, `main/final-commands.json`, `role-runtime-manifest.json`
  and `final-tested-version.json`: Main's actual command/evidence/version checks,
  loaded custom roles and final complete working-tree file manifest.

The required output paths are
`data/benchmarks/training-venue-geocoding/venue-geocoding-results.json`,
`data/benchmarks/training-venue-geocoding/training-venue-candidates.json`,
`data/benchmarks/training-venue-geocoding/same-site-alias-review.json`,
`docs/tasks/TRAINING-VENUE-DATA-GEOCODING.md`, this supplement, and the QA report.
Raw research, original CSV and official evidence remain ignored/internal and absent
from the frontend bundle. Derived candidates remain unapproved for publication.

No manual action is required to finish this approved data task. Remaining unlocated
sites are accurately classified and retained; additional source collection, public
release, UI integration or deployment need a separate instruction/approval. Stop here
and await owner review. No new service or browser session needs closing.

## PS079 official evidence ledger

All sources were read on 2026-11-06 within the owner's approved scope. No Facebook,
private browser, provider contact, new address search for other sites or UI work
was performed. The following are source-specific facts; no individual source is
misrepresented as supplying the entire evidence chain.

| Official source | Verified fact and limitation |
| --- | --- |
| [School contact page](https://wynnumshs.eq.edu.au/our-school/contact-us) | School publishes Peel Street, Manly 4179; it omits the house number. The page states updated 2026-08-31. |
| [Council heritage record 2045](https://heritage.brisbane.qld.gov.au/heritage-places/2045) | Identifies Wynnum State High School at 77 Buderim Street, Wynnum 4178, including lot/plan L378_SL6111 and L378_RP226441. Page revision is September 2020. |
| [Queensland parcel-address query](https://spatial-gis.information.qld.gov.au/arcgis/rest/services/PlanningCadastre/LandParcelPropertyFramework/MapServer/0/query?where=lotplan%3D%27378SL6111%27&outFields=lot%2Cplan%2Clotplan%2Cproperty_name%2Caddress%2Cgeocode_type%2Caddress_status%2Clatitude%2Clongitude&returnGeometry=false&f=pjson) | Two actual records on 378/SL6111: 25 Peel Street Wynnum QLD and 77 Buderim Street Wynnum QLD. Original address_status values A/P remain uninterpreted. |
| [Queensland cadastral parcel query](https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Basemaps/QSCF_FoundationData/MapServer/3/query?outFields=lot%2Cplan%2Clotplan%2Cfeat_name%2Calias_name%2Clocality%2Clga%2Cacc_value%2Cacc_method%2Cacc_code_desc%2Cstatedarea%2Cstatedareaunit&returnGeometry=true&outSR=4326&returnZ=false&f=pjson&where=lotplan%3D%27378SL6111%27) | One lot 378 / plan SL6111 polygon, EPSG:4326, 10 vertices. Original feat_name is null; school identity is linked using Council and school records. |
| [Official point-intersection query](https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Basemaps/QSCF_FoundationData/MapServer/3/query?outFields=lot%2Cplan%2Clotplan%2Cfeat_name%2Calias_name%2Clocality%2Clga%2Cacc_value%2Cacc_method%2Cacc_code_desc%2Cstatedarea%2Cstatedareaunit&returnGeometry=true&outSR=4326&returnZ=false&f=pjson&where=1%3D1&geometry=153.17627525%2C-27.4542584&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects) | The actual CSV coordinate (-27.4542584, 153.17627525) intersects the same parcel. Main independently confirmed interior membership with a winding-number calculation. |

Raw GIS response SHA-256 values:

- Parcel polygon and point-query responses: 0e6055c27c5cc3f995b7018157320634c991ac8613c9bac28fad1fc642cf2771 (identical feature responses to different documented read-only queries).
- Parcel-address response: dd3869285523354042f6ad98121c82c7ce4785247cc63807803b40ef5fa90c25.
- Losslessly converted GeoJSON: ff199647b428141de39332b08f90b88496830fca8cdfcebba585d3d84a4ea067.
- Exact government row, in canonical project JSON form: 824da9c04f30d18935119a2fa50a879994257d4ad144c23bb007d56e10a45bd9.

The return remains PC / Confidence 97. It is a campus/property location, not a
basketball hall or entrance. The CSV does not declare its coordinate datum;
spatial comparison uses the official EPSG:4326 output and is interpreted only at
campus level. School/Council snapshots retain relevant public facts only, excluding
unrelated staff details. Original source URLs, raw GIS bytes and provenance are
retained in the ignored official-evidence/main directories for independent QA.
