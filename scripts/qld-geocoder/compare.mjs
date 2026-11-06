import { isDeepStrictEqual } from 'node:util'
import { buildBatch, sha256 } from './export.mjs'

// Schema inspected from the owner's corrected full-batch output (not the smoke).
export const resultHeader = ['InputIndex', 'Address to Validate', 'LOCALITY', 'Primary Address', 'Locality', 'Postcode',
  'Local Government Name', 'LotNumber', 'PlanNumber', 'Longitude', 'Latitude', 'GeocodeType', 'Confidence',
  'FullAddress', 'Complex-Building Name', 'Comment']
export const disagreementMetres = 250
export const statuses = ['accepted', 'unmatched', 'ambiguous', 'rejected', 'needs-review']
const normalized = value => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
const decimal = value => /^-?\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value))

// Small strict CSV reader: quoted commas/newlines and escaped quotes are supported.
// Invalid quoting, blank records, duplicate headers and schema drift fail closed.
export function parseCsv(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')
  const rows = []
  let row = [], field = '', quoted = false, closed = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') { quoted = false; closed = true }
      else field += c
    } else if (c === '"') {
      if (field || closed) throw new Error('Malformed CSV quoting')
      quoted = true
    } else if (c === ',' || c === '\r' || c === '\n') {
      row.push(field); field = ''; closed = false
      if (c !== ',') {
        if (row.every(value => !value)) throw new Error('Blank CSV record')
        rows.push(row); row = []
        if (c === '\r' && text[i + 1] === '\n') i++
      }
    } else {
      if (closed) throw new Error('Unexpected character after closing CSV quote')
      field += c
    }
  }
  if (quoted) throw new Error('Unclosed CSV quote')
  if (field || row.length || closed) rows.push([...row, field])
  if (!rows.length || new Set(rows[0]).size !== rows[0].length) throw new Error('Missing or duplicate CSV header')
  if (rows.some(row => row.length !== rows[0].length)) throw new Error('Inconsistent CSV field count')
  return rows
}

export function reconcileResults(bytes, mapping) {
  const [header, ...rows] = parseCsv(bytes)
  if (!isDeepStrictEqual(header, resultHeader)) throw new Error('Unexpected government result schema; inspect the actual CSV')
  const byIndex = new Map()
  for (const fields of rows) {
    const result = Object.fromEntries(header.map((key, i) => [key, fields[i].trim()]))
    const index = result.InputIndex
    if (!/^[1-9]\d*$/.test(index)) throw new Error('Invalid government InputIndex')
    const group = mapping.rows.find(row => row.rowNumber === Number(index))
    if (!group || byIndex.has(Number(index))) throw new Error(`Unexpected or duplicate InputIndex: ${index}`)
    if (result['Address to Validate'] !== group.streetAddress || result.LOCALITY !== group.locality) {
      throw new Error(`InputIndex ${index} conflicts with original input address/locality; refusing association`)
    }
    byIndex.set(Number(index), result)
  }
  if (byIndex.size !== mapping.rows.length) throw new Error('Missing government result rows; refusing partial association')
  return byIndex
}

const streetTypes = { st: 'street', rd: 'road', dr: 'drive', ave: 'avenue', cl: 'close', ct: 'court',
  tce: 'terrace', ln: 'lane', pl: 'place', cres: 'crescent', blvd: 'boulevard', pde: 'parade' }
