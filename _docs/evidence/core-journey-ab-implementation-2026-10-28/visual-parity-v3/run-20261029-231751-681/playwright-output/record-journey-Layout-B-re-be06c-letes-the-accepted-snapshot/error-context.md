# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> Layout B records real browser fake input, recovers the candidate, and completes the accepted snapshot
- Location: e2e\record-journey.spec.ts:665:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.position-dots')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.position-dots') with timeout 5000ms
  - waiting for locator('.position-dots')

```

```yaml
- main:
  - button "Exit"
  - heading "Sintel · The search" [level=1]
  - paragraph: Line 1 / 3
  - region "Record":
    - paragraph: What brings you to the land of the gatekeepers?
    - img "Original"
    - paragraph: "Original waveform. Listening source: Original."
    - text: Position in dialogue window
    - slider "Position in dialogue window": "0"
    - text: 0:00 / 0:05 Reference volume
    - slider "Reference volume": "0.7"
    - region "Performance controls":
      - button "Previous" [disabled]
      - button "Original"
      - button "Record"
      - button "Your take" [disabled]
      - button "Next" [disabled]
      - paragraph: Record this line to continue.
```

# Test source

```ts
  573 |     const selected = project.windows.find((window) => window.id === 'sintel-turn-1');
  574 |     if (!selected) throw new Error('Prepared turn 1 is missing its source window.');
  575 |     return selected;
  576 |   });
  577 |   await page.locator('video').evaluate((element) => {
  578 |     const video = element as HTMLVideoElement;
  579 |     const trace = {
  580 |       requestedAt: null as number | null,
  581 |       nativePlayAt: null as number | null,
  582 |       playingAt: null as number | null,
  583 |       playingVideoTime: null as number | null,
  584 |       recorderStartAt: null as number | null,
  585 |       recorderStartVideoTime: null as number | null,
  586 |       recorderStopAt: null as number | null,
  587 |       recorderStopVideoTime: null as number | null,
  588 |     };
  589 |     (window as Window & { __delayedCaptureTrace?: typeof trace }).__delayedCaptureTrace = trace;
  590 |     const nativePlay = video.play.bind(video);
  591 |     Object.defineProperty(video, 'play', {
  592 |       configurable: true,
  593 |       value: () => {
  594 |         trace.requestedAt = performance.now();
  595 |         return new Promise<void>((resolve, reject) => {
  596 |           window.setTimeout(() => {
  597 |             trace.nativePlayAt = performance.now();
  598 |             nativePlay().then(resolve, reject);
  599 |           }, 1_200);
  600 |         });
  601 |       },
  602 |     });
  603 |     video.addEventListener('playing', () => {
  604 |       trace.playingAt = performance.now();
  605 |       trace.playingVideoTime = video.currentTime;
  606 |     }, { once: true });
  607 |     const start = MediaRecorder.prototype.start;
  608 |     MediaRecorder.prototype.start = function (...args: Parameters<MediaRecorder['start']>) {
  609 |       trace.recorderStartAt = performance.now();
  610 |       trace.recorderStartVideoTime = video.currentTime;
  611 |       return start.apply(this, args);
  612 |     };
  613 |     const stop = MediaRecorder.prototype.stop;
  614 |     MediaRecorder.prototype.stop = function (...args: Parameters<MediaRecorder['stop']>) {
  615 |       trace.recorderStopAt = performance.now();
  616 |       trace.recorderStopVideoTime = video.currentTime;
  617 |       return stop.apply(this, args);
  618 |     };
  619 |   });
  620 | 
  621 |   await page.getByRole('button', { name: 'Record', exact: true }).click();
  622 |   await expect(page.getByRole('button', { name: 'Preparing recording…', exact: true })).toBeVisible();
  623 |   await page.waitForTimeout(350);
  624 |   const beforeRealPlayback = await page.evaluate(() => {
  625 |     const trace = (window as unknown as Window & { __delayedCaptureTrace: { recorderStartAt: number | null; requestedAt: number | null } }).__delayedCaptureTrace;
  626 |     return { ...trace, videoTime: document.querySelector('video')?.currentTime ?? null };
  627 |   });
  628 |   expect(beforeRealPlayback.requestedAt).not.toBeNull();
  629 |   expect(beforeRealPlayback.recorderStartAt).toBeNull();
  630 |   expect(beforeRealPlayback.videoTime).not.toBeNull();
  631 |   expect(Math.abs((beforeRealPlayback.videoTime ?? 0) - preparedWindow.startMs / 1000)).toBeLessThanOrEqual(0.05);
  632 |   await page.screenshot({ path: path.join(evidenceDirectory, 'delayed-source-preparing.png') });
  633 | 
  634 |   const candidate = await waitForSavedCandidate(page, 'A');
  635 |   const trace = await page.evaluate(() => (window as unknown as Window & { __delayedCaptureTrace: Record<string, number | null> }).__delayedCaptureTrace);
  636 |   const expectedDuration = (preparedWindow.endMs - preparedWindow.startMs) / 1000;
  637 |   expect(trace.nativePlayAt).toBeGreaterThan(trace.requestedAt ?? 0);
  638 |   expect((trace.nativePlayAt ?? 0) - (trace.requestedAt ?? 0)).toBeGreaterThanOrEqual(1_150);
  639 |   expect(trace.playingAt).toBeGreaterThanOrEqual(trace.nativePlayAt ?? 0);
  640 |   expect(trace.recorderStartAt).toBeGreaterThanOrEqual(trace.playingAt ?? 0);
  641 |   expect(Math.abs((trace.recorderStartVideoTime ?? 0) - (trace.playingVideoTime ?? 0))).toBeLessThanOrEqual(0.05);
  642 |   expect((trace.playingVideoTime ?? 0)).toBeGreaterThanOrEqual(preparedWindow.startMs / 1000 - 0.05);
  643 |   expect((trace.recorderStopVideoTime ?? 0)).toBeGreaterThanOrEqual(preparedWindow.endMs / 1000 - 0.15);
  644 |   expect(Math.abs(((trace.recorderStopVideoTime ?? 0) - (trace.recorderStartVideoTime ?? 0)) - expectedDuration)).toBeLessThanOrEqual(0.2);
  645 |   expect(candidate?.blobSize).toBeGreaterThan(0);
  646 |   expect(candidate?.sha256).toMatch(/^[a-f0-9]{64}$/);
  647 |   expect((candidate?.probe as { decodedFrames?: number }).decodedFrames).toBeGreaterThan(0);
  648 |   expect(await evidenceCounters(page)).toEqual({ getUserMediaCalls: 1, recorderStarts: 1 });
  649 |   await page.screenshot({ path: path.join(evidenceDirectory, 'delayed-source-candidate.png') });
  650 |   await writeFile(path.join(evidenceDirectory, 'delayed-source-native-capture.json'), JSON.stringify({
  651 |     date: new Date().toISOString(),
  652 |     browser: `Chrome ${browser.version()}`,
  653 |     input: 'Chrome browser fake audio input; not a physical microphone',
  654 |     sourcePlayDelayMs: 1_200,
  655 |     preparedWindow,
  656 |     expectedDuration,
  657 |     beforeRealPlayback,
  658 |     nativeTrace: trace,
  659 |     persistedCandidate: candidate,
  660 |     apiCounters: await evidenceCounters(page),
  661 |   }, null, 2), 'utf8');
  662 | });
  663 | 
  664 | for (const layout of ['A', 'B'] as const) {
  665 |   test(`Layout ${layout} records real browser fake input, recovers the candidate, and completes the accepted snapshot`, async ({ page, browser }) => {
  666 |     test.setTimeout(60_000);
  667 |     await page.setViewportSize({ width: 1440, height: 900 });
  668 |     await instrumentNativeMedia(page);
  669 |     await page.goto(`/projects/sintel-prepared/record?layout=${layout}&locale=en`);
  670 |     if (layout === 'A') await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeVisible();
  671 |     else {
  672 |       await expect(page.locator('.record-header h1')).toBeVisible();
> 673 |       await expect(page.locator('.position-dots')).toBeVisible();
      |                                                    ^ Error: expect(locator).toBeVisible() failed
  674 |       await expect(page.locator('.record-header__line-count')).toHaveText('Line 1 / 3');
  675 |     }
  676 |     await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) =>
  677 |       video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), { timeout: 15_000 }).toBe(true);
  678 |     await expect(page.locator('.waveform-row')).toHaveAttribute('data-source-waveform', 'decoded');
  679 |     await page.evaluate(() => document.fonts.ready);
  680 |     await expect(page.getByRole('button', { name: 'Exit', exact: true })).toBeInViewport();
  681 |     if (layout === 'A') {
  682 |       await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeInViewport();
  683 |       await expect(page.getByLabel('Current line')).toBeInViewport();
  684 |     } else {
  685 |       await expect(page.locator('.record-header__line-count')).toBeInViewport();
  686 |       await expect(page.getByLabel('Current line')).toBeInViewport();
  687 |     }
  688 |     const dialogue = page.locator('.dialogue-copy p');
  689 |     const englishDialogue = await dialogue.textContent();
  690 |     await setRecordLocale(page, 'ru');
  691 |     await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
  692 |     const russianDialogue = await dialogue.textContent();
  693 |     expect(russianDialogue).not.toBe(englishDialogue);
  694 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-russian.png`) });
  695 |     await setRecordLocale(page, 'en');
  696 |     await expect(dialogue).toHaveText(englishDialogue ?? '');
  697 |     await expect(page.locator('.record-header .locale-control')).toHaveCount(0);
  698 |     await expect(page.locator('.record-header .lucide-log-out')).toHaveCount(1);
  699 |     await expect(page.locator('.record-controls button').filter({ hasText: 'Previous' }).locator('.lucide-chevron-left')).toHaveCount(1);
  700 |     const initialButton = page.getByRole('button', { name: 'Record', exact: true });
  701 |     await expect(initialButton).toBeEnabled();
  702 |     expect(await evidenceCounters(page)).toEqual({ getUserMediaCalls: 0, recorderStarts: 0 });
  703 |     const headerEvidence = await page.evaluate(() => {
  704 |       const inspect = (selector: string) => {
  705 |         const element = document.querySelector(selector);
  706 |         if (!element) return null;
  707 |         const rect = element.getBoundingClientRect();
  708 |         const style = getComputedStyle(element);
  709 |         return {
  710 |           text: element.textContent?.trim() ?? '',
  711 |           x: rect.x, y: rect.y, width: rect.width, height: rect.height,
  712 |           color: style.color, opacity: style.opacity, visibility: style.visibility, display: style.display,
  713 |         };
  714 |       };
  715 |       return {
  716 |         exit: inspect('.exit-link'), title: inspect('.record-header h1'),
  717 |         locale: inspect('.locale-control'), dots: inspect('.position-dots'),
  718 |         mabryLoaded: document.fonts.check('400 26px "Mabry Pro"'),
  719 |         dialogueFont: getComputedStyle(document.querySelector('.dialogue-copy p')!).fontFamily,
  720 |         scrollY: window.scrollY,
  721 |       };
  722 |     });
  723 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-ready.png`) });
  724 | 
  725 |     const viewport = await page.locator('.media-viewport').boundingBox();
  726 |     const wave = await page.locator('.waveform-stack').boundingBox();
  727 |     const controls = await page.locator('.record-controls').boundingBox();
  728 |     expect(viewport).not.toBeNull();
  729 |     expect(wave).not.toBeNull();
  730 |     expect(controls).not.toBeNull();
  731 |     if (viewport) {
  732 |       const center = viewport.x + viewport.width / 2;
  733 |       const visibleCenter = await page.evaluate(() => document.documentElement.clientWidth / 2);
  734 |       expect(Math.abs(center - visibleCenter)).toBeLessThanOrEqual(1);
  735 |       const exit = await page.getByRole('button', { name: 'Exit', exact: true }).boundingBox();
  736 |       expect(Math.abs((exit?.x ?? -999) - viewport.x)).toBeLessThanOrEqual(1);
  737 |     }
  738 |     if (viewport && layout === 'A') {
  739 |       const panel = await page.locator('.record-panel').boundingBox();
  740 |       expect(panel?.width).toBe(272);
  741 |       expect(panel!.x - (viewport.x + viewport.width)).toBeGreaterThanOrEqual(23);
  742 |       expect(viewport.x).toBeGreaterThanOrEqual(32);
  743 |     }
  744 |     if (wave && controls && layout === 'B') expect(controls.y - (wave.y + wave.height)).toBeGreaterThanOrEqual(23);
  745 |     const expectPanelAligned = async () => {
  746 |       if (layout !== 'A') return;
  747 |       const bounds = await page.evaluate(() => ({
  748 |         mediaY: document.querySelector('.media-viewport')!.getBoundingClientRect().y,
  749 |         panelY: document.querySelector('.record-panel')!.getBoundingClientRect().y,
  750 |       }));
  751 |       expect(Math.abs(bounds.panelY - bounds.mediaY)).toBeLessThanOrEqual(1);
  752 |     };
  753 |     await expectPanelAligned();
  754 | 
  755 |     await page.getByRole('button', { name: 'Original', exact: true }).click();
  756 |     await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.1);
  757 |     await expect.poll(() => page.locator('#scene').evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
  758 |     await page.getByRole('button', { name: 'Pause', exact: true }).click();
  759 |     await page.getByRole('button', { name: 'Resume', exact: true }).click();
  760 |     await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(0);
  761 | 
  762 |     await page.getByRole('button', { name: 'Record', exact: true }).click();
  763 |     await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(1);
  764 |     await expectPanelAligned();
  765 |     const recordingNotice = layout === 'A' ? page.locator('.record-panel .notice') : page.locator('.record-status--b .notice');
  766 |     await expect(recordingNotice).toContainText('Recording the full prepared window. It will stop automatically.');
  767 |     await expect(page.getByRole('button', { name: /Countdown|Stop recording|Pause recording/i })).toHaveCount(0);
  768 |     await waitForSavedCandidate(page, layout);
  769 |     await expectPanelAligned();
  770 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-candidate.png`) });
  771 | 
  772 |     const audio = page.locator('audio');
  773 |     await page.getByRole('button', { name: 'Your take', exact: true }).click();
```