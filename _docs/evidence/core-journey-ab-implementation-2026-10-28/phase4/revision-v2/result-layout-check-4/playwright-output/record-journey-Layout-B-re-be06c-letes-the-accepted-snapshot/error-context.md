# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> Layout B records real browser fake input, recovers the candidate, and completes the accepted snapshot
- Location: e2e\record-journey.spec.ts:601:3

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 600
Received:    794
```

# Page snapshot

```yaml
- generic [ref=f10e3]:
  - banner [ref=f10e4]:
    - button "Exit" [ref=f10e5] [cursor=pointer]
    - generic [ref=f10e10]:
      - heading "Your result" [active] [level=1] [ref=f10e11]
      - paragraph [ref=f10e12]: Sintel · The Search
  - main "Your result" [ref=f10e13]:
    - generic [ref=f10e14]:
      - generic [ref=f10e15]:
        - group "Result" [ref=f10e16]:
          - button "Original" [ref=f10e17] [cursor=pointer]
          - button "My dub" [pressed] [ref=f10e18] [cursor=pointer]
        - generic "My dub" [ref=f10e19]
      - group "Result" [ref=f10e20]:
        - slider "Seek" [ref=f10e21]: "0"
        - generic [ref=f10e22]:
          - button "Play" [ref=f10e23] [cursor=pointer]
          - generic [ref=f10e26]: 0:00 / 0:13
          - generic [ref=f10e27]:
            - generic [ref=f10e28]: Volume
            - slider "Volume" [ref=f10e33]: "1"
          - button "Full screen" [ref=f10e34] [cursor=pointer]
    - generic [ref=f10e40]:
      - status [ref=f10e41]:
        - heading "Illustrative sample ready" [level=2] [ref=f10e42]
        - paragraph [ref=f10e43]: Fixed example video; not rendered from accepted takes.
      - generic [ref=f10e44]:
        - button "Download My dub" [ref=f10e45] [cursor=pointer]
        - button "Return to recording" [ref=f10e49] [cursor=pointer]