function street(value) {
  let text = normalized(value).replace(/\./g, '')
  let unit = null
  const slash = text.match(/^(?:unit\s+)?(\d+[a-z]?)\//)
  const explicit = text.match(/^unit\s+(\d+[a-z]?)\s+/)
  if (slash || explicit) { const match = slash ?? explicit; unit = match[1]; text = text.slice(match[0].length) }
  const numbered = text.match(/^(\d+[a-z]?(?:-\d+[a-z]?)?)\s+(.+)$/)
  const number = numbered?.[1] ?? null
  const words = (numbered?.[2] ?? text).split(' ')
  words[words.length - 1] = streetTypes[words.at(-1)] ?? words.at(-1)
  return { unit, number, road: words.join(' ') }
}

export function validateResult(group, result) {
  const evidence = { inputIndex: Number(result.InputIndex), inputAddress: result['Address to Validate'], inputLocality: result.LOCALITY,
    primaryAddress: result['Primary Address'], locality: result.Locality, postcode: result.Postcode,
    fullAddress: result.FullAddress, confidence: result.Confidence, geocodeType: result.GeocodeType, comment: result.Comment,
    rawLatitude: result.Latitude, rawLongitude: result.Longitude }
  const rawCoordinateAvailable = decimal(result.Latitude) && decimal(result.Longitude) &&
    Math.abs(Number(result.Latitude)) <= 90 && Math.abs(Number(result.Longitude)) <= 180
  const base = { evidence, rawCoordinateAvailable }
  if (!result.Latitude && !result.Longitude) {
    if (['Primary Address', 'Locality', 'Postcode', 'Confidence', 'GeocodeType', 'FullAddress'].some(key => result[key])) {
      return { ...base, status: 'needs-review', reasons: ['result-evidence-without-coordinates'] }
    }
    const count = result.Comment.match(/^(\d+) candidates address records found\.$/)?.[1]
    if (count !== undefined && Number(count) > 1) return { ...base, status: 'ambiguous', reasons: ['multiple-government-candidates'], candidateCount: Number(count) }
    if (count === '0') return { ...base, status: 'unmatched', reasons: ['no-government-candidates'] }
    return { ...base, status: 'needs-review', reasons: ['unresolved-or-unrecognized-government-comment'] }
  }
  const reject = [], review = []
  if (!rawCoordinateAvailable) reject.push('invalid-or-incomplete-coordinate-pair')
  else if (Number(result.Latitude) < -30 || Number(result.Latitude) > -9 || Number(result.Longitude) < 137 || Number(result.Longitude) > 154.5) {
    reject.push('coordinates-outside-broad-queensland-bounds')
  }
  const sourceLocality = group.providers[0].suburb
  const sourcePostcode = group.providers[0].postcode
  if (!result.Locality || !result.Postcode) review.push('missing-returned-locality-or-postcode')
  if (!sourceLocality || !sourcePostcode) review.push('missing-source-locality-or-postcode')
  if (result.Locality && sourceLocality && normalized(result.Locality) !== normalized(sourceLocality)) reject.push('locality-mismatch')
  if (result.Postcode && sourcePostcode && result.Postcode !== sourcePostcode) reject.push('postcode-mismatch')
  if (result.Confidence !== '100') review.push('confidence-not-100')
  if (result.GeocodeType !== 'PC') review.push('unsupported-or-missing-geocode-type')
  if (result.Comment) review.push('government-comment-requires-review')
  const expectedFull = `${normalized(result['Primary Address'])} ${normalized(result.Locality)} qld ${result.Postcode}`
  if (!result.FullAddress || normalized(result.FullAddress) !== expectedFull) review.push('full-address-components-not-consistent-with-queensland')
  if (/\b(?:nsw|vic|sa|wa|nt|act|tas)\s+\d{4}$/i.test(result.FullAddress)) reject.push('state-mismatch')
  const source = street(group.streetAddress), returned = street(result['Primary Address'])
  if (!result['Primary Address']) review.push('missing-primary-address')
  else {
    if (source.road !== returned.road) reject.push('street-mismatch')
    if (!source.number || !returned.number) review.push('house-number-evidence-missing')
    else if (source.number.includes('-') || returned.number.includes('-')) {
      review.push('house-number-range-requires-review')
      const interval = number => number.split('-').map(value => Number(value.match(/^\d+/)[0]))
      const a = interval(source.number), b = interval(returned.number)
      if (Math.max(a[0], b[0]) > Math.min(a.at(-1), b.at(-1))) reject.push('house-number-mismatch')
    } else if (source.number !== returned.number) {
      if (parseInt(source.number, 10) === parseInt(returned.number, 10)) review.push('house-number-suffix-changed')
      else reject.push('house-number-mismatch')
    }
    if (source.unit !== returned.unit) {
      if (source.unit && returned.unit) reject.push('unit-mismatch')
      else review.push('unit-evidence-missing-or-added')
    }
  }
  if (reject.length || review.length) return { ...base, status: reject.length ? 'rejected' : 'needs-review', reasons: [...reject, ...review] }
  return { ...base, status: 'accepted', reasons: ['exact-source-address-components-confidence-100-PC'],
    latitude: Number(result.Latitude), longitude: Number(result.Longitude), precision: 'property-centroid' }
}

export function distanceMetres(a, b) {
  const radians = degrees => degrees * Math.PI / 180
  const dLat = radians(a.latitude - b.latitude), dLon = radians(a.longitude - b.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2
  return Math.round(6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h))))
}

