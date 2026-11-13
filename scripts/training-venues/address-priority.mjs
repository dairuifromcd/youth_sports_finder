import { createHash } from 'node:crypto'

export const addressRoles = Object.freeze({
  training: 'club-training-location',
  access: 'training-access',
  administrative: 'school-venue-administrative',
  government: 'government-registered-property',
  owner: 'owner-location-lead',
})
const components = ['number', 'street', 'suburb', 'state', 'postcode']
const officialPublishers = ['club', 'governing-association', 'school-operator', 'government']
const trainingPublishers = ['club', 'governing-association']
const normalized = value => (value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
const sameAddress = (a, b) => components.every(key => normalized(a[key]) === normalized(b[key]))
const complete = address => components.every(key => typeof address[key] === 'string' && address[key].trim()) &&
  /^\d+[a-z]?$/i.test(address.number) && address.state === 'QLD' && /^\d{4}$/.test(address.postcode)

// Hashes bind reviewed interpretations, not just URLs. They do not establish authenticity.
export const addressPriorityRecordHash = record => createHash('sha256').update(JSON.stringify(record)).digest('hex')

/**
 * Review-only trust boundary: records AND their separate manifest must come from an
 * independently reviewed evidence overlay. Never construct the manifest from an
 * untrusted request or treat matching hashes as proof that a publisher is official.
 * Records preserve original source/evidence references, dates and semantic roles;
 * requests can select pinned IDs only. This module has no importer/validator hook.
 *
 * Record kinds: source {id,publisherRole,url}; training {id,physicalSiteId,campusId,
 * sourceId,activity}; address {id,physicalSiteId,campusId,sourceId,addressRole,purpose,
 * address:{number,street,suburb,state,postcode}}; relationship {id,sourceId,
 * physicalSiteId,campusId,addressIds,conclusion:'same-training-site'|'unresolved'}.
 */
export function createAddressPriorityReviewer({ records, manifest }) {
  if (!Array.isArray(records) || !manifest || typeof manifest !== 'object') throw new Error('Missing reviewed registry/manifest')
  manifest = structuredClone(manifest)
  const registry = new Map()
  for (const original of records) {
    if (!original?.id || registry.has(original.id) || !/^[a-f0-9]{64}$/.test(manifest[original.id] ?? '') ||
        addressPriorityRecordHash(original) !== manifest[original.id]) throw new Error(`Unbound/duplicate record: ${original?.id}`)
    registry.set(original.id, structuredClone(original))
  }
  if (Object.keys(manifest).length !== registry.size) throw new Error('Manifest/registry ID mismatch')
  const sourceFor = record => registry.get(record.sourceId)
  for (const record of registry.values()) {
    if (record.kind === 'source') {
      if (![...officialPublishers, 'owner'].includes(record.publisherRole) ||
          (record.publisherRole !== 'owner' && !/^https:\/\//.test(record.url ?? ''))) throw new Error(`Invalid publisher: ${record.id}`)
    } else {
      if (!['training', 'address', 'relationship'].includes(record.kind) || !record.physicalSiteId || !record.campusId ||
          sourceFor(record)?.kind !== 'source') throw new Error(`Missing source/site/campus: ${record.id}`)
      if (record.kind === 'address' && (!Object.values(addressRoles).includes(record.addressRole) ||
          !record.address || components.some(key => record.address[key] != null && typeof record.address[key] !== 'string'))) {
        throw new Error(`Invalid address role/components: ${record.id}`)
      }
      if (record.kind === 'relationship' && (!Array.isArray(record.addressIds) || record.addressIds.length < 2 ||
          record.addressIds.some(id => registry.get(id)?.kind !== 'address' ||
            registry.get(id).physicalSiteId !== record.physicalSiteId || registry.get(id).campusId !== record.campusId) ||
          !['same-training-site', 'unresolved'].includes(record.conclusion) ||
          !officialPublishers.includes(sourceFor(record).publisherRole))) throw new Error(`Invalid physical relationship: ${record.id}`)
    }
  }

  return function review({ physicalSiteId, campusId, trainingRecordIds = [], addressRecordIds = [], relationshipRecordIds = [] }) {
    const holds = [], excluded = []
    const select = (ids, kind) => [...new Set(ids)].sort().flatMap(id => {
      const record = registry.get(id)
      if (!record || record.kind !== kind || record.physicalSiteId !== physicalSiteId) {
        holds.push(`missing-or-wrong-site-${kind}:${id}`); return []
      }
      if (record.campusId !== campusId) {
        excluded.push({ recordId: id, reason: 'different-campus' });
        if (kind === 'training') holds.push(`different-training-campus:${id}`)
        return []
      }
      return [record]
    })
    const training = select(trainingRecordIds, 'training').filter(record => {
      const eligible = trainingPublishers.includes(sourceFor(record).publisherRole) && record.activity === 'ordinary-team-training'
      if (!eligible) holds.push(`ineligible-training-source-or-activity:${record.id}`)
      return eligible
    })
    if (!training.length) holds.push('no-reviewed-ordinary-team-training-relationship')
    const addresses = select(addressRecordIds, 'address')
    const relations = select(relationshipRecordIds, 'relationship')
    const validAddresses = addresses.filter(record => {
      const publisher = sourceFor(record).publisherRole
      const valid = record.addressRole === addressRoles.training ? trainingPublishers.includes(publisher) && record.purpose === 'ordinary-team-training' :
        record.addressRole === addressRoles.access ? trainingPublishers.includes(publisher) && record.purpose === 'training-access' :
          record.addressRole === addressRoles.administrative ? publisher === 'school-operator' && record.purpose === 'administrative' :
            record.addressRole === addressRoles.government ? publisher === 'government' && record.purpose === 'registered-property' :
              publisher === 'owner' && record.purpose === 'unverified-location-lead'
      if (!valid) { holds.push(`source-role-or-purpose-mismatch:${record.id}`); excluded.push({ recordId: record.id, reason: 'source-role-or-purpose-mismatch' }) }
      return valid
    })
    const byRole = role => validAddresses.filter(record => record.addressRole === role)
    const clubs = byRole(addressRoles.training), administration = byRole(addressRoles.administrative)
    const support = [...administration, ...byRole(addressRoles.government)]
    const roleDifferences = []
    const equivalence = (a, b) => relations.some(record => record.conclusion === 'same-training-site' &&
      officialPublishers.includes(sourceFor(record).publisherRole) &&
      record.addressIds?.includes(a.id) && record.addressIds.includes(b.id))
    for (const club of clubs) for (const other of support) {
      const overlapDiffers = components.some(key => club.address[key] && other.address[key] &&
        normalized(club.address[key]) !== normalized(other.address[key]))
      if (overlapDiffers) {
        const proven = equivalence(club, other)
        roleDifferences.push({ trainingRecordId: club.id, supportingRecordId: other.id,
          interpretation: 'different-address-roles', physicalRelationship: proven ? 'reviewed-same-training-site' : 'unverified' })
        if (!proven) holds.push(`physical-relationship-unverified:${club.id}:${other.id}`)
      }
    }
    for (const relation of relations) if (relation.conclusion !== 'same-training-site') holds.push(`unresolved-physical-relationship:${relation.id}`)

    const pool = clubs.length ? clubs : administration
    let preferred = pool[0] ?? null
    if (!clubs.length && preferred && !training.length) preferred = null
    // Two concrete training targets cannot be resolved by publisher precedence,
    // timestamps, distance, school name, postcode or request order.
    for (const other of pool.slice(1)) if (!sameAddress(pool[0].address, other.address)) holds.push(`competing-address-targets:${pool[0].id}:${other.id}`)
    const query = preferred ? { ...preferred.address } : null
    const componentProvenance = preferred ? Object.fromEntries(components.filter(key => query[key]).map(key => [key, preferred.id])) : {}
    if (preferred && clubs.length) {
      for (const key of components) if (!query[key]) {
        // Supplement only compatible, explicitly identified campus records. An
        // alternate number must never be spliced into the club's street/locality.
        const supplements = administration.filter(record => components.every(component =>
          !query[component] || !record.address[component] || normalized(query[component]) === normalized(record.address[component])))
          .filter(record => record.address[key])
        const values = new Set(supplements.map(record => normalized(record.address[key])))
        if (values.size > 1) holds.push(`conflicting-supplement:${key}`)
        else if (supplements.length) { query[key] = supplements[0].address[key]; componentProvenance[key] = supplements[0].id }
      }
    }
    if (!preferred) holds.push('no-training-or-campus-query-target')
    if (query && !complete(query)) holds.push('incomplete-or-non-single-number-query-address')
    const audit = record => ({ ...structuredClone(record), recordSha256: manifest[record.id],
      source: structuredClone(sourceFor(record)), sourceSha256: manifest[record.sourceId] })
    return {
      policyVersion: 'training-address-priority-v1', mode: 'review-only', physicalSiteId, campusId,
      preferredQuery: preferred ? { address: query, addressRole: preferred.addressRole, recordId: preferred.id,
        componentProvenance, locationClaim: clubs.length ? 'training-location-target-unverified' : 'campus-level-target-unverified' } : null,
      decision: holds.length ? 'held-for-evidence' : 'candidate-for-later-query', holds: [...new Set(holds)].sort(),
      roleDifferences, excluded, trainingRelationships: training.map(audit), evidence: validAddresses.map(audit),
      accessGuidance: byRole(addressRoles.access).map(audit),
      ownerLeads: byRole(addressRoles.owner).map(record => ({ ...audit(record), status: 'Unverified Owner Location Lead' })),
      acceptedCoordinates: null, precision: null, productionStatusChanged: false,
      requires: ['independent-address-review', 'genuine-government-provenance', 'all-existing-strict-geocoding-checks'],
    }
  }
}
