import { createHash } from 'node:crypto'
import { parse } from 'node-html-parser'

export const directoryUrl = 'https://www.qld.gov.au/recreation/sports/funding/playon/find-provider'
export const localityUrl = 'https://www.qld.gov.au/__data/assets/file/0019/135343/qld_locality.json'
const clean = value => value.normalize('NFKC').replace(/\s+/g, ' ').trim()
const identity = value => clean(value).toLowerCase().replace(/[\p{P}\p{S}]/gu, '').replace(/\s+/g, ' ').trim()

// Only discovery fields are read. Never serialize/log a card or its raw HTML.
function field(card, label) {
  const dt = card.querySelectorAll('dl dt').find(node => clean(node.text).toLowerCase().replace(/:$/, '') === label)
  return dt?.nextElementSibling?.tagName === 'DD' ? dt.nextElementSibling : undefined
}

function discoveryText(value) {
  const result = clean(value)
  // Defensive rejection if a source accidentally places contact details in a discovery field.
  if (/@|(?:mailto|tel):|(?:\+61|\(?0[23478]\)?)(?:[\s()-]*\d){8,9}\b/i.test(result)) return undefined
  return result || undefined
}

export function providerId(name, address = '') {
  const key = JSON.stringify([identity(name), identity(address)])
  return `qld-play-on:${createHash('sha256').update(key).digest('hex').slice(0, 24)}`
}

export function validatePageUrl(value, initialUrl) {
  const url = new URL(value, initialUrl)
  const initial = new URL(initialUrl)
  if (url.origin !== new URL(directoryUrl).origin || url.pathname !== new URL(directoryUrl).pathname || url.hash || url.username || url.password) {
    throw new Error('Pagination left the Play On directory')
  }
  for (const key of new Set([...initial.searchParams.keys(), ...url.searchParams.keys()])) {
    if (key !== 'page' && JSON.stringify(url.searchParams.getAll(key)) !== JSON.stringify(initial.searchParams.getAll(key))) {
      throw new Error('Pagination changed the search scope')
    }
  }
  const page = url.searchParams.get('page') ?? '1'
  if (!/^[1-9]\d*$/.test(page) || url.searchParams.getAll('page').length > 1) throw new Error('Invalid pagination page')
  return url
}

export function parseProviderPage(html, { sourceUrl, checkedAt, activity }) {
  const root = parse(html)
  const results = root.querySelector('#qg-search-results')
  if (!results) throw new Error('Play On result container not found; directory markup may have changed')
  const cards = results.querySelectorAll('.card')
  const warnings = []
  const providers = []
  for (const [index, card] of cards.entries()) {
    const name = discoveryText(card.querySelector('h3.card-title')?.text ?? '')
    const activities = [...new Set((field(card, 'activities')?.querySelectorAll('li') ?? [])
      .map(node => discoveryText(node.text)).filter(Boolean))]
    if (!name || !activities.length) {
      warnings.push(`Card ${index + 1}: missing or unsafe name/activities; skipped`)
      continue
    }
    if (!activities.some(value => value.toLowerCase() === activity.toLowerCase())) {
      throw new Error('Play On returned a provider outside the requested activity; refusing an unfiltered dataset')
    }
    const lines = (field(card, 'address')?.structuredText ?? '').split('\n').map(clean).filter(Boolean)
    const address = discoveryText(lines.join(', '))
    const locality = address ? lines.at(-1)?.match(/^(.+?)\s+(?:Queensland|QLD)\s+(\d{4})$/i) : undefined
    providers.push({
      id: providerId(name, address), name, activities,
      ...(address ? { address } : {}),
      ...(locality ? { suburb: locality[1], postcode: locality[2] } : {}),
      source: 'qld-play-on', sourceUrl, sourceLastChecked: checkedAt,
    })
  }
  if (cards.length && !providers.length) throw new Error('No provider cards could be parsed; refusing to write an empty dataset')
  if (!cards.length && !/^No organisations found\b/i.test(clean(root.querySelector('.qg-pagination-count')?.text ?? ''))) {
    throw new Error('Unrecognized empty-result markup; refusing to assume there are no providers')
  }
  const currentPage = Number(new URL(sourceUrl).searchParams.get('page') ?? 1)
  const pagination = results.querySelector('.pagination')
  const next = pagination?.querySelector('.next a[href]')
  let nextUrl = null
  if (next) {
    const url = validatePageUrl(next.getAttribute('href'), sourceUrl)
    if (Number(url.searchParams.get('page')) !== currentPage + 1) throw new Error('Pagination loop or non-sequential next page')
    if (!cards.length) throw new Error('Empty results unexpectedly link to another page')
    nextUrl = url.href
  } else if (pagination?.querySelectorAll('a[href]').some(link => Number(new URL(link.getAttribute('href'), sourceUrl).searchParams.get('page')) > currentPage)) {
    throw new Error('Pagination has later pages but no recognized Next link')
  }
  return { providers, warnings, nextUrl, cardCount: cards.length }
}

export function deduplicateProviders(providers) {
  const unique = new Map()
  for (const provider of providers) {
    const previous = unique.get(provider.id)
    if (previous) {
      previous.activities = [...new Set([...previous.activities, ...provider.activities])].sort()
    } else {
      unique.set(provider.id, { ...provider, activities: [...provider.activities].sort() })
    }
  }
  return [...unique.values()]
}

export function resolveLocality(data, postcode, locality) {
  if (!Array.isArray(data)) throw new Error('Unrecognized Play On locality lookup')
  const matches = data.filter(row => Array.isArray(row?.pcode) && row.pcode.includes(postcode)
    && typeof row.name === 'string' && (!locality || row.name.toLowerCase() === locality.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
  const match = matches[0]
  if (!match || !Number.isFinite(Number(match.la)) || !Number.isFinite(Number(match.lo)) || !match.la || !match.lo) {
    throw new Error('Postcode/locality not found in the official lookup')
  }
  return { name: match.name, latitude: String(match.la), longitude: String(match.lo) }
}

export function buildSearchUrl({ activity, postcode, radius, locality }) {
  if (!activity?.trim() || !/^\d{4}$/.test(postcode) || ![10, 25, 50, 100, 250, 1000].includes(radius)) {
    throw new Error('A nonempty activity, four-digit postcode and supported radius are required')
  }
  const url = new URL(directoryUrl)
  url.search = new URLSearchParams({ name: '', activity: activity.trim(), locality: locality.name,
    location: postcode, latitude: locality.latitude, longitude: locality.longitude, distance: String(radius) })
  return url.href
}
