# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> Layout A records real browser fake input, recovers the candidate, and completes the accepted snapshot
- Location: e2e\record-journey.spec.ts:669:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.boundingBox: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.waveform-stack')

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
  - region "Record" [ref=f2e17]:
    - generic [ref=f2e18]:
      - generic "Sintel source video" [ref=f2e20]
      - paragraph [ref=f2e22]: What brings you to the land of the gatekeepers?
      - generic [ref=f2e23]:
        - img "Original"
        - paragraph [ref=f2e24]: "Original waveform. Listening source: Original."
        - generic [ref=f2e25]: Position in dialogue window
        - slider "Position in dialogue window" [ref=f2e26] [cursor=pointer]: "0"
        - generic [ref=f2e27]:
          - generic [ref=f2e28]: 0:00 / 0:05
          - generic [ref=f2e29]:
            - generic [ref=f2e30]: Reference volume
            - slider "Reference volume" [ref=f2e31] [cursor=pointer]: "0.7"
    - complementary "Performance controls" [ref=f2e32]:
      - generic [ref=f2e33]: Line 1 / 3
      - generic [ref=f2e35]:
        - button "Original" [ref=f2e36] [cursor=pointer]
        - button "Record" [ref=f2e41] [cursor=pointer]
        - button "Your take" [disabled] [ref=f2e46]
      - paragraph [ref=f2e50]: Record this line to continue.
      - generic [ref=f2e51]:
        - button "Previous" [disabled] [ref=f2e52]
        - button "Next" [disabled] [ref=f2e56]
```

# Test source

```ts
  630 |     return { ...trace, videoTime: document.querySelector('video')?.currentTime ?? null };
  631 |   });
  632 |   expect(beforeRealPlayback.requestedAt).not.toBeNull();
  633 |   expect(beforeRealPlayback.recorderStartAt).toBeNull();
  634 |   expect(beforeRealPlayback.videoTime).not.toBeNull();
  635 |   expect(Math.abs((beforeRealPlayback.videoTime ?? 0) - preparedWindow.startMs / 1000)).toBeLessThanOrEqual(0.05);
  636 |   await page.screenshot({ path: path.join(evidenceDirectory, 'delayed-source-preparing.png') });
  637 | 
  638 |   const candidate = await waitForSavedCandidate(page, 'A');
  639 |   const trace = await page.evaluate(() => (window as unknown as Window & { __delayedCaptureTrace: Record<string, number | null> }).__delayedCaptureTrace);
  640 |   const expectedDuration = (preparedWindow.endMs - preparedWindow.startMs) / 1000;
  641 |   expect(trace.nativePlayAt).toBeGreaterThan(trace.requestedAt ?? 0);
  642 |   expect((trace.nativePlayAt ?? 0) - (trace.requestedAt ?? 0)).toBeGreaterThanOrEqual(1_150);
  643 |   expect(trace.playingAt).toBeGreaterThanOrEqual(trace.nativePlayAt ?? 0);
  644 |   expect(trace.recorderStartAt).toBeGreaterThanOrEqual(trace.playingAt ?? 0);
  645 |   expect(Math.abs((trace.recorderStartVideoTime ?? 0) - (trace.playingVideoTime ?? 0))).toBeLessThanOrEqual(0.05);
  646 |   expect((trace.playingVideoTime ?? 0)).toBeGreaterThanOrEqual(preparedWindow.startMs / 1000 - 0.05);
  647 |   expect((trace.recorderStopVideoTime ?? 0)).toBeGreaterThanOrEqual(preparedWindow.endMs / 1000 - 0.15);
  648 |   expect(Math.abs(((trace.recorderStopVideoTime ?? 0) - (trace.recorderStartVideoTime ?? 0)) - expectedDuration)).toBeLessThanOrEqual(0.2);
  649 |   expect(candidate?.blobSize).toBeGreaterThan(0);
  650 |   expect(candidate?.sha256).toMatch(/^[a-f0-9]{64}$/);
  651 |   expect((candidate?.probe as { decodedFrames?: number }).decodedFrames).toBeGreaterThan(0);
  652 |   expect(await evidenceCounters(page)).toEqual({ getUserMediaCalls: 1, recorderStarts: 1 });
  653 |   await page.screenshot({ path: path.join(evidenceDirectory, 'delayed-source-candidate.png') });
  654 |   await writeFile(path.join(evidenceDirectory, 'delayed-source-native-capture.json'), JSON.stringify({
  655 |     date: new Date().toISOString(),
  656 |     browser: `Chrome ${browser.version()}`,
  657 |     input: 'Chrome browser fake audio input; not a physical microphone',
  658 |     sourcePlayDelayMs: 1_200,
  659 |     preparedWindow,
  660 |     expectedDuration,
  661 |     beforeRealPlayback,
  662 |     nativeTrace: trace,
  663 |     persistedCandidate: candidate,
  664 |     apiCounters: await evidenceCounters(page),
  665 |   }, null, 2), 'utf8');
  666 | });
  667 | 
  668 | for (const layout of ['A', 'B'] as const) {
  669 |   test(`Layout ${layout} records real browser fake input, recovers the candidate, and completes the accepted snapshot`, async ({ page, browser }) => {
  670 |     test.setTimeout(60_000);
  671 |     await page.setViewportSize({ width: 1440, height: 900 });
  672 |     await instrumentNativeMedia(page);
  673 |     await page.goto(`/projects/sintel-prepared/record?layout=${layout}&locale=en`);
  674 |     if (layout === 'A') await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeVisible();
  675 |     else {
  676 |       await expect(page.locator('.record-header h1')).toBeVisible();
  677 |       await expect(page.locator('#dots')).toBeVisible();
  678 |       await expect(page.locator('.record-header__line-count')).toHaveText('Line 1 / 3');
  679 |     }
  680 |     await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) =>
  681 |       video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), { timeout: 15_000 }).toBe(true);
  682 |     await expect(page.locator('.waveform-row')).toHaveAttribute('data-source-waveform', 'decoded');
  683 |     await page.evaluate(() => document.fonts.ready);
  684 |     await expect(page.getByRole('button', { name: 'Exit', exact: true })).toBeInViewport();
  685 |     if (layout === 'A') {
  686 |       await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeInViewport();
  687 |       await expect(page.getByLabel('Current line')).toBeInViewport();
  688 |     } else {
  689 |       await expect(page.locator('.record-header__line-count')).toBeInViewport();
  690 |       await expect(page.getByLabel('Current line')).toBeInViewport();
  691 |     }
  692 |     const dialogue = page.locator('#dialogue');
  693 |     const englishDialogue = await dialogue.textContent();
  694 |     await setRecordLocale(page, 'ru');
  695 |     await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
  696 |     const russianDialogue = await dialogue.textContent();
  697 |     expect(russianDialogue).not.toBe(englishDialogue);
  698 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-russian.png`) });
  699 |     await setRecordLocale(page, 'en');
  700 |     await expect(dialogue).toHaveText(englishDialogue ?? '');
  701 |     await expect(page.locator('.record-header .locale-control')).toHaveCount(0);
  702 |     await expect(page.locator('.record-header .lucide-log-out')).toHaveCount(1);
  703 |     await expect(page.locator('#previous .lucide-chevron-left')).toHaveCount(1);
  704 |     const initialButton = page.getByRole('button', { name: 'Record', exact: true });
  705 |     await expect(initialButton).toBeEnabled();
  706 |     expect(await evidenceCounters(page)).toEqual({ getUserMediaCalls: 0, recorderStarts: 0 });
  707 |     const headerEvidence = await page.evaluate(() => {
  708 |       const inspect = (selector: string) => {
  709 |         const element = document.querySelector(selector);
  710 |         if (!element) return null;
  711 |         const rect = element.getBoundingClientRect();
  712 |         const style = getComputedStyle(element);
  713 |         return {
  714 |           text: element.textContent?.trim() ?? '',
  715 |           x: rect.x, y: rect.y, width: rect.width, height: rect.height,
  716 |           color: style.color, opacity: style.opacity, visibility: style.visibility, display: style.display,
  717 |         };
  718 |       };
  719 |       return {
  720 |         exit: inspect('.exit-link'), title: inspect('.record-header h1'),
  721 |         locale: inspect('.locale-control'), dots: inspect('#dots'),
  722 |         mabryLoaded: document.fonts.check('400 26px "Mabry Pro"'),
  723 |         dialogueFont: getComputedStyle(document.querySelector('#dialogue')!).fontFamily,
  724 |         scrollY: window.scrollY,
  725 |       };
  726 |     });
  727 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-ready.png`) });
  728 | 
  729 |     const viewport = await page.locator('.media-viewport').boundingBox();
> 730 |     const wave = await page.locator('.waveform-stack').boundingBox();
      |                                                        ^ Error: locator.boundingBox: Test timeout of 60000ms exceeded.
  731 |     const controls = await page.locator('.record-controls').boundingBox();
  732 |     expect(viewport).not.toBeNull();
  733 |     expect(wave).not.toBeNull();
  734 |     expect(controls).not.toBeNull();
  735 |     if (viewport) {
  736 |       const center = viewport.x + viewport.width / 2;
  737 |       const visibleCenter = await page.evaluate(() => document.documentElement.clientWidth / 2);
  738 |       expect(Math.abs(center - visibleCenter)).toBeLessThanOrEqual(1);
  739 |       const exit = await page.getByRole('button', { name: 'Exit', exact: true }).boundingBox();
  740 |       expect(Math.abs((exit?.x ?? -999) - viewport.x)).toBeLessThanOrEqual(1);
  741 |     }
  742 |     if (viewport && layout === 'A') {
  743 |       const panel = await page.locator('.record-panel').boundingBox();
  744 |       expect(panel?.width).toBe(272);
  745 |       expect(panel!.x - (viewport.x + viewport.width)).toBeGreaterThanOrEqual(23);
  746 |       expect(viewport.x).toBeGreaterThanOrEqual(32);
  747 |     }
  748 |     if (wave && controls && layout === 'B') expect(controls.y - (wave.y + wave.height)).toBeGreaterThanOrEqual(23);
  749 |     const expectPanelAligned = async () => {
  750 |       if (layout !== 'A') return;
  751 |       const bounds = await page.evaluate(() => ({
  752 |         mediaY: document.querySelector('.media-viewport')!.getBoundingClientRect().y,
  753 |         panelY: document.querySelector('.record-panel')!.getBoundingClientRect().y,
  754 |       }));
  755 |       expect(Math.abs(bounds.panelY - bounds.mediaY)).toBeLessThanOrEqual(1);
  756 |     };
  757 |     await expectPanelAligned();
  758 | 
  759 |     await page.getByRole('button', { name: 'Original', exact: true }).click();
  760 |     await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.1);
  761 |     await expect.poll(() => page.locator('#scene').evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
  762 |     await page.getByRole('button', { name: 'Pause', exact: true }).click();
  763 |     await page.getByRole('button', { name: 'Resume', exact: true }).click();
  764 |     await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(0);
  765 | 
  766 |     await page.getByRole('button', { name: 'Record', exact: true }).click();
  767 |     await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(1);
  768 |     await expectPanelAligned();
  769 |     const recordingNotice = layout === 'A' ? page.locator('.record-panel .notice') : page.locator('.record-status--b .notice');
  770 |     await expect(recordingNotice).toContainText('Recording the full prepared window. It will stop automatically.');
  771 |     await expect(page.getByRole('button', { name: /Countdown|Stop recording|Pause recording/i })).toHaveCount(0);
  772 |     await waitForSavedCandidate(page, layout);
  773 |     await expectPanelAligned();
  774 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-candidate.png`) });
  775 | 
  776 |     const audio = page.locator('audio');
  777 |     await page.getByRole('button', { name: 'Your take', exact: true }).click();
  778 |     await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0.05);
  779 |     expect(await audio.getAttribute('src')).toContain('blob:');
  780 | 
  781 |     if (layout === 'A') {
  782 |       await page.getByRole('button', { name: 'Exit', exact: true }).click();
  783 |       await expect(page.getByRole('dialog')).toBeVisible();
  784 |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-candidate-guard.png') });
  785 |       await page.getByRole('dialog').getByRole('button', { name: 'Stay here', exact: true }).last().click();
  786 |       await expect(page.getByRole('dialog')).toBeHidden();
  787 |       const beforeReload = await readIndexedDb(page);
  788 |       expect(Object.values(beforeReload.project?.acceptedByTurn as Record<string, string> ?? {})).toHaveLength(0);
  789 |       const countersBeforeReload = await evidenceCounters(page);
  790 |       await page.reload();
  791 |       await expect(page.getByRole('button', { name: 'Your take', exact: true })).toBeEnabled();
  792 |       expect(await evidenceCounters(page)).toEqual(countersBeforeReload);
  793 |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-reloaded-candidate.png') });
  794 |     }
  795 | 
  796 |     await page.setViewportSize({ width: 390, height: 667 });
  797 |     if (layout === 'A') await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeVisible();
  798 |     else {
  799 |       await expect(page.locator('.record-header__line-count')).toBeVisible();
  800 |       await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeVisible();
  801 |       await expect(page.getByLabel('Current line')).toBeVisible();
  802 |     }
  803 |     const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  804 |     expect(horizontalOverflow).toBe(false);
  805 |     await setRecordLocale(page, 'ru');
  806 |     await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
  807 |     expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  808 |     const targetSize = await page.locator('.record-action').boundingBox();
  809 |     expect(targetSize?.height).toBeGreaterThanOrEqual(48);
  810 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x667-russian.png`) });
  811 |     await setRecordLocale(page, 'en');
  812 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x667-ready.png`) });
  813 |     await page.setViewportSize({ width: 1440, height: 900 });
  814 | 
  815 |     await page.getByRole('button', { name: 'Next', exact: true }).click();
  816 |     await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-2`));
  817 |     await setRecordLocale(page, 'ru');
  818 |     await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
  819 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-turn-2-russian.png`) });
  820 |     await setRecordLocale(page, 'en');
  821 |     await recordCurrentWindow(page, layout);
  822 |     await page.getByRole('button', { name: 'Next', exact: true }).click();
  823 |     await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-3`));
  824 |     await setRecordLocale(page, 'ru');
  825 |     await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
  826 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-turn-3-russian.png`) });
  827 |     await setRecordLocale(page, 'en');
  828 |     await recordCurrentWindow(page, layout);
  829 | 
  830 |     const media = await readIndexedDb(page);
```