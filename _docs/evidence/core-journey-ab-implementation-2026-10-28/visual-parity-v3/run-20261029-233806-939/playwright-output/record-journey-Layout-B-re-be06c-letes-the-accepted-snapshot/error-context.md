# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> Layout B records real browser fake input, recovers the candidate, and completes the accepted snapshot
- Location: e2e\record-journey.spec.ts:667:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 40
Received: 12
```

# Page snapshot

```yaml
- main "Your result" [ref=f10e4]:
  - generic [ref=f10e5]:
    - button "Exit" [ref=f10e6] [cursor=pointer]
    - generic [ref=f10e11]:
      - heading "Your result" [active] [level=1] [ref=f10e12]
      - paragraph [ref=f10e13]: Sintel · The search
  - region "Result" [ref=f10e14]:
    - generic [ref=f10e16]:
      - generic [ref=f10e17]:
        - group "Result" [ref=f10e18]:
          - button "Original" [ref=f10e19] [cursor=pointer]
          - button "My dub" [pressed] [ref=f10e20] [cursor=pointer]
        - generic "My dub" [ref=f10e21]
      - group "Result" [ref=f10e22]:
        - slider "Seek" [ref=f10e23] [cursor=pointer]: "0"
        - generic [ref=f10e24]:
          - button "Play" [ref=f10e25] [cursor=pointer]
          - generic [ref=f10e28]: 0:00 / 0:13
          - generic [ref=f10e29]:
            - generic [ref=f10e30]: Volume
            - slider "Volume" [ref=f10e31]: "0.7"
          - button "Full screen" [ref=f10e32] [cursor=pointer]
    - generic [ref=f10e38]:
      - status [ref=f10e39]:
        - heading "Illustrative sample ready" [level=2] [ref=f10e40]
        - paragraph [ref=f10e41]: Fixed example video; not rendered from accepted takes.
      - generic [ref=f10e42]:
        - button "Download My dub" [ref=f10e43] [cursor=pointer]
        - button "Return to recording" [ref=f10e47] [cursor=pointer]
