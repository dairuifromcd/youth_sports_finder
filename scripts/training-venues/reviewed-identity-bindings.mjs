import { sha256 } from '../qld-geocoder/export.mjs'

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

// Three individually reviewed frozen research chains, not a generic legacy-schema exemption.
// Hashes use the same canonical project JSON serialization as existing identityEvidence().
// No new source fetch is represented by this 2026-11-11 offline review.
export const reviewedIdentityBindings = freeze([
  {
    "physicalSiteId": "PS027",
    "venueId": "V027",
    "canonicalAddress": "134A Parkland Drive, Springfield Central QLD 4300",
    "address": {"streetAddress":"134A Parkland Drive","suburb":"Springfield Central","postcode":"4300"},
    "evidenceId": "E178",
    "sourceId": "S065",
    "url": "https://ymcaqueensland.org.au/services/community-centres/springfield-central",
    "checkedOn": "2026-11-05",
    "reviewedOn": "2026-11-11",
    "records": {
      "venues": [
        [
          "V027",
          "705e4886945a26bd1e2d9996421d74b9457eb0cff3a91215b9fce697fd06c7f6"
        ]
      ],
      "evidence": [
        [
          "E178",
          "82244e98863a1542b554f8cedbbf08dae8a87ca75ba8e2de9c8128aa6b612708"
        ]
      ],
      "sources": [
        [
          "S065",
          "4828de3021dfc288106985b30362dfcdb709945948a03a41dd56ce62fb220d7e"
        ],
        [
          "S173",
          "dfa865a6ba9e84ef6fe5ee6d3a184fc290f6486457d729601efadec8069dbb12"
        ]
      ],
      "observations": [
        [
          "C065",
          "85580db08ceed067997a0e9d71766ddf83a7ddab421552dee322e63244e0e12a"
        ],
        [
          "C174",
          "d281a6cdaf7f6d68bf30f53498795e82be6251569578a091367daaf617142eaf"
        ]
      ],
      "accessRecords": []
    }
  },
  {
    "physicalSiteId": "PS032",
    "venueId": "V032",
    "canonicalAddress": "249 Priestdale Road, Rochedale QLD 4123",
    "address": {"streetAddress":"249 Priestdale Road","suburb":"Rochedale","postcode":"4123"},
    "evidenceId": "E184",
    "sourceId": "S171",
    "url": "https://rochedaleshs.eq.edu.au/SupportAndResources/FormsAndDocuments/Documents/RAS/ras-prospectus.pdf",
    "checkedOn": "2026-11-05",
    "reviewedOn": "2026-11-11",
    "records": {
      "venues": [
        [
          "V032",
          "38bc91191d3a53527331c3d320562a7239b89deaba865872afec7911e2d4643b"
        ]
      ],
      "evidence": [
        [
          "E184",
          "596224cb0057998c9e2f9a1e6f6c7785aaeeeed5e432c523b8302bda5fae18ac"
        ],
        [
          "R2L-E197",
          "731eb515e566d6c96c9bbd1b338b1e3e5f9aae214f2c24879c366488d3ccb600"
        ]
      ],
      "sources": [
        [
          "S050",
          "fbe7505276f4033f6d87496f192202fc360ec994064cf32804bda25fd90a7a7a"
        ],
        [
          "S171",
          "abbfd08a1f4ea621cbdde7d887d948f7a0cb077d33820201b03bbac88ea6ebcf"
        ],
        [
          "R2L-S188",
          "8bdeeb56faf2ebcbe78032a78291bbb967f4de49c231f7f1334232a8d8520be8"
        ]
      ],
      "observations": [
        [
          "C050",
          "019bedadcf8c5ed4d0e41ae780ae8437de8f500dc514342684a7ea38728fd5c5"
        ],
        [
          "C172",
          "5f09a012533f181d174031269c231dca3250067b64520492a343aa729253b835"
        ],
        [
          "L-O224",
          "901b40ca0fb2665bd26d30cf1edc0b409d9157dc3e6b7e74d1ceb4ebd0d26ebe"
        ]
      ],
      "accessRecords": [
        [
          "R2L-ACCESS-L-O224",
          "9182d62a7b74770f83f657882b7c2f9ace4616296059bd9a24da61e9c850e7d7"
        ]
      ]
    }
  },
  {
    "physicalSiteId": "R2L-PS001",
    "venueId": "R2L-V001",
    "canonicalAddress": "17 Beauvardia Street, Cannon Hill QLD 4170",
    "address": {"streetAddress":"17 Beauvardia Street","suburb":"Cannon Hill","postcode":"4170"},
    "evidenceId": "R2L-E178",
    "sourceId": "R2L-S170",
    "url": "https://www.stoliverplunkett.qld.edu.au/contacts-links/contact-location-details",
    "checkedOn": "2026-11-06",
    "reviewedOn": "2026-11-11",
    "records": {
      "venues": [
        [
          "R2L-V001",
          "1d91583f75bf913e632439e2cddb29eeb361d7dbde1e23df4a8be7e3a5fc5cf5"
        ]
      ],
      "evidence": [
        [
          "R2L-E178",
          "02733bfe460168a5aa819a7cfe86bd3680c7152cd497ac2fcf5f52a8fc15c3fd"
        ]
      ],
      "sources": [
        [
          "R2L-S170",
          "3e513a9d3d99c90956eda70b323fc06e1e60c954d54949224c20022b40d203a8"
        ]
      ],
      "observations": [
        [
          "L-O200",
          "256fbcc0f89a11f8e6c0a3e60f9dfe91d5e6f4c6a80ba862f6881626b2c9bd83"
        ]
      ],
      "accessRecords": [
        [
          "R2L-ACCESS-L-O200",
          "73b23db570425c8fb0f6f01de89a859e713a64195ee40b06bacc5921f1fe3862"
        ]
      ]
    }
  }
])

