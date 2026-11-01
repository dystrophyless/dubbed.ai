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
  viewport: { width: 390, height: 844 },
  fixture: 'portrait-long-source.mp4; uploaded through the mock UI; expected long domain 35.960 seconds',
  evidence: {},
  browserErrors: [],
}

async function waitForPresentedFrame(page) {
  await page.waitForFunction(() => {
    const video = document.querySelector('.new-dub-preview__video')
    return video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
  }, null, { timeout: 25000 })
  const frame = await page.evaluate(async () => {
    const video = document.querySelector('.new-dub-preview__video')
    if (!video || typeof video.requestVideoFrameCallback !== 'function') return null
    video.muted = true
    await video.play()
    const presented = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No presented long-source frame.')), 8000)
      video.requestVideoFrameCallback((_now, metadata) => {
        clearTimeout(timer)
        resolve({ mediaTime: metadata.mediaTime, presentedFrames: metadata.presentedFrames })
      })
    })
    video.pause()
    return {
      ...presented,
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration,
      readyState: video.readyState,
    }
  })
  assert.ok(frame && frame.presentedFrames > 0, 'Wait for an actual decoded and presented portrait source frame.')
  return frame
}

async function timelineSnapshot(page) {
  return page.evaluate(() => {
    const box = (node) => {
      const { x, y, left, top, right, bottom, width, height } = node.getBoundingClientRect()
      return { x, y, left, top, right, bottom, width, height }
    }
    const surface = document.querySelector('[data-testid="new-dub-range-gesture"]')
    const inputs = [...document.querySelectorAll('.new-dub-range input[type="range"]')]
    const rect = surface.getBoundingClientRect()
    const max = Number(inputs[0].max)
    const centerY = rect.top + rect.height / 2
    const at = (input, yOffset = 0) => {
      const value = Number(input.value)
      const x = rect.left + 8 + value / max * (rect.width - 16)
      const target = document.elementFromPoint(x, centerY + yOffset)
      return {
        x,
        y: centerY + yOffset,
        target: target ? (typeof target.className === 'string' ? target.className : target.tagName.toLowerCase()) : null,
        isGestureSurface: target === surface,
      }
    }
    return {
      viewport: { width: innerWidth, height: innerHeight, scrollY },
      document: { width: document.documentElement.scrollWidth, horizontalOverflow: document.documentElement.scrollWidth > innerWidth },
      range: box(document.querySelector('.new-dub-range')),
      gestureSurface: { ...box(surface), disabled: surface.dataset.disabled },
      inputs: inputs.map((input) => ({
        label: input.getAttribute('aria-label'),
        min: Number(input.min),
        max: Number(input.max),
        step: Number(input.step),
        value: Number(input.value),
        valueText: input.getAttribute('aria-valuetext'),
        disabled: input.disabled,
        box: box(input),
        thumbPoint: at(input),
        verticalPlus20Point: at(input, 20),
      })),
      domainLabels: [...document.querySelectorAll('.new-dub-range__domain span')].map((node) => node.textContent.trim()),
      selectionFields: [...document.querySelectorAll('.new-dub-selection__fields input')].map((input) => ({
        label: input.getAttribute('aria-label') || input.labels?.[0]?.textContent.trim(),
        value: input.value,
      })),
      durationText: document.querySelector('#new-dub-selection-duration')?.textContent.trim(),
      validationVisible: Boolean(document.querySelector('.new-dub-selection [role="alert"]')),
    }
  })
}

async function inspectDatabase(page) {
  return page.evaluate(async () => {
    const databases = await indexedDB.databases()
    const databaseName = databases.map((item) => item.name).find((name) => name?.startsWith('dubbed.mock.v1.'))
    if (!databaseName) return { available: false, databases: databases.map((item) => item.name) }
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const names = ['projects', 'sources', 'quotes', 'operations', 'preparations', 'reservations', 'purchases']
      .filter((name) => database.objectStoreNames.contains(name))
    const transaction = database.transaction(names, 'readonly')
    const rows = Object.fromEntries(await Promise.all(names.map((name) => new Promise((resolve, reject) => {
      const request = transaction.objectStore(name).getAll()
      request.onsuccess = () => resolve([name, request.result])
      request.onerror = () => reject(request.error)
    }))))
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()
    const project = rows.projects?.[0]
    const accountId = project?.accountId
    const projectId = project?.id
    const projectRows = (name) => (rows[name] ?? []).filter((row) => row.accountId === accountId && row.projectId === projectId)
    const operations = (rows.operations ?? []).filter((row) => row.accountId === accountId)
    return {
      available: true,
      project: project ? {
        id: project.id,
        accountId,
        revision: project.revision,
        sourceId: project.sourceId,
        sourceRevision: project.sourceRevision,
        sourceDurationMs: project.sourceDurationMs,
        selection: project.selection,
      } : null,
      quoteCount: projectRows('quotes').length,
      quoteOperationCount: operations.filter((row) => row.kind === 'preparation.quote').length,
      startOperationCount: operations.filter((row) => row.kind === 'preparation.start').length,
      preparationCount: projectRows('preparations').length,
      reservationCount: projectRows('reservations').length,
      purchaseCount: (rows.purchases ?? []).filter((row) => row.accountId === accountId).length,
    }
  })
}

