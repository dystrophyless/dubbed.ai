const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/@playwright/test')

const baseURL = 'http://127.0.0.1:4568/'
const outDir = __dirname
const cases = [
  { locale: 'en', name: 'en-desktop', viewport: { width: 1440, height: 900 } },
  { locale: 'ru', name: 'ru-desktop', viewport: { width: 1440, height: 900 } },
  { locale: 'en', name: 'en-phone', viewport: { width: 390, height: 844 } },
  { locale: 'ru', name: 'ru-phone', viewport: { width: 390, height: 844 } },
]

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] })
  const captures = []

  try {
    for (const item of cases) {
      const context = await browser.newContext({ viewport: item.viewport, deviceScaleFactor: 1 })
      await context.addInitScript((locale) => localStorage.setItem('dubbed.locale', locale), item.locale)
      const page = await context.newPage()
      const pageErrors = []
      page.on('pageerror', (error) => pageErrors.push(error.message))
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('#root')

      const metrics = await page.evaluate(async (locale) => {
        const resources = performance.getEntriesByType('resource').map((entry) => entry.name)
        const reactURL = resources.find((url) => /\/node_modules\/.vite\/deps\/react\.js(?:\?|$)/.test(url))
        const reactDOMURL = resources.find((url) => /\/node_modules\/.vite\/deps\/react-dom_client\.js(?:\?|$)/.test(url))
        if (!reactURL || !reactDOMURL) throw new Error('Could not find Vite React module URLs for the shared component harness.')

        const [reactModule, reactDOMModule, noticeModule, localeModule] = await Promise.all([
          import(reactURL),
          import(reactDOMURL),
          import('/src/components/ui/notice.tsx'),
          import('/src/app/locale.tsx'),
        ])
        const React = reactModule.default ?? reactModule
        const ReactDOM = reactDOMModule.default ?? reactDOMModule
        const shell = document.createElement('main')
        shell.className = 'app-main'
        shell.style.maxWidth = '720px'
        shell.style.margin = '0 auto'
        shell.style.padding = '32px'
        const mount = document.createElement('div')
        shell.append(mount)
        document.body.replaceChildren(shell)
        document.documentElement.lang = locale
        const tree = React.createElement(
          localeModule.LocaleProvider,
          { services: {}, onAccountUpdated: () => {} },
          React.createElement(noticeModule.ServiceNotice, {
            code: 'storage-unavailable',
            context: 'read',
          }),
        )
        ReactDOM.createRoot(mount).render(tree)
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        await document.fonts.ready

        const notice = document.querySelector('[role="alert"]')
        if (!notice) throw new Error('ServiceNotice did not render its alert.')
        const style = getComputedStyle(notice)
        const rect = notice.getBoundingClientRect()
        return {
          locale,
          viewport: { width: innerWidth, height: innerHeight },
          notice: {
            text: notice.textContent,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            borderRadius: style.borderRadius,
            padding: style.padding,
          },
          documentWidth: { scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth },
          mabryAvailable: document.fonts.check('400 14px "Mabry Pro"'),
        }
      }, item.locale)

      const screenshot = path.join(outDir, `${item.name}.png`)
      await page.screenshot({ path: screenshot, fullPage: true })
      captures.push({ ...metrics, screenshot: path.basename(screenshot), pageErrors })
      await context.close()
    }
  } finally {
    await browser.close()
  }

  fs.writeFileSync(path.join(outDir, 'service-notice-captures.json'), `${JSON.stringify(captures, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(captures, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
