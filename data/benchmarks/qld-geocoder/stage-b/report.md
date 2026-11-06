# TASK-006 Stage B — Queensland Government geocoding benchmark

Validation date: 2026-11-01. Government upload/check time: **not supplied in CSV**; no timestamp inferred from file metadata.

## Reconciliation and provenance

All 39 government records reconcile using InputIndex AND exact echoed street/locality against the verified export, irrespective of output order. All 54 original provider IDs and source fields survive, including shared addresses and the withheld intersection. No website requests occur during import.

| Input | SHA-256 |
| --- | --- |
| source | 4807c3edef5ecff78ace40891a922f0afc100c446a58b5d84b3e0d0b97d5c6b5 |
| nominatim | 744cfd47da788c261fe16b500b4e163463674a783c07bcb6b64403b1f47f7916 |
| upload | 059910473ecc46b83f262527c4d3461c2ea293e36b73f3e650aa32543c41dee1 |
| mapping | cb48f8e22aa97db3805e5ac40c8f6e5a1c760f171a02a9d4f594026103c9eae6 |
| government | d34d29a77196bdc04ea8c21f9d2cb7c2c261e70a865b9964162ef130db008a01 |

## Raw availability versus validated coverage

| Metric | Addresses | Providers |
| --- | --- | --- |
| Fixed source sample | 40 | 54 |
| Submitted | 39 | 53 |
| Raw coordinate pairs (before validation) | 27 | 34 |
| accepted | 19 | 25 |
| unmatched | 0 | 0 |
| ambiguous | 12 | 19 |
| rejected | 1 | 1 |
| needs-review | 8 | 9 |

Raw provider coordinate availability is 62.96%; accepted provider coverage is **46.3% (25/54)**. Accepted source-address coverage is 47.5% (19/40), including the withheld address in the denominator. Counts by address are not provider counts; shared addresses are assessed once and retain separate identities.

## Validation policy

- Acceptance requires agreement on primary street, house number, any unit, suburb and postcode; the full returned address must agree with those components and Queensland. Case, whitespace, periods and exact street-type abbreviations are normalized; no fuzzy matching or alternative address searches.
- Confidence must be exactly 100 AND geocode type PC AND no government comment. This is a deliberately conservative project threshold, not a claim that other scores are inaccurate. PC means **property centroid**, not building entrance or activity location. Unsupported/coarse/temporary types require review.
- Every house-number range requires review, even when both source and return use the same range. Added/removed suffixes, missing unit/house evidence, inconsistent full-address evidence or unknown unresolved comments require review. Clear street, house, unit, locality/postcode or invalid coordinate conflicts are rejected.
- Coordinate pairs must be finite valid decimal degrees within broad Queensland sanity bounds (latitude -30 to -9, longitude 137 to 154.5). This is a rejection guard, not proof of spatial accuracy. Unknown/ambiguous/withheld addresses get no selected coordinates.
- More than 250 metres between a selected Nominatim point and a raw government pair triggers review; an otherwise accepted address is withheld. Haversine distance is rounded to the nearest metre. Neither geocoder is ground truth; centroid/feature geometry and source dates differ. Nonaccepted raw coordinates stay under evidence only.

## TASK-005 comparison (provider level)

Nominatim baseline: 19 matched / 27 unmatched / 8 ambiguous. These saved statuses and timestamps were preserved, not rerun or revalidated. Three baseline matches have street precision; Queensland acceptance here requires numbered property-address evidence.

| Metric | Providers |
| --- | --- |
| Additional trustworthy matches (QLD accepted, Nominatim not matched) | 11 |
| Previously matched by Nominatim, not accepted by QLD | 5 |
| Net accepted-count change from baseline | 6 |
| Material raw-coordinate disagreement (>250 m) | 0 |

Additional matches are address-evidence acceptance, not independently surveyed accuracy or club occupancy confirmation.

### Additional accepted providers

| Provider | Exact source address |
| --- | --- |
| Sunnybank Hills Hurricanes Basketball Club Incorporated | 16 Lorikeet Way, Crestmead Queensland 4132 |
| The Boys' Brigade Queensland Limited | 12 Monaco Street, Holland Park West Queensland 4121 |
| SCALA Indigenous Corporation | unit 1/74 Sunbeam Street, Annerley Queensland 4103 |
| Brothers Basketball Club Ipswich Inc | 2A Ross Llewellyn Drive, Booval Queensland 4304 |
| Central Bulldogs Basketball Club Inc. | 2A Ross Llewellyn Drive, Booval Queensland 4304 |
| Easts Basketball Club Inc. | 2A Ross Llewellyn Drive, Booval Queensland 4304 |
| Mt Crosby Basketball Club Incorporated | 2A Ross Llewellyn Drive, Booval Queensland 4304 |
| Ripley Valley Basketball Club Inc | 2A Ross Llewellyn Drive, Booval Queensland 4304 |
| Springfield Brumbies Basketball Incorporated | 2A Ross Llewellyn Drive, Booval Queensland 4304 |
| Swifts Comets Basketball Club Inc. | 2A Ross Llewellyn Drive, Booval Queensland 4304 |
| Ormiston Crushers basketball club Inc | 29 McCartney Street, Ormiston Queensland 4160 |

