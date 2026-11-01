# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> Layout B records real browser fake input, recovers the candidate, and completes the accepted snapshot
- Location: e2e\record-journey.spec.ts:667:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.boundingBox: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.record-action')

```

# Page snapshot

```yaml
- main [ref=f3e4]:
  - generic [ref=f3e5]:
    - button "Выход" [ref=f3e6] [cursor=pointer]
    - generic [ref=f3e11]:
      - heading "Sintel · The search" [level=1] [ref=f3e12]
      - generic "Текущая реплика" [ref=f3e13]:
        - generic "Реплика 1" [ref=f3e14]
        - generic "Реплика 2" [ref=f3e15]
        - generic "Реплика 3" [ref=f3e16]
    - paragraph [ref=f3e17]: Реплика 1 / 3
  - region "Запись" [ref=f3e18]:
    - generic [ref=f3e19]:
      - generic "Исходное видео Sintel" [ref=f3e21]
      - paragraph [ref=f3e23]: Что привело тебя в страну хранителей?
      - generic [ref=f3e24]:
        - img "Оригинал · Ваш дубль"
        - paragraph [ref=f3e25]: "Исходная звуковая волна с наложением вашего дубля. Прослушивание: оригинал."
        - generic [ref=f3e26]: Позиция в диалоговом окне
        - slider "Позиция в диалоговом окне" [ref=f3e27]: "0"
        - generic [ref=f3e28]:
          - generic [ref=f3e29]: 0:00 / 0:05
          - slider "Громкость оригинала" [ref=f3e31] [cursor=pointer]: "0.7"
    - region "Управление записью" [ref=f3e32]:
      - generic [ref=f3e33]:
        - button "Назад" [disabled] [ref=f3e34]
        - button "Оригинал" [ref=f3e35] [cursor=pointer]
        - button "Перезаписать" [ref=f3e36] [cursor=pointer]
        - button "Ваш дубль" [ref=f3e37] [cursor=pointer]
        - button "Далее" [ref=f3e38] [cursor=pointer]
      - generic [ref=f3e39]:
        - generic [ref=f3e40]: Новый дубль
        - paragraph [ref=f3e41]: «Далее» сохраняет этот дубль.
