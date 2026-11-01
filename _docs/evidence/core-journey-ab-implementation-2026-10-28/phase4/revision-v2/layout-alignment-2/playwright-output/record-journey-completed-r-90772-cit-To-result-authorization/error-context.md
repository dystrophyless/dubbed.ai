# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> completed revision stays in Record after Next and needs explicit To result authorization
- Location: e2e\record-journey.spec.ts:1061:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Illustrative result sample available')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Illustrative result sample available') with timeout 15000ms
  - waiting for getByText('Illustrative result sample available')

```

```yaml
- banner:
  - button "Exit"
  - heading "Your result" [level=1]
  - paragraph: Sintel · The Search
- main "Your result":
  - group "Result":
    - button "Original"
    - button "My dub" [pressed]
  - group "Result":
    - slider "Seek": "0"
    - button "Play"
    - text: 0:00 / 0:13 Volume
    - slider "Volume": "1"
    - button "Full screen"
  - status:
    - heading "Illustrative sample ready" [level=2]
    - paragraph: Fixed example video; not rendered from accepted takes.
  - button "Download My dub"
  - button "Return to recording"
```

# Test source

```ts
  978  |       snapshots: finalDatabase.snapshots,
  979  |       result: {
  980  |         generationId: currentGenerationBeforeDownload,
  981  |         currentComparisonAtDownload: 'original',
  982  |         downloadFilename: download.suggestedFilename(),
  983  |         downloadSha256: downloadedSha256,
  984  |         exactFixtureBytesMatch: downloadedBytes.equals(expectedFixtureBytes),
  985  |         fixtureProvenance: 'Fixed illustrative sample; productRendered=false; assembledFromAcceptedTakes=false',
  986  |         jobs: resultDatabase.jobs,
  987  |         media: resultDatabase.media,
  988  |       },
  989  |       assertions: ['No getUserMedia or MediaRecorder before explicit Record', 'video moved during each native recording', 'captured Blob persisted and hashed', 'accepted snapshot includes exact three recorded candidates', 'native controls remained locked during capture', 'Result generation consumed the authorized immutable snapshot', 'player served exact fixture bytes and remained paused on entry', 'source switch preserved playhead and play intent', 'download from Original preview pinned the presented My dub generation', 'downloaded bytes match the persisted fixture hash', 'mobile Result has no horizontal overflow and a 48px download target'],
  990  |     }, null, 2), 'utf8');
  991  | 
  992  |     const resultRoute = page.url();
  993  |     await page.getByRole('button', { name: 'Return to recording', exact: true }).click();
  994  |     await expect(page).toHaveURL(new RegExp(`/projects/sintel-prepared/record\\?layout=${layout}&turn=sintel-turn-1`));
  995  |     const returnedRecordVideo = page.locator('.media-viewport video');
  996  |     await expect.poll(() => returnedRecordVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  997  |     await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-result-return-first-turn.png`) });
  998  |     await page.goto(resultRoute);
  999  |     await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
  1000 |     await expect.poll(() => page.getByTestId('result-video').evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  1001 |     await expect(page.getByTestId('result-video')).toHaveAttribute('data-source', 'dub');
  1002 | 
  1003 |     if (layout === 'A') {
  1004 |       const leavingVideo = await page.getByTestId('result-video').evaluateHandle((video) => video);
  1005 |       await page.getByRole('button', { name: 'Play', exact: true }).click();
  1006 |       await expect.poll(() => page.getByTestId('result-video').evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
  1007 |       await page.getByRole('button', { name: 'Exit', exact: true }).click();
  1008 |       await expect(page).toHaveURL(/\/projects\?.*returnFocus=exit/);
  1009 |       expect(await leavingVideo.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true);
  1010 |       await page.getByTestId('return-to-saved-record').click();
  1011 |       await expect(page).toHaveURL(/returnFocus=exit/);
  1012 |       await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
  1013 |     }
  1014 | 
  1015 |     if (layout === 'B') {
  1016 |       await page.evaluate(async () => {
  1017 |         type ResultStore = {
  1018 |           readGenerationMedia(scope: unknown, id: unknown): Promise<unknown>;
  1019 |           loadPreparedProject(scope: unknown): Promise<{ revision: number } | null>;
  1020 |           tombstoneProject(scope: unknown, revision: number, operation: string): Promise<number>;
  1021 |         };
  1022 |         type Fiber = { child?: unknown; sibling?: unknown; memoizedProps?: unknown };
  1023 |         const root = document.getElementById('root') as (HTMLElement & Record<string, unknown>) | null;
  1024 |         if (!root) throw new Error('The React root is unavailable.');
  1025 |         const rootKey = Object.keys(root).find((key) => key.startsWith('__reactContainer$'));
  1026 |         if (!rootKey) throw new Error('The React root fiber is unavailable.');
  1027 |         const pending: unknown[] = [root[rootKey]];
  1028 |         let store: ResultStore | null = null;
  1029 |         while (pending.length > 0) {
  1030 |           const fiber = pending.pop() as Fiber | null;
  1031 |           if (!fiber) continue;
  1032 |           const props = fiber.memoizedProps as { services?: { results?: ResultStore } } | null;
  1033 |           if (props?.services?.results) store = props.services.results;
  1034 |           if (fiber.child) pending.push(fiber.child);
  1035 |           if (fiber.sibling) pending.push(fiber.sibling);
  1036 |         }
  1037 |         if (!store) throw new Error('The active typed ResultPort was not found in the services provider.');
  1038 |         const originalRead = store.readGenerationMedia.bind(store);
  1039 |         const target = window as Window & { __deletedBeforeGenerationDelivery?: boolean };
  1040 |         store.readGenerationMedia = async (scope, id) => {
  1041 |           const payload = await originalRead(scope, id);
  1042 |           const project = await store.loadPreparedProject(scope);
  1043 |           if (!project) throw new Error('The prepared project disappeared before the tombstone seam.');
  1044 |           await store.tombstoneProject(scope, project.revision, `review-delete:${crypto.randomUUID()}`);
  1045 |           target.__deletedBeforeGenerationDelivery = true;
  1046 |           return payload;
  1047 |         };
  1048 |       });
  1049 |       let downloadEvents = 0;
  1050 |       page.on('download', () => { downloadEvents += 1; });
  1051 |       await page.getByRole('button', { name: 'Download My dub', exact: true }).click();
  1052 |       await expect(page.locator('[data-testid="deleted-project-boundary"]')).toBeVisible();
  1053 |       expect(await page.evaluate(() => (window as Window & { __deletedBeforeGenerationDelivery?: boolean }).__deletedBeforeGenerationDelivery)).toBe(true);
  1054 |       expect(downloadEvents).toBe(0);
  1055 |       await expect(page.getByTestId('result-player')).toHaveCount(0);
  1056 |       await page.screenshot({ path: path.join(evidenceDirectory, 'B-download-tombstoned-before-delivery.png'), fullPage: true });
  1057 |     }
  1058 |   });
  1059 | }
  1060 | 
  1061 | test('completed revision stays in Record after Next and needs explicit To result authorization', async ({ page, browser }) => {
  1062 |   test.setTimeout(75_000);
  1063 |   await page.setViewportSize({ width: 1440, height: 900 });
  1064 |   await instrumentNativeMedia(page);
  1065 |   await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  1066 |   await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) =>
  1067 |     video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), { timeout: 15_000 }).toBe(true);
  1068 |   await expect(page.locator('.waveform-row')).toHaveAttribute('data-source-waveform', 'decoded');
  1069 |   await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  1070 | 
  1071 |   for (const turn of [1, 2, 3]) {
  1072 |     await recordCurrentWindow(page, 'A');
  1073 |     await page.getByRole('button', { name: 'Next', exact: true }).click();
  1074 |     if (turn < 3) await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-${turn + 1}`));
  1075 |   }
  1076 | 
  1077 |   await expect(page).toHaveURL(/\/result\?layout=A&snapshot=/);