### Previously matched baseline providers not accepted

| Provider | Source address | Queensland outcome | Reason |
| --- | --- | --- | --- |
| Rochedale Wildcats Basketball Club INC | Klumpp Road, Upper Mount Gravatt Queensland 4122 | ambiguous | multiple-government-candidates |
| St Philomena School | 61 Koplick Road, Park Ridge Queensland 4125 | needs-review | confidence-not-100; house-number-range-requires-review |
| West Brisbane Falcons Basketball Club Inc | Dixon Street, Auchenflower Queensland 4066 | ambiguous | multiple-government-candidates |
| Capalaba State College | School Road, Capalaba Queensland 4157 | ambiguous | multiple-government-candidates |
| Carina Cobras Basketball Club Inc. | 81 Moreton Avenue, Wynnum Queensland 4178 | ambiguous | multiple-government-candidates |

### Both systems have coordinates

These comparisons use selected Nominatim coordinates and RAW Queensland coordinates, including rejected/review results. Distances below the alert threshold do not establish accuracy.

| Provider | QLD outcome | Separation (m) | >250 m |
| --- | --- | --- | --- |
| Cannons Southside Inc | accepted | 12 | No |
| BRISBANE PUNJABI COMMUNITY CLUB ASS. INC. | accepted | 2 | No |
| Runcorn Rockets Basketball Club Inc. | accepted | 85 | No |
| HORNETS BASKETBALL CLUB INC | accepted | 2 | No |
| St Philomena School | needs-review | 9 | No |
| SOUTH CITY REBELS BASKETBALL CLUB INC | accepted | 2 | No |
| Loreto Coorparoo Limited | accepted | 83 | No |
| Citipointe Christian College | accepted | 167 | No |
| Boys Brigade - 50th Brisbane | accepted | 2 | No |
| Lang Park Basketball Club Inc | accepted | 2 | No |
| Lourdes Hill College | accepted | 7 | No |
| Brisbane City 3x3 Pty Ltd | accepted | 1 | No |
| Capalaba Wildcats Basketball Club | accepted | 49 | No |
| Oakleigh Basketball Club | accepted | 2 | No |
| Wynnum Manly Hawks Basketball Club Inc | accepted | 16 | No |

## Seven baseline-club spot checks

| Provider | Exact Play On address | Nominatim | Queensland | Returned address / evidence | Raw point | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| Algester Hawks Basketball Club Inc. | 31 Endiandra Street, Algester Queensland 4115 | unmatched | ambiguous | 11 candidates address records found. | None | multiple-government-candidates |
| Runcorn Rockets Basketball Club Inc. | 132 Hill Road, Runcorn Queensland 4113 | matched | accepted | 132 HILL RD  RUNCORN QLD 4113 | -27.5930671, 153.07649378 (raw) | exact-source-address-components-confidence-100-PC |
| Cannons Southside Inc | 15 Algester Road, Algester Queensland 4115 | matched | accepted | 15 ALGESTER RD  ALGESTER QLD 4115 | -27.60509882, 153.04246953 (raw) | exact-source-address-components-confidence-100-PC |
| River City Hornets Basketball Club Inc. | 90 Klumpp Road, Upper Mount Gravatt Queensland 4122 | unmatched | ambiguous | 2 candidates address records found. | None | multiple-government-candidates |
| Sunnybank Hills Hurricanes Basketball Club Incorporated | 16 Lorikeet Way, Crestmead Queensland 4132 | unmatched | accepted | 16 LORIKEET WAY  CRESTMEAD QLD 4132 | -27.69314618, 153.09357227 (raw) | exact-source-address-components-confidence-100-PC |
| Rochedale Wildcats Basketball Club INC | Klumpp Road, Upper Mount Gravatt Queensland 4122 | matched | ambiguous | 73 candidates address records found. | None | multiple-government-candidates |
| Dunk Star Junior Basketball Club | 90 Klumpp Road, Upper Mount Gravatt Queensland 4122 | unmatched | ambiguous | 2 candidates address records found. | None | multiple-government-candidates |

## Shared addresses