```

# Test source

```ts
  853  | 
  854  |     let finalDatabase = await readIndexedDb(page);
  855  |     expect(finalDatabase.project?.initialResultSnapshotId).toBeTruthy();
  856  |     expect(finalDatabase.snapshots).toHaveLength(1);
  857  |     const snapshot = finalDatabase.snapshots[0] as { takes: unknown[]; authorization: string; contentSha256: string };
  858  |     expect(snapshot.authorization).toBe('initial-completion');
  859  |     expect(snapshot.takes).toHaveLength(3);
  860  |     expect(snapshot.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  861  | 
  862  |     if (layout === 'B') {
  863  |       const snapshotId = String(finalDatabase.project?.latestResultSnapshotId ?? '');
  864  |       expect(snapshotId).toBeTruthy();
  865  |       await page.goto(`/projects/sintel-prepared/result?layout=B&snapshot=${encodeURIComponent(snapshotId)}`);
  866  |     }
  867  |     await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
  868  |     await expect(page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' })).toBeVisible();
  869  |     await expect(page.locator('.result-header h1')).toBeFocused();
  870  |     expect(await page.evaluate(() => window.scrollY)).toBe(0);
  871  |     expect(await page.locator('.result-header .lucide-log-out').count()).toBe(1);
  872  |     expect(await page.locator('.result-workspace__actions button').filter({ hasText: 'Return to recording' }).locator('.lucide-undo-2').count()).toBe(1);
  873  | 
  874  |     if (layout === 'A') {
  875  |       await expect(page.getByRole('button', { name: 'Retry assembly', exact: true })).toBeVisible();
  876  |       await expect(page.getByText('The result sample could not be loaded. Your accepted takes and previous result remain unchanged.')).toBeVisible();
  877  |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-result-fixture-unavailable.png') });
  878  |       await page.unroute('**/media/example-dub.mp4');
  879  |       await page.getByRole('button', { name: 'Retry assembly', exact: true }).click();
  880  |     }
  881  | 
  882  |     await expect(page.getByText('Illustrative sample ready')).toBeVisible({ timeout: 15_000 });
  883  |     const resultVideo = page.getByTestId('result-video');
  884  |     await expect(resultVideo).toHaveAttribute('data-source', 'dub');
  885  |     await expect(resultVideo).toHaveAttribute('src', /^blob:/);
  886  |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.videoWidth > 0)).toBe(true);
  887  |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  888  |     await expect(page.locator('#result-volume')).toHaveValue('0.7');
  889  |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
  890  |     const presentedGenerationId = await resultVideo.getAttribute('data-generation-id');
  891  |     expect(presentedGenerationId).toMatch(/^generation:/);
  892  |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-ready.png`) });
  893  |     const normalResult = await page.evaluate(() => {
  894  |       const bounds = (selector: string) => {
  895  |         const element = document.querySelector(selector);
  896  |         if (!element) return null;
  897  |         const rect = element.getBoundingClientRect();
  898  |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  899  |       };
  900  |       return {
  901  |         title: bounds('.result-header h1'),
  902  |         exit: bounds('.result-header .exit-link'),
  903  |         screen: bounds('.result-player__screen'),
  904  |         seek: bounds('.result-player__seek'),
  905  |         controls: bounds('.result-player__transport-row'),
  906  |       };
  907  |     });
  908  |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-metrics.json`), JSON.stringify(normalResult, null, 2), 'utf8');
  909  |     expect(Math.abs(normalResult.title!.y - (layout === 'A' ? 20 : 27))).toBeLessThanOrEqual(1);
  910  |     expect(Math.abs(normalResult.exit!.y - (layout === 'A' ? 20 : 28))).toBeLessThanOrEqual(1);
  911  |     expect(Math.abs(normalResult.screen!.y - (layout === 'A' ? 108 : 104))).toBeLessThanOrEqual(1);
  912  |     expect(Math.abs(normalResult.screen!.width - 920)).toBeLessThanOrEqual(2);
  913  |     expect(normalResult.seek!.bottom).toBeLessThanOrEqual(normalResult.controls!.y + 1);
  914  |     if (layout === 'A') {
  915  |       await setRecordLocale(page, 'ru');
  916  |       await expect(page.getByRole('heading', { name: 'Ваш результат' })).toBeVisible();
  917  |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-result-ru.png') });
  918  |       await setRecordLocale(page, 'en');
  919  |       await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
  920  |     }
  921  |     await page.setViewportSize({ width: 390, height: 844 });
  922  |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  923  |     await expect.poll(() => page.locator('.result-header .exit-link').evaluate((element) => getComputedStyle(element).transform)).toBe('none');
  924  |     const phoneResult = await page.evaluate(() => {
  925  |       const bounds = (selector: string) => {
  926  |         const element = document.querySelector(selector);
  927  |         if (!element) return null;
  928  |         const rect = element.getBoundingClientRect();
  929  |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  930  |       };
  931  |       return {
  932  |         screen: bounds('.result-player__screen'),
  933  |         exit: bounds('.result-header .exit-link'),
  934  |         title: bounds('.result-header h1'),
  935  |         seek: bounds('.result-player__seek'),
  936  |         controls: bounds('.result-player__transport-row'),
  937  |         volume: bounds('.result-player__volume input'),
  938  |         source: bounds('.result-player__source-tabs button'),
  939  |         sourceBorder: getComputedStyle(document.querySelector('.result-player__source-tabs')!).borderTopWidth,
  940  |         sourceBackdrop: getComputedStyle(document.querySelector('.result-player__source-tabs')!).backdropFilter,
  941  |         actionMarginTop: getComputedStyle(document.querySelector('.result-workspace__actions')!).marginTop,
  942  |         actions: Array.from(document.querySelectorAll('.result-workspace__actions .button'), (element) => {
  943  |           const rect = element.getBoundingClientRect();
  944  |           return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  945  |         }),
  946  |       };
  947  |     });
  948  |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-ready.png`), fullPage: true });
  949  |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-metrics.json`), JSON.stringify(phoneResult, null, 2), 'utf8');
  950  |     expect(Math.abs(phoneResult.screen!.x - 16)).toBeLessThanOrEqual(1);
  951  |     expect(Math.abs(phoneResult.screen!.width - 358)).toBeLessThanOrEqual(1);
  952  |     expect(phoneResult.screen!.y).toBe(layout === 'A' ? 136 : 140);