export function reviewedIdentityEvidence(site, context) {
  const binding = reviewedIdentityBindings.find(item => item.physicalSiteId === site.physicalSiteId)
  if (!binding || site.address?.normalized !== binding.canonicalAddress ||
      JSON.stringify(site.venueIds) !== JSON.stringify([binding.venueId]) ||
      ['streetAddress', 'suburb', 'postcode'].some(key => site.address[key] !== binding.address[key])) return []
  for (const [collection, references] of Object.entries(binding.records)) {
    for (const [id, expectedHash] of references) {
      const record = context[collection]?.get(id)
      if (!record || sha256(JSON.stringify(record, null, 2) + '\n') !== expectedHash) return []
    }
  }
  const venue = context.venues.get(binding.venueId), evidence = context.evidence.get(binding.evidenceId)
  const source = context.sources.get(binding.sourceId)
  if (venue.physicalSiteId !== binding.physicalSiteId || venue.physicalIdentityResolved !== true ||
      venue.address.formatted !== binding.canonicalAddress || !venue.address.addressEvidenceIds.includes(binding.evidenceId) ||
      !evidence.sourceIds.includes(binding.sourceId) || source.url !== binding.url ||
      !(evidence.venueId === binding.venueId || evidence.relatedVenueIds?.includes(binding.venueId))) return []
  return [{ physicalSiteId: binding.physicalSiteId, venueId: binding.venueId,
    evidenceId: binding.evidenceId, sourceId: binding.sourceId, url: binding.url,
    canonicalAddress: binding.canonicalAddress, sourceRole: 'direct-official-site-address',
    evidenceSha256: sha256(JSON.stringify(evidence, null, 2) + '\n'), checkedOn: binding.checkedOn,
    reviewedOn: binding.reviewedOn, reviewRecordId: 'TRAINING-VENUE-IDENTITY-EVIDENCE-BINDING-REVIEW',
    schema: 'frozen-site-specific-research-chain-v1', verifiedRecordHashes: binding.records,
    limitation: 'Existing official research observations reused offline; official physical site/campus address only. Exact basketball hall, court, public entrance and current training occurrence are not verified.' }]
}
