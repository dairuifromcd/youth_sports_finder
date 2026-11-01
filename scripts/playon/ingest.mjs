import { setTimeout as delay } from 'node:timers/promises'
import { mkdir, writeFile, rename, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseProviderPage, deduplicateProviders, validatePageUrl } from './parse.mjs'

export async function fetchText(url) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { 'User-Agent': 'YouthSportsFinder-PlayOn-POC/1.0' } })
  if (!response.ok) throw new Error(`Play On request failed: HTTP ${response.status}`)
  return response.text()
}

export async function ingestProviders({ url, activity, fetchPage = fetchText, pause = delay, maxPages = 10,
  checkedAt = new Date().toISOString() }) {
  let nextUrl = url
  const seen = new Set()
  const signatures = new Set()
  const records = []
  const pages = []
  const warnings = []
  while (nextUrl) {
    const current = validatePageUrl(nextUrl, url)
    current.searchParams.set('page', current.searchParams.get('page') ?? '1')
    current.searchParams.sort()
    if (seen.has(current.href)) throw new Error('Pagination loop detected')
    if (seen.size >= maxPages) throw new Error(`Pagination exceeded ${maxPages} pages; no dataset written`)
    if (seen.size) await pause(500)
    seen.add(current.href)
    const page = parseProviderPage(await fetchPage(nextUrl), { sourceUrl: nextUrl, checkedAt, activity })
    const signature = page.providers.map(record => record.id).sort().join('|')
    if (signature && signatures.has(signature)) throw new Error('Repeated result page; refusing a possible pagination loop')
    signatures.add(signature)
    records.push(...page.providers)
    pages.push({ url: nextUrl, cards: page.cardCount, accepted: page.providers.length })
    warnings.push(...page.warnings.map(warning => `Page ${pages.length}: ${warning}`))
    nextUrl = page.nextUrl
  }
  const providers = deduplicateProviders(records)
  return { providers, summary: { checkedAt, pages, totalProviders: providers.length,
    duplicatesRemoved: records.length - providers.length, warnings } }
}

export async function writeDataset(path, providers) {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${process.pid}.tmp`
  try {
    await writeFile(temporary, `${JSON.stringify(providers, null, 2)}\n`, { flag: 'wx' })
    await rename(temporary, path)
  } catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
}
