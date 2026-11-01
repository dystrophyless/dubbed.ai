# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: issue63-integration.spec.ts >> portrait fixture runs through New Dub, long-line viewport matrix, leave dialog, Result and return
- Location: e2e\issue63-integration.spec.ts:544:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Record your voice', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Record your voice', exact: true }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Record your voice', exact: true })

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - link "Dubbed — Home":
    - /url: /
    - text: Dubbed
  - navigation "Main navigation":
    - link "New dub":
      - /url: /new
    - link "Projects":
      - /url: /projects
    - link "Credits":
      - /url: /credits
    - link "Account":
      - /url: /account
  - text: Credits
  - strong: "84"
  - text: Language
  - combobox "Language":
    - option "EN" [selected]
    - option "RU"
  - button "Sign out"
- main:
  - region "Check your microphone":
    - heading "Check your microphone" [level=1]
    - paragraph: Choose an input and confirm that your browser can use it. Nothing is recorded unless you start an optional test.
    - heading "Microphone input" [level=2]
    - button "Refresh devices"
    - text: Microphone input
    - combobox "Microphone input":
      - option "Fake Default Audio Input" [selected]
      - option "Fake Audio Input 1"
      - option "Fake Audio Input 2"
    - button "Allow microphone access"
    - status: Your browser has not been asked for microphone access yet.
    - button "Continue" [disabled]
    - heading "Optional local test" [level=2]
    - paragraph: Record up to 10 seconds, then listen here. The test stays in this browser session and is cleared when you leave.
    - button "Record test" [disabled]
    - paragraph: The test is not uploaded, saved to a project, or used to create a take.
