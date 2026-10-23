import { expect, test } from '@playwright/test'

test('mock frontend renders the landing, follows start, and makes no external requests', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? 'http://127.0.0.1:4173').origin
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const externalRequests = new Set<string>()

  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('request', request => {
    const url = new URL(request.url())
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== origin) {
      externalRequests.add(url.origin)
    }
  })

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Dub your own scene' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Contact support/ })).toHaveAttribute(
    'href',
    'mailto:dystrophyless@gmail.com',
  )
  await page.getByRole('button', { name: 'Start dubbing' }).click()
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await expect(page).toHaveURL(/\/register$/)

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
  expect([...externalRequests]).toEqual([])
})
