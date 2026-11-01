# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace-state-visual.spec.ts >> actual New dub screen >> invalid interval is explicit and both boundaries remain user-controlled on phone
- Location: e2e\workspace-state-visual.spec.ts:486:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('alert')
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" getByRole('alert') with timeout 5000ms
  - waiting for getByRole('alert')
    14 × locator resolved to 1 element
       - unexpected value "1"

```

# Test source

```ts
  426 |       await input.press('Enter')
  427 |       await expect(row.getByRole('alert').first()).toBeVisible()
  428 |       await expect(input).toHaveValue('Renamed draft')
  429 |       await capture(rename.page, 'projects-rename-save-error-en-desktop.png')
  430 |     } finally {
  431 |       await rename.context.close()
  432 |     }
  433 | 
  434 |     const deletion = await openScene(browser, 'projects', 'projects-delete-unknown', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  435 |     try {
  436 |       const row = deletion.page.locator('.project-row').first()
  437 |       await row.getByRole('button', { name: /Действия проекта/ }).click()
  438 |       await deletion.page.getByRole('menuitem', { name: 'Удалить проект' }).click()
  439 |       await expect(deletion.page.getByRole('dialog')).toBeVisible()
  440 |       await deletion.page.getByRole('dialog').getByRole('button', { name: 'Удалить проект' }).click()
  441 |       await expect(deletion.page.getByText(/Результат удаления не подтверждён/)).toBeVisible()
  442 |       await expectPhoneSurface(deletion.page, 'ru', '[role="dialog"] button[data-variant="destructive"]')
  443 |       await capture(deletion.page, 'projects-delete-unknown-ru-phone.png')
  444 |     } finally {
  445 |       await deletion.context.close()
  446 |     }
  447 | 
  448 |     const failedDelete = await openScene(browser, 'projects', 'projects-delete-error')
  449 |     try {
  450 |       const row = failedDelete.page.locator('.project-row').first()
  451 |       await row.getByRole('button', { name: 'Actions for Source video' }).click()
  452 |       await failedDelete.page.getByRole('menuitem', { name: 'Delete project' }).click()
  453 |       await failedDelete.page.getByRole('dialog').getByRole('button', { name: 'Delete project', exact: true }).click()
  454 |       await expect(failedDelete.page.getByRole('dialog').getByRole('alert').first()).toBeVisible()
  455 |       await capture(failedDelete.page, 'projects-delete-known-failure-en-desktop.png', false)
  456 |     } finally {
  457 |       await failedDelete.context.close()
  458 |     }
  459 |   })
  460 | 
  461 |   test('continue opens the selected project through the existing lifecycle route', async ({ browser }) => {
  462 |     const { context, page } = await openScene(browser, 'projects', 'projects-resume')
  463 |     try {
  464 |       const row = page.locator('.project-row').filter({ hasText: 'Processing draft' })
  465 |       await row.getByRole('button', { name: 'Continue' }).click()
  466 |       await waitForCall(page, 'projects.open')
  467 |       await waitForCall(page, 'projects.recordOpened')
  468 |       await expect.poll(() => page.evaluate(() => window.location.pathname)).toContain('/processing')
  469 |     } finally {
  470 |       await context.close()
  471 |     }
  472 |   })
  473 | })
  474 | 
  475 | test.describe('actual New dub screen', () => {
  476 |   async function openLoadedNewDub(browser: Browser, scenario: string, options: { locale?: Locale; viewport?: Size } = {}) {
  477 |     const scene = await openScene(browser, 'newdub', scenario, options)
  478 |     await expect(scene.page.getByRole('heading', { name: 'Source video' })).toBeVisible()
  479 |     await scene.page.waitForFunction(() => {
  480 |       const video = document.querySelector<HTMLVideoElement>('.new-dub-preview__video')
  481 |       return Boolean(video && video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0)
  482 |     })
  483 |     return scene
  484 |   }
  485 | 
  486 |   test('invalid interval is explicit and both boundaries remain user-controlled on phone', async ({ browser }) => {
  487 |     const { context, page } = await openLoadedNewDub(browser, 'newdub-invalid-interval', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  488 |     try {
  489 |       await expectPhoneSurface(page, 'ru', '.new-dub-text-button')
  490 |       const ranges = page.locator('.new-dub-range input[type="range"]')
  491 |       const startRange = ranges.nth(0)
  492 |       const endRange = ranges.nth(1)
  493 |       await expect(ranges).toHaveCount(2)
  494 |       const startRangeBox = await startRange.boundingBox()
  495 |       const endRangeBox = await endRange.boundingBox()
  496 |       expect(startRangeBox?.height ?? 0).toBeGreaterThanOrEqual(48)
  497 |       expect(endRangeBox?.height ?? 0).toBeGreaterThanOrEqual(48)
  498 |       expect(startRangeBox).not.toBeNull()
  499 |       expect(endRangeBox).not.toBeNull()
  500 |       expect(endRangeBox!.x).toBeCloseTo(startRangeBox!.x, 2)
  501 |       expect(endRangeBox!.y).toBeCloseTo(startRangeBox!.y, 2)
  502 |       expect(endRangeBox!.width).toBeCloseTo(startRangeBox!.width, 2)
  503 |       expect(endRangeBox!.height).toBeCloseTo(startRangeBox!.height, 2)
  504 |       const [startDomain, endDomain] = await Promise.all([startRange, endRange].map((range) =>
  505 |         range.evaluate((element) => {
  506 |           const input = element as HTMLInputElement
  507 |           return { min: input.min, max: input.max, step: input.step }
  508 |         }),
  509 |       ))
  510 |       const sourceDurationMs = await page.locator('.new-dub-preview__video').evaluate((element) =>
  511 |         (element as HTMLVideoElement).duration * 1_000,
  512 |       )
  513 |       expect(startDomain.min).toBe('0')
  514 |       expect(endDomain.min).toBe(startDomain.min)
  515 |       expect(endDomain.max).toBe(startDomain.max)
  516 |       expect(startDomain.step).toBe('1')
  517 |       expect(endDomain.step).toBe(startDomain.step)
  518 |       expect(Math.abs(Number(startDomain.max) - sourceDurationMs)).toBeLessThanOrEqual(100)
  519 | 
  520 |       const fields = page.locator('.new-dub-selection__fields input')
  521 |       const start = fields.nth(0)
  522 |       const end = fields.nth(1)
  523 |       await start.fill('8.000')
  524 |       await end.fill('16.000')
  525 |       await end.blur()
> 526 |       await expect(page.getByRole('alert')).toHaveCount(0)
      |                                             ^ Error: expect(locator).toHaveCount(expected) failed
  527 | 
  528 |       const thumbPosition = async (range: typeof startRange) => range.evaluate((element) => {
  529 |         const input = element as HTMLInputElement
  530 |         const rect = input.getBoundingClientRect()
  531 |         const thumbWidth = Number.parseFloat(getComputedStyle(input, '::-webkit-slider-thumb').width)
  532 |         const min = Number(input.min)
  533 |         const max = Number(input.max)
  534 |         const value = Number(input.value)
  535 |         return {
  536 |           x: thumbWidth / 2 + ((value - min) / (max - min)) * (rect.width - thumbWidth),
  537 |           y: rect.height / 2,
  538 |         }
  539 |       })
  540 | 
  541 |       const originalStart = await startRange.inputValue()
  542 |       const originalEnd = await endRange.inputValue()
  543 |       await startRange.tap({ position: await thumbPosition(startRange) })
  544 |       const touchedStart = Number(await startRange.inputValue())
  545 |       await startRange.press('ArrowRight')
  546 |       expect(Number(await startRange.inputValue())).toBe(touchedStart + 1)
  547 |       await expect(endRange).toHaveValue(originalEnd)
  548 |       await endRange.tap({ position: await thumbPosition(endRange) })
  549 |       const touchedEnd = Number(await endRange.inputValue())
  550 |       await endRange.press('ArrowRight')
  551 |       expect(Number(await endRange.inputValue())).toBe(touchedEnd + 1)
  552 |       expect(Number(await startRange.inputValue())).toBe(touchedStart + 1)
  553 |       expect(touchedEnd - touchedStart).toBeGreaterThanOrEqual(1_000)
  554 |       expect(touchedEnd - touchedStart).toBeLessThanOrEqual(120_000)
  555 | 
  556 |       await start.fill('0.000')
  557 |       await end.fill('1.000')
  558 |       await end.blur()
  559 |       await expect(page.getByRole('alert')).toHaveCount(0)
  560 |       const minimumInterval = await page.evaluate(() => {
  561 |         const [startInput, endInput] = [...document.querySelectorAll<HTMLInputElement>('.new-dub-range input[type="range"]')]
  562 |         return Number(endInput?.value) - Number(startInput?.value)
  563 |       })
  564 |       expect(minimumInterval).toBe(1_000)
  565 | 
  566 |       await start.fill('9.000')
  567 |       await fields.nth(1).focus()
  568 |       await expect(page.getByRole('alert').first()).toBeVisible()
  569 |       await expect(start).toHaveValue('9.000')
  570 |       await expectPhoneSurface(page, 'ru', '.new-dub-selection__fields input')
  571 |       await capture(page, 'newdub-invalid-interval-ru-phone.png')
  572 |     } finally {
  573 |       await context.close()
  574 |     }
  575 |   })
  576 | 
  577 |   test('insufficient balance shows the current synthetic quote without authorizing processing', async ({ browser }) => {
  578 |     const { context, page } = await openLoadedNewDub(browser, 'newdub-insufficient')
  579 |     try {
  580 |       await page.getByRole('button', { name: 'Get exact quote' }).click()
  581 |       await expect(page.getByText('The current available balance is below this quote. No processing has been authorized.')).toBeVisible()
  582 |       await expect(page.getByRole('button', { name: 'Open credits' })).toBeVisible()
  583 |       await expect(page.getByRole('button', { name: /Start processing/ })).toHaveCount(0)
  584 |       await capture(page, 'newdub-capacity-insufficient-balance-en-desktop.png')
  585 |     } finally {
  586 |       await context.close()
  587 |     }
  588 |   })
  589 | 
  590 |   test('source interval and loaded media remain present when quote service fails', async ({ browser }) => {
  591 |     const { context, page } = await openLoadedNewDub(browser, 'newdub-quote-error')
  592 |     try {
  593 |       await page.getByRole('button', { name: 'Get exact quote' }).click()
  594 |       await expect(page.getByRole('alert').first()).toBeVisible()
  595 |       await expect(page.locator('.new-dub-preview__video')).toBeVisible()
  596 |       await expect(page.locator('.new-dub-selection__fields input').nth(1)).toHaveValue('8.000')
  597 |       await capture(page, 'newdub-quote-service-failure-en-desktop.png')
  598 |     } finally {
  599 |       await context.close()
  600 |     }
  601 |   })
  602 | 
  603 |   test('expired quote is labelled stale and offers a fresh quote', async ({ browser }) => {
  604 |     const { context, page } = await openLoadedNewDub(browser, 'newdub-stale-quote')
  605 |     try {
  606 |       await page.getByRole('button', { name: 'Get exact quote' }).click()
  607 |       await expect(page.getByText('This quote is expired or no longer matches the saved source and section. Request a fresh quote.')).toBeVisible()
  608 |       await expect(page.getByRole('button', { name: 'Refresh exact quote' })).toBeVisible()
  609 |       await capture(page, 'newdub-stale-quote-en-desktop.png')
  610 |     } finally {
  611 |       await context.close()
  612 |     }
  613 |   })
  614 | 
  615 |   test('compatible preview retry keeps source identity and reaches the checked-in media fixture', async ({ browser }) => {
  616 |     const { context, page } = await openScene(browser, 'newdub', 'newdub-preview-retry')
  617 |     try {
  618 |       await expect(page.getByRole('heading', { name: 'Source video' })).toBeVisible()
  619 |       await page.waitForFunction(() => Boolean(document.querySelector<HTMLVideoElement>('.new-dub-preview__video')?.error))
  620 |       await page.getByRole('button', { name: 'Check compatible-preview availability' }).click()
  621 |       await waitForCall(page, 'previews.inspect')
  622 |       await page.getByRole('button', { name: 'Prepare compatible preview' }).click()
  623 |       await waitForCall(page, 'previews.request')
  624 |       await expect(page.getByRole('button', { name: 'Retry preview' })).toBeVisible()
  625 |       await capture(page, 'newdub-compatible-preview-retryable-error-en-desktop.png')
  626 |       await page.getByRole('button', { name: 'Retry preview' }).click()
```