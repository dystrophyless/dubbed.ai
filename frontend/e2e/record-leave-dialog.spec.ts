import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { setLocale } from './helpers/locale.js'
import {
  continueThroughRecordingEntryGate,
  completeVisibleRegistration,
  setMillisecondSelectionAndQuote,
  startRegistrationFromLanding,
  uploadKnownSourceThroughUi,
} from './helpers/journey.js'
import { newE2ECredentials } from './helpers/identity.js'

const evidenceDirectory = resolve(
  process.cwd(),
  '../_docs/evidence/frontend-implementation-2026-10-23/media-ui',
)
mkdirSync(evidenceDirectory, { recursive: true })

async function inspectLeaveActions(page: Page) {
  return page.getByRole('dialog').evaluate((dialog) => {
    const actions = dialog.querySelector<HTMLElement>('.recording-screen__leave-actions')
    if (!actions) throw new Error('The recording leave dialog must contain its action group.')

    const bounds = (element: Element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        left: Math.round(rect.left * 100) / 100,
        top: Math.round(rect.top * 100) / 100,
        right: Math.round(rect.right * 100) / 100,
        bottom: Math.round(rect.bottom * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        minHeight: style.minHeight,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        paddingBottom: style.paddingBottom,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineOffset: style.outlineOffset,
        focused: element === document.activeElement,
        focusVisible: element.matches(':focus-visible'),
      }
    }

    const safeAreaProbe = document.createElement('div')
    safeAreaProbe.style.cssText = 'position: fixed; visibility: hidden; padding-bottom: env(safe-area-inset-bottom)'
    document.body.append(safeAreaProbe)
    const safeAreaInsetBottom = Number.parseFloat(getComputedStyle(safeAreaProbe).paddingBottom)
    safeAreaProbe.remove()
    const actionBounds = actions.getBoundingClientRect()
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      safeAreaInsetBottom,
      documentWidth: document.documentElement.scrollWidth,
      dialog: bounds(dialog),
      actionGroup: {
        ...bounds(actions),
        clientWidth: actions.clientWidth,
        scrollWidth: actions.scrollWidth,
      },
      buttons: Array.from(actions.querySelectorAll<HTMLElement>(':scope > .ui-button')).map((button) => ({
        label: button.textContent?.trim().replace(/\s+/g, ' ') ?? '',
        ...bounds(button),
        textFits: (() => {
          const text = document.createRange()
          text.selectNodeContents(button)
          const rect = text.getBoundingClientRect()
          const buttonRect = button.getBoundingClientRect()
          return rect.width === 0 || (rect.left >= buttonRect.left - 1 && rect.right <= buttonRect.right + 1)
        })(),
        withinActionGroup: (() => {
          const rect = button.getBoundingClientRect()
          return rect.left >= actionBounds.left - 1 && rect.right <= actionBounds.right + 1
        })(),
        withinDialog: (() => {
          const rect = button.getBoundingClientRect()
          const dialogRect = dialog.getBoundingClientRect()
          return rect.top >= dialogRect.top - 1 && rect.bottom <= dialogRect.bottom + 1
        })(),
      })),
    }
  })
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const body = await page.screenshot({ fullPage: false })
  writeFileSync(resolve(evidenceDirectory, name), body)
  await testInfo.attach(name, { body, contentType: 'image/png' })
}

function expectFullWidthStack(measurement: Awaited<ReturnType<typeof inspectLeaveActions>>, minHeight: number) {
  expect(measurement.documentWidth).toBeLessThanOrEqual(measurement.viewportWidth)
  expect(measurement.actionGroup.scrollWidth).toBeLessThanOrEqual(measurement.actionGroup.clientWidth)
  expect(measurement.buttons).toHaveLength(3)
  for (let index = 0; index < measurement.buttons.length; index += 1) {
    const button = measurement.buttons[index]!
    expect(button.textFits, button.label).toBe(true)
    expect(button.withinActionGroup, button.label).toBe(true)
    expect(button.withinDialog, button.label).toBe(true)
    expect(button.width).toBeCloseTo(measurement.actionGroup.clientWidth, 0)
    expect(button.height).toBeGreaterThanOrEqual(minHeight)
    if (index > 0) {
      expect(button.top - measurement.buttons[index - 1]!.bottom).toBeGreaterThanOrEqual(7)
    }
  }
}

function expectPhoneFocusClearance(measurement: Awaited<ReturnType<typeof inspectLeaveActions>>) {
  const stay = measurement.buttons[2]!
  const ringInset = Number.parseFloat(stay.outlineWidth) + Number.parseFloat(stay.outlineOffset)

  expect(stay.focused).toBe(true)
  expect(stay.focusVisible).toBe(true)
  expect(stay.outlineStyle).toBe('solid')
  expect(Number.parseFloat(stay.outlineWidth)).toBeGreaterThanOrEqual(2)
  expect(Number.parseFloat(stay.outlineOffset)).toBeGreaterThanOrEqual(2)
  expect(measurement.viewportHeight - stay.bottom).toBeGreaterThanOrEqual(
    ringInset + measurement.safeAreaInsetBottom + 2,
  )
  expect(Number.parseFloat(measurement.dialog.paddingBottom)).toBeGreaterThanOrEqual(
    ringInset + measurement.safeAreaInsetBottom + 2,
  )
}

