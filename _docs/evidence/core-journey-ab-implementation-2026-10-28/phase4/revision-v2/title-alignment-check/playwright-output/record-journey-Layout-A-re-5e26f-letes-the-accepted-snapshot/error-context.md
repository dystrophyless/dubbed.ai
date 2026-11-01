# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> Layout A records real browser fake input, recovers the candidate, and completes the accepted snapshot
- Location: e2e\record-journey.spec.ts:601:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 40
Received: 53.029701232910156
```

# Page snapshot

```yaml
- generic [ref=f11e3]:
  - banner [ref=f11e4]:
    - button "Exit" [ref=f11e5] [cursor=pointer]
    - generic [ref=f11e10]:
      - heading "Your result" [active] [level=1] [ref=f11e11]
      - paragraph [ref=f11e12]: Sintel · The Search
  - main "Your result" [ref=f11e13]:
    - generic [ref=f11e14]:
      - generic [ref=f11e15]:
        - group "Result" [ref=f11e16]:
          - button "Original" [ref=f11e17] [cursor=pointer]
          - button "My dub" [pressed] [ref=f11e18] [cursor=pointer]
        - generic "My dub" [ref=f11e19]
      - group "Result" [ref=f11e20]:
        - slider "Seek" [ref=f11e21]: "0"
        - generic [ref=f11e22]:
          - button "Play" [ref=f11e23] [cursor=pointer]
          - generic [ref=f11e26]: 0:00 / 0:13
          - generic [ref=f11e27]:
            - generic [ref=f11e28]: Volume
            - slider "Volume" [ref=f11e29]: "1"
          - button "Full screen" [ref=f11e30] [cursor=pointer]
    - generic [ref=f11e36]:
      - status [ref=f11e37]:
        - heading "Illustrative sample ready" [level=2] [ref=f11e38]
        - paragraph [ref=f11e39]: Fixed example video; not rendered from accepted takes.
      - generic [ref=f11e40]:
        - button "Download My dub" [ref=f11e41] [cursor=pointer]
        - button "Return to recording" [ref=f11e45] [cursor=pointer]
