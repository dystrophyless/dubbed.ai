import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'

type Locale = 'en' | 'ru'
type Scenario =
  | 'queued'
  | 'running-unknown'
  | 'running-known'
  | 'retry-failure'
  | 'zero-turn-initial'
  | 'zero-turn-prior'
  | 'cancellation-quote'
  | 'cancellation-expired-refresh'
  | 'cancellation-quote-same-operation'
  | 'cancellation-quote-reconcile-first'
  | 'cancellation-quote-no-retry'
  | 'cancellation-pending'

interface HarnessSnapshot {
  scenario: Scenario
  resolveCalls: number
  operationResolveCalls: number
  observeCalls: number
  quoteCalls: Array<{ quoteId: string | null; operationId: string }>
  cancelCalls: Array<{ cancellationQuoteId: string; operationId: string; explicitConfirmation: true }>
  activationCalls: number
  navigateCalls: number
  localePreference: Locale
}

declare global {
  interface Window {
    __processingHarness?: {
      snapshot(): HarnessSnapshot
      resolveCancellationAsUnknown(): void
    }
  }
}

const repoEvidenceDir = resolve(process.cwd(), '../_docs/evidence/frontend-implementation-2026-10-23/processing-ui')
const phase = process.env.PROCESSING_EVIDENCE_PHASE ?? 'after'
const metricsFile = resolve(repoEvidenceDir, `metrics-${phase}.jsonl`)
const expectedProgressHeight = process.env.PROCESSING_EXPECTED_PROGRESS_HEIGHT ?? '4px'
const expectedDialogRadius = process.env.PROCESSING_EXPECTED_DIALOG_RADIUS ?? '10px'

const viewports = {
  desktop: { width: 1440, height: 900 },
  phone: { width: 390, height: 844 },
  belowBreakpoint: { width: 767, height: 900 },
  atBreakpoint: { width: 768, height: 900 },
} as const

const text: Record<Locale, {
  title: string
  check: string
  stage: string
  cancel: string
  cancelTitle: string
  charge4: string
  charge3: string
  release4: string
  release5: string
  expired: string
  retryLoading: string
  confirmCancel: string
  stay: string
  pendingCancel: string
  checkCancel: string
  quoteUnavailable: string
  failed: string
  queued: string
  analyzing: string
  failedStage: string
  complete: string
  noDialogue: string
  priorRetained: string
  includedRetry: string
}> = {
  en: {
    title: 'Preparing your scene',
    check: 'Check status',
    stage: 'Current stage',
    cancel: 'Cancel preparation',
    cancelTitle: 'Cancel this preparation?',
    charge4: 'Exact charge: 4 credits.',
    charge3: 'Exact charge: 3 credits.',
    release4: '4 reserved credits will be released.',
    release5: '5 reserved credits will be released.',
    expired: 'This quote expired. Request a new quote before confirming cancellation.',
    retryLoading: 'Retry loading',
    confirmCancel: 'Confirm cancellation',
    stay: 'Stay',
    pendingCancel: 'Cancelling…',
    checkCancel: 'Check cancellation status',
    quoteUnavailable: 'The cancellation quote could not be confirmed. Check its status before trying again.',
    failed: 'Preparation failed. The saved result and retry availability are shown by this service state.',
    queued: 'Queued',
    analyzing: 'Analyzing audio',
    failedStage: 'Processing failed',
    complete: 'Complete',
    noDialogue: 'No dialogue found. This run completed without creating recording turns.',
    priorRetained: 'The previous preparation and its saved draft remain available.',
    includedRetry: 'An included retry is available.',
  },
  ru: {
    title: 'Подготавливаем сцену',
    check: 'Проверить статус',
    stage: 'Текущий этап',
    cancel: 'Отменить подготовку',
    cancelTitle: 'Отменить эту подготовку?',
    charge4: 'Точное списание: 4 кредитов.',
    charge3: 'Точное списание: 3 кредитов.',
    release4: 'Будет освобождено 4 зарезервированных кредитов.',
    release5: 'Будет освобождено 5 зарезервированных кредитов.',
    expired: 'Расчёт устарел. Запросите новый перед подтверждением отмены.',
    retryLoading: 'Повторить загрузку',
    confirmCancel: 'Подтвердить отмену',
    stay: 'Остаться',
    pendingCancel: 'Отменяем…',
    checkCancel: 'Проверить отмену',
    quoteUnavailable: 'Не удалось подтвердить расчёт отмены. Проверьте его статус перед новой попыткой.',
    failed: 'Подготовка не удалась. Результат и доступность повтора указаны по состоянию сервиса.',
    queued: 'В очереди',
    analyzing: 'Анализ аудио',
    failedStage: 'Не удалось обработать',
    complete: 'Завершено',
    noDialogue: 'Реплики не найдены. Обработка завершилась без создания реплик для записи.',
    priorRetained: 'Предыдущая подготовка и сохранённый черновик по-прежнему доступны.',
    includedRetry: 'Доступен включённый повтор.',
  },
}

