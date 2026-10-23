import { expect, type Page } from '@playwright/test'

/** Change locale through the visible header control, including the signed-in phone menu. */
export async function setLocale(page: Page, locale: 'en' | 'ru'): Promise<void> {
  const mobileTrigger = page.locator('.app-header .mobile-menu-trigger:visible')
  if (await mobileTrigger.count()) {
    const dialog = page.getByRole('dialog')
    const alreadyOpen = await dialog.isVisible()
    if (!alreadyOpen) {
      await mobileTrigger.click()
      await expect(dialog).toBeVisible()
    }

    const selector = dialog.locator('.mobile-nav__locale select')
    await selector.selectOption(locale)
    await expect(selector).toHaveValue(locale)

    if (!alreadyOpen) {
      await dialog.locator('.sheet-close').click()
      await expect(dialog).toBeHidden()
    }
    return
  }

  const selector = page.locator('.app-header__desktop-locale select:visible')
  await expect(selector).toHaveCount(1)
  await selector.selectOption(locale)
  await expect(selector).toHaveValue(locale)
}