```

# Test source

```ts
  423 |     keyboardFocusAfterTab: leaveButtons.find((button) => button.focused)?.label ?? null,
  424 |   }, null, 2)}\n`)
  425 |   await safeFocus.click()
  426 |   await expect(leaveDialog).toBeHidden()
  427 |   await page.getByRole('button', { name: 'Next line', exact: true }).click()
  428 |   await expect(page.getByText('Line 4 of 4', { exact: true })).toBeVisible()
  429 |   await captureAndAcceptVisibleTurn(page)
  430 | 
  431 |   await expect(page).toHaveURL(/\/projects\/[^/]+\/result$/, { timeout: 45_000 })
  432 |   await expect(page.getByRole('heading', { name: 'Your result', exact: true })).toBeVisible()
  433 |   await expect(page.getByText('Displayed generation: 1', { exact: true })).toBeVisible({ timeout: 45_000 })
  434 |   await expect(page.getByText('Synthetic fixture result; not rendered from accepted takes or a custom upload.', { exact: true })).toBeVisible()
  435 |   const resultVideo = page.getByLabel('Finished dubbed video')
  436 |   await expect(resultVideo).toBeVisible()
  437 |   await expect.poll(async () => resultVideo.evaluate((video) => (video as HTMLVideoElement).readyState)).toBeGreaterThan(0)
  438 | 
  439 |   if (options.viewportMatrix) {
  440 |     await page.setViewportSize({ width: 1440, height: 900 })
  441 |     await page.evaluate(() => window.scrollTo(0, 0))
  442 |     screenshots.result1440x900 = await capture(page, testInfo, 'portrait-result-en-1440x900', mode, nativeSession)
  443 |     const download = page.getByRole('button', { name: 'Download MP4', exact: true })
  444 |     const back = page.getByRole('button', { name: 'Return to recording', exact: true })
  445 |     await expect(download).toBeEnabled()
  446 |     const hierarchy = await Promise.all([download, back].map((button) => button.evaluate((element) => {
  447 |       const rect = element.getBoundingClientRect()
  448 |       const style = getComputedStyle(element)
  449 |       return {
  450 |         label: element.textContent?.trim().replace(/\s+/g, ' ') ?? '',
  451 |         variant: element.getAttribute('data-variant'),
  452 |         size: element.getAttribute('data-size'),
  453 |         height: Math.round(rect.height * 100) / 100,
  454 |         fontSize: style.fontSize,
  455 |         lineHeight: style.lineHeight,
  456 |       }
  457 |     })))
  458 |     expect(hierarchy[0].height).toBe(44)
  459 |     expect(hierarchy[0].size).toBe('large')
  460 |     await writeFile(resolve(evidenceDirectory, 'portrait-result-desktop-actions.json'), `${JSON.stringify({
  461 |       route: new URL(page.url()).pathname,
  462 |       viewport: { width: 1440, height: 900 },
  463 |       actions: hierarchy,
  464 |       boundary: 'Current Result UI with mock services and synthetic registered fixture; no production render claim.',
  465 |     }, null, 2)}\n`)
  466 |     await download.scrollIntoViewIfNeeded()
  467 |     screenshots.resultActionsDesktop = await capture(page, testInfo, 'portrait-result-en-1440x900-actions', mode, nativeSession)
  468 |     await page.setViewportSize({ width: 1440, height: 700 })
  469 |     await page.evaluate(() => window.scrollTo(0, 0))
  470 |     screenshots.result1440x700 = await capture(page, testInfo, 'portrait-result-en-1440x700', mode, nativeSession)
  471 |   } else {
  472 |     await page.evaluate(() => window.scrollTo(0, 0))
  473 |     screenshots.resultNative = await capture(page, testInfo, 'native200-portrait-result-en', mode, nativeSession)
  474 |     const nativeDownloadButton = page.getByRole('button', { name: 'Download MP4', exact: true })
  475 |     await nativeDownloadButton.scrollIntoViewIfNeeded()
  476 |     screenshots.resultNativeActions = await capture(page, testInfo, 'native200-portrait-result-actions', mode, nativeSession)
  477 |   }
  478 | 
  479 |   const displayedUrl = await resultVideo.evaluate((video) => (video as HTMLVideoElement).currentSrc)
  480 |   expect(new URL(displayedUrl).pathname).toBe('/media/portrait-result-generation-001.mp4')
  481 |   const response = await page.request.get(displayedUrl)
  482 |   expect(response.ok()).toBe(true)
  483 |   const serviceResultBytes = await response.body()
  484 |   const serviceResultSha256 = createHash('sha256').update(serviceResultBytes).digest('hex')
  485 |   const expectedResultSha256 = createHash('sha256')
  486 |     .update(await readFile(resolve(process.cwd(), 'public', 'media', 'portrait-result-generation-001.mp4')))
  487 |     .digest('hex')
  488 |   expect(serviceResultSha256).toBe(expectedResultSha256)
  489 | 
  490 |   const downloadButton = page.getByRole('button', { name: 'Download MP4', exact: true })
  491 |   await downloadButton.scrollIntoViewIfNeeded()
  492 |   const downloadStarted = page.waitForEvent('download')
  493 |   await downloadButton.click()
  494 |   const download = await downloadStarted
  495 |   expect(download.suggestedFilename()).toMatch(/\.mp4$/i)
  496 |   await expect(page.getByText('Download requested.', { exact: true })).toBeVisible()
  497 |   const downloadPath = await download.path()
  498 |   expect(downloadPath).toBeTruthy()
  499 |   const downloadedBytes = await readFile(downloadPath!)
  500 |   const downloadedSha256 = createHash('sha256').update(downloadedBytes).digest('hex')
  501 |   expect(downloadedSha256).toBe(expectedResultSha256)
  502 | 
  503 |   await testInfo.attach(`${mode}-result-generation-1.json`, {
  504 |     body: Buffer.from(`${JSON.stringify({
  505 |       route: new URL(page.url()).pathname,
  506 |       displayedUrl,
  507 |       resultAsset: 'public/media/portrait-result-generation-001.mp4',
  508 |       downloadedFromUi: true,
  509 |       suggestedFilename: download.suggestedFilename(),
  510 |       downloadedUiBytes: downloadedBytes.length,
  511 |       downloadedUiSha256: downloadedSha256,
  512 |       downloadedResponseBytes: serviceResultBytes.length,
  513 |       responseSha256: serviceResultSha256,
  514 |       expectedFixtureSha256: expectedResultSha256,
  515 |       acceptedTurns: 4,
  516 |       limitation: 'The registered result is a synthetic fixture; it is not rendered from the accepted synthetic microphone recordings.',
  517 |     }, null, 2)}\n`),
  518 |     contentType: 'application/json',
  519 |   })
  520 | 
  521 |   await page.getByRole('button', { name: 'Return to recording', exact: true }).click()
  522 |   await expect(page).toHaveURL(/\/projects\/[^/]+\/record$/)
> 523 |   await expect(page.getByRole('heading', { name: 'Record your voice', exact: true })).toBeVisible()
      |                                                                                       ^ Error: expect(locator).toBeVisible() failed
  524 |   const returnCapture = await capture(page, testInfo,
  525 |     mode === 'native-chromium-cdp' ? 'native200-result-return-to-record' : 'portrait-result-return-to-record-en-1440x700',
  526 |     mode,
  527 |     nativeSession,
  528 |   )
  529 | 
  530 |   const journey = {
  531 |     mode,
  532 |     source: { path: repositoryRelativeArtifactPath(portraitSourcePath), sha256: fixtureHash, preview: previewFacts },
  533 |     quote: quoteLabel,
  534 |     recordLineCount: 4,
  535 |     captures: screenshots,
  536 |     returnedToRecord: returnCapture,
  537 |     generation: 1,
  538 |     resultAsset: { path: 'frontend/public/media/portrait-result-generation-001.mp4', sha256: expectedResultSha256, bytes: serviceResultBytes.length },
  539 |     stateBoundary: 'Real current UI journey through the local mock adapter with fixture input and synthetic microphone; the result is a static registered fixture, not generated from accepted takes.',
  540 |   }
  541 |   await writeFile(resolve(evidenceDirectory, `${mode}-journey.json`), `${JSON.stringify(journey, null, 2)}\n`)
  542 | }
  543 | 
  544 | test('portrait fixture runs through New Dub, long-line viewport matrix, leave dialog, Result and return', async ({ page }, testInfo) => {
  545 |   test.setTimeout(360_000)
  546 |   await runPortraitJourney(page, testInfo, 'playwright-viewport', { viewportMatrix: true })
  547 | })
  548 | 
  549 | test('native 200% Chromium zoom is proven from a new disposable profile across the current portrait journey', async ({ baseURL }, testInfo) => {
  550 |   test.setTimeout(360_000)
  551 |   const profilePath = await mkdtemp(join(tmpdir(), 'dubbed-issue63-native200-'))
  552 |   const preferencesPath = join(profilePath, 'Default', 'Preferences')
  553 |   await mkdir(dirname(preferencesPath), { recursive: true })
  554 |   const preferences = { partition: { default_zoom_level: { x: 3.8017840169239308 } } }
  555 |   await writeFile(preferencesPath, `${JSON.stringify(preferences)}\n`)
  556 |   const context = await chromium.launchPersistentContext(profilePath, {
  557 |     channel: 'chromium',
  558 |     headless: true,
  559 |     viewport: null,
  560 |     baseURL,
  561 |     acceptDownloads: true,
  562 |     args: [
  563 |       '--window-size=1440,960',
  564 |       '--mute-audio',
  565 |       '--use-fake-device-for-media-stream',
  566 |       '--use-fake-ui-for-media-stream',
  567 |     ],
  568 |   })
  569 |   const page = context.pages()[0] ?? await context.newPage()
  570 |   page.setDefaultTimeout(30_000)
  571 |   const nativeSession = await context.newCDPSession(page)
  572 |   await nativeSession.send('Page.enable')
  573 |   try {
  574 |     await page.goto('/')
  575 |     await expect(page.getByRole('heading', { name: 'Dub your own scene', exact: true })).toBeVisible()
  576 |     const zoomMetrics = await inspectPage(page, nativeSession)
  577 |     const zoom = zoomMetrics.cdp as { cssVisualViewport?: { zoom?: number } } | null
  578 |     const initialWindow = zoomMetrics as { viewport: { innerWidth: number; outerWidth: number }; devicePixelRatio: number; bodyZoom: string }
  579 |     await writeFile(resolve(evidenceDirectory, 'native200-profile-proof.json'), `${JSON.stringify({
  580 |       profilePath,
  581 |       preferencesPath,
  582 |       preferences,
  583 |       browserChannel: 'chromium',
  584 |       headless: true,
  585 |       viewport: null,
  586 |       launchWindow: '1440x960',
  587 |       audioAndMediaFlags: ['--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  588 |       observed: zoomMetrics,
  589 |       proof: {
  590 |         cssVisualViewportZoom: zoom?.cssVisualViewport?.zoom,
  591 |         devicePixelRatio: initialWindow.devicePixelRatio,
  592 |         innerWidthIsWithinNativeScrollbarOfHalfOuterWidth: Math.abs(initialWindow.viewport.outerWidth / 2 - initialWindow.viewport.innerWidth) <= 12,
  593 |         innerWidthExpectedAtHalfOuterWidth: initialWindow.viewport.outerWidth / 2,
  594 |         innerWidthObserved: initialWindow.viewport.innerWidth,
  595 |         innerWidthDifferenceFromHalf: initialWindow.viewport.outerWidth / 2 - initialWindow.viewport.innerWidth,
  596 |         outerWidthRemains1440: initialWindow.viewport.outerWidth === 1440,
  597 |         bodyZoomIsComputedNormal: initialWindow.bodyZoom === '1',
  598 |       },
  599 |       status: 'Observed and asserted in the newly created disposable profile.',
  600 |     }, null, 2)}\n`)
  601 |     expect(zoom?.cssVisualViewport?.zoom).toBe(2)
  602 |     expect(initialWindow.viewport.outerWidth).toBe(1440)
  603 |     expect(Math.abs(initialWindow.viewport.outerWidth / 2 - initialWindow.viewport.innerWidth)).toBeLessThanOrEqual(12)
  604 |     expect(initialWindow.devicePixelRatio).toBe(2)
  605 |     expect(initialWindow.bodyZoom).toBe('1')
  606 |     await runPortraitJourney(page, testInfo, 'native-chromium-cdp', { viewportMatrix: false, nativeSession })
  607 |   } finally {
  608 |     await context.close()
  609 |   }
  610 | })
  611 | 
```