> 953  |     expect(phoneResult.exit!.y).toBe(40);
       |                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  954  |     expect(phoneResult.title!.y).toBe(layout === 'A' ? 97 : 96);
  955  |     expect(phoneResult.seek!.height).toBeGreaterThanOrEqual(48);
  956  |     expect(phoneResult.controls!.height).toBeGreaterThanOrEqual(48);
  957  |     expect(phoneResult.volume!.height).toBeGreaterThanOrEqual(48);
  958  |     expect(phoneResult.source!.height).toBeGreaterThanOrEqual(48);
  959  |     expect(phoneResult.sourceBorder).toBe('0px');
  960  |     expect(phoneResult.sourceBackdrop).toBe('none');
  961  |     if (layout === 'B') expect(phoneResult.actionMarginTop).toBe('20px');
  962  |     expect(phoneResult.actions).toHaveLength(2);
  963  |     expect(phoneResult.actions.every((action) => action.height >= 48)).toBe(true);
  964  |     expect(phoneResult.actions[1]!.y).toBeGreaterThan(phoneResult.actions[0]!.y);
  965  |     await page.setViewportSize({ width: 1280, height: 600 });
  966  |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  967  |     const shortResult = await page.evaluate(() => {
  968  |       const bounds = (selector: string) => {
  969  |         const element = document.querySelector(selector);
  970  |         if (!element) return null;
  971  |         const rect = element.getBoundingClientRect();
  972  |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  973  |       };
  974  |       return {
  975  |         documentHeight: document.documentElement.scrollHeight,
  976  |         title: bounds('.result-header h1'),
  977  |         exit: bounds('.result-header .exit-link'),
  978  |         player: bounds('.result-player'),
  979  |         screen: bounds('.result-player__screen'),
  980  |         rail: bounds('.result-player__transport'),
  981  |         seek: bounds('.result-player__seek'),
  982  |         controls: bounds('.result-player__transport-row'),
  983  |         details: bounds('.result-workspace__details'),
  984  |         actions: bounds('.result-workspace__actions'),
  985  |         statusFontSize: getComputedStyle(document.querySelector('.result-workspace__details p')!).fontSize,
  986  |         statusLineHeight: getComputedStyle(document.querySelector('.result-workspace__details p')!).lineHeight,
  987  |         workspacePaddingBottom: getComputedStyle(document.querySelector('.result-workspace')!).paddingBottom,
  988  |         actionsFlex: getComputedStyle(document.querySelector('.result-workspace__actions')!).flex,
  989  |       };
  990  |     });
  991  |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-ready.png`) });
  992  |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-metrics.json`), JSON.stringify(shortResult, null, 2), 'utf8');
  993  |     expect(shortResult.documentHeight).toBeLessThanOrEqual(600);
  994  |     expect(shortResult.title?.y).toBe(16);
  995  |     expect(shortResult.exit?.y).toBe(16);
  996  |     expect(shortResult.title!.bottom).toBeLessThanOrEqual(600);
  997  |     const shortTarget = layout === 'A' ? { y: 88, width: 548 } : { y: 80, width: 562 };
  998  |     expect(Math.abs(shortResult.screen!.y - shortTarget.y)).toBeLessThanOrEqual(1);
  999  |     expect(Math.abs(shortResult.screen!.width - shortTarget.width)).toBeLessThanOrEqual(4);
  1000 |     expect(shortResult.seek!.bottom).toBeLessThanOrEqual(shortResult.controls!.y + 1);
  1001 |     expect(shortResult.actions!.height).toBeGreaterThanOrEqual(88);
  1002 |     expect(shortResult.actions!.bottom).toBeLessThanOrEqual(600);
  1003 |     expect(shortResult.actionsFlex).toBe('0 1 auto');
  1004 |     if (layout === 'A') {
  1005 |       expect(shortResult.statusFontSize).toBe('14px');
  1006 |       expect(shortResult.statusLineHeight).toBe('20px');
  1007 |       expect(shortResult.workspacePaddingBottom).toBe('8px');
  1008 |     }
  1009 |     await page.setViewportSize({ width: 1440, height: 900 });
  1010 | 
  1011 |     await resultVideo.evaluate((video: HTMLVideoElement) => {
  1012 |       video.pause();
  1013 |       video.currentTime = Math.max(0, video.duration - 0.2);
  1014 |     });
  1015 |     await page.locator('#result-play').click();
  1016 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.ended), { timeout: 5_000 }).toBe(true);
  1017 |     const replayButton = page.getByRole('button', { name: 'Replay', exact: true });
  1018 |     await expect(replayButton).toHaveCount(1);
  1019 |     await expect(replayButton).toHaveAttribute('id', 'result-play');
  1020 |     await replayButton.click();
  1021 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1022 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.05);
  1023 |     await page.locator('#result-play').click();
  1024 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  1025 | 
  1026 |     const originalSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'Original' });
  1027 |     const dubSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' });
  1028 |     await expect(page.locator('.result-player__source-tabs')).toHaveAttribute('role', 'group');
  1029 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  1030 |     await originalSource.focus();
  1031 |     await page.keyboard.press('Space');
  1032 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  1033 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  1034 |     await page.keyboard.press('ArrowRight');
  1035 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  1036 |     await expect(dubSource).toBeFocused();
  1037 |     await page.keyboard.press('ArrowLeft');
  1038 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  1039 |     await expect(originalSource).toBeFocused();
  1040 |     await page.keyboard.press('End');
  1041 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  1042 |     await page.keyboard.press('Home');
  1043 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  1044 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  1045 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.2);
  1046 |     const switchTime = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  1047 |     await dubSource.click();
  1048 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  1049 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  1050 |     await expect(resultVideo).toHaveAttribute('data-generation-id', presentedGenerationId ?? '');
  1051 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1052 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
  1053 |     await expect.poll(async () => Math.abs(await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime) - switchTime))
```