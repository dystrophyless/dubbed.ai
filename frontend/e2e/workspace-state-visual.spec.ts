import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Browser, type Page } from '@playwright/test'

declare global {
  interface Window {
    __workspaceStateVisual?: {
      screen: 'account' | 'credits' | 'projects' | 'newdub'
      scenario: string
      calls: string[]
      release: (name: string) => void
    }
  }
}

const evidenceDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..', '_docs/evidence/frontend-implementation-2026-10-23/workspace-state-ui')
mkdirSync(evidenceDir, { recursive: true })

type Locale = 'en-US' | 'ru-RU'
type Size = { width: number; height: number }
const reviewedFacts: Array<Record<string, unknown>> = []

async function openScene(
  browser: Browser,
  screen: 'account' | 'credits' | 'projects' | 'newdub',
  scenario: string,
  options: { locale?: Locale; viewport?: Size } = {},
) {
  const locale = options.locale ?? 'en-US'
  const context = await browser.newContext({
    locale,
    viewport: options.viewport ?? { width: 1440, height: 1000 },
    colorScheme: 'light',
    hasTouch: (options.viewport?.width ?? 1440) < 768,
  })
  const page = await context.newPage()
  const startupFailures: string[] = []
  page.on('pageerror', (error) => startupFailures.push(`pageerror: ${error.message}`))
  page.on('requestfailed', (request) => {
    if (request.resourceType() === 'script') {
      startupFailures.push(`script request failed: ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`)
    }
  })
  page.on('response', (response) => {
    if (response.request().resourceType() === 'script' && !response.ok()) {
      startupFailures.push(`script response ${response.status()}: ${response.url()}`)
    }
  })
  const startupDiagnostics = () => startupFailures.length > 0
    ? startupFailures.join('\n')
    : 'No pageerror or failed/non-OK script request was observed.'
  const response = await page.goto(`/e2e/harness/workspace-state-visual.html?screen=${screen}&scenario=${scenario}&locale=${locale === 'ru-RU' ? 'ru' : 'en'}`)
  expect(response?.ok(), `Harness HTML response was ${response?.status() ?? 'missing'}; ${startupDiagnostics()}`).toBe(true)
  try {
    await expect.poll(() => page.evaluate(() => window.__workspaceStateVisual?.screen ?? null), { timeout: 15_000 }).toBe(screen)
    await expect(page.locator('main.app-main')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('main.app-main h1')).toBeVisible({ timeout: 15_000 })
  } catch (error) {
    throw new Error(`Workspace harness did not reach its visible App route. ${startupDiagnostics()}\n${String(error)}`)
  }
  await expect(page.locator('html')).toHaveAttribute('lang', locale === 'ru-RU' ? 'ru' : 'en')
  await page.evaluate(() => document.fonts.ready)
  return { context, page }
}

async function capture(page: Page, name: string, fullPage = true) {
  await page.evaluate(() => document.fonts.ready)
  const facts = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('main.app-main')
    const controls = [...(main?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? [])]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          text: element.textContent?.trim() ?? '',
          ariaLabel: element.getAttribute('aria-label'),
          id: element.id || null,
          className: typeof element.className === 'string' ? element.className : '',
          width: rect.width,
          height: rect.height,
        }
      })
    return {
      lang: document.documentElement.lang,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      mabryLoaded: document.fonts.check('16px "Mabry Pro"'),
      controls,
    }
  })
  await page.screenshot({ path: resolve(evidenceDir, name), fullPage, animations: 'disabled' })
  reviewedFacts.push({ screenshot: name, ...facts })
  return facts
}

async function waitForCall(page: Page, name: string) {
  await expect.poll(() => page.evaluate((expected) => window.__workspaceStateVisual?.calls.includes(expected) ?? false, name)).toBe(true)
}

async function release(page: Page, name: string) {
  await page.evaluate((action) => window.__workspaceStateVisual?.release(action), name)
}

async function expectPhoneSurface(page: Page, locale: 'en' | 'ru', controlSelector: string) {
  const facts = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    width: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    mabryLoaded: document.fonts.check('16px "Mabry Pro"'),
  }))
  const target = page.locator(controlSelector).first()
  await expect(target).toBeVisible()
  const targetBox = await target.boundingBox()
  expect(facts.lang).toBe(locale)
  expect(facts.documentWidth).toBeLessThanOrEqual(facts.width)
  expect(facts.mabryLoaded).toBe(true)
  expect(targetBox?.height ?? 0).toBeGreaterThanOrEqual(48)
}

async function accountDeleteDialog(page: Page) {
  await page.getByRole('button', { name: /Delete account|Удалить аккаунт/i }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

test.describe('actual Account screen', () => {
  test('locale save pending is visible in the real Account route', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'account', 'account-locale-pending')
    try {
      await page.locator('#account-locale').selectOption('ru')
      await waitForCall(page, 'account.setLocale')
      await expect(page.getByRole('status').first()).toBeVisible()
      const facts = await capture(page, 'account-locale-save-pending-en-desktop.png')
      expect(facts.mabryLoaded).toBe(true)
    } finally {
      await release(page, 'account.setLocale')
      await context.close()
    }
  })

  test('locale failure keeps both sign-in methods visible and restores the selected value', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'account', 'account-locale-failure')
    try {
      await page.locator('#account-locale').selectOption('ru')
      const localeFailure = page.getByRole('alert').filter({
        hasText: 'The language changed here, but the account preference could not be saved.',
      })
      await expect(localeFailure).toBeVisible()
      await expect(localeFailure.getByRole('button', { name: 'Retry saving language', exact: true })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
      await expect(page.getByText('Email and password')).toBeVisible()
      await expect(page.getByText('Google')).toBeVisible()
      expect(await page.locator('#account-locale').inputValue()).toBe('en')
      const facts = await capture(page, 'account-locale-save-failure-en-desktop.png')
      expect(facts.documentWidth).toBeLessThanOrEqual(facts.viewportWidth)
    } finally {
      await context.close()
    }
  })

  test('invalid password is placed with the fields and retains the attempted values', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'account', 'account-password-invalid')
    try {
      const current = page.locator('input[autocomplete="current-password"]')
      const next = page.locator('input[autocomplete="new-password"]')
      await current.fill('incorrect-current-password')
      await next.fill('replacement-password-123')
      await page.getByRole('button', { name: 'Save password' }).click()
      await waitForCall(page, 'account.changePassword')
      const alert = page.getByRole('alert').first()
      await expect(page.locator('.account-screen__password-form')).toContainText(/пароль|password/i)
      await expect(current).toHaveValue('incorrect-current-password')
      await expect(next).toHaveValue('replacement-password-123')
      const [errorBox, submitBox] = await Promise.all([alert.boundingBox(), page.getByRole('button', { name: 'Save password' }).boundingBox()])
      if (errorBox && submitBox) expect(errorBox.y < submitBox.y).toBe(true)
      await capture(page, 'account-invalid-password-en-desktop.png')
    } finally {
      await context.close()
    }
  })

  test('delete cancel closes without calling the service; unknown outcome keeps confirmation', async ({ browser }) => {
    const cancelScene = await openScene(browser, 'account', 'account-delete-cancel')
    try {
      const opener = cancelScene.page.getByRole('button', { name: 'Delete account' }).first()
      await opener.click()
      await expect(cancelScene.page.getByRole('dialog')).toBeVisible()
      await capture(cancelScene.page, 'account-delete-soft-red-confirmation-en-desktop.png', false)
      await cancelScene.page.getByRole('button', { name: 'Cancel' }).click()
      await expect(cancelScene.page.getByRole('dialog')).toHaveCount(0)
      await expect(opener).toBeFocused()
      expect(await cancelScene.page.evaluate(() => window.__workspaceStateVisual?.calls.includes('account.delete'))).toBe(false)
      await opener.click()
      await expect(cancelScene.page.getByRole('dialog')).toBeVisible()
      await cancelScene.page.keyboard.press('Escape')
      await expect(cancelScene.page.getByRole('dialog')).toHaveCount(0)
      await expect(opener).toBeFocused()
    } finally {
      await cancelScene.context.close()
    }

    const unknownScene = await openScene(browser, 'account', 'account-delete-unknown', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
    try {
      await accountDeleteDialog(unknownScene.page)
      const confirmation = unknownScene.page.getByRole('dialog').getByRole('textbox')
      await confirmation.fill('УДАЛИТЬ')
      await unknownScene.page.getByRole('dialog').getByRole('button', { name: 'Удалить аккаунт', exact: true }).last().click()
      await expect(unknownScene.page.getByRole('dialog').getByRole('button', { name: /проверить удаление/i })).toBeVisible()
      await expectPhoneSurface(unknownScene.page, 'ru', '[role="dialog"] button[data-variant="destructive"]')
      await capture(unknownScene.page, 'account-delete-unknown-ru-phone.png', false)
      const recovery = unknownScene.page.getByRole('button', { name: /проверить удаление/i })
      await unknownScene.page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click()
      await expect(unknownScene.page.getByRole('dialog')).toHaveCount(0)
      await expect(recovery).toBeFocused()
    } finally {
      await unknownScene.context.close()
    }

    const failed = await openScene(browser, 'account', 'account-delete-error')
    try {
      const opener = failed.page.locator('.account-screen__delete-action').getByRole('button', { name: 'Delete account' })
      await accountDeleteDialog(failed.page)
      await failed.page.getByRole('dialog').getByRole('textbox').fill('DELETE')
      await failed.page.getByRole('dialog').getByRole('button', { name: 'Delete account', exact: true }).last().click()
      await expect(failed.page.getByRole('dialog').getByRole('alert').first()).toBeVisible()
      await capture(failed.page, 'account-delete-known-failure-en-desktop.png', false)
      await failed.page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
      await expect(failed.page.getByRole('dialog')).toHaveCount(0)
      await expect(opener).toBeFocused()
    } finally {
      await failed.context.close()
    }
  })
})

test.describe('actual Credits screen', () => {
  test('partial balance failure and unavailable packs keep independent regions honest', async ({ browser }) => {
    const balance = await openScene(browser, 'credits', 'credits-balance-unavailable')
    try {
      await expect(balance.page.getByRole('alert').first()).toBeVisible()
      await expect(balance.page.getByText('Credit packs')).toBeVisible()
      await capture(balance.page, 'credits-balance-unavailable-en-desktop.png')
    } finally {
      await balance.context.close()
    }

    const packs = await openScene(browser, 'credits', 'credits-packs-unavailable', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
    try {
      await expect(packs.page.locator('.credits-balance__numbers strong').first()).toHaveText('120')
      const packRegion = packs.page.getByRole('region', { name: 'Пакеты кредитов' })
      await expect(packRegion.getByRole('alert')).toContainText('Не удалось загрузить пакеты кредитов')
      await expect(packs.page.locator('.credits-pack-list li')).toHaveCount(0)
      await expect(packs.page.locator('.workspace-error')).toHaveCount(0)
      await expect(packs.page.getByText('Приветственные кредиты')).toBeVisible()
      await expect(packRegion.getByRole('button', { name: 'Повторить загрузку пакетов' })).toBeVisible()
      await expectPhoneSurface(packs.page, 'ru', '.credits-text-button')
      await capture(packs.page, 'credits-packs-unavailable-ru-phone.png')
      await packRegion.getByRole('button', { name: 'Повторить загрузку пакетов' }).click()
      await expect(packs.page.locator('.credits-pack-list li')).toHaveCount(1)
      await expect(packs.page.locator('.credits-balance__numbers strong').first()).toHaveText('120')
      await expect(packs.page.getByText('Приветственные кредиты')).toBeVisible()
    } finally {
      await packs.context.close()
    }
  })

  test('pending checkout and unknown start stay synthetic and do not add credits', async ({ browser }) => {
    const pending = await openScene(browser, 'credits', 'credits-checkout-pending')
    try {
      await pending.page.getByRole('button', { name: 'Start mock checkout' }).click()
      await expect(pending.page.getByText('Confirming payment')).toBeVisible()
      await expect(pending.page.getByText(/payment is collected/)).toBeVisible()
      await expect(pending.page.locator('.credits-balance__numbers strong').first()).toHaveText('120')
      await expect(pending.page.getByText('Pending purchase')).toBeVisible()
      await capture(pending.page, 'credits-pending-checkout-posted-and-pending-history-en-desktop.png')
    } finally {
      await pending.context.close()
    }

    const unknown = await openScene(browser, 'credits', 'credits-checkout-unknown', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
    try {
      await unknown.page.getByRole('button', { name: 'Начать пробную покупку' }).click()
      await expect(unknown.page.getByRole('button', { name: 'Проверить статус оплаты' })).toBeVisible()
      await expect(unknown.page.locator('.credits-balance__numbers strong').first()).toHaveText('120')
      await expectPhoneSurface(unknown.page, 'ru', '.credits-pack button')
      await capture(unknown.page, 'credits-unknown-checkout-ru-phone.png')
    } finally {
      await unknown.context.close()
    }
  })

  test('Show more exposes loading and failure retry while preserving loaded history', async ({ browser }) => {
    const loading = await openScene(browser, 'credits', 'credits-history-loading')
    try {
      await expect(loading.page.getByText('Welcome credits')).toBeVisible()
      await loading.page.getByRole('button', { name: 'Show more' }).click()
      await waitForCall(loading.page, 'credits.historyPage.older')
      await expect(loading.page.getByRole('button', { name: 'Loading older activity…' })).toBeDisabled()
      await expect(loading.page.getByText('Welcome credits')).toBeVisible()
      await capture(loading.page, 'credits-history-show-more-loading-en-desktop.png')
    } finally {
      await release(loading.page, 'credits.historyPage.older')
      await loading.context.close()
    }

    const failure = await openScene(browser, 'credits', 'credits-history-failure', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
    try {
      await failure.page.getByRole('button', { name: 'Показать ещё' }).click()
      await expect(failure.page.getByRole('alert').first()).toBeVisible()
      await expect(failure.page.getByText('Приветственные кредиты')).toBeVisible()
      await expect(failure.page.getByRole('button', { name: 'Повторить загрузку' })).toBeEnabled()
      await expectPhoneSurface(failure.page, 'ru', '.credits-history__more button')
      await capture(failure.page, 'credits-history-older-failure-ru-phone.png')
    } finally {
      await failure.context.close()
    }
  })
})

test.describe('actual Projects screen', () => {
  test('empty and full-capacity lifecycle rows render at the 767/768 breakpoint', async ({ browser }) => {
    const empty = await openScene(browser, 'projects', 'projects-empty', { viewport: { width: 767, height: 900 } })
    try {
      await expect(empty.page.getByText('No projects yet')).toBeVisible()
      await capture(empty.page, 'projects-empty-en-767.png')
    } finally {
      await empty.context.close()
    }

    const full = await openScene(browser, 'projects', 'projects-capacity', { locale: 'ru-RU', viewport: { width: 767, height: 1000 } })
    try {
      await expect(full.page.getByText('Занято мест: 6 из 6')).toBeVisible()
      await expect(full.page.getByText('Готово')).toBeVisible()
      await expect(full.page.getByText('Ошибка обработки')).toBeVisible()
      await capture(full.page, 'projects-capacity-lifecycle-ru-767.png')
      const row = full.page.locator('.project-row').first()
      const rowMenuTrigger = row.getByRole('button', { name: 'Действия проекта: Source video' })
      await expectPhoneSurface(full.page, 'ru', '.project-row-menu__trigger')
      const triggerBox = await rowMenuTrigger.boundingBox()
      expect(triggerBox?.width ?? 0).toBeGreaterThanOrEqual(48)
      expect(triggerBox?.height ?? 0).toBeGreaterThanOrEqual(48)
      await rowMenuTrigger.tap()
      const menu = full.page.getByRole('menu')
      await expect(menu).toBeVisible()
      await expect(menu.getByRole('menuitem')).toHaveCount(1)
      await expect(menu.getByRole('menuitem', { name: 'Удалить проект' })).toBeVisible()
      await capture(full.page, 'projects-row-menu-ru-767.png')
      await full.page.keyboard.press('Escape')
      await expect(rowMenuTrigger).toBeFocused()
      await rowMenuTrigger.press('ArrowDown')
      const deleteItem = menu.getByRole('menuitem', { name: 'Удалить проект' })
      await expect(deleteItem).toBeFocused()
      await deleteItem.press('Enter')
      const deleteDialog = full.page.getByRole('dialog')
      await expect(deleteDialog).toBeVisible()
      await deleteDialog.getByRole('button', { name: 'Отмена' }).click()
      await expect(rowMenuTrigger).toBeFocused()
      await expect(row.getByRole('button', { name: 'Продолжить' })).toBeVisible()
      await full.page.setViewportSize({ width: 768, height: 1000 })
      await expect(full.page.getByText('Занято мест: 6 из 6')).toBeVisible()
      await capture(full.page, 'projects-capacity-lifecycle-ru-768.png')
    } finally {
      await full.context.close()
    }
  })

  test('list loading failure offers retry without claiming rows loaded', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'projects', 'projects-list-pending')
    try {
      await waitForCall(page, 'projects.list')
      await expect(page.getByRole('status').first()).toBeVisible()
      await capture(page, 'projects-list-loading-en-desktop.png')
      await release(page, 'projects.list')
      await expect(page.getByRole('alert').first()).toBeVisible()
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
      await capture(page, 'projects-list-failure-en-desktop.png')
    } finally {
      await release(page, 'projects.list')
      await context.close()
    }
  })

  test('rename validation and save error retain the edited value; delete uncertainty is recoverable', async ({ browser }) => {
    const rename = await openScene(browser, 'projects', 'projects-rename-error')
    try {
      const row = rename.page.locator('.project-row').first()
      await row.getByRole('button', { name: /Rename project: Source video/ }).click()
      const input = row.getByRole('textbox', { name: 'Rename project' })
      await input.fill('')
      await input.press('Enter')
      await expect(input).toHaveAttribute('aria-invalid', 'true')
      await expect(row.getByText('Enter a project title.')).toBeVisible()
      await capture(rename.page, 'projects-rename-validation-en-desktop.png')
      await input.fill('Renamed draft')
      await input.press('Enter')
      await expect(row.getByRole('alert').first()).toBeVisible()
      await expect(input).toHaveValue('Renamed draft')
      await capture(rename.page, 'projects-rename-save-error-en-desktop.png')
    } finally {
      await rename.context.close()
    }

    const deletion = await openScene(browser, 'projects', 'projects-delete-unknown', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
    try {
      const row = deletion.page.locator('.project-row').first()
      await row.getByRole('button', { name: /Действия проекта/ }).click()
      await deletion.page.getByRole('menuitem', { name: 'Удалить проект' }).click()
      await expect(deletion.page.getByRole('dialog')).toBeVisible()
      await deletion.page.getByRole('dialog').getByRole('button', { name: 'Удалить проект' }).click()
      await expect(deletion.page.getByText(/Результат удаления не подтверждён/)).toBeVisible()
      await expectPhoneSurface(deletion.page, 'ru', '[role="dialog"] button[data-variant="destructive"]')
      await capture(deletion.page, 'projects-delete-unknown-ru-phone.png')
    } finally {
      await deletion.context.close()
    }

    const failedDelete = await openScene(browser, 'projects', 'projects-delete-error')
    try {
      const row = failedDelete.page.locator('.project-row').first()
      await row.getByRole('button', { name: 'Actions for Source video' }).click()
      await failedDelete.page.getByRole('menuitem', { name: 'Delete project' }).click()
      await failedDelete.page.getByRole('dialog').getByRole('button', { name: 'Delete project', exact: true }).click()
      await expect(failedDelete.page.getByRole('dialog').getByRole('alert').first()).toBeVisible()
      await capture(failedDelete.page, 'projects-delete-known-failure-en-desktop.png', false)
    } finally {
      await failedDelete.context.close()
    }
  })

  test('continue opens the selected project through the existing lifecycle route', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'projects', 'projects-resume')
    try {
      const row = page.locator('.project-row').filter({ hasText: 'Processing draft' })
      await row.getByRole('button', { name: 'Continue' }).click()
      await waitForCall(page, 'projects.open')
      await waitForCall(page, 'projects.recordOpened')
      await expect.poll(() => page.evaluate(() => window.location.pathname)).toContain('/processing')
    } finally {
      await context.close()
    }
  })
})

test.describe('actual New dub screen', () => {
  async function openLoadedNewDub(browser: Browser, scenario: string, options: { locale?: Locale; viewport?: Size } = {}) {
    const scene = await openScene(browser, 'newdub', scenario, options)
    await expect(scene.page.getByRole('heading', { name: 'Source video' })).toBeVisible()
    await scene.page.waitForFunction(() => {
      const video = document.querySelector<HTMLVideoElement>('.new-dub-preview__video')
      return Boolean(video && video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0)
    })
    return scene
  }

  test('invalid interval is explicit and both boundaries remain user-controlled on phone', async ({ browser }) => {
    const { context, page } = await openLoadedNewDub(browser, 'newdub-invalid-interval', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
    try {
      await expectPhoneSurface(page, 'ru', '.new-dub-text-button')
      const ranges = page.locator('.new-dub-range input[type="range"]')
      const startRange = ranges.nth(0)
      const endRange = ranges.nth(1)
      await expect(ranges).toHaveCount(2)
      const startRangeBox = await startRange.boundingBox()
      const endRangeBox = await endRange.boundingBox()
      expect(startRangeBox?.height ?? 0).toBeGreaterThanOrEqual(48)
      expect(endRangeBox?.height ?? 0).toBeGreaterThanOrEqual(48)
      expect((endRangeBox?.y ?? 0) - ((startRangeBox?.y ?? 0) + (startRangeBox?.height ?? 0))).toBeCloseTo(14, 2)

      const originalStart = await startRange.inputValue()
      const originalEnd = await endRange.inputValue()
      await startRange.tap({ position: { x: (startRangeBox?.width ?? 0) / 2, y: (startRangeBox?.height ?? 0) / 2 } })
      const touchedStart = Number(await startRange.inputValue())
      expect(touchedStart).not.toBe(Number(originalStart))
      await expect(endRange).toHaveValue(originalEnd)
      await endRange.tap({ position: { x: (endRangeBox?.width ?? 0) * 0.75, y: (endRangeBox?.height ?? 0) / 2 } })
      const touchedEnd = Number(await endRange.inputValue())
      expect(touchedEnd).not.toBe(Number(originalEnd))
      expect(Number(await startRange.inputValue())).toBe(touchedStart)
      expect(touchedEnd - touchedStart).toBeGreaterThanOrEqual(1_000)
      expect(touchedEnd - touchedStart).toBeLessThanOrEqual(120_000)
      await startRange.focus()
      await startRange.press('ArrowRight')
      expect(Number(await startRange.inputValue())).toBe(touchedStart + 1)
      await expect(endRange).toHaveValue(String(touchedEnd))

      const fields = page.locator('.new-dub-selection__fields input')
      const start = fields.nth(0)
      await start.fill('9.000')
      await fields.nth(1).focus()
      await expect(page.getByRole('alert').first()).toBeVisible()
      await expect(start).toHaveValue('9.000')
      await expectPhoneSurface(page, 'ru', '.new-dub-selection__fields input')
      await capture(page, 'newdub-invalid-interval-ru-phone.png')
    } finally {
      await context.close()
    }
  })

  test('insufficient balance shows the current synthetic quote without authorizing processing', async ({ browser }) => {
    const { context, page } = await openLoadedNewDub(browser, 'newdub-insufficient')
    try {
      await page.getByRole('button', { name: 'Get exact quote' }).click()
      await expect(page.getByText('The current available balance is below this quote. No processing has been authorized.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Open credits' })).toBeVisible()
      await expect(page.getByRole('button', { name: /Start processing/ })).toHaveCount(0)
      await capture(page, 'newdub-capacity-insufficient-balance-en-desktop.png')
    } finally {
      await context.close()
    }
  })

  test('source interval and loaded media remain present when quote service fails', async ({ browser }) => {
    const { context, page } = await openLoadedNewDub(browser, 'newdub-quote-error')
    try {
      await page.getByRole('button', { name: 'Get exact quote' }).click()
      await expect(page.getByRole('alert').first()).toBeVisible()
      await expect(page.locator('.new-dub-preview__video')).toBeVisible()
      await expect(page.locator('.new-dub-selection__fields input').nth(1)).toHaveValue('8.000')
      await capture(page, 'newdub-quote-service-failure-en-desktop.png')
    } finally {
      await context.close()
    }
  })

  test('expired quote is labelled stale and offers a fresh quote', async ({ browser }) => {
    const { context, page } = await openLoadedNewDub(browser, 'newdub-stale-quote')
    try {
      await page.getByRole('button', { name: 'Get exact quote' }).click()
      await expect(page.getByText('This quote is expired or no longer matches the saved source and section. Request a fresh quote.')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Refresh exact quote' })).toBeVisible()
      await capture(page, 'newdub-stale-quote-en-desktop.png')
    } finally {
      await context.close()
    }
  })

  test('compatible preview retry keeps source identity and reaches the checked-in media fixture', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'newdub', 'newdub-preview-retry')
    try {
      await expect(page.getByRole('heading', { name: 'Source video' })).toBeVisible()
      await page.waitForFunction(() => Boolean(document.querySelector<HTMLVideoElement>('.new-dub-preview__video')?.error))
      await page.getByRole('button', { name: 'Check compatible-preview availability' }).click()
      await waitForCall(page, 'previews.inspect')
      await page.getByRole('button', { name: 'Prepare compatible preview' }).click()
      await waitForCall(page, 'previews.request')
      await expect(page.getByRole('button', { name: 'Retry preview' })).toBeVisible()
      await capture(page, 'newdub-compatible-preview-retryable-error-en-desktop.png')
      await page.getByRole('button', { name: 'Retry preview' }).click()
      await waitForCall(page, 'previews.retry')
      await expect(page.getByText(/Synthetic compatible-preview simulation/)).toBeVisible()
      await page.waitForFunction(() => {
        const video = document.querySelector<HTMLVideoElement>('.new-dub-preview__video')
        return Boolean(video && video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0)
      })
      await capture(page, 'newdub-compatible-preview-ready-en-desktop.png')
    } finally {
      await context.close()
    }
  })

  test('upload validation, pending and failed transfer states retain the current source safely', async ({ browser }) => {
    const capacity = await openScene(browser, 'newdub', 'newdub-upload-capacity')
    try {
      await expect(capacity.page.getByText(/6 of 6 project slots used/)).toBeVisible()
      const chooseVideoButtons = capacity.page.getByRole('button', { name: 'Choose video' })
      await expect(chooseVideoButtons).toHaveCount(2)
      await expect(chooseVideoButtons.nth(0)).toBeDisabled()
      await expect(chooseVideoButtons.nth(1)).toBeDisabled()
      await capture(capacity.page, 'newdub-upload-capacity-full-en-desktop.png')
    } finally {
      await capacity.context.close()
    }

    const invalid = await openScene(browser, 'newdub', 'newdub-upload-validation')
    try {
      await invalid.page.locator('input[type="file"][aria-label="Choose video"]').setInputFiles(resolve(process.cwd(), 'public/media/no-audio-track.mp4'))
      await expect(invalid.page.getByRole('alert').first()).toBeVisible()
      await capture(invalid.page, 'newdub-upload-local-validation-error-en-desktop.png')
    } finally {
      await invalid.context.close()
    }

    const pending = await openScene(browser, 'newdub', 'newdub-upload-pending')
    try {
      await pending.page.locator('input[type="file"][aria-label="Choose video"]').setInputFiles(resolve(process.cwd(), 'public/media/source-dialogue.mp4'))
      const candidateAction = pending.page.locator('.new-dub-candidate button')
      await expect(candidateAction).toBeVisible()
      await candidateAction.click()
      await waitForCall(pending.page, 'uploads.commitInitial')
      await capture(pending.page, 'newdub-upload-pending-en-desktop.png')
    } finally {
      await release(pending.page, 'uploads.commitInitial')
      await pending.context.close()
    }

    const failed = await openLoadedNewDub(browser, 'newdub-replace-error')
    try {
      await failed.page.locator('input[type="file"][aria-label="Replace video"]').setInputFiles(resolve(process.cwd(), 'public/media/valid-silence.mp4'))
      const candidateAction = failed.page.locator('.new-dub-candidate button')
      await expect(candidateAction).toBeVisible()
      await candidateAction.click()
      await expect(failed.page.getByRole('alert').first()).toBeVisible()
      await expect(failed.page.locator('#new-dub-saved-title')).toHaveText('Source video')
      await expect(failed.page.locator('.new-dub-preview__video')).toBeVisible()
      await capture(failed.page, 'newdub-replacement-failure-original-source-preserved-en-desktop.png')
    } finally {
      await failed.context.close()
    }
  })
})

test.afterAll(() => {
  writeFileSync(resolve(evidenceDir, 'visual-checks.json'), `${JSON.stringify(reviewedFacts, null, 2)}\n`, 'utf8')
})
