import { expect, test } from '@playwright/test'

test('explicit real mode displays unavailable and does not call external services', async ({ page }) => {
  const externalHttpRequests: string[] = []
  const pageErrors: string[] = []

  page.on('request', (request) => {
    const url = new URL(request.url())
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== 'http://127.0.0.1:4174') {
      externalHttpRequests.push(request.url())
    }
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'This service mode is not available' })).toBeVisible()
  await expect(page.getByText(/The real service adapter is not connected in this build/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dub your own scene' })).toHaveCount(0)
  expect(externalHttpRequests).toEqual([])
  expect(pageErrors).toEqual([])
})