```

# Test source

```ts
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
  821 |         screen: bounds('.result-player__screen'),
  822 |         seek: bounds('.result-player__seek'),
  823 |         controls: bounds('.result-player__transport-row'),
  824 |       };
  825 |     });
  826 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-metrics.json`), JSON.stringify(normalResult, null, 2), 'utf8');
  827 |     expect(Math.abs(normalResult.screen!.y - (layout === 'A' ? 108 : 104))).toBeLessThanOrEqual(1);
  828 |     expect(Math.abs(normalResult.screen!.width - 920)).toBeLessThanOrEqual(2);
  829 |     expect(normalResult.seek!.bottom).toBeLessThanOrEqual(normalResult.controls!.y + 1);
  830 |     await page.setViewportSize(layout === 'A' ? { width: 390, height: 667 } : { width: 390, height: 844 });
  831 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  832 |     const phoneResult = await page.evaluate(() => {
  833 |       const bounds = (selector: string) => {
  834 |         const element = document.querySelector(selector);
  835 |         if (!element) return null;
  836 |         const rect = element.getBoundingClientRect();
  837 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  838 |       };
  839 |       return {
  840 |         screen: bounds('.result-player__screen'),
  841 |         exit: bounds('.result-header .exit-link'),
  842 |         title: bounds('.result-header h1'),
  843 |         seek: bounds('.result-player__seek'),
  844 |         controls: bounds('.result-player__transport-row'),
  845 |         volume: bounds('.result-player__volume input'),
  846 |         source: bounds('.result-player__source-tabs button'),
  847 |         actions: Array.from(document.querySelectorAll('.result-workspace__actions .button'), (element) => {
  848 |           const rect = element.getBoundingClientRect();
  849 |           return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  850 |         }),
  851 |       };
  852 |     });
  853 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-ready.png`), fullPage: true });
  854 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-metrics.json`), JSON.stringify(phoneResult, null, 2), 'utf8');
  855 |     expect(Math.abs(phoneResult.screen!.x - 16)).toBeLessThanOrEqual(1);
  856 |     expect(Math.abs(phoneResult.screen!.width - 358)).toBeLessThanOrEqual(1);
  857 |     expect(phoneResult.screen!.y).toBe(layout === 'A' ? 164 : 168);
  858 |     expect(phoneResult.seek!.height).toBeGreaterThanOrEqual(48);
  859 |     expect(phoneResult.controls!.height).toBeGreaterThanOrEqual(48);
  860 |     expect(phoneResult.volume!.height).toBeGreaterThanOrEqual(48);
  861 |     expect(phoneResult.source!.height).toBeGreaterThanOrEqual(48);
  862 |     expect(phoneResult.actions).toHaveLength(2);
  863 |     expect(phoneResult.actions.every((action) => action.height >= 48)).toBe(true);
  864 |     expect(phoneResult.actions[1]!.y).toBeGreaterThan(phoneResult.actions[0]!.y);
  865 |     await page.setViewportSize({ width: 1280, height: 600 });
  866 |     const shortResult = await page.evaluate(() => {
  867 |       const bounds = (selector: string) => {
  868 |         const element = document.querySelector(selector);
  869 |         if (!element) return null;
  870 |         const rect = element.getBoundingClientRect();
  871 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  872 |       };
  873 |       return {
  874 |         documentHeight: document.documentElement.scrollHeight,
  875 |         title: bounds('.result-header h1'),
  876 |         player: bounds('.result-player'),
  877 |         screen: bounds('.result-player__screen'),
  878 |         rail: bounds('.result-player__transport'),
  879 |         seek: bounds('.result-player__seek'),
  880 |         controls: bounds('.result-player__transport-row'),
  881 |         details: bounds('.result-workspace__details'),
  882 |         actions: bounds('.result-workspace__actions'),
  883 |       };
  884 |     });
  885 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-ready.png`) });
  886 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-metrics.json`), JSON.stringify(shortResult, null, 2), 'utf8');
> 887 |     expect(shortResult.documentHeight).toBeLessThanOrEqual(600);
      |                                        ^ Error: expect(received).toBeLessThanOrEqual(expected)
  888 |     expect(shortResult.title?.y ?? -1).toBeGreaterThanOrEqual(0);
  889 |     expect(shortResult.title!.bottom).toBeLessThanOrEqual(600);
  890 |     const shortTarget = layout === 'A' ? { y: 88, width: 548 } : { y: 80, width: 562 };
  891 |     expect(Math.abs(shortResult.screen!.y - shortTarget.y)).toBeLessThanOrEqual(1);
  892 |     expect(Math.abs(shortResult.screen!.width - shortTarget.width)).toBeLessThanOrEqual(4);
  893 |     expect(shortResult.seek!.bottom).toBeLessThanOrEqual(shortResult.controls!.y + 1);
  894 |     expect(shortResult.actions!.height).toBeGreaterThanOrEqual(88);
  895 |     expect(shortResult.actions!.bottom).toBeLessThanOrEqual(600);
  896 |     await page.setViewportSize({ width: 1440, height: 900 });
  897 | 
  898 |     const originalSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'Original' });
  899 |     const dubSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' });
  900 |     await expect(page.locator('.result-player__source-tabs')).toHaveAttribute('role', 'group');
  901 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  902 |     await originalSource.focus();
  903 |     await page.keyboard.press('Space');
  904 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  905 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  906 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  907 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.2);
  908 |     const switchTime = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  909 |     await dubSource.click();
  910 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  911 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  912 |     await expect(resultVideo).toHaveAttribute('data-generation-id', presentedGenerationId ?? '');
  913 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  914 |     await expect.poll(async () => Math.abs(await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime) - switchTime))
  915 |       .toBeLessThan(1.5);
  916 | 
  917 |     const resultSeek = page.locator('.result-player__seek');
  918 |     await resultSeek.focus();
  919 |     await page.keyboard.down('ArrowRight');
  920 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  921 |     await page.keyboard.up('ArrowRight');
  922 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  923 |     const afterKeyboardRelease = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  924 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(afterKeyboardRelease);
  925 | 
  926 |     await resultVideo.evaluate((video: HTMLVideoElement) => video.pause());
  927 |     await resultSeek.dispatchEvent('pointerdown');
  928 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  929 |     await resultSeek.dispatchEvent('pointercancel');
  930 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  931 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  932 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  933 |     await resultSeek.dispatchEvent('pointerdown');
  934 |     await resultSeek.evaluate((input: HTMLInputElement) => input.blur());
  935 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  936 | 
  937 |     const currentGenerationBeforeDownload = await resultVideo.getAttribute('data-generation-id');
  938 |     await originalSource.click();
  939 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  940 |     const [download] = await Promise.all([
  941 |       page.waitForEvent('download'),
  942 |       page.getByRole('button', { name: 'Download My dub', exact: true }).click(),
  943 |     ]);
  944 |     const downloadPath = await download.path();
  945 |     expect(download.suggestedFilename()).toBe('example-dub.mp4');
  946 |     expect(downloadPath).not.toBeNull();
  947 |     const downloadedBytes = await readFile(downloadPath!);
  948 |     const expectedFixtureBytes = await readFile(path.resolve(process.cwd(), 'public', 'media', 'example-dub.mp4'));
  949 |     const downloadedSha256 = createHash('sha256').update(downloadedBytes).digest('hex');
  950 |     expect(downloadedBytes.equals(expectedFixtureBytes)).toBe(true);
  951 | 
  952 |     const resultDatabase = await page.evaluate(async () => {
  953 |       const database = await new Promise<IDBDatabase>((resolve, reject) => {
  954 |         const request = indexedDB.open('dubbed-core-local-v1');
  955 |         request.onsuccess = () => resolve(request.result);
  956 |         request.onerror = () => reject(request.error);
  957 |       });
  958 |       const read = <T>(name: string) => new Promise<T>((resolve, reject) => {
  959 |         const request = database.transaction(name, 'readonly').objectStore(name).getAll();
  960 |         request.onsuccess = () => resolve(request.result as T);
  961 |         request.onerror = () => reject(request.error);
  962 |       });
  963 |       const jobs = await read<Array<{ id: string; snapshotId: string; status: string; productRendered: boolean; assembledFromAcceptedTakes: boolean }>>('resultJobs');
  964 |       const resultMedia = await read<Array<{ id: string; filename: string; byteSize: number; sha256: string; blob: Blob }>>('resultMedia');
  965 |       database.close();
  966 |       return {
  967 |         jobs: jobs.map(({ id, snapshotId, status, productRendered, assembledFromAcceptedTakes }) => ({ id, snapshotId, status, productRendered, assembledFromAcceptedTakes })),
  968 |         media: resultMedia.map(({ id, filename, byteSize, sha256, blob }) => ({ id, filename, byteSize, sha256, blobSize: blob.size })),
  969 |       };
  970 |     });
  971 |     expect(resultDatabase.jobs).toContainEqual(expect.objectContaining({
  972 |       id: currentGenerationBeforeDownload,
  973 |       status: 'ready',
  974 |       productRendered: false,
  975 |       assembledFromAcceptedTakes: false,
  976 |     }));
  977 |     expect(resultDatabase.media).toContainEqual(expect.objectContaining({
  978 |       id: currentGenerationBeforeDownload,
  979 |       filename: 'example-dub.mp4',
  980 |       byteSize: expectedFixtureBytes.byteLength,
  981 |       blobSize: expectedFixtureBytes.byteLength,
  982 |       sha256: downloadedSha256,
  983 |     }));
  984 | 
  985 |     await page.setViewportSize({ width: 390, height: 844 });
  986 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  987 |     expect(await page.getByRole('button', { name: 'Download My dub', exact: true }).boundingBox().then((box) => box?.height ?? 0)).toBeGreaterThanOrEqual(48);
```