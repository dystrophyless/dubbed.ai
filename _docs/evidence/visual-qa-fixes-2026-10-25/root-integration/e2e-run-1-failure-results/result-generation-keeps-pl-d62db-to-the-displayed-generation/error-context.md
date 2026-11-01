# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: result-generation.spec.ts >> keeps playback and download bytes bound to the displayed generation
- Location: e2e\result-generation.spec.ts:104:1

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator:  getByRole('button', { name: 'Watch new', exact: true })
Expected: disabled
Received: enabled
Timeout:  5000ms

Call log:
  - Expect "toBeDisabled" getByRole('button', { name: 'Watch new', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Watch new', exact: true })
    14 × locator resolved to <button type="button" data-slot="button" data-size="medium" data-variant="secondary" class="ui-button ui-button--secondary ui-button--medium">Watch new</button>
       - unexpected value "enabled"

```

```yaml
- button "Watch new"
```

# Test source

```ts
  36  |   }
  37  | }
  38  | 
  39  | interface VideoState {
  40  |   src: string | null
  41  |   currentTime: number
  42  |   paused: boolean
  43  |   muted: boolean
  44  |   volume: number
  45  |   readyState: number
  46  | }
  47  | 
  48  | async function harnessSnapshot(page: Page): Promise<HarnessSnapshot> {
  49  |   return page.evaluate(() => {
  50  |     const harness = (globalThis as unknown as {
  51  |       __controlledResultHarness?: HarnessApi
  52  |     }).__controlledResultHarness
  53  |     if (!harness) throw new Error('Controlled result harness is not ready.')
  54  |     return harness.snapshot()
  55  |   })
  56  | }
  57  | 
  58  | async function invokeHarness(page: Page, action: keyof Pick<HarnessApi, 'publishGeneration2' | 'failFirstDownload'>): Promise<void> {
  59  |   await page.evaluate((method) => {
  60  |     const harness = (globalThis as unknown as {
  61  |       __controlledResultHarness?: HarnessApi
  62  |     }).__controlledResultHarness
  63  |     if (!harness) throw new Error('Controlled result harness is not ready.')
  64  |     harness[method]()
  65  |   }, action)
  66  | }
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
> 136 |     await expect(watchNew).toBeDisabled()
      |                            ^ Error: expect(locator).toBeDisabled() failed
  137 |     const whileDownloadPending = await readVideo(page)
  138 |     expect(whileDownloadPending.src).toBe('/media/result-generation-001.mp4')
  139 |     expect(whileDownloadPending.paused).toBe(false)
  140 |     await expect.poll(async () => (await readVideo(page)).currentTime, { timeout: 5_000 })
  141 |       .toBeGreaterThan(beforePublish.currentTime + 0.2)
  142 | 
  143 |     await invokeHarness(page, 'failFirstDownload')
  144 |     const retryOldGeneration = page.getByRole('button', { name: 'Retry download version 1', exact: true })
  145 |     await expect(retryOldGeneration).toBeVisible()
  146 |     await expect(watchNew).toBeEnabled()
  147 |     const beforeWatchNew = await readVideo(page)
  148 |     expect(beforeWatchNew.src).toBe('/media/result-generation-001.mp4')
  149 |     expect(beforeWatchNew.paused).toBe(false)
  150 | 
  151 |     await watchNew.click()
  152 |     await expect(video).toHaveAttribute('src', '/media/result-generation-002.mp4')
  153 |     await expect.poll(async () => (await readVideo(page)).readyState, { timeout: 10_000 }).toBeGreaterThan(0)
  154 |     const afterWatchNew = await readVideo(page)
  155 |     expect(afterWatchNew.paused).toBe(true)
  156 |     expect(afterWatchNew.currentTime).toBeCloseTo(0, 2)
  157 | 
  158 |     const retryDownloadEvent = page.waitForEvent('download')
  159 |     await retryOldGeneration.click()
  160 |     const retriedGeneration1 = await downloadedBytes(await retryDownloadEvent)
  161 | 
  162 |     const freshDownloadEvent = page.waitForEvent('download')
  163 |     await page.getByRole('button', { name: 'Download MP4', exact: true }).click()
  164 |     const freshGeneration2 = await downloadedBytes(await freshDownloadEvent)
  165 | 
  166 |     const snapshot = await harnessSnapshot(page)
  167 |     expect(snapshot.downloadCalls.map((call) => call.displayedGenerationId)).toEqual([
  168 |       'controlled-generation-001',
  169 |       'controlled-generation-001',
  170 |       'controlled-generation-002',
  171 |     ])
  172 |     expect(snapshot.downloadCalls.map((call) => call.projectId)).toEqual([
  173 |       'controlled-result-project',
  174 |       'controlled-result-project',
  175 |       'controlled-result-project',
  176 |     ])
  177 |     expect(new Set(snapshot.downloadCalls.map((call) => call.operationId)).size).toBe(3)
  178 |     expect(retriedGeneration1).toEqual({
  179 |       fileName: manifest.assets.resultGeneration1.fileName,
  180 |       bytes: manifest.assets.resultGeneration1.bytes,
  181 |       sha256: manifest.assets.resultGeneration1.sha256,
  182 |     })
  183 |     expect(freshGeneration2).toEqual({
  184 |       fileName: manifest.assets.resultGeneration2.fileName,
  185 |       bytes: manifest.assets.resultGeneration2.bytes,
  186 |       sha256: manifest.assets.resultGeneration2.sha256,
  187 |     })
  188 |     expect(snapshot.assemblyCalls).toBe(0)
  189 |     expect(snapshot.creditCalls).toEqual([])
  190 |     expect(snapshot.operationCalls).toEqual([])
  191 |     expect(snapshot.otherServiceCalls).toEqual([])
  192 | 
  193 |     proof = {
  194 |       capturedAtUtc: new Date().toISOString(),
  195 |       scope: 'Controlled local-mock ResultScreen browser proof. This does not exercise backend generation, native-device capture, Safari/iOS, or operating-system save confirmation.',
  196 |       browser: { engine: 'Chromium', version: page.context().browser()?.version() ?? null },
  197 |       mediaOutput: { mutedLaunchArgumentConfigured: true, elementMuted: beforePublish.muted, elementVolume: beforePublish.volume },
  198 |       localFixtureOnly: true,
  199 |       generationIds: ['controlled-generation-001', 'controlled-generation-002'],
  200 |       playback: {
  201 |         sourceDuringPendingDownload: whileDownloadPending.src,
  202 |         currentTimeBeforePublishSeconds: beforePublish.currentTime,
  203 |         currentTimeDuringPendingDownloadSeconds: whileDownloadPending.currentTime,
  204 |         pausedDuringPendingDownload: whileDownloadPending.paused,
  205 |         sourceBeforeExplicitWatchNew: beforeWatchNew.src,
  206 |         sourceAfterWatchNew: afterWatchNew.src,
  207 |         pausedAfterWatchNew: afterWatchNew.paused,
  208 |         currentTimeAfterWatchNewSeconds: afterWatchNew.currentTime,
  209 |       },
  210 |       downloads: {
  211 |         calls: snapshot.downloadCalls,
  212 |         retryOldGeneration: retriedGeneration1,
  213 |         freshCurrentGeneration: freshGeneration2,
  214 |       },
  215 |       sideEffects: {
  216 |         assemblyCalls: snapshot.assemblyCalls,
  217 |         creditCalls: snapshot.creditCalls,
  218 |         operationCalls: snapshot.operationCalls,
  219 |         unexpectedServiceCalls: snapshot.otherServiceCalls,
  220 |       },
  221 |     }
  222 |   } finally {
  223 |     diagnostics.assertClean()
  224 |   }
  225 | 
  226 |   const proofPath = testInfo.outputPath('result-generation-controlled-proof.json')
  227 |   await writeFile(proofPath, JSON.stringify(proof, null, 2), 'utf8')
  228 |   await testInfo.attach('result-generation-controlled-proof.json', {
  229 |     path: proofPath,
  230 |     contentType: 'application/json',
  231 |   })
  232 | })
  233 | 
```