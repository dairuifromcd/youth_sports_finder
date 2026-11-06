/* global document, window */
// Evaluated by the existing Playwright CLI's run-code --filename command.
// The factory keeps this a callable expression without introducing a test dependency.
(() => async page => {
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  // Browser-only instrumentation; no application test globals or new browser package.
  await page.route('**/src/ClubMap.tsx*', async route => {
    const response = await route.fetch()
    const body = (await response.text())
      .replace('mapRef.current = map;', 'window.__task007Map = map; window.__task007MapsCreated = (window.__task007MapsCreated || 0) + 1; mapRef.current = map;')
    await route.fulfill({ response, body })
  })
  await page.route(/overpass|nominatim|geocode\.information|qld_locality/, async route => {
    await page.evaluate(url => { window.__discoveryAttempts = [...(window.__discoveryAttempts || []), url] }, route.request().url())
    await route.abort()
  })
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_, error) => error({ code: 1 }) } }))
  await page.reload()
  await page.waitForFunction(() => window.__task007Map && document.querySelectorAll('.club-marker').length === 19)
  await page.waitForFunction(() => window.__task007Map.isStyleLoaded(), null, { timeout: 30000 })
  await page.evaluate(() => { window.__initialMap = window.__task007Map; window.__initialCanvas = document.querySelector('canvas'); window.__initialCreates = window.__task007MapsCreated })
  const settle = () => page.waitForFunction(() => !window.__task007Map.isMoving(), null, { timeout: 5000 })
  const results = []
  const measure = () => page.evaluate(() => {
    const popup = document.querySelector('.provider-popup')
    const body = popup.querySelector('.provider-popup-body')
    const rect = el => {
      const r = el.getBoundingClientRect()
      return Object.fromEntries(['top', 'bottom', 'left', 'right', 'height', 'width'].map(key => [key, Math.round(r[key] * 100) / 100]))
    }
    const lastButton = popup.querySelector('li:last-child button')
    const b = lastButton.getBoundingClientRect()
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
    return {
      map: rect(document.querySelector('.map')), popup: rect(popup), body: rect(body),
      lastButton: rect(lastButton), meaning: rect(popup.querySelector('p')),
      pilot: rect(document.querySelector('.pilot-area-button')),
      attribution: rect(document.querySelector('.maplibregl-ctrl-bottom-right')),
      navigation: rect(document.querySelector('.maplibregl-ctrl-top-right')),
      scrollTop: body.scrollTop, scrollHeight: body.scrollHeight, clientHeight: body.clientHeight,
      lastButtonHit: hit === lastButton || lastButton.contains(hit),
      focusInPopup: popup.contains(document.activeElement), focused: document.activeElement?.textContent,
    }
  })
  const inside = (inner, outer) => inner.left >= outer.left - 1 && inner.right <= outer.right + 1 &&
    inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  for (const [width, height] of [[1470, 672], [1440, 1000], [390, 844], [390, 568], [1470, 480]]) {
    await page.setViewportSize({ width, height })
    await page.getByRole('searchbox').fill('Booval')
    await page.getByRole('button', { name: 'Show provider address on map', exact: true }).first().click()
    await settle()
    await page.waitForFunction(() => document.querySelector('.provider-popup-body button') === document.activeElement)
    const initial = await measure()
    assert(initial.focusInPopup, `${width}x${height}: focus enters popup`)
    await page.locator('.provider-popup-body').evaluate(body => { body.scrollTop = body.scrollHeight })
    let measured = await measure()
    assert(inside(measured.popup, measured.map), `${width}x${height}: entire popup within map`)
    assert(inside(measured.lastButton, measured.body) && inside(measured.lastButton, measured.map), `${width}x${height}: last button fully visible at maximum scroll`)
    assert(measured.lastButtonHit, `${width}x${height}: last button is actually hit-testable`)
    for (const control of [measured.pilot, measured.attribution, measured.navigation]) assert(!overlaps(measured.popup, control), `${width}x${height}: no control obstructs popup`)
    const screenshot = `output/playwright/task007-uat-after-${width}x${height}-Booval-last.png`
    await page.screenshot({ path: screenshot })
    const names = await page.locator('.provider-popup li button').allTextContents()
    assert(names.length === 7, 'seven separate Booval providers')
    for (const name of names) {
      await page.locator('.map-surface').scrollIntoViewIfNeeded()
      const button = page.locator('.provider-popup').getByRole('button', { name, exact: true })
      await button.scrollIntoViewIfNeeded()
      await button.click()
      assert(await page.locator('.provider-entry.selected h3').innerText() === name, `${name}: selects distinct record`)
      assert(await page.locator('.provider-entry.selected').evaluate(entry => document.activeElement === entry), `${name}: actual focus enters list record`)
    }
    let keyboard
    if (width === 1440) {
      await page.locator('.map-surface').scrollIntoViewIfNeeded()
      await page.getByRole('button', { name: 'Close popup', exact: true }).click()
      assert(await page.locator('.club-marker').evaluate(marker => marker === document.activeElement), 'close returns focus to marker')
      const selectedBefore = await page.locator('.provider-entry.selected').getAttribute('id')
      await page.keyboard.press('Enter')
      await settle()
      const enter = await measure()
      assert(enter.focusInPopup && enter.focused === names[0], 'Enter puts actual focus on first provider')
      await page.screenshot({ path: 'output/playwright/task007-uat-after-1440x1000-keyboard.png' })
      await page.keyboard.press('Escape')
      assert(await page.locator('.provider-popup').count() === 0, 'Escape dismisses popup')
      assert(await page.locator('.club-marker').evaluate(marker => marker === document.activeElement), 'Escape restores marker focus')
      await page.keyboard.press('Space')
      await settle()
      const space = await measure()
      assert(space.focusInPopup && space.focused === names[0], 'Space puts actual focus on first provider')
      assert(await page.locator('.provider-entry.selected').getAttribute('id') === selectedBefore, 'activation key does not also select a list provider')
      keyboard = { enterFocus: enter.focused, spaceFocus: space.focused, focusInPopup: true, escapeRestoresMarker: true, closeRestoresMarker: true }
    }
    results.push({ width, height, query: 'Booval', ...measured, keyboard, screenshot, individuallySelected: names })
    await page.getByRole('searchbox').fill('Runcorn Rockets')
    await page.getByRole('button', { name: 'Show provider address on map', exact: true }).click()
    await settle()
    await page.locator('.provider-popup-body').evaluate(body => { body.scrollTop = 0 })
    measured = await measure()
    assert(inside(measured.popup, measured.map), `${width}x${height}: Runcorn popup inside map`)
    assert(!overlaps(measured.popup, measured.pilot) && !overlaps(measured.popup, measured.attribution), 'single popup not covered by reset or attribution')
    if (height >= 672) {
      assert(inside(measured.meaning, measured.body), 'Runcorn explanation visible')
      assert(await page.locator('.provider-popup-body').evaluate(body => {
        const bounds = body.getBoundingClientRect()
        return [...body.querySelectorAll('h2, p, button')].every(el => {
          const rect = el.getBoundingClientRect()
          return rect.top >= bounds.top && rect.bottom <= bounds.bottom
        })
      }), 'all single-provider text and actions visible together (excluding scroll padding)')
    } else {
      await page.locator('.provider-popup-body').evaluate(body => { body.scrollTop = body.scrollHeight })
      measured = await measure()
      assert(inside(measured.lastButton, measured.body) && measured.lastButtonHit, 'single-provider action reachable within short popup scroll region')
    }
    const singleScreenshot = `output/playwright/task007-uat-after-${width}x${height}-Runcorn.png`
    await page.screenshot({ path: singleScreenshot })
    results.push({ width, height, query: 'Runcorn Rockets', ...measured, screenshot: singleScreenshot })
  }
  assert(await page.evaluate(() => window.__initialMap === window.__task007Map && window.__initialCanvas === document.querySelector('canvas') && window.__task007MapsCreated === window.__initialCreates), 'no map remount across popup, keyboard and resize interactions')
  assert(await page.evaluate(() => !(window.__discoveryAttempts || []).length), 'no discovery/geocoding attempts')
  return { status: 'PASS', results }
})()
