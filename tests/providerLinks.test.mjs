import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  buildProviderDisplayLinks, renderProviderLinksModule, summarizeProviderLinks,
} from '../scripts/generate-provider-links.mjs'
import { providerDisplayLinks } from '../src/data/providerLinks.ts'
import {
  linksForProvider, providerLinkDescriptions, providerLinkLabels, safeProviderLinkUrl,
} from '../src/providerLinks.ts'

const researchBytes = readFileSync(new URL('../data/enrichment/provider-links-round3.json', import.meta.url))
const research = JSON.parse(researchBytes)
const validatedBytes = readFileSync(new URL('../data/benchmarks/qld-geocoder/stage-b/validated.json', import.meta.url))
const validated = JSON.parse(validatedBytes)
const display = buildProviderDisplayLinks(research, validated)
const clone = () => structuredClone(research)
const sha256 = value => createHash('sha256').update(value).digest('hex')

test('round 3 overlay preserves all 54 exact provider IDs and 95 links with the required type counts', () => {
  assert.deepEqual(summarizeProviderLinks(display), {
    providers: 54, coveredProviders: 54, links: 95, website: 43, facebookPage: 50, facebookGroup: 2,
  })
  assert.deepEqual(Object.keys(display).sort(), validated.providers.map(p => p.id).sort())
  assert.equal(research.inputs.inheritedProviderSourceSHA256, sha256(validatedBytes))
  assert.equal(research.providers.reduce((count, p) => count + p.links.length, 0), 225)
  for (const provider of research.providers) {
    const expected = provider.links.filter(link => link.confidence === 'Verified' && link.recommendPublicDisplay === true)
    assert.equal(display[provider.providerId].length, expected.length, provider.providerName)
    for (const link of display[provider.providerId]) {
      const original = expected.find(candidate => candidate.url === link.url && candidate.linkType === link.type)
      assert.ok(original, `${provider.providerName}: ${link.url}`)
      assert.equal(original.providerId, provider.providerId)
      assert.equal(original.entityRelationship, 'provider')
      assert.equal(original.purpose, 'general_organisation')
    }
  }
})

test('generated browser module is deterministic and in sync with the audit file, without full research records', () => {
  assert.deepEqual(providerDisplayLinks, display)
  const bytes = readFileSync(new URL('../src/data/providerLinks.ts', import.meta.url), 'utf8')
  assert.equal(bytes, renderProviderLinksModule(display, sha256(researchBytes)))
  assert.ok(Buffer.byteLength(bytes) < researchBytes.length / 10)
  for (const link of Object.values(providerDisplayLinks).flat()) {
    assert.deepEqual(Object.keys(link).sort(), ['type', 'url'])
  }
  const reverse = clone()
  reverse.providers.reverse()
  assert.equal(renderProviderLinksModule(buildProviderDisplayLinks(reverse, validated), sha256(researchBytes)), bytes)
})

test('top-level shortcut URLs never supply or override published links', () => {
  const changed = clone()
  for (const provider of changed.providers) {
    provider.websiteUrl = 'https://wrong.example.com/'
    provider.facebookUrl = 'https://www.facebook.com/wrong'
    provider.facebookPageUrls = ['https://www.facebook.com/wrong']
    provider.facebookGroupUrls = ['https://www.facebook.com/groups/123/']
  }
  assert.deepEqual(buildProviderDisplayLinks(changed, validated), display)
})

