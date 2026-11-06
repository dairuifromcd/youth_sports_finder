import { readFileSync, realpathSync, lstatSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, relative, isAbsolute } from 'node:path'
import { canonical, json } from './prepare.mjs'
import { sha256 } from '../qld-geocoder/export.mjs'
import { ps079AliasBinding } from './ps079-alias-binding.mjs'
import { verifyOfficialAddressParcelChain } from './alias-chain.mjs'

const projectRoot = realpathSync(fileURLToPath(new URL('../..', import.meta.url)))
const review = JSON.parse(readFileSync(new URL('../../data/benchmarks/training-venue-geocoding/same-site-alias-review.json', import.meta.url)))

// A proposed JSON review entry can only request Ambiguous review, never establish trust.
// Real reviewed bindings must be explicitly added here after independent evidence review.
export const verifiedAliasBindings = Object.freeze([ps079AliasBinding])
export const proposedAliasReviews = Object.freeze(review.proposedAliases)
const roles = ['school-current-address', 'council-same-site-registration', 'authoritative-parcel-footprint']
const streetTypes = { st: 'street', rd: 'road', dr: 'drive', ave: 'avenue', ct: 'court', ln: 'lane', pl: 'place', cres: 'crescent', pde: 'parade' }
const fullAddress = address => {
  const words = canonical(address.streetAddress).replace(/\./g, '').split(' ')
  words[words.length - 1] = streetTypes[words.at(-1)] ?? words.at(-1)
  return `${words.join(' ')}|${canonical(address.suburb)}|${address.postcode}`
}
const sameAddress = (a, b) => a && b && fullAddress(a) === fullAddress(b)

function loadProjectEvidence(file) {
  const evidenceRoot = resolve(projectRoot, 'output/workflow/2026-11-06/training-venue-same-site-aliases/official-evidence')
  const path = resolve(projectRoot, file), rel = relative(evidenceRoot, path)
  if (!rel || rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new Error('Alias evidence must stay in its project-local official-evidence directory')
  let current = evidenceRoot
  if (realpathSync(evidenceRoot) !== evidenceRoot) throw new Error('Alias evidence root cannot be redirected')
  for (const component of rel.split('/')) {
    current = resolve(current, component)
    if (lstatSync(current).isSymbolicLink()) throw new Error('Alias evidence cannot use symlinks')
  }
  if (!lstatSync(path).isFile()) throw new Error('Alias evidence must be a regular file')
  return readFileSync(path)
}

function addressFactsMatch(binding, site, result) {
  const returned = { streetAddress: result['Primary Address'], suburb: result.Locality, postcode: result.Postcode }
  return binding.physicalSiteId === site.physicalSiteId && site.venueIds.includes(binding.venueId) &&
    sameAddress(binding.inputAddress, site.address) && sameAddress(binding.aliasAddress, returned)
}

function validAddress(address) {
  return address && ['streetAddress', 'suburb', 'postcode'].every(key => typeof address[key] === 'string' && address[key].trim()) &&
    /^\d{4}$/.test(address.postcode)
}

const property = (feature, key) => typeof key === 'string' ? feature.properties?.[key] : undefined
const sameParcel = (a, b) => a?.lotNumber === b?.lotNumber && a?.planNumber?.toUpperCase() === b?.planNumber?.toUpperCase()
const point = value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) &&
  Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90

function ringMembership(coordinates, ring) {
  if (!Array.isArray(ring) || ring.length < 4 || !ring.every(point) ||
      JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1))) throw new Error('Invalid authoritative footprint ring')
  const [x, y] = [coordinates.longitude, coordinates.latitude]
  let inside = false, area = 0
  for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = ring[i - 1], [bx, by] = ring[i]
    area += ax * by - bx * ay
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax)
    if (Math.abs(cross) < 1e-10 && x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by)) {
      return 'boundary'
    }
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside
  }
  if (Math.abs(area) < 1e-12) throw new Error('Degenerate authoritative footprint ring')
  return inside ? 'inside' : 'outside'
}

