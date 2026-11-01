# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> Layout B records real browser fake input, recovers the candidate, and completes the accepted snapshot
- Location: e2e\record-journey.spec.ts:667:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Retry playback', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: 'Retry playback', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Retry playback', exact: true })

```

```yaml
- main "Your result":
  - button "Exit"
  - heading "Your result" [level=1]
  - paragraph: Sintel · The search
  - region "Result":
    - group "Result":
      - button "Original"
      - button "My dub" [pressed]
    - status: Video is not available in this browser.
    - group "Result":
      - slider "Seek" [disabled]: "0"
      - button "Play" [disabled]
      - text: 0:00 / 0:13 Volume
      - slider "Volume": "0.7"
      - button "Full screen"
    - status:
      - heading "Illustrative sample ready" [level=2]
      - paragraph: Fixed example video; not rendered from accepted takes.
    - button "Download My dub"
    - button "Return to recording"
    - button "Reload sample"
```

# Test source

```ts
  794 |     await page.setViewportSize({ width: 390, height: 844 });
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
  806 |     const targetSize = await page.locator('#record').boundingBox();
  807 |     expect(targetSize?.height).toBeGreaterThanOrEqual(48);
  808 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x844-russian.png`) });
  809 |     await setRecordLocale(page, 'en');
  810 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x844-ready.png`) });
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
  892 |     await resultVideo.evaluate((video: HTMLVideoElement) => video.dispatchEvent(new Event('error')));
  893 |     await expect(page.locator('.result-player__error')).toBeVisible();