| Exact source address | Separate providers | Queensland outcome | Reason |
| --- | --- | --- | --- |
| 90 Klumpp Road, Upper Mount Gravatt Queensland 4122 | Dunk Star Junior Basketball Club; River City Hornets Basketball Club Inc.; South Western Metro Basketball Inc. | ambiguous | multiple-government-candidates |
| 146-170 Bryants Road, Shailer Park Queensland 4128 | Jazz Basketball Club Inc; Logan Basketball Inc. | needs-review | house-number-range-requires-review |
| 56 Zahel Street, Carina Queensland 4152 | BK Owls Basketball Club Incorporated; Belmont Saints Basketball Club Inc.; Cyclones Basketball Club Inc; Hoopstars Inc.; Southern Districts Basketball Association Ltd | ambiguous | multiple-government-candidates |
| 16 Dixon Street, Auchenflower Queensland 4066 | Brisbane Basketball Incorporated; West City Titans Basketball Inc | ambiguous | multiple-government-candidates |
| 2A Ross Llewellyn Drive, Booval Queensland 4304 | Brothers Basketball Club Ipswich Inc; Central Bulldogs Basketball Club Inc.; Easts Basketball Club Inc.; Mt Crosby Basketball Club Incorporated; Ripley Valley Basketball Club Inc; Springfield Brumbies Basketball Incorporated; Swifts Comets Basketball Club Inc. | accepted | exact-source-address-components-confidence-100-PC |

The seven 2A Ross Llewellyn Drive providers remain separate IDs, assessed against the same government property centroid. Shared coordinates do not establish shared training arrangements.

## All unique-address decisions, including suspicious returns and withheld input

| Exact source address | Queensland outcome | Returned address | Confidence / type | Reason |
| --- | --- | --- | --- | --- |
| 31 Endiandra Street, Algester Queensland 4115 | ambiguous | 11 candidates address records found. | — / — | multiple-government-candidates |
| 15 Algester Road, Algester Queensland 4115 | accepted | 15 ALGESTER RD  ALGESTER QLD 4115 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 2533 Beaudesert Road, Calamvale Queensland 4116 | accepted | 2533 BEAUDESERT RD  CALAMVALE QLD 4116 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 132 Hill Road, Runcorn Queensland 4113 | accepted | 132 HILL RD  RUNCORN QLD 4113 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 90 Klumpp Road, Upper Mount Gravatt Queensland 4122 | ambiguous | 2 candidates address records found. | — / — | multiple-government-candidates |
| Klumpp Road, Upper Mount Gravatt Queensland 4122 | ambiguous | 73 candidates address records found. | — / — | multiple-government-candidates |
| 16 Lorikeet Way, Crestmead Queensland 4132 | accepted | 16 LORIKEET WAY  CRESTMEAD QLD 4132 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 3 Acacia Close, Holland Park West Queensland 4121 | accepted | 3 ACACIA CL  HOLLAND PARK WEST QLD 4121 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 12 Monaco Street, Holland Park West Queensland 4121 | accepted | 12 MONACO ST  HOLLAND PARK WEST QLD 4121 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 156 Hubner Road, Park Ridge Queensland 4125 | needs-review | 148-156 HUBNER RD  PARK RIDGE QLD 4125 | 98 / PC | confidence-not-100; house-number-range-requires-review |
| 61 Koplick Road, Park Ridge Queensland 4125 | needs-review | 61-71 KOPLICK RD  PARK RIDGE QLD 4125 | 98 / PC | confidence-not-100; house-number-range-requires-review |
| 328 Broadwater Road, Mansfield Queensland 4122 | accepted | 328 BROADWATER RD  MANSFIELD QLD 4122 | 100 / PC | exact-source-address-components-confidence-100-PC |
| unit 1/74 Sunbeam Street, Annerley Queensland 4103 | accepted | UNIT 1 74 SUNBEAM ST  ANNERLEY QLD 4103 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 695 Cavendish Road, Coorparoo Queensland 4151 | rejected | 695 CAVENDISH RD  HOLLAND PARK QLD 4121 | 97 / PC | locality-mismatch; postcode-mismatch; confidence-not-100 |
| 415 Cavendish Road, Coorparoo Queensland 4151 | accepted | 415 CAVENDISH RD  COORPAROO QLD 4151 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 322 Wecker Road, Carindale Queensland 4152 | accepted | 322 WECKER RD  CARINDALE QLD 4152 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 134 Parkland Drive, Springfield Central Queensland 4300 | needs-review | 134A PARKLAND DR  SPRINGFIELD CENTRAL QLD 4300 | 99 / PC | confidence-not-100; house-number-suffix-changed |
| 146-170 Bryants Road, Shailer Park Queensland 4128 | needs-review | 146-170 BRYANTS RD  SHAILER PARK QLD 4128 | 100 / PC | house-number-range-requires-review |
| 56 Zahel Street, Carina Queensland 4152 | ambiguous | 9 candidates address records found. | — / — | multiple-government-candidates |
| 3077 Moggill Road, Bellbowrie Queensland 4070 | accepted | 3077 MOGGILL RD  BELLBOWRIE QLD 4070 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 16 Dixon Street, Auchenflower Queensland 4066 | ambiguous | 19 candidates address records found. | — / — | multiple-government-candidates |
| Dixon Street, Auchenflower Queensland 4066 | ambiguous | 111 candidates address records found. | — / — | multiple-government-candidates |
| 40 Castlemaine Street, Milton Queensland 4064 | accepted | 40 CASTLEMAINE ST  MILTON QLD 4064 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 86 Hawthorne Road, Hawthorne Queensland 4171 | accepted | 86 HAWTHORNE RD  HAWTHORNE QLD 4171 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 244 New Cleveland Road, Tingalpa Queensland 4173 | accepted | 244 NEW CLEVELAND RD  TINGALPA QLD 4173 | 100 / PC | exact-source-address-components-confidence-100-PC |
| Degen Road, Capalaba Queensland 4157 | ambiguous | 32 candidates address records found. | — / — | multiple-government-candidates |
| School Road, Capalaba Queensland 4157 | ambiguous | 105 candidates address records found. | — / — | multiple-government-candidates |
| 45 Degen Road, Capalaba Queensland 4157 | accepted | 45 DEGEN RD  CAPALABA QLD 4157 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 63-65 Degen Road, Capalaba Queensland 4157 | needs-review | 63-65 DEGEN RD  CAPALABA QLD 4157 | 100 / PC | house-number-range-requires-review |
| 300 Mount Cotton Road, Capalaba Queensland 4157 | ambiguous | 3 candidates address records found. | — / — | multiple-government-candidates |
| Corner Of Mt Cotton Rd and Degen Rd, Capalaba Queensland 4157 | needs-review | Not submitted | Not submitted | withheld-intersection-not-submitted |
| 60 Kinnaird Street, Ashgrove Queensland 4060 | accepted | 60 KINNAIRD ST  ASHGROVE QLD 4060 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 1 Beveridge Road, Thornlands Queensland 4164 | needs-review | 1-15 BEVERIDGE RD  THORNLANDS QLD 4164 | 98 / PC | confidence-not-100; house-number-range-requires-review |
| 89 Ernest Street, Manly Queensland 4179 | accepted | 89 ERNEST ST  MANLY QLD 4179 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 81 Moreton Avenue, Wynnum Queensland 4178 | ambiguous | 2 candidates address records found. | — / — | multiple-government-candidates |
| 81 Boxgrove Avenue, Wynnum Queensland 4178 | ambiguous | 11 candidates address records found. | — / — | multiple-government-candidates |
| 2A Ross Llewellyn Drive, Booval Queensland 4304 | accepted | 2A ROSS LLEWELLYN DR  BOOVAL QLD 4304 | 100 / PC | exact-source-address-components-confidence-100-PC |
| 151 Flockton Street, Everton Park Queensland 4053 | ambiguous | 13 candidates address records found. | — / — | multiple-government-candidates |
| 17 South Street, Jimboomba Queensland 4280 | needs-review | 1-17 SOUTH ST  JIMBOOMBA QLD 4280 | 98 / PC | confidence-not-100; house-number-range-requires-review |
| 29 McCartney Street, Ormiston Queensland 4160 | accepted | 29 MCCARTNEY ST  ORMISTON QLD 4160 | 100 / PC | exact-source-address-components-confidence-100-PC |

