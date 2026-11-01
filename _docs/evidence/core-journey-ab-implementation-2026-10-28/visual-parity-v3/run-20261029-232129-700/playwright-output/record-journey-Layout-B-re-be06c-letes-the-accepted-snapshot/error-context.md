# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> Layout B records real browser fake input, recovers the candidate, and completes the accepted snapshot
- Location: e2e\record-journey.spec.ts:665:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.record-controls button').filter({ hasText: 'Previous' }).locator('.lucide-chevron-left')
Expected: 1
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" locator('.record-controls button').filter({ hasText: 'Previous' }).locator('.lucide-chevron-left') with timeout 5000ms
  - waiting for locator('.record-controls button').filter({ hasText: 'Previous' }).locator('.lucide-chevron-left')
    14 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- main [ref=f2e4]:
  - generic [ref=f2e5]:
    - button "Exit" [ref=f2e6] [cursor=pointer]
    - generic [ref=f2e11]:
      - heading "Sintel · The search" [level=1] [ref=f2e12]
      - generic "Current line" [ref=f2e13]:
        - generic "Line 1" [ref=f2e14]
        - generic "Line 2" [ref=f2e15]
        - generic "Line 3" [ref=f2e16]
    - paragraph [ref=f2e17]: Line 1 / 3
  - region "Record" [ref=f2e18]:
    - generic [ref=f2e19]:
      - generic "Sintel source video" [ref=f2e21]
      - paragraph [ref=f2e23]: What brings you to the land of the gatekeepers?
      - generic [ref=f2e24]:
        - img "Original"
        - paragraph [ref=f2e25]: "Original waveform. Listening source: Original."
        - generic [ref=f2e26]: Position in dialogue window
        - slider "Position in dialogue window" [ref=f2e27]: "0"
        - generic [ref=f2e28]:
          - generic [ref=f2e29]: 0:00 / 0:05
          - generic [ref=f2e30]:
            - generic [ref=f2e31]: Reference volume
            - slider "Reference volume" [ref=f2e32] [cursor=pointer]: "0.7"
    - region "Performance controls" [ref=f2e33]:
      - generic [ref=f2e34]:
        - button "Previous" [disabled] [ref=f2e35]
        - button "Original" [ref=f2e39] [cursor=pointer]
        - button "Record" [ref=f2e44] [cursor=pointer]
        - button "Your take" [disabled] [ref=f2e49]
        - button "Next" [disabled] [ref=f2e53]
      - paragraph [ref=f2e58]: Record this line to continue.
```

# Test source

```ts
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
  673 |       await expect(page.locator('#dots')).toBeVisible();
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
  688 |     const dialogue = page.locator('#dialogue');
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
> 699 |     await expect(page.locator('.record-controls button').filter({ hasText: 'Previous' }).locator('.lucide-chevron-left')).toHaveCount(1);
      |                                                                                                                           ^ Error: expect(locator).toHaveCount(expected) failed
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
  717 |         locale: inspect('.locale-control'), dots: inspect('#dots'),
  718 |         mabryLoaded: document.fonts.check('400 26px "Mabry Pro"'),
  719 |         dialogueFont: getComputedStyle(document.querySelector('#dialogue')!).fontFamily,
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
  774 |     await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0.05);
  775 |     expect(await audio.getAttribute('src')).toContain('blob:');
  776 | 
  777 |     if (layout === 'A') {
  778 |       await page.getByRole('button', { name: 'Exit', exact: true }).click();
  779 |       await expect(page.getByRole('dialog')).toBeVisible();
  780 |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-candidate-guard.png') });
  781 |       await page.getByRole('dialog').getByRole('button', { name: 'Stay here', exact: true }).last().click();
  782 |       await expect(page.getByRole('dialog')).toBeHidden();
  783 |       const beforeReload = await readIndexedDb(page);
  784 |       expect(Object.values(beforeReload.project?.acceptedByTurn as Record<string, string> ?? {})).toHaveLength(0);
  785 |       const countersBeforeReload = await evidenceCounters(page);
  786 |       await page.reload();
  787 |       await expect(page.getByRole('button', { name: 'Your take', exact: true })).toBeEnabled();
  788 |       expect(await evidenceCounters(page)).toEqual(countersBeforeReload);
  789 |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-reloaded-candidate.png') });
  790 |     }
  791 | 
  792 |     await page.setViewportSize({ width: 390, height: 667 });
  793 |     if (layout === 'A') await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeVisible();
  794 |     else {
  795 |       await expect(page.locator('.record-header__line-count')).toBeVisible();
  796 |       await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeVisible();
  797 |       await expect(page.getByLabel('Current line')).toBeVisible();
  798 |     }
  799 |     const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
```