export const providerLinkLabels = {
  independent_club_website: 'Website',
  hosted_club_website: 'Website',
  institution_website: 'Website',
  association_website: 'Website',
  organisation_website: 'Website',
  hosted_organisation_website: 'Website',
  organisation_unit_page: 'Website',
  facebook_page: 'Facebook Page',
  facebook_group: 'Facebook Group',
} as const

export type ProviderLinkType = keyof typeof providerLinkLabels

export interface ProviderDisplayLink {
  readonly type: ProviderLinkType
  readonly url: string
}

export type ProviderDisplayLinks = Readonly<Record<string, readonly ProviderDisplayLink[]>>

/** These descriptions preserve the research's website ownership semantics. */
export const providerLinkDescriptions: Record<ProviderLinkType, string> = {
  independent_club_website: 'Club website',
  hosted_club_website: 'Hosted club website',
  institution_website: 'Institution website',
  association_website: 'Association website',
  organisation_website: 'Organisation website',
  hosted_organisation_website: 'Hosted organisation website',
  organisation_unit_page: 'Official organisation unit page',
  facebook_page: 'Organisation Facebook Page',
  facebook_group: 'Public organisation Facebook Group',
}

function isLinkType(value: unknown): value is ProviderLinkType {
  return typeof value === 'string' && Object.hasOwn(providerLinkLabels, value)
}

const facebookHosts = new Set(['facebook.com', 'www.facebook.com', 'm.facebook.com'])
const reservedFacebookPaths = new Set([
  'groups', 'people', 'pages', 'profile.php', 'login', 'login.php', 'logout.php',
  'l.php', 'sharer', 'sharer.php', 'share', 'dialog', 'search', 'watch', 'events',
  'marketplace', 'settings', 'help', 'home.php', 'photo.php', 'photos', 'reel', 'reels',
])

/** URL shape validates the destination type; research, not the path, establishes Page identity. */
export function safeProviderLinkUrl(value: unknown, type: unknown): string | undefined {
  if (!isLinkType(type) || typeof value !== 'string' || !/^https?:\/\//i.test(value) ||
    /[\s\\]/u.test(value) || [...value].some(character => {
      const code = character.charCodeAt(0)
      return code < 32 || code === 127
    })) return undefined
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(url.hostname)) return undefined
    const isFacebook = url.hostname === 'facebook.com' || url.hostname.endsWith('.facebook.com')
    if (type !== 'facebook_page' && type !== 'facebook_group') return isFacebook ? undefined : url.href
    if (!facebookHosts.has(url.hostname) || url.port || url.hash) return undefined
    if (type === 'facebook_group') {
      return /^\/groups\/[a-z0-9.]+\/?$/i.test(url.pathname) && !url.search &&
        !['feed', 'discover', 'joins', 'create'].includes(url.pathname.split('/')[2].toLowerCase()) ? url.href : undefined
    }
    // New-style organisation Pages can use profile.php or /people/ URLs.
    if (url.pathname === '/profile.php') {
      return /^\?id=\d+$/.test(url.search) ? url.href : undefined
    }
    if (/^\/people\/[^/]+\/\d+\/?$/.test(url.pathname)) return !url.search ? url.href : undefined
    const handle = url.pathname.replace(/^\/|\/$/g, '')
    return /^[a-z0-9.]+$/i.test(handle) && !reservedFacebookPaths.has(handle.toLowerCase()) &&
      !url.search ? url.href : undefined
  } catch {
    return undefined
  }
}

/** Exact ID lookup only; a malformed generated link is never rendered. */
export function linksForProvider(providerId: string, data: ProviderDisplayLinks): ProviderDisplayLink[] {
  if (!Object.hasOwn(data, providerId)) return []
  const seen = new Set<string>()
  return data[providerId].flatMap(link => {
    const url = safeProviderLinkUrl(link.url, link.type)
    const key = url?.replace(/\/(?=[?#]|$)/, '')
    if (!url || !key || seen.has(key)) return []
    seen.add(key)
    return [{ type: link.type, url }]
  })
}