> 1078 |   await expect(page.getByText('Illustrative result sample available')).toBeVisible({ timeout: 15_000 });
       |                                                                        ^ Error: expect(locator).toBeVisible() failed
  1079 |   const initial = await readIndexedDb(page);
  1080 |   const initialSnapshotId = String(initial.project?.initialResultSnapshotId ?? '');
  1081 |   expect(initialSnapshotId).toBeTruthy();
  1082 |   await page.screenshot({ path: path.join(evidenceDirectory, 'phase4-initial-result-before-revision.png'), fullPage: true });
  1083 | 
  1084 |   await page.getByRole('button', { name: 'Return to recording', exact: true }).click();
  1085 |   await expect(page).toHaveURL(/\/record\?layout=A&turn=sintel-turn-1/);
  1086 |   await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  1087 |   const returnLocks = await page.evaluate(() => (window as unknown as Window & {
  1088 |     __lockEvidence: { requests: string[]; callbacks: Array<'acquired' | 'null'> };
  1089 |   }).__lockEvidence);
  1090 |   expect(returnLocks.requests).toHaveLength(2);
  1091 |   expect(returnLocks.callbacks).toEqual(['acquired', 'acquired']);
  1092 |   await recordCurrentWindow(page, 'A');
  1093 |   await page.getByRole('button', { name: 'Next', exact: true }).click();
  1094 |   await expect(page).toHaveURL(/\/record\?layout=A&turn=sintel-turn-1/);
  1095 |   await expect(page.getByRole('button', { name: 'To result', exact: true })).toBeVisible();
  1096 |   await expect(page).not.toHaveURL(/\/result/);
  1097 |   const afterReplacementNext = page.url();
  1098 | 
  1099 |   await page.goto('/projects/sintel-prepared/record?layout=A&turn=sintel-turn-3&locale=en');
  1100 |   await expect(page.getByRole('button', { name: 'To result', exact: true })).toBeVisible();
  1101 |   await page.screenshot({ path: path.join(evidenceDirectory, 'phase4-completed-revision-last-turn.png'), fullPage: true });
  1102 |   await page.getByRole('button', { name: 'To result', exact: true }).click();
  1103 |   await expect(page).toHaveURL(/\/result\?layout=A&snapshot=/);
  1104 |   const presentedVideo = page.getByTestId('result-video');
  1105 |   await expect.poll(() => presentedVideo.evaluate((video: HTMLVideoElement) =>
  1106 |     video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0
  1107 |       && video.currentSrc.startsWith('blob:')), { timeout: 15_000 }).toBe(true);
  1108 |   await expect(page.getByText('Illustrative result sample available')).toBeVisible();
  1109 | 
  1110 |   const revised = await readIndexedDb(page);
  1111 |   expect(revised.snapshots).toHaveLength(2);
  1112 |   const originalSnapshot = revised.snapshots.find((snapshot) => snapshot.id === initialSnapshotId);
  1113 |   expect((originalSnapshot as { authorization?: string } | undefined)?.authorization).toBe('initial-completion');
  1114 |   const explicitSnapshot = revised.snapshots.find((snapshot) => snapshot.authorization === 'explicit-completed-revision') as
  1115 |     { id: string; authorization: string; takes: unknown[] } | undefined;
  1116 |   expect(explicitSnapshot).toBeDefined();
  1117 |   if (!explicitSnapshot) throw new Error('The explicit completed revision snapshot was not persisted.');
  1118 |   expect(explicitSnapshot.authorization).toBe('explicit-completed-revision');
  1119 |   expect(explicitSnapshot.id).not.toBe(initialSnapshotId);
  1120 |   expect(explicitSnapshot.takes).toHaveLength(3);
  1121 |   const presentedMedia = await presentedVideo.evaluate((video: HTMLVideoElement) => ({
  1122 |     source: video.dataset.source,
  1123 |     generationId: video.dataset.generationId,
  1124 |     currentSrc: video.currentSrc,
  1125 |     readyState: video.readyState,
  1126 |     currentTime: video.currentTime,
  1127 |     duration: Number.isFinite(video.duration) ? video.duration : null,
  1128 |     durationMetadata: video.duration === Infinity ? 'unknown-until-end' : Number.isNaN(video.duration) ? 'unavailable' : 'finite',
  1129 |     width: video.videoWidth,
  1130 |     height: video.videoHeight,
  1131 |     paused: video.paused,
  1132 |   }));
  1133 |   expect(presentedMedia.source).toBe('dub');
  1134 |   await page.screenshot({ path: path.join(evidenceDirectory, 'phase4-explicit-revision-result.png'), fullPage: true });
  1135 |   await writeFile(path.join(evidenceDirectory, 'phase4-explicit-revision-browser-evidence.json'), JSON.stringify({
  1136 |     date: new Date().toISOString(),
  1137 |     browser: `Chrome ${browser.version()}`,
  1138 |     nativeInput: 'Chrome fake media input; not a physical microphone',
  1139 |     initialSnapshotId,
  1140 |     revisedSnapshot: explicitSnapshot,
  1141 |     presentedMedia,
  1142 |     captureGrantLifecycle: returnLocks,
  1143 |     afterReplacementNext,
  1144 |     automaticResultNavigationAfterReplacement: false,
  1145 |     explicitToResultClicked: true,
  1146 |   }, null, 2));
  1147 | });
  1148 | 
  1149 | test('a second open tab cannot capture or accept while the first tab holds the local project grant', async ({ page }) => {
  1150 |   await page.goto('/projects/sintel-prepared/record?layout=A');
  1151 |   await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  1152 |   const secondPage = await page.context().newPage();
  1153 |   await secondPage.goto('/projects/sintel-prepared/record?layout=B');
  1154 |   await expect(secondPage.getByRole('button', { name: 'Record', exact: true })).toBeDisabled();
  1155 |   await expect(secondPage.getByRole('alert')).toContainText('Another open tab currently holds this project’s local recording access.');
  1156 |   await secondPage.close();
  1157 | });
  1158 | 
  1159 | test('denied microphone permission is contextual and does not start MediaRecorder', async ({ page, browser }) => {
  1160 |   await page.setViewportSize({ width: 1440, height: 900 });
  1161 |   await page.addInitScript(() => {
  1162 |     (window as Window & { __denyMicrophone?: boolean }).__denyMicrophone = true;
  1163 |   });
  1164 |   await instrumentNativeMedia(page);
  1165 |   await page.goto('/projects/sintel-prepared/record?layout=A');
  1166 |   await expect(page.getByRole('heading', { name: 'Sintel · The Search' })).toBeVisible();
  1167 | 
  1168 |   await page.getByRole('button', { name: 'Record', exact: true }).click();
  1169 |   await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  1170 |   await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');
  1171 |   expect(await evidenceCounters(page)).toEqual({ getUserMediaCalls: 1, recorderStarts: 0 });
  1172 |   const database = await readIndexedDb(page);
  1173 |   expect(database.media.filter((candidate) => candidate.purpose === 'recording')).toHaveLength(0);
  1174 |   const toast = page.locator('.recovery-toast');
  1175 |   await expect(toast).toBeVisible();
  1176 |   expect(await toast.getAttribute('aria-hidden')).toBe('true');
  1177 |   expect(await toast.getByRole('button').count()).toBe(0);
  1178 |   await page.waitForTimeout(1000);
```