```

# Test source

```ts
  769 |       await page.getByRole('button', { name: 'Save and leave', exact: true }).click();
  770 |       await expect(page).toHaveURL(/\/projects\?returnProject=sintel-prepared&returnLayout=B&returnFocus=exit/);
  771 |       await page.getByTestId('return-to-saved-record').click();
  772 |       await expect(page).toHaveURL(/\/projects\/sintel-prepared\/record\?layout=B&turn=sintel-turn-3/);
  773 |       await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
  774 |     }
  775 | 
  776 |     let finalDatabase = await readIndexedDb(page);
  777 |     expect(finalDatabase.project?.initialResultSnapshotId).toBeTruthy();
  778 |     expect(finalDatabase.snapshots).toHaveLength(1);
  779 |     const snapshot = finalDatabase.snapshots[0] as { takes: unknown[]; authorization: string; contentSha256: string };
  780 |     expect(snapshot.authorization).toBe('initial-completion');
  781 |     expect(snapshot.takes).toHaveLength(3);
  782 |     expect(snapshot.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  783 | 
  784 |     if (layout === 'B') {
  785 |       const snapshotId = String(finalDatabase.project?.latestResultSnapshotId ?? '');
  786 |       expect(snapshotId).toBeTruthy();
  787 |       await page.goto(`/projects/sintel-prepared/result?layout=B&snapshot=${encodeURIComponent(snapshotId)}`);
  788 |     }
  789 |     await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
  790 |     await expect(page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' })).toBeVisible();
  791 |     await expect(page.locator('.result-header h1')).toBeFocused();
  792 |     expect(await page.evaluate(() => window.scrollY)).toBe(0);
  793 |     expect(await page.locator('.result-header .lucide-log-out').count()).toBe(1);
  794 |     expect(await page.locator('.result-workspace__actions button').filter({ hasText: 'Return to recording' }).locator('.lucide-undo-2').count()).toBe(1);
  795 | 
  796 |     if (layout === 'A') {
  797 |       await expect(page.getByRole('button', { name: 'Retry assembly', exact: true })).toBeVisible();
  798 |       await expect(page.getByText('The result sample could not be loaded. Your accepted takes and previous result remain unchanged.')).toBeVisible();
  799 |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-result-fixture-unavailable.png') });
  800 |       await page.unroute('**/media/example-dub.mp4');
  801 |       await page.getByRole('button', { name: 'Retry assembly', exact: true }).click();
  802 |     }
  803 | 
  804 |     await expect(page.getByText('Illustrative sample ready')).toBeVisible({ timeout: 15_000 });
  805 |     const resultVideo = page.getByTestId('result-video');
  806 |     await expect(resultVideo).toHaveAttribute('data-source', 'dub');
  807 |     await expect(resultVideo).toHaveAttribute('src', /^blob:/);
  808 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.videoWidth > 0)).toBe(true);
  809 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  810 |     const presentedGenerationId = await resultVideo.getAttribute('data-generation-id');
  811 |     expect(presentedGenerationId).toMatch(/^generation:/);
  812 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-ready.png`) });
  813 |     const normalResult = await page.evaluate(() => {
  814 |       const bounds = (selector: string) => {
  815 |         const element = document.querySelector(selector);
  816 |         if (!element) return null;
  817 |         const rect = element.getBoundingClientRect();
  818 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  819 |       };
  820 |       return {
  821 |         title: bounds('.result-header h1'),
  822 |         exit: bounds('.result-header .exit-link'),
  823 |         screen: bounds('.result-player__screen'),
  824 |         seek: bounds('.result-player__seek'),
  825 |         controls: bounds('.result-player__transport-row'),
  826 |       };
  827 |     });
  828 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-metrics.json`), JSON.stringify(normalResult, null, 2), 'utf8');
  829 |     expect(Math.abs(normalResult.title!.y - (layout === 'A' ? 20 : 27))).toBeLessThanOrEqual(1);
  830 |     expect(Math.abs(normalResult.exit!.y - (layout === 'A' ? 20 : 28))).toBeLessThanOrEqual(1);
  831 |     expect(Math.abs(normalResult.screen!.y - (layout === 'A' ? 108 : 104))).toBeLessThanOrEqual(1);
  832 |     expect(Math.abs(normalResult.screen!.width - 920)).toBeLessThanOrEqual(2);
  833 |     expect(normalResult.seek!.bottom).toBeLessThanOrEqual(normalResult.controls!.y + 1);
  834 |     if (layout === 'A') {
  835 |       await setRecordLocale(page, 'ru');
  836 |       await expect(page.getByRole('heading', { name: 'Ваш результат' })).toBeVisible();
  837 |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-result-ru.png') });
  838 |       await setRecordLocale(page, 'en');
  839 |       await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
  840 |     }
  841 |     await page.setViewportSize(layout === 'A' ? { width: 390, height: 667 } : { width: 390, height: 844 });
  842 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  843 |     const phoneResult = await page.evaluate(() => {
  844 |       const bounds = (selector: string) => {
  845 |         const element = document.querySelector(selector);
  846 |         if (!element) return null;
  847 |         const rect = element.getBoundingClientRect();
  848 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  849 |       };
  850 |       return {
  851 |         screen: bounds('.result-player__screen'),
  852 |         exit: bounds('.result-header .exit-link'),
  853 |         title: bounds('.result-header h1'),
  854 |         seek: bounds('.result-player__seek'),
  855 |         controls: bounds('.result-player__transport-row'),
  856 |         volume: bounds('.result-player__volume input'),
  857 |         source: bounds('.result-player__source-tabs button'),
  858 |         actions: Array.from(document.querySelectorAll('.result-workspace__actions .button'), (element) => {
  859 |           const rect = element.getBoundingClientRect();
  860 |           return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  861 |         }),
  862 |       };
  863 |     });
  864 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-ready.png`), fullPage: true });
  865 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-metrics.json`), JSON.stringify(phoneResult, null, 2), 'utf8');
  866 |     expect(Math.abs(phoneResult.screen!.x - 16)).toBeLessThanOrEqual(1);
  867 |     expect(Math.abs(phoneResult.screen!.width - 358)).toBeLessThanOrEqual(1);
  868 |     expect(phoneResult.screen!.y).toBe(layout === 'A' ? 164 : 168);
