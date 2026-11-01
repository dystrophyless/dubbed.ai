const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/playwright')
const fs = require('node:fs')

const out = __dirname
const base = 'http://127.0.0.1:4565'
const video = 'D:/Program/python/Dubbed/frontend/public/media/source-dialogue.mp4'
const metrics = []
const trace = []

async function capture(page, name, fullPage = true) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => scrollTo(0, 0))
  const facts = await page.evaluate(() => {
    const rect = (element) => {
      const box = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        text: element.innerText?.trim() ?? element.textContent?.trim(),
        width: box.width,
        height: box.height,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        fontFamily: style.fontFamily,
        gap: style.gap,
      }
    }
    return {
      url: location.href,
      language: document.documentElement.lang,
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      visibleButtons: [...document.querySelectorAll('main button')]
        .filter((button) => button.getClientRects().length)
        .map(rect),
      historyRows: [...document.querySelectorAll('.credits-history__row')].map(rect),
      historyLabels: [...document.querySelectorAll('.credits-history__values dt')].map(rect),
      pageText: document.querySelector('main')?.innerText ?? document.body.innerText,
    }
  })
  await page.screenshot({ path: `${out}/${name}.png`, fullPage })
  metrics.push({ name, ...facts })
  fs.writeFileSync(`${out}/metrics.json`, JSON.stringify(metrics, null, 2))
}

async function seedShortage(page) {
  return page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('dubbed.mock.v1.default')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = database.transaction('creditStates', 'readwrite')
    const store = transaction.objectStore('creditStates')
    const states = await new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const previous = states[0]
    if (!previous) throw new Error('Mock credit state missing after account setup')
    store.put({ ...previous, available: 2, revision: previous.revision + 1 })
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    database.close()
    return {
      previousAvailable: previous.available,
      seededAvailable: 2,
      note: 'Synthetic local mock shortage setup only; not a payment or ledger transaction.',
    }
  })
}

;(async () => {
  fs.mkdirSync(out, { recursive: true })
  for (const name of [
    '01-en-desktop-failed-history.png',
    '02-en-desktop-returned-source.png',
    '02-en-desktop-pending-history.png',
    '03-en-desktop-returned-source.png',
    '03-en-phone-failed-history.png',
    '04-en-phone-pending-history.png',
    '04-ru-phone-failed-history.png',
    '05-ru-phone-pending-history.png',
    'metrics.json',
    'trace.json',
    'capture-error.txt',
  ]) {
    try { fs.unlinkSync(`${out}/${name}`) } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  const browser = await chromium.launch({
    headless: true,
    args: ['--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))

  await page.goto(base)
  await page.getByRole('button', { name: 'Start dubbing', exact: true }).click()
  await page.getByLabel('Email', { exact: true }).fill(`qa65-${Date.now()}@example.invalid`)
  await page.getByLabel('Password', { exact: true }).fill('Visual65!Review')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  const verification = await page.getByText(/(?:Simulated code|Local mock code).*No email was sent\./i).innerText()
  await page.getByLabel('6-digit verification code').fill(verification.match(/\b\d{6}\b/)[0])
  await page.getByRole('heading', { name: 'New dub', exact: true }).waitFor()

  await page.getByLabel('Choose video', { exact: true }).setInputFiles(video)
  await page.getByRole('button', { name: 'Validate and save draft', exact: true }).click()
  await page.getByText('Saved source', { exact: true }).waitFor()
  await page.getByLabel('Start (seconds)', { exact: true }).fill('0.123')
  await page.getByLabel('Start (seconds)', { exact: true }).press('Tab')
  await page.getByText('Section saved. Request a fresh quote before processing.', { exact: true }).waitFor()
  await page.getByLabel('End (seconds)', { exact: true }).fill('8.000')
  await page.getByLabel('End (seconds)', { exact: true }).press('Tab')
  await page.getByText('Section saved. Request a fresh quote before processing.', { exact: true }).waitFor()

  trace.push(await seedShortage(page))
  await page.reload()
  await page.getByRole('button', { name: 'Get exact quote', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Get exact quote', exact: true }).click()
  await page.getByText('The current available balance is below this quote. No processing has been authorized.', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Open credits', exact: true }).click()
  await page.getByRole('heading', { name: 'Credit packs', exact: true }).waitFor()

  await page.getByRole('button', { name: 'Start mock checkout', exact: true }).click()
  await page.getByRole('button', { name: 'Simulate failure', exact: true }).click()
  await page.getByText('Checkout failed in this local scenario. No credits were added.', { exact: true }).waitFor()
  await page.getByText('20 credits · 0 MOCK units · Failed', { exact: true }).waitFor()
  await capture(page, '01-en-desktop-failed-history')

  await page.getByRole('button', { name: 'Start mock checkout', exact: true }).click()
  await page.getByRole('button', { name: 'Keep pending', exact: true }).click()
  await page.getByText('Confirming payment', { exact: true }).waitFor()
  await page.getByText('20 credits · 0 MOCK units · Awaiting confirmation', { exact: true }).waitFor()
  await page.waitForTimeout(2300)
  await capture(page, '02-en-desktop-pending-history')

  const beforeReturn = await page.evaluate(() => Object.fromEntries(Object.entries(sessionStorage)))
  await page.getByRole('button', { name: 'Return to video', exact: true }).click()
  await page.getByRole('heading', { name: 'New dub', exact: true }).waitFor()
  await page.getByText('Saved source', { exact: true }).waitFor()
  const returnState = await page.evaluate(() => ({
    route: location.pathname,
    session: Object.fromEntries(Object.entries(sessionStorage)),
    selection: [...document.querySelectorAll('input')].map((input) => ({
      labels: [...(input.labels ?? [])].map((label) => label.innerText.trim()),
      ariaLabel: input.getAttribute('aria-label'),
      value: input.value,
    })),
    processingButtons: [...document.querySelectorAll('main button')]
      .map((button) => button.innerText.trim())
      .filter((label) => /process|обработ/i.test(label)),
  }))
  trace.push({
    beforeReturnHasContext: Object.keys(beforeReturn).some((key) => key.endsWith('.return-context')),
    returnState,
  })
  await capture(page, '03-en-desktop-returned-source')
  const startInput = returnState.selection.find((input) => input.labels.includes('Start (seconds)'))
  const endInput = returnState.selection.find((input) => input.labels.includes('End (seconds)'))
  if (startInput?.value !== '0.123' || endInput?.value !== '8.000') {
    throw new Error(`Saved selection did not restore: ${JSON.stringify(returnState.selection)}`)
  }
  if (!Object.keys(returnState.session).some((key) => key.endsWith('.credits-return-intent'))) {
    throw new Error('Credits return hint was not written before navigation')
  }
  if (returnState.processingButtons.length) throw new Error('Return triggered processing without a user action')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${base}/credits`)
  await page.getByRole('heading', { name: 'Credit packs', exact: true }).waitFor()
  await page.getByText('20 credits · 0 MOCK units · Failed', { exact: true }).waitFor()
  await capture(page, '04-en-phone-pending-history')

  await page.locator('.locale-control select').selectOption('ru', { force: true })
  await page.getByRole('heading', { name: 'Пакеты кредитов', exact: true }).waitFor()
  await capture(page, '05-ru-phone-pending-history')
  const phoneMetrics = metrics.filter((row) => row.name.endsWith('phone-pending-history'))
  for (const row of phoneMetrics) {
    if (row.documentWidth > row.viewport.width) throw new Error(`Horizontal overflow in ${row.name}`)
    if (row.historyLabels.some((label) => Number.parseFloat(label.fontSize) < 14)) {
      throw new Error(`History label below 14px in ${row.name}`)
    }
  }

  fs.writeFileSync(`${out}/trace.json`, JSON.stringify({ trace, pageErrors, metrics }, null, 2))
  await context.close()
  await browser.close()
})().catch((error) => {
  fs.writeFileSync(`${out}/capture-error.txt`, String(error?.stack ?? error))
  console.error(error)
  process.exit(1)
})
