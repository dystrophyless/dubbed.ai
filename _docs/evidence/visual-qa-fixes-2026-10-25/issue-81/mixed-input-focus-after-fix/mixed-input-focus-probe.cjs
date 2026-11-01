const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium, expect } = require('D:/Program/python/Dubbed/frontend/node_modules/@playwright/test')

const base = 'http://127.0.0.1:4581'
const fixture = 'D:/Program/python/Dubbed/frontend/public/media/portrait-long-source.mp4'
const output = __dirname
const report = {
  capturedAtUtc: new Date().toISOString(),
  base,
  browser: null,
  viewport: { width: 390, height: 844 },
  fixture: 'portrait-long-source.mp4; uploaded through mock UI; keyboard and pointer checks use a long source',
  evidence: {},
  browserErrors: [],
}

async function presentedFrame(page) {
  return page.locator('video').evaluate((video) => new Promise((resolve) => {
    const finish = () => resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration, readyState: video.readyState })
    if (video.readyState >= 2 && video.videoWidth > 0 && typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(() => finish())
      return
    }
    video.addEventListener('loadeddata', () => video.requestVideoFrameCallback(() => finish()), { once: true })
  }))
}

async function rangePoint(page, boundary, milliseconds) {
  await page.getByTestId('new-dub-range-gesture').scrollIntoViewIfNeeded()
  return page.evaluate(({ name, value }) => {
    const surface = document.querySelector('[data-testid="new-dub-range-gesture"]')
    const range = document.querySelector(`input[aria-label="${name}"]`)
    const rect = surface.getBoundingClientRect()
    const max = Number(range.max)
    return { x: rect.left + 8 + value / max * (rect.width - 16), y: rect.top + rect.height / 2, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } }
  }, { name: boundary === 'start' ? 'Selection start' : 'Selection end', value: milliseconds })
}

async function focusAndHitSnapshot(page) {
  return page.evaluate(() => {
    const surface = document.querySelector('[data-testid="new-dub-range-gesture"]')
    const start = document.querySelector('input[aria-label="Selection start"]')
    const end = document.querySelector('input[aria-label="Selection end"]')
    const rect = surface.getBoundingClientRect()
    const max = Number(start.max)
    const point = (value) => ({ x: rect.left + 8 + value / max * (rect.width - 16), y: rect.top + rect.height / 2 })
    const startPoint = point(Number(start.value))
    const endPoint = point(Number(end.value))
    const hitAt = ({ x, y }) => {
      const target = document.elementFromPoint(x, y)
      return { isGestureSurface: target === surface, targetClass: target?.className ?? target?.tagName ?? null }
    }
    const active = document.activeElement
    return {
      surface: { width: rect.width, height: rect.height, zIndex: getComputedStyle(surface).zIndex },
      values: { start: Number(start.value), end: Number(end.value), max: Number(start.max), step: Number(start.step) },
      focused: { label: active?.getAttribute('aria-label') ?? null, isStart: active === start, isEnd: active === end, focusVisible: active?.matches(':focus-visible') ?? false, zIndex: active instanceof HTMLElement ? getComputedStyle(active).zIndex : null },
      overlappingHandleCenters: { start: { point: startPoint, ...hitAt(startPoint) }, end: { point: endPoint, ...hitAt(endPoint) } },
    }
  })
}

async function drag(page, boundary, fromMs, toMs) {
  const from = await rangePoint(page, boundary, fromMs)
  const to = await rangePoint(page, boundary, toMs)
  const hit = await page.evaluate(({ x, y }) => {
    const surface = document.querySelector('[data-testid="new-dub-range-gesture"]')
    const target = document.elementFromPoint(x, y)
    return { isGestureSurface: target === surface, targetClass: target?.className ?? target?.tagName ?? null }
  }, from)
  assert.equal(hit.isGestureSurface, true, `${boundary} pointer-down must hit the gesture surface while the native range is focus-visible: ${JSON.stringify({ from, hit })}`)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 8 })
  await page.mouse.up()
  const range = page.getByRole('slider', { name: boundary === 'start' ? 'Selection start' : 'Selection end', exact: true })
  const actualMs = Number(await range.inputValue())
  const toleranceMs = Math.ceil(Number(await range.getAttribute('max')) / (from.rect.width - 16)) + 1
  assert.ok(Math.abs(actualMs - toMs) <= toleranceMs, `${boundary} must follow the full-source pointer coordinate within one CSS pixel; actual=${actualMs}, requested=${toMs}, tolerance=${toleranceMs}`)
  await expect(range).toBeFocused()
  return { boundary, fromMs, requestedMs: toMs, actualMs, toleranceMs, from, to, hit, focusedAfterPointer: await focusAndHitSnapshot(page) }
}

