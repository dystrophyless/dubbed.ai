# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace-state-visual.spec.ts >> actual New dub screen >> invalid interval is explicit and both boundaries remain user-controlled on phone
- Location: e2e\workspace-state-visual.spec.ts:486:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
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
  523 |       const selectionInvalidCopy = 'Выберите фрагмент в пределах источника длиной от 1.000 до 120.000 секунд с точностью 0.001 секунды. Границы не перемещались автоматически.'
  524 |       const intervalProblem = page.getByRole('alert').filter({ hasText: selectionInvalidCopy })
  525 |       await start.fill('8.000')
  526 |       await end.fill('16.000')
  527 |       await end.blur()
  528 |       await expect(intervalProblem).toBeVisible()
  529 |       await expect(start).toHaveAttribute('aria-invalid', 'true')
  530 |       await expect(end).toHaveAttribute('aria-invalid', 'true')
  531 |       await expect(start).toHaveValue('8.000')
  532 |       await expect(end).toHaveValue('16.000')
  533 | 
  534 |       const selectableMaxMs = Math.min(Number(startDomain.max), 120_000)
  535 |       expect(selectableMaxMs).toBeGreaterThanOrEqual(1_000)
  536 |       const validEndMs = Math.max(1_000, Math.floor((selectableMaxMs - 1_000) / 1_000) * 1_000)
  537 |       const validStartMs = Math.max(0, validEndMs - 8_000)
  538 |       expect(validEndMs).toBeLessThanOrEqual(selectableMaxMs)
  539 |       expect(validEndMs - validStartMs).toBeGreaterThanOrEqual(1_000)
  540 |       await start.fill((validStartMs / 1_000).toFixed(3))
  541 |       await end.fill((validEndMs / 1_000).toFixed(3))
  542 |       await end.blur()
  543 |       const selectionUpdateCount = () => page.evaluate(() =>
  544 |         window.__workspaceStateVisual?.calls.filter((name) => name === 'preparation.updateSelection').length ?? 0,
  545 |       )
  546 |       await expect.poll(selectionUpdateCount).toBeGreaterThan(0)
  547 |       await expect(intervalProblem).toHaveCount(0)
  548 | 
  549 |       const thumbPosition = async (range: typeof startRange) => range.evaluate((element) => {
  550 |         const input = element as HTMLInputElement
  551 |         const rect = input.getBoundingClientRect()
  552 |         const thumbInset = 8
  553 |         const min = Number(input.min)
  554 |         const max = Number(input.max)
  555 |         const value = Number(input.value)
  556 |         return {
  557 |           x: thumbInset + ((value - min) / (max - min)) * (rect.width - thumbInset * 2),
  558 |           y: rect.height / 2,
  559 |         }
  560 |       })
  561 |       const gestureSurface = page.getByTestId('new-dub-range-gesture')
  562 |       await expect(gestureSurface).toBeVisible()
  563 |       const currentGestureBox = async () => {
  564 |         const [box, currentStartBox, currentEndBox] = await Promise.all([
  565 |           gestureSurface.boundingBox(),
  566 |           startRange.boundingBox(),
  567 |           endRange.boundingBox(),
  568 |         ])
  569 |         expect(box).not.toBeNull()
  570 |         expect(currentStartBox).not.toBeNull()
  571 |         expect(currentEndBox).not.toBeNull()
  572 |         expect(box!.height).toBeGreaterThanOrEqual(48)
  573 |         expect(box!.x).toBeCloseTo(currentStartBox!.x, 2)
  574 |         expect(box!.y).toBeCloseTo(currentStartBox!.y, 2)
  575 |         expect(box!.width).toBeCloseTo(currentStartBox!.width, 2)
  576 |         expect(currentEndBox!.x).toBeCloseTo(currentStartBox!.x, 2)
  577 |         expect(currentEndBox!.y).toBeCloseTo(currentStartBox!.y, 2)
  578 |         expect(currentEndBox!.width).toBeCloseTo(currentStartBox!.width, 2)
  579 |         return box!
  580 |       }
  581 | 
  582 |       const pointerPoint = async (range: typeof startRange, offsetX: number) => {
  583 |         const thumb = await thumbPosition(range)
  584 |         return { x: thumb.x + offsetX, y: thumb.y + 20 }
  585 |       }
  586 |       const expectGestureSurfaceAt = async (point: { x: number; y: number }, box: NonNullable<Awaited<ReturnType<typeof gestureSurface.boundingBox>>>) => {
  587 |         const hitSurface = await page.evaluate(({ x, y }) => {
  588 |           return Boolean(document.elementFromPoint(x, y)?.closest('[data-testid="new-dub-range-gesture"]'))
  589 |         }, { x: box.x + point.x, y: box.y + point.y })
> 590 |         expect(hitSurface).toBe(true)
      |                            ^ Error: expect(received).toBe(expected) // Object.is equality
  591 |       }
  592 |       const dragHandle = async (range: typeof startRange, direction: -1 | 1) => {
  593 |         const box = await currentGestureBox()
  594 |         const thumb = await thumbPosition(range)
  595 |         const stepPixels = Math.max(8, box.width * 500 / Number(startDomain.max))
  596 |         const source = { x: box.x + thumb.x, y: box.y + thumb.y + 20 }
  597 |         const targetX = Math.max(0, Math.min(box.width, thumb.x + direction * stepPixels))
  598 |         await page.mouse.move(source.x, source.y)
  599 |         await page.mouse.down()
  600 |         await page.mouse.move(box.x + targetX, source.y, { steps: 5 })
  601 |         await page.mouse.up()
  602 |       }
  603 | 
  604 |       const originalStart = await startRange.inputValue()
  605 |       const originalEnd = await endRange.inputValue()
  606 |       const startTapBox = await currentGestureBox()
  607 |       const startTapPoint = await pointerPoint(startRange, 16)
  608 |       await expectGestureSurfaceAt(startTapPoint, startTapBox)
  609 |       await gestureSurface.tap({ position: startTapPoint })
  610 |       await expect.poll(async () => Number(await startRange.inputValue())).toBeGreaterThan(Number(originalStart))
  611 |       const tappedStart = Number(await startRange.inputValue())
  612 |       await expect(endRange).toHaveValue(originalEnd)
  613 |       await dragHandle(startRange, 1)
  614 |       await expect.poll(async () => Number(await startRange.inputValue())).toBeGreaterThan(tappedStart)
  615 |       const draggedStart = Number(await startRange.inputValue())
  616 |       await expect(startRange).toBeFocused()
  617 |       await page.keyboard.press('ArrowRight')
  618 |       const keyboardStart = Number(await startRange.inputValue())
  619 |       expect(keyboardStart).toBe(draggedStart + 1)
  620 |       await expect(endRange).toHaveValue(originalEnd)
  621 | 
  622 |       const endTapBox = await currentGestureBox()
  623 |       const endTapPoint = await pointerPoint(endRange, -16)
  624 |       await expectGestureSurfaceAt(endTapPoint, endTapBox)
  625 |       await gestureSurface.tap({ position: endTapPoint })
  626 |       await expect.poll(async () => Number(await endRange.inputValue())).toBeLessThan(Number(originalEnd))
  627 |       const tappedEnd = Number(await endRange.inputValue())
  628 |       await expect(startRange).toHaveValue(String(keyboardStart))
  629 |       await dragHandle(endRange, -1)
  630 |       await expect.poll(async () => Number(await endRange.inputValue())).toBeLessThan(tappedEnd)
  631 |       const draggedEnd = Number(await endRange.inputValue())
  632 |       await expect(endRange).toBeFocused()
  633 |       await page.keyboard.press('ArrowRight')
  634 |       const keyboardEnd = Number(await endRange.inputValue())
  635 |       expect(keyboardEnd).toBe(draggedEnd + 1)
  636 |       expect(Number(await startRange.inputValue())).toBe(keyboardStart)
  637 |       expect(keyboardEnd - keyboardStart).toBeGreaterThanOrEqual(1_000)
  638 |       expect(keyboardEnd - keyboardStart).toBeLessThanOrEqual(120_000)
  639 | 
  640 |       await start.fill('0.000')
  641 |       await end.fill('1.000')
  642 |       await end.blur()
  643 |       await expect.poll(selectionUpdateCount).toBeGreaterThanOrEqual(2)
  644 |       await expect(intervalProblem).toHaveCount(0)
  645 |       const minimumInterval = await page.evaluate(() => {
  646 |         const [startInput, endInput] = [...document.querySelectorAll<HTMLInputElement>('.new-dub-range input[type="range"]')]
  647 |         return Number(endInput?.value) - Number(startInput?.value)
  648 |       })
  649 |       expect(minimumInterval).toBe(1_000)
  650 | 
  651 |       const updatesBeforeInvalidInput = await selectionUpdateCount()
  652 |       const endBeforeInvalidInput = await end.inputValue()
  653 |       await start.fill('9.000')
  654 |       await end.focus()
  655 |       await expect(intervalProblem).toBeVisible()
  656 |       await expect(start).toHaveValue('9.000')
  657 |       await expect(end).toHaveValue(endBeforeInvalidInput)
  658 |       await expect.poll(selectionUpdateCount).toBe(updatesBeforeInvalidInput)
  659 |       await expect(page).toHaveURL(/\/new(?:$|[?#])/)
  660 |       await expect(page.getByRole('heading', { name: 'Source video', exact: true })).toBeVisible()
  661 |       await expectPhoneSurface(page, 'ru', '.new-dub-selection__fields input')
  662 |       await capture(page, 'newdub-invalid-interval-ru-phone.png')
  663 |     } finally {
  664 |       await context.close()
  665 |     }
  666 |   })
  667 | 
  668 |   test('insufficient balance shows the current synthetic quote without authorizing processing', async ({ browser }) => {
  669 |     const { context, page } = await openLoadedNewDub(browser, 'newdub-insufficient')
  670 |     try {
  671 |       await page.getByRole('button', { name: 'Get exact quote' }).click()
  672 |       await expect(page.getByText('The current available balance is below this quote. No processing has been authorized.')).toBeVisible()
  673 |       await expect(page.getByRole('button', { name: 'Open credits' })).toBeVisible()
  674 |       await expect(page.getByRole('button', { name: /Start processing/ })).toHaveCount(0)
  675 |       await capture(page, 'newdub-capacity-insufficient-balance-en-desktop.png')
  676 |     } finally {
  677 |       await context.close()
  678 |     }
  679 |   })
  680 | 
  681 |   test('source interval and loaded media remain present when quote service fails', async ({ browser }) => {
  682 |     const { context, page } = await openLoadedNewDub(browser, 'newdub-quote-error')
  683 |     try {
  684 |       await page.getByRole('button', { name: 'Get exact quote' }).click()
  685 |       await expect(page.getByRole('alert').first()).toBeVisible()
  686 |       await expect(page.locator('.new-dub-preview__video')).toBeVisible()
  687 |       await expect(page.locator('.new-dub-selection__fields input').nth(1)).toHaveValue('8.000')
  688 |       await capture(page, 'newdub-quote-service-failure-en-desktop.png')
  689 |     } finally {
  690 |       await context.close()
```