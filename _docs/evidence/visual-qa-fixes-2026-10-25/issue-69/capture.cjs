const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')

const root = __dirname
const evidence = path.join(root, 'evidence')
const base = 'http://127.0.0.1:4569'
const browserArgs = ['--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
const captures = []
const checks = []
const pageErrors = []

async function registerMockAccount(page) {
  await page.goto(base)
  await page.getByRole('button', { name: 'Start dubbing', exact: true }).click()
  await page.getByLabel('Email', { exact: true }).fill(`visual-qa-69-${Date.now()}@example.test`)
  await page.getByLabel('Password', { exact: true }).fill('Review-69-password!')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  const notice = page.getByText(/(?:Simulated code|Local mock code).*No email was sent\./i)
  await notice.waitFor()
  const code = (await notice.innerText()).match(/\b\d{6}\b/)?.[0]
  assert.ok(code, 'the visible local mock provides a verification code')
  await page.getByLabel('6-digit verification code').fill(code)
  await page.getByRole('heading', { name: 'New dub', exact: true }).waitFor()
}

async function setLocale(page, locale) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.locator('.locale-control select').selectOption(locale)
  await page.locator(`.microphone-check[lang="${locale}"]`).waitFor()
}

async function measure(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null
      const box = element.getBoundingClientRect()
      return {
        x: Math.round(box.x * 10) / 10,
        y: Math.round(box.y * 10) / 10,
        width: Math.round(box.width * 10) / 10,
        height: Math.round(box.height * 10) / 10,
      }
    }
    const buttons = Array.from(document.querySelectorAll('.microphone-check button'))
    const button = (label) => buttons.find((element) => element.innerText.replace(/\s+/g, ' ').trim() === label)
    const readButton = (element) => {
      if (!element) return null
      const style = getComputedStyle(element)
      return {
        label: element.innerText.replace(/\s+/g, ' ').trim(),
        size: element.dataset.size ?? null,
        disabled: element.disabled,
        rect: rect(element),
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
      }
    }
    const main = document.querySelector('.microphone-check')
    const status = document.querySelector('.microphone-check__status')
    const continueButton = document.querySelector('.microphone-check__footer button')
    const qa = window.__qaMic
    return {
      locale: main?.getAttribute('lang') ?? null,
      viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
      document: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      fontFamily: main ? getComputedStyle(main.querySelector('h1')).fontFamily : null,
      status: status?.innerText ?? null,
      alerts: Array.from(document.querySelectorAll('.microphone-check [role="alert"]')).map((element) => element.innerText),
      buttons: {
        refresh: readButton(button(main?.lang === 'ru' ? 'Обновить устройства' : 'Refresh devices')),
        connect: readButton(button(main?.lang === 'ru' ? 'Подключить выбранный микрофон' : 'Connect selected microphone')),
        record: readButton(button(main?.lang === 'ru' ? 'Записать тест' : 'Record test')),
        stop: readButton(button(main?.lang === 'ru' ? 'Остановить' : 'Stop')),
        continue: readButton(continueButton),
      },
      statusRect: rect(document.querySelector('.microphone-check__status-block')),
      testRect: rect(document.querySelector('.microphone-check__test-block')),
      mediaCalls: qa ? { getUserMedia: qa.getUserMediaCalls, recorderStart: qa.recorderStartCalls } : null,
    }
  })
}

async function capture(page, name, locale, state, viewport, scrollToAlertText = null) {
  if (scrollToAlertText) {
    await page.getByRole('alert').filter({ hasText: scrollToAlertText }).scrollIntoViewIfNeeded()
  } else {
    await page.evaluate(() => window.scrollTo(0, 0))
  }
  await page.evaluate(() => document.fonts.ready)
  const imagePath = path.join(evidence, `${name}.png`)
  const png = await page.screenshot({ path: imagePath, fullPage: false, animations: 'disabled' })
  const current = await measure(page)
  const screenshotPixels = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) }
  assert.deepEqual(screenshotPixels, viewport, `${name} screenshot must match its CSS viewport at DPR 1`)
  assert.equal(current.viewport.width, viewport.width, `${name} viewport width`)
  assert.equal(current.viewport.height, viewport.height, `${name} viewport height`)
  assert.ok(current.document.scrollWidth <= current.document.clientWidth, `${name} has horizontal page overflow`)
  captures.push({
    name,
    path: path.relative(root, imagePath).replaceAll(path.sep, '/'),
    locale,
    state,
    viewport,
    screenshotPixels,
    metrics: current,
    openedForVisualInspection: false,
  })
  console.log(`${name}: ${screenshotPixels.width}x${screenshotPixels.height}, ${state}`)
  return current
}

async function installMediaInstrumentation(page, denyFirst = false) {
  await page.evaluate((shouldDenyFirst) => {
    const mediaDevices = navigator.mediaDevices
    const originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices)
    const recorder = window.MediaRecorder
    if (!recorder) throw new Error('This Chromium environment does not expose MediaRecorder.')
    const originalRecorderStart = recorder.prototype.start
    const qa = {
      getUserMediaCalls: 0,
      recorderStartCalls: 0,
      deniedFirst: false,
      tracks: [],
      nativeRecorder: recorder,
      originalRecorderStart,
    }
    Object.defineProperty(mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async (constraints) => {
        qa.getUserMediaCalls += 1
        if (shouldDenyFirst && !qa.deniedFirst) {
          qa.deniedFirst = true
          throw new DOMException('Synthetic permission denial for UI recovery.', 'NotAllowedError')
        }
        const stream = await originalGetUserMedia(constraints)
        qa.tracks.push(...stream.getAudioTracks())
        return stream
      },
    })
    Object.defineProperty(recorder.prototype, 'start', {
      configurable: true,
      writable: true,
      value: function (...args) {
        qa.recorderStartCalls += 1
        return originalRecorderStart.apply(this, args)
      },
    })
    window.__qaMic = qa
  }, denyFirst)
}

async function main() {
  await fs.mkdir(evidence, { recursive: true })
  const browser = await chromium.launch({ headless: true, args: browserArgs })
  const context = await browser.newContext({
    locale: 'en-US',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => pageErrors.push(error.message))

  try {
    await registerMockAccount(page)
    await page.goto(`${base}/microphone?origin=new`)
    await page.locator('.microphone-check').waitFor()
    await capture(page, 'not-asked-en-desktop', 'en', 'fresh visit, permission not requested', { width: 1440, height: 900 })
    await setLocale(page, 'ru')
    await capture(page, 'not-asked-ru-desktop', 'ru', 'fresh visit, permission not requested', { width: 1440, height: 900 })
    await setLocale(page, 'en')
    await installMediaInstrumentation(page)
    await page.getByRole('button', { name: 'Allow microphone access', exact: true }).click()
    await page.getByText('Connected. The browser is providing a live microphone track.', { exact: true }).waitFor()
    checks.push('An explicit connection click obtains a fake browser track; no test starts automatically.')

    const viewports = [
      ['desktop', 1440, 900],
      ['short', 1440, 700],
      ['390', 390, 844],
      ['767', 767, 900],
      ['768', 768, 900],
    ]
    for (const locale of ['en', 'ru']) {
      await setLocale(page, locale)
      for (const [name, width, height] of viewports) {
        await page.setViewportSize({ width, height })
        const ready = await capture(page, `ready-${locale}-${name}`, locale, 'connected, optional test not started', { width, height })
        assert.equal(ready.buttons.continue.disabled, false, `${locale} ${name} Continue is ready before a test`)
        assert.ok(ready.buttons.continue.rect.y > ready.statusRect.y, `${locale} ${name} Continue follows readiness feedback`)
        assert.ok(ready.buttons.continue.rect.y < ready.testRect.y, `${locale} ${name} Continue precedes optional testing`)
        assert.ok(ready.buttons.continue.rect.y + ready.buttons.continue.rect.height <= height, `${locale} ${name} Continue remains in the viewport`)
        if (width < 768) {
          assert.equal(ready.buttons.continue.rect.height, 48, `${locale} ${name} phone Continue target`)
          assert.equal(ready.buttons.record.rect.height, 48, `${locale} ${name} phone Record target`)
        } else {
          assert.equal(ready.buttons.refresh.rect.height, 32, `${locale} ${name} shared small role`)
          assert.equal(ready.buttons.connect.rect.height, 40, `${locale} ${name} shared medium role`)
          assert.equal(ready.buttons.record.rect.height, 40, `${locale} ${name} shared medium role`)
          assert.equal(ready.buttons.continue.rect.height, 44, `${locale} ${name} shared large role`)
        }
      }
    }
    checks.push('EN/RU ready screenshots at desktop, short desktop, 390, 767 and 768 confirm shared 32/40/44 desktop roles and 48px phone targets.')

    await page.setViewportSize({ width: 1440, height: 900 })
    await setLocale(page, 'en')
    await page.goto(`${base}/microphone?origin=new`)
    await page.locator('.microphone-check').waitFor()
    await installMediaInstrumentation(page, true)
    await page.getByRole('button', { name: 'Allow microphone access', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'Microphone access was denied.' }).waitFor()
    const denied = await capture(page, 'denied-en-desktop', 'en', 'injected NotAllowedError; no microphone track', { width: 1440, height: 900 })
    assert.equal(denied.status, null, 'denial must not retain initial permission-not-requested copy')
    assert.equal(denied.buttons.continue.disabled, true, 'denial keeps Continue unavailable')
    assert.deepEqual(denied.mediaCalls, { getUserMedia: 1, recorderStart: 0 })
    await setLocale(page, 'ru')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('alert').filter({ hasText: 'Доступ к микрофону запрещён.' }).waitFor()
    await capture(page, 'denied-ru-390', 'ru', 'injected NotAllowedError; no microphone track', { width: 390, height: 844 })
    await page.setViewportSize({ width: 1440, height: 900 })
    await setLocale(page, 'en')
    await page.getByRole('button', { name: 'Connect selected microphone', exact: true }).click()
    await page.getByText('Connected. The browser is providing a live microphone track.', { exact: true }).waitFor()
    const retry = await capture(page, 'retry-en-desktop', 'en', 'explicit retry succeeds with fake track', { width: 1440, height: 900 })
    assert.equal(retry.buttons.continue.disabled, false)
    assert.deepEqual(retry.mediaCalls, { getUserMedia: 2, recorderStart: 0 })
    await setLocale(page, 'ru')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByText('Подключено. Браузер передаёт активную дорожку микрофона.', { exact: true }).waitFor()
    await capture(page, 'retry-ru-390', 'ru', 'explicit retry succeeds with fake track', { width: 390, height: 844 })
    checks.push('Injected denied connection omits the initial waiting sentence in EN/RU, blocks Continue, then an explicit retry restores readiness.')

    await setLocale(page, 'en')
    await page.waitForTimeout(100)
    const endedInjection = await page.evaluate(() => {
      const track = window.__qaMic.tracks.at(-1)
      if (!track) return { trackCount: window.__qaMic.tracks.length, state: null, dispatchObserved: false }
      let dispatchObserved = false
      track.addEventListener('ended', () => { dispatchObserved = true }, { once: true })
      track.dispatchEvent(new Event('ended'))
      return { trackCount: window.__qaMic.tracks.length, state: track.readyState, dispatchObserved }
    })
    console.log(`synthetic ended injection: ${JSON.stringify(endedInjection)}`)
    assert.ok(endedInjection.trackCount > 0 && endedInjection.dispatchObserved, 'the synthetic ended event reached the fake browser track')
    await page.getByText('The microphone connection ended. Reconnect to continue.', { exact: true }).waitFor()
    const lost = await capture(page, 'lost-en-desktop', 'en', 'synthetic ended event on fake track', { width: 1440, height: 900 })
    assert.equal(lost.buttons.continue.disabled, true)
    await setLocale(page, 'ru')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByText('Подключение к микрофону прервано. Подключитесь снова, чтобы продолжить.', { exact: true }).waitFor()
    await capture(page, 'lost-ru-390', 'ru', 'synthetic ended event on fake track', { width: 390, height: 844 })
    checks.push('A synthetic ended event on the fake track disables Continue and asks for reconnection in EN/RU.')

    await page.setViewportSize({ width: 1440, height: 900 })
    await setLocale(page, 'en')
    await page.getByRole('button', { name: 'Connect selected microphone', exact: true }).click()
    await page.getByText('Connected. The browser is providing a live microphone track.', { exact: true }).waitFor()
    await page.evaluate(() => Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: undefined }))
    await page.getByRole('button', { name: 'Record test', exact: true }).click()
    await page.getByRole('alert').filter({ hasText: 'This browser cannot record a local microphone test.' }).waitFor()
    const unsupported = await capture(page, 'test-unsupported-en-desktop', 'en', 'fake live track; MediaRecorder API unavailable', { width: 1440, height: 900 })
    assert.equal(unsupported.buttons.continue.disabled, false, 'unsupported optional test must not gate readiness')
    assert.equal(unsupported.buttons.record.disabled, false, 'the optional test control remains present and available')
    assert.deepEqual(unsupported.mediaCalls, { getUserMedia: 3, recorderStart: 0 }, 'unsupported test never starts a recorder')
    await setLocale(page, 'ru')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('alert').filter({ hasText: 'В этом браузере недоступна локальная тестовая запись.' }).waitFor()
    await capture(page, 'test-unsupported-ru-390', 'ru', 'fake live track; MediaRecorder API unavailable', { width: 390, height: 844 })
    await capture(page, 'test-unsupported-ru-390-alert', 'ru', 'fake live track; localized unavailable message scrolled into view', { width: 390, height: 844 }, 'В этом браузере недоступна локальная тестовая запись.')
    checks.push('Missing MediaRecorder produces localized browser-capability copy; the fake live connection and optional Continue readiness remain available.')

    assert.deepEqual(pageErrors, [], 'no unhandled page errors during capture')
    const report = {
      issue: 69,
      model: 'gpt-6-luna',
      effort: 'max',
      capturedAt: new Date().toISOString(),
      baseline: '9d286621177200fdb5f61ef963d0b6818ae76774',
      worktreeBoundary: 'Current shared worktree; product edits limited to MicrophoneScreen.tsx, its CSS, and focused test; screenshots use the local mock only.',
      runtime: `Playwright Chromium ${browser.version()} on Vite mock at 127.0.0.1:4569; DPR 1; --mute-audio --use-fake-device-for-media-stream --use-fake-ui-for-media-stream.`,
      fixture: 'One disposable browser-local mock account created through the visible registration and verification UI. Permission denial, track end, and missing MediaRecorder were injected only in the isolated browser realm.',
      reference: {
        buttonClean: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/button-clean.md.txt',
        buttonLight: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/Light/01-initial.png',
      },
      captures,
      checks,
      pageErrors,
      limitations: [
        'No physical microphone or speakers were used.',
        'Injected failure states prove this UI handling only; the recoverable media-invalid test error is covered by the focused unit test, not a browser fault capture. These checks do not establish native permission UI, physical-device behavior, browser support policy, OS contention, a real phone, screen-reader, forced-colors, native zoom, provider, backend, or production behavior.',
        'Only the focused MicrophoneScreen unit test file was run; no full suite, typecheck, or build was run during concurrent writers.',
      ],
    }
    await fs.writeFile(path.join(root, 'metrics.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    await fs.writeFile(path.join(root, 'screenshot-manifest.json'), `${JSON.stringify(captures.map(({ name, path: imagePath, locale, state, viewport, screenshotPixels, openedForVisualInspection }) => ({ name, path: imagePath, locale, state, viewport, screenshotPixels, openedForVisualInspection })), null, 2)}\n`, 'utf8')
    await fs.writeFile(path.join(root, 'capture.log'), `${checks.map((check) => `PASS ${check}`).join('\n')}\n${captures.length} viewport screenshots saved.\n`, 'utf8')
    console.log(`Capture complete: ${captures.length} screenshots; ${checks.length} checks; ${pageErrors.length} page errors.`)
  } finally {
    await context.close()
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
