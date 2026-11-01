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

Expected: true
Received: false

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=f9e3]:
  - banner [ref=f9e4]:
    - button "Exit" [ref=f9e5] [cursor=pointer]
    - generic [ref=f9e10]:
      - heading "Your result" [level=1] [ref=f9e11]
      - paragraph [ref=f9e12]: Sintel · The Search
  - main "Your result" [ref=f9e13]:
    - generic [ref=f9e14]:
      - generic [ref=f9e15]:
        - group "Result" [ref=f9e16]:
          - button "Original" [ref=f9e17] [cursor=pointer]
          - button "My dub" [pressed] [ref=f9e18] [cursor=pointer]
        - generic "My dub" [ref=f9e19]
      - group "Result" [ref=f9e20]:
        - slider "Seek" [ref=f9e21]: "0"
        - generic [ref=f9e22]:
          - button "Play" [ref=f9e23] [cursor=pointer]
          - generic [ref=f9e26]: 0:00 / 0:13
          - generic [ref=f9e27]:
            - generic [ref=f9e28]: Volume
            - slider "Volume" [ref=f9e33]: "1"
          - button "Full screen" [ref=f9e34] [cursor=pointer]
    - generic [ref=f9e40]:
      - status [ref=f9e41]:
        - heading "Illustrative sample ready" [level=2] [ref=f9e42]
        - paragraph [ref=f9e43]: Fixed example video; not rendered from accepted takes.
      - generic [ref=f9e44]:
        - button "Download My dub" [ref=f9e45] [cursor=pointer]
        - button "Return to recording" [ref=f9e49] [cursor=pointer]
