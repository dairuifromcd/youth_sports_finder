import assert from 'node:assert/strict'
import { test } from 'node:test'
import { keepProviderPopupInView, popupPanOffset, popupViewport } from '../src/providerPopup.ts'

test('popup viewport reserves measured navigation and attribution footprints with consistent spacing', () => {
  const map = { left: 0, top: 172, right: 1090, bottom: 672 }
  const right = { left: 1041, top: 172, right: 1090, bottom: 280 }
  const bottom = { left: 600, top: 642, right: 1090, bottom: 672 }
  assert.deepEqual(popupViewport(map, right, [bottom]), { left: 8, top: 180, right: 1033, bottom: 634 })
  assert.deepEqual(popupViewport(map), { left: 8, top: 180, right: 1082, bottom: 664 })
})

test('short/narrow maps use actual expanded attribution height instead of a fixed popup cap', () => {
  const map = { left: 0, top: 0, right: 375, bottom: 285 }
  const nav = { left: 336, right: 375, top: 0, bottom: 98 }
  const attribution = { left: 0, right: 375, top: 225, bottom: 285 }
  const viewport = popupViewport(map, nav, [attribution])
  assert.equal(viewport.right - viewport.left, 320)
  assert.equal(viewport.bottom - viewport.top, 209)
  const tallerAttribution = { ...attribution, top: 205 }
  assert.equal(popupViewport(map, nav, [tallerAttribution]).bottom, 197)
})

test('camera offset brings each popup edge into usable bounds, without nudging already fitted popups', () => {
  const viewport = { left: 8, right: 320, top: 8, bottom: 280 }
  assert.deepEqual(popupPanOffset({ left: 20, right: 300, top: 20, bottom: 260 }, viewport), [0, 0])
  assert.deepEqual(popupPanOffset({ left: -10, right: 270, top: -22, bottom: 218 }, viewport), [-18, -30])
  assert.deepEqual(popupPanOffset({ left: 60, right: 340, top: 100, bottom: 340 }, viewport), [20, 60])
  assert.deepEqual(popupPanOffset({ left: 8, right: 320, top: 8, bottom: 280 }, viewport), [0, 0])
  assert.deepEqual(popupPanOffset({ left: 7.5, right: 319.5, top: 8, bottom: 280.5 }, viewport), [0, 0])
})

function popupFixture(t, popupBottom) {
  const moveEndListeners = new Set()
  const mapBounds = { left: 0, right: 400, top: 0, bottom: 400 }
  const popupBounds = { left: 20, right: 300, top: 20, bottom: popupBottom }
  const content = { style: {} }
  const element = {
    getBoundingClientRect: () => popupBounds,
    querySelector: selector => selector === '.maplibregl-popup-content' ? content : null,
    addEventListener() {},
    removeEventListener() {},
  }
  const container = {
    getBoundingClientRect: () => mapBounds,
    querySelector: () => null,
    querySelectorAll: () => [],
  }
  const popupListeners = new Map()
  const popup = {
    isOpen: () => opened,
    getElement: () => element,
    setMaxWidth() {},
    on: (event, callback) => popupListeners.set(event, callback),
  }
  let opened = true
  let moving = false
  let resize
  const originalObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = class {
    constructor(callback) { resize = callback }
    observe() {}
    disconnect() {}
  }
  t.after(() => {
    if (originalObserver === undefined) delete globalThis.ResizeObserver
    else globalThis.ResizeObserver = originalObserver
  })
  const pans = []
  const map = {
    getContainer: () => container,
    isMoving: () => moving,
    once: (_, callback) => moveEndListeners.add(callback),
    off: (_, callback) => moveEndListeners.delete(callback),
    panBy: offset => {
      pans.push(offset)
      popupBounds.left -= offset[0]
      popupBounds.right -= offset[0]
      popupBounds.top -= offset[1]
      popupBounds.bottom -= offset[1]
    },
  }
  keepProviderPopupInView(map, popup, { focus() {} })
  popupListeners.get('open')()
  return {
    pans, popupBounds,
    resizeDuringMove() { moving = true; mapBounds.bottom = 250; resize() },
    finishMove() {
      moving = false
      for (const listener of [...moveEndListeners]) {
        moveEndListeners.delete(listener)
        listener()
      }
    },
    close() { opened = false; popupListeners.get('close')() },
  }
}

for (const [kind, bottom] of [['shared', 360], ['single', 300]]) {
  test(`${kind} popup finishes fitting after a resize during an existing camera movement`, t => {
    const fixture = popupFixture(t, bottom)
    fixture.resizeDuringMove()
    assert.equal(fixture.pans.length, 0, 'do not interrupt the active camera movement')
    fixture.finishMove()
    assert.equal(fixture.pans.length, 1, 'the deferred fit must run when movement finishes')
    assert.equal(fixture.popupBounds.bottom, 242, 'the entire popup clears the smaller map bottom')
    fixture.close()
  })
}

test('closing a popup cancels its pending resize fit', t => {
  const fixture = popupFixture(t, 360)
  fixture.resizeDuringMove()
  fixture.close()
  fixture.finishMove()
  assert.equal(fixture.pans.length, 0)
})