## Remaining uncertainty and recommendation

Queensland is a useful candidate for **conservatively validated provider-address coordinates** in a later phase, not automatic acceptance of every government point. The range/suffix differences and the Coorparoo/Holland Park conflict show why high confidence alone is insufficient. Ambiguous candidates need separate human review; no candidates were selected here.

This is one fixed 54-provider sample and a manual batch. No independent spatial survey, property occupancy check or activity-location verification was performed. Original government check time and coordinate datum are not supplied in this CSV; no transformation or inferred timestamp was added. The 250 m alert is a review heuristic, not an accuracy specification.

The [official batch guide](https://www.qld.gov.au/environment/land/title/addressing/geocoder) describes manual CSV processing; the [PLS catalogue](https://www.data.qld.gov.au/dataset/property-location-service) lists CC BY 4.0 and describes public/government access separately. Retain attribution and confirm the applicable product/API access, current terms, rate limits and licence before a production workflow. No unattended API access was tested or selected. Nominatim is not selected as permanent production infrastructure either.

Queensland evidence: © The State of Queensland (Queensland Government), Property Location Service. Nominatim evidence: © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright).

Every accepted coordinate represents the **Play On provider address only**, not training, games or club activities. No map integration, enrichment or TASK-007 work is included. Inspect validated.json and comparison.json for each provider's ID, provenance, status and supporting evidence. 54 distinct provider IDs reconciled.
