/** Internal review contract only; never a publication approval or frontend import. */
export type TemporalClassification = 'Current Confirmed' | 'Official Listed — Current Status Unknown'
export type GeocodingStatus = 'Accepted' | 'Ambiguous' | 'Rejected' | 'Pending'
export type Precision = 'campus-level' | 'venue-level' | null
export type Coordinates = { latitude: number; longitude: number } | null
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
