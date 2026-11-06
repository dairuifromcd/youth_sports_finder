import type { Map, Popup } from 'maplibre-gl'

interface Bounds {
  left: number
  right: number
  top: number
  bottom: number
}

/** Reserve actual control footprints, rather than assuming a fixed attribution height. */
export function popupViewport(map: Bounds, rightControl?: Bounds, bottomControls: Bounds[] = []): Bounds {
  const gap = 8
  return {
    left: map.left + gap,
    top: map.top + gap,
    right: Math.min(map.right, rightControl?.left ?? map.right) - gap,
    bottom: Math.min(map.bottom, ...bottomControls.map(control => control.top)) - gap,
  }
}

/** Camera movement is the inverse of the required on-screen popup translation. */
export function popupPanOffset(popup: Bounds, viewport: Bounds): [number, number] {
  const x = popup.left < viewport.left ? popup.left - viewport.left : Math.max(0, popup.right - viewport.right)
  const y = popup.top < viewport.top ? popup.top - viewport.top : Math.max(0, popup.bottom - viewport.bottom)
  return [Math.abs(x) > 1 ? x : 0, Math.abs(y) > 1 ? y : 0]
}

/** Keep the complete popup (including its tip) inside the usable map, on open/resize. */
export function keepProviderPopupInView(map: Map, popup: Popup, markerButton: HTMLButtonElement) {
  let observer: ResizeObserver | undefined
  let element: HTMLElement | undefined
  const returnFocus = () => markerButton.focus({ preventScroll: true })
  const dismiss = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    popup.remove()
    returnFocus()
  }
  const fit = () => {
    map.off('moveend', fit)
    if (!popup.isOpen()) return
    const container = map.getContainer()
    const rect = container.getBoundingClientRect()
    const right = container.querySelector<HTMLElement>('.maplibregl-ctrl-top-right')
    const bottom = [...container.querySelectorAll<HTMLElement>('.maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right')]
      .filter(control => control.offsetHeight > 0)
    const viewport = popupViewport(rect, right?.offsetWidth ? right.getBoundingClientRect() : undefined,
      bottom.map(control => control.getBoundingClientRect()))
    const tipHeight = element?.querySelector('.maplibregl-popup-tip')?.getBoundingClientRect().height ?? 0
    const content = element?.querySelector<HTMLElement>('.maplibregl-popup-content')
    if (!content || !element) return
    content.style.maxHeight = `${Math.max(0, viewport.bottom - viewport.top - tipHeight)}px`
    // Also causes MapLibre to remeasure after changing the content height.
    popup.setMaxWidth(`${Math.max(0, Math.min(320, viewport.right - viewport.left))}px`)
    if (map.isMoving()) {
      // A resize/control change may occur after the initial open has finished.
      // Refit at the final camera position without interrupting its animation.
      map.once('moveend', fit)
      return
    }
    const offset = popupPanOffset(element.getBoundingClientRect(), viewport)
    if (offset.some(value => value !== 0)) map.panBy(offset, { duration: 0 })
  }
  const placeAndFocus = () => {
    fit()
    const firstProvider = element?.querySelector<HTMLElement>('.provider-popup-body button')
    firstProvider?.focus({ preventScroll: true })
    firstProvider?.scrollIntoView({ block: 'nearest' })
  }
  const open = () => {
    element = popup.getElement()
    element.addEventListener('keydown', dismiss)
    element.querySelector('.maplibregl-popup-close-button')?.addEventListener('click', returnFocus, true)
    const body = element.querySelector('.provider-popup-body')
    if (body) body.scrollTop = 0
    // A list focus action may already be animating to this address. Finish it first.
    if (map.isMoving()) map.once('moveend', placeAndFocus)
    else placeAndFocus()
    observer = new ResizeObserver(fit)
    observer.observe(map.getContainer())
    map.getContainer().querySelectorAll('.maplibregl-control-container > div').forEach(control => observer?.observe(control))
  }
  const close = () => {
    observer?.disconnect()
    map.off('moveend', fit)
    map.off('moveend', placeAndFocus)
    element?.removeEventListener('keydown', dismiss)
    element?.querySelector('.maplibregl-popup-close-button')?.removeEventListener('click', returnFocus, true)
    element = undefined
  }
  popup.on('open', open)
  popup.on('close', close)
}