> 869 |     expect(phoneResult.exit!.y).toBe(40);
      |                                 ^ Error: expect(received).toBe(expected) // Object.is equality
  870 |     expect(phoneResult.title!.y).toBe(layout === 'A' ? 97 : 96);
  871 |     expect(phoneResult.seek!.height).toBeGreaterThanOrEqual(48);
  872 |     expect(phoneResult.controls!.height).toBeGreaterThanOrEqual(48);
  873 |     expect(phoneResult.volume!.height).toBeGreaterThanOrEqual(48);
  874 |     expect(phoneResult.source!.height).toBeGreaterThanOrEqual(48);
  875 |     expect(phoneResult.actions).toHaveLength(2);
  876 |     expect(phoneResult.actions.every((action) => action.height >= 48)).toBe(true);
  877 |     expect(phoneResult.actions[1]!.y).toBeGreaterThan(phoneResult.actions[0]!.y);
  878 |     await page.setViewportSize({ width: 1280, height: 600 });
  879 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  880 |     const shortResult = await page.evaluate(() => {
  881 |       const bounds = (selector: string) => {
  882 |         const element = document.querySelector(selector);
  883 |         if (!element) return null;
  884 |         const rect = element.getBoundingClientRect();
  885 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  886 |       };
  887 |       return {
  888 |         documentHeight: document.documentElement.scrollHeight,
  889 |         title: bounds('.result-header h1'),
  890 |         exit: bounds('.result-header .exit-link'),
  891 |         player: bounds('.result-player'),
  892 |         screen: bounds('.result-player__screen'),
  893 |         rail: bounds('.result-player__transport'),
  894 |         seek: bounds('.result-player__seek'),
  895 |         controls: bounds('.result-player__transport-row'),
  896 |         details: bounds('.result-workspace__details'),
  897 |         actions: bounds('.result-workspace__actions'),
  898 |       };
  899 |     });
  900 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-ready.png`) });
  901 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-metrics.json`), JSON.stringify(shortResult, null, 2), 'utf8');
  902 |     expect(shortResult.documentHeight).toBeLessThanOrEqual(600);
  903 |     expect(shortResult.title?.y).toBe(16);
  904 |     expect(shortResult.exit?.y).toBe(16);
  905 |     expect(shortResult.title!.bottom).toBeLessThanOrEqual(600);
  906 |     const shortTarget = layout === 'A' ? { y: 88, width: 548 } : { y: 80, width: 562 };
  907 |     expect(Math.abs(shortResult.screen!.y - shortTarget.y)).toBeLessThanOrEqual(1);
  908 |     expect(Math.abs(shortResult.screen!.width - shortTarget.width)).toBeLessThanOrEqual(4);
  909 |     expect(shortResult.seek!.bottom).toBeLessThanOrEqual(shortResult.controls!.y + 1);
  910 |     expect(shortResult.actions!.height).toBeGreaterThanOrEqual(88);
  911 |     expect(shortResult.actions!.bottom).toBeLessThanOrEqual(600);
  912 |     await page.setViewportSize({ width: 1440, height: 900 });
  913 | 
  914 |     const originalSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'Original' });
  915 |     const dubSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' });
  916 |     await expect(page.locator('.result-player__source-tabs')).toHaveAttribute('role', 'group');
  917 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  918 |     await originalSource.focus();
  919 |     await page.keyboard.press('Space');
  920 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  921 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  922 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  923 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.2);
  924 |     const switchTime = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  925 |     await dubSource.click();
  926 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  927 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  928 |     await expect(resultVideo).toHaveAttribute('data-generation-id', presentedGenerationId ?? '');
  929 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  930 |     await expect.poll(async () => Math.abs(await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime) - switchTime))
  931 |       .toBeLessThan(1.5);
  932 | 
  933 |     const resultSeek = page.locator('.result-player__seek');
  934 |     await resultSeek.focus();
  935 |     await page.keyboard.down('ArrowRight');
  936 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  937 |     await page.keyboard.up('ArrowRight');
  938 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  939 |     const afterKeyboardRelease = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  940 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(afterKeyboardRelease);
  941 | 
  942 |     await resultVideo.evaluate((video: HTMLVideoElement) => video.pause());
  943 |     await resultSeek.dispatchEvent('pointerdown');
  944 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  945 |     await resultSeek.dispatchEvent('pointercancel');
  946 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  947 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  948 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  949 |     await resultSeek.dispatchEvent('pointerdown');
  950 |     await resultSeek.evaluate((input: HTMLInputElement) => input.blur());
  951 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  952 | 
  953 |     const currentGenerationBeforeDownload = await resultVideo.getAttribute('data-generation-id');
  954 |     await originalSource.click();
  955 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  956 |     const [download] = await Promise.all([
  957 |       page.waitForEvent('download'),
  958 |       page.getByRole('button', { name: 'Download My dub', exact: true }).click(),
  959 |     ]);
  960 |     const downloadPath = await download.path();
  961 |     expect(download.suggestedFilename()).toBe('example-dub.mp4');
  962 |     expect(downloadPath).not.toBeNull();
  963 |     const downloadedBytes = await readFile(downloadPath!);
  964 |     const expectedFixtureBytes = await readFile(path.resolve(process.cwd(), 'public', 'media', 'example-dub.mp4'));
  965 |     const downloadedSha256 = createHash('sha256').update(downloadedBytes).digest('hex');
  966 |     expect(downloadedBytes.equals(expectedFixtureBytes)).toBe(true);
  967 | 
  968 |     const resultDatabase = await page.evaluate(async () => {
  969 |       const database = await new Promise<IDBDatabase>((resolve, reject) => {
```