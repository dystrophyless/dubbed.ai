# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> Layout A records real browser fake input, recovers the candidate, and completes the accepted snapshot
- Location: e2e\record-journey.spec.ts:667:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- main "Your result" [ref=f11e4]:
  - generic [ref=f11e5]:
    - button "Exit" [ref=f11e6] [cursor=pointer]
    - generic [ref=f11e11]:
      - heading "Your result" [active] [level=1] [ref=f11e12]
      - paragraph [ref=f11e13]: Sintel · The search
  - region "Result" [ref=f11e14]:
    - generic [ref=f11e16]:
      - generic [ref=f11e17]:
        - group "Result" [ref=f11e18]:
          - button "Original" [ref=f11e19] [cursor=pointer]
          - button "My dub" [pressed] [ref=f11e20] [cursor=pointer]
        - generic "My dub" [ref=f11e21]
      - group "Result" [ref=f11e22]:
        - slider "Seek" [ref=f11e23] [cursor=pointer]: "0"
        - generic [ref=f11e24]:
          - button "Play" [ref=f11e25] [cursor=pointer]
          - generic [ref=f11e28]: 0:00 / 0:13
          - generic [ref=f11e29]:
            - generic [ref=f11e30]: Volume
            - slider "Volume" [ref=f11e36]: "0.7"
          - button "Full screen" [ref=f11e37] [cursor=pointer]
    - generic [ref=f11e43]:
      - status [ref=f11e44]:
        - heading "Illustrative sample ready" [level=2] [ref=f11e45]
        - paragraph [ref=f11e46]: Fixed example video; not rendered from accepted takes.
      - generic [ref=f11e47]:
        - button "Download My dub" [ref=f11e48] [cursor=pointer]
        - button "Return to recording" [ref=f11e52] [cursor=pointer]
```

# Test source

```ts
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
  953  |     expect(phoneResult.exit!.y).toBe(12);
  954  |     expect(phoneResult.title!.y).toBe(68);
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
  966  |     const shortPreflight = await page.evaluate(() => {
  967  |       const inspect = (selector: string) => {
  968  |         const element = document.querySelector(selector);
  969  |         if (!element) return null;
  970  |         const rect = element.getBoundingClientRect();
  971  |         const style = getComputedStyle(element);
  972  |         return {
  973  |           x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom,
  974  |           scrollHeight: element.scrollHeight, display: style.display, flex: style.flex,
  975  |           minWidth: style.minWidth, minHeight: style.minHeight, padding: style.padding,
  976  |           margin: style.margin, gap: style.gap, overflow: style.overflow,
  977  |         };
  978  |       };
  979  |       return {
  980  |         viewport: { width: innerWidth, height: innerHeight, scrollY },
  981  |         documentHeight: document.documentElement.scrollHeight,
  982  |         bodyHeight: document.body.scrollHeight,
  983  |         elements: Object.fromEntries([
  984  |           '.result-workspace', '.result-header', '.result-player', '.result-player__screen',
  985  |           '.result-workspace__details', '.result-workspace__status', '.result-workspace__actions',
  986  |         ].map((selector) => [selector, inspect(selector)])),
  987  |       };
  988  |     });
  989  |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-vp01-probe.json`), JSON.stringify(shortPreflight, null, 2), 'utf8');
  990  |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-vp01-probe.png`) });