async function touchMove(client, from, to, steps = 8) {
  const point = (x, y) => ({ x: Math.round(x), y: Math.round(y), id: 1, radiusX: 4, radiusY: 4, force: 1 })
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(from.x, from.y)] })
  for (let step = 1; step <= steps; step += 1) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [point(from.x + (to.x - from.x) * step / steps, from.y + (to.y - from.y) * step / steps)],
    })
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function surfacePoint(page, milliseconds, yOffset = 0) {
  await page.getByTestId('new-dub-range-gesture').scrollIntoViewIfNeeded()
  return page.evaluate(({ value, offset }) => {
    const surface = document.querySelector('[data-testid="new-dub-range-gesture"]')
    const input = document.querySelector('input[aria-label="Selection start"]')
    const endInput = document.querySelector('input[aria-label="Selection end"]')
    const active = document.activeElement
    const rect = surface.getBoundingClientRect()
    const max = Number(input.max)
    return {
      x: rect.left + 8 + value / max * (rect.width - 16),
      y: rect.top + rect.height / 2 + offset,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      values: { start: Number(input.value), end: Number(endInput.value), focusedLabel: active?.getAttribute('aria-label') ?? active?.getAttribute('name') ?? active?.tagName ?? null },
    }
  }, { value: milliseconds, offset: yOffset })
}

async function drag(page, client, boundary, fromMs, toMs, yOffset = 0, expectedMs = toMs) {
  const range = page.getByRole('slider', { name: boundary === 'start' ? 'Selection start' : 'Selection end', exact: true })
  const from = await surfacePoint(page, fromMs, yOffset)
  const to = await surfacePoint(page, toMs, yOffset)
  await page.evaluate(() => { window.__qaPointerTrace.length = 0 })
  const hit = await page.evaluate(({ x, y }) => {
    const surface = document.querySelector('[data-testid="new-dub-range-gesture"]')
    const target = document.elementFromPoint(x, y)
    return {
      target: target ? (typeof target.className === 'string' ? target.className : target.tagName.toLowerCase()) : null,
      targetTag: target?.tagName ?? null,
      targetZIndex: target ? getComputedStyle(target).zIndex : null,
      activeLabel: document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.getAttribute('name') ?? document.activeElement?.tagName ?? null,
      isGestureSurface: target === surface,
    }
  }, from)
  assert.equal(hit.isGestureSurface, true, boundary + ' touch point must hit the gesture surface: ' + JSON.stringify({ from, hit }))
  await touchMove(client, from, to)
  const actualMs = Number(await range.inputValue())
  const trace = await page.evaluate(() => window.__qaPointerTrace.slice())
  report.evidence.currentDrag = { boundary, fromMs, toMs, from, to, hit, actualMs, trace }
  if (expectedMs !== toMs) {
    assert.equal(actualMs, expectedMs, boundary + ' must clamp exactly to the allowed source/selection boundary.')
  } else {
    const toleranceMs = Math.ceil(sourceDomainMs / (from.rect.width - 16)) + 1
    assert.ok(Math.abs(actualMs - expectedMs) <= toleranceMs, boundary + ' must track the requested full-source coordinate within one CSS pixel: ' + JSON.stringify({ actualMs, expectedMs, toleranceMs, from, to, hit, trace }))
  }
  return { boundary, fromMs, requestedMs: toMs, expectedMs, actualMs, yOffset, from, to, hit, trace }
}

let sourceDomainMs = 0

