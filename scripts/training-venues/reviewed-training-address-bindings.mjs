import { sha256 } from '../qld-geocoder/export.mjs'

const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

const recordHash = record => sha256(JSON.stringify(record, null, 2) + '\n')
const sameIds = (actual, expected) => Array.isArray(actual) && JSON.stringify([...actual].sort()) === JSON.stringify(expected)
function recordsMatch(binding, context) {
  return Object.entries(binding.records).every(([collection, references]) => references.every(([id, hash]) => {
    const record = context[collection]?.get(id)
    return record && recordHash(record) === hash
  }))
}

export function reviewedGoverningTrainingRelationship(association, context) {
  const binding = reviewedGoverningTrainingBindings.find(b => b.associationId === association.associationId)
  return !!binding && ['providerId', 'venueId', 'physicalSiteId'].every(key => association[key] === binding[key]) &&
    recordHash(association) === binding.records.associations[0][1] && recordsMatch(binding, context)
}

export function reviewedTrainingAddressEvidence(site, context) {
  const binding = reviewedTrainingAddressBindings.find(b => b.physicalSiteId === site.physicalSiteId)
  if (!binding || site.address?.normalized !== binding.canonicalAddress ||
      ['streetAddress', 'suburb', 'postcode'].some(key => site.address[key] !== binding.address[key]) ||
      !['venueIds', 'providerIds', 'associationIds'].every(key => sameIds(site[key], binding[key])) ||
      !recordsMatch(binding, context)) return []
  const selected = context.selected?.filter(a => a.physicalSiteId === site.physicalSiteId)
  if (!selected || !sameIds(selected.map(a => a.associationId), binding.associationIds) ||
      selected.some(a => recordHash(a) !== binding.records.associations.find(([id]) => id === a.associationId)?.[1])) return []
  // Address publisher and relationship provider may differ only at the same pinned site.
  // These records describe existing associations; this helper never creates one.
  return [{ physicalSiteId: binding.physicalSiteId, venueIds: binding.venueIds,
    canonicalAddress: binding.canonicalAddress, sourceRole: binding.sourceRole,
    evidenceId: binding.evidenceId, sourceIds: binding.sourceIds,
    sources: binding.records.sources.map(([id]) => ({ sourceId: id, url: context.sources.get(id).url })),
    publisherSourceIds: binding.publisherSourceIds, addressComponents: binding.addressComponents,
    relationships: binding.relationships, checkedOn: binding.checkedOn, reviewedOn: binding.reviewedOn,
    schema: 'frozen-training-address-chain-v1', reviewRecordId: 'TRAINING-VENUE-GEOCODING-ACCEPTANCE-IMPLEMENTATION',
    verifiedRecordHashes: binding.records, limitation: binding.limitation }]
}

