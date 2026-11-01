# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> Layout A records real browser fake input, recovers the candidate, and completes the accepted snapshot
- Location: e2e\record-journey.spec.ts:667:3

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 4
Received:    36
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
  959  |         }),
  960  |       };
  961  |     });
  962  |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-ready.png`), fullPage: true });
  963  |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-metrics.json`), JSON.stringify(phoneResult, null, 2), 'utf8');
  964  |     expect(Math.abs(phoneResult.screen!.x - 16)).toBeLessThanOrEqual(1);
  965  |     expect(Math.abs(phoneResult.screen!.width - 358)).toBeLessThanOrEqual(1);
  966  |     expect(phoneResult.screen!.y).toBe(layout === 'A' ? 136 : 140);
  967  |     expect(phoneResult.exit!.y).toBe(12);
  968  |     expect(phoneResult.title!.y).toBe(68);
  969  |     expect(phoneResult.seek!.height).toBeGreaterThanOrEqual(48);
  970  |     expect(phoneResult.controls!.height).toBeGreaterThanOrEqual(48);
  971  |     expect(phoneResult.volume!.height).toBeGreaterThanOrEqual(48);
  972  |     expect(phoneResult.source!.height).toBeGreaterThanOrEqual(48);
  973  |     expect(phoneResult.sourceBorder).toBe('0px');
  974  |     expect(phoneResult.sourceBackdrop).toBe('none');
  975  |     if (layout === 'B') expect(phoneResult.actionMarginTop).toBe('20px');
  976  |     expect(phoneResult.actions).toHaveLength(2);
  977  |     expect(phoneResult.actions.every((action) => action.height >= 48)).toBe(true);
  978  |     expect(phoneResult.actions[1]!.y).toBeGreaterThan(phoneResult.actions[0]!.y);
  979  |     await page.setViewportSize({ width: 1280, height: 600 });
  980  |     const shortPreflight = await page.evaluate(() => {
  981  |       const inspect = (selector: string) => {
  982  |         const element = document.querySelector(selector);
  983  |         if (!element) return null;
  984  |         const rect = element.getBoundingClientRect();
  985  |         const style = getComputedStyle(element);
  986  |         return {
  987  |           x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom,
  988  |           scrollHeight: element.scrollHeight, display: style.display, flex: style.flex,
  989  |           minWidth: style.minWidth, minHeight: style.minHeight, padding: style.padding,
  990  |           margin: style.margin, gap: style.gap, overflow: style.overflow,
  991  |         };
  992  |       };
  993  |       return {
  994  |         viewport: { width: innerWidth, height: innerHeight, scrollY },
  995  |         documentHeight: document.documentElement.scrollHeight,
  996  |         bodyHeight: document.body.scrollHeight,
  997  |         boxes: Object.fromEntries(['html', 'body', '#root', '#product'].map((selector) => {
  998  |           const element = document.querySelector(selector);
  999  |           if (!element) return [selector, null];
  1000 |           const rect = element.getBoundingClientRect();
  1001 |           const style = getComputedStyle(element);
  1002 |           return [selector, {
  1003 |             x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom,
  1004 |             scrollHeight: element.scrollHeight, padding: style.padding, margin: style.margin,
  1005 |             minHeight: style.minHeight, position: style.position, overflow: style.overflow,
  1006 |           }];
  1007 |         })),
  1008 |         overflowNodes: Array.from(document.querySelectorAll('body *')).map((element) => {
  1009 |           const rect = element.getBoundingClientRect();
  1010 |           const style = getComputedStyle(element);
  1011 |           return {
  1012 |             tag: element.tagName.toLowerCase(), id: element.id, className: typeof element.className === 'string' ? element.className : '',
  1013 |             y: rect.y, bottom: rect.bottom, height: rect.height, position: style.position,
  1014 |             marginBottom: style.marginBottom, paddingBottom: style.paddingBottom, display: style.display,
  1015 |           };
  1016 |         }).filter((element) => element.display !== 'none' && element.bottom > innerHeight + 1)
  1017 |           .sort((a, b) => b.bottom - a.bottom).slice(0, 12),
  1018 |         elements: Object.fromEntries([
  1019 |           '.result-workspace', '.result-header', '.result-player', '.result-player__screen',
  1020 |           '.result-workspace__details', '.result-workspace__status', '.result-workspace__actions',
  1021 |         ].map((selector) => [selector, inspect(selector)])),
  1022 |       };
  1023 |     });
  1024 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-vp01-probe.json`), JSON.stringify(shortPreflight, null, 2), 'utf8');
  1025 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-vp01-probe.png`) });
  1026 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  1027 |     const shortResult = await page.evaluate(() => {
  1028 |       const bounds = (selector: string) => {
  1029 |         const element = document.querySelector(selector);
  1030 |         if (!element) return null;
  1031 |         const rect = element.getBoundingClientRect();
  1032 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  1033 |       };
  1034 |       return {
  1035 |         documentHeight: document.documentElement.scrollHeight,
  1036 |         title: bounds('.result-header h1'),
  1037 |         exit: bounds('.result-header .exit-link'),
  1038 |         player: bounds('.result-player'),
  1039 |         screen: bounds('.result-player__screen'),
  1040 |         rail: bounds('.result-player__transport'),
  1041 |         seek: bounds('.result-player__seek'),
  1042 |         controls: bounds('.result-player__transport-row'),
  1043 |         details: bounds('.result-workspace__details'),
  1044 |         actions: bounds('.result-workspace__actions'),
  1045 |         statusFontSize: getComputedStyle(document.querySelector('.result-workspace__details p')!).fontSize,
  1046 |         statusLineHeight: getComputedStyle(document.querySelector('.result-workspace__details p')!).lineHeight,
  1047 |         workspacePaddingBottom: getComputedStyle(document.querySelector('.result-workspace')!).paddingBottom,
  1048 |         actionsFlex: getComputedStyle(document.querySelector('.result-workspace__actions')!).flex,
  1049 |       };
  1050 |     });
  1051 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-ready.png`) });
  1052 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-metrics.json`), JSON.stringify(shortResult, null, 2), 'utf8');
  1053 |     expect(shortResult.documentHeight).toBeLessThanOrEqual(600);
  1054 |     expect(shortResult.title?.y).toBe(16);
  1055 |     expect(shortResult.exit?.y).toBe(16);
  1056 |     expect(shortResult.title!.bottom).toBeLessThanOrEqual(600);
  1057 |     const shortTarget = layout === 'A' ? { y: 88, width: 548 } : { y: 80, width: 562 };
  1058 |     expect(Math.abs(shortResult.screen!.y - shortTarget.y)).toBeLessThanOrEqual(1);