```

# Test source

```ts
  706 |       const inspect = (selector: string) => {
  707 |         const element = document.querySelector(selector);
  708 |         if (!element) return null;
  709 |         const rect = element.getBoundingClientRect();
  710 |         const style = getComputedStyle(element);
  711 |         return {
  712 |           text: element.textContent?.trim() ?? '',
  713 |           x: rect.x, y: rect.y, width: rect.width, height: rect.height,
  714 |           color: style.color, opacity: style.opacity, visibility: style.visibility, display: style.display,
  715 |         };
  716 |       };
  717 |       return {
  718 |         exit: inspect('.exit-link'), title: inspect('.record-header h1'),
  719 |         locale: inspect('.locale-control'), dots: inspect('#dots'),
  720 |         mabryLoaded: document.fonts.check('400 26px "Mabry Pro"'),
  721 |         dialogueFont: getComputedStyle(document.querySelector('#dialogue')!).fontFamily,
  722 |         scrollY: window.scrollY,
  723 |       };
  724 |     });
  725 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-ready.png`) });
  726 | 
  727 |     const viewport = await page.locator('.media-viewport').boundingBox();
  728 |     const wave = await page.locator('.waveform-row').boundingBox();
  729 |     const controls = await page.locator('.performance').boundingBox();
  730 |     expect(viewport).not.toBeNull();
  731 |     expect(wave).not.toBeNull();
  732 |     expect(controls).not.toBeNull();
  733 |     if (viewport) {
  734 |       const center = viewport.x + viewport.width / 2;
  735 |       const visibleCenter = await page.evaluate(() => document.documentElement.clientWidth / 2);
  736 |       expect(Math.abs(center - visibleCenter)).toBeLessThanOrEqual(1);
  737 |       const exit = await page.getByRole('button', { name: 'Exit', exact: true }).boundingBox();
  738 |       expect(Math.abs((exit?.x ?? -999) - viewport.x)).toBeLessThanOrEqual(1);
  739 |     }
  740 |     if (viewport && layout === 'A') {
  741 |       const panel = await page.locator('.performance').boundingBox();
  742 |       expect(panel?.width).toBe(272);
  743 |       expect(panel!.x - (viewport.x + viewport.width)).toBeGreaterThanOrEqual(23);
  744 |       expect(viewport.x).toBeGreaterThanOrEqual(32);
  745 |     }
  746 |     if (wave && controls && layout === 'B') expect(controls.y - (wave.y + wave.height)).toBeGreaterThanOrEqual(23);
  747 |     const expectPanelAligned = async () => {
  748 |       if (layout !== 'A') return;
  749 |       const bounds = await page.evaluate(() => ({
  750 |         mediaY: document.querySelector('.media-viewport')!.getBoundingClientRect().y,
  751 |         panelY: document.querySelector('.performance')!.getBoundingClientRect().y,
  752 |       }));
  753 |       expect(Math.abs(bounds.panelY - bounds.mediaY)).toBeLessThanOrEqual(1);
  754 |     };
  755 |     await expectPanelAligned();
  756 | 
  757 |     await page.getByRole('button', { name: 'Original', exact: true }).click();
  758 |     await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.1);
  759 |     await expect.poll(() => page.locator('#scene').evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
  760 |     await page.getByRole('button', { name: 'Pause', exact: true }).click();
  761 |     await page.getByRole('button', { name: 'Resume', exact: true }).click();
  762 |     await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(0);
  763 | 
  764 |     await page.getByRole('button', { name: 'Record', exact: true }).click();
  765 |     await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(1);
  766 |     await expectPanelAligned();
  767 |     const recordingNotice = page.getByText('Recording the full prepared window. It will stop automatically.');
  768 |     await expect(recordingNotice).toContainText('Recording the full prepared window. It will stop automatically.');
  769 |     await expect(page.getByRole('button', { name: /Countdown|Stop recording|Pause recording/i })).toHaveCount(0);
  770 |     await waitForSavedCandidate(page, layout);
  771 |     await expectPanelAligned();
  772 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-candidate.png`) });
  773 | 
  774 |     const audio = page.locator('audio');
  775 |     await page.getByRole('button', { name: 'Your take', exact: true }).click();
  776 |     await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0.05);
  777 |     expect(await audio.getAttribute('src')).toContain('blob:');
  778 | 
  779 |     if (layout === 'A') {
  780 |       await page.getByRole('button', { name: 'Exit', exact: true }).click();
  781 |       await expect(page.getByRole('dialog')).toBeVisible();
  782 |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-candidate-guard.png') });
  783 |       await page.getByRole('dialog').getByRole('button', { name: 'Stay here', exact: true }).last().click();
  784 |       await expect(page.getByRole('dialog')).toBeHidden();
  785 |       const beforeReload = await readIndexedDb(page);
  786 |       expect(Object.values(beforeReload.project?.acceptedByTurn as Record<string, string> ?? {})).toHaveLength(0);
  787 |       const countersBeforeReload = await evidenceCounters(page);
  788 |       await page.reload();
  789 |       await expect(page.getByRole('button', { name: 'Your take', exact: true })).toBeEnabled();
  790 |       expect(await evidenceCounters(page)).toEqual(countersBeforeReload);
  791 |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-reloaded-candidate.png') });
  792 |     }
  793 | 
  794 |     await page.setViewportSize({ width: 390, height: 667 });
  795 |     if (layout === 'A') await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeVisible();
  796 |     else {
  797 |       await expect(page.locator('.record-header__line-count')).toBeVisible();
  798 |       await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeVisible();
  799 |       await expect(page.getByLabel('Current line')).toBeVisible();
  800 |     }
  801 |     const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  802 |     expect(horizontalOverflow).toBe(false);
  803 |     await setRecordLocale(page, 'ru');
  804 |     await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
  805 |     expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
