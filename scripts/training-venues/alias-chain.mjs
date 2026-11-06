import { isDeepStrictEqual } from 'node:util'
import { canonical, json } from './prepare.mjs'
import { sha256 } from '../qld-geocoder/export.mjs'

const roles = ['school-current-address', 'council-campus-registration', 'official-dual-address-registration',
  'authoritative-parcel-source', 'authoritative-parcel-footprint', 'official-point-intersection']
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && canonical(a) === canonical(b)

export function verifyOfficialAddressParcelChain(binding, site, result, coordinates, loadEvidence, footprintMembership) {
  const base = { bindingId: binding.bindingId, schema: binding.schema, physicalSiteId: binding.physicalSiteId,
    venueId: binding.venueId, campusId: binding.campusId, officialSiteName: binding.officialSiteName,
    inputAddress: binding.inputAddress, aliasAddress: binding.aliasAddress, expectedParcel: binding.parcel,
    reviewRecordId: binding.reviewRecordId, reviewedOn: binding.reviewedOn, bindingSha256: sha256(json(binding)), evidence: [], spatialVerification: null }
  try {
    if (binding.physicalSiteId !== 'PS079' || binding.venueId !== 'V079' || binding.campusId !== 'PS079:Wynnum-State-High-School' ||
        binding.officialSiteName !== 'Wynnum State High School' || binding.physicalSiteId !== site.physicalSiteId || !site.venueIds.includes(binding.venueId) ||
        !site.aliases.some(name => equal(name, binding.officialSiteName)) || !binding.campusId ||
        !binding.bindingId || !binding.reviewRecordId || !/^\d{4}-\d{2}-\d{2}$/.test(binding.reviewedOn ?? '') ||
        !binding.parcel?.lotNumber || !binding.parcel?.planNumber || !binding.officialFacts ||
        binding.evidence?.length !== roles.length || roles.some(role => binding.evidence.filter(e => e.role === role).length !== 1)) {
      throw new Error('Incomplete independently reviewed official-chain binding')
    }
    const references = new Map(binding.evidence.map(reference => [reference.role, reference])), documents = new Map()
    for (const reference of binding.evidence) {
      const url = new URL(reference.sourceUrl)
      if (url.protocol !== 'https:' || url.username || url.password || !/^[a-f0-9]{64}$/.test(reference.sha256 ?? '')) throw new Error('Invalid official-chain reference')
      if (reference.role === 'school-current-address' && reference.sourceUrl !== 'https://wynnumshs.eq.edu.au/our-school/contact-us') throw new Error('Unapproved official school source URL')
      if (reference.role === 'council-campus-registration' && reference.sourceUrl !== 'https://heritage.brisbane.qld.gov.au/heritage-places/2045') throw new Error('Unapproved Council source URL')
      if (!['school-current-address', 'council-campus-registration'].includes(reference.role)) {
        const addressLayer = reference.role === 'official-dual-address-registration'
        const expectedPath = addressLayer ? '/arcgis/rest/services/PlanningCadastre/LandParcelPropertyFramework/MapServer/0/query' :
          '/arcgis/rest/services/Basemaps/QSCF_FoundationData/MapServer/3/query'
        if (url.hostname !== 'spatial-gis.information.qld.gov.au' || url.pathname !== expectedPath ||
            (reference.role !== 'official-point-intersection' && url.searchParams.get('where') !== `lotplan='${binding.parcel.lotNumber}${binding.parcel.planNumber}'`) ||
            (!addressLayer && url.searchParams.get('outSR') !== '4326')) throw new Error('Unapproved official parcel/address source query')
      }
      const bytes = loadEvidence(reference.file)
      if (sha256(bytes) !== reference.sha256) throw new Error(`Official evidence hash mismatch: ${reference.role}`)
      documents.set(reference.role, JSON.parse(bytes))
      base.evidence.push({ ...reference })
    }
    const facts = binding.officialFacts, parcelKey = `${binding.parcel.lotNumber}${binding.parcel.planNumber}`
    const parcelMatches = attributes => attributes?.lot === binding.parcel.lotNumber && attributes?.plan === binding.parcel.planNumber && attributes?.lotplan === parcelKey
    const school = documents.get('school-current-address'), schoolReference = references.get('school-current-address')
    const input = binding.inputAddress.streetAddress.match(/^(\d+[a-z]?)\s+(.+)$/i)
    if (school.sourceUrl !== schoolReference.sourceUrl || !equal(school.schoolName, binding.officialSiteName) ||
        !input || !equal(input[2], facts.schoolStreet) || !equal(school.physicalAddress?.street, facts.schoolStreet) ||
        school.physicalAddress?.houseNumber !== facts.schoolNumber || facts.schoolNumber !== null ||
        !equal(school.physicalAddress?.locality, facts.schoolLocality) || !equal(facts.schoolLocality, binding.inputAddress.suburb) ||
        school.physicalAddress?.postcode !== facts.schoolPostcode || facts.schoolPostcode !== binding.inputAddress.postcode ||
        school.physicalAddress?.state !== 'QLD') throw new Error('Official school street/campus/locality evidence does not match; no house number may be invented')
    const council = documents.get('council-campus-registration')
    if (council.sourceUrl !== references.get('council-campus-registration').sourceUrl ||
        council.placeName !== facts.councilPlaceName || council.recordId !== facts.councilRecordId ||
        !equal(council.registeredAddress?.street, binding.aliasAddress.streetAddress) ||
        !equal(council.registeredAddress?.locality, binding.aliasAddress.suburb) ||
        council.registeredAddress?.postcode !== binding.aliasAddress.postcode || council.registeredAddress?.state !== 'QLD' ||
        !council.lotPlans?.includes(`L${binding.parcel.lotNumber}_${binding.parcel.planNumber}`)) throw new Error('Council school identity/address/parcel registration does not match')
    // The address layer supplies number 25; it does not supply the school's Manly postcode.
    const registrations = documents.get('official-dual-address-registration').features
    if (!Array.isArray(registrations) || registrations.length !== 2 || !registrations.every(feature => parcelMatches(feature.attributes))) {
      throw new Error('Official dual-address records do not identify one exact parcel')
    }
    for (const [address, status] of [[facts.registeredInput, facts.registeredInputStatus], [facts.registeredAlias, facts.registeredAliasStatus]]) {
      const matches = registrations.filter(feature => feature.attributes.address === address && feature.attributes.address_status === status && feature.attributes.geocode_type === 'PC')
      if (matches.length !== 1) throw new Error('Missing exact independently registered input or alternate address')
    }
    if (!equal(facts.registeredInput, `${binding.inputAddress.streetAddress} ${binding.aliasAddress.suburb} QLD`) ||
        !equal(facts.registeredAlias, `${binding.aliasAddress.streetAddress} ${binding.aliasAddress.suburb} QLD`)) throw new Error('Reviewed address registration facts do not correspond to this address pair')
    const source = documents.get('authoritative-parcel-source'), footprint = documents.get('authoritative-parcel-footprint')
    if (source.geometryType !== 'esriGeometryPolygon' || source.spatialReference?.wkid !== 4326 ||
        (source.spatialReference.latestWkid !== undefined && source.spatialReference.latestWkid !== 4326) ||
        source.features?.length !== 1 || !parcelMatches(source.features[0].attributes) ||
        footprint.type !== 'Feature' || footprint.id !== facts.featureId || footprint.id !== parcelKey ||
        !parcelMatches(footprint.properties) || footprint.geometry?.type !== 'Polygon' ||
        !isDeepStrictEqual(footprint.geometry.coordinates, source.features[0].geometry?.rings) ||
        footprint.properties?.provenance?.sourceSha256 !== references.get('authoritative-parcel-source').sha256 ||
        footprint.properties?.provenance?.sourceUrl !== references.get('authoritative-parcel-source').sourceUrl) {
      throw new Error('Authoritative footprint parcel/CRS or lossless geometry provenance does not match')
    }
    if (result.LotNumber !== binding.parcel.lotNumber || result.PlanNumber !== binding.parcel.planNumber) return { ...base,
      status: 'Rejected', reasons: ['returned-lot-plan-does-not-match-independently-verified-site-parcel'] }
    const membership = footprintMembership(coordinates, footprint.geometry)
    base.spatialVerification = { method: 'Strict point-in-polygon over hash-bound official EPSG:4326 parcel; independently corroborated by official point-intersects response',
      crs: 'EPSG:4326', featureId: footprint.id, membership, precision: 'campus-level; no basketball hall or entrance identified',
      featureName: footprint.properties.feat_name, featureNameUsedAsSchoolIdentity: false }
    if (membership === 'outside') return { ...base, status: 'Rejected', reasons: ['coordinate-outside-authoritative-school-campus-parcel-footprint'] }
    if (membership !== 'inside') return { ...base, status: 'Unverified', reasons: ['strict-spatial-membership-not-established'] }
    const intersection = documents.get('official-point-intersection'), pointQuery = new URL(references.get('official-point-intersection').sourceUrl)
    if (intersection.spatialReference?.wkid !== 4326 || intersection.features?.length !== 1 ||
        !parcelMatches(intersection.features[0].attributes) || pointQuery.searchParams.get('geometry') !== `${result.Longitude},${result.Latitude}` ||
        pointQuery.searchParams.get('inSR') !== '4326' || pointQuery.searchParams.get('spatialRel') !== 'esriSpatialRelIntersects') {
      throw new Error('Actual coordinate does not match independently captured official parcel-intersection evidence')
    }
    if (sha256(json(result)) !== binding.confidenceReviewResolution?.rawGovernmentRowSha256) {
      throw new Error('Government row differs from the exact independently reviewed return; no implicit new alias/metadata approval')
    }
    return { ...base, status: 'Verified', confidenceReviewResolution: binding.confidenceReviewResolution,
      limitations: ['School source publishes Peel Street/Manly/4179 without a number; number 25 is independently registered by the Queensland address layer.',
        'Address layer uses Wynnum without a postcode; the school and Council separately establish the respective locality/postcode labels.',
        'The parcel feature name is null; campus identity comes from the school/Council evidence chain, not an invented feature name.',
        'Government coordinate datum is not declared in the CSV; comparison is at campus level against the official EPSG:4326 footprint.'],
      reasons: ['Independent official school, Council, dual-address registration, exact returned Lot/Plan and authoritative spatial evidence establish the same campus.'] }
  } catch (error) {
    return { ...base, status: 'Unverified', reasons: [`same-site-official-chain-not-verified: ${error.message}`] }
  }
}