function polygonMembership(coordinates, rings) {
  if (!Array.isArray(rings) || !rings.length) throw new Error('Missing authoritative footprint rings')
  const exterior = ringMembership(coordinates, rings[0])
  if (exterior !== 'inside') return exterior
  for (const hole of rings.slice(1)) {
    const membership = ringMembership(coordinates, hole)
    if (membership === 'boundary') return 'boundary'
    if (membership === 'inside') return 'outside'
  }
  return 'inside'
}

export function footprintMembership(coordinates, geometry) {
  if (!coordinates || !Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude)) return 'unavailable'
  if (geometry?.type === 'Polygon') return polygonMembership(coordinates, geometry.coordinates)
  if (geometry?.type === 'MultiPolygon') {
    const results = geometry.coordinates.map(rings => polygonMembership(coordinates, rings))
    return results.includes('inside') ? 'inside' : results.includes('boundary') ? 'boundary' : 'outside'
  }
  throw new Error('Only authoritative polygon/multipolygon footprints are supported')
}

/** The production entry point uses only the fixed registry above.
 * Tests inject clearly synthetic reviewed fixtures through this factory; a boolean is never proof. */
export function createAliasVerifier({ bindings = verifiedAliasBindings, loadEvidence = loadProjectEvidence,
  proposed = proposedAliasReviews } = {}) {
  return (site, result, coordinates) => {
    const binding = bindings.find(item => item && validAddress(item.inputAddress) && validAddress(item.aliasAddress) && addressFactsMatch(item, site, result))
    const proposal = proposed.find(item => item.physicalSiteId === site.physicalSiteId && site.venueIds.includes(item.venueId) &&
      sameAddress(item.inputAddress, site.address) && sameAddress(item.reportedReturnAddress,
        { streetAddress: result['Primary Address'], suburb: result.Locality, postcode: result.Postcode }))
    if (!binding) return proposal ? { status: 'Proposed', reviewId: proposal.reviewId,
      aliasAddress: proposal.reportedReturnAddress, evidence: [],
      reasons: ['reported-same-site-alias-awaits-independent-school-council-parcel-and-spatial-evidence'],
      requiredChecks: proposal.requiredChecks } : null
    if (binding.schema === 'official-address-parcel-chain-v1') {
      return verifyOfficialAddressParcelChain(binding, site, result, coordinates, loadEvidence, footprintMembership)
    }
    const base = { bindingId: binding.bindingId, physicalSiteId: binding.physicalSiteId, venueId: binding.venueId,
      campusId: binding.campusId, officialSiteName: binding.officialSiteName, inputAddress: binding.inputAddress,
      aliasAddress: binding.aliasAddress, expectedParcel: binding.parcel, reviewRecordId: binding.reviewRecordId,
      reviewedOn: binding.reviewedOn, evidence: [], bindingSha256: sha256(json(binding)), spatialVerification: null }
    try {
      if (!binding.bindingId || !binding.reviewRecordId || !/^\d{4}-\d{2}-\d{2}$/.test(binding.reviewedOn ?? '') ||
          !binding.campusId || !site.aliases.some(name => canonical(name) === canonical(binding.officialSiteName ?? '')) ||
          !binding.parcel?.lotNumber || !binding.parcel?.planNumber || !Array.isArray(binding.evidence) ||
          binding.evidence.length !== roles.length || roles.some(role => binding.evidence.filter(e => e.role === role).length !== 1) ||
          new Set(binding.evidence.map(e => e.sourceUrl)).size !== roles.length ||
          new Set(binding.evidence.map(e => e.sha256)).size !== roles.length) {
        throw new Error('Incomplete site-specific reviewed evidence binding')
      }
      let footprint
      for (const reference of binding.evidence) {
        const url = new URL(reference.sourceUrl)
        if (url.protocol !== 'https:' || url.username || url.password || url.hostname === 'geocode.information.qld.gov.au' ||
            !/^[a-f0-9]{64}$/.test(reference.sha256 ?? '') ||
            !reference.file || reference.independentOfGeocoder !== true) throw new Error('Missing independent official evidence reference')
        const documentBytes = loadEvidence(reference.file)
        if (sha256(documentBytes) !== reference.sha256) throw new Error(`Evidence hash mismatch: ${reference.role}`)
        const assertion = reference.reviewedFacts
        if (!assertion || assertion.physicalSiteId !== binding.physicalSiteId || assertion.venueId !== binding.venueId ||
            assertion.campusId !== binding.campusId || canonical(assertion.officialSiteName ?? '') !== canonical(binding.officialSiteName)) {
          throw new Error('Evidence campus/site identity mismatch')
        }
        if (reference.role === 'school-current-address' && (reference.authority !== 'official-school' ||
            !validAddress(assertion.currentOfficialAddress) ||
            (!sameAddress(assertion.currentOfficialAddress, binding.inputAddress) && !sameAddress(assertion.currentOfficialAddress, binding.aliasAddress)))) {
          throw new Error('Official school address not verified for either address of this campus')
        }
        if (reference.role === 'council-same-site-registration' && (reference.authority !== 'local-government' ||
            !sameParcel(assertion.parcel, binding.parcel) || !assertion.siteAddresses?.some(a => sameAddress(a, binding.inputAddress)) ||
            !assertion.siteAddresses?.some(a => sameAddress(a, binding.aliasAddress)))) throw new Error('Both addresses are not independently registered to the same campus/parcel')
        if (reference.role === 'authoritative-parcel-footprint') {
          if (reference.authority !== 'queensland-government-cadastre' || assertion.crs !== 'EPSG:4326' ||
              !sameParcel(assertion.parcel, binding.parcel)) throw new Error('Authoritative parcel/CRS not verified')
          const document = JSON.parse(documentBytes)
          const matches = document.type === 'FeatureCollection' ? document.features?.filter(feature => feature.id === assertion.featureId) : [document]
          const feature = matches?.length === 1 ? matches[0] : null
          if (feature?.type !== 'Feature' || feature.id !== assertion.featureId ||
              property(feature, assertion.propertyKeys?.lotNumber) !== binding.parcel.lotNumber ||
              property(feature, assertion.propertyKeys?.planNumber)?.toUpperCase() !== binding.parcel.planNumber.toUpperCase()) {
            throw new Error('Footprint feature/parcel identity does not match reviewed evidence')
          }
          footprint = { geometry: feature.geometry, evidenceRole: reference.role, featureId: feature.id }
        }
        base.evidence.push({ role: reference.role, authority: reference.authority, sourceUrl: reference.sourceUrl,
          file: reference.file, sha256: reference.sha256, reviewedFacts: reference.reviewedFacts })
      }
      const returnedParcel = { lotNumber: result.LotNumber, planNumber: result.PlanNumber }
      if (!sameParcel(returnedParcel, binding.parcel)) return { ...base, status: 'Rejected', reasons: ['returned-lot-plan-does-not-match-independently-verified-site-parcel'] }
      const membership = footprintMembership(coordinates, footprint.geometry)
      base.spatialVerification = { method: 'Point-in-authoritative-identity-bound-parcel-polygon; strict interior, with holes excluded',
        crs: 'EPSG:4326', featureId: footprint.featureId, membership,
        precision: 'campus-level; not a basketball hall or entrance' }
      if (membership === 'outside') return { ...base, status: 'Rejected', reasons: ['coordinate-outside-authoritative-school-campus-parcel-footprint'] }
      if (membership !== 'inside') return { ...base, status: 'Unverified', reasons: ['strict-spatial-membership-not-established'] }
      return { ...base, status: 'Verified', reasons: ['Independent school and Council same-site address registration, exact parcel and authoritative spatial membership support this alias.'] }
    } catch (error) {
      return { ...base, status: 'Unverified', reasons: [`same-site-alias-proof-not-verified: ${error.message}`] }
    }
  }
}