// Individually reviewed frozen research chains. This is not an official-domain or
// confidence exemption. No new source fetch or raw research is represented here.
export const reviewedTrainingAddressBindings = freeze([
  {
    "physicalSiteId": "PS003",
    "venueIds": [
      "V003"
    ],
    "providerIds": [
      "qld-play-on:055fd5732213fea8ef7a3129",
      "qld-play-on:6bcfc2cea0bb64c3cb5e995f",
      "qld-play-on:99afea876882f817d8447472"
    ],
    "associationIds": [
      "A003",
      "A115",
      "R2L-A002"
    ],
    "canonicalAddress": "11 Hamish Street, Calamvale QLD 4116",
    "address": {
      "streetAddress": "11 Hamish Street",
      "suburb": "Calamvale",
      "postcode": "4116"
    },
    "evidenceId": "E160",
    "sourceIds": [
      "S023",
      "S024",
      "S119"
    ],
    "checkedOn": "2026-11-05",
    "reviewedOn": "2026-11-12",
    "sourceRole": "club-published-address",
    "addressComponents": [
      {
        "component": "street-number-and-suffix",
        "evidenceId": "E160",
        "sourceIds": [
          "S023",
          "S024",
          "S119"
        ]
      },
      {
        "component": "street-name-type-and-direction",
        "evidenceId": "E160",
        "sourceIds": [
          "S023",
          "S024",
          "S119"
        ]
      },
      {
        "component": "suburb",
        "evidenceId": "E160",
        "sourceIds": [
          "S023",
          "S024",
          "S119"
        ]
      },
      {
        "component": "postcode",
        "evidenceId": "E160",
        "sourceIds": [
          "S023",
          "S024",
          "S119"
        ]
      },
      {
        "component": "venue-campus-identity",
        "evidenceId": "E160",
        "sourceIds": [
          "S023",
          "S024",
          "S119"
        ]
      }
    ],
    "publisherSourceIds": [],
    "relationships": [
      {
        "associationId": "A003",
        "providerId": "qld-play-on:055fd5732213fea8ef7a3129",
        "venueId": "V003",
        "physicalSiteId": "PS003",
        "evidenceIds": [
          "R2L-E011"
        ],
        "sourceRole": "official-club-ordinary-team-training"
      },
      {
        "associationId": "A115",
        "providerId": "qld-play-on:6bcfc2cea0bb64c3cb5e995f",
        "venueId": "V003",
        "physicalSiteId": "PS003",
        "evidenceIds": [
          "R2L-E199",
          "R2L-E200"
        ],
        "sourceRole": "official-club-ordinary-team-training"
      },
      {
        "associationId": "R2L-A002",
        "providerId": "qld-play-on:99afea876882f817d8447472",
        "venueId": "V003",
        "physicalSiteId": "PS003",
        "evidenceIds": [
          "R2L-E037",
          "R2L-E038"
        ],
        "sourceRole": "official-club-ordinary-team-training"
      }
    ],
    "records": {
      "providers": [
        ["qld-play-on:055fd5732213fea8ef7a3129", "7154b7f33cedee9d24621d5220f35e5b16333bda554899646ef63a533af59a5f"],
        ["qld-play-on:6bcfc2cea0bb64c3cb5e995f", "1286301692d5d3621a71f22137765c1dfff24031a34b3405de857b970f46bc6a"],
        ["qld-play-on:99afea876882f817d8447472", "38442ee587e541a5cfb61e6e1b880fd0f2d385a56d8a7538d6b0ec7a8604911f"]
      ],
      "venues": [
        ["V003", "55eaccbf926582ff78a43b5c37dcb5e0eb2ec8ee090e32417023488adb6cb3f0"]
      ],
      "sites": [
        ["PS003", "d32de5d89f6cee0db59de3499304adaad2e93e1edf705ff46008fa8a9e060097"]
      ],
      "associations": [
        ["A003", "3c557dddffeb701b633434aa4b19ac36ad1c39e46a11f518144e837e9a2c01a6"],
        ["A115", "376d790266800a03668662ec2d09ab4c23058efc935d1754fd8dcae0ed197194"],
        ["R2L-A002", "c83a2ccac0df4f2e078d73d5cd668a51de1b10bf12bc6dc2e81c1242f4ec78ef"]
      ],
      "evidence": [
        ["E160", "5e62ff6293704a286db107a73c275c1a1a0cdc6d67d9b0ec7e4b08472a494461"],
        ["R2L-E011", "40eb8cd5a3f3779d7729dc7c4feec5bba40003d9bbcf16ebd7fb8944c391c4b0"],
        ["R2L-E037", "ac59ef8a4a3be0e1417c7d99da036ccff7806d7821f7dffdde9921963b5caffa"],
        ["R2L-E038", "6afd66311336a5e1941646b495917ce33cdd75f0a6101d173675a7c7ba464d40"],
        ["R2L-E199", "0967a999167f39b13444a4a7fdccd735e688df9014a0df91c3901c03df74812c"],
        ["R2L-E200", "fca1fabcd07f6ba23134fc8f337227ab6a597c10403e4432b33aba5624638b6f"]
      ],
      "sources": [
        ["R2L-S009", "2d344baddef850309559b19e5cd32ea947a988a3df8146ac9603116d74ffeccc"],
        ["R2L-S035", "57c25dfeb97b398ad9cc3feae815f493bc80f091bf149a1ecbb3a73de1c3c98b"],
        ["R2L-S036", "9093abe9fbf8c57bd5625b516106d9dd48cdb1154da1076aaaa6f9cf17e6f8a7"],
        ["R2L-S190", "5d60876152ba7942f1bc2b7260735da89c82e9c791188f156e2c6f0dbb361d2e"],
        ["R2L-S191", "80a8cfffc3373a1c9897a53144fe1941e2b87ba31d20c4cc30650998da82f0e4"],
        ["S023", "ee53396ee8a98145584d427b02b6062aebd94ea2611e281e8478db2f0675421c"],
        ["S024", "4ec0b227fd149df7e2a087b2041beee92e26f931a2168c532a01c645fe826b14"],
        ["S119", "3ee1af1af402a0aa1402ec620983724e3b496a0e54d45108055bd9fcdb0ed5c0"]
      ],
      "observations": [
        ["C023", "5f045d790e89a9dc3a7556a1c7d2e89672c825afa8006a8f28bd8884dfa6ad78"],
        ["C024", "c5a81ad69eea75dce968f2987371b8ca66043034fd4c52c79512ef2559add692"],
        ["C120", "a44c5963db8d9d3492ad48a0317b7d0a631ead56f4b39499eff823229affb9e6"],
        ["L-O009", "0d1c98d7ba90c0659d8313579b302e3dcfae753267ab11a93de9f207a4a3af87"],
        ["L-O038", "a4b22d7dd71d1024baebc27a30bd9cfc5f2e23a296d8bb5ed20cc6f8bbd7e13a"],
        ["L-O039", "b4913dd7b3c293e83e3ff29791fcd7acaf6ae0391fb7c2b326ab1c869852cc5c"],
        ["L-O226", "bfecddf8c28c70c968bec7ff9c2ac1a8cd23af920aee58813d2bf03bae789a82"],
        ["L-O227", "541bbb54e1be73b0da83458b3eaa5d5b683741165e7b5c0e19480d48f894d9dd"]
      ],
      "accessRecords": [
        ["R2L-ACCESS-L-O009", "8f16e5d7555b141e63725ad8638ad633472fedef4d8bb66c66ea5bf5509652d9"],
        ["R2L-ACCESS-L-O038", "dcc8179e4706945e8895914f969dd48848ea6773543f7bdc58dc48ef0e288e65"],
        ["R2L-ACCESS-L-O039", "acafa47f5317084b55846a81d6f0be796afcf07c62e330b3819f5cc9b23b523f"],
        ["R2L-ACCESS-L-O226", "f76c78d3140d8d7dc583933f9b6855d108c2d3fcb880b6f9733c72a3a8427752"],
        ["R2L-ACCESS-L-O227", "6e10b261f07374cfc312356320f0b3ac4d63ceb3d716b70919b038719c679454"]
      ]
    },
    "limitation": "E160/S023,S024,S119; C023/C024/C120 identify college and numbered address. R2L-E037 independently retains club/11 Hamish; entrance descriptions are separate. Research as of 2026-11-06; sources checked 2026-11-05/06, not fetched in this review. Training/team/season/access restrictions remain; PC represents property/campus, never exact hall, court, entrance or current use."
  },
  {
    "physicalSiteId": "PS009",
    "venueIds": [
      "V009"
    ],
    "providerIds": [
      "qld-play-on:87277650ff43e143b8aa7ce9",
      "qld-play-on:d2317868aa256f2e68dffa58"
    ],
    "associationIds": [
      "A011",
      "A112"
    ],
    "canonicalAddress": "109 Weedon Street West, Mansfield QLD 4122",
    "address": {
      "streetAddress": "109 Weedon Street West",
      "suburb": "Mansfield",
      "postcode": "4122"
    },
    "evidenceId": "E186",
    "sourceIds": [
      "S050"
    ],
    "checkedOn": "2026-11-05",
    "reviewedOn": "2026-11-12",
    "sourceRole": "club-published-address",
    "addressComponents": [
      {
        "component": "street-number-and-suffix",
        "evidenceId": "E186",
        "sourceIds": [
          "S050"
        ]
      },
      {
        "component": "street-name-type-and-direction",
        "evidenceId": "E186",
        "sourceIds": [
          "S050"
        ]
      },
      {
        "component": "suburb",
        "evidenceId": "E186",
        "sourceIds": [
          "S050"
        ]
      },
      {
        "component": "postcode",
        "evidenceId": "E186",
        "sourceIds": [
          "S050"
        ]
      },
      {
        "component": "venue-campus-identity",
        "evidenceId": "E186",
        "sourceIds": [
          "S050"
        ]
      }
    ],
    "publisherSourceIds": [
      "S049",
      "R2L-S076",
      "R2L-S077"
    ],
    "relationships": [
      {
        "associationId": "A011",
        "providerId": "qld-play-on:87277650ff43e143b8aa7ce9",
        "venueId": "V009",
        "physicalSiteId": "PS009",
        "evidenceIds": [
          "R2L-E020"
        ],
        "sourceRole": "official-club-ordinary-team-training"
      },
      {
        "associationId": "A112",
        "providerId": "qld-play-on:d2317868aa256f2e68dffa58",
        "venueId": "V009",
        "physicalSiteId": "PS009",
        "evidenceIds": [
          "R2L-E191",
          "R2L-E192"
        ],
        "sourceRole": "official-club-ordinary-team-training"
      }
    ],
    "records": {
      "providers": [
        ["qld-play-on:87277650ff43e143b8aa7ce9", "e124c4080ba5c3df7dd499b006efefc4a2d98834ae28765e4e06b1a4c82cf582"],
        ["qld-play-on:d2317868aa256f2e68dffa58", "2911180c4f89fd96cf10d463f80f8058f7a0fd7af35527cae7ec119b65f5020c"]
      ],
      "venues": [
        ["V009", "be06d9be228819b25118c95e871f44fd613c53f05ba3c8295b06c4480b12eb44"]
      ],
      "sites": [
        ["PS009", "cc06dcf0854c6f19e6c76eabe282ee89d693f978adc5eb0a91c23fd6ff00f618"]
      ],
      "associations": [
        ["A011", "1c7cc8d4c4a972991b75e57da7b2ba40deb84a52c124c474b8c814f2b6afb803"],
        ["A112", "6c0ab6132b9a8b26e0233395976d9597afcb183b1dbd3ff9ce1ddf486a2c860b"]
      ],
      "evidence": [
        ["E186", "72aecae730b6a3bd864a2021b9ed0fe2988e4e3a5362473a2e0a4e738dc040d6"],
        ["R2L-E020", "ac95213663f08b4d9cb00f50931a4e7bde44a508d3ee34875be2b9ce689a4da2"],
        ["R2L-E078", "feb8fe0f7a3cf08871fa232f7502c547945949c647a7aa5ecfef0fe54755b74e"],
        ["R2L-E079", "23064f116a33e15860fe9a3886ee3e2dbf17e21b27094e55572b3305ec27ac86"],
        ["R2L-E191", "a5def60b2237d7ea8389cca61ee6b19105e556f18186ca156b6cc4ec142c07ec"],
        ["R2L-E192", "e60c08103b3d9152d35465f0e14c6994ba15a918459969d5a1238b6abbccd4f8"]
      ],
      "sources": [
        ["R2L-S018", "987ccd0745a6d731942aece533780cb482e10d100bd7532c84606dffe8d7d86e"],
        ["R2L-S076", "9339f72d784850a0ba9e8d1a791879ef768a56d3109fca6e73852ecf2b558927"],
        ["R2L-S077", "abbdc3a8e1c4c57c8a5a81c8f9394ffd998767d7feebab3a551ed9b41ef35ab7"],
        ["R2L-S182", "1ae433ac9b0125c7eeb06edf966eb63045b2921703ea6d6f6e851bf293f18e3d"],
        ["R2L-S183", "0f73ad68c5545dc2c1699043697c0a3cfb3d01a2ead2958be5b18ea892726492"],
        ["S049", "52c8ea27575085fca22e4a8a4cecb480cd72f05c9224faca727b0206550bf25a"],
        ["S050", "fbe7505276f4033f6d87496f192202fc360ec994064cf32804bda25fd90a7a7a"]
      ],
      "observations": [
        ["C049", "0fe40fba7716d6ddd8cce5adf3fe0078f46bd3be73ce37ff619ab6b6c7c2ac8b"],
        ["C050", "019bedadcf8c5ed4d0e41ae780ae8437de8f500dc514342684a7ea38728fd5c5"],
        ["L-O018", "a0ac4c22031047fee5b9e5b5c6778b9805075bd8c4462a23d63244efa5b78ba4"],
        ["L-O088", "e2206fff62226acce4703cec426f1a64ed4ab79de6e5bf8ceaebae9835ccfd5c"],
        ["L-O089", "02aaaabe9f6b2452a8dbf1a207650b0003b935a00defeff688a904202a3410e1"],
        ["L-O214", "81cf4de9d0a8f02add5f63cc494a9aa37f6b39e865f93083ec5ff0a7a6ee969a"],
        ["L-O215", "380c6fed6e1edf0e91724948163258aa119fbab93a1251f011a3bae581567a11"],
        ["L-O216", "8939649d27908feae7ce3f48d83ca5762b1dea311d30b8d0051629e845e019e7"]
      ],
      "accessRecords": [
        ["R2L-ACCESS-L-O018", "7457e6e95b70b078e622131291b8f06e2700941a1bbdf703e1005ce2e8eec084"],
        ["R2L-ACCESS-L-O088", "7e5246a1b0005a10b7ad0be6cec8f99f5d83698d3a29df06b342a282edfdb213"],
        ["R2L-ACCESS-L-O089", "e9546a0ed7a246e4403e9cd93cb060248f37e82a087f5d3878f282bfeab88a1e"],
        ["R2L-ACCESS-L-O214", "b6262bfa3934f7a755f5e71e67610695a44751ffcf11ea6931763d8b7983bde8"],
        ["R2L-ACCESS-L-O215", "7abb7375432f1dbcaac4360536ca91ffcb33106ae45911e7183ed14b2d054eea"],
        ["R2L-ACCESS-L-O216", "25e8214c93c69cad072a0cd35c105ae94e5dc787976363dfeb7ae1b48176be85"]
      ]
    },
    "limitation": "E186/S050/C050 lists Eagles 109 Weedon St W/4122. S049/C049 directly embeds that image; R2L-S076/S077 and R2L-E078/E079 preserve the official publisher/link chain. BK Owls and Hornets training relationships are separately supported; no Dunkstar→Eagles eligible association is added. Research as of 2026-11-06; sources checked 2026-11-05/06, not fetched in this review. Training/team/season/access restrictions remain; PC represents property/campus, never exact hall, court, entrance or current use."
  },
  {
    "physicalSiteId": "PS066",
    "venueIds": [
      "V066"
    ],
    "providerIds": [
      "qld-play-on:ab52b8a65ff9dd3e5660aeda"
    ],
    "associationIds": [
      "A109"
    ],
    "canonicalAddress": "18 Parkway Avenue, South Ripley QLD 4306",
    "address": {
      "streetAddress": "18 Parkway Avenue",
      "suburb": "South Ripley",
      "postcode": "4306"
    },
    "evidenceId": "E205",
    "sourceIds": [
      "S111"
    ],
    "checkedOn": "2026-11-05",
    "reviewedOn": "2026-11-12",
    "sourceRole": "club-published-address",
    "addressComponents": [
      {
        "component": "street-number-and-suffix",
        "evidenceId": "E205",
        "sourceIds": [
          "S111"
        ]
      },
      {
        "component": "street-name-type-and-direction",
        "evidenceId": "E205",
        "sourceIds": [
          "S111"
        ]
      },
      {
        "component": "suburb",
        "evidenceId": "E205",
        "sourceIds": [
          "S111"
        ]
      },
      {
        "component": "postcode",
        "evidenceId": "E205",
        "sourceIds": [
          "S111"
        ]
      },
      {
        "component": "venue-campus-identity",
        "evidenceId": "E205",
        "sourceIds": [
          "S111"
        ]
      }
    ],
    "publisherSourceIds": [],
    "relationships": [
      {
        "associationId": "A109",
        "providerId": "qld-play-on:ab52b8a65ff9dd3e5660aeda",
        "venueId": "V066",
        "physicalSiteId": "PS066",
        "evidenceIds": [
          "R2L-E185",
          "R2L-E186",
          "R2L-E189"
        ],
        "sourceRole": "official-club-ordinary-team-training"
      }
    ],
    "records": {
      "providers": [
        ["qld-play-on:ab52b8a65ff9dd3e5660aeda", "c3ec631fae9fa0e020da963041730dc4b3a759299ef7abc2b5b5e34fbee6c6f8"]
      ],
      "venues": [
        ["V066", "5b2f6a3a87c4dfb7e4be4be36779a5cf0c8af2d795671a6d4341c3c08bb70532"]
      ],
      "sites": [
        ["PS066", "3e5763456d7961e59f8d3e6a2450aef7b26c3d1e4d5952dce963e8c88058ab4c"]
      ],
      "associations": [
        ["A109", "da7d9d15ba76b933eada175cf775e46b5314660721fc8fa6046244742eb4773b"]
      ],
      "evidence": [
        ["E205", "4ba28d33d6961bfb42be5da8eca18c2765636e5fbd4a79c2705552d5410eb603"],
        ["R2L-E185", "9b3131620a953aa49ca54cae57b2086fba317d275a10ff43bf11ffcc7a5f749e"],
        ["R2L-E186", "fce5a3cc57cb7bab3ae35e7812cd6c0987643167d32d0a76bbc504126709dd0d"],
        ["R2L-E189", "bdceb1a4ebda647ad5adbb5a63b9ac3ffe9dc378d405ad14990518208ab9a866"]
      ],
      "sources": [
        ["R2L-S176", "24a15c013b684b5658de11c03a0028332e8e2c077419071376fa2a72f068b876"],
        ["R2L-S177", "13a6d187f3ed8e59ed7333f24c6cc50f0806b04bd3805b72eb23e4994f73555e"],
        ["R2L-S180", "c9172e8ce3318ffe83eb714b4e3c86b06db3e75bf7a2ad729b337764159e2c8b"],
        ["S111", "ce7b3397b440aced244105141d3d2a852523521b2973ebef41205edbdbbe4556"]
      ],
      "observations": [
        ["C112", "7f37c5a0848aeda441dc235e90b7bfe5eccd748717e081118be7443ee88365bf"],
        ["L-O207", "c7c3aad25ba4e5302736566e918c739ef81336ecfafa4d6de3a76503ac85d441"],
        ["L-O208", "b02cb218146558d91029451b3317aa44a535c381fbd1991f129931f1a71cf087"],
        ["L-O212", "671a7afe95a77f5088d49594d98cadbc67dec35d710178003846e81276172f3b"]
      ],
      "accessRecords": [
        ["R2L-ACCESS-L-O207", "fd1f64374218902f9fac3b98db0020265b24fb2dce9cc46980bd151229e3bfc2"],
        ["R2L-ACCESS-L-O208", "adf894d4070364cdad8b5c1b5c578bbfcc3912621cf74b8f80e8e939bec89b9b"],
        ["R2L-ACCESS-L-O212", "0e5638ae7f686f158e0861c3d41f49b7dfdb3f9a40438a7f0a4b13474fec3311"]
      ]
    },
    "limitation": "E205/S111/C112 gives 18 Parkway Avenue/South Ripley/4306. R2L-E185 confirms club-published address, R2L-E189/S180 ties Raptordome to RVSSC and separates Amare. Research as of 2026-11-06; sources checked 2026-11-05/06, not fetched in this review. Training/team/season/access restrictions remain; PC represents property/campus, never exact hall, court, entrance or current use."
  },
  {
    "physicalSiteId": "PS070",
    "venueIds": [
      "V070"
    ],
    "providerIds": [
      "qld-play-on:6bcfc2cea0bb64c3cb5e995f"
    ],
    "associationIds": [
      "A118"
    ],
    "canonicalAddress": "312 Warrigal Road, Eight Mile Plains QLD 4113",
    "address": {
      "streetAddress": "312 Warrigal Road",
      "suburb": "Eight Mile Plains",
      "postcode": "4113"
    },
    "evidenceId": "E208",
    "sourceIds": [
      "S119"
    ],
    "checkedOn": "2026-11-05",
    "reviewedOn": "2026-11-12",
    "sourceRole": "club-published-address",
    "addressComponents": [
      {
        "component": "street-number-and-suffix",
        "evidenceId": "E208",
        "sourceIds": [
          "S119"
        ]
      },
      {
        "component": "street-name-type-and-direction",
        "evidenceId": "E208",
        "sourceIds": [
          "S119"
        ]
      },
      {
        "component": "suburb",
        "evidenceId": "E208",
        "sourceIds": [
          "S119"
        ]
      },
      {
        "component": "postcode",
        "evidenceId": "E208",
        "sourceIds": [
          "S119"
        ]
      },
      {
        "component": "venue-campus-identity",
        "evidenceId": "E208",
        "sourceIds": [
          "S119"
        ]
      }
    ],
    "publisherSourceIds": [],
    "relationships": [
      {
        "associationId": "A118",
        "providerId": "qld-play-on:6bcfc2cea0bb64c3cb5e995f",
        "venueId": "V070",
        "physicalSiteId": "PS070",
        "evidenceIds": [
          "R2L-E199",
          "R2L-E200"
        ],
        "sourceRole": "official-club-ordinary-team-training"
      }
    ],
    "records": {
      "providers": [
        ["qld-play-on:6bcfc2cea0bb64c3cb5e995f", "1286301692d5d3621a71f22137765c1dfff24031a34b3405de857b970f46bc6a"]
      ],
      "venues": [
        ["V070", "9371fddc3a86764540f4424b52ebcf645b5433e00c4d3466b942971ce30d6f44"]
      ],
      "sites": [
        ["PS070", "3a5b97373dee93515ccc77d0c1936bf7ca6410a36240a721ab3b284f9d682871"]
      ],
      "associations": [
        ["A118", "dae8784c8c933678bd1ef6bc0e1602bb9a7fa58bf980cb0bc95abb0817bc54ac"]
      ],
      "evidence": [
        ["E208", "d11608824bf81c0a9f0e67381b59ae6f96ee730243e4ceba6d808b0f1c2cb644"],
        ["R2L-E199", "0967a999167f39b13444a4a7fdccd735e688df9014a0df91c3901c03df74812c"],
        ["R2L-E200", "fca1fabcd07f6ba23134fc8f337227ab6a597c10403e4432b33aba5624638b6f"]
      ],
      "sources": [
        ["R2L-S190", "5d60876152ba7942f1bc2b7260735da89c82e9c791188f156e2c6f0dbb361d2e"],
        ["R2L-S191", "80a8cfffc3373a1c9897a53144fe1941e2b87ba31d20c4cc30650998da82f0e4"],
        ["S119", "3ee1af1af402a0aa1402ec620983724e3b496a0e54d45108055bd9fcdb0ed5c0"]
      ],
      "observations": [
        ["C120", "a44c5963db8d9d3492ad48a0317b7d0a631ead56f4b39499eff823229affb9e6"],
        ["L-O226", "bfecddf8c28c70c968bec7ff9c2ac1a8cd23af920aee58813d2bf03bae789a82"],
        ["L-O227", "541bbb54e1be73b0da83458b3eaa5d5b683741165e7b5c0e19480d48f894d9dd"]
      ],
      "accessRecords": [
        ["R2L-ACCESS-L-O226", "f76c78d3140d8d7dc583933f9b6855d108c2d3fcb880b6f9733c72a3a8427752"],
        ["R2L-ACCESS-L-O227", "6e10b261f07374cfc312356320f0b3ac4d63ceb3d716b70919b038719c679454"]
      ]
    },
    "limitation": "E208/S119/C120 gives 312 Warrigal/Eight Mile Plains/4113; A118/R2L-E200/R2L-S191 supplies ordinary teams separately from TrainingOnly rows. Research as of 2026-11-06; sources checked 2026-11-05/06, not fetched in this review. Training/team/season/access restrictions remain; PC represents property/campus, never exact hall, court, entrance or current use."
  },
  {
    "physicalSiteId": "PS071",
    "venueIds": [
      "V071"
    ],
    "providerIds": [
      "qld-play-on:6bcfc2cea0bb64c3cb5e995f",
      "qld-play-on:d2317868aa256f2e68dffa58"
    ],
    "associationIds": [
      "A113",
      "A119"
    ],
    "canonicalAddress": "590 Mains Road, Nathan QLD 4111",
    "address": {
      "streetAddress": "590 Mains Road",
      "suburb": "Nathan",
      "postcode": "4111"
    },
    "evidenceId": "E209",
    "sourceIds": [
      "S119"
    ],
    "checkedOn": "2026-11-05",
    "reviewedOn": "2026-11-12",
    "sourceRole": "club-published-address",
    "addressComponents": [
      {
        "component": "street-number-and-suffix",
        "evidenceId": "E209",
        "sourceIds": [
          "S119"
        ]
      },
      {
        "component": "street-name-type-and-direction",
        "evidenceId": "E209",
        "sourceIds": [
          "S119"
        ]
      },
      {
        "component": "suburb",
        "evidenceId": "E209",
        "sourceIds": [
          "S119"
        ]
      },
      {
        "component": "postcode",
        "evidenceId": "E209",
        "sourceIds": [
          "S119"
        ]
      },
      {
        "component": "venue-campus-identity",
        "evidenceId": "E209",
        "sourceIds": [
          "S119"
        ]
      }
    ],
    "publisherSourceIds": [],
    "relationships": [
      {
        "associationId": "A113",
        "providerId": "qld-play-on:d2317868aa256f2e68dffa58",
        "venueId": "V071",
        "physicalSiteId": "PS071",
        "evidenceIds": [
          "R2L-E191",
          "R2L-E192"
        ],
        "sourceRole": "official-club-ordinary-team-training"
      },
      {
        "associationId": "A119",
        "providerId": "qld-play-on:6bcfc2cea0bb64c3cb5e995f",
        "venueId": "V071",
        "physicalSiteId": "PS071",
        "evidenceIds": [
          "R2L-E199",
          "R2L-E200"
        ],
        "sourceRole": "official-club-ordinary-team-training"
      }
    ],
    "records": {
      "providers": [
        ["qld-play-on:6bcfc2cea0bb64c3cb5e995f", "1286301692d5d3621a71f22137765c1dfff24031a34b3405de857b970f46bc6a"],
        ["qld-play-on:d2317868aa256f2e68dffa58", "2911180c4f89fd96cf10d463f80f8058f7a0fd7af35527cae7ec119b65f5020c"]
      ],
      "venues": [
        ["V071", "16a0db0b1eedf3f2c80a40905baacef1a04bf7ab0a89449fa129280eb5015d97"]
      ],
      "sites": [
        ["PS071", "65aa3f6da308ea10fee2b862132c1f57ae394ee7830a4d7b3b7bdb3fcdc00b96"]
      ],
      "associations": [
        ["A113", "a2043b765bbbd5429dbe095044aeab9b4e9953ce6afdb3b5edf769a0de41124b"],
        ["A119", "76f6cd5adae3f380e7a47e3900c4d5d9c8b7b0981c5794850438d2f20dc7d7c8"]
      ],
      "evidence": [
        ["E209", "d57da8e1478edcd2c5f9f356120af434f5b56d9bd23f98e92a72ef40f7052d1d"],
        ["R2L-E191", "a5def60b2237d7ea8389cca61ee6b19105e556f18186ca156b6cc4ec142c07ec"],
        ["R2L-E192", "e60c08103b3d9152d35465f0e14c6994ba15a918459969d5a1238b6abbccd4f8"],
        ["R2L-E199", "0967a999167f39b13444a4a7fdccd735e688df9014a0df91c3901c03df74812c"],
        ["R2L-E200", "fca1fabcd07f6ba23134fc8f337227ab6a597c10403e4432b33aba5624638b6f"]
      ],
      "sources": [
        ["R2L-S182", "1ae433ac9b0125c7eeb06edf966eb63045b2921703ea6d6f6e851bf293f18e3d"],
        ["R2L-S183", "0f73ad68c5545dc2c1699043697c0a3cfb3d01a2ead2958be5b18ea892726492"],
        ["R2L-S190", "5d60876152ba7942f1bc2b7260735da89c82e9c791188f156e2c6f0dbb361d2e"],
        ["R2L-S191", "80a8cfffc3373a1c9897a53144fe1941e2b87ba31d20c4cc30650998da82f0e4"],
        ["S119", "3ee1af1af402a0aa1402ec620983724e3b496a0e54d45108055bd9fcdb0ed5c0"]
      ],
      "observations": [
        ["C120", "a44c5963db8d9d3492ad48a0317b7d0a631ead56f4b39499eff823229affb9e6"],
        ["L-O214", "81cf4de9d0a8f02add5f63cc494a9aa37f6b39e865f93083ec5ff0a7a6ee969a"],
        ["L-O215", "380c6fed6e1edf0e91724948163258aa119fbab93a1251f011a3bae581567a11"],
        ["L-O216", "8939649d27908feae7ce3f48d83ca5762b1dea311d30b8d0051629e845e019e7"],
        ["L-O226", "bfecddf8c28c70c968bec7ff9c2ac1a8cd23af920aee58813d2bf03bae789a82"],
        ["L-O227", "541bbb54e1be73b0da83458b3eaa5d5b683741165e7b5c0e19480d48f894d9dd"]
      ],
      "accessRecords": [
        ["R2L-ACCESS-L-O214", "b6262bfa3934f7a755f5e71e67610695a44751ffcf11ea6931763d8b7983bde8"],
        ["R2L-ACCESS-L-O215", "7abb7375432f1dbcaac4360536ca91ffcb33106ae45911e7183ed14b2d054eea"],
        ["R2L-ACCESS-L-O216", "25e8214c93c69cad072a0cd35c105ae94e5dc787976363dfeb7ae1b48176be85"],
        ["R2L-ACCESS-L-O226", "f76c78d3140d8d7dc583933f9b6855d108c2d3fcb880b6f9733c72a3a8427752"],
        ["R2L-ACCESS-L-O227", "6e10b261f07374cfc312356320f0b3ac4d63ceb3d716b70919b038719c679454"]
      ]
    },
    "limitation": "E209/S119/C120 gives 590 Mains/Nathan/4111. A113 Hornets and A119 Rockets have separate ordinary-team sources and exception dates; property point is not court/entry. Research as of 2026-11-06; sources checked 2026-11-05/06, not fetched in this review. Training/team/season/access restrictions remain; PC represents property/campus, never exact hall, court, entrance or current use."
  },
  {
    "physicalSiteId": "PS072",
    "venueIds": [
      "V072"
    ],
    "providerIds": [
      "qld-play-on:6bcfc2cea0bb64c3cb5e995f"
    ],
    "associationIds": [
      "A120"
    ],
    "canonicalAddress": "132 Hill Road, Runcorn QLD 4113",
    "address": {
      "streetAddress": "132 Hill Road",
      "suburb": "Runcorn",
      "postcode": "4113"
    },
    "evidenceId": "E210",
    "sourceIds": [
      "S119"
    ],
    "checkedOn": "2026-11-05",
    "reviewedOn": "2026-11-12",
    "sourceRole": "club-published-address",
    "addressComponents": [
      {
        "component": "street-number-and-suffix",
        "evidenceId": "E210",
        "sourceIds": [
          "S119"
        ]
      },
      {
        "component": "street-name-type-and-direction",
        "evidenceId": "E210",
        "sourceIds": [
          "S119"
        ]
      },
      {
        "component": "suburb",
        "evidenceId": "E210",
        "sourceIds": [
          "S119"
        ]
      },
      {
        "component": "postcode",
        "evidenceId": "E210",
        "sourceIds": [
          "S119"
        ]
      },
      {
        "component": "venue-campus-identity",
        "evidenceId": "E210",
        "sourceIds": [
          "S119"
        ]
      }
    ],
    "publisherSourceIds": [],
    "relationships": [
      {
        "associationId": "A120",
        "providerId": "qld-play-on:6bcfc2cea0bb64c3cb5e995f",
        "venueId": "V072",
        "physicalSiteId": "PS072",
        "evidenceIds": [
          "R2L-E199",
          "R2L-E200"
        ],
        "sourceRole": "official-club-ordinary-team-training"
      }
    ],
    "records": {
      "providers": [
        ["qld-play-on:6bcfc2cea0bb64c3cb5e995f", "1286301692d5d3621a71f22137765c1dfff24031a34b3405de857b970f46bc6a"]
      ],
      "venues": [
        ["V072", "42673f7c504a1005f18d59efd2c8ce4a446226ae1c207c666068e557723ade25"]
      ],
      "sites": [
        ["PS072", "57ef9393b4c7b1a3639bd1b11c66834b1769c566af8f882b52f1f2694ad0df7b"]
      ],
      "associations": [
        ["A120", "ff295e4d6ce9cb0febcde59a03cfd0bcbe68327e3bdb0ac407241cd04ee88661"]
      ],
      "evidence": [
        ["E210", "691158b0201d6257a1af81f731ac3ca5bd46c8a83f9614062bcc770b10745e14"],
        ["R2L-E199", "0967a999167f39b13444a4a7fdccd735e688df9014a0df91c3901c03df74812c"],
        ["R2L-E200", "fca1fabcd07f6ba23134fc8f337227ab6a597c10403e4432b33aba5624638b6f"]
      ],
      "sources": [
        ["R2L-S190", "5d60876152ba7942f1bc2b7260735da89c82e9c791188f156e2c6f0dbb361d2e"],
        ["R2L-S191", "80a8cfffc3373a1c9897a53144fe1941e2b87ba31d20c4cc30650998da82f0e4"],
        ["S119", "3ee1af1af402a0aa1402ec620983724e3b496a0e54d45108055bd9fcdb0ed5c0"]
      ],
      "observations": [
        ["C120", "a44c5963db8d9d3492ad48a0317b7d0a631ead56f4b39499eff823229affb9e6"],
        ["L-O226", "bfecddf8c28c70c968bec7ff9c2ac1a8cd23af920aee58813d2bf03bae789a82"],
        ["L-O227", "541bbb54e1be73b0da83458b3eaa5d5b683741165e7b5c0e19480d48f894d9dd"]
      ],
      "accessRecords": [
        ["R2L-ACCESS-L-O226", "f76c78d3140d8d7dc583933f9b6855d108c2d3fcb880b6f9733c72a3a8427752"],
        ["R2L-ACCESS-L-O227", "6e10b261f07374cfc312356320f0b3ac4d63ceb3d716b70919b038719c679454"]
      ]
    },
    "limitation": "E210/S119/C120 gives 132 Hill/Runcorn/4113. A120/R2L-E200/R2L-S191 confirms ordinary-team rows; cancellations are retained. Research as of 2026-11-06; sources checked 2026-11-05/06, not fetched in this review. Training/team/season/access restrictions remain; PC represents property/campus, never exact hall, court, entrance or current use."
  },
  {
    "physicalSiteId": "PS075",
    "venueIds": [
      "V075"
    ],
    "providerIds": [
      "qld-play-on:2a3c8e3f2dbe3345b423b768"
    ],
    "associationIds": [
      "A131"
    ],
    "canonicalAddress": "77 Symons Road, Sunnybank Hills QLD 4109",
    "address": {
      "streetAddress": "77 Symons Road",
      "suburb": "Sunnybank Hills",
      "postcode": "4109"
    },
    "evidenceId": "E211",
    "sourceIds": [
      "S141"
    ],
    "checkedOn": "2026-11-05",
    "reviewedOn": "2026-11-12",
    "sourceRole": "club-published-address",
    "addressComponents": [
      {
        "component": "street-number-and-suffix",
        "evidenceId": "E211",
        "sourceIds": [
          "S141"
        ]
      },
      {
        "component": "street-name-type-and-direction",
        "evidenceId": "E211",
        "sourceIds": [
          "S141"
        ]
      },
      {
        "component": "suburb",
        "evidenceId": "E211",
        "sourceIds": [
          "S141"
        ]
      },
      {
        "component": "postcode",
        "evidenceId": "E211",
        "sourceIds": [
          "S141"
        ]
      },
      {
        "component": "venue-campus-identity",
        "evidenceId": "E211",
        "sourceIds": [
          "S141"
        ]
      }
    ],
    "publisherSourceIds": [],
    "relationships": [
      {
        "associationId": "A131",
        "providerId": "qld-play-on:2a3c8e3f2dbe3345b423b768",
        "venueId": "V075",
        "physicalSiteId": "PS075",
        "evidenceIds": [
          "R2L-E235",
          "R2L-E236"
        ],
        "sourceRole": "official-club-ordinary-team-training"
      }
    ],
    "records": {
      "providers": [
        ["qld-play-on:2a3c8e3f2dbe3345b423b768", "9204b61d76bd9fe7280fab004f9bea8ef533a1fb7356e3b32bd513423e3b83b5"]
      ],
      "venues": [
        ["V075", "5bef361a921f91fdadca379c3854941d369a9e443e744372932139cdc7f38c2a"]
      ],
      "sites": [
        ["PS075", "f92b23bb496f8253bafe6836a2b24d1e97c999ec7111289a3c8573b41fb9a7f8"]
      ],
      "associations": [
        ["A131", "a9dd620d3f0582a9dac15dfff7e0ec99a0895c0d258fc2e878e1ab5713778f37"]
      ],
      "evidence": [
        ["E211", "8ab2f58383bcb3a1aa2c35c44e0e99bce1944ff823ff5f993fd3a82a2c6f0ae0"],
        ["R2L-E235", "798e0465789efc097934c979944e96093d2087b3cbed00357bb32f1bde9bab1d"],
        ["R2L-E236", "ec6e2bed534b7c9189cac81478cf7a0bf668e2219c77127d668c3f5aa606c39a"]
      ],
      "sources": [
        ["R2L-S225", "f20b04fb90adfa6ac53838ba4637f46a156f587730868629d1e7ccec077bd51a"],
        ["R2L-S226", "74910755ac12140140cca62930b89982a2ace16a80cd537ae3aec32b35335752"],
        ["S141", "d174a8b0e658b66bec876b306b6c6aaab16250d0a71ec7526879157f7b4e2e10"]
      ],
      "observations": [
        ["C142", "ded03f532d573d12e5abb515ab5c7a075620dc3eab11886ad9bbb1effa5f6947"],
        ["L-O266", "3746c4b6794ae93ecc9be37e936bf298d5856f908daa56b6ab701acc13a64119"],
        ["L-O267", "cc3d3b8db05ecc96263a6f9bc3034e1d68eefee26a63359535a34df1c0a91dbb"]
      ],
      "accessRecords": [
        ["R2L-ACCESS-L-O266", "693491aac2a36469d895bdec1d65d30ce38331e159b3379a675c441efc5163ba"],
        ["R2L-ACCESS-L-O267", "d0053d67397400cc889759bfd2dc6d1c3e0b4f0f841d2fe08939f4f25849e41d"]
      ]
    },
    "limitation": "E211/S141/C142 gives 77 Symons/Sunnybank Hills/4109; R2L-E235/R2L-S225 corroborates same address, E236 separates team training from ELITES/TrainingOnly. Research as of 2026-11-06; sources checked 2026-11-05/06, not fetched in this review. Training/team/season/access restrictions remain; PC represents property/campus, never exact hall, court, entrance or current use."
  }
])

// The reviewed association directory directly states these clubs’ training venues.
// Membership, competition and booking directory content cannot inherit this role.
export const reviewedGoverningTrainingBindings = freeze([
  {
    "associationId": "A021",
    "providerId": "qld-play-on:4cae607f5adebea8ea316581",
    "venueId": "V019",
    "physicalSiteId": "PS019",
    "sourceRole": "official-governing-association-direct-training",
    "evidenceId": "R2L-E036",
    "sourceId": "R2L-S034",
    "records": {
      "providers": [
        ["qld-play-on:4cae607f5adebea8ea316581", "f93aed07dee0b9b4ff28737d3d3412a538c6f22cfd51012886aa5391c5db659e"]
      ],
      "venues": [
        ["V019", "6ce8c9c1d3434d21337ab392e610631a352d32701ec98209412a92942ee3ca66"]
      ],
      "sites": [
        ["PS019", "29197101f8b53afd6b87107bbb53ddc0b8c923b6d61318b096cbda427989c160"]
      ],
      "associations": [
        ["A021", "1f57f278c281f40ed64f78c9ddbe9479af5e84bb7455b5228b3b67267efec1aa"]
      ],
      "evidence": [
        ["R2L-E036", "3fce0417a33607ff2fb7ad5f0aa8a6bb4dbdf7479f5a7f5f16b786c9899cc685"]
      ],
      "sources": [
        ["R2L-S034", "1741d032f4e8cee0ceb8394556980872fd9960c564ebfb65f82d86ccd3f46b3e"]
      ],
      "observations": [
        ["L-O037", "97204a1ceef46f2eec3cdcde9a0454d25d1ce08a5db803a03fb9b9848e7864c5"]
      ],
      "accessRecords": [
        ["R2L-ACCESS-L-O037", "d56d0211021763d84cf83c0f9b9e9d1dbf9a51b137e98e46a9a03559a9032130"]
      ]
    }
  },
  {
    "associationId": "A030",
    "providerId": "qld-play-on:1fc29fc13091ada8f7b0be45",
    "venueId": "V027",
    "physicalSiteId": "PS027",
    "sourceRole": "official-governing-association-direct-training",
    "evidenceId": "R2L-E036",
    "sourceId": "R2L-S034",
    "records": {
      "providers": [
        ["qld-play-on:1fc29fc13091ada8f7b0be45", "2bdf85aca62f344dc124a0a0dbe27ead74345d3d9990f0929c4ba7fcf3844437"]
      ],
      "venues": [
        ["V027", "705e4886945a26bd1e2d9996421d74b9457eb0cff3a91215b9fce697fd06c7f6"]
      ],
      "sites": [
        ["PS027", "89fa97d0a13c5aab6eb9a2acda930d20226c9dd68e5c140e955403dd69725fe0"]
      ],
      "associations": [
        ["A030", "cb7772e99c01fe72f14adacb1f1193350ef6739d2ca923f1baeba5a3f39f91be"]
      ],
      "evidence": [
        ["R2L-E036", "3fce0417a33607ff2fb7ad5f0aa8a6bb4dbdf7479f5a7f5f16b786c9899cc685"]
      ],
      "sources": [
        ["R2L-S034", "1741d032f4e8cee0ceb8394556980872fd9960c564ebfb65f82d86ccd3f46b3e"]
      ],
      "observations": [
        ["L-O037", "97204a1ceef46f2eec3cdcde9a0454d25d1ce08a5db803a03fb9b9848e7864c5"]
      ],
      "accessRecords": [
        ["R2L-ACCESS-L-O037", "d56d0211021763d84cf83c0f9b9e9d1dbf9a51b137e98e46a9a03559a9032130"]
      ]
    }
  },
  {
    "associationId": "A096",
    "providerId": "qld-play-on:49275e447ba4ebb9ba7db228",
    "venueId": "V059",
    "physicalSiteId": "PS059",
    "sourceRole": "official-governing-association-direct-training",
    "evidenceId": "R2L-E036",
    "sourceId": "R2L-S034",
    "records": {
      "providers": [
        ["qld-play-on:49275e447ba4ebb9ba7db228", "5f837ad820d552a622bbcd088022c902ac2cc62eb414f81d004d436f2be4ac82"]
      ],
      "venues": [
        ["V059", "6c130a9400cec4412d45f3de2edcd21a558c8df60f8b5e31cef2598bf9c0fcf2"]
      ],
      "sites": [
        ["PS059", "c92b858262b0e4e0168fd62dfad5ef2bb41a78f8c30847859459f9ac35af8f2b"]
      ],
      "associations": [
        ["A096", "996b3307408503876eddb78e1274b2393cb8871dd096cd87613aaa76b50c6201"]
      ],
      "evidence": [
        ["R2L-E036", "3fce0417a33607ff2fb7ad5f0aa8a6bb4dbdf7479f5a7f5f16b786c9899cc685"]
      ],
      "sources": [
        ["R2L-S034", "1741d032f4e8cee0ceb8394556980872fd9960c564ebfb65f82d86ccd3f46b3e"]
      ],
      "observations": [
        ["L-O037", "97204a1ceef46f2eec3cdcde9a0454d25d1ce08a5db803a03fb9b9848e7864c5"]
      ],
      "accessRecords": [
        ["R2L-ACCESS-L-O037", "d56d0211021763d84cf83c0f9b9e9d1dbf9a51b137e98e46a9a03559a9032130"]
      ]
    }
  },
  {
    "associationId": "A097",
    "providerId": "qld-play-on:49275e447ba4ebb9ba7db228",
    "venueId": "V060",
    "physicalSiteId": "PS060",
    "sourceRole": "official-governing-association-direct-training",
    "evidenceId": "R2L-E036",
    "sourceId": "R2L-S034",
    "records": {
      "providers": [
        ["qld-play-on:49275e447ba4ebb9ba7db228", "5f837ad820d552a622bbcd088022c902ac2cc62eb414f81d004d436f2be4ac82"]
      ],
      "venues": [
        ["V060", "4a2a7ab9ac4150ecb2bee5d8f2c8682c7d00934c6b267e55b2e616a2b769dd6c"]
      ],
      "sites": [
        ["PS060", "39c85bb89ece846ca46583dbcdd20e73b6cb2ae013f035fbd79884e7c1e0c24f"]
      ],
      "associations": [
        ["A097", "2eff6fb0983cd538cd69664e5f01bcf8b32c5aef90f58cba8ab9d6ee1bc8f634"]
      ],
      "evidence": [
        ["R2L-E036", "3fce0417a33607ff2fb7ad5f0aa8a6bb4dbdf7479f5a7f5f16b786c9899cc685"]
      ],
      "sources": [
        ["R2L-S034", "1741d032f4e8cee0ceb8394556980872fd9960c564ebfb65f82d86ccd3f46b3e"]
      ],
      "observations": [
        ["L-O037", "97204a1ceef46f2eec3cdcde9a0454d25d1ce08a5db803a03fb9b9848e7864c5"]
      ],
      "accessRecords": [
        ["R2L-ACCESS-L-O037", "d56d0211021763d84cf83c0f9b9e9d1dbf9a51b137e98e46a9a03559a9032130"]
      ]
    }
  },
  {
    "associationId": "A132",
    "providerId": "qld-play-on:07ada48dd3106366f08e58d6",
    "venueId": "V060",
    "physicalSiteId": "PS060",
    "sourceRole": "official-governing-association-direct-training",
    "evidenceId": "R2L-E036",
    "sourceId": "R2L-S034",
    "records": {
      "providers": [
        ["qld-play-on:07ada48dd3106366f08e58d6", "f1d956bcd15b1a2c4c4c23eb7f9d70c2887605a5dff075211c9317e00888ba58"]
      ],
      "venues": [
        ["V060", "4a2a7ab9ac4150ecb2bee5d8f2c8682c7d00934c6b267e55b2e616a2b769dd6c"]
      ],
      "sites": [
        ["PS060", "39c85bb89ece846ca46583dbcdd20e73b6cb2ae013f035fbd79884e7c1e0c24f"]
      ],
      "associations": [
        ["A132", "d839a06050c0414c0a65a7b4e2efa00ba6de8e971c533ee0c5dc6658407dd521"]
      ],
      "evidence": [
        ["R2L-E036", "3fce0417a33607ff2fb7ad5f0aa8a6bb4dbdf7479f5a7f5f16b786c9899cc685"]
      ],
      "sources": [
        ["R2L-S034", "1741d032f4e8cee0ceb8394556980872fd9960c564ebfb65f82d86ccd3f46b3e"]
      ],
      "observations": [
        ["L-O037", "97204a1ceef46f2eec3cdcde9a0454d25d1ce08a5db803a03fb9b9848e7864c5"]
      ],
      "accessRecords": [
        ["R2L-ACCESS-L-O037", "d56d0211021763d84cf83c0f9b9e9d1dbf9a51b137e98e46a9a03559a9032130"]
      ]
    }
  }
])
