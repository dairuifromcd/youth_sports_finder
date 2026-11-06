import { createHash } from 'node:crypto'

export const guideUrl = 'https://www.qld.gov.au/environment/land/title/addressing/geocoder'
export const geocoderUrl = 'https://geocode.information.qld.gov.au/'
export const sha256 = value => createHash('sha256').update(value).digest('hex')
const text = value => value.normalize('NFKC').trim().replace(/\s+/g, ' ')
export const normalizeAddress = value => text(value).toLowerCase().replace(/\s*,\s*/g, ',')
export const csvHeader = ['Address to Validate', 'LOCALITY']

// Match the official input example's simple, unquoted two-column form.
// Valid CSV can use quotes; compatibility with this service still needs a manual test.
export function serializeAddressCsv(rows) {
  const lines = rows.map(({ streetAddress, locality }) => {
    const fields = [streetAddress, locality]
    if (fields.some(value => typeof value !== 'string' || !value.trim() || /[",]/.test(value) ||
        [...value].some(character => character.codePointAt(0) < 32 || character.codePointAt(0) === 127))) {
      throw new Error('Cannot emit safe unquoted address CSV: empty field, comma, quote or control character')
    }
    return fields.join(',')
  })
  return [csvHeader.join(','), ...lines].join('\r\n') + '\r\n'
}

export function buildSmokeBatch(mapping) {
  const rows = [
    ['31 Endiandra Street', 'Algester 4115'],
    ['132 Hill Road', 'Runcorn 4113'],
    ['2A Ross Llewellyn Drive', 'Booval 4304'],
  ].map(([streetAddress, locality]) => {
    const matches = mapping.rows.filter(row => row.streetAddress === streetAddress && row.locality === locality)
    if (matches.length !== 1) throw new Error(`Expected exactly one smoke address group: ${streetAddress}, ${locality}`)
    return matches[0]
  })
  const csv = serializeAddressCsv(rows)
  return { csv, mapping: { file: 'addresses-smoke.csv', sha256: sha256(csv), sourceCsvSha256: mapping.csv.sha256,
    rows: rows.map((row, index) => ({ rowNumber: index + 1, fullRowNumber: row.rowNumber,
      addressKey: row.addressKey, providerIds: row.providers.map(provider => provider.id) })) } }
}

// Only split explicit source components. Never resolve an intersection, infer a
// locality, expand abbreviations or replace a provider address with a venue.
export function splitAddress(provider) {
  const address = provider.address
  if (!address?.trim()) return { reason: 'missing-address' }
  if ([...address].some(character => character.codePointAt(0) < 32 || character.codePointAt(0) === 127)) return { reason: 'control-character-in-address' }
  const parts = address.split(',').map(part => part.trim())
  if (parts.length !== 2 || parts.some(part => !part)) return { reason: 'expected-one-street-locality-separator' }
  const [streetAddress, tail] = parts
  const locality = tail.match(/^([\p{L}][\p{L} .'-]*?)\s+(?:Queensland|QLD)(?:\s+(\d{4}))?$/iu)
  if (!locality) return { reason: 'unrecognized-queensland-locality' }
  const [, suburb, postcode] = locality
  if ((provider.suburb && text(provider.suburb).toLowerCase() !== text(suburb).toLowerCase()) ||
      (provider.postcode && provider.postcode !== postcode)) return { reason: 'source-locality-metadata-conflict' }
  if (/\b(?:corner|cnr|intersection)\b|\s(?:and|&)\s/i.test(streetAddress)) return { reason: 'intersection-needs-manual-review' }
  // Conservative support for a street, optionally preceded by a house number,
  // range or slash unit. Unrecognized building descriptions remain reviewable.
  if (!/^(?:(?:unit\s+)?(?:\d+[a-z]?\/)?\d+[a-z]?(?:-\d+[a-z]?)?\s+)?[\p{L}][\p{L} .'-]*\s(?:street|st|road|rd|drive|dr|avenue|ave|close|cl|way|terrace|tce|court|ct|lane|ln|place|pl|crescent|cres|boulevard|blvd|parade|pde)$/iu.test(streetAddress)) {
    return { reason: 'unrecognized-street-address' }
  }
  return { streetAddress, locality: `${suburb}${postcode ? ` ${postcode}` : ''}` }
}

function validateProviders(providers) {
  if (!Array.isArray(providers) || !providers.length) throw new Error('Expected a nonempty Play On provider array')
  const ids = new Set()
  for (const provider of providers) {
    if (!provider || ['id', 'name', 'sourceUrl', 'sourceLastChecked'].some(key => typeof provider[key] !== 'string' || !provider[key].trim()) ||
        provider.source !== 'qld-play-on' || !Array.isArray(provider.activities) || !provider.activities.length ||
        provider.activities.some(value => typeof value !== 'string') ||
        ['address', 'suburb', 'postcode'].some(key => provider[key] !== undefined && typeof provider[key] !== 'string')) {
      throw new Error('Expected Play On records with identity, activities, source provenance and optional string address fields')
    }
    if (ids.has(provider.id)) throw new Error(`Duplicate provider ID: ${provider.id}`)
    ids.add(provider.id)
  }
}

export function buildBatch(providers, baseline) {
  validateProviders(providers)
  if (!Array.isArray(baseline) || baseline.length !== providers.length || baseline.some(provider => !provider || typeof provider.id !== 'string')) {
    throw new Error('TASK-005 baseline must contain every source provider with its ID')
  }
  const baselineById = new Map(baseline.map(provider => [provider.id, provider]))
  if (baselineById.size !== providers.length) throw new Error('Duplicate IDs in TASK-005 baseline')
  const baselineCounts = { matched: 0, unmatched: 0, ambiguous: 0, error: 0, pending: 0 }
  const groups = new Map()
  // Sorting IDs first selects a reproducible representative even if input order changes.
  for (const provider of [...providers].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) {
    const previous = baselineById.get(provider.id)
    if (!previous || Object.entries(provider).some(([key, value]) => JSON.stringify(previous[key]) !== JSON.stringify(value)) ||
        previous.geocode?.source !== 'osm-nominatim' || !Object.hasOwn(baselineCounts, previous.geocode?.status)) {
      throw new Error(`TASK-005 baseline differs from source or has invalid geocoding provenance: ${provider.id}`)
    }
    baselineCounts[previous.geocode.status]++
    const normalizedAddress = provider.address?.trim() ? normalizeAddress(provider.address) : null
    const key = normalizedAddress ?? `missing-address:${provider.id}`
    if (!groups.has(key)) groups.set(key, { addressKey: sha256(key), normalizedAddress, providers: [] })
    const { id, name, address, suburb, postcode, source, sourceUrl, sourceLastChecked } = provider
    groups.get(key).providers.push({ id, name, ...(address !== undefined ? { address } : {}),
      ...(suburb !== undefined ? { suburb } : {}), ...(postcode !== undefined ? { postcode } : {}),
      source, sourceUrl, sourceLastChecked, nominatimStatus: previous.geocode.status })
  }
  const rows = []
  const manualReview = []
  for (const group of [...groups.values()].sort((a, b) => a.addressKey < b.addressKey ? -1 : 1)) {
    const fields = group.providers.map(splitAddress)
    const failure = fields.find(field => field.reason)
    if (failure) manualReview.push({ ...group, reason: failure.reason })
    else rows.push({ ...group, rowNumber: rows.length + 1, ...fields[0] })
  }
  if (rows.length > 5000) throw new Error('Official batch limit is 5,000 rows; no files written')
  const csv = serializeAddressCsv(rows)
  const mapping = {
    version: 1,
    addressRole: 'provider-address',
    guideUrl,
    geocoderUrl,
    governmentResults: 'Stage B pending — no correctly parsed full government CSV imported',
    csv: { file: 'addresses.csv', sha256: sha256(csv), header: csvHeader,
      rowNumberConvention: '1-based data row excluding header; NOT an official uniqueID or a result-order join key' },
    summary: { totalProviders: providers.length, uniqueAddresses: groups.size, exportedAddresses: rows.length,
      exportedProviders: rows.reduce((count, row) => count + row.providers.length, 0),
      manualReviewAddresses: manualReview.length, manualReviewProviders: manualReview.reduce((count, row) => count + row.providers.length, 0) },
    baseline: { source: 'osm-nominatim', counts: baselineCounts },
    rows,
    manualReview,
  }
  return { csv, mapping }
}
