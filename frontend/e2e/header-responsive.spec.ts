import { expect, test } from '@playwright/test'
import { newE2ECredentials } from './helpers/identity.js'
import { completeVisibleRegistration, startRegistrationFromLanding } from './helpers/journey.js'
import { setLocale } from './helpers/locale.js'

test('signed-in header keeps desktop navigation and moves all account controls into the phone menu', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await setLocale(page, 'en')

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    const guestHeader = page.locator('.app-header')
    await expect(guestHeader.locator('.sign-in-link')).toBeVisible()
    await expect(guestHeader.locator('.app-header__desktop-locale select')).toBeVisible()
    await expect(guestHeader.locator('.mobile-menu-trigger')).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    if (width === 390) {
      expect(await guestHeader.locator('.sign-in-link').evaluate((element) => element.getBoundingClientRect().height))
        .toBeGreaterThanOrEqual(48)
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  const code = await startRegistrationFromLanding(page, newE2ECredentials('responsive-header'))
  await completeVisibleRegistration(page, code)

  for (const width of [1440, 768, 767, 390]) {
    for (const locale of ['en', 'ru'] as const) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
      await setLocale(page, locale)

      const header = page.locator('.app-header')
      await expect(header.locator('.brand-link')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)

      if (width >= 768) {
        await expect(header.locator('.desktop-nav')).toBeVisible()
        await expect(header.locator('.app-header__desktop-locale--signed-in')).toBeVisible()
        await expect(header.locator('.desktop-sign-out')).toBeVisible()
        await expect(header.locator('.mobile-menu-trigger')).toBeHidden()
        continue
      }

      await expect(header.locator('.credit-balance')).toBeVisible()
      await expect(header.locator('.mobile-menu-trigger')).toBeVisible()
      await expect(header.locator('.desktop-nav')).toBeHidden()
      await expect(header.locator('.app-header__desktop-locale--signed-in')).toBeHidden()
      await expect(header.locator('.desktop-sign-out')).toBeHidden()

      const trigger = header.getByRole('button', { name: locale === 'en' ? 'Open navigation' : 'Открыть навигацию' })
      expect(await trigger.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48)
      await trigger.click()

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const navigation = dialog.locator('.mobile-nav')
      await expect(navigation.getByRole('link')).toHaveCount(4)
      await expect(navigation.getByRole('combobox', { name: locale === 'en' ? 'Language' : 'Язык' })).toBeVisible()
      await expect(navigation.getByRole('button', { name: locale === 'en' ? 'Sign out' : 'Выйти' })).toBeVisible()
      const phoneTargets = await navigation.locator('a, button, select').evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      )
      expect(phoneTargets.length).toBe(6)
      expect(phoneTargets.every((height) => height >= 48)).toBe(true)
      const closeTargetHeight = await dialog.locator('.sheet-close').evaluate((element) => element.getBoundingClientRect().height)
      expect(closeTargetHeight).toBeGreaterThanOrEqual(48)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)

      await dialog.getByRole('button', { name: locale === 'en' ? 'Close navigation' : 'Закрыть навигацию' }).click()
      await expect(dialog).toBeHidden()
    }
  }
})
