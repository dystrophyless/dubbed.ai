const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/playwright')
const fs = require('node:fs/promises')
const path = require('node:path')

const output = 'D:/Program/python/Dubbed/_docs/evidence/visual-qa-fixes-2026-10-25/issue-75'
const screenshots = path.join(output, 'screenshots')
const base = 'http://127.0.0.1:4575'
const sizes = [
  ['desktop', 1440, 900],
  ['short', 1440, 700],
  ['390', 390, 844],
  ['767', 767, 844],
  ['768', 768, 844],
]
const locales = ['en', 'ru']
const log = { started: new Date().toISOString(), server: base, screenshots: [], actions: [], errors: [] }

async function capture(page, name, { fullPage = true, waitForStatus = true } = {}) {
  await page.evaluate(() => document.fonts.ready)
  if (waitForStatus) await page.locator('.projects-page .workspace-status').waitFor({ state: 'hidden' })
  const screenshotPath = path.join(screenshots, `${name}.png`)
  await page.screenshot({ path: screenshotPath, fullPage })
  const metrics = await page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null
      const { x, y, width, height, right, bottom } = element.getBoundingClientRect()
      return { x, y, width, height, right, bottom }
    }
    const buttons = [...document.querySelectorAll('.projects-page button, .project-dialog button')].map((button) => ({
      label: button.getAttribute('aria-label') || button.textContent?.trim(),
      disabled: button.disabled,
      ...rect(button),
    }))
    const rows = [...document.querySelectorAll('.project-row')].map((row) => {
      const title = row.querySelector('h2')
      const badge = row.querySelector('.project-state')
      return {
        title: title?.textContent,
        fullTitleAttribute: title?.getAttribute('title'),
        accessibleTitle: title?.getAttribute('aria-label'),
        titleClientWidth: title?.clientWidth ?? null,
        titleScrollWidth: title?.scrollWidth ?? null,
        badge: rect(badge),
        row: rect(row),
        previewLabel: row.querySelector('.project-row__thumbnail')?.getAttribute('aria-label'),
        previewVisible: row.querySelector('.project-row__thumbnail')?.textContent?.trim(),
        controlTargets: {
          rename: rect(row.querySelector('.project-row__rename')),
          continue: rect(row.querySelector('.project-row__continue')),
          menu: rect(row.querySelector('.project-row-menu__trigger')),
        },
      }
    })
    const dialog = document.querySelector('.project-dialog')
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      fontsLoaded: document.fonts.status === 'loaded',
      loadedFonts: [...document.fonts].filter((font) => font.status === 'loaded').map((font) => ({ family: font.family, weight: font.weight })),
      rows,
      buttons,
      capacityGuidance: document.querySelector('.projects-capacity-guidance')?.textContent ?? null,
      emptyCopy: document.querySelector('.projects-empty')?.innerText ?? null,
      dialog: dialog ? {
        rect: rect(dialog),
        scrollHeight: dialog.scrollHeight,
        clientHeight: dialog.clientHeight,
        activeWarning: dialog.querySelector('.project-dialog__active-warning')?.innerText ?? null,
        unknownWarning: [...dialog.querySelectorAll('.ui-notice')].map((notice) => notice.innerText).find((text) => /result is not confirmed|Результат удаления не подтверждён/i.test(text)) ?? null,
        text: dialog.innerText,
      } : null,
    }
  })
  const screenshot = { name: `${name}.png`, metrics }
  const existingIndex = log.screenshots.findIndex((item) => item.name === screenshot.name)
  if (existingIndex === -1) log.screenshots.push(screenshot)
  else log.screenshots[existingIndex] = screenshot
  console.log(`captured ${name}`)
}

async function openHarness(browser, locale, scenario, width, height) {
  const page = await browser.newPage({ viewport: { width, height } })
  page.on('pageerror', (error) => log.errors.push(`${scenario}/${locale}/${width}: ${error.message}`))
  await page.goto(`${base}/e2e/harness/workspace-state-visual.html?screen=projects&scenario=${scenario}&locale=${locale}`)
  if (scenario === 'projects-empty') await page.locator('.projects-empty').waitFor()
  else await page.locator('.project-row').first().waitFor()
  return page
}

async function seedNativeProjects(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.on('pageerror', (error) => log.errors.push(`native-seed: ${error.message}`))
  await page.goto(base)
  const seed = await page.evaluate(async () => {
    const { createServices } = await import('/src/services/index.ts')
    const services = createServices()
    const id = () => crypto.randomUUID()
    const unwrap = (result) => {
      if (result.status !== 'ok') throw new Error(JSON.stringify(result))
      return result.data
    }
    const requestId = id()
    const started = unwrap(await services.registration.start({
      email: `qa75-${id()}@example.test`,
      password: 'correct-horse',
      operationId: requestId,
    }))
    unwrap(await services.registration.verify({
      requestId,
      code: started.scenarioCode.value,
      operationId: id(),
    }))
    const source = await (await fetch('/media/source-dialogue.mp4')).blob()
    const titles = [
      'Long project title '.padEnd(100, 'L'),
      'Длинное имя проекта '.padEnd(100, 'Я'),
    ]
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    if (titles.some((title) => [...segmenter.segment(title)].length !== 100)) {
      throw new Error('Native screenshot fixture titles must contain exactly 100 visible characters.')
    }
    const projects = []
    for (const title of titles) {
      projects.push(unwrap(await services.uploads.commitInitial({
        file: new File([source], 'source-dialogue.mp4', { type: 'video/mp4' }),
        title,
        facts: { durationMs: 8625, width: 640, height: 360, hasAudio: true },
        operationId: id(),
      })).project)
    }
    return { titles, projects: projects.map(({ id, title, state }) => ({ id, title, state })) }
  })
  log.actions.push({ nativeServiceSeed: seed, source: '/media/source-dialogue.mp4', note: 'Mock facade seed; thumbnail is unavailable in the existing project descriptor.' })
  await page.goto(`${base}/projects`)
  await page.locator('.project-row').first().waitFor()
  return { context, page, seed }
}

async function main() {
  await fs.mkdir(screenshots, { recursive: true })
  const emptyOnly = process.argv[2] === 'empty'
  const dialogsOnly = process.argv[2] === 'dialogs'
  if (emptyOnly || dialogsOnly) {
    const previous = JSON.parse(await fs.readFile(path.join(output, 'rendered-metrics.json'), 'utf8'))
    log.started = previous.started
    log.screenshots = previous.screenshots
    log.actions = previous.actions
    log.errors = previous.errors
  }
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] })
  try {
    if (!emptyOnly && !dialogsOnly) {
    const native = await seedNativeProjects(browser)
    for (const locale of locales) {
      for (const [size, width, height] of sizes) {
        await native.page.evaluate((nextLocale) => localStorage.setItem('dubbed.locale', nextLocale), locale)
        await native.page.setViewportSize({ width, height })
        await native.page.reload()
        await native.page.locator('.project-row').first().waitFor()
        await capture(native.page, `native-long-titles-${locale}-${size}`)
      }
    }
    await native.context.close()

    for (const locale of locales) {
      for (const [size, width, height] of sizes) {
        const page = await openHarness(browser, locale, 'projects-capacity', width, height)
        await capture(page, `mixed-lifecycle-${locale}-${size}`)
        const processingRow = page.locator('.project-row').filter({ has: page.getByRole('heading', { name: locale === 'ru' ? 'Обработка' : 'Processing' }) })
        const projectRow = page.locator('.project-row').filter({ hasText: locale === 'ru' ? 'Processing draft' : 'Processing draft' }).first()
        const targetRow = (await projectRow.count()) > 0 ? projectRow : processingRow.nth(1)
        const title = locale === 'ru' ? 'Processing draft' : 'Processing draft'
        await targetRow.getByRole('button', { name: `Actions for ${title}` }).click().catch(async () => {
          await targetRow.locator('.project-row-menu__trigger').click()
        })
        await page.getByRole('menuitem', { name: locale === 'ru' ? 'Удалить проект' : 'Delete project' }).click()
        await page.getByRole('dialog').waitFor()
        await capture(page, `active-delete-dialog-${locale}-${size}`, { fullPage: false })
        if (width === 390 || width === 1440) {
          await page.getByRole('button', { name: locale === 'ru' ? 'Удалить проект' : 'Delete project', exact: true }).click()
          await page.getByText(locale === 'ru' ? /Результат удаления не подтверждён/ : /deletion result is not confirmed/i).waitFor()
          await capture(page, `active-delete-unknown-${locale}-${size}`, { fullPage: false })
        }
        await page.close()
      }
    }
    }

    if (dialogsOnly) {
      for (const locale of locales) {
        for (const [size, width, height] of sizes) {
          const page = await openHarness(browser, locale, 'projects-capacity', width, height)
          const targetRow = page.locator('.project-row').filter({ hasText: 'Processing draft' }).first()
          await targetRow.locator('.project-row-menu__trigger').click()
          await page.getByRole('menuitem', { name: locale === 'ru' ? 'Удалить проект' : 'Delete project' }).click()
          await page.getByRole('dialog').waitFor()
          await capture(page, `active-delete-dialog-${locale}-${size}`, { fullPage: false })
          if (width === 390 || width === 1440) {
            await page.getByRole('button', { name: locale === 'ru' ? 'Удалить проект' : 'Delete project', exact: true }).click()
            await page.getByText(locale === 'ru' ? /Результат удаления не подтверждён/ : /deletion result is not confirmed/i).waitFor()
            await capture(page, `active-delete-unknown-${locale}-${size}`, { fullPage: false })
          }
          await page.close()
        }
      }
    }

    if (!dialogsOnly) for (const locale of locales) {
      for (const [size, width, height] of sizes) {
        const page = await openHarness(browser, locale, 'projects-empty', width, height)
        await page.locator('.projects-empty').waitFor()
        await capture(page, `empty-${locale}-${size}`)
        await page.close()
      }
    }
  } finally {
    await browser.close()
    log.finished = new Date().toISOString()
    await fs.writeFile(path.join(output, 'rendered-metrics.json'), JSON.stringify(log, null, 2))
  }
}

main().catch((error) => {
  log.failure = String(error)
  console.error(error)
  process.exitCode = 1
})
