# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: recording-viewport.spec.ts >> recording transport stays in normal desktop flow and clears the RU phone stage
- Location: e2e\recording-viewport.spec.ts:210:1

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 700
Received:    707.98
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - link "Skip to content" [ref=f1e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f1e5]:
    - generic [ref=f1e6]:
      - link "Dubbed — Home" [ref=f1e7] [cursor=pointer]:
        - /url: /
        - generic [ref=f1e8]: Dubbed
      - generic [ref=f1e9]:
        - generic [ref=f1e10]:
          - generic [ref=f1e11]: Credits
          - strong [ref=f1e12]: "111"
        - button "Open navigation" [ref=f1e13] [cursor=pointer]
  - main [ref=f1e15]:
    - region [ref=f1e17]:
      - generic [ref=f1e18]:
        - generic [ref=f1e19]:
          - heading "Record your voice" [level=1] [ref=f1e20]
          - generic [ref=f1e21]:
            - generic [ref=f1e22]: source-dialogue
            - generic [ref=f1e23]: ·Record
            - status [ref=f1e24]: ·Draft saved. It has not been accepted as a take.
        - button "Projects" [disabled] [ref=f1e26]
      - generic "Original video" [ref=f1e30]
      - generic [ref=f1e31]:
        - generic [ref=f1e32]:
          - generic [ref=f1e33]: Line 1 of 3
          - paragraph [ref=f1e34]: A blue light is on.
          - paragraph [ref=f1e35]: "Capture window: 0.75–3.18 s"
        - generic [ref=f1e36]: "Accepted takes: 0 / 3"
      - region "Recording playback timeline" [ref=f1e37]:
        - slider "Seek playback" [disabled] [ref=f1e168]: "600"
      - generic [ref=f1e169]:
        - generic [ref=f1e170]:
          - group "Audio source" [ref=f1e171]:
            - button "Original" [disabled] [pressed] [ref=f1e172]
            - button "My recording" [disabled] [ref=f1e173]
          - button "Play" [disabled] [ref=f1e174]
          - 'status "Playback position: 0:00 / 0:02" [ref=f1e177]': 0:00 / 0:02
        - generic [ref=f1e178]:
          - button "Recording…" [disabled] [ref=f1e179]
          - button "Previous line" [disabled] [ref=f1e183]
          - button "Next line" [disabled] [ref=f1e186]
          - button "Microphone" [disabled] [ref=f1e189]
      - generic [ref=f1e193]:
        - generic [ref=f1e194]: Original video volume
        - slider "Original video volume" [active] [ref=f1e195]: "0.81"
      - generic [ref=f1e196]:
        - generic [ref=f1e197]: Recording status
        - generic [ref=f1e198]: Recording the line… it will stop automatically.
        - progressbar "Recording status" [ref=f1e199]
      - 'generic "Input level: 1" [ref=f1e200]'
      - region "Current draft recording" [ref=f1e201]:
        - generic [ref=f1e202]:
          - heading "Current draft recording" [level=2] [ref=f1e203]
          - generic [ref=f1e204]: Draft saved. It has not been accepted as a take.
        - status [ref=f1e205]: Recorded audio frames were decoded. Next line saves this take and continues.
      - paragraph [ref=f1e206]: This prototype saves draft and take state through its local mock workspace. It does not produce a custom rendered performance.
      - region "Process again" [ref=f1e207]:
        - button "Process again" [disabled] [ref=f1e208]