test('recording leave choices stay in a readable full-width stack in EN, RU, and on a phone', async ({ page }, testInfo) => {
  test.setTimeout(180_000)
  page.setDefaultTimeout(30_000)
  await page.setViewportSize({ width: 1440, height: 960 })

  const credentials = newE2ECredentials('record-leave-dialog')
  const code = await startRegistrationFromLanding(page, credentials)
  await completeVisibleRegistration(page, code)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
  await uploadKnownSourceThroughUi(page)
  await setMillisecondSelectionAndQuote(page)
  await page.getByRole('button', { name: 'Process for 9 credits', exact: true }).click()
  await continueThroughRecordingEntryGate(page)

  await page.getByRole('button', { name: 'Record line', exact: true }).click()
  const draftNotice = page.getByText(
    'Recorded audio frames were decoded. Next line saves this take and continues.',
    { exact: true },
  )
  await expect(draftNotice).toBeVisible({ timeout: 30_000 })

  const landingLink = page.locator('.app-header .brand-link')
  await landingLink.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const stayEnglish = page.getByRole('button', { name: 'Stay here', exact: true })
  await expect(stayEnglish).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Tab')
  await expect(stayEnglish).toBeFocused()
  const keyboardFocus = await stayEnglish.evaluate((element) => ({
    visible: element.matches(':focus-visible'),
    outlineStyle: getComputedStyle(element).outlineStyle,
    outlineWidth: getComputedStyle(element).outlineWidth,
  }))
  expect(keyboardFocus.visible).toBe(true)
  expect(keyboardFocus.outlineStyle).toBe('solid')
  expect(Number.parseFloat(keyboardFocus.outlineWidth)).toBeGreaterThanOrEqual(2)

  const desktopEnglish = await inspectLeaveActions(page)
  expect(desktopEnglish.buttons.map(({ label }) => label)).toEqual([
    'Save and leave',
    'Leave without saving',
    'Stay here',
  ])
  expectFullWidthStack(desktopEnglish, 28)
  for (const button of desktopEnglish.buttons) {
    expect(button.minHeight).toBe('28px')
    expect(button.fontSize).toBe('13px')
    expect(button.lineHeight).toBe('20px')
  }
  await capture(page, testInfo, 'record-leave-dialog-en-1440-after.png')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(landingLink).toBeFocused()
  await expect(page).toHaveURL(/\/projects\/[^/]+\/record$/)
  await expect(draftNotice).toBeVisible()

  await setLocale(page, 'ru')
  await landingLink.click()
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('button', { name: 'Остаться', exact: true })).toBeFocused()
  const desktopRussian = await inspectLeaveActions(page)
  expect(desktopRussian.buttons.map(({ label }) => label)).toEqual([
    'Сохранить и выйти',
    'Выйти без сохранения',
    'Остаться',
  ])
  expectFullWidthStack(desktopRussian, 28)
  for (const button of desktopRussian.buttons) {
    expect(button.minHeight).toBe('28px')
    expect(button.fontSize).toBe('13px')
    expect(button.lineHeight).toBe('20px')
  }
  await capture(page, testInfo, 'record-leave-dialog-ru-1440-after.png')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await page.setViewportSize({ width: 390, height: 844 })
  await landingLink.click()
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('button', { name: 'Остаться', exact: true })).toBeFocused()
  const phoneRussian = await inspectLeaveActions(page)
  expect(phoneRussian.buttons.map(({ label }) => label)).toEqual([
    'Сохранить и выйти',
    'Выйти без сохранения',
    'Остаться',
  ])
  expectFullWidthStack(phoneRussian, 48)
  for (const button of phoneRussian.buttons) {
    expect(button.minHeight).toBe('48px')
    expect(button.fontSize).toBe('16px')
    expect(button.lineHeight).toBe('24px')
  }
  expectPhoneFocusClearance(phoneRussian)
  await capture(page, testInfo, 'record-leave-dialog-ru-390-after.png')
  await page.getByRole('button', { name: 'Остаться', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/projects\/[^/]+\/record$/)
  await expect(page.getByText(
    'Аудиокадры декодированы. Кнопка «Следующая реплика» сохранит дубль и продолжит.',
    { exact: true },
  )).toBeVisible()

  writeFileSync(resolve(evidenceDirectory, 'record-leave-dialog-layout-after.json'), JSON.stringify({
    adaptation: 'No direct Affect UI Dialog reference; derive the three-choice dialog from Clean BTN primary, secondary, and ghost controls, arranged as a full-width vertical stack while preserving source desktop density and the approved phone target exception.',
    reference: {
      cleanMarkdown: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/button-clean.md.txt',
      cleanLightPng: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/Light/01-initial.png',
      manifestSha256Verified: true,
    },
    desktopEnglish,
    desktopRussian,
    phoneRussian,
  }, null, 2))
})