async function roundTripFromOffCenterGrip(page, boundary, valueMs) {
  const range = page.getByRole('slider', { name: boundary === 'start' ? 'Selection start' : 'Selection end', exact: true })
  const center = await rangePoint(page, boundary, valueMs)
  const grip = { ...center, x: center.x + 4 }
  const away = { ...center, x: center.x - 8 }
  const hit = await page.evaluate(({ x, y }) => {
    const surface = document.querySelector('[data-testid="new-dub-range-gesture"]')
    return { isGestureSurface: document.elementFromPoint(x, y) === surface }
  }, grip)
  assert.equal(hit.isGestureSurface, true)
  await page.mouse.move(grip.x, grip.y)
  await page.mouse.down()
  await page.mouse.move(away.x, away.y, { steps: 3 })
  const awayMs = Number(await range.inputValue())
  assert.notEqual(awayMs, valueMs, 'Moving 12 px away from a 4 px off-center grip must change the range value.')
  await page.mouse.move(grip.x, grip.y, { steps: 3 })
  const returnedMs = Number(await range.inputValue())
  await page.mouse.up()
  assert.equal(returnedMs, valueMs, 'Returning to the initial pointer x must restore the original millisecond value.')
  await expect(range).toHaveValue(String(valueMs))
  await expect(range).toBeFocused()
  return { boundary, valueMs, gripOffsetPx: 4, awayDeltaPx: -12, awayMs, returnedMs, hit, focusedAfterReturn: await focusAndHitSnapshot(page) }
}

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] })
  try {
    const context = await browser.newContext({ viewport: report.viewport, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
    await context.addInitScript(() => {
      if (localStorage.getItem('dubbed.locale') === null) localStorage.setItem('dubbed.locale', 'en')
    })
    const page = await context.newPage()
    page.setDefaultTimeout(20_000)
    page.on('pageerror', (error) => report.browserErrors.push('pageerror: ' + error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') report.browserErrors.push('console: ' + message.text())
    })

    await page.goto(base)
    await page.getByRole('button', { name: 'Start dubbing', exact: true }).click()
    await page.getByLabel('Email', { exact: true }).fill('qa81-focus-' + Date.now() + '@example.test')
    await page.getByLabel('Password', { exact: true }).fill('QA81-local-password!')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    const notice = await page.getByText(/(?:Simulated code|Local mock code).*No email was sent\./i).innerText()
    const code = notice.match(/\b\d{6}\b/)?.[0]
    assert.ok(code)
    await page.getByLabel('6-digit verification code').fill(code)
    await page.getByRole('heading', { name: 'New dub', exact: true }).waitFor()

    await page.getByLabel('Choose video', { exact: true }).setInputFiles(fixture)
    await page.getByRole('button', { name: 'Validate and save draft', exact: true }).click()
    await page.getByText('Saved source', { exact: true }).waitFor()
    report.evidence.presentedMediaFrame = await presentedFrame(page)
    assert.ok(report.evidence.presentedMediaFrame.width > 0)
    assert.ok(report.evidence.presentedMediaFrame.height > report.evidence.presentedMediaFrame.width)
    assert.ok(Math.abs(report.evidence.presentedMediaFrame.duration * 1_000 - 35_960) < 50)

    const start = page.getByRole('slider', { name: 'Selection start', exact: true })
    const end = page.getByRole('slider', { name: 'Selection end', exact: true })
    const startField = page.getByLabel('Start (seconds)', { exact: true })
    const endField = page.getByLabel('End (seconds)', { exact: true })
    const sourceEndMs = Number(await start.getAttribute('max'))
    report.evidence.sourceDomain = { min: 0, max: sourceEndMs, step: Number(await start.getAttribute('step')) }
    await startField.fill('12.000')
    await startField.press('Tab')
    await endField.fill('13.000')
    await endField.press('Tab')
    await expect(start).toHaveValue('12000')
    await expect(end).toHaveValue('13000')
    await expect(page.getByTestId('new-dub-range-gesture')).toHaveAttribute('data-disabled', 'false')

    await page.getByTestId('new-dub-range-gesture').scrollIntoViewIfNeeded()
    await start.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(start).toHaveValue('11999')
    report.evidence.keyboardFocusedBeforePointer = await focusAndHitSnapshot(page)
    assert.equal(report.evidence.keyboardFocusedBeforePointer.focused.isStart, true)
    assert.equal(report.evidence.keyboardFocusedBeforePointer.focused.focusVisible, true)
    assert.equal(report.evidence.keyboardFocusedBeforePointer.focused.zIndex, '4')
    assert.equal(report.evidence.keyboardFocusedBeforePointer.surface.zIndex, '5')
    assert.equal(report.evidence.keyboardFocusedBeforePointer.overlappingHandleCenters.start.isGestureSurface, true)
    assert.equal(report.evidence.keyboardFocusedBeforePointer.overlappingHandleCenters.end.isGestureSurface, true)

    const startBeforePointer = Number(await start.inputValue())
    report.evidence.offCenterPointerRoundTrip = await roundTripFromOffCenterGrip(page, 'start', startBeforePointer)
    report.evidence.startPointerThenKeyboard = await drag(page, 'start', startBeforePointer, 9_000)
    assert.equal(report.evidence.startPointerThenKeyboard.focusedAfterPointer.focused.isStart, true)
    const startAfterPointer = Number(await start.inputValue())
    await page.keyboard.press('ArrowLeft')
    const startAfterArrow = Number(await start.inputValue())
    assert.equal(startAfterArrow, startAfterPointer - 1, 'The focused native start range must continue by exactly one millisecond after pointer drag.')
    report.evidence.startPointerThenKeyboard.keyboard = { beforeMs: startAfterPointer, key: 'ArrowLeft', afterMs: startAfterArrow }

    await end.focus()
    await page.keyboard.press('ArrowRight')
    const endAfterFocusArrow = Number(await end.inputValue())
    assert.equal(endAfterFocusArrow, 13_001)
    report.evidence.endPointerThenKeyboard = await drag(page, 'end', endAfterFocusArrow, 16_000)
    assert.equal(report.evidence.endPointerThenKeyboard.focusedAfterPointer.focused.isEnd, true)
    const endAfterPointer = Number(await end.inputValue())
    await page.keyboard.press('ArrowRight')
    const endAfterArrow = Number(await end.inputValue())
    assert.equal(endAfterArrow, endAfterPointer + 1, 'The focused native end range must continue by exactly one millisecond after pointer drag.')
    report.evidence.endPointerThenKeyboard.keyboard = { beforeMs: endAfterPointer, key: 'ArrowRight', afterMs: endAfterArrow }

    report.evidence.processButtonCount = await page.getByRole('button', { name: /^Process for \d+ credits$/ }).count()
    assert.equal(report.evidence.processButtonCount, 0)
    assert.deepEqual(report.browserErrors, [])
    report.evidence.finalState = await focusAndHitSnapshot(page)
    await page.screenshot({ path: path.join(output, 'portrait-35.96s-phone-390x844-keyboard-pointer-focus-final.png'), fullPage: true })
    report.browser = browser.version()
    await context.close()
    fs.writeFileSync(path.join(output, 'mixed-input-focus-probe-final.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ capturedAtUtc: report.capturedAtUtc, browser: report.browser, evidence: Object.keys(report.evidence) }, null, 2))
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  report.error = { name: error.name, message: error.message, stack: error.stack }
  fs.writeFileSync(path.join(output, 'mixed-input-focus-probe-final.partial.json'), JSON.stringify(report, null, 2))
  console.error(error)
  process.exitCode = 1
})