> 894 |     await expect(page.getByRole('button', { name: 'Retry playback', exact: true })).toBeVisible();
      |                                                                                     ^ Error: expect(locator).toBeVisible() failed
  895 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-current-source-error.png`) });
  896 |     await page.getByRole('button', { name: 'Retry playback', exact: true }).click();
  897 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  898 |     await expect(page.locator('.result-player__error')).toHaveCount(0);
  899 |     await expect(resultVideo).toHaveAttribute('data-generation-id', presentedGenerationId ?? '');
  900 |     const sourceErrorRecovery = await resultVideo.evaluate((video: HTMLVideoElement) => ({
  901 |       event: 'synthetic-current-media-error', src: video.getAttribute('src'), generationId: video.dataset.generationId,
  902 |       retryPlaying: !video.paused, videoWidth: video.videoWidth,
  903 |     }));
  904 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-current-source-error.json`), JSON.stringify(sourceErrorRecovery, null, 2), 'utf8');
  905 |     await resultVideo.evaluate((video: HTMLVideoElement) => video.pause());
  906 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-ready.png`) });
  907 |     const normalResult = await page.evaluate(() => {
  908 |       const bounds = (selector: string) => {
  909 |         const element = document.querySelector(selector);
  910 |         if (!element) return null;
  911 |         const rect = element.getBoundingClientRect();
  912 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  913 |       };
  914 |       return {
  915 |         title: bounds('.result-header h1'),
  916 |         exit: bounds('.result-header .exit-link'),
  917 |         screen: bounds('.result-player__screen'),
  918 |         seek: bounds('.result-player__seek'),
  919 |         controls: bounds('.result-player__transport-row'),
  920 |       };
  921 |     });
  922 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-metrics.json`), JSON.stringify(normalResult, null, 2), 'utf8');
  923 |     expect(Math.abs(normalResult.title!.y - (layout === 'A' ? 20 : 27))).toBeLessThanOrEqual(1);
  924 |     expect(Math.abs(normalResult.exit!.y - (layout === 'A' ? 20 : 28))).toBeLessThanOrEqual(1);
  925 |     expect(Math.abs(normalResult.screen!.y - (layout === 'A' ? 108 : 104))).toBeLessThanOrEqual(1);
  926 |     expect(Math.abs(normalResult.screen!.width - 920)).toBeLessThanOrEqual(2);
  927 |     expect(normalResult.seek!.bottom).toBeLessThanOrEqual(normalResult.controls!.y + 1);
  928 |     if (layout === 'A') {
  929 |       await setRecordLocale(page, 'ru');
  930 |       await expect(page.getByRole('heading', { name: 'Ваш результат' })).toBeVisible();
  931 |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-result-ru.png') });
  932 |       await setRecordLocale(page, 'en');
  933 |       await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
  934 |     }
  935 |     await page.setViewportSize({ width: 390, height: 844 });
  936 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  937 |     await expect.poll(() => page.locator('.result-header .exit-link').evaluate((element) => getComputedStyle(element).transform)).toBe('none');
  938 |     const phoneResult = await page.evaluate(() => {
  939 |       const bounds = (selector: string) => {
  940 |         const element = document.querySelector(selector);
  941 |         if (!element) return null;
  942 |         const rect = element.getBoundingClientRect();
  943 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  944 |       };
  945 |       return {
  946 |         screen: bounds('.result-player__screen'),
  947 |         exit: bounds('.result-header .exit-link'),
  948 |         title: bounds('.result-header h1'),
  949 |         seek: bounds('.result-player__seek'),
  950 |         controls: bounds('.result-player__transport-row'),
  951 |         volume: bounds('.result-player__volume input'),
  952 |         source: bounds('.result-player__source-tabs button'),
  953 |         sourceBorder: getComputedStyle(document.querySelector('.result-player__source-tabs')!).borderTopWidth,
  954 |         sourceBackdrop: getComputedStyle(document.querySelector('.result-player__source-tabs')!).backdropFilter,
  955 |         actionMarginTop: getComputedStyle(document.querySelector('.result-workspace__actions')!).marginTop,
  956 |         actions: Array.from(document.querySelectorAll('.result-workspace__actions .button'), (element) => {
  957 |           const rect = element.getBoundingClientRect();
  958 |           return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  959 |         }),
  960 |       };
  961 |     });
  962 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-ready.png`), fullPage: true });
  963 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-metrics.json`), JSON.stringify(phoneResult, null, 2), 'utf8');
  964 |     expect(Math.abs(phoneResult.screen!.x - 16)).toBeLessThanOrEqual(1);
  965 |     expect(Math.abs(phoneResult.screen!.width - 358)).toBeLessThanOrEqual(1);
  966 |     expect(phoneResult.screen!.y).toBe(layout === 'A' ? 136 : 140);
  967 |     expect(phoneResult.exit!.y).toBe(12);
  968 |     expect(phoneResult.title!.y).toBe(68);
  969 |     expect(phoneResult.seek!.height).toBeGreaterThanOrEqual(48);
  970 |     expect(phoneResult.controls!.height).toBeGreaterThanOrEqual(48);
  971 |     expect(phoneResult.volume!.height).toBeGreaterThanOrEqual(48);
  972 |     expect(phoneResult.source!.height).toBeGreaterThanOrEqual(48);
  973 |     expect(phoneResult.sourceBorder).toBe('0px');
  974 |     expect(phoneResult.sourceBackdrop).toBe('none');
  975 |     if (layout === 'B') expect(phoneResult.actionMarginTop).toBe('20px');
  976 |     expect(phoneResult.actions).toHaveLength(2);
  977 |     expect(phoneResult.actions.every((action) => action.height >= 48)).toBe(true);
  978 |     expect(phoneResult.actions[1]!.y).toBeGreaterThan(phoneResult.actions[0]!.y);
  979 |     await page.setViewportSize({ width: 1280, height: 600 });
  980 |     const shortPreflight = await page.evaluate(() => {
  981 |       const inspect = (selector: string) => {
  982 |         const element = document.querySelector(selector);
  983 |         if (!element) return null;
  984 |         const rect = element.getBoundingClientRect();
  985 |         const style = getComputedStyle(element);
  986 |         return {
  987 |           x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom,
  988 |           scrollHeight: element.scrollHeight, display: style.display, flex: style.flex,
  989 |           minWidth: style.minWidth, minHeight: style.minHeight, padding: style.padding,
  990 |           margin: style.margin, gap: style.gap, overflow: style.overflow,
  991 |         };
  992 |       };
  993 |       return {
  994 |         viewport: { width: innerWidth, height: innerHeight, scrollY },
```