import { useEffect } from 'react'
import type { PlayOnProvider } from './playOnProviders'
import { providerDisplayLinks } from './data/providerLinks'
import { linksForProvider, providerLinkDescriptions, providerLinkLabels } from './providerLinks'

interface ProviderListProps {
  providers: PlayOnProvider[]
  selectedProvider?: { providerId: string }
  onShowAddress: (id: string) => void
}

export default function ProviderList({ providers, selectedProvider, onShowAddress }: ProviderListProps) {
  useEffect(() => {
    if (!selectedProvider) return
    const entry = document.getElementById(selectedProvider.providerId)
    entry?.scrollIntoView({ block: 'nearest' })
    entry?.focus({ preventScroll: true })
  }, [selectedProvider])

  return (
    <ul className="provider-list" aria-label="Play On providers">
      {providers.map(provider => <li key={provider.id} id={provider.id} tabIndex={-1}
        className={selectedProvider?.providerId === provider.id ? 'provider-entry selected' : 'provider-entry'}>
        <h3>{provider.name}</h3>
        <p>{provider.address || [provider.suburb, provider.postcode].filter(Boolean).join(' ') || 'No provider address supplied'}</p>
        <p className="mapping-state">{provider.mapPoint ? 'Provider address mapped' : 'Map location not verified'}</p>
        {provider.mapPoint && <button type="button" onClick={() => onShowAddress(provider.id)}>Show provider address on map</button>}
        <div className="provider-links" aria-label={`${provider.name} organisation links`}>
          {linksForProvider(provider.id, providerDisplayLinks).map(link => <a key={link.url}
            href={link.url} target="_blank" rel="noopener noreferrer" data-link-type={link.type}
            title={`${providerLinkDescriptions[link.type]} (opens in a new tab)`}
            aria-label={`${providerLinkLabels[link.type]} for ${provider.name} (opens in a new tab)`}>
            {providerLinkLabels[link.type]}
          </a>)}
        </div>
        {provider.sourceUrl && <a href={provider.sourceUrl} target="_blank" rel="noopener noreferrer">View Play On directory search</a>}
        <small>Play On checked: {provider.sourceLastChecked.slice(0, 10)}</small>
      </li>)}
    </ul>
  )
}