> 991  |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
       |                                                                                                               ^ Error: expect(received).toBe(expected) // Object.is equality
  992  |     const shortResult = await page.evaluate(() => {
  993  |       const bounds = (selector: string) => {
  994  |         const element = document.querySelector(selector);
  995  |         if (!element) return null;
  996  |         const rect = element.getBoundingClientRect();
  997  |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  998  |       };
  999  |       return {
  1000 |         documentHeight: document.documentElement.scrollHeight,
  1001 |         title: bounds('.result-header h1'),
  1002 |         exit: bounds('.result-header .exit-link'),
  1003 |         player: bounds('.result-player'),
  1004 |         screen: bounds('.result-player__screen'),
  1005 |         rail: bounds('.result-player__transport'),
  1006 |         seek: bounds('.result-player__seek'),
  1007 |         controls: bounds('.result-player__transport-row'),
  1008 |         details: bounds('.result-workspace__details'),
  1009 |         actions: bounds('.result-workspace__actions'),
  1010 |         statusFontSize: getComputedStyle(document.querySelector('.result-workspace__details p')!).fontSize,
  1011 |         statusLineHeight: getComputedStyle(document.querySelector('.result-workspace__details p')!).lineHeight,
  1012 |         workspacePaddingBottom: getComputedStyle(document.querySelector('.result-workspace')!).paddingBottom,
  1013 |         actionsFlex: getComputedStyle(document.querySelector('.result-workspace__actions')!).flex,
  1014 |       };
  1015 |     });
  1016 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-ready.png`) });
  1017 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-metrics.json`), JSON.stringify(shortResult, null, 2), 'utf8');
  1018 |     expect(shortResult.documentHeight).toBeLessThanOrEqual(600);
  1019 |     expect(shortResult.title?.y).toBe(16);
  1020 |     expect(shortResult.exit?.y).toBe(16);
  1021 |     expect(shortResult.title!.bottom).toBeLessThanOrEqual(600);
  1022 |     const shortTarget = layout === 'A' ? { y: 88, width: 548 } : { y: 80, width: 562 };
  1023 |     expect(Math.abs(shortResult.screen!.y - shortTarget.y)).toBeLessThanOrEqual(1);
  1024 |     expect(Math.abs(shortResult.screen!.width - shortTarget.width)).toBeLessThanOrEqual(4);
  1025 |     expect(shortResult.seek!.bottom).toBeLessThanOrEqual(shortResult.controls!.y + 1);
  1026 |     expect(shortResult.actions!.height).toBeGreaterThanOrEqual(88);
  1027 |     expect(shortResult.actions!.bottom).toBeLessThanOrEqual(600);
  1028 |     expect(shortResult.actionsFlex).toBe('0 1 auto');
  1029 |     if (layout === 'A') {
  1030 |       expect(shortResult.statusFontSize).toBe('14px');
  1031 |       expect(shortResult.statusLineHeight).toBe('20px');
  1032 |       expect(shortResult.workspacePaddingBottom).toBe('8px');
  1033 |     }
  1034 |     await page.setViewportSize({ width: 1440, height: 900 });
  1035 | 
  1036 |     await resultVideo.evaluate((video: HTMLVideoElement) => {
  1037 |       video.pause();
  1038 |       video.currentTime = Math.max(0, video.duration - 0.2);
  1039 |     });
  1040 |     await page.locator('#result-play').click();
  1041 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.ended), { timeout: 5_000 }).toBe(true);
  1042 |     const replayButton = page.getByRole('button', { name: 'Replay', exact: true });
  1043 |     await expect(replayButton).toHaveCount(1);
  1044 |     await expect(replayButton).toHaveAttribute('id', 'result-play');
  1045 |     await replayButton.click();
  1046 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1047 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.05);
  1048 |     await page.locator('#result-play').click();
  1049 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  1050 | 
  1051 |     const originalSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'Original' });
  1052 |     const dubSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' });
  1053 |     await expect(page.locator('.result-player__source-tabs')).toHaveAttribute('role', 'group');
  1054 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  1055 |     await originalSource.focus();
  1056 |     await page.keyboard.press('Space');
  1057 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  1058 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  1059 |     await page.keyboard.press('ArrowRight');
  1060 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  1061 |     await expect(dubSource).toBeFocused();
  1062 |     await page.keyboard.press('ArrowLeft');
  1063 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  1064 |     await expect(originalSource).toBeFocused();
  1065 |     await page.keyboard.press('End');
  1066 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  1067 |     await page.keyboard.press('Home');
  1068 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  1069 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  1070 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.2);
  1071 |     const switchTime = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  1072 |     await dubSource.click();
  1073 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  1074 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  1075 |     await expect(resultVideo).toHaveAttribute('data-generation-id', presentedGenerationId ?? '');
  1076 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1077 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
  1078 |     await expect.poll(async () => Math.abs(await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime) - switchTime))
  1079 |       .toBeLessThan(1.5);
  1080 | 
  1081 |     const resultSeek = page.locator('.result-player__seek');
  1082 |     await resultSeek.focus();
  1083 |     await page.keyboard.down('ArrowRight');
  1084 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  1085 |     await page.keyboard.up('ArrowRight');
  1086 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1087 |     const afterKeyboardRelease = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  1088 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(afterKeyboardRelease);
  1089 | 
  1090 |     await resultVideo.evaluate((video: HTMLVideoElement) => video.pause());
  1091 |     await resultSeek.dispatchEvent('pointerdown');
```