export function benchmark({ sourceBytes, baselineBytes, uploadBytes, mappingBytes, resultsBytes, validatedOn }) {
  const date = new Date(`${validatedOn}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validatedOn ?? '') || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== validatedOn) {
    throw new Error('Supply the actual validation date as --validated-on YYYY-MM-DD')
  }
  const source = JSON.parse(sourceBytes), baseline = JSON.parse(baselineBytes), mapping = JSON.parse(mappingBytes)
  if (mapping.csv?.sha256 !== sha256(uploadBytes) || mapping.inputs?.source?.sha256 !== sha256(sourceBytes) ||
      mapping.inputs?.baseline?.sha256 !== sha256(baselineBytes)) throw new Error('Input/CSV SHA-256 mismatch with sidecar')
  const rebuilt = buildBatch(source, baseline)
  for (const provider of baseline.filter(provider => provider.geocode.status === 'matched')) {
    const { latitude, longitude } = provider.geocode
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new Error(`Invalid selected Nominatim coordinates: ${provider.id}`)
    }
  }
  for (const key of ['version', 'addressRole', 'csv', 'summary', 'baseline', 'rows', 'manualReview']) {
    if (!isDeepStrictEqual(mapping[key], rebuilt.mapping[key])) throw new Error(`Sidecar ${key} does not reconcile to original providers/export`)
  }
  if (rebuilt.csv !== uploadBytes.toString('utf8')) throw new Error('Upload bytes differ from the verified export')
  const results = reconcileResults(resultsBytes, mapping)
  const previousById = new Map(baseline.map(provider => [provider.id, provider.geocode]))
  const outcomes = new Map()
  for (const group of [...mapping.rows, ...mapping.manualReview]) {
    outcomes.set(group.addressKey, group.rowNumber ? validateResult(group, results.get(group.rowNumber)) :
      { status: 'needs-review', reasons: ['withheld-intersection-not-submitted'], rawCoordinateAvailable: false })
  }
  const groupsById = new Map([...mapping.rows, ...mapping.manualReview].flatMap(group => group.providers.map(provider => [provider.id, group])))
  const provenance = { source: 'qld-government-geocoder', sourceUrl: 'https://geocode.information.qld.gov.au/',
    attribution: '© The State of Queensland (Queensland Government), Property Location Service',
    sourceLastChecked: null, sourceLastCheckedNote: 'Government CSV contains no check/upload timestamp; not inferred from file modification time.',
    validatedOn, addressRole: 'provider-address',
    inputs: Object.fromEntries(Object.entries({ source: sourceBytes, nominatim: baselineBytes, upload: uploadBytes, mapping: mappingBytes, government: resultsBytes })
      .map(([key, bytes]) => [key, { sha256: sha256(bytes) }])) }
  const comparisonRows = source.map(provider => {
    const group = groupsById.get(provider.id), outcome = outcomes.get(group.addressKey), previous = previousById.get(provider.id)
    const nominatim = { status: previous.status, sourceLastChecked: previous.sourceLastChecked ?? null,
      ...(previous.status === 'matched' ? { latitude: previous.latitude, longitude: previous.longitude, precision: previous.precision, matchedAddress: previous.matchedAddress } : {}) }
    const bothHaveRawCoordinates = previous.status === 'matched' && outcome.rawCoordinateAvailable
    const separationMetres = bothHaveRawCoordinates ? distanceMetres(previous,
      { latitude: Number(outcome.evidence.rawLatitude), longitude: Number(outcome.evidence.rawLongitude) }) : null
    return { id: provider.id, name: provider.name, address: provider.address, addressKey: group.addressKey,
      nominatim, separationMetres, materialDisagreement: separationMetres !== null && separationMetres > disagreementMetres }
  })
  // A large cross-source difference warrants review; Nominatim is not ground truth.
  for (const row of comparisonRows.filter(row => row.materialDisagreement)) {
    const outcome = outcomes.get(row.addressKey)
    if (outcome.status === 'accepted') {
      outcome.status = 'needs-review'; outcome.reasons.push('cross-source-coordinate-disagreement-over-250m')
      delete outcome.latitude; delete outcome.longitude; delete outcome.precision
    }
  }
  const providers = source.map(provider => {
    const group = groupsById.get(provider.id)
    return { ...provider, qldGeocode: { source: provenance.source, sourceUrl: provenance.sourceUrl, sourceLastChecked: null,
      addressRole: 'provider-address', addressKey: group.addressKey, inputIndex: group.rowNumber ?? null, ...outcomes.get(group.addressKey) } }
  })
  const comparison = comparisonRows.map(row => {
    const outcome = outcomes.get(row.addressKey)
    return { ...row, queensland: { status: outcome.status, reasons: outcome.reasons, rawCoordinateAvailable: outcome.rawCoordinateAvailable,
      ...(outcome.status === 'accepted' ? { latitude: outcome.latitude, longitude: outcome.longitude, precision: outcome.precision } : {}) },
    additionalTrustworthyMatch: outcome.status === 'accepted' && row.nominatim.status !== 'matched',
    previousMatchNotAccepted: row.nominatim.status === 'matched' && outcome.status !== 'accepted' }
  })
  const counts = values => Object.fromEntries(statuses.map(status => [status, values.filter(value => value.status === status).length]))
  const summary = { sourceProviders: source.length, uniqueAddresses: outcomes.size, submittedAddresses: mapping.rows.length,
    rawCoordinateAddresses: [...outcomes.values()].filter(value => value.rawCoordinateAvailable).length,
    rawCoordinateProviders: providers.filter(value => value.qldGeocode.rawCoordinateAvailable).length,
    addressOutcomes: counts([...outcomes.values()]), providerOutcomes: counts(providers.map(value => value.qldGeocode)),
    baseline: mapping.baseline.counts, additionalTrustworthyMatches: comparison.filter(row => row.additionalTrustworthyMatch).length,
    previousMatchesNotAccepted: comparison.filter(row => row.previousMatchNotAccepted).length,
    materialDisagreementProviders: comparison.filter(row => row.materialDisagreement).length,
    materialDisagreementAddresses: new Set(comparison.filter(row => row.materialDisagreement).map(row => row.addressKey)).size,
    acceptedProviderCoveragePercent: Number((100 * providers.filter(value => value.qldGeocode.status === 'accepted').length / source.length).toFixed(2)),
    acceptedAddressCoveragePercent: Number((100 * [...outcomes.values()].filter(value => value.status === 'accepted').length / outcomes.size).toFixed(2)) }
  return { validated: { version: 1, provenance, summary, providers }, comparison: { version: 1, provenance,
    disagreementPolicy: { thresholdMetres: disagreementMetres, method: 'Haversine on selected Nominatim vs raw government coordinates; alert, not ground truth' }, summary, providers: comparison } }
}