```

# Test source

```ts
  504 |     const contentIsClear = () => {
  505 |       const content = document.querySelector<HTMLElement>('.recording-screen__process-again')
  506 |       const panel = document.querySelector<HTMLElement>('.recording-transport__controls')
  507 |       return Boolean(content && panel && content.getBoundingClientRect().bottom <= panel.getBoundingClientRect().top)
  508 |     }
  509 |     for (let frame = 0; frame < 48; frame += 1) {
  510 |       if (contentIsClear()) return true
  511 |       await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  512 |     }
  513 |     return contentIsClear()
  514 |   })
  515 |   const finalContentGeometry = await page.locator('.recording-screen').evaluate((root) => {
  516 |     const content = root.querySelector<HTMLElement>('.recording-screen__process-again')
  517 |     const panel = root.querySelector<HTMLElement>('.recording-transport__controls')
  518 |     const contentRect = content?.getBoundingClientRect()
  519 |     const panelRect = panel?.getBoundingClientRect()
  520 |     return {
  521 |       content: {
  522 |         top: Math.round((contentRect?.top ?? 0) * 100) / 100,
  523 |         bottom: Math.round((contentRect?.bottom ?? 0) * 100) / 100,
  524 |       },
  525 |       panel: {
  526 |         top: Math.round((panelRect?.top ?? 0) * 100) / 100,
  527 |         bottom: Math.round((panelRect?.bottom ?? 0) * 100) / 100,
  528 |         height: Math.round((panelRect?.height ?? 0) * 100) / 100,
  529 |         position: panel ? getComputedStyle(panel).position : 'missing',
  530 |         viewportHeight: window.innerHeight,
  531 |       },
  532 |       scrollY: Math.round(window.scrollY * 100) / 100,
  533 |       documentScrollHeight: document.scrollingElement?.scrollHeight ?? 0,
  534 |       documentMaximumScrollTop: Math.max(0,
  535 |         (document.scrollingElement?.scrollHeight ?? 0) - (document.scrollingElement?.clientHeight ?? 0)),
  536 |       documentScrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
  537 |     }
  538 |   })
  539 |   const finalContentMetrics = finalContentGeometry.content
  540 |   const finalContentPanel = finalContentGeometry.panel
  541 |   await writeFile(resolve(evidenceDirectory, 'recording-phone-final-content-clearance-attempt.json'), JSON.stringify({
  542 |     method: 'scrollIntoView block:end auto; poll animation frames for global smooth scroll to settle',
  543 |     clearanceReached: finalContentClearanceReached,
  544 |     ...finalContentGeometry,
  545 |     sourceHashes: focusAttempt.sourceHashes,
  546 |   }, null, 2))
  547 |   expect(finalContentClearanceReached).toBe(true)
  548 |   expect(finalContentMetrics.bottom).toBeLessThanOrEqual(finalContentPanel.top)
  549 |   await saveScreenshot(page, testInfo, 'recording-phone-final-content-clearance-390x844.png')
  550 | 
  551 |   const transportJourney = {
  552 |     sourceWindow: { startSeconds: sourceWindowStart, endSeconds: sourceWindowEnd },
  553 |     recordingSource,
  554 |     recordingAudioHidden: true,
  555 |     recordingWaveformPeakCount: recordingWaveform.length,
  556 |     pausedSourceSwitch,
  557 |     sourceBeforeScrub,
  558 |     sourceAfterScrub,
  559 |     pausedRecordingSwitch,
  560 |     alignedRecordingPlayback,
  561 |     playingSourceSwitch,
  562 |     volumeDuringCapture: {
  563 |       captureControls,
  564 |       before: volumeBefore,
  565 |       after: volumeAfter,
  566 |       audioVolumeBefore,
  567 |       audioVolumeAfter,
  568 |       focusedByNativeTab: volumeReachedByTab,
  569 |       input: volumeInputMetrics,
  570 |       initialPanel: initialPhoneCapturePanel,
  571 |       focusedPanel: phonePanelMetrics,
  572 |       focusClearanceReached,
  573 |       postAdjustmentCaptureActive: volumeChangeSnapshot.captureActive,
  574 |     },
  575 |     finalContentClearance: {
  576 |       reached: finalContentClearanceReached,
  577 |       content: finalContentMetrics,
  578 |       panel: finalContentPanel,
  579 |       scrollY: finalContentGeometry.scrollY,
  580 |     },
  581 |     phoneCaptureVolume,
  582 |   }
  583 | 
  584 |   const metrics = { desktop, shortDesktop, phone, capturing, candidate, transportJourney }
  585 |   await mkdir(evidenceDirectory, { recursive: true })
  586 |   await writeFile(resolve(evidenceDirectory, 'recording-viewport-metrics.json'), JSON.stringify(metrics, null, 2))
  587 |   await writeFile(resolve(evidenceDirectory, 'recording-transport-interactions.json'), JSON.stringify(transportJourney, null, 2))
  588 |   await testInfo.attach('recording-viewport-metrics.json', {
  589 |     body: Buffer.from(JSON.stringify(metrics, null, 2)),
  590 |     contentType: 'application/json',
  591 |   })
  592 |   await testInfo.attach('recording-transport-interactions.json', {
  593 |     body: Buffer.from(JSON.stringify(transportJourney, null, 2)),
  594 |     contentType: 'application/json',
  595 |   })
  596 |   console.log(`RECORDING_VIEWPORT_METRICS ${JSON.stringify(metrics)}`)
  597 |   diagnostics.assertClean()
  598 | 
  599 |   expect(desktop.documentWidth).toBeLessThanOrEqual(1440)
  600 |   expect(desktop.stage?.height).toBeLessThanOrEqual(450)
  601 |   expect(desktop.panel?.bottom).toBeLessThanOrEqual(900)
  602 |   expect(shortDesktop.documentWidth).toBeLessThanOrEqual(1440)
  603 |   expect(shortDesktop.stage?.height).toBeLessThanOrEqual(350)
