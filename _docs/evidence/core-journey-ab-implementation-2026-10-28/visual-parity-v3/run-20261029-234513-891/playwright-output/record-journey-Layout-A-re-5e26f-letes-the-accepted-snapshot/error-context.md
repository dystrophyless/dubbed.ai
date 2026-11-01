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
  983  |         boxes: Object.fromEntries(['html', 'body', '#root', '#product'].map((selector) => {
  984  |           const element = document.querySelector(selector);
  985  |           if (!element) return [selector, null];
  986  |           const rect = element.getBoundingClientRect();
  987  |           const style = getComputedStyle(element);
  988  |           return [selector, {
  989  |             x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom,
  990  |             scrollHeight: element.scrollHeight, padding: style.padding, margin: style.margin,
  991  |             minHeight: style.minHeight, position: style.position, overflow: style.overflow,
  992  |           }];
  993  |         })),
  994  |         overflowNodes: Array.from(document.querySelectorAll('body *')).map((element) => {
  995  |           const rect = element.getBoundingClientRect();
  996  |           const style = getComputedStyle(element);
  997  |           return {
  998  |             tag: element.tagName.toLowerCase(), id: element.id, className: typeof element.className === 'string' ? element.className : '',
  999  |             y: rect.y, bottom: rect.bottom, height: rect.height, position: style.position,
  1000 |             marginBottom: style.marginBottom, paddingBottom: style.paddingBottom, display: style.display,
  1001 |           };
  1002 |         }).filter((element) => element.display !== 'none' && element.bottom > innerHeight + 1)
  1003 |           .sort((a, b) => b.bottom - a.bottom).slice(0, 12),
  1004 |         elements: Object.fromEntries([
  1005 |           '.result-workspace', '.result-header', '.result-player', '.result-player__screen',
  1006 |           '.result-workspace__details', '.result-workspace__status', '.result-workspace__actions',
  1007 |         ].map((selector) => [selector, inspect(selector)])),
  1008 |       };
  1009 |     });
  1010 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-vp01-probe.json`), JSON.stringify(shortPreflight, null, 2), 'utf8');
  1011 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-vp01-probe.png`) });
> 1012 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
       |                                                                                                               ^ Error: expect(received).toBe(expected) // Object.is equality
  1013 |     const shortResult = await page.evaluate(() => {
  1014 |       const bounds = (selector: string) => {
  1015 |         const element = document.querySelector(selector);
  1016 |         if (!element) return null;
  1017 |         const rect = element.getBoundingClientRect();
  1018 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  1019 |       };
  1020 |       return {
  1021 |         documentHeight: document.documentElement.scrollHeight,
  1022 |         title: bounds('.result-header h1'),
  1023 |         exit: bounds('.result-header .exit-link'),
  1024 |         player: bounds('.result-player'),
  1025 |         screen: bounds('.result-player__screen'),
  1026 |         rail: bounds('.result-player__transport'),
  1027 |         seek: bounds('.result-player__seek'),
  1028 |         controls: bounds('.result-player__transport-row'),
  1029 |         details: bounds('.result-workspace__details'),
  1030 |         actions: bounds('.result-workspace__actions'),
  1031 |         statusFontSize: getComputedStyle(document.querySelector('.result-workspace__details p')!).fontSize,
  1032 |         statusLineHeight: getComputedStyle(document.querySelector('.result-workspace__details p')!).lineHeight,
  1033 |         workspacePaddingBottom: getComputedStyle(document.querySelector('.result-workspace')!).paddingBottom,
  1034 |         actionsFlex: getComputedStyle(document.querySelector('.result-workspace__actions')!).flex,
  1035 |       };
  1036 |     });
  1037 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-ready.png`) });
  1038 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-metrics.json`), JSON.stringify(shortResult, null, 2), 'utf8');
  1039 |     expect(shortResult.documentHeight).toBeLessThanOrEqual(600);
  1040 |     expect(shortResult.title?.y).toBe(16);
  1041 |     expect(shortResult.exit?.y).toBe(16);
  1042 |     expect(shortResult.title!.bottom).toBeLessThanOrEqual(600);
  1043 |     const shortTarget = layout === 'A' ? { y: 88, width: 548 } : { y: 80, width: 562 };
  1044 |     expect(Math.abs(shortResult.screen!.y - shortTarget.y)).toBeLessThanOrEqual(1);
  1045 |     expect(Math.abs(shortResult.screen!.width - shortTarget.width)).toBeLessThanOrEqual(4);
  1046 |     expect(shortResult.seek!.bottom).toBeLessThanOrEqual(shortResult.controls!.y + 1);
  1047 |     expect(shortResult.actions!.height).toBeGreaterThanOrEqual(88);
  1048 |     expect(shortResult.actions!.bottom).toBeLessThanOrEqual(600);
  1049 |     expect(shortResult.actionsFlex).toBe('0 1 auto');
  1050 |     if (layout === 'A') {
  1051 |       expect(shortResult.statusFontSize).toBe('14px');
  1052 |       expect(shortResult.statusLineHeight).toBe('20px');
  1053 |       expect(shortResult.workspacePaddingBottom).toBe('8px');
  1054 |     }
  1055 |     await page.setViewportSize({ width: 1440, height: 900 });
  1056 | 
  1057 |     await resultVideo.evaluate((video: HTMLVideoElement) => {
  1058 |       video.pause();
  1059 |       video.currentTime = Math.max(0, video.duration - 0.2);
  1060 |     });
  1061 |     await page.locator('#result-play').click();
  1062 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.ended), { timeout: 5_000 }).toBe(true);
  1063 |     const replayButton = page.getByRole('button', { name: 'Replay', exact: true });
  1064 |     await expect(replayButton).toHaveCount(1);
  1065 |     await expect(replayButton).toHaveAttribute('id', 'result-play');
  1066 |     await replayButton.click();
  1067 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1068 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.05);
  1069 |     await page.locator('#result-play').click();
  1070 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  1071 | 
  1072 |     const originalSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'Original' });
  1073 |     const dubSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' });
  1074 |     await expect(page.locator('.result-player__source-tabs')).toHaveAttribute('role', 'group');
  1075 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  1076 |     await originalSource.focus();
  1077 |     await page.keyboard.press('Space');
  1078 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  1079 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  1080 |     await page.keyboard.press('ArrowRight');
  1081 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  1082 |     await expect(dubSource).toBeFocused();
  1083 |     await page.keyboard.press('ArrowLeft');
  1084 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  1085 |     await expect(originalSource).toBeFocused();
  1086 |     await page.keyboard.press('End');
  1087 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  1088 |     await page.keyboard.press('Home');
  1089 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  1090 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  1091 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.2);
  1092 |     const switchTime = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  1093 |     await dubSource.click();
  1094 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  1095 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  1096 |     await expect(resultVideo).toHaveAttribute('data-generation-id', presentedGenerationId ?? '');
  1097 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1098 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
  1099 |     await expect.poll(async () => Math.abs(await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime) - switchTime))
  1100 |       .toBeLessThan(1.5);
  1101 | 
  1102 |     const resultSeek = page.locator('.result-player__seek');
  1103 |     await resultSeek.focus();
  1104 |     await page.keyboard.down('ArrowRight');
  1105 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  1106 |     await page.keyboard.up('ArrowRight');
  1107 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1108 |     const afterKeyboardRelease = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  1109 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(afterKeyboardRelease);
  1110 | 
  1111 |     await resultVideo.evaluate((video: HTMLVideoElement) => video.pause());
  1112 |     await resultSeek.dispatchEvent('pointerdown');
```