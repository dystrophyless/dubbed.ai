const { chromium, expect } = require('D:/Program/python/Dubbed/frontend/node_modules/@playwright/test')
const fs = require('node:fs')
const path = require('node:path')

const base = 'http://127.0.0.1:4581'
const evidence = path.join(__dirname, 'evidence')
const metrics = []
const log = []
fs.mkdirSync(evidence, { recursive: true })

async function capture(page, name, fullPage = false, waitForFrame = false) {
  const mediaFrame = waitForFrame ? await waitForMedia(page) : null
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage })
  const data = await page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null
      const { x, y, width, height } = element.getBoundingClientRect()
      return { x, y, width, height }
    }
    const video = document.querySelector('.new-dub-preview__video')
    const ranges = [...document.querySelectorAll('.new-dub-range input[type="range"]')]
    const range = document.querySelector('.new-dub-range')
    const selected = document.querySelector('.new-dub-range__selected')
    const quoteFacts = document.querySelector('.new-dub-quote__facts')
    const process = [...document.querySelectorAll('.new-dub-quote button')]
      .find((button) => /^(?:Process for \d+ credits|Обработать за \d+ кредитов)$/.test(button.textContent.trim()))
    return {
      url: location.href,
      locale: localStorage.getItem('dubbed.locale'),
      documentLanguage: document.documentElement.lang,
      viewport: { width: innerWidth, height: innerHeight },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, scrollY },
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      headings: [...document.querySelectorAll('h1,h2')].map((node) => node.textContent.trim()),
      preview: video ? {
        rect: rect(video),
        readyState: video.readyState,
        duration: video.duration,
        background: getComputedStyle(video).backgroundColor,
      } : null,
      range: range ? {
        rect: rect(range),
        selectedRect: rect(selected),
        selectedStart: getComputedStyle(range).getPropertyValue('--selection-start').trim(),
        selectedWidth: getComputedStyle(range).getPropertyValue('--selection-width').trim(),
        handles: ranges.map((input) => ({
          label: input.getAttribute('aria-label'),
          min: input.min,
          max: input.max,
          step: input.step,
          value: input.value,
          valueText: input.getAttribute('aria-valuetext'),
          rect: rect(input),
        })),
      } : null,
      selectionFields: [...document.querySelectorAll('.new-dub-selection__fields input')].map((input) => ({
        label: input.getAttribute('aria-label') || input.labels?.[0]?.textContent.trim(),
        value: input.value,
        height: rect(input).height,
      })),
      quote: quoteFacts ? {
        rect: rect(quoteFacts),
        columns: getComputedStyle(quoteFacts).gridTemplateColumns,
        facts: [...quoteFacts.querySelectorAll('dt,dd')].map((node) => node.textContent.trim()),
      } : null,
      process: process ? { label: process.textContent.trim(), rect: rect(process), disabled: process.disabled } : null,
      alerts: [...document.querySelectorAll('[role="alert"]')].map((node) => node.innerText.trim()),
      selectionSavedInstructionVisible: document.body.innerText.includes('Section saved. Request a fresh quote before processing.')
        || document.body.innerText.includes('Фрагмент сохранён. Перед обработкой запросите новую точную стоимость.'),
    }
  })
  metrics.push({ name, fullPage, mediaFrame, ...data })
  log.push(`CAPTURE ${name}`)
}

async function waitForMedia(page) {
  await page.waitForFunction(() => Boolean(document.querySelector('.new-dub-preview__video')), null, { timeout: 20_000 })
  const playbackError = await page.evaluate(async () => {
    const video = document.querySelector('.new-dub-preview__video')
    if (!video) return 'The preview video element is not present.'
    video.muted = true
    video.preload = 'auto'
    try {
      await video.play()
      return null
    } catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  })
  if (playbackError) throw new Error(`The muted preview could not start for frame verification: ${playbackError}`)
  try {
    await page.waitForFunction(() => {
      const video = document.querySelector('.new-dub-preview__video')
      const start = document.querySelector('input[aria-label="Selection start"], input[aria-label="Начало фрагмента"]')
      return video?.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && start && !start.disabled
    }, null, { timeout: 20_000 })
  } catch (error) {
    const state = await page.evaluate(() => {
      const video = document.querySelector('.new-dub-preview__video')
      const start = document.querySelector('input[aria-label="Selection start"]')
      return {
        url: location.href,
        video: video ? {
          currentSrc: video.currentSrc,
          readyState: video.readyState,
          networkState: video.networkState,
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          paused: video.paused,
          error: video.error ? { code: video.error.code, message: video.error.message } : null,
        } : null,
        startDisabled: start?.disabled ?? null,
        pageText: document.querySelector('main')?.innerText.slice(0, 1_200) ?? '',
      }
    })
    throw new Error(`${error instanceof Error ? error.message : String(error)} media state=${JSON.stringify(state)}`)
  }
  const frame = await page.evaluate(async () => {
    const video = document.querySelector('.new-dub-preview__video')
    if (!video || typeof video.requestVideoFrameCallback !== 'function') {
      throw new Error('The preview cannot confirm a presented video frame.')
    }
    video.muted = true
    const targetTime = Math.min(0.25, Math.max(0, video.duration / 2))
    if (Math.abs(video.currentTime - targetTime) > 0.01) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timed out seeking the preview before frame capture.')), 5_000)
        video.addEventListener('seeked', () => {
          clearTimeout(timeout)
          resolve()
        }, { once: true })
        video.currentTime = targetTime
      })
    }
    await video.play()
    const presented = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for a presented preview frame.')), 8_000)
      video.requestVideoFrameCallback((_now, metadata) => {
        clearTimeout(timeout)
        resolve({ mediaTime: metadata.mediaTime, presentedFrames: metadata.presentedFrames })
      })
    })
    video.pause()
    await new Promise((resolve) => requestAnimationFrame(() => resolve()))
    return { ...presented, width: video.videoWidth, height: video.videoHeight, readyState: video.readyState }
  })
  expect(frame.presentedFrames).toBeGreaterThan(0)
  expect(frame.width).toBeGreaterThan(0)
  expect(frame.height).toBeGreaterThan(0)
  return frame
}

async function inspectMockDatabase(page) {
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
    const accountRows = (name) => (rows[name] ?? []).filter((row) => row.accountId === accountId)
    const projectRows = (name) => (rows[name] ?? []).filter((row) => row.accountId === accountId && row.projectId === projectId)
    const operations = accountRows('operations')
    return {
      available: true,
      databaseName,
      accountId,
      projectId,
      project: project ? {
        revision: project.revision,
        sourceId: project.sourceId,
        sourceRevision: project.sourceRevision,
        sourceDurationMs: project.sourceDurationMs,
        selection: project.selection,
        title: project.title,
        state: project.state,
      } : null,
      source: (rows.sources ?? []).find((row) => row.projectId === projectId && row.accountId === accountId)
        ? (() => {
            const source = (rows.sources ?? []).find((row) => row.projectId === projectId && row.accountId === accountId)
            return { id: source.id, revision: source.revision, durationMs: source.facts?.durationMs, fileName: source.facts?.fileName }
          })()
        : null,
      projectQuoteCount: projectRows('quotes').length,
      quoteOperationCount: operations.filter((row) => row.kind === 'preparation.quote').length,
      startOperationCount: operations.filter((row) => row.kind === 'preparation.start').length,
      preparationCount: projectRows('preparations').length,
      reservationCount: projectRows('reservations').length,
      purchaseCount: accountRows('purchases').length,
    }
  })
}

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  await context.addInitScript(() => {
    if (localStorage.getItem('dubbed.locale') === null) localStorage.setItem('dubbed.locale', 'en')
    window.__creditsReturnIntentWrites = []
    const nativeSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.endsWith('.credits-return-intent')) {
        try { window.__creditsReturnIntentWrites.push(JSON.parse(value)) } catch { window.__creditsReturnIntentWrites.push(value) }
      }
      return nativeSetItem.call(this, key, value)
    }
  })
  const page = await context.newPage()
  page.setDefaultTimeout(20_000)
  page.on('pageerror', (error) => log.push(`PAGEERROR ${error.message}`))
  page.on('console', (message) => { if (message.type() === 'error') log.push(`CONSOLE ${message.text()}`) })

  await page.goto(base)
  await page.getByRole('button', { name: 'Start dubbing', exact: true }).click()
  await page.getByLabel('Email', { exact: true }).fill(`qa81-${Date.now()}@example.test`)
  await page.getByLabel('Password', { exact: true }).fill('QA81-local-password!')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  const notice = page.getByText(/(?:Simulated code|Local mock code).*No email was sent\./i)
  const code = (await notice.innerText()).match(/\b\d{6}\b/)[0]
  await page.getByLabel('6-digit verification code').fill(code)
  await page.getByRole('heading', { name: 'New dub', exact: true }).waitFor()

  await page.getByLabel('Choose video', { exact: true }).setInputFiles('D:/Program/python/Dubbed/frontend/public/media/short-source.mp4')
  await expect(page.getByRole('alert').last()).toContainText(/shorter than 1 second/i)
  await capture(page, '01-short-source-rejected-en')

  await page.getByLabel('Choose video', { exact: true }).setInputFiles('D:/Program/python/Dubbed/frontend/public/media/source-dialogue.mp4')
  await page.getByRole('button', { name: 'Validate and save draft', exact: true }).click()
  await waitForMedia(page)

  const startRange = page.getByRole('slider', { name: 'Selection start', exact: true })
  const endRange = page.getByRole('slider', { name: 'Selection end', exact: true })
  const startField = page.getByLabel('Start (seconds)', { exact: true })
  const endField = page.getByLabel('End (seconds)', { exact: true })
  const startMaximum = Number(await startRange.getAttribute('max'))
  expect(startMaximum).toBeGreaterThan(1_000)
  expect(await startRange.getAttribute('min')).toBe('0')
  expect(await endRange.getAttribute('min')).toBe('0')
  expect(await endRange.getAttribute('max')).toBe(String(startMaximum))

  await startRange.focus()
  await startRange.press('ArrowRight')
  await expect(startRange).toHaveValue('1')
  await expect(startField).toHaveValue('0.001')
  await expect(endField).toHaveValue('8.625')
  await endRange.focus()
  await endRange.press('ArrowLeft')
  await expect(endRange).toHaveValue(String(startMaximum - 1))
  await expect(endField).toHaveValue('8.624')
  await page.getByRole('button', { name: 'Save section', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save section', exact: true })).toHaveCount(0)

  const endBox = await endRange.boundingBox()
  const endAtMaxX = endBox.x + 8 + ((startMaximum - 1) / startMaximum) * (endBox.width - 16)
  const pointerTargetX = endBox.x + 8 + 0.70 * (endBox.width - 16)
  const pointerY = endBox.y + endBox.height / 2
  await page.mouse.move(endAtMaxX, pointerY)
  await page.mouse.down()
  await page.mouse.move(pointerTargetX, pointerY, { steps: 8 })
  await page.mouse.up()
  await expect.poll(async () => Number(await endRange.inputValue())).toBeLessThan(startMaximum - 1_000)
  const pointerEndMs = Number(await endRange.inputValue())
  await expect(endField).toHaveValue(`${(pointerEndMs / 1_000).toFixed(3)}`)
  await expect(startField).toHaveValue('0.001')
  await page.getByRole('button', { name: 'Save section', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save section', exact: true })).toHaveCount(0)

  await startField.fill('1.000')
  await startField.press('Tab')
  await expect(startField).toHaveValue('1.000')
  await expect(page.getByRole('button', { name: 'Save section', exact: true })).toHaveCount(0)
  const timeline = page.locator('.new-dub-range')
  const stableStartCoordinate = await timeline.evaluate((element) => getComputedStyle(element).getPropertyValue('--selection-start').trim())
  await endRange.focus()
  const endBeforeKeyboard = Number(await endRange.inputValue())
  await endRange.press('ArrowLeft')
  await expect(endRange).toHaveValue(String(endBeforeKeyboard - 1))
  await expect(startField).toHaveValue('1.000')
  expect(await timeline.evaluate((element) => getComputedStyle(element).getPropertyValue('--selection-start').trim())).toBe(stableStartCoordinate)
  await page.getByRole('button', { name: 'Save section', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save section', exact: true })).toHaveCount(0)

  const selectedInterval = {
    sourceDurationMs: startMaximum,
    startMs: Math.round(Number(await startField.inputValue()) * 1_000),
    endMs: Math.round(Number(await endField.inputValue()) * 1_000),
    sourceDomainForBothHandles: true,
    keyboardStartMs: 1,
    keyboardEndMs: startMaximum - 1,
    pointerEndMs,
    stableStartCoordinateWhenEndMoved: stableStartCoordinate,
  }
  metrics.push({ name: 'native-timeline-interval-proof', ...selectedInterval })

  await page.getByRole('button', { name: 'Get exact quote', exact: true }).click()
  const processButton = page.getByRole('button', { name: /^Process for \d+ credits$/ })
  await expect(processButton).toBeEnabled()
  await page.evaluate(() => scrollTo(0, 0))
  await capture(page, '02-en-desktop-1440x900-current-quote', false, true)
  await page.setViewportSize({ width: 1440, height: 700 })
  await page.evaluate(() => scrollTo(0, 0))
  await capture(page, '03-en-short-desktop-1440x700-current-quote', false, true)

  for (const [width, height, suffix] of [[767, 844, '767'], [768, 844, '768'], [390, 844, 'phone-390']]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => scrollTo(0, 0))
    await capture(page, `04-en-breakpoint-${suffix}-current-quote`, width === 390, true)
  }
  await page.setViewportSize({ width: 1440, height: 900 })

  const beforeReturn = await inspectMockDatabase(page)
  metrics.push({ name: 'mock-database-before-credits-return', ...beforeReturn })
  await page.getByRole('link', { name: 'Credits', exact: true }).click()
  await page.getByRole('heading', { name: 'Credits', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Start mock checkout', exact: true }).first().click()
  await page.getByRole('button', { name: 'Simulate verified payment', exact: true }).waitFor()
  await capture(page, '06-en-credits-checkout-pending-before-verify')
  await page.getByRole('button', { name: 'Simulate verified payment', exact: true }).click()
  await page.getByRole('heading', { name: 'New dub', exact: true }).waitFor()
  await expect(page.getByText('Saved source', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Process for \d+ credits$/ })).toBeEnabled({ timeout: 20_000 })
  const returnProof = await page.evaluate(() => ({
    writes: window.__creditsReturnIntentWrites,
    markerKeysRemaining: Object.keys(sessionStorage).filter((key) => key.endsWith('.credits-return-intent')),
    path: location.pathname,
  }))
  const afterReturn = await inspectMockDatabase(page)
  expect(returnProof.writes).toHaveLength(1)
  expect(returnProof.markerKeysRemaining).toHaveLength(0)
  expect(returnProof.writes[0].intent).toBe('refresh-credit-quote')
  expect(returnProof.writes[0].accountId).toBe(afterReturn.accountId)
  expect(returnProof.writes[0].projectId).toBe(afterReturn.projectId)
  expect(returnProof.writes[0].sourceId).toBe(afterReturn.project.sourceId)
  expect(returnProof.writes[0].sourceRevision).toBe(afterReturn.project.sourceRevision)
  expect(returnProof.writes[0].selection).toEqual(afterReturn.project.selection)
  expect(afterReturn.projectQuoteCount).toBe(beforeReturn.projectQuoteCount + 1)
  expect(afterReturn.quoteOperationCount).toBe(beforeReturn.quoteOperationCount + 1)
  expect(afterReturn.startOperationCount).toBe(beforeReturn.startOperationCount)
  expect(afterReturn.preparationCount).toBe(beforeReturn.preparationCount)
  expect(afterReturn.reservationCount).toBe(beforeReturn.reservationCount)
  expect(afterReturn.purchaseCount).toBe(beforeReturn.purchaseCount + 1)
  expect(await page.getByRole('heading', { name: 'New dub', exact: true }).count()).toBe(1)
  metrics.push({ name: 'native-ui-credits-return-quote-once-no-auto-process', returnProof, before: beforeReturn, after: afterReturn })
  await page.evaluate(() => scrollTo(0, 0))
  await capture(page, '07-en-native-verified-purchase-return-current-quote', false, true)

  const returnedStart = await startField.inputValue()
  const returnedEnd = await endField.inputValue()
  const returnedQuoteCount = afterReturn.projectQuoteCount
  const savedTitle = await page.locator('.new-dub-saved-source__details h2').innerText()
  const capacityText = await page.locator('.new-dub-capacity').innerText()
  await page.locator('input[type="file"][aria-label="Replace video"]').setInputFiles('D:/Program/python/Dubbed/frontend/public/media/short-source.mp4')
  await expect(page.getByRole('alert').last()).toContainText(/shorter than 1 second/i)
  await expect(startField).toHaveValue(returnedStart)
  await expect(endField).toHaveValue(returnedEnd)
  await expect(page.locator('.new-dub-saved-source__details h2')).toHaveText(savedTitle)
  await expect.poll(async () => page.locator('.new-dub-capacity').innerText()).toBe(capacityText)
  await expect(page.locator('.new-dub-quote__facts')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Process for \d+ credits$/ })).toBeEnabled()
  const replacementFailure = await inspectMockDatabase(page)
  expect(replacementFailure.projectQuoteCount).toBe(returnedQuoteCount)
  expect(replacementFailure.project.sourceId).toBe(afterReturn.project.sourceId)
  metrics.push({ name: 'failed-replacement-preserves-source-selection-title-quote-and-capacity', start: returnedStart, end: returnedEnd, title: savedTitle, capacity: capacityText, quoteCount: replacementFailure.projectQuoteCount, sourceId: replacementFailure.project.sourceId })
  await capture(page, '08-en-failed-short-replacement-preserves-current-quote', false, true)

  await page.goto(`${base}/e2e/harness/workspace-state-visual.html?screen=newdub&scenario=default&locale=ru`)
  await page.getByRole('heading', { name: 'Новый дубляж', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Запросить точную стоимость', exact: true }).click()
  await expect(page.locator('.new-dub-quote__facts')).toBeVisible()
  for (const [width, height, suffix] of [[1440, 900, '1440x900'], [1440, 700, '1440x700'], [390, 844, 'phone-390']]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => scrollTo(0, 0))
    await capture(page, `05-ru-${suffix}-current-quote`, width === 390, true)
  }

  await page.goto(`${base}/e2e/harness/workspace-state-visual.html?screen=newdub&scenario=newdub-quote-error&locale=en`)
  await page.getByRole('heading', { name: 'New dub', exact: true }).waitFor()
  const errorStart = await page.getByLabel('Start (seconds)', { exact: true }).inputValue()
  const errorEnd = await page.getByLabel('End (seconds)', { exact: true }).inputValue()
  await page.getByRole('button', { name: 'Get exact quote', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('Start (seconds)', { exact: true })).toHaveValue(errorStart)
  await expect(page.getByLabel('End (seconds)', { exact: true })).toHaveValue(errorEnd)
  await expect(page.getByRole('button', { name: 'Get exact quote', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: /^Process for \d+ credits$/ })).toHaveCount(0)
  await capture(page, '09-en-synthetic-quote-failure-preserves-source-selection', true)

  await page.goto(`${base}/e2e/harness/workspace-state-visual.html?screen=newdub&scenario=newdub-preview-retry&locale=en`)
  await page.getByRole('heading', { name: 'New dub', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Check compatible-preview availability', exact: true }).click()
  await page.getByRole('button', { name: 'Prepare compatible preview', exact: true }).click()
  await page.getByRole('button', { name: 'Retry preview', exact: true }).waitFor()
  await capture(page, '10-en-synthetic-preview-failure-retains-saved-source', true)

  const report = {
    date: new Date().toISOString(),
    browser: browser.version(),
    base,
    userAgent: await page.evaluate(() => navigator.userAgent),
    evidence: metrics,
    screenshots: metrics.filter((item) => item.name && item.viewport).map((item) => `${item.name}.png`),
  }
  fs.writeFileSync(path.join(__dirname, 'browser-metrics.json'), JSON.stringify(report, null, 2))
  fs.writeFileSync(path.join(__dirname, 'browser-proof.log'), log.join('\n'))
  await browser.close()
})().catch((error) => {
  log.push(`ERROR ${error.stack}`)
  fs.writeFileSync(path.join(__dirname, 'browser-metrics.partial.json'), JSON.stringify({ date: new Date().toISOString(), base, evidence: metrics }, null, 2))
  fs.writeFileSync(path.join(__dirname, 'browser-proof.log'), log.join('\n'))
  console.error(error)
  process.exit(1)
})
