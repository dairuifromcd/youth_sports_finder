import type { ReactNode } from 'react'
import { safeSourceUrl } from './pilot'

export function SourceLink({ url, children }: { url?: string | null; children: ReactNode }) {
  const href = safeSourceUrl(url)
  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a> : null
}
