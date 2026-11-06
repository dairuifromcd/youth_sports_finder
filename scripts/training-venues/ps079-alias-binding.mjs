const directory = 'output/workflow/2026-11-06/training-venue-same-site-aliases/official-evidence/'
const parcelUrl = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Basemaps/QSCF_FoundationData/MapServer/3/query?outFields=lot%2Cplan%2Clotplan%2Cfeat_name%2Calias_name%2Clocality%2Clga%2Cacc_value%2Cacc_method%2Cacc_code_desc%2Cstatedarea%2Cstatedareaunit&returnGeometry=true&outSR=4326&returnZ=false&f=pjson&where=lotplan%3D%27378SL6111%27'
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

/** Independently reviewed 2026-11-06 official evidence; not supplied through a result/CLI boolean. */
export const ps079AliasBinding = freeze({
  schema: 'official-address-parcel-chain-v1', bindingId: 'PS079-OFFICIAL-CHAIN-20261106', reviewRecordId: 'TRAINING-VENUE-SAME-SITE-ALIASES',
  reviewedOn: '2026-11-06', physicalSiteId: 'PS079', venueId: 'V079', campusId: 'PS079:Wynnum-State-High-School',
  officialSiteName: 'Wynnum State High School',
  inputAddress: { streetAddress: '25 Peel Street', suburb: 'Manly', postcode: '4179' },
  aliasAddress: { streetAddress: '77 Buderim Street', suburb: 'Wynnum', postcode: '4178' },
  parcel: { lotNumber: '378', planNumber: 'SL6111' },
  officialFacts: { schoolStreet: 'Peel Street', schoolNumber: null, schoolLocality: 'Manly', schoolPostcode: '4179',
    councilPlaceName: 'Wynnum State High School (QHR)', councilRecordId: '2045',
    registeredInput: '25 Peel Street Wynnum QLD', registeredAlias: '77 Buderim Street Wynnum QLD',
    registeredInputStatus: 'A', registeredAliasStatus: 'P', featureId: '378SL6111' },
  confidenceReviewResolution: { reason: 'confidence-not-100', observedConfidence: '97', geocodeType: 'PC',
    rawGovernmentRowSha256: '824da9c04f30d18935119a2fa50a879994257d4ad144c23bb007d56e10a45bd9',
    rationale: 'Independent official school/Council identity, dual-address parcel registration, exact Lot/Plan and strict authoritative footprint membership resolve this exact row’s automatic confidence review; reported 97 remains unchanged.' },
  evidence: [
    { role: 'school-current-address', file: directory + 'PS079-school-address.json',
      sourceUrl: 'https://wynnumshs.eq.edu.au/our-school/contact-us', sha256: '38b34120be63686f798241e41fe7363a014817246a800ef3f727f791a5229267' },
    { role: 'council-campus-registration', file: directory + 'PS079-council-registration.json',
      sourceUrl: 'https://heritage.brisbane.qld.gov.au/heritage-places/2045', sha256: '4bddc03e0643f6ad4992275b47027e14ec7b61d683f7e5a5c8262c5ce31ea693' },
    { role: 'official-dual-address-registration', file: directory + 'PS079-parcel-addresses-esri.json',
      sourceUrl: 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services/PlanningCadastre/LandParcelPropertyFramework/MapServer/0/query?where=lotplan%3D%27378SL6111%27&outFields=lot%2Cplan%2Clotplan%2Cproperty_name%2Caddress%2Cgeocode_type%2Caddress_status%2Clatitude%2Clongitude&returnGeometry=false&f=pjson',
      sha256: 'dd3869285523354042f6ad98121c82c7ce4785247cc63807803b40ef5fa90c25' },
    { role: 'authoritative-parcel-source', file: directory + 'PS079-parcel-esri.json', sourceUrl: parcelUrl,
      sha256: '0e6055c27c5cc3f995b7018157320634c991ac8613c9bac28fad1fc642cf2771' },
    { role: 'authoritative-parcel-footprint', file: directory + 'PS079-campus-parcel.geojson', sourceUrl: parcelUrl,
      sha256: 'ff199647b428141de39332b08f90b88496830fca8cdfcebba585d3d84a4ea067' },
    { role: 'official-point-intersection', file: directory + 'PS079-point-intersection-esri.json',
      sourceUrl: 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services/Basemaps/QSCF_FoundationData/MapServer/3/query?outFields=lot%2Cplan%2Clotplan%2Cfeat_name%2Calias_name%2Clocality%2Clga%2Cacc_value%2Cacc_method%2Cacc_code_desc%2Cstatedarea%2Cstatedareaunit&returnGeometry=true&outSR=4326&returnZ=false&f=pjson&where=1%3D1&geometry=153.17627525%2C-27.4542584&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects',
      sha256: '0e6055c27c5cc3f995b7018157320634c991ac8613c9bac28fad1fc642cf2771' },
  ],
})
