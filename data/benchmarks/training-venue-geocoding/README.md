# Training venue batch — internal, publication not approved

Stage A completed on 2026-11-06; its historical record is preserved in
`docs/tasks/TRAINING-VENUE-DATA-GEOCODING.md`. The authorised Stage B/C supplement
has imported the genuine 28-row government return downloaded on 2026-11-06
(Brisbane date explicitly confirmed by the owner). Historical Stage B/C result: **6 Accepted /
21 Ambiguous / 1 Rejected / 30 Pending**, with independent QA recorded in
`docs/tasks/TRAINING-VENUE-SAME-SITE-ALIASES.md`.
The 2026-11-11 offline identity review added PS027, PS032 and R2L-PS001 using
their existing official facility/school research chains: historical **9 Accepted /
18 Ambiguous / 1 Rejected / 30 Pending**, independently accepted in
`docs/tasks/TRAINING-VENUE-IDENTITY-EVIDENCE-BINDING-REVIEW.md`.
The Owner-approved 2026-11-12 acceptance policy implementation now produces
**16 Accepted / 11 Ambiguous / 1 Rejected / 30 Pending** from the same genuine batch.
Seven additional sites have reviewed club-published complete address chains;
independent implementation QA passed (137 tests, 1,184 data assertions and 499
independent positive/negative cases). Current implementation and acceptance are
recorded separately in
`docs/tasks/TRAINING-VENUE-GEOCODING-ACCEPTANCE-IMPLEMENTATION.md`.
These files describe training venues; they never replace existing provider addresses.
Nothing here is imported by the application. Do not publish or commit raw research.

## Reproduce offline

The three exact 2026-11-06 research/decision snapshots are retained in the Git-ignored
`output/workflow/2026-11-06/training-venue-geocoding/inputs/` directory. Their hashes
are pinned by the adapter. Keep all three; the Markdown decisions are also hashed.
No external request, installation, browser or server is performed by these commands:

```sh
npm run prepare:training-venues -- --results output/workflow/2026-11-06/training-venue-same-site-aliases/inputs/government-results.csv --result-provenance output/workflow/2026-11-06/training-venue-same-site-aliases/government-result-provenance.json --validated-on 2026-11-12 --check
```

`--check` compares all seven generated files byte for byte with the exact inputs.
An input/hash/count/ID discrepancy fails before writing output. The TypeScript
projection contract is `scripts/training-venues/contract.d.ts`; candidate fields
are explicitly allowlisted. Detailed team scope and limitations remain in the
internal `eligible-associations.json`, referenced by association ID; the slim
projection deliberately requires scope review before use and contains no schedule.

## Prepared batch and remaining addresses

All 58 sites and all 70 eligible associations remain present. The original 54
provider identities remain present even when no eligible training venue exists.
28 sites are exported: 27 Tier A numbered addresses, followed by Tier B PS020's
unaltered road intersection. An intersection is a candidate request, not evidence
of an acceptable venue position. Each physicalSiteId appears once; co-located
providers share the site's row and eventual result.

30 sites are held: 13 Tier C partial addresses, 14 Tier D missing addresses,
2 Tier E unresolved conflicts, and Tier B PS047. PS047's named stadium plus street
contains an additional comma incompatible with the established government upload's
safe unquoted two-column form. Its venue name/street are preserved in the inventory;
neither a nearby numbered address nor a silently removed venue name is substituted.
The 27 C/D sites' linked research evidence supplies no reliable missing components.
Address completion improvement is therefore 0. Stage A performed no external lookup;
the later supplement separately authorised Main's narrow official PS079 verification.

PS059 retains Mount Crosby/Karana Downs locality claims. R2L-PS003 retains Badgen
Road 2–34/2–36 claims. Neither can acquire Accepted coordinates while unresolved.
PS044/PS076 retain their resolved historical conflicts and separate campus/access
roles. The Stage A snapshot contained 58 Pending records. The genuine result now
provides 20 candidate-coordinate pairs and eight rows without selected coordinates:
seven multiple-candidate responses and PS020's explicit address-parsing failure.
All 30 withheld sites remain Pending. Candidate and accepted coordinates stay
separate; no position is invented for an unresolved/no-coordinate site.

## Manual Queensland Government handoff

