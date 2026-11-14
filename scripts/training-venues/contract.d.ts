/** Internal review contract only; never a publication approval or frontend import. */
export type TemporalClassification = 'Current Confirmed' | 'Official Listed — Current Status Unknown'
export type GeocodingStatus = 'Accepted' | 'Ambiguous' | 'Rejected' | 'Pending'
export type Precision = 'campus-level' | 'venue-level' | null
export type Coordinates = { latitude: number; longitude: number } | null
/** Additive production provenance only. Historical site records and the original
 * governmentResultProvenance retain their existing meaning and exact values. */
export interface ProductionBatchRowReference {
  batchId: string
  physicalSiteId: string
  inputIndex: number
  queryAddress: string
  queryLocality: string
  resultCsvSha256: string
  canonicalGovernmentRowSha256: string
}
export interface ProductionBatchSources {
  schemaVersion: 1
  inputIndexScope: 'batch-local; never globally unique'
  historicalBaselineSha256: string
  batches: Array<{
    batchId: 'training-venue-historical-2026-11-06' | 'training-venue-coverage-phase2a'
    obtainedOn: string
    validatedOn: string
    resultPath: string
    resultCsvSha256: string
    provenancePath: string
    provenanceSha256: string
    uploadPath: string
    uploadCsvSha256: string
    mappingPath: string
    mappingSha256: string
    registrySha256?: string
    manifestSha256?: string
    governmentResultProvenance: Record<string, unknown>
    rows: ProductionBatchRowReference[]
  }>
  provenanceLimitation: string
}
export interface TrainingVenueCandidates {
  schemaVersion: 1
  status: 'Internal candidates — publication not approved'
  publicDisplayApproved: false
  asOfDate: string
  temporalMeaning: Record<TemporalClassification, string>
  providers: Array<{ providerId: string; providerName: string; officialContacts: Array<{ type: 'website' | 'facebook_page'; url: string }>; physicalSiteIds: string[] }>
  venues: Array<{ physicalSiteId: string; venueIds: string[]; venueName: string; coordinates: Coordinates; precision: Precision }>
  associations: Array<{ associationId: string; providerId: string; venueId: string; physicalSiteId: string;
    activityType: 'Regular Weekly Club/Team Training'; temporalClassification: TemporalClassification;
    teamAgeTags: string[]; scopeReviewRequired: true; scopeReference: string; reviewCodes: string[];
    manualReviewRequired: boolean; sourceDisclosureReviewRequired: boolean; restrictions: string[] }>
}
