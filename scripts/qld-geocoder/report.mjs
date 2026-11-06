const table = (header, rows) => [header, header.map(() => '---'), ...rows]
  .map(row => `| ${row.map(value => String(value ?? '—').replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ')).join(' | ')} |`).join('\n')

export function renderReport({ validated, comparison }) {
  const { summary: s, providers, provenance } = validated
  const groups = [...new Map(providers.map(provider => [provider.qldGeocode.addressKey, provider])).values()]
  const spotNames = ['Algester Hawks Basketball Club Inc.', 'Runcorn Rockets Basketball Club Inc.', 'Cannons Southside Inc',
    'River City Hornets Basketball Club Inc.', 'Sunnybank Hills Hurricanes Basketball Club Incorporated',
    'Rochedale Wildcats Basketball Club INC', 'Dunk Star Junior Basketball Club']
  const spots = spotNames.map(name => providers.find(provider => provider.name === name))
  if (spots.some(provider => !provider)) throw new Error('A mandatory baseline club is missing from the source sample')
  const returned = outcome => outcome.evidence?.fullAddress || outcome.evidence?.primaryAddress || outcome.evidence?.comment || 'Not submitted'
  const notes = outcome => outcome.reasons.join('; ')
  const point = outcome => outcome.rawCoordinateAvailable ? `${outcome.evidence.rawLatitude}, ${outcome.evidence.rawLongitude} (raw)` : 'None'
  const rawPercent = (100 * s.rawCoordinateProviders / s.sourceProviders).toFixed(2)
  return `# TASK-006 Stage B — Queensland Government geocoding benchmark

Validation date: ${provenance.validatedOn}. Government upload/check time: **not supplied in CSV**; no timestamp inferred from file metadata.

## Reconciliation and provenance

All ${s.submittedAddresses} government records reconcile using InputIndex AND exact echoed street/locality against the verified export, irrespective of output order. All ${s.sourceProviders} original provider IDs and source fields survive, including shared addresses and the withheld intersection. No website requests occur during import.

${table(['Input', 'SHA-256'], Object.entries(provenance.inputs).map(([name, value]) => [name, value.sha256]))}

## Raw availability versus validated coverage

${table(['Metric', 'Addresses', 'Providers'], [
    ['Fixed source sample', s.uniqueAddresses, s.sourceProviders], ['Submitted', s.submittedAddresses, s.sourceProviders - 1],
    ['Raw coordinate pairs (before validation)', s.rawCoordinateAddresses, s.rawCoordinateProviders],
    ...Object.entries(s.addressOutcomes).map(([status, count]) => [status, count, s.providerOutcomes[status]]),
  ])}

Raw provider coordinate availability is ${rawPercent}%; accepted provider coverage is **${s.acceptedProviderCoveragePercent}% (${s.providerOutcomes.accepted}/${s.sourceProviders})**. Accepted source-address coverage is ${s.acceptedAddressCoveragePercent}% (${s.addressOutcomes.accepted}/${s.uniqueAddresses}), including the withheld address in the denominator. Counts by address are not provider counts; shared addresses are assessed once and retain separate identities.

## Validation policy

- Acceptance requires agreement on primary street, house number, any unit, suburb and postcode; the full returned address must agree with those components and Queensland. Case, whitespace, periods and exact street-type abbreviations are normalized; no fuzzy matching or alternative address searches.
- Confidence must be exactly 100 AND geocode type PC AND no government comment. This is a deliberately conservative project threshold, not a claim that other scores are inaccurate. PC means **property centroid**, not building entrance or activity location. Unsupported/coarse/temporary types require review.
- Every house-number range requires review, even when both source and return use the same range. Added/removed suffixes, missing unit/house evidence, inconsistent full-address evidence or unknown unresolved comments require review. Clear street, house, unit, locality/postcode or invalid coordinate conflicts are rejected.
- Coordinate pairs must be finite valid decimal degrees within broad Queensland sanity bounds (latitude -30 to -9, longitude 137 to 154.5). This is a rejection guard, not proof of spatial accuracy. Unknown/ambiguous/withheld addresses get no selected coordinates.
- More than 250 metres between a selected Nominatim point and a raw government pair triggers review; an otherwise accepted address is withheld. Haversine distance is rounded to the nearest metre. Neither geocoder is ground truth; centroid/feature geometry and source dates differ. Nonaccepted raw coordinates stay under evidence only.

## TASK-005 comparison (provider level)

Nominatim baseline: ${s.baseline.matched} matched / ${s.baseline.unmatched} unmatched / ${s.baseline.ambiguous} ambiguous. These saved statuses and timestamps were preserved, not rerun or revalidated. Three baseline matches have street precision; Queensland acceptance here requires numbered property-address evidence.

${table(['Metric', 'Providers'], [
    ['Additional trustworthy matches (QLD accepted, Nominatim not matched)', s.additionalTrustworthyMatches],
    ['Previously matched by Nominatim, not accepted by QLD', s.previousMatchesNotAccepted],
    ['Net accepted-count change from baseline', s.providerOutcomes.accepted - s.baseline.matched],
    ['Material raw-coordinate disagreement (>250 m)', s.materialDisagreementProviders],
  ])}

Additional matches are address-evidence acceptance, not independently surveyed accuracy or club occupancy confirmation.

### Additional accepted providers

${table(['Provider', 'Exact source address'], comparison.providers.filter(row => row.additionalTrustworthyMatch).map(row => [row.name, row.address]))}

### Previously matched baseline providers not accepted

${table(['Provider', 'Source address', 'Queensland outcome', 'Reason'], comparison.providers.filter(row => row.previousMatchNotAccepted).map(row => [row.name, row.address, row.queensland.status, row.queensland.reasons.join('; ')]))}

### Both systems have coordinates

These comparisons use selected Nominatim coordinates and RAW Queensland coordinates, including rejected/review results. Distances below the alert threshold do not establish accuracy.

${table(['Provider', 'QLD outcome', 'Separation (m)', '>250 m'], comparison.providers.filter(row => row.separationMetres !== null).map(row => [row.name, row.queensland.status, row.separationMetres, row.materialDisagreement ? 'Yes — review' : 'No']))}

## Seven baseline-club spot checks

${table(['Provider', 'Exact Play On address', 'Nominatim', 'Queensland', 'Returned address / evidence', 'Raw point', 'Reason'], spots.map(provider => {
    const outcome = provider.qldGeocode
    const previous = comparison.providers.find(row => row.id === provider.id).nominatim.status
    return [provider.name, provider.address, previous, outcome.status, returned(outcome), point(outcome), notes(outcome)]
  }))}

## Shared addresses

${table(['Exact source address', 'Separate providers', 'Queensland outcome', 'Reason'], groups.filter(group => providers.filter(provider => provider.qldGeocode.addressKey === group.qldGeocode.addressKey).length > 1).map(group => {
    const shared = providers.filter(provider => provider.qldGeocode.addressKey === group.qldGeocode.addressKey)
    return [group.address, shared.map(provider => provider.name).join('; '), group.qldGeocode.status, notes(group.qldGeocode)]
  }))}

The seven 2A Ross Llewellyn Drive providers remain separate IDs, assessed against the same government property centroid. Shared coordinates do not establish shared training arrangements.

## All unique-address decisions, including suspicious returns and withheld input

${table(['Exact source address', 'Queensland outcome', 'Returned address', 'Confidence / type', 'Reason'], groups.map(provider => {
    const outcome = provider.qldGeocode
    return [provider.address, outcome.status, returned(outcome), outcome.evidence ? `${outcome.evidence.confidence || '—'} / ${outcome.evidence.geocodeType || '—'}` : 'Not submitted', notes(outcome)]
  }))}

## Remaining uncertainty and recommendation

Queensland is a useful candidate for **conservatively validated provider-address coordinates** in a later phase, not automatic acceptance of every government point. The range/suffix differences and the Coorparoo/Holland Park conflict show why high confidence alone is insufficient. Ambiguous candidates need separate human review; no candidates were selected here.

This is one fixed 54-provider sample and a manual batch. No independent spatial survey, property occupancy check or activity-location verification was performed. Original government check time and coordinate datum are not supplied in this CSV; no transformation or inferred timestamp was added. The 250 m alert is a review heuristic, not an accuracy specification.

The [official batch guide](https://www.qld.gov.au/environment/land/title/addressing/geocoder) describes manual CSV processing; the [PLS catalogue](https://www.data.qld.gov.au/dataset/property-location-service) lists CC BY 4.0 and describes public/government access separately. Retain attribution and confirm the applicable product/API access, current terms, rate limits and licence before a production workflow. No unattended API access was tested or selected. Nominatim is not selected as permanent production infrastructure either.

Queensland evidence: ${provenance.attribution}. Nominatim evidence: © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright).

Every accepted coordinate represents the **Play On provider address only**, not training, games or club activities. No map integration, enrichment or TASK-007 work is included. Inspect validated.json and comparison.json for each provider's ID, provenance, status and supporting evidence. ${new Set(providers.map(provider => provider.id)).size} distinct provider IDs reconciled.
`
}