1. Open the [official government guide](https://www.qld.gov.au/environment/land/title/addressing/geocoder)
   and its [batch geocoder](https://geocode.information.qld.gov.au/).
2. Upload **only `addresses.csv`** from this directory. The file is UTF-8 without
   BOM, CRLF, unquoted, and has exactly `Address to Validate,LOCALITY` as its header,
   matching the project's captured official input example. Retain the matching
   `address-mapping.json`. Do not upload research JSON, associations or evidence.
3. Download the genuine government result CSV unchanged. Store it in the project's
   ignored task evidence directory (for example `government-results.csv`). Do not
   substitute TASK-006's provider-address result file. Do not reorder or rewrite
   result values to force matches.
4. Retain the real source/date and SHA-256 hashes in a JSON sidecar with this exact
   shape (values below are descriptive placeholders, not an actual receipt):

```json
{
  "addressRole": "training-venue",
  "source": "qld-government-batch-geocoder",
  "sourceUrl": "https://geocode.information.qld.gov.au/",
  "uploadCsvSha256": "SHA-256 of the unchanged uploaded addresses.csv",
  "resultCsvSha256": "SHA-256 of the genuine downloaded result CSV",
  "obtainedOn": "actual YYYY-MM-DD download date"
}
```

5. Return the genuine CSV and sidecar for offline import. The supported command is:

```sh
npm run prepare:training-venues -- --results output/workflow/2026-11-06/training-venue-same-site-aliases/inputs/government-results.csv --result-provenance output/workflow/2026-11-06/training-venue-same-site-aliases/government-result-provenance.json --validated-on 2026-11-12
```

The validation date must be the actual date, at least the recorded download date.
Use the same arguments plus `--check` to verify imported outputs. A plain Stage A
rerun cannot silently discard previously imported results.

The importer requires the real TASK-006 corrected full-result 16-column schema,
checks every InputIndex and exact original address/locality echo, and checks the
upload and result hashes. Result order is irrelevant. Duplicate/missing/unexpected
indices, wrong batch echoes and schema changes fail closed without output changes.
If the service changes schema, retain the real file and review the adapter rather
than editing the government return. No undocumented REST endpoint is assumed.

## Conservative result policy

An address match and confidence 100 alone are insufficient. Exact-address acceptance
requires a complete reviewed official training/address chain and no substantive
conflict, alongside every strict government check. A complete club-published venue
address may suffice without a second owner source; partial club addresses still
need the reviewed official school/operator supplement for the same specific site.
Owner evidence remains conditional on actual identity, campus, building, address
or alias questions. Missing owner evidence alone does not establish a conflict.

The seven-site `reviewed-training-address-bindings.mjs` adapter pins the original
site, venue, provider, eligible association, address components, official publisher
chain, source/evidence/observation/access records and their hashes. Internal proof
roles distinguish `club-published-address` and `official-site-supplement`; original
`direct-official-site-address` identity proofs remain intact. Governing association
sources must directly state ordinary team training; membership/competition/community
directories do not suffice. Shared-site addresses may be reused across providers;
address material never creates a training association. In particular, the Eagles
poster does not add Dunk Star ordinary team training at Eagles.

Handwritten `reviewed: true`, unrelated official domains or applicant-supplied
identity booleans have no effect. The original ten-entry identity registry, three
reviewed identity bindings and PS079-only alias chain retain their protections.
The Wynnum State High School number is intentionally not in the original registry
because its school source supports the street/postcode but not number 25. Its
separately verified exception is described below. Unknown source freshness, team
scope, original checked/as-of dates, manual/disclosure review and access limits
are not upgraded by coordinate acceptance.

Unknown/mismatching returned building names, wrong campuses, locality/postcode
mismatches, invalid coordinates and low-precision locality/street positions cannot
be accepted. Ranges, intersections, source conflicts or insufficient identity
evidence remain reviewable without a pin. Candidate coordinates are retained
separately; only Accepted coordinates reach the slim projection. Even an accepted
school position is `campus-level`, never a basketball hall/entrance guarantee.

Hash correspondence cannot independently prove government provenance. Authenticity
still depends on the owner supplying the genuine government export; that declaration
and date are retained, never fabricated or inferred from file modification time.
Synthetic test coordinates verify rules only and are never written into this batch.

Main's separately authorised read-only PS079 official-source verification is recorded
in the supplement. Further lookup, automated submission/browser use, public release
and UI integration require their own authorisation. Manual submission shares just the exported
venue address/locality strings with the government service; their service may keep
request logs. Retain local upload/result copies; do not submit any personal data.

## Same-site address alias supplement

`docs/tasks/TRAINING-VENUE-SAME-SITE-ALIASES.md` records a separately approved
supplement. The independent `same-site-alias-review.json` retains the historical
proposed lead and references the single reviewed production binding in
`scripts/training-venues/ps079-alias-binding.mjs`. No other physical site receives
an automatic alias exception.

The truthful evidence chain separates what each source establishes. The school
contact page gives Peel Street, Manly 4179 **without number 25**. Council identifies
Wynnum State High School at 77 Buderim Street, Wynnum 4178 and Lot 378/SL6111.
The Queensland address layer independently registers `25 Peel Street Wynnum QLD`
and `77 Buderim Street Wynnum QLD` on that same parcel. Its A/P status codes are
retained without inferring undocumented meanings. The original official parcel
response and its lossless EPSG:4326 GeoJSON conversion match exactly; strict
point-in-polygon and the independent official point-intersects response both place
the actual government coordinate within the parcel. The parcel feature name is
null; school identity comes from the independent school/Council chain.

All six source artifacts and source URLs are pinned by SHA-256. Missing/tampered
files, wrong campus/parcel, unsupported CRS, geometry holes/outside points and other
contradictions cannot grant acceptance. The only confidence adjudication applies
to the exact real PS079 row with SHA-256
`824da9c04f30d18935119a2fa50a879994257d4ad144c23bb007d56e10a45bd9`, observed
Confidence **97**, PC, and the sole remaining `confidence-not-100` review after all
other strict validation. That 97 remains unchanged; independent campus/parcel
evidence resolves its automatic review. A changed field cannot inherit this
adjudication. No generic confidence threshold, distance rule or boolean approval
was introduced.

Training-only formatting handles a complete outer-parenthesis venue-name wrapper,
terminal AV/Avenue, and W/West after a recognised street type. Original field
strings are unchanged. PS009/PS066 remained Ambiguous in that historical supplement
because the owner identity gate was unresolved. The separately approved 2026-11-12 policy now accepts
their complete reviewed club-address chains after all strict checks. PS044/PS046's
unverified building labels and range qualifications remain Ambiguous. A known
different school/campus is Rejected. InputIndex/echo/hash joins and the original
government CSV remain unchanged. Raw return fields, Lot/Plan,
building metadata, actual confidence and adjudication evidence stay internal.
Accepted school aliases are campus-level, never gym entrances. Synthetic trusted
test fixtures never enter the production binding or generated results.

## Offline identity evidence review — 2026-11-11

The original ten-entry registry and PS079 exception remain unchanged. A separate,
frozen three-site adapter in `scripts/training-venues/reviewed-identity-bindings.mjs`
recognizes PS027 / E178 / S065, PS032 / E184 / S171 and R2L-PS001 / R2L-E178 /
R2L-S170. Each exact venue, evidence, source, observation and applicable access
record is hash-bound; original research records are unchanged. This resolves the
specific older research schemas' missing phase2 fields without a generic exemption.

Only the three sites' original government PC/100 points gain Accepted status.
PS027 is venue/property-level; both schools are campus-level. The retained official
research observations are reused offline, without a new source fetch or a claim
that original HTML/PDF bytes are available. No basketball hall, court, public
entrance, independent cadastral footprint or current training occurrence is newly
verified. At that historical review, the other seven priority sites were held by the
then-mandatory independent site-owner/school gate. The separately approved policy
implementation below replaces that universal gate with complete reviewed official
training/address chains. All previous Pending, Rejected and Accepted site conclusions
and all association scopes remain intact.

The government download date remains 2026-11-06. That review used validation date
2026-11-11; the current implementation below uses 2026-11-12. The formal pipeline
leaves byte-identical outputs in place,
including the uploaded `addresses.csv` and mapping. Full seven-file safety checks
and deterministic `--check` still apply. The complete local review matrix, before/
after comparison and logs remain in the separately ignored 2026-11-11 task evidence
directory. Nothing is approved for publication or frontend use.

## Approved acceptance policy implementation — 2026-11-12

The approved policy review is the unchanged historical proposal in
`docs/tasks/TRAINING-VENUE-GEOCODING-ACCEPTANCE-POLICY-REVIEW.md`; the Owner's later
approval and actual execution are recorded in the new implementation task.
Only PS003, PS009, PS066, PS070, PS071, PS072 and PS075 change from Ambiguous to
Accepted. Eagles and Nissan Arena are venue-level; the five schools/colleges are
campus-level. Exact government points are retained, without a hall/court/entrance
or current-use claim. Private source/coordinate ledgers remain in the ignored
implementation evidence directory, outside this documentation's public data scope.

All 54 Providers / 70 eligible associations / 58 sites and the 32/38 temporal split
remain. Accepted-location coverage is now 16 distinct Providers and 21 existing
eligible associations, increases of 7 and 11 respectively. The original nine
Accepted positions, PS079 PC/97 proof, eight no-coordinate returns and 30 Pending
records are preserved. PS005, PS044, PS046 and R2L-PS002 gain no exemption.

The same original uploaded CSV, mapping, genuine result, provenance and source
snapshots are reused. Only the actual validation date advances to 2026-11-12;
`obtainedOn` remains 2026-11-06 and original research dates are unchanged. Formal
import, repeat import and full seven-file deterministic `--check` have executed;
independent QA status is recorded in the implementation task. Nothing is approved
for publication or frontend integration. No new lookup, upload, external request,
Git commit/push, deployment or subsequent stage is part of this implementation.