> 1059 |     expect(Math.abs(shortResult.screen!.width - shortTarget.width)).toBeLessThanOrEqual(4);
       |                                                                     ^ Error: expect(received).toBeLessThanOrEqual(expected)
  1060 |     expect(shortResult.seek!.bottom).toBeLessThanOrEqual(shortResult.controls!.y + 1);
  1061 |     expect(shortResult.actions!.height).toBeGreaterThanOrEqual(88);
  1062 |     expect(shortResult.actions!.bottom).toBeLessThanOrEqual(600);
  1063 |     expect(shortResult.actionsFlex).toBe('0 1 auto');
  1064 |     if (layout === 'A') {
  1065 |       expect(shortResult.statusFontSize).toBe('14px');
  1066 |       expect(shortResult.statusLineHeight).toBe('20px');
  1067 |       expect(shortResult.workspacePaddingBottom).toBe('8px');
  1068 |     }
  1069 |     await page.setViewportSize({ width: 1440, height: 900 });
  1070 | 
  1071 |     await resultVideo.evaluate((video: HTMLVideoElement) => {
  1072 |       video.pause();
  1073 |       video.currentTime = Math.max(0, video.duration - 0.2);
  1074 |     });
  1075 |     await page.locator('#result-play').click();
  1076 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.ended), { timeout: 5_000 }).toBe(true);
  1077 |     const replayButton = page.getByRole('button', { name: 'Replay', exact: true });
  1078 |     await expect(replayButton).toHaveCount(1);
  1079 |     await expect(replayButton).toHaveAttribute('id', 'result-play');
  1080 |     await replayButton.click();
  1081 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1082 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.05);
  1083 |     await page.locator('#result-play').click();
  1084 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  1085 | 
  1086 |     const originalSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'Original' });
  1087 |     const dubSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' });
  1088 |     await expect(page.locator('.result-player__source-tabs')).toHaveAttribute('role', 'group');
  1089 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  1090 |     await originalSource.focus();
  1091 |     await page.keyboard.press('Space');
  1092 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  1093 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  1094 |     await page.keyboard.press('ArrowRight');
  1095 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  1096 |     await expect(dubSource).toBeFocused();
  1097 |     await page.keyboard.press('ArrowLeft');
  1098 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  1099 |     await expect(originalSource).toBeFocused();
  1100 |     await page.keyboard.press('End');
  1101 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  1102 |     await page.keyboard.press('Home');
  1103 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  1104 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  1105 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.2);
  1106 |     const switchTime = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  1107 |     await dubSource.click();
  1108 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  1109 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  1110 |     await expect(resultVideo).toHaveAttribute('data-generation-id', presentedGenerationId ?? '');
  1111 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1112 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
  1113 |     await expect.poll(async () => Math.abs(await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime) - switchTime))
  1114 |       .toBeLessThan(1.5);
  1115 | 
  1116 |     const resultSeek = page.locator('.result-player__seek');
  1117 |     await resultSeek.focus();
  1118 |     await page.keyboard.down('ArrowRight');
  1119 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  1120 |     await page.keyboard.up('ArrowRight');
  1121 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1122 |     const afterKeyboardRelease = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  1123 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(afterKeyboardRelease);
  1124 | 
  1125 |     await resultVideo.evaluate((video: HTMLVideoElement) => video.pause());
  1126 |     await resultSeek.dispatchEvent('pointerdown');
  1127 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  1128 |     await resultSeek.dispatchEvent('pointercancel');
  1129 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  1130 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  1131 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1132 |     await resultSeek.dispatchEvent('pointerdown');
  1133 |     await resultSeek.evaluate((input: HTMLInputElement) => input.blur());
  1134 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  1135 | 
  1136 |     const currentGenerationBeforeDownload = await resultVideo.getAttribute('data-generation-id');
  1137 |     await originalSource.click();
  1138 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  1139 | 
  1140 |     if (layout === 'A') {
  1141 |       await installResultPlayFaults(page);
  1142 |       const firstOriginalElement = await resultVideo.evaluateHandle((video) => video);
  1143 |       await armResultPlayFault(page, 'late-abort');
  1144 |       await page.getByRole('button', { name: 'Play', exact: true }).click();
  1145 |       await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1146 |       await page.waitForTimeout(80);
  1147 |       await dubSource.click();
  1148 |       await expect(resultVideo).toHaveAttribute('data-source', 'dub');
  1149 |       await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1150 |       await expect.poll(() => page.evaluate(() => {
  1151 |         const trace = (window as Window & { __resultPlayTrace?: ResultPlayFaultEntry[] }).__resultPlayTrace ?? [];
  1152 |         return trace.some((entry) => entry.fault === 'late-abort' && entry.rejectedAt !== null);
  1153 |       })).toBe(true);
  1154 |       expect(await firstOriginalElement.evaluate((video) => video.isConnected)).toBe(false);
  1155 |       await expect(page.locator('.result-player__error')).toHaveCount(0);
  1156 |       await expect(page.locator('.result-player__transport-row button[aria-label="Pause"]')).toBeEnabled();
  1157 | 
  1158 |       await originalSource.click();
  1159 |       await expect(resultVideo).toHaveAttribute('data-source', 'original');
```