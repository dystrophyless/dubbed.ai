# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> Layout A records real browser fake input, recovers the candidate, and completes the accepted snapshot
- Location: e2e\record-journey.spec.ts:601:3

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 600
Received:    802
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
            - slider "Volume" [ref=f11e33]: "1"
          - button "Full screen" [ref=f11e34] [cursor=pointer]
    - generic [ref=f11e40]:
      - status [ref=f11e41]:
        - heading "Illustrative sample ready" [level=2] [ref=f11e42]
        - paragraph [ref=f11e43]: Fixed example video; not rendered from accepted takes.
      - generic [ref=f11e44]:
        - button "Download My dub" [ref=f11e45] [cursor=pointer]
        - button "Return to recording" [ref=f11e49] [cursor=pointer]
```

# Test source

```ts
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
  821 |         screen: bounds('.result-player__screen'),
  822 |         seek: bounds('.result-player__seek'),
  823 |         controls: bounds('.result-player__transport-row'),
  824 |       };
  825 |     });
  826 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-metrics.json`), JSON.stringify(normalResult, null, 2), 'utf8');
  827 |     expect(Math.abs(normalResult.screen!.y - (layout === 'A' ? 108 : 104))).toBeLessThanOrEqual(1);
  828 |     expect(Math.abs(normalResult.screen!.width - 920)).toBeLessThanOrEqual(2);
  829 |     expect(normalResult.seek!.bottom).toBeLessThanOrEqual(normalResult.controls!.y + 1);
  830 |     if (layout === 'A') {
  831 |       await setRecordLocale(page, 'ru');
  832 |       await expect(page.getByRole('heading', { name: 'Ваш результат' })).toBeVisible();
  833 |       await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-result-ru.png') });
  834 |       await setRecordLocale(page, 'en');
  835 |       await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
  836 |     }
  837 |     await page.setViewportSize(layout === 'A' ? { width: 390, height: 667 } : { width: 390, height: 844 });
  838 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  839 |     const phoneResult = await page.evaluate(() => {
  840 |       const bounds = (selector: string) => {
  841 |         const element = document.querySelector(selector);
  842 |         if (!element) return null;
  843 |         const rect = element.getBoundingClientRect();
  844 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  845 |       };
  846 |       return {
  847 |         screen: bounds('.result-player__screen'),
  848 |         exit: bounds('.result-header .exit-link'),
  849 |         title: bounds('.result-header h1'),
  850 |         seek: bounds('.result-player__seek'),
  851 |         controls: bounds('.result-player__transport-row'),
  852 |         volume: bounds('.result-player__volume input'),
  853 |         source: bounds('.result-player__source-tabs button'),
  854 |         actions: Array.from(document.querySelectorAll('.result-workspace__actions .button'), (element) => {
  855 |           const rect = element.getBoundingClientRect();
  856 |           return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  857 |         }),
  858 |       };
  859 |     });
  860 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-ready.png`), fullPage: true });
  861 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-metrics.json`), JSON.stringify(phoneResult, null, 2), 'utf8');
  862 |     expect(Math.abs(phoneResult.screen!.x - 16)).toBeLessThanOrEqual(1);
  863 |     expect(Math.abs(phoneResult.screen!.width - 358)).toBeLessThanOrEqual(1);
  864 |     expect(phoneResult.screen!.y).toBe(layout === 'A' ? 164 : 168);
  865 |     expect(phoneResult.seek!.height).toBeGreaterThanOrEqual(48);
  866 |     expect(phoneResult.controls!.height).toBeGreaterThanOrEqual(48);
  867 |     expect(phoneResult.volume!.height).toBeGreaterThanOrEqual(48);
  868 |     expect(phoneResult.source!.height).toBeGreaterThanOrEqual(48);
  869 |     expect(phoneResult.actions).toHaveLength(2);
  870 |     expect(phoneResult.actions.every((action) => action.height >= 48)).toBe(true);
  871 |     expect(phoneResult.actions[1]!.y).toBeGreaterThan(phoneResult.actions[0]!.y);
  872 |     await page.setViewportSize({ width: 1280, height: 600 });
  873 |     const shortResult = await page.evaluate(() => {
  874 |       const bounds = (selector: string) => {
  875 |         const element = document.querySelector(selector);
  876 |         if (!element) return null;
  877 |         const rect = element.getBoundingClientRect();
  878 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  879 |       };
  880 |       return {
  881 |         documentHeight: document.documentElement.scrollHeight,
  882 |         title: bounds('.result-header h1'),
  883 |         player: bounds('.result-player'),
  884 |         screen: bounds('.result-player__screen'),
  885 |         rail: bounds('.result-player__transport'),
  886 |         seek: bounds('.result-player__seek'),
  887 |         controls: bounds('.result-player__transport-row'),
  888 |         details: bounds('.result-workspace__details'),
  889 |         actions: bounds('.result-workspace__actions'),
  890 |       };
  891 |     });
  892 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-ready.png`) });
  893 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-metrics.json`), JSON.stringify(shortResult, null, 2), 'utf8');
> 894 |     expect(shortResult.documentHeight).toBeLessThanOrEqual(600);
      |                                        ^ Error: expect(received).toBeLessThanOrEqual(expected)
  895 |     expect(shortResult.title?.y ?? -1).toBeGreaterThanOrEqual(0);
  896 |     expect(shortResult.title!.bottom).toBeLessThanOrEqual(600);
  897 |     const shortTarget = layout === 'A' ? { y: 88, width: 548 } : { y: 80, width: 562 };
  898 |     expect(Math.abs(shortResult.screen!.y - shortTarget.y)).toBeLessThanOrEqual(1);
  899 |     expect(Math.abs(shortResult.screen!.width - shortTarget.width)).toBeLessThanOrEqual(4);
  900 |     expect(shortResult.seek!.bottom).toBeLessThanOrEqual(shortResult.controls!.y + 1);
  901 |     expect(shortResult.actions!.height).toBeGreaterThanOrEqual(88);
  902 |     expect(shortResult.actions!.bottom).toBeLessThanOrEqual(600);
  903 |     await page.setViewportSize({ width: 1440, height: 900 });
  904 | 
  905 |     const originalSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'Original' });
  906 |     const dubSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' });
  907 |     await expect(page.locator('.result-player__source-tabs')).toHaveAttribute('role', 'group');
  908 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  909 |     await originalSource.focus();
  910 |     await page.keyboard.press('Space');
  911 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  912 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  913 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  914 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.2);
  915 |     const switchTime = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  916 |     await dubSource.click();
  917 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  918 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  919 |     await expect(resultVideo).toHaveAttribute('data-generation-id', presentedGenerationId ?? '');
  920 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  921 |     await expect.poll(async () => Math.abs(await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime) - switchTime))
  922 |       .toBeLessThan(1.5);
  923 | 
  924 |     const resultSeek = page.locator('.result-player__seek');
  925 |     await resultSeek.focus();
  926 |     await page.keyboard.down('ArrowRight');
  927 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  928 |     await page.keyboard.up('ArrowRight');
  929 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  930 |     const afterKeyboardRelease = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  931 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(afterKeyboardRelease);
  932 | 
  933 |     await resultVideo.evaluate((video: HTMLVideoElement) => video.pause());
  934 |     await resultSeek.dispatchEvent('pointerdown');
  935 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  936 |     await resultSeek.dispatchEvent('pointercancel');
  937 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  938 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  939 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  940 |     await resultSeek.dispatchEvent('pointerdown');
  941 |     await resultSeek.evaluate((input: HTMLInputElement) => input.blur());
  942 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  943 | 
  944 |     const currentGenerationBeforeDownload = await resultVideo.getAttribute('data-generation-id');
  945 |     await originalSource.click();
  946 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  947 |     const [download] = await Promise.all([
  948 |       page.waitForEvent('download'),
  949 |       page.getByRole('button', { name: 'Download My dub', exact: true }).click(),
  950 |     ]);
  951 |     const downloadPath = await download.path();
  952 |     expect(download.suggestedFilename()).toBe('example-dub.mp4');
  953 |     expect(downloadPath).not.toBeNull();
  954 |     const downloadedBytes = await readFile(downloadPath!);
  955 |     const expectedFixtureBytes = await readFile(path.resolve(process.cwd(), 'public', 'media', 'example-dub.mp4'));
  956 |     const downloadedSha256 = createHash('sha256').update(downloadedBytes).digest('hex');
  957 |     expect(downloadedBytes.equals(expectedFixtureBytes)).toBe(true);
  958 | 
  959 |     const resultDatabase = await page.evaluate(async () => {
  960 |       const database = await new Promise<IDBDatabase>((resolve, reject) => {
  961 |         const request = indexedDB.open('dubbed-core-local-v1');
  962 |         request.onsuccess = () => resolve(request.result);
  963 |         request.onerror = () => reject(request.error);
  964 |       });
  965 |       const read = <T>(name: string) => new Promise<T>((resolve, reject) => {
  966 |         const request = database.transaction(name, 'readonly').objectStore(name).getAll();
  967 |         request.onsuccess = () => resolve(request.result as T);
  968 |         request.onerror = () => reject(request.error);
  969 |       });
  970 |       const jobs = await read<Array<{ id: string; snapshotId: string; status: string; productRendered: boolean; assembledFromAcceptedTakes: boolean }>>('resultJobs');
  971 |       const resultMedia = await read<Array<{ id: string; filename: string; byteSize: number; sha256: string; blob: Blob }>>('resultMedia');
  972 |       database.close();
  973 |       return {
  974 |         jobs: jobs.map(({ id, snapshotId, status, productRendered, assembledFromAcceptedTakes }) => ({ id, snapshotId, status, productRendered, assembledFromAcceptedTakes })),
  975 |         media: resultMedia.map(({ id, filename, byteSize, sha256, blob }) => ({ id, filename, byteSize, sha256, blobSize: blob.size })),
  976 |       };
  977 |     });
  978 |     expect(resultDatabase.jobs).toContainEqual(expect.objectContaining({
  979 |       id: currentGenerationBeforeDownload,
  980 |       status: 'ready',
  981 |       productRendered: false,
  982 |       assembledFromAcceptedTakes: false,
  983 |     }));
  984 |     expect(resultDatabase.media).toContainEqual(expect.objectContaining({
  985 |       id: currentGenerationBeforeDownload,
  986 |       filename: 'example-dub.mp4',
  987 |       byteSize: expectedFixtureBytes.byteLength,
  988 |       blobSize: expectedFixtureBytes.byteLength,
  989 |       sha256: downloadedSha256,
  990 |     }));
  991 | 
  992 |     await page.setViewportSize({ width: 390, height: 844 });
  993 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  994 |     expect(await page.getByRole('button', { name: 'Download My dub', exact: true }).boundingBox().then((box) => box?.height ?? 0)).toBeGreaterThanOrEqual(48);
```