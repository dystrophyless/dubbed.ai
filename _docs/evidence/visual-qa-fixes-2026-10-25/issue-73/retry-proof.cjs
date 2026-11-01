const { chromium, expect } = require('D:/Program/python/Dubbed/frontend/node_modules/@playwright/test')
const fs = require('node:fs')
const path = require('node:path')

async function main() {
  const browser = await chromium.launch({
    args: ['--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
    await context.addInitScript(() => {
      const nativeOpen = indexedDB.open.bind(indexedDB)
      window.__qa73OpenCalls = 0
      indexedDB.open = (...args) => {
        window.__qa73OpenCalls += 1
        if (!sessionStorage.getItem('qa73-open-failed')) {
          sessionStorage.setItem('qa73-open-failed', 'yes')
          const request = {}
          setTimeout(() => {
            request.error = new DOMException('Injected one-shot transient open failure.', 'InvalidStateError')
            request.onerror?.()
          }, 0)
          return request
        }
        return nativeOpen(...args)
      }
    })

    const page = await context.newPage()
    const pageErrors = []
    const consoleErrors = []
    const externalRequests = []
    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('request', request => {
      if (new URL(request.url()).origin !== 'http://127.0.0.1:4573') externalRequests.push(request.url())
    })

    await page.goto('http://127.0.0.1:4573/projects')
    const retry = page.getByRole('button', { name: 'Retry', exact: true })
    await expect(retry).toBeVisible()
    const clientIdBefore = await page.evaluate(() => localStorage.getItem('dubbed.mock.client.v1.default'))
    await page.evaluate(() => document.fonts.ready)
    const inspect = () => page.evaluate(() => ({
      text: document.body.innerText,
      openCalls: window.__qa73OpenCalls,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentScrollWidth: document.documentElement.scrollWidth,
      fonts: {
        status: document.fonts.status,
        mabryRegular: document.fonts.check('400 16px "Mabry Pro"'),
        mabryMedium: document.fonts.check('500 16px "Mabry Pro"'),
      },
      buttons: [...document.querySelectorAll('button')].map(button => {
        const rect = button.getBoundingClientRect()
        const style = getComputedStyle(button)
        return {
          text: button.innerText.trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
        }
      }),
    }))
    const before = await inspect()
    await page.screenshot({ path: path.join(__dirname, 'before-retry.png'), fullPage: true })

    await retry.click()
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()
    const clientIdAfter = await page.evaluate(() => localStorage.getItem('dubbed.mock.client.v1.default'))
    await page.evaluate(() => document.fonts.ready)
    const after = await inspect()
    await page.screenshot({ path: path.join(__dirname, 'after-retry.png'), fullPage: true })

    const result = {
      origin: 'http://127.0.0.1:4573',
      fault: 'Synthetic first-open InvalidStateError; later calls use native IndexedDB.',
      before,
      after,
      clientIdentityStable: clientIdBefore !== null && clientIdBefore === clientIdAfter,
      pageErrors,
      consoleErrors,
      externalRequests,
    }
    fs.writeFileSync(path.join(__dirname, 'retry-proof.json'), JSON.stringify(result, null, 2))
    if (before.openCalls !== 1 || after.openCalls !== 2) throw new Error('Retry did not issue exactly one new database open.')
    if (pageErrors.length) throw new Error(`Unexpected page errors: ${pageErrors.join('; ')}`)
    if (consoleErrors.length) throw new Error(`Unexpected console errors: ${consoleErrors.join('; ')}`)
    if (externalRequests.length) throw new Error(`Unexpected external requests: ${externalRequests.join('; ')}`)
    console.log(JSON.stringify(result, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
