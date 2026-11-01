# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: result-generation.spec.ts >> keeps playback and download bytes bound to the displayed generation
- Location: e2e\result-generation.spec.ts:104:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 0

  Array [
    "controlled-result-project",
    "controlled-result-project",
-   "controlled-result-project",
  ]
```

# Page snapshot

```yaml
- main [ref=e4]:
  - region [ref=e5]:
    - generic [ref=e7]:
      - heading "Your result" [level=1] [ref=e8]
      - paragraph [ref=e9]: Controlled fixture project
    - generic [ref=e10]:
      - generic "Finished dubbed video" [ref=e11]
      - generic [ref=e12]:
        - generic [ref=e13]: "Displayed generation: 2"
        - generic [ref=e14]: Synthetic fixture result; not rendered from accepted takes or a custom upload.
      - status [ref=e15]: Download requested.
      - generic [ref=e16]:
        - button "Download MP4" [active] [ref=e17] [cursor=pointer]
        - button "Return to recording" [ref=e22] [cursor=pointer]
```

# Test source

```ts
  67  | 
  68  | async function readVideo(page: Page): Promise<VideoState> {
  69  |   return page.locator('video[aria-label="Finished dubbed video"]').evaluate((element: unknown) => {
  70  |     const video = element as {
  71  |       getAttribute(name: string): string | null
  72  |       currentTime: number
  73  |       paused: boolean
  74  |       muted: boolean
  75  |       volume: number
  76  |       readyState: number
  77  |     }
  78  |     return {
  79  |       src: video.getAttribute('src'),
  80  |       currentTime: video.currentTime,
  81  |       paused: video.paused,
  82  |       muted: video.muted,
  83  |       volume: video.volume,
  84  |       readyState: video.readyState,
  85  |     }
  86  |   })
  87  | }
  88  | 
  89  | async function downloadedBytes(download: Download): Promise<{
  90  |   fileName: string
  91  |   bytes: number
  92  |   sha256: string
  93  | }> {
  94  |   const path = await download.path()
  95  |   expect(path, 'the Chromium download should be available as a local test artifact').not.toBeNull()
  96  |   const bytes = await readFile(path!)
  97  |   return {
  98  |     fileName: download.suggestedFilename(),
  99  |     bytes: bytes.byteLength,
  100 |     sha256: createHash('sha256').update(bytes).digest('hex'),
  101 |   }
  102 | }
  103 | 
  104 | test('keeps playback and download bytes bound to the displayed generation', async ({ page, baseURL }, testInfo) => {
  105 |   test.setTimeout(45_000)
  106 |   page.setDefaultTimeout(15_000)
  107 |   const diagnostics = await installBrowserDiagnostics(page, baseURL ?? 'http://127.0.0.1:4173')
  108 |   const manifest = JSON.parse(
  109 |     await readFile(new URL('../public/media/fixture-manifest.json', import.meta.url), 'utf8'),
  110 |   ) as FixtureManifest
  111 | 
  112 |   let proof: Record<string, unknown> = {}
  113 |   try {
  114 |     await page.goto('/e2e/harness/result.html')
  115 |     const video = page.locator('video[aria-label="Finished dubbed video"]')
  116 |     await expect(video).toBeVisible()
  117 |     await expect(video).toHaveAttribute('src', '/media/result-generation-001.mp4')
  118 | 
  119 |     await video.evaluate(async (element: unknown) => {
  120 |       const player = element as { muted: boolean; volume: number; play(): Promise<void> }
  121 |       player.muted = true
  122 |       player.volume = 0
  123 |       await player.play()
  124 |     })
  125 |     await expect.poll(async () => (await readVideo(page)).currentTime, { timeout: 10_000 }).toBeGreaterThan(0.2)
  126 |     const beforePublish = await readVideo(page)
  127 | 
  128 |     await page.getByRole('button', { name: 'Download MP4', exact: true }).click()
  129 |     await expect.poll(async () => (await harnessSnapshot(page)).downloadCalls.length).toBe(1)
  130 |     const firstDownloadCall = (await harnessSnapshot(page)).downloadCalls[0]
  131 |     expect(firstDownloadCall.displayedGenerationId).toBe('controlled-generation-001')
  132 | 
  133 |     await invokeHarness(page, 'publishGeneration2')
  134 |     const watchNew = page.getByRole('button', { name: 'Watch new', exact: true })
  135 |     await expect(watchNew).toBeVisible()
  136 |     await expect(watchNew).toBeEnabled()
  137 |     const whileDownloadPending = await readVideo(page)
  138 |     expect(whileDownloadPending.src).toBe('/media/result-generation-001.mp4')
  139 |     expect(whileDownloadPending.paused).toBe(false)
  140 |     await expect.poll(async () => (await readVideo(page)).currentTime, { timeout: 5_000 })
  141 |       .toBeGreaterThan(beforePublish.currentTime + 0.2)
  142 |     const beforeWatchNew = await readVideo(page)
  143 |     expect(beforeWatchNew.src).toBe('/media/result-generation-001.mp4')
  144 |     expect(beforeWatchNew.paused).toBe(false)
  145 | 
  146 |     await watchNew.click()
  147 |     await expect(video).toHaveAttribute('src', '/media/result-generation-002.mp4')
  148 |     await expect.poll(async () => (await readVideo(page)).readyState, { timeout: 10_000 }).toBeGreaterThan(0)
  149 |     await expect(page.getByText('Preparing download for version 1…', { exact: true })).toBeVisible()
  150 |     const afterWatchNew = await readVideo(page)
  151 |     expect(afterWatchNew.paused).toBe(true)
  152 |     expect(afterWatchNew.currentTime).toBeCloseTo(0, 2)
  153 | 
  154 |     const oldDownloadEvent = page.waitForEvent('download')
  155 |     await invokeHarness(page, 'completeFirstDownload')
  156 |     const pendingGeneration1 = await downloadedBytes(await oldDownloadEvent)
  157 | 
  158 |     const freshDownloadEvent = page.waitForEvent('download')
  159 |     await page.getByRole('button', { name: 'Download MP4', exact: true }).click()
  160 |     const freshGeneration2 = await downloadedBytes(await freshDownloadEvent)
  161 | 
  162 |     const snapshot = await harnessSnapshot(page)
  163 |     expect(snapshot.downloadCalls.map((call) => call.displayedGenerationId)).toEqual([
  164 |       'controlled-generation-001',
  165 |       'controlled-generation-002',
  166 |     ])
> 167 |     expect(snapshot.downloadCalls.map((call) => call.projectId)).toEqual([
      |                                                                  ^ Error: expect(received).toEqual(expected) // deep equality
  168 |       'controlled-result-project',
  169 |       'controlled-result-project',
  170 |       'controlled-result-project',
  171 |     ])
  172 |     expect(new Set(snapshot.downloadCalls.map((call) => call.operationId)).size).toBe(2)
  173 |     expect(pendingGeneration1).toEqual({
  174 |       fileName: manifest.assets.resultGeneration1.fileName,
  175 |       bytes: manifest.assets.resultGeneration1.bytes,
  176 |       sha256: manifest.assets.resultGeneration1.sha256,
  177 |     })
  178 |     expect(freshGeneration2).toEqual({
  179 |       fileName: manifest.assets.resultGeneration2.fileName,
  180 |       bytes: manifest.assets.resultGeneration2.bytes,
  181 |       sha256: manifest.assets.resultGeneration2.sha256,
  182 |     })
  183 |     expect(snapshot.assemblyCalls).toBe(0)
  184 |     expect(snapshot.creditCalls).toEqual([])
  185 |     expect(snapshot.operationCalls).toEqual([])
  186 |     expect(snapshot.otherServiceCalls).toEqual([])
  187 | 
  188 |     proof = {
  189 |       capturedAtUtc: new Date().toISOString(),
  190 |       scope: 'Controlled local-mock ResultScreen browser proof. This does not exercise backend generation, native-device capture, Safari/iOS, or operating-system save confirmation.',
  191 |       browser: { engine: 'Chromium', version: page.context().browser()?.version() ?? null },
  192 |       mediaOutput: { mutedLaunchArgumentConfigured: true, elementMuted: beforePublish.muted, elementVolume: beforePublish.volume },
  193 |       localFixtureOnly: true,
  194 |       generationIds: ['controlled-generation-001', 'controlled-generation-002'],
  195 |       playback: {
  196 |         sourceDuringPendingDownload: whileDownloadPending.src,
  197 |         currentTimeBeforePublishSeconds: beforePublish.currentTime,
  198 |         currentTimeDuringPendingDownloadSeconds: whileDownloadPending.currentTime,
  199 |         pausedDuringPendingDownload: whileDownloadPending.paused,
  200 |         sourceBeforeExplicitWatchNew: beforeWatchNew.src,
  201 |         sourceAfterWatchNew: afterWatchNew.src,
  202 |         pausedAfterWatchNew: afterWatchNew.paused,
  203 |         currentTimeAfterWatchNewSeconds: afterWatchNew.currentTime,
  204 |       },
  205 |       downloads: {
  206 |         calls: snapshot.downloadCalls,
  207 |         pendingOldGeneration: pendingGeneration1,
  208 |         freshCurrentGeneration: freshGeneration2,
  209 |       },
  210 |       sideEffects: {
  211 |         assemblyCalls: snapshot.assemblyCalls,
  212 |         creditCalls: snapshot.creditCalls,
  213 |         operationCalls: snapshot.operationCalls,
  214 |         unexpectedServiceCalls: snapshot.otherServiceCalls,
  215 |       },
  216 |     }
  217 |   } finally {
  218 |     diagnostics.assertClean()
  219 |   }
  220 | 
  221 |   const proofPath = testInfo.outputPath('result-generation-controlled-proof.json')
  222 |   await writeFile(proofPath, JSON.stringify(proof, null, 2), 'utf8')
  223 |   await testInfo.attach('result-generation-controlled-proof.json', {
  224 |     path: proofPath,
  225 |     contentType: 'application/json',
  226 |   })
  227 | })
  228 | 
```