test('only Verified recommended public general-organisation provider links pass the selection gates', () => {
  for (const mutation of [
    link => { link.confidence = 'Probable' },
    link => { link.confidence = 'Unverified' },
    link => { link.recommendPublicDisplay = false },
    link => { link.recommendPublicDisplay = 'true' },
    link => { link.entityRelationship = 'parent_organisation' },
    link => { link.entityRelationship = 'third_party_profile' },
    link => { link.purpose = 'existing_members' },
    link => { link.purpose = 'alumni' },
    link => { link.purpose = 'uniform_exchange' },
    link => { link.purpose = 'team_or_community' },
    link => { link.requiresManualReview = true },
    link => { link.actualAccess.status = 'restricted' },
    link => { link.actualAccess.status = 'failed' },
    link => { link.actualAccess.contentScope = 'private_member_posts' },
  ]) {
    const changed = clone()
    const provider = changed.providers[0]
    const excludedUrl = provider.links[0].url
    mutation(provider.links[0])
    assert.equal(buildProviderDisplayLinks(changed, validated)[provider.providerId].some(link => link.url === excludedUrl), false)
  }
  for (const type of ['facebook_profile', 'third_party_profile', 'parent_organisation_website', 'inactive_hosted_website']) {
    const changed = clone()
    changed.providers[0].links[0].linkType = type
    assert.throws(() => buildProviderDisplayLinks(changed, validated), /Unsafe or type-mismatched/)
  }
})

test('missing, duplicate and unknown provider IDs fail; matching names never substitute for exact IDs', () => {
  for (const mutate of [
    data => { data.providers.pop() },
    data => { data.providers.push(data.providers[0]) },
    data => { data.providers[0].providerId = data.providers[1].providerId },
    data => { data.providers[0].providerId = 'qld-play-on:unknown' },
    data => { data.providers[0].providerName += ' changed' },
    data => { data.providers[0].suburb = 'wrong suburb' },
  ]) {
    const changed = clone()
    mutate(changed)
    assert.throws(() => buildProviderDisplayLinks(changed, validated), /identity mismatch|Missing enrichment/)
  }
  assert.throws(() => buildProviderDisplayLinks(research, { providers: [...validated.providers, validated.providers[0]] }), /duplicate original/)
  for (const bad of [null, {}, { ...research, schemaVersion: 2 }, { ...research, providers: null }]) {
    assert.throws(() => buildProviderDisplayLinks(bad, validated), /schema/)
  }
})

test('a candidate cannot be attached to a different provider, name or candidate-ID namespace', () => {
  for (const mutate of [
    link => { link.providerId = research.providers[1].providerId },
    link => { link.providerName = research.providers[1].providerName },
    link => { link.candidateId = research.providers[1].links[0].candidateId },
  ]) {
    const changed = clone()
    mutate(changed.providers[0].links[0])
    assert.throws(() => buildProviderDisplayLinks(changed, validated), /Link identity mismatch/)
  }
})

test('duplicates are collapsed within one provider; conflicting types or cross-provider ownership fail', () => {
  const changed = clone()
  const provider = changed.providers[1] // Algester Page + Group
  const duplicate = { ...provider.links[0], candidateId: `${provider.providerId}:r3:duplicate`, url: provider.links[0].url + '/' }
  provider.links.push(duplicate)
  assert.deepEqual(buildProviderDisplayLinks(changed, validated), display)

  const conflict = clone()
  const website = conflict.providers[0].links[0]
  conflict.providers[0].links.push({ ...website, candidateId: `${website.providerId}:r3:duplicate`, linkType: 'association_website' })
  assert.throws(() => buildProviderDisplayLinks(conflict, validated), /Conflicting duplicate URL type/)

  const crossProvider = clone()
  Object.assign(crossProvider.providers[1].links[0], {
    url: crossProvider.providers[0].links[0].url,
    linkType: crossProvider.providers[0].links[0].linkType,
  })
  assert.throws(() => buildProviderDisplayLinks(crossProvider, validated), /URL assigned to multiple providers/)
})

test('URL validation rejects unsafe, malformed, misleading and wrong-type destinations', () => {
  for (const url of [undefined, null, '', 'not a URL', '//example.org/', 'https:example.org',
    'javascript:alert(1)', 'data:text/html,test', 'ftp://example.org/', 'https://user:pass@example.org/',
    'https://example.org/a\nb', 'https://example.org\\evil', 'https://-bad.example.org/', 'https://example.org /']) {
    assert.equal(safeProviderLinkUrl(url, 'institution_website'), undefined, String(url))
  }
  for (const url of ['https://facebook.com.evil.org/Club', 'https://evilfacebook.com/Club',
    'https://www.facebook.com/groups/123/', 'https://www.facebook.com/login',
    'https://www.facebook.com/l.php?u=https://evil.org', 'https://www.facebook.com/Club?redirect=elsewhere',
    'https://www.facebook.com/profile.php?id=123&next=elsewhere', 'https://www.facebook.com/profile.php?id=wrong',
    'https://www.facebook.com/people/Name/', 'https://www.facebook.com/Club#login']) {
    assert.equal(safeProviderLinkUrl(url, 'facebook_page'), undefined, url)
  }
  for (const url of ['https://www.facebook.com/Club', 'https://example.org/groups/123/',
    'https://www.facebook.com/groups/123/posts/1/', 'https://www.facebook.com/groups/feed/',
    'https://www.facebook.com/groups/123/?next=elsewhere']) {
    assert.equal(safeProviderLinkUrl(url, 'facebook_group'), undefined, url)
  }
  assert.equal(safeProviderLinkUrl('https://www.facebook.com/Club', 'independent_club_website'), undefined)
  assert.equal(safeProviderLinkUrl('https://example.org/', 'unknown_type'), undefined)
  const changed = clone()
  changed.providers[0].links[0].url = 'javascript:alert(1)'
  assert.throws(() => buildProviderDisplayLinks(changed, validated), /Unsafe or type-mismatched/)
})

test('organisation Pages using profile.php and people paths retain their research classification', () => {
  for (const url of ['https://www.facebook.com/Club/', 'https://www.facebook.com/profile.php?id=100063494111693',
    'https://www.facebook.com/people/Rochedale-Wildcats-Basketball-Club-Inc/100075580674744/']) {
    assert.equal(safeProviderLinkUrl(url, 'facebook_page'), url)
  }
  assert.equal(safeProviderLinkUrl('https://www.facebook.com/groups/7367579813/', 'facebook_group'), 'https://www.facebook.com/groups/7367579813/')
  assert.equal(safeProviderLinkUrl('http://example.org/organisation', 'organisation_website'), 'http://example.org/organisation')
})

test('Algester has Page and public Group; website subtypes and seven baseline clubs retain their semantics', () => {
  const algester = research.providers.find(p => p.providerName.startsWith('Algester Hawks'))
  assert.deepEqual(display[algester.providerId].map(link => providerLinkLabels[link.type]), ['Facebook Page', 'Facebook Group'])
  for (const name of ['Algester Hawks', 'Cannons Southside', 'Runcorn Rockets', 'Dunk Star',
    'River City Hornets', 'Rochedale Wildcats', 'Sunnybank Hills Hurricanes']) {
    const provider = research.providers.find(p => p.providerName.includes(name))
    assert.ok(display[provider.providerId].length > 0, name)
  }
  const school = research.providers.find(p => p.providerName === 'St Philomena School')
  assert.deepEqual(display[school.providerId].map(link => link.type), ['institution_website'])
  assert.equal(providerLinkLabels.institution_website, 'Website')
  assert.equal(providerLinkDescriptions.institution_website, 'Institution website')
  const unit = research.providers.find(p => p.providerName === 'Boys Brigade - 50th Brisbane')
  assert.equal(display[unit.providerId][0].type, 'organisation_unit_page')
})

test('runtime exact-ID lookup refuses malformed links and duplicate entries without name or inherited-property fallback', () => {
  const provider = research.providers[0]
  assert.deepEqual(linksForProvider(provider.providerId, display), display[provider.providerId])
  assert.deepEqual(linksForProvider(provider.providerName, display), [])
  assert.deepEqual(linksForProvider('toString', display), [])
  const first = display[provider.providerId][0]
  const data = { [provider.providerId]: [first, first, { type: 'facebook_page', url: first.url }, { type: 'institution_website', url: 'javascript:alert(1)' }] }
  assert.deepEqual(linksForProvider(provider.providerId, data), [first])
})