async function tapRail(page, client, milliseconds, yOffset = 0) {
  const point = await surfacePoint(page, milliseconds, yOffset)
  const hit = await page.evaluate(({ x, y }) => {
    const surface = document.querySelector('[data-testid="new-dub-range-gesture"]')
    const target = document.elementFromPoint(x, y)
    return { target: target ? (typeof target.className === 'string' ? target.className : target.tagName.toLowerCase()) : null, isGestureSurface: target === surface }
  }, point)
  assert.equal(hit.isGestureSurface, true, 'Rail tap must hit the gesture surface.')
  await touchMove(client, point, point, 1)
  return { requestedMs: milliseconds, point, hit }
}

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] })
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    })
    await context.addInitScript(() => {
      if (localStorage.getItem('dubbed.locale') === null) localStorage.setItem('dubbed.locale', 'en')
    })
    const page = await context.newPage()
    page.setDefaultTimeout(20000)
    page.on('pageerror', (error) => report.browserErrors.push('pageerror: ' + error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') report.browserErrors.push('console: ' + message.text())
    })

    await page.goto(base)
    await page.getByRole('button', { name: 'Start dubbing', exact: true }).click()
    await page.getByLabel('Email', { exact: true }).fill('qa81-phone-' + Date.now() + '@example.test')
    await page.getByLabel('Password', { exact: true }).fill('QA81-local-password!')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    const codeNotice = await page.getByText(/(?:Simulated code|Local mock code).*No email was sent\./i).innerText()
    const code = codeNotice.match(/\b\d{6}\b/)?.[0]
    assert.ok(code, 'Local verification code must be displayed by the mock UI.')
    await page.getByLabel('6-digit verification code').fill(code)
    await page.getByRole('heading', { name: 'New dub', exact: true }).waitFor()

    await page.getByLabel('Choose video', { exact: true }).setInputFiles(fixture)
    await page.getByRole('button', { name: 'Validate and save draft', exact: true }).click()
    await page.getByText('Saved source', { exact: true }).waitFor()
    report.evidence.presentedMediaFrame = await waitForPresentedFrame(page)
    assert.ok(report.evidence.presentedMediaFrame.width > 0)
    assert.ok(report.evidence.presentedMediaFrame.height > report.evidence.presentedMediaFrame.width)
    assert.ok(Math.abs(report.evidence.presentedMediaFrame.duration * 1000 - 35_960) < 50)

    const startRange = page.getByRole('slider', { name: 'Selection start', exact: true })
    const endRange = page.getByRole('slider', { name: 'Selection end', exact: true })
    const startField = page.getByLabel('Start (seconds)', { exact: true })
    const endField = page.getByLabel('End (seconds)', { exact: true })
    const sourceEndMs = Number(await startRange.getAttribute('max'))
    assert.ok(Math.abs(sourceEndMs - 35_960) < 50)
    sourceDomainMs = sourceEndMs
    report.evidence.sourceDurationMs = sourceEndMs
    await startField.fill('12.000')
    await startField.press('Tab')
    await expect(page.getByRole('button', { name: 'Save section', exact: true })).toHaveCount(0)
    await endField.fill('13.000')
    await endField.press('Tab')
    await expect(page.getByRole('button', { name: 'Save section', exact: true })).toHaveCount(0)
    await expect(startRange).toHaveValue('12000')
    await expect(endRange).toHaveValue('13000')
    await expect(page.getByText('Selected duration: 1.000 seconds')).toBeVisible()

    const surface = page.getByTestId('new-dub-range-gesture')
    await surface.scrollIntoViewIfNeeded()
    await page.evaluate(() => {
      const rect = document.querySelector('[data-testid="new-dub-range-gesture"]').getBoundingClientRect()
      window.scrollBy(0, rect.top + rect.height / 2 - innerHeight / 2)
    })
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => {
      window.__qaPointerTrace = []
      const surface = document.querySelector('[data-testid="new-dub-range-gesture"]')
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
        surface.addEventListener(type, (event) => window.__qaPointerTrace.push({
          type: event.type,
          clientX: event.clientX,
          clientY: event.clientY,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          isPrimary: event.isPrimary,
          button: event.button,
          target: event.target.className,
          currentTarget: event.currentTarget.className,
        }), true)
      }
    })
    report.evidence.phoneAtMinimum = await timelineSnapshot(page)
    assert.equal(report.evidence.phoneAtMinimum.gestureSurface.height, 48)
    assert.equal(report.evidence.phoneAtMinimum.gestureSurface.disabled, 'false')
    assert.equal(report.evidence.phoneAtMinimum.inputs[0].verticalPlus20Point.isGestureSurface, true)
    assert.equal(report.evidence.phoneAtMinimum.inputs[1].verticalPlus20Point.isGestureSurface, true)
    assert.deepEqual(report.evidence.phoneAtMinimum.domainLabels, ['0.000 s', (sourceEndMs / 1000).toFixed(3) + ' s'])
    assert.deepEqual(report.evidence.phoneAtMinimum.inputs.map((input) => [input.min, input.max, input.step]), [[0, sourceEndMs, 1], [0, sourceEndMs, 1]])
    await page.screenshot({ path: path.join(output, 'portrait-35.96s-phone-390x844-minimum-interval.png'), fullPage: true })

    const before = await inspectDatabase(page)
    assert.ok(before.available)
    report.evidence.databaseBeforePointerGestures = before
    const client = await context.newCDPSession(page)
    report.evidence.gestures = []

    const startThumb = await surfacePoint(page, 12_000)
    await touchMove(client, startThumb, startThumb, 1)
    await expect(startRange).toHaveValue('12000')
    await expect(endRange).toHaveValue('13000')
    await expect(page.getByRole('button', { name: 'Save section', exact: true })).toHaveCount(0)
    report.evidence.sameThumbTouch = { point: startThumb, startMs: Number(await startRange.inputValue()), endMs: Number(await endRange.inputValue()), saveSectionCount: 0 }

    let startMs = 12_000
    let endMs = 13_000
    report.evidence.gestures.push(await drag(page, client, 'start', startMs, 9_000, 20, 9_000))
    startMs = Number(await startRange.inputValue())
    assert.equal(Number(await endRange.inputValue()), endMs)

    const firstMinimumEndMs = startMs + 1_000
    report.evidence.gestures.push(await drag(page, client, 'end', endMs, startMs, 0, firstMinimumEndMs))
    endMs = Number(await endRange.inputValue())
    assert.equal(endMs - startMs, 1_000, 'The end thumb must clamp to the 1000 ms minimum from a close handle position.')

    const lowerStartTargetMs = Math.max(0, startMs - 2_000)
    report.evidence.gestures.push(await drag(page, client, 'start', startMs, lowerStartTargetMs, 0, lowerStartTargetMs))
    startMs = Number(await startRange.inputValue())
    assert.equal(Number(await endRange.inputValue()), endMs)

    const secondMinimumEndMs = startMs + 1_000
    report.evidence.gestures.push(await drag(page, client, 'end', endMs, startMs + 500, 20, secondMinimumEndMs))
    endMs = Number(await endRange.inputValue())
    assert.equal(endMs - startMs, 1_000, 'The end thumb must clamp to the 1000 ms minimum at a 20 px vertical offset.')

    report.evidence.gestures.push(await drag(page, client, 'end', endMs, startMs + 3_000, 20, startMs + 3_000))
    endMs = Number(await endRange.inputValue())
    assert.equal(Number(await startRange.inputValue()), startMs)

    const maximumStartMs = endMs - 1_000
    report.evidence.gestures.push(await drag(page, client, 'start', startMs, 20_000, 20, maximumStartMs))
    startMs = Number(await startRange.inputValue())

    const minimumEndMs = startMs + 1_000
    report.evidence.gestures.push(await drag(page, client, 'end', endMs, 8_000, 20, minimumEndMs))
    endMs = Number(await endRange.inputValue())
    assert.equal(endMs - startMs, 1_000)
    assert.equal(report.evidence.phoneAtMinimum.validationVisible, false)

    report.evidence.railTap = await tapRail(page, client, 8_000)
    const railTapStartMs = Number(await startRange.inputValue())
    const railTapToleranceMs = Math.ceil(sourceEndMs / (report.evidence.railTap.point.rect.width - 16)) + 1
    assert.ok(Math.abs(railTapStartMs - 8_000) <= railTapToleranceMs)
    endMs = Number(await endRange.inputValue())
    assert.equal(endMs, minimumEndMs)
    await expect(page.getByText('Selected duration: ' + ((endMs - railTapStartMs) / 1_000).toFixed(3) + ' seconds')).toBeVisible()
    await page.screenshot({ path: path.join(output, 'portrait-35.96s-phone-390x844-nearest-rail-tap.png'), fullPage: true })
    const after = await inspectDatabase(page)
    report.evidence.databaseAfterPointerGestures = after
    for (const key of ['quoteCount', 'quoteOperationCount', 'startOperationCount', 'preparationCount', 'reservationCount', 'purchaseCount']) {
      assert.equal(after[key], before[key], key + ' must not change from timeline gestures.')
    }
    assert.deepEqual(report.evidence.phoneAtMinimum.domainLabels, ['0.000 s', (sourceEndMs / 1000).toFixed(3) + ' s'])
    report.evidence.finalTimeline = await timelineSnapshot(page)
    report.evidence.processButtonCount = await page.getByRole('button', { name: /^Process for \d+ credits$/ }).count()
    assert.equal(report.evidence.processButtonCount, 0)
    assert.deepEqual(report.browserErrors, [])
    await client.detach()
    await context.close()
    report.browser = browser.version()
    fs.writeFileSync(path.join(output, 'phone-hit-probe-after-fix.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ capturedAtUtc: report.capturedAtUtc, browser: report.browser, evidence: Object.keys(report.evidence) }, null, 2))
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  report.error = { name: error.name, message: error.message, stack: error.stack }
  fs.writeFileSync(path.join(output, 'phone-hit-probe-after-fix.partial.json'), JSON.stringify(report, null, 2))
  console.error(error)
  process.exitCode = 1
})