```

# Test source

```ts
  731 |     await setRecordLocale(page, 'en');
  732 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x667-ready.png`) });
  733 |     await page.setViewportSize({ width: 1440, height: 900 });
  734 | 
  735 |     await page.getByRole('button', { name: 'Next', exact: true }).click();
  736 |     await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-2`));
  737 |     await setRecordLocale(page, 'ru');
  738 |     await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
  739 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-turn-2-russian.png`) });
  740 |     await setRecordLocale(page, 'en');
  741 |     await recordCurrentWindow(page, layout);
  742 |     await page.getByRole('button', { name: 'Next', exact: true }).click();
  743 |     await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-3`));
  744 |     await setRecordLocale(page, 'ru');
  745 |     await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
  746 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-turn-3-russian.png`) });
  747 |     await setRecordLocale(page, 'en');
  748 |     await recordCurrentWindow(page, layout);
  749 | 
  750 |     const media = await readIndexedDb(page);
  751 |     expect(media.media.filter((candidate) => candidate.purpose === 'recording')).toHaveLength(3);
  752 |     expect(Object.values(media.project?.acceptedByTurn as Record<string, string> ?? {})).toHaveLength(2);
  753 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-final-candidate.png`) });
  754 | 
  755 |     if (layout === 'A') {
  756 |       await page.route('**/media/example-dub.mp4', (route) => route.fulfill({ status: 503, body: 'fixture unavailable for the first attempts' }));
  757 |       await page.setViewportSize({ width: 390, height: 667 });
  758 |       await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  759 |       expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  760 |       await page.getByRole('button', { name: 'Next', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
  761 |       await expect(page).toHaveURL(/\/result\?layout=A&snapshot=/);
  762 |       await expect(page.getByRole('heading', { name: 'Your result' })).toBeInViewport();
  763 |       await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  764 |       await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('H1');
  765 |       await page.setViewportSize({ width: 1440, height: 900 });
  766 |     } else {
  767 |       await page.getByRole('button', { name: 'Exit', exact: true }).click();
  768 |       await expect(page.getByRole('dialog')).toBeVisible();
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
  821 |         screen: bounds('.result-player__screen'),
  822 |         seek: bounds('.result-player__seek'),
  823 |         controls: bounds('.result-player__transport-row'),
  824 |       };
  825 |     });
  826 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-metrics.json`), JSON.stringify(normalResult, null, 2), 'utf8');
  827 |     expect(Math.abs(normalResult.screen!.y - (layout === 'A' ? 108 : 104))).toBeLessThanOrEqual(1);
  828 |     expect(Math.abs(normalResult.screen!.width - 920)).toBeLessThanOrEqual(2);
  829 |     expect(normalResult.seek!.bottom).toBeLessThanOrEqual(normalResult.controls!.y + 1);
  830 |     await page.setViewportSize({ width: 1280, height: 600 });
> 831 |     await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
      |                                                                                                               ^ Error: expect(received).toBe(expected) // Object.is equality
  832 |     const shortResult = await page.evaluate(() => {
  833 |       const bounds = (selector: string) => {
  834 |         const element = document.querySelector(selector);
  835 |         if (!element) return null;
  836 |         const rect = element.getBoundingClientRect();
  837 |         return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
  838 |       };
  839 |       return {
  840 |         documentHeight: document.documentElement.scrollHeight,
  841 |         title: bounds('.result-header h1'),
  842 |         player: bounds('.result-player'),
  843 |         screen: bounds('.result-player__screen'),
  844 |         rail: bounds('.result-player__transport'),
  845 |         seek: bounds('.result-player__seek'),
  846 |         controls: bounds('.result-player__transport-row'),
  847 |         details: bounds('.result-workspace__details'),
  848 |         actions: bounds('.result-workspace__actions'),
  849 |       };
  850 |     });
  851 |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-ready.png`) });
  852 |     await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-metrics.json`), JSON.stringify(shortResult, null, 2), 'utf8');
  853 |     expect(shortResult.documentHeight).toBeLessThanOrEqual(600);
  854 |     expect(shortResult.title?.y ?? -1).toBeGreaterThanOrEqual(0);
  855 |     expect(shortResult.title!.bottom).toBeLessThanOrEqual(600);
  856 |     const shortTarget = layout === 'A' ? { y: 88, width: 548 } : { y: 80, width: 562 };
  857 |     expect(Math.abs(shortResult.screen!.y - shortTarget.y)).toBeLessThanOrEqual(1);
  858 |     expect(Math.abs(shortResult.screen!.width - shortTarget.width)).toBeLessThanOrEqual(4);
  859 |     expect(shortResult.seek!.bottom).toBeLessThanOrEqual(shortResult.controls!.y + 1);
  860 |     expect(shortResult.actions!.height).toBeGreaterThanOrEqual(88);
  861 |     expect(shortResult.actions!.bottom).toBeLessThanOrEqual(600);
  862 |     await page.setViewportSize({ width: 1440, height: 900 });
  863 | 
  864 |     const originalSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'Original' });
  865 |     const dubSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' });
  866 |     await expect(page.locator('.result-player__source-tabs')).toHaveAttribute('role', 'group');
  867 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  868 |     await originalSource.focus();
  869 |     await page.keyboard.press('Space');
  870 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
  871 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  872 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  873 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.2);
  874 |     const switchTime = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  875 |     await dubSource.click();
  876 |     await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
  877 |     await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
  878 |     await expect(resultVideo).toHaveAttribute('data-generation-id', presentedGenerationId ?? '');
  879 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  880 |     await expect.poll(async () => Math.abs(await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime) - switchTime))
  881 |       .toBeLessThan(1.5);
  882 | 
  883 |     const resultSeek = page.locator('.result-player__seek');
  884 |     await resultSeek.focus();
  885 |     await page.keyboard.down('ArrowRight');
  886 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  887 |     await page.keyboard.up('ArrowRight');
  888 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  889 |     const afterKeyboardRelease = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
  890 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(afterKeyboardRelease);
  891 | 
  892 |     await resultVideo.evaluate((video: HTMLVideoElement) => video.pause());
  893 |     await resultSeek.dispatchEvent('pointerdown');
  894 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  895 |     await resultSeek.dispatchEvent('pointercancel');
  896 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  897 |     await page.getByRole('button', { name: 'Play', exact: true }).click();
  898 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  899 |     await resultSeek.dispatchEvent('pointerdown');
  900 |     await resultSeek.evaluate((input: HTMLInputElement) => input.blur());
  901 |     await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  902 | 
  903 |     const currentGenerationBeforeDownload = await resultVideo.getAttribute('data-generation-id');
  904 |     await originalSource.click();
  905 |     await expect(resultVideo).toHaveAttribute('data-source', 'original');
  906 |     const [download] = await Promise.all([
  907 |       page.waitForEvent('download'),
  908 |       page.getByRole('button', { name: 'Download My dub', exact: true }).click(),
  909 |     ]);
  910 |     const downloadPath = await download.path();
  911 |     expect(download.suggestedFilename()).toBe('example-dub.mp4');
  912 |     expect(downloadPath).not.toBeNull();
  913 |     const downloadedBytes = await readFile(downloadPath!);
  914 |     const expectedFixtureBytes = await readFile(path.resolve(process.cwd(), 'public', 'media', 'example-dub.mp4'));
  915 |     const downloadedSha256 = createHash('sha256').update(downloadedBytes).digest('hex');
  916 |     expect(downloadedBytes.equals(expectedFixtureBytes)).toBe(true);
  917 | 
  918 |     const resultDatabase = await page.evaluate(async () => {
  919 |       const database = await new Promise<IDBDatabase>((resolve, reject) => {
  920 |         const request = indexedDB.open('dubbed-core-local-v1');
  921 |         request.onsuccess = () => resolve(request.result);
  922 |         request.onerror = () => reject(request.error);
  923 |       });
  924 |       const read = <T>(name: string) => new Promise<T>((resolve, reject) => {
  925 |         const request = database.transaction(name, 'readonly').objectStore(name).getAll();
  926 |         request.onsuccess = () => resolve(request.result as T);
  927 |         request.onerror = () => reject(request.error);
  928 |       });
  929 |       const jobs = await read<Array<{ id: string; snapshotId: string; status: string; productRendered: boolean; assembledFromAcceptedTakes: boolean }>>('resultJobs');
  930 |       const resultMedia = await read<Array<{ id: string; filename: string; byteSize: number; sha256: string; blob: Blob }>>('resultMedia');
  931 |       database.close();
```