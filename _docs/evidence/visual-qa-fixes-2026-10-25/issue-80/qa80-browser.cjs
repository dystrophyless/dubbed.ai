const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(path.resolve(__dirname, '../../../..', 'frontend', 'node_modules', 'playwright'))

const base = 'http://127.0.0.1:4580'
const evidenceDir = path.join(__dirname, 'evidence')
const viewports = {
  desktop: { width: 1440, height: 900 },
  short: { width: 1440, height: 700 },
  phone: { width: 390, height: 844 },
}
const summary = {
  date: new Date().toISOString(),
  port: 4580,
  browser: 'Playwright Chromium, headless, DPR 1, reduced motion, audio muted, fake-media flags only',
  fixture: 'Synthetic mock identity only; no real credentials, provider, email, backend, microphone, or payment.',
  screenshots: [],
  assertions: [],
  pageErrors: [],
}

fs.mkdirSync(evidenceDir, { recursive: true })

async function openContext(browser, locale, viewport) {
  const context = await browser.newContext({
    locale: locale === 'ru' ? 'ru-RU' : 'en-US',
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.setDefaultNavigationTimeout(15000)
  page.on('pageerror', (error) => summary.pageErrors.push({ locale, message: error.message }))
  return { context, page }
}

async function capture(page, name, scenario, locale, viewportName) {
  await page.evaluate(() => document.fonts.ready)
  const metrics = await page.evaluate(() => {
    const measure = (element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        text: element.innerText,
        type: element.getAttribute('type'),
        height: rect.height,
        width: rect.width,
        font: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
      }
    }
    return {
      url: location.href,
      lang: document.documentElement.lang,
      viewport: { width: innerWidth, height: innerHeight },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      fonts: [...document.fonts].map(({ family, weight, status }) => ({ family, weight, status })),
      buttons: [...document.querySelectorAll('.auth-form button, .route-error button')].map(measure),
      alerts: [...document.querySelectorAll('[role="alert"], [role="status"]')].map((element) => element.innerText),
    }
  })
  assert(metrics.document.width <= metrics.viewport.width, `${name}: horizontal overflow ${metrics.document.width}px > ${metrics.viewport.width}px`)
  await page.screenshot({ path: path.join(evidenceDir, `${name}.png`), fullPage: true })
  summary.screenshots.push({ name, scenario, locale, viewportName, ...metrics })
  return metrics
}

async function captureGoogleConflict(browser, locale, viewportName, viewport) {
  const { context, page } = await openContext(browser, locale, viewport)
  try {
    await page.goto(`${base}/e2e/harness/auth-state-visual.html?screen=signin&scenario=signin-provider-conflict`)
    await page.locator('.auth-form').waitFor()
    const googleLabel = locale === 'ru' ? 'Продолжить с Google' : 'Continue with Google'
    await page.getByRole('button', { name: googleLabel, exact: true }).click()

    const alert = page.getByRole('alert')
    await alert.waitFor()
    const text = await alert.innerText()
    assert(text.toLowerCase().includes('different account') || text.includes('другим аккаунтом'), `Conflict copy is missing: ${text}`)
    assert(text.toLowerCase().includes('separate') || text.includes('раздельными'), `Account separation is not stated: ${text}`)
    assert(!/refresh|обновите/i.test(text), `Conflict was incorrectly described as stale data: ${text}`)
    const recoveryLabel = locale === 'ru' ? 'Сбросить пароль этого аккаунта' : 'Reset password for that account'
    assert.equal(await page.getByRole('link', { name: recoveryLabel, exact: true }).getAttribute('href'), '/reset-password')
    const calls = await page.evaluate(() => window.__authStateVisual?.calls)
    assert.deepEqual(calls, ['identity.google.sign-in'], 'Conflict should not invoke another identity or work mutation.')

    const metrics = await capture(page, `${locale}-${viewportName}-provider-conflict`, 'synthetic Google provider conflict', locale, viewportName)
    const expectedTaskHeight = viewportName === 'phone' ? 48 : 40
    const submitHeight = metrics.buttons.find((button) => button.type === 'submit')?.height
    const googleHeight = metrics.buttons.find((button) => button.text.includes('Google'))?.height
    assert.equal(submitHeight, expectedTaskHeight, `Unexpected ${locale} ${viewportName} sign-in target height`)
    assert.equal(googleHeight, expectedTaskHeight, `Unexpected ${locale} ${viewportName} Google target height`)
    summary.assertions.push({ id: 'QA-80-02', locale, viewportName, calls, recoveryHref: '/reset-password', taskButtonHeight: expectedTaskHeight })
  } finally {
    await context.close()
  }
}

async function readSession(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('dubbed.mock.v1.default')
    const timeout = window.setTimeout(() => reject(new Error('Synthetic session read timed out.')), 5000)
    request.onerror = () => {
      clearTimeout(timeout)
      reject(request.error)
    }
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('sessions', 'readonly')
      const records = tx.objectStore('sessions').getAll()
      records.onerror = () => {
        clearTimeout(timeout)
        db.close()
        reject(records.error)
      }
      records.onsuccess = () => {
        const session = records.result
          .filter((candidate) => candidate.expiresAt > Date.now())
          .sort((left, right) => right.expiresAt - left.expiresAt)[0]
        tx.oncomplete = () => {
          clearTimeout(timeout)
          db.close()
          if (!session) reject(new Error('No active synthetic session record was found.'))
          else resolve({ id: session.id, expiresAt: session.expiresAt, observedAt: Date.now() })
        }
      }
      tx.onerror = () => {
        clearTimeout(timeout)
        db.close()
        reject(tx.error)
      }
    }
  }))
}

async function expireStoredSession(page, activeSessionId) {
  return page.evaluate((sessionId) => new Promise((resolve, reject) => {
    const request = indexedDB.open('dubbed.mock.v1.default')
    let db
    let updated = 0
    const timeout = window.setTimeout(() => {
      db?.close()
      reject(new Error('Synthetic expiry injection timed out.'))
    }, 5000)
    request.onblocked = () => {
      clearTimeout(timeout)
      reject(new Error('Synthetic expiry injection was blocked by an open database connection.'))
    }
    request.onerror = () => {
      clearTimeout(timeout)
      reject(request.error)
    }
    request.onsuccess = () => {
      db = request.result
      const tx = db.transaction('sessions', 'readwrite')
      const store = tx.objectStore('sessions')
      const records = store.getAll()
      tx.oncomplete = () => {
        clearTimeout(timeout)
        db.close()
        resolve(updated)
      }
      tx.onerror = () => {
        clearTimeout(timeout)
        db.close()
        reject(tx.error)
      }
      tx.onabort = () => {
        clearTimeout(timeout)
        db.close()
        reject(tx.error ?? new Error('Synthetic expiry injection was aborted.'))
      }
      records.onerror = () => {
        clearTimeout(timeout)
        db.close()
        reject(records.error)
      }
      records.onsuccess = () => {
        const session = records.result.find((candidate) => candidate.id === sessionId)
        if (session) {
          session.expiresAt = Date.now() - 1000
          store.put(session)
          updated = 1
        }
      }
    }
  }), activeSessionId)
}

async function seedSyntheticAccount(page, email, password) {
  return page.evaluate(async ({ email, password }) => {
    const { createServices } = await import('/src/services/index.ts')
    const services = createServices()
    const started = await services.registration.start({ email, password, operationId: crypto.randomUUID() })
    if (started.status !== 'ok') throw new Error(`Synthetic registration start failed: ${started.status}`)
    const verified = await services.registration.verify({
      requestId: started.data.id,
      code: started.data.scenarioCode.value,
      operationId: crypto.randomUUID(),
    })
    if (verified.status !== 'ok') throw new Error(`Synthetic registration verification failed: ${verified.status}`)
    const signedOut = await services.identity.signOut({ operationId: crypto.randomUUID() })
    if (signedOut.status !== 'ok') throw new Error(`Synthetic sign-out failed: ${signedOut.status}`)
    return { status: 'synthetic-account-ready' }
  }, { email, password })
}

async function captureAccountExpiry(browser, locale, viewportName, viewport, proveDestination = false) {
  console.log(`Account expiry start: ${locale} ${viewportName}`)
  const { context, page: initialPage } = await openContext(browser, locale, viewport)
  let page = initialPage
  try {
    await page.goto(`${base}/sign-in`)
    await page.locator('.auth-form').waitFor()
    const email = `qa80-${locale}-${viewportName}-${Date.now()}@example.invalid`
    const password = 'Qa80-local-only!'
    await seedSyntheticAccount(page, email, password)
    console.log(`Account seeded: ${locale} ${viewportName}`)
    await page.reload()
    await page.locator('.auth-form').waitFor()
    await page.locator('input[type="email"]').fill(email)
    await page.locator('input[type="password"]').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/new')
    console.log(`UI sign-in complete: ${locale} ${viewportName}`)

    const initialSession = await readSession(page)
    console.log(`Initial active session read: ${locale} ${viewportName}`)
    await page.reload()
    await page.waitForURL('**/new')
    const reloadedSession = await readSession(page)
    console.log(`Reloaded active session read: ${locale} ${viewportName}`)
    assert.equal(reloadedSession.id, initialSession.id, 'Reload changed the session identity.')
    assert.equal(reloadedSession.expiresAt, initialSession.expiresAt, 'Reload slid the fixed expiry anchor.')
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    assert(Math.abs(initialSession.expiresAt - initialSession.observedAt - thirtyDays) < 60_000, 'Session expiry is not approximately fixed at 30 days.')

    const activeSession = await readSession(page)
    await page.close()
    const storagePage = await context.newPage()
    storagePage.on('framenavigated', (frame) => console.log(`Expiry fixture page navigation: ${frame.url()}`))
    await storagePage.goto(`${base}/e2e/harness/auth-state-visual.html?screen=signin`)
    await storagePage.locator('.auth-form').waitFor()
    const updatedSessions = await expireStoredSession(storagePage, activeSession.id)
    assert.equal(updatedSessions, 1, 'Expected exactly one synthetic session in the isolated browser context.')
    await storagePage.close()
    page = await context.newPage()
    page.on('pageerror', (error) => summary.pageErrors.push({ locale, message: error.message }))
    await page.goto(`${base}/account`)
    await page.locator('main').waitFor()
    console.log(`Active session expired: ${locale} ${viewportName}`)
    await page.locator('.route-error').waitFor()
    console.log(`Expired gate rendered: ${locale} ${viewportName}`)
    const mainText = await page.locator('main').innerText()
    assert(/session ended|сессия заверш/i.test(mainText), `Expired session lacks clear contextual copy: ${mainText}`)
    assert(!mainText.includes(email), 'Expired Account route exposed synthetic account details.')
    const signInLabel = locale === 'ru' ? 'Войти' : 'Sign in'
    const signInButton = page.getByRole('button', { name: signInLabel, exact: true })
    await signInButton.waitFor()
    assert.equal(new URL(page.url()).pathname, '/account', 'The expired gate should remain in the protected route until sign-in is chosen.')
    const gate = await capture(page, `${locale}-${viewportName}-account-expired`, 'native Account session expiry gate', locale, viewportName)
    const signInHeight = gate.buttons.find((button) => button.text.trim() === signInLabel)?.height
    const expectedTaskHeight = viewportName === 'phone' ? 48 : 40
    assert.equal(signInHeight, expectedTaskHeight, `Unexpected ${locale} ${viewportName} expired-session sign-in target height`)
    summary.assertions.push({
      id: 'QA-80-01',
      locale,
      viewportName,
      gateRoute: '/account',
      signInAction: true,
      taskButtonHeight: expectedTaskHeight,
      sessionIdPreservedAcrossReload: initialSession.id === reloadedSession.id,
      expiryPreservedAcrossReload: initialSession.expiresAt === reloadedSession.expiresAt,
      approxThirtyDayExpiry: true,
    })

    await signInButton.click()
    await page.waitForURL('**/sign-in')
    assert.equal(new URL(page.url()).pathname, '/sign-in')
    if (proveDestination) {
      await page.locator('input[type="email"]').fill(email)
      await page.locator('input[type="password"]').fill(password)
      await page.locator('button[type="submit"]').click()
      await page.waitForURL('**/new')
      assert.equal(new URL(page.url()).pathname, '/new', 'Account reauthentication must finish at New dub.')
      await capture(page, `${locale}-${viewportName}-account-reauth-new-dub`, 'native Account reauthentication destination', locale, viewportName)
      summary.assertions.push({ id: 'QA-80-01-native-destination', route: '/account -> /sign-in -> /new', destinationRendered: true, syntheticAccount: true })
    }
  } finally {
    await context.close()
  }
}

;(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  })
  try {
    if (!process.env.QA80_ONLY || process.env.QA80_ONLY === 'conflict') {
      for (const locale of ['en', 'ru']) {
        for (const [viewportName, viewport] of Object.entries(viewports)) {
          await captureGoogleConflict(browser, locale, viewportName, viewport)
        }
      }
    }
    if (!process.env.QA80_ONLY || process.env.QA80_ONLY === 'expiry') {
      for (const locale of ['en', 'ru']) {
        for (const [viewportName, viewport] of Object.entries(viewports)) {
          await captureAccountExpiry(browser, locale, viewportName, viewport, locale === 'en' && viewportName === 'desktop')
        }
      }
    }
  } finally {
    await browser.close()
  }
  fs.writeFileSync(path.join(__dirname, 'qa80-browser-results.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify({ screenshots: summary.screenshots.length, assertions: summary.assertions.length, pageErrors: summary.pageErrors }))
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
