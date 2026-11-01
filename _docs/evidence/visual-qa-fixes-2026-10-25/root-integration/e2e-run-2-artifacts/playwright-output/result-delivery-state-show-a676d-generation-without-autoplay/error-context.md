# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: result-delivery-state.spec.ts >> shows an actual media network error and refreshes the same generation without autoplay
- Location: e2e\result-delivery-state.spec.ts:335:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Retry playback', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: 'Retry playback', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Retry playback', exact: true })

```

```yaml
- main:
  - region "Your result":
    - heading "Your result" [level=1]
    - paragraph: Synthetic result delivery fixture
    - text: "Displayed generation: 7 Synthetic fixture result; not rendered from accepted takes or a custom upload."
    - button "Download MP4"
    - button "Return to recording"
    - alert: Version 7 could not be played. The result is preserved for retry.
    - button "Refresh playback access"
```

# Test source

```ts
  83  |     return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineOffset: style.outlineOffset }
  84  |   })
  85  |   expect(focusStyle).toEqual({ outlineStyle: 'solid', outlineWidth: '2px', outlineOffset: '2px' })
  86  | }
  87  | 
  88  | async function capture(page: Page, name: string): Promise<void> {
  89  |   await settlePaint(page)
  90  |   await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: true })
  91  | }
  92  | 
  93  | async function recordTrustedProgressGeometry(page: Page): Promise<void> {
  94  |   const progress = page.getByRole('progressbar', { name: 'Assembly progress' })
  95  |   const measurement = await progress.evaluate((element) => {
  96  |     const bar = element as HTMLProgressElement
  97  |     const rect = bar.getBoundingClientRect()
  98  |     const style = getComputedStyle(bar)
  99  |     return {
  100 |       element: bar.tagName,
  101 |       value: bar.value,
  102 |       max: bar.max,
  103 |       rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  104 |       computed: {
  105 |         accentColor: style.accentColor,
  106 |         appearance: style.appearance,
  107 |         backgroundColor: style.backgroundColor,
  108 |         borderRadius: style.borderRadius,
  109 |         boxSizing: style.boxSizing,
  110 |         height: style.height,
  111 |         fillColor: style.color,
  112 |       },
  113 |     }
  114 |   })
  115 |   const viewport = await page.evaluate(() => ({
  116 |     width: document.documentElement.clientWidth,
  117 |     height: document.documentElement.clientHeight,
  118 |   }))
  119 |   expect(measurement.element).toBe('PROGRESS')
  120 |   expect(measurement.value).toBe(42)
  121 |   expect(measurement.max).toBe(100)
  122 |   expect(measurement.rect.height).toBe(4)
  123 |   expect(measurement.computed).toMatchObject({
  124 |     accentColor: 'rgb(0, 96, 226)',
  125 |     appearance: 'none',
  126 |     backgroundColor: 'rgba(0, 0, 0, 0.06)',
  127 |     borderRadius: '2px',
  128 |     height: '4px',
  129 |     fillColor: 'rgb(0, 96, 226)',
  130 |   })
  131 |   await writeFile(
  132 |     path.join(evidenceDirectory, 'result-assembly-progress-known-en-desktop.geometry.json'),
  133 |     `${JSON.stringify({ viewport, ...measurement }, null, 2)}\n`,
  134 |     'utf8',
  135 |   )
  136 | }
  137 | 
  138 | async function videoState(video: Locator): Promise<{
  139 |   src: string | null
  140 |   currentTime: number
  141 |   paused: boolean
  142 |   readyState: number
  143 | }> {
  144 |   return video.evaluate((element) => {
  145 |     const player = element as HTMLVideoElement
  146 |     return {
  147 |       src: player.getAttribute('src'),
  148 |       currentTime: player.currentTime,
  149 |       paused: player.paused,
  150 |       readyState: player.readyState,
  151 |     }
  152 |   })
  153 | }
  154 | 
  155 | async function assertPlaybackFailureAndSameGenerationRefresh(
  156 |   page: Page,
  157 |   scenario: 'playback-network-error' | 'playback-expired-descriptor',
  158 |   locale: 'en' | 'ru',
  159 |   urlPath: string,
  160 |   screenshotFailure: string,
  161 |   screenshotRecovered: string,
  162 | ): Promise<void> {
  163 |   await page.route(`**${urlPath}/**`, async (route) => {
  164 |     if (scenario === 'playback-expired-descriptor') {
  165 |       await route.fulfill({ status: 403, contentType: 'text/plain', body: 'Synthetic expired playback descriptor.' })
  166 |       return
  167 |     }
  168 |     await route.abort('failed')
  169 |   })
  170 |   await openScenario(page, scenario, locale)
  171 | 
  172 |   const video = page.getByLabel(locale === 'ru' ? 'Готовое озвученное видео' : 'Finished dubbed video')
  173 |   await expect(video).toBeVisible()
  174 |   await expect(video).toHaveAttribute('src', `${urlPath}/result-state-generation-001.mp4`)
  175 |   const alert = page.getByRole('alert')
  176 |   await expect(alert).toBeVisible()
  177 |   await expect(alert).toContainText(
  178 |     locale === 'ru'
  179 |       ? 'Не удалось воспроизвести версию 7. Результат сохранён для повтора.'
  180 |       : 'Version 7 could not be played. The result is preserved for retry.',
  181 |   )
  182 |   await expect(page.locator('.result-screen__download-error')).toHaveCount(0)
> 183 |   await expect(page.getByRole('button', { name: locale === 'ru' ? 'Повторить воспроизведение' : 'Retry playback', exact: true })).toBeVisible()
      |                                                                                                                                   ^ Error: expect(locator).toBeVisible() failed
  184 |   await expect(page.getByText(locale === 'ru' ? 'Отображаемая версия: 7' : 'Displayed generation: 7', { exact: true })).toBeVisible()
  185 |   await assertNoHorizontalOverflow(page)
  186 | 
  187 |   if (locale === 'ru') {
  188 |     const retryButton = page.getByRole('button', { name: 'Повторить воспроизведение', exact: true })
  189 |     const box = await retryButton.boundingBox()
  190 |     expect(box?.height).toBeGreaterThanOrEqual(48)
  191 |   }
  192 | 
  193 |   await capture(page, screenshotFailure)
  194 |   const beforeRefresh = await harnessSnapshot(page)
  195 |   expect(beforeRefresh.loadPlaybackCalls).toEqual([{ projectId: 'result-state-project', displayedGenerationId: generationId }])
  196 |   expect(beforeRefresh.refreshPlaybackCalls).toEqual([])
  197 |   expect(beforeRefresh.downloadCalls).toEqual([])
  198 |   expect(beforeRefresh.ensureAssemblyCalls).toBe(0)
  199 |   expect(beforeRefresh.retryCalls).toEqual([])
  200 |   expect(beforeRefresh.creditCalls).toEqual([])
  201 | 
  202 |   const retryButton = page.getByRole('button', { name: locale === 'ru' ? 'Повторить воспроизведение' : 'Retry playback', exact: true })
  203 |   await focusWithKeyboard(page, retryButton)
  204 |   await page.keyboard.press('Enter')
  205 |   await expect.poll(async () => (await harnessSnapshot(page)).refreshPlaybackCalls.length).toBe(1)
  206 |   await expect(video).toHaveAttribute('src', '/media/result-generation-001.mp4')
  207 |   await expect(alert).toHaveCount(0)
  208 |   await expect.poll(async () => (await videoState(video)).readyState).toBeGreaterThan(0)
  209 | 
  210 |   const afterRefresh = await harnessSnapshot(page)
  211 |   expect(afterRefresh.refreshPlaybackCalls).toEqual([{ projectId: 'result-state-project', displayedGenerationId: generationId }])
  212 |   expect(afterRefresh.loadPlaybackCalls[0].displayedGenerationId).toBe(generationId)
  213 |   expect(await page.getByText(locale === 'ru' ? 'Отображаемая версия: 7' : 'Displayed generation: 7', { exact: true })).toBeVisible()
  214 |   const recoveredVideo = await videoState(video)
  215 |   expect(recoveredVideo.paused).toBe(true)
  216 |   expect(recoveredVideo.currentTime).toBeLessThanOrEqual(0.05)
  217 |   expect(afterRefresh.downloadCalls).toEqual([])
  218 |   expect(afterRefresh.ensureAssemblyCalls).toBe(0)
  219 |   expect(afterRefresh.retryCalls).toEqual([])
  220 |   expect(afterRefresh.creditCalls).toEqual([])
  221 |   await assertNoHorizontalOverflow(page)
  222 |   await capture(page, screenshotRecovered)
  223 | }
  224 | 
  225 | test.beforeEach(async () => {
  226 |   await mkdir(evidenceDirectory, { recursive: true })
  227 | })
  228 | 
  229 | test('renders only trusted assembly progress on desktop', async ({ page }) => {
  230 |   await page.setViewportSize({ width: 1440, height: 1000 })
  231 |   await openScenario(page, 'assembly-progress-known', 'en')
  232 | 
  233 |   await expect(page.getByRole('heading', { name: 'Assembling video…' })).toBeVisible()
  234 |   const progress = page.getByRole('progressbar', { name: 'Assembly progress' })
  235 |   await expect(progress).toHaveAttribute('value', '42')
  236 |   await expect(page.locator('.result-screen__progress span')).toHaveText('42%')
  237 |   await recordTrustedProgressGeometry(page)
  238 |   await assertNoHorizontalOverflow(page)
  239 |   await capture(page, 'result-assembly-progress-known-en-desktop.png')
  240 | })
  241 | 
  242 | test('does not invent a percentage when assembly progress is untrusted', async ({ page }) => {
  243 |   await page.setViewportSize({ width: 390, height: 844 })
  244 |   await openScenario(page, 'assembly-progress-untrusted', 'ru')
  245 | 
  246 |   await expect(page.getByRole('heading', { name: 'Собираем видео…' })).toBeVisible()
  247 |   await expect(page.getByRole('progressbar')).toHaveCount(0)
  248 |   await expect(page.locator('.result-screen__progress')).toHaveCount(0)
  249 |   await expect(page.getByText('67%', { exact: true })).toHaveCount(0)
  250 |   await assertNoHorizontalOverflow(page)
  251 |   await capture(page, 'result-assembly-progress-untrusted-ru-phone.png')
  252 | })
  253 | 
  254 | test('switches the Result main gutter at the 767/768px app breakpoint', async ({ page }) => {
  255 |   await page.setViewportSize({ width: 767, height: 844 })
  256 |   await openScenario(page, 'assembly-progress-known', 'en')
  257 | 
  258 |   const appMain = page.locator('.app-main')
  259 |   const measurements = []
  260 |   for (const [width, expectedPadding] of [[767, 16], [768, 32]] as const) {
  261 |     await page.setViewportSize({ width, height: 844 })
  262 |     await expect(appMain).toHaveCSS('padding-left', `${expectedPadding}px`)
  263 |     const resultWidth = await page.locator('.result-screen').evaluate((element) => element.getBoundingClientRect().width)
  264 |     expect(resultWidth).toBeGreaterThan(0)
  265 |     await assertNoHorizontalOverflow(page)
  266 |     measurements.push({ width, appMainPaddingLeft: expectedPadding, resultWidth })
  267 |   }
  268 | 
  269 |   await writeFile(
  270 |     path.join(evidenceDirectory, 'result-app-main-767-768-boundary.geometry.json'),
  271 |     `${JSON.stringify({ viewportHeight: 844, measurements }, null, 2)}\n`,
  272 |     'utf8',
  273 |   )
  274 | })
  275 | 
  276 | test('keeps assembly retry identity when the outcome is unknown', async ({ page }) => {
  277 |   await page.setViewportSize({ width: 390, height: 844 })
  278 |   await openScenario(page, 'assembly-retry-unknown', 'ru')
  279 | 
  280 |   await expect(page.getByText('Не удалось завершить последнюю попытку сборки.', { exact: true })).toBeVisible()
  281 |   await page.getByRole('button', { name: 'Повторить сборку', exact: true }).click()
  282 |   const submitting = page.getByRole('button', { name: 'Повторяем сборку…', exact: true })
  283 |   await expect(submitting).toBeVisible()
```