const staticScenarios: Array<{ scenario: Scenario; stage: (locale: Locale) => string }> = [
  { scenario: 'queued', stage: (locale) => text[locale].queued },
  { scenario: 'running-unknown', stage: (locale) => text[locale].analyzing },
  { scenario: 'running-known', stage: (locale) => text[locale].analyzing },
  { scenario: 'retry-failure', stage: (locale) => text[locale].failedStage },
  { scenario: 'zero-turn-initial', stage: (locale) => text[locale].complete },
  { scenario: 'zero-turn-prior', stage: (locale) => text[locale].complete },
]

async function openHarness(page: Page, scenario: Scenario, locale: Locale, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport)
  await page.goto(`/e2e/harness/processing.html?scenario=${scenario}&locale=${locale}`)
  await expect(page.getByRole('heading', { name: text[locale].title })).toBeVisible()
  const fonts = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 16px "Mabry Pro"'),
      document.fonts.load('500 16px "Mabry Pro"'),
    ])
    return {
      regular: document.fonts.check('400 16px "Mabry Pro"'),
      medium: document.fonts.check('500 16px "Mabry Pro"'),
      resources: performance.getEntriesByType('resource').map((entry) => entry.name),
    }
  })
  expect(fonts.regular, 'Mabry Pro regular face must be loaded before capture').toBe(true)
  expect(fonts.medium, 'Mabry Pro medium face must be loaded before capture').toBe(true)
  expect(fonts.resources.some((url) => url.endsWith('/fonts/MabryPro-Regular.woff2'))).toBe(true)
  expect(fonts.resources.some((url) => url.endsWith('/fonts/MabryPro-Medium.woff2'))).toBe(true)
  await expect.poll(() => page.evaluate(() => window.__processingHarness?.snapshot().resolveCalls)).toBe(1)
  return fonts.resources
}

async function harnessSnapshot(page: Page): Promise<HarnessSnapshot> {
  const result = await page.evaluate(() => window.__processingHarness?.snapshot())
  if (!result) throw new Error('The controlled ProcessingScreen harness did not publish its call journal.')
  return result
}

async function capture(page: Page, name: string, locale: Locale, viewportName: string, resources: string[]) {
  await page.waitForTimeout(220)
  const metrics = await page.evaluate(() => {
    const visible = (element: Element) => element.getClientRects().length > 0
    const progress = document.querySelector<HTMLElement>('.processing-progress__track')
    const dialog = document.querySelector<HTMLElement>('.processing-dialog')
    const heading = document.querySelector<HTMLElement>('.processing-page .workspace-heading')
    const actions = dialog?.querySelector<HTMLElement>('.processing-dialog__actions')
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      overflowingElements: Array.from(document.body.querySelectorAll<HTMLElement>('*')).flatMap((element) => {
        const rect = element.getBoundingClientRect()
        if (rect.right <= window.innerWidth + 1 && rect.left >= -1) return []
        return [{
          tagName: element.tagName,
          className: typeof element.className === 'string' ? element.className : '',
          text: element.textContent?.trim().slice(0, 120) ?? '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        }]
      }),
      bodyFont: getComputedStyle(document.body).fontFamily,
      loadedMabryRegular: document.fonts.check('400 16px "Mabry Pro"'),
      loadedMabryMedium: document.fonts.check('500 16px "Mabry Pro"'),
      activeElement: active ? { tagName: active.tagName, text: active.textContent?.trim() ?? '' } : null,
      focus: active ? {
        outlineStyle: getComputedStyle(active).outlineStyle,
        outlineWidth: getComputedStyle(active).outlineWidth,
        outlineColor: getComputedStyle(active).outlineColor,
      } : null,
      headingFlexDirection: heading ? getComputedStyle(heading).flexDirection : null,
      progressBarHeight: progress ? getComputedStyle(progress).height : null,
      progressBarValue: progress?.getAttribute('aria-valuenow') ?? null,
      dialog: dialog && visible(dialog) ? {
        borderRadius: getComputedStyle(dialog).borderRadius,
        width: Math.round(dialog.getBoundingClientRect().width),
        height: Math.round(dialog.getBoundingClientRect().height),
        actionsFlexDirection: actions ? getComputedStyle(actions).flexDirection : null,
        actionButtons: Array.from(actions?.querySelectorAll('button') ?? []).map((button) => ({
          label: button.textContent?.trim() ?? '',
          height: Math.round(button.getBoundingClientRect().height),
          width: Math.round(button.getBoundingClientRect().width),
          flexBasis: getComputedStyle(button).flexBasis,
          disabled: button.disabled,
        })),
      } : null,
      visibleButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('.ui-button')).filter(visible).map((button) => ({
        label: button.textContent?.trim() ?? '',
        height: Math.round(button.getBoundingClientRect().height),
        width: Math.round(button.getBoundingClientRect().width),
        disabled: button.disabled,
        whiteSpace: getComputedStyle(button).whiteSpace,
        overflowX: getComputedStyle(button).overflowX,
        flexWrap: getComputedStyle(button).flexWrap,
        minWidth: getComputedStyle(button).minWidth,
        clientWidth: button.clientWidth,
        scrollWidth: button.scrollWidth,
        icons: Array.from(button.querySelectorAll<SVGSVGElement>('svg')).map((icon) => {
          const rect = icon.getBoundingClientRect()
          const style = getComputedStyle(icon)
          return {
            width: Number(rect.width.toFixed(2)),
            height: Number(rect.height.toFixed(2)),
            cssWidth: style.width,
            cssHeight: style.height,
            flexShrink: style.flexShrink,
          }
        }),
        textLines: (() => {
          const range = document.createRange()
          range.selectNodeContents(button)
          return Array.from(range.getClientRects()).map((rect) => ({
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          }))
        })(),
      })),
    }
  })

  const relativePath = `_docs/evidence/frontend-implementation-2026-10-23/processing-ui/${phase}/${name}.png`
  const imagePath = resolve(repoEvidenceDir, phase, `${name}.png`)
  await mkdir(resolve(repoEvidenceDir, phase), { recursive: true })
  await page.screenshot({ path: imagePath, fullPage: true, animations: 'disabled' })
  const record = {
    capturedAt: new Date().toISOString(),
    phase,
    name,
    locale,
    viewportName,
    syntheticServiceFactsOnly: true,
    backendOrQueueCalled: false,
    mediaOrMicrophoneUsed: false,
    screenshot: relativePath,
    fontResources: resources.filter((url) => url.endsWith('.woff2')),
    ...metrics,
  }
  await appendFile(metricsFile, `${JSON.stringify(record)}\n`, 'utf8')

  expect(metrics.document.scrollWidth, 'rendered screen must not overflow horizontally').toBeLessThanOrEqual(metrics.document.clientWidth)
  expect(metrics.loadedMabryRegular).toBe(true)
  expect(metrics.loadedMabryMedium).toBe(true)
  if (metrics.progressBarHeight) expect(metrics.progressBarHeight).toBe(expectedProgressHeight)
  if (metrics.dialog) expect(metrics.dialog.borderRadius).toBe(expectedDialogRadius)
  if (metrics.viewport.width === 390) {
    expect(metrics.visibleButtons.length).toBeGreaterThan(0)
    expect(metrics.visibleButtons.every((button) => button.height >= 48), 'all visible phone controls must meet the 48px target').toBe(true)
  }
  if (metrics.viewport.width === 767 || metrics.viewport.width === 768) {
    expect(metrics.headingFlexDirection).toBe(metrics.viewport.width === 767 ? 'column' : 'row')
    if (metrics.dialog) {
      const expectedBasis = metrics.viewport.width === 767 ? '100%' : 'auto'
      expect(metrics.dialog.actionButtons.every((button) => button.flexBasis === expectedBasis)).toBe(true)
    }
  }
  return metrics
}

async function expectLocalizedStage(page: Page, locale: Locale, label: string) {
  await expect(page.getByText(text[locale].stage, { exact: true })).toBeVisible()
  await expect(page.getByText(label, { exact: true })).toBeVisible()
}

const locales: Locale[] = ['en', 'ru']

test.beforeAll(async () => {
  await mkdir(repoEvidenceDir, { recursive: true })
  await writeFile(metricsFile, '', 'utf8')
})

test.describe('Issue #74 real ProcessingScreen rendering and interaction evidence', () => {
  test.describe.configure({ mode: 'serial' })

  for (const entry of staticScenarios) {
    for (const locale of locales) {
      for (const [viewportName, viewport] of Object.entries({ desktop: viewports.desktop, phone: viewports.phone })) {
        test(`${entry.scenario} ${locale} ${viewportName}`, async ({ page }) => {
          const resources = await openHarness(page, entry.scenario, locale, viewport)
          await expectLocalizedStage(page, locale, entry.stage(locale))
          const snapshot = await harnessSnapshot(page)
          expect(snapshot.scenario).toBe(entry.scenario)
          expect(snapshot.activationCalls).toBe(0)
          expect(snapshot.navigateCalls).toBe(0)

          if (entry.scenario === 'queued' || entry.scenario === 'running-unknown') {
            await expect(page.getByText(locale === 'en' ? 'Preparation is in progress.' : 'Подготовка выполняется.')).toBeVisible()
            await expect(page.getByRole('progressbar')).toHaveCount(0)
          }
          if (entry.scenario === 'running-known') {
            await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '48')
            await expect(page.getByText('48%', { exact: true })).toBeVisible()
          }
          if (entry.scenario === 'retry-failure') {
            await expect(page.getByText(text[locale].failed, { exact: true })).toBeVisible()
            await expect(page.getByText(text[locale].includedRetry, { exact: true })).toBeVisible()
            await expect(page.getByRole('button', { name: locale === 'en' ? 'Review this project' : 'Проверить проект' })).toBeVisible()
          }
          if (entry.scenario === 'zero-turn-initial' || entry.scenario === 'zero-turn-prior') {
            await expect(page.getByText(text[locale].noDialogue, { exact: true })).toBeVisible()
            const retryButton = page.getByRole('button', { name: locale === 'en' ? 'Review the quote and try this section again' : 'Проверить стоимость и повторить для этого фрагмента' })
            await expect(retryButton).toBeVisible()
            if (entry.scenario === 'zero-turn-initial' && locale === 'ru' && viewportName === 'phone') {
              const icon = await retryButton.locator('svg').evaluate((element) => {
                const rect = element.getBoundingClientRect()
                return {
                  width: rect.width,
                  height: rect.height,
                  flexShrink: getComputedStyle(element).flexShrink,
                }
              })
              expect(icon).toEqual({ width: 16, height: 16, flexShrink: '0' })
            }
            if (entry.scenario === 'zero-turn-initial') {
              await expect(page.getByText(text[locale].includedRetry, { exact: true })).toBeVisible()
              await expect(page.getByText(text[locale].priorRetained, { exact: true })).toHaveCount(0)
            } else {
              await expect(page.getByText(text[locale].priorRetained, { exact: true })).toBeVisible()
            }
          }

          await capture(page, `${entry.scenario}-${locale}-${viewportName}`, locale, viewportName, resources)
        })
      }
    }
  }

  for (const locale of locales) {
    for (const viewportName of ['belowBreakpoint', 'atBreakpoint'] as const) {
      test(`running-known ${locale} ${viewportName} responsive boundary`, async ({ page }) => {
        const resources = await openHarness(page, 'running-known', locale, viewports[viewportName])
        await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '48')
        const metrics = await capture(page, `running-known-${locale}-${viewportName}`, locale, viewportName, resources)
        expect(metrics.headingFlexDirection).toBe(viewportName === 'belowBreakpoint' ? 'column' : 'row')
      })
    }
  }

  for (const locale of locales) {
    for (const viewportName of ['desktop', 'phone', 'belowBreakpoint', 'atBreakpoint'] as const) {
      test(`cancellation quote ${locale} ${viewportName}`, async ({ page }) => {
        const resources = await openHarness(page, 'cancellation-quote', locale, viewports[viewportName])
        await page.getByRole('button', { name: text[locale].cancel }).click()
        const dialog = page.getByRole('dialog', { name: text[locale].cancelTitle })
        await expect(dialog).toBeVisible()
        await expect(dialog.getByText(text[locale].charge4, { exact: true })).toBeVisible()
        await expect(dialog.getByText(text[locale].release4, { exact: true })).toBeVisible()
        const snapshot = await harnessSnapshot(page)
        expect(snapshot.quoteCalls).toHaveLength(1)
        expect(snapshot.cancelCalls).toHaveLength(0)
        await capture(page, `cancellation-quote-${locale}-${viewportName}`, locale, viewportName, resources)
      })
    }
  }

  for (const locale of locales) {
    for (const viewportName of ['desktop', 'phone'] as const) {
      test(`expired quote refresh and explicit cancellation confirmation ${locale} ${viewportName}`, async ({ page }) => {
        const resources = await openHarness(page, 'cancellation-expired-refresh', locale, viewports[viewportName])
        await page.getByRole('button', { name: text[locale].cancel }).click()
        const dialog = page.getByRole('dialog', { name: text[locale].cancelTitle })
        await expect(dialog.getByText(text[locale].charge3, { exact: true })).toBeVisible()
        await capture(page, `cancellation-expired-quote-${locale}-${viewportName}`, locale, viewportName, resources)

        await dialog.getByRole('button', { name: text[locale].confirmCancel }).click()
        await expect(dialog.getByText(text[locale].expired, { exact: true })).toBeVisible()
        await expect(dialog.getByRole('button', { name: text[locale].retryLoading })).toBeEnabled()
        let snapshot = await harnessSnapshot(page)
        expect(snapshot.cancelCalls).toHaveLength(0)
        expect(snapshot.quoteCalls).toHaveLength(1)
        await capture(page, `cancellation-expired-warning-${locale}-${viewportName}`, locale, viewportName, resources)

        await dialog.getByRole('button', { name: text[locale].retryLoading }).click()
        await expect(dialog.getByText(text[locale].charge4, { exact: true })).toBeVisible()
        snapshot = await harnessSnapshot(page)
        expect(snapshot.quoteCalls).toHaveLength(2)
        expect(snapshot.quoteCalls[0].quoteId).not.toBe(snapshot.quoteCalls[1].quoteId)
        expect(snapshot.cancelCalls).toHaveLength(0)
        await capture(page, `cancellation-refreshed-quote-${locale}-${viewportName}`, locale, viewportName, resources)

        await dialog.getByRole('button', { name: text[locale].confirmCancel }).click()
        await expect(dialog.getByRole('alert')).toBeVisible()
        snapshot = await harnessSnapshot(page)
        expect(snapshot.cancelCalls).toHaveLength(1)
        expect(snapshot.cancelCalls[0]).toEqual(expect.objectContaining({
          cancellationQuoteId: snapshot.quoteCalls[1].quoteId,
          explicitConfirmation: true,
        }))
        expect(snapshot.navigateCalls).toBe(0)
        await capture(page, `cancellation-failure-${locale}-${viewportName}`, locale, viewportName, resources)
      })
    }
  }

  for (const locale of locales) {
    for (const viewportName of ['desktop', 'phone'] as const) {
      test(`pending cancellation stays unresolved and requires status reconciliation ${locale} ${viewportName}`, async ({ page }) => {
        const resources = await openHarness(page, 'cancellation-pending', locale, viewports[viewportName])
        await page.getByRole('button', { name: text[locale].cancel }).click()
        const dialog = page.getByRole('dialog', { name: text[locale].cancelTitle })
        await expect(dialog.getByText(text[locale].charge4, { exact: true })).toBeVisible()
        await dialog.getByRole('button', { name: text[locale].confirmCancel }).click()
        const pendingButton = dialog.getByRole('button', { name: text[locale].pendingCancel })
        await expect(pendingButton).toBeVisible()
        await expect(pendingButton).toBeDisabled()
        let snapshot = await harnessSnapshot(page)
        expect(snapshot.cancelCalls).toHaveLength(1)
        expect(snapshot.cancelCalls[0].explicitConfirmation).toBe(true)
        await capture(page, `cancellation-pending-${locale}-${viewportName}`, locale, viewportName, resources)

        await page.evaluate(() => window.__processingHarness?.resolveCancellationAsUnknown())
        await expect(dialog.getByText(text[locale].quoteUnavailable, { exact: true })).toBeVisible()
        await expect(dialog.getByRole('button', { name: text[locale].checkCancel })).toBeEnabled()
        await dialog.getByRole('button', { name: text[locale].checkCancel }).click()
        snapshot = await harnessSnapshot(page)
        expect(snapshot.navigateCalls).toBe(0)
        await expect(dialog).toBeVisible()
        await capture(page, `cancellation-unknown-${locale}-${viewportName}`, locale, viewportName, resources)
      })
    }
  }

  const quoteRecoveryCases = [
    { scenario: 'cancellation-quote-same-operation' as const, locale: 'en' as const, viewportName: 'desktop' as const },
    { scenario: 'cancellation-quote-same-operation' as const, locale: 'ru' as const, viewportName: 'phone' as const },
    { scenario: 'cancellation-quote-reconcile-first' as const, locale: 'en' as const, viewportName: 'phone' as const },
    { scenario: 'cancellation-quote-reconcile-first' as const, locale: 'ru' as const, viewportName: 'desktop' as const },
    { scenario: 'cancellation-quote-no-retry' as const, locale: 'en' as const, viewportName: 'desktop' as const },
    { scenario: 'cancellation-quote-no-retry' as const, locale: 'ru' as const, viewportName: 'phone' as const },
  ]

  for (const entry of quoteRecoveryCases) {
    test(`${entry.scenario} recovery follows the service directive ${entry.locale} ${entry.viewportName}`, async ({ page }) => {
      const resources = await openHarness(page, entry.scenario, entry.locale, viewports[entry.viewportName])
      await page.getByRole('button', { name: text[entry.locale].cancel }).click()
      const dialog = page.getByRole('dialog', { name: text[entry.locale].cancelTitle })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('alert')).toBeVisible()
      let snapshot = await harnessSnapshot(page)
      expect(snapshot.quoteCalls).toHaveLength(1)
      expect(snapshot.quoteCalls[0].quoteId).toBeNull()
      expect(snapshot.cancelCalls).toHaveLength(0)

      if (entry.scenario === 'cancellation-quote-same-operation') {
        const retry = dialog.getByRole('button', { name: text[entry.locale].retryLoading })
        await expect(retry).toBeEnabled()
        await capture(page, `quote-same-operation-failure-${entry.locale}-${entry.viewportName}`, entry.locale, entry.viewportName, resources)

        await retry.click()
        await expect(dialog.getByText(text[entry.locale].charge4, { exact: true })).toBeVisible()
        snapshot = await harnessSnapshot(page)
        expect(snapshot.quoteCalls).toHaveLength(2)
        expect(snapshot.quoteCalls[1].operationId).toBe(snapshot.quoteCalls[0].operationId)
        expect(snapshot.quoteCalls[1].quoteId).not.toBeNull()
        expect(snapshot.cancelCalls).toHaveLength(0)
        await capture(page, `quote-same-operation-recovered-${entry.locale}-${entry.viewportName}`, entry.locale, entry.viewportName, resources)

        await dialog.getByRole('button', { name: text[entry.locale].confirmCancel }).click()
        await expect(dialog.getByRole('alert')).toBeVisible()
        snapshot = await harnessSnapshot(page)
        expect(snapshot.cancelCalls).toHaveLength(1)
        expect(snapshot.cancelCalls[0]).toEqual(expect.objectContaining({
          cancellationQuoteId: snapshot.quoteCalls[1].quoteId,
          explicitConfirmation: true,
        }))
        expect(snapshot.navigateCalls).toBe(0)
      } else if (entry.scenario === 'cancellation-quote-reconcile-first') {
        const checkStatus = dialog.getByRole('button', { name: text[entry.locale].checkCancel })
        await expect(checkStatus).toBeEnabled()
        await capture(page, `quote-reconcile-first-unresolved-${entry.locale}-${entry.viewportName}`, entry.locale, entry.viewportName, resources)

        await checkStatus.click()
        await expect(dialog.getByText(text[entry.locale].charge4, { exact: true })).toBeVisible()
        snapshot = await harnessSnapshot(page)
        expect(snapshot.operationResolveCalls).toBe(1)
        expect(snapshot.quoteCalls).toHaveLength(2)
        expect(snapshot.quoteCalls[1].operationId).toBe(snapshot.quoteCalls[0].operationId)
        expect(snapshot.quoteCalls[1].quoteId).not.toBeNull()
        expect(snapshot.cancelCalls).toHaveLength(0)
        await capture(page, `quote-reconcile-first-recovered-${entry.locale}-${entry.viewportName}`, entry.locale, entry.viewportName, resources)

        await dialog.getByRole('button', { name: text[entry.locale].confirmCancel }).click()
        await expect(dialog.getByRole('alert')).toBeVisible()
        snapshot = await harnessSnapshot(page)
        expect(snapshot.cancelCalls).toHaveLength(1)
        expect(snapshot.cancelCalls[0]).toEqual(expect.objectContaining({
          cancellationQuoteId: snapshot.quoteCalls[1].quoteId,
          explicitConfirmation: true,
        }))
        expect(snapshot.navigateCalls).toBe(0)
      } else {
        await expect(dialog.getByRole('button', { name: text[entry.locale].retryLoading })).toHaveCount(0)
        await expect(dialog.getByRole('button', { name: text[entry.locale].confirmCancel })).toBeDisabled()
        await expect(dialog.getByRole('button', { name: text[entry.locale].stay })).toBeEnabled()
        expect(snapshot.operationResolveCalls).toBe(0)
        expect(snapshot.cancelCalls).toHaveLength(0)
        await capture(page, `quote-no-retry-${entry.locale}-${entry.viewportName}`, entry.locale, entry.viewportName, resources)
      }
    })
  }

  for (const locale of locales) {
    test(`keyboard focus, modal containment and focus return ${locale} phone`, async ({ page }) => {
      const resources = await openHarness(page, 'running-unknown', locale, viewports.phone)
      await page.keyboard.press('Tab')
      const checkButton = page.getByRole('button', { name: text[locale].check })
      await expect(checkButton).toBeFocused()
      let focus = await checkButton.evaluate((element) => ({
        outlineStyle: getComputedStyle(element).outlineStyle,
        outlineWidth: getComputedStyle(element).outlineWidth,
        outlineColor: getComputedStyle(element).outlineColor,
      }))
      expect(focus).toEqual({ outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgb(0, 96, 226)' })
      await capture(page, `keyboard-focus-${locale}-phone`, locale, 'phone', resources)

      await page.keyboard.press('Tab')
      const cancelButton = page.getByRole('button', { name: text[locale].cancel })
      await expect(cancelButton).toBeFocused()
      await page.keyboard.press('Enter')
      const dialog = page.getByRole('dialog', { name: text[locale].cancelTitle })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText(text[locale].charge4, { exact: true })).toBeVisible()
      await expect.poll(() => dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
      await page.keyboard.press('Tab')
      const stayButton = dialog.getByRole('button', { name: text[locale].stay })
      await expect(stayButton).toBeFocused()
      focus = await stayButton.evaluate((element) => ({
        outlineStyle: getComputedStyle(element).outlineStyle,
        outlineWidth: getComputedStyle(element).outlineWidth,
        outlineColor: getComputedStyle(element).outlineColor,
      }))
      expect(focus).toEqual({ outlineStyle: 'solid', outlineWidth: '2px', outlineColor: 'rgb(0, 96, 226)' })
      await capture(page, `keyboard-dialog-focus-${locale}-phone`, locale, 'phone', resources)

      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(cancelButton).toBeFocused()

      await page.keyboard.press('Enter')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText(text[locale].charge4, { exact: true })).toBeVisible()
      await dialog.getByRole('button', { name: text[locale].confirmCancel }).click()
      await expect(dialog.getByRole('alert')).toBeVisible()
      const stayAfterFailure = dialog.getByRole('button', { name: text[locale].stay })
      await expect(stayAfterFailure).toBeEnabled()
      await capture(page, `keyboard-cancellation-failure-${locale}-phone`, locale, 'phone', resources)
      await stayAfterFailure.click()
      await expect(dialog).toHaveCount(0)
      await expect(cancelButton).toBeFocused()
    })
  }
})