> 604 |   expect(shortDesktop.panel?.bottom).toBeLessThanOrEqual(700)
      |                                      ^ Error: expect(received).toBeLessThanOrEqual(expected)
  605 |   expect(phone.documentWidth).toBeLessThanOrEqual(390)
  606 |   expect(phone.panel?.bottom).toBeLessThanOrEqual(844)
  607 |   expect(phone.modeLabels.length).toBe(2)
  608 |   expect(phone.modeLabels.every((label) => /[А-Яа-яЁё]/.test(label))).toBe(true)
  609 |   expect(phone.stage?.bottom).toBeLessThanOrEqual(phone.panel?.top ?? 0)
  610 |   expect(phone.dialogue?.bottom).toBeLessThanOrEqual(phone.panel?.top ?? 0)
  611 |   expect(phone.timeline?.bottom).toBeLessThanOrEqual(phone.panel?.top ?? 0)
  612 |   for (const control of phone.controls) {
  613 |     expect(control.height, `RU phone target: ${control.label}`).toBeGreaterThanOrEqual(48)
  614 |     expect(control.left, `RU phone left edge: ${control.label}`).toBeGreaterThanOrEqual(-1)
  615 |     expect(control.right, `RU phone right edge: ${control.label}`).toBeLessThanOrEqual(391)
  616 |     expect(control.textFits, `RU phone clipped label: ${control.label}`).toBe(true)
  617 |     expect(control.scrollWidth, `RU phone scroll width: ${control.label}`).toBeLessThanOrEqual(control.clientWidth + 1)
  618 |   }
  619 | })
  620 | 
  621 | test('[QA-77] Back choices preserve candidate semantics and phone target clearance follows actual panel height', async ({ page, baseURL }, testInfo) => {
  622 |   test.setTimeout(300_000)
  623 |   page.setDefaultTimeout(30_000)
  624 |   await page.setViewportSize({ width: 1440, height: 900 })
  625 |   const diagnostics = await installBrowserDiagnostics(page, baseURL ?? 'http://127.0.0.1:4577')
  626 |   const credentials = newE2ECredentials('recording-qa77')
  627 |   const code = await startRegistrationFromLanding(page, credentials)
  628 |   await completeVisibleRegistration(page, code)
  629 |   await page.reload()
  630 |   await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
  631 |   await uploadKnownSourceThroughUi(page)
  632 |   await setMillisecondSelectionAndQuote(page)
  633 |   await page.getByRole('button', { name: 'Process for 9 credits', exact: true }).click()
  634 |   await expect(page.getByRole('heading', { name: 'Check your microphone', exact: true })).toBeVisible()
  635 |   await continueThroughRecordingEntryGate(page)
  636 |   await expect(page.getByRole('heading', { name: 'Record your voice', exact: true })).toBeVisible()
  637 |   await expect(page.locator('.recording-transport__timeline')).toBeVisible()
  638 |   await expect.poll(async () => page.locator('.recording-screen__stage video').evaluate((video) => (video as HTMLVideoElement).readyState)).toBeGreaterThan(0)
  639 | 
  640 |   const language = page.getByRole('combobox', { name: /Language|Язык/ })
  641 |   await language.selectOption({ label: 'EN' })
  642 |   await expect(page.getByRole('heading', { name: 'Record your voice', exact: true })).toBeVisible()
  643 |   const screenshots: Record<string, unknown> = {}
  644 |   const capture = async (name: string, fullPage = false) => {
  645 |     await waitForRecordingLayout(page)
  646 |     const metrics = await inspectRecordingViewport(page)
  647 |     const image = await saveIssue77Screenshot(page, testInfo, name, fullPage)
  648 |     screenshots[name] = { ...image, metrics }
  649 |     return metrics
  650 |   }
  651 |   const sceneClearOfPanel = (metrics: Awaited<ReturnType<typeof inspectRecordingViewport>>) =>
  652 |     (metrics.dialogue?.bottom ?? Number.POSITIVE_INFINITY) + 8 <= (metrics.panel?.top ?? Number.NEGATIVE_INFINITY)
  653 |     && (metrics.timeline?.bottom ?? Number.POSITIVE_INFINITY) + 8 <= (metrics.panel?.top ?? Number.NEGATIVE_INFINITY)
  654 | 
  655 |   const enDesktop = await capture('qa77-en-desktop-ready-1440x900.png')
  656 |   const desktopPlay = enDesktop.controls.find((control) => control.label === 'Play')
  657 |   const desktopMode = enDesktop.controls.find((control) => control.label === 'Original')
  658 |   expect(desktopPlay?.height).toBe(40)
  659 |   expect(desktopPlay?.fontSize).toBe('14px')
  660 |   expect(desktopPlay?.paddingLeft).toBe('14px')
  661 |   expect(desktopPlay?.gap).toBe('8px')
  662 |   expect(desktopMode?.height).toBe(40)
  663 |   expect(desktopMode?.fontSize).toBe('14px')
  664 |   const desktopActions = enDesktop.controls.filter((control) =>
  665 |     ['Record line', 'Previous line', 'Next line', 'Microphone'].includes(control.label),
  666 |   )
  667 |   expect(desktopActions).toHaveLength(4)
  668 |   for (const control of desktopActions) {
  669 |     expect(control.height, `${control.label} height`).toBe(40)
  670 |     expect(control.fontSize, `${control.label} font size`).toBe('14px')
  671 |     expect(control.lineHeight, `${control.label} line height`).toBe('20px')
  672 |     expect(control.paddingLeft, `${control.label} horizontal padding`).toBe('14px')
  673 |     expect(control.gap, `${control.label} icon gap`).toBe('8px')
  674 |   }
  675 | 
  676 |   await page.setViewportSize({ width: 1440, height: 700 })
  677 |   await page.evaluate(() => window.scrollTo(0, 0))
  678 |   const enShortDesktop = await capture('qa77-en-short-desktop-ready-1440x700.png')
  679 |   expect(enShortDesktop.panelPosition).toBe('static')
  680 | 
  681 |   await language.selectOption({ label: 'RU' })
  682 |   await expect(page.getByRole('heading', { name: 'Запишите свою реплику', exact: true })).toBeVisible()
  683 |   await page.setViewportSize({ width: 1440, height: 900 })
  684 |   await page.evaluate(() => window.scrollTo(0, 0))
  685 |   const ruDesktop = await capture('qa77-ru-desktop-ready-1440x900.png')
  686 |   expect(ruDesktop.documentWidth).toBeLessThanOrEqual(1440)
  687 |   await page.setViewportSize({ width: 1440, height: 700 })
  688 |   await page.evaluate(() => window.scrollTo(0, 0))
  689 |   const ruShortDesktop = await capture('qa77-ru-short-desktop-ready-1440x700.png')
  690 |   expect(ruShortDesktop.panelPosition).toBe('static')
  691 | 
  692 |   await language.selectOption({ label: 'EN' })
  693 |   await page.setViewportSize({ width: 390, height: 844 })
  694 |   await page.evaluate(() => window.scrollTo(0, 0))
  695 |   const enPhone = await capture('qa77-en-phone-ready-390x844.png')
  696 |   expect(enPhone.panelPosition).toBe('fixed')
  697 |   expect(sceneClearOfPanel(enPhone)).toBe(true)
  698 |   expect(enPhone.controls.every((control) => control.height >= 48)).toBe(true)
  699 |   expect(enPhone.controls.every((control) => control.fontSize === '16px' && control.lineHeight === '24px')).toBe(true)
  700 | 
  701 |   await page.setViewportSize({ width: 1440, height: 900 })
  702 |   await language.selectOption({ label: 'RU' })
  703 |   await expect(page.getByRole('heading', { name: 'Запишите свою реплику', exact: true })).toBeVisible()
  704 |   await page.setViewportSize({ width: 390, height: 844 })
```