> 806 |     const targetSize = await page.locator('.record-action').boundingBox();
      |                                                             ^ Error: locator.boundingBox: Test timeout of 60000ms exceeded.
  807 |     expect(targetSize?.height).toBeGreaterThanOrEqual(48);
  808 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x667-russian.png`) });
  809 |     await setRecordLocale(page, 'en');
  810 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x667-ready.png`) });
  811 |     await page.setViewportSize({ width: 1440, height: 900 });
  812 | 
  813 |     await page.getByRole('button', { name: 'Next', exact: true }).click();
  814 |     await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-2`));
  815 |     await setRecordLocale(page, 'ru');
  816 |     await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
  817 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-turn-2-russian.png`) });
  818 |     await setRecordLocale(page, 'en');
  819 |     await recordCurrentWindow(page, layout);
  820 |     await page.getByRole('button', { name: 'Next', exact: true }).click();
  821 |     await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-3`));
  822 |     await setRecordLocale(page, 'ru');
  823 |     await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
  824 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-turn-3-russian.png`) });
  825 |     await setRecordLocale(page, 'en');
  826 |     await recordCurrentWindow(page, layout);
  827 | 
  828 |     const media = await readIndexedDb(page);
  829 |     expect(media.media.filter((candidate) => candidate.purpose === 'recording')).toHaveLength(3);
  830 |     expect(Object.values(media.project?.acceptedByTurn as Record<string, string> ?? {})).toHaveLength(2);
  831 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-final-candidate.png`) });
  832 | 
  833 |     if (layout === 'A') {
  834 |       await page.route('**/media/example-dub.mp4', (route) => route.fulfill({ status: 503, body: 'fixture unavailable for the first attempts' }));
  835 |       await page.setViewportSize({ width: 390, height: 667 });
  836 |       await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  837 |       expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  838 |       await page.getByRole('button', { name: 'Next', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
  839 |       await expect(page).toHaveURL(/\/result\?layout=A&snapshot=/);
  840 |       await expect(page.getByRole('heading', { name: 'Your result' })).toBeInViewport();
  841 |       await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  842 |       await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('H1');
  843 |       await page.setViewportSize({ width: 1440, height: 900 });
  844 |     } else {
  845 |       await page.getByRole('button', { name: 'Exit', exact: true }).click();
  846 |       await expect(page.getByRole('dialog')).toBeVisible();
  847 |       await page.getByRole('button', { name: 'Save and leave', exact: true }).click();
  848 |       await expect(page).toHaveURL(/\/projects\?returnProject=sintel-prepared&returnLayout=B&returnFocus=exit/);
  849 |       await page.getByTestId('return-to-saved-record').click();
  850 |       await expect(page).toHaveURL(/\/projects\/sintel-prepared\/record\?layout=B&turn=sintel-turn-3/);
  851 |       await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
  852 |     }
  853 | 
  854 |     let finalDatabase = await readIndexedDb(page);
  855 |     expect(finalDatabase.project?.initialResultSnapshotId).toBeTruthy();
  856 |     expect(finalDatabase.snapshots).toHaveLength(1);
  857 |     const snapshot = finalDatabase.snapshots[0] as { takes: unknown[]; authorization: string; contentSha256: string };
  858 |     expect(snapshot.authorization).toBe('initial-completion');
  859 |     expect(snapshot.takes).toHaveLength(3);
  860 |     expect(snapshot.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  861 | 
  862 |     if (layout === 'B') {
  863 |       const snapshotId = String(finalDatabase.project?.latestResultSnapshotId ?? '');
  864 |       expect(snapshotId).toBeTruthy();
  865 |       await page.goto(`/projects/sintel-prepared/result?layout=B&snapshot=${encodeURIComponent(snapshotId)}`);
  866 |     }
  867 |     await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
  868 |     await expect(page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' })).toBeVisible();
  869 |     await expect(page.locator('.result-header h1')).toBeFocused();
  870 |     expect(await page.evaluate(() => window.scrollY)).toBe(0);
  871 |     expect(await page.locator('.result-header .lucide-log-out').count()).toBe(1);
  872 |     expect(await page.locator('.result-workspace__actions button').filter({ hasText: 'Return to recording' }).locator('.lucide-undo-2').count()).toBe(1);
  873 | 
  874 |     if (layout === 'A') {
  875 |       await expect(page.getByRole('button', { name: 'Retry assembly', exact: true })).toBeVisible();
  876 |       await expect(page.getByText('The result sample could not be loaded. Your accepted takes and previous result remain unchanged.')).toBeVisible();
  877 |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-result-fixture-unavailable.png') });
  878 |       await page.unroute('**/media/example-dub.mp4');
  879 |       await page.getByRole('button', { name: 'Retry assembly', exact: true }).click();
  880 |     }
  881 | 
  882 |     await expect(page.getByText('Illustrative sample ready')).toBeVisible({ timeout: 15_000 });
  883 |     const resultVideo = page.getByTestId('result-video');
  884 |     await expect(resultVideo).toHaveAttribute('data-source', 'dub');
  885 |     await expect(resultVideo).toHaveAttribute('src', /^blob:/);
  886 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.videoWidth > 0)).toBe(true);
  887 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  888 |     await expect(page.locator('#result-volume')).toHaveValue('0.7');
  889 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
  890 |     const presentedGenerationId = await resultVideo.getAttribute('data-generation-id');
  891 |     expect(presentedGenerationId).toMatch(/^generation:/);
  892 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-ready.png`) });
  893 |     const normalResult = await page.evaluate(() => {
  894 |       const bounds = (selector: string) => {
  895 |         const element = document.querySelector(selector);
  896 |         if (!element) return null;
  897 |         const rect = element.getBoundingClientRect();
  898 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  899 |       };
  900 |       return {
  901 |         title: bounds('.result-header h1'),
  902 |         exit: bounds('.result-header .exit-link'),
  903 |         screen: bounds('.result-player__screen'),
  904 |         seek: bounds('.result-player__seek'),
  905 |         controls: bounds('.result-player__transport-row'),
  906 |       };
```