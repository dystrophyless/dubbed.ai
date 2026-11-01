# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: recording-viewport.spec.ts >> recording transport stays in normal desktop flow and clears the RU phone stage
- Location: e2e\recording-viewport.spec.ts:210:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "static"
Received: undefined
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - link "Skip to content" [ref=f1e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f1e5]:
    - generic [ref=f1e6]:
      - link "Dubbed — Home" [ref=f1e7] [cursor=pointer]:
        - /url: /
        - generic [ref=f1e8]: Dubbed
      - navigation "Main navigation" [ref=f1e9]:
        - link "New dub" [ref=f1e10] [cursor=pointer]:
          - /url: /new
        - link "Projects" [ref=f1e11] [cursor=pointer]:
          - /url: /projects
        - link "Credits" [ref=f1e12] [cursor=pointer]:
          - /url: /credits
        - link "Account" [ref=f1e13] [cursor=pointer]:
          - /url: /account
      - generic [ref=f1e14]:
        - generic [ref=f1e15]:
          - generic [ref=f1e16]: Credits
          - strong [ref=f1e17]: "111"
        - generic [ref=f1e19]:
          - generic [ref=f1e20]: Language
          - combobox "Language" [ref=f1e21] [cursor=pointer]:
            - option "EN" [selected]
            - option "RU"
        - button "Sign out" [ref=f1e22] [cursor=pointer]
  - main [ref=f1e23]:
    - region [ref=f1e25]:
      - generic [ref=f1e26]:
        - generic [ref=f1e27]:
          - heading "Record your voice" [level=1] [ref=f1e28]
          - generic [ref=f1e29]:
            - generic [ref=f1e30]: source-dialogue
            - generic [ref=f1e31]: ·Record
            - status [ref=f1e32]: ·Progress saved
        - button "Projects" [ref=f1e34] [cursor=pointer]
      - generic "Original video" [ref=f1e38]
      - generic [ref=f1e39]:
        - generic [ref=f1e40]:
          - generic [ref=f1e41]: Line 1 of 3
          - paragraph [ref=f1e42]: A blue light is on.
          - paragraph [ref=f1e43]: "Capture window: 0.75–3.18 s"
        - generic [ref=f1e44]: "Accepted takes: 0 / 3"
      - region "Recording playback timeline" [ref=f1e45]:
        - slider "Seek playback" [ref=f1e176] [cursor=pointer]: "0"
      - generic [ref=f1e177]:
        - generic [ref=f1e178]:
          - group "Audio source" [ref=f1e179]:
            - button "Original" [pressed] [ref=f1e180] [cursor=pointer]
            - button "My recording" [disabled] [ref=f1e181]
          - button "Play" [ref=f1e182] [cursor=pointer]
          - 'status "Playback position: 0:00 / 0:02" [ref=f1e186]': 0:00 / 0:02
        - paragraph [ref=f1e187]: No saved recording is available for this line yet.
        - generic [ref=f1e188]:
          - button "Record line" [ref=f1e189] [cursor=pointer]
          - button "Previous line" [disabled] [ref=f1e193]
          - button "Next line" [ref=f1e196] [cursor=pointer]
          - button "Microphone" [ref=f1e199] [cursor=pointer]
      - generic [ref=f1e203]:
        - generic [ref=f1e204]: Original video volume
        - slider "Original video volume" [ref=f1e205]: "0.8"
      - generic [ref=f1e206]: Recording status
      - 'generic "Input level: 0" [ref=f1e208]'
      - paragraph [ref=f1e209]: This prototype saves draft and take state through its local mock workspace. It does not produce a custom rendered performance.
      - region "Process again" [ref=f1e210]:
        - button "Process again" [ref=f1e211] [cursor=pointer]
```

# Test source

```ts
  137 |         width: Math.round(rect.width * 100) / 100,
  138 |         height: Math.round(rect.height * 100) / 100,
  139 |         left: Math.round(rect.left * 100) / 100,
  140 |         right: Math.round(rect.right * 100) / 100,
  141 |         top: Math.round(rect.top * 100) / 100,
  142 |         bottom: Math.round(rect.bottom * 100) / 100,
  143 |         scrollWidth: element.scrollWidth,
  144 |         clientWidth: element.clientWidth,
  145 |         textFits: text.width === 0 || (text.left >= rect.left - 1 && text.right <= rect.right + 1),
  146 |         fontSize: getComputedStyle(element).fontSize,
  147 |         lineHeight: getComputedStyle(element).lineHeight,
  148 |         paddingLeft: getComputedStyle(element).paddingLeft,
  149 |         paddingRight: getComputedStyle(element).paddingRight,
  150 |         gap: getComputedStyle(element).gap,
  151 |       }
  152 |     })
  153 |     const note = root.querySelector<HTMLElement>('.recording-transport__recording-note')
  154 |     const noteRect = note?.getBoundingClientRect()
  155 |     return {
  156 |       viewport: { width: window.innerWidth, height: window.innerHeight },
  157 |       scrollY: Math.round(window.scrollY * 100) / 100,
  158 |       documentWidth: document.documentElement.scrollWidth,
  159 |       modeLabels: [...root.querySelectorAll<HTMLElement>('.recording-transport__mode-option')]
  160 |         .map((element) => element.textContent?.trim() ?? ''),
  161 |       stage: rectOf('.recording-screen__stage'),
  162 |       dialogue: rectOf('.recording-screen__line-header'),
  163 |       spokenTarget: rectOf('.recording-screen__dialogue'),
  164 |       timeline: rectOf('.recording-transport__timeline'),
  165 |       panel: rectOf('.recording-transport__controls'),
  166 |       panelPosition: root.querySelector<HTMLElement>('.recording-transport__controls')
  167 |         ? getComputedStyle(root.querySelector<HTMLElement>('.recording-transport__controls')!).position
  168 |         : null,
  169 |       phonePanelFlow: root.getAttribute('data-phone-panel-flow'),
  170 |       panelNoteHeight: noteRect ? Math.round(noteRect.height * 100) / 100 : 0,
  171 |       controls,
  172 |     }
  173 |   })
  174 | }
  175 | 
  176 | async function readMediaState(page: Page) {
  177 |   return page.locator('.recording-screen__stage').evaluate((stage) => {
  178 |     const video = stage.querySelector<HTMLVideoElement>('video')
  179 |     const audio = stage.querySelector<HTMLAudioElement>('audio')
  180 |     return {
  181 |       videoTime: video?.currentTime ?? 0,
  182 |       videoPaused: video?.paused ?? true,
  183 |       videoMuted: video?.muted ?? true,
  184 |       videoVolume: video?.volume ?? 0,
  185 |       audioTime: audio?.currentTime ?? 0,
  186 |       audioPaused: audio?.paused ?? true,
  187 |       audioVolume: audio?.volume ?? 0,
  188 |       audioReadyState: audio?.readyState ?? 0,
  189 |       audioDuration: audio?.duration ?? 0,
  190 |       audioSource: audio?.getAttribute('src') ?? '',
  191 |       audioHidden: audio?.hidden ?? true,
  192 |     }
  193 |   })
  194 | }
  195 | 
  196 | async function inspectTransportPanel(page: Page) {
  197 |   return page.locator('.recording-transport__controls').evaluate((element) => {
  198 |     const rect = element.getBoundingClientRect()
  199 |     return {
  200 |       top: Math.round(rect.top * 100) / 100,
  201 |       bottom: Math.round(rect.bottom * 100) / 100,
  202 |       height: Math.round(rect.height * 100) / 100,
  203 |       position: getComputedStyle(element).position,
  204 |       viewportHeight: window.innerHeight,
  205 |       scrollY: Math.round(window.scrollY * 100) / 100,
  206 |     }
  207 |   })
  208 | }
  209 | 
  210 | test('recording transport stays in normal desktop flow and clears the RU phone stage', async ({ page, baseURL }, testInfo) => {
  211 |   test.setTimeout(180_000)
  212 |   page.setDefaultTimeout(30_000)
  213 |   await page.setViewportSize({ width: 1440, height: 900 })
  214 |   const diagnostics = await installBrowserDiagnostics(page, baseURL ?? 'http://127.0.0.1:4173')
  215 | 
  216 |   const credentials = newE2ECredentials('recording-viewport')
  217 |   const code = await startRegistrationFromLanding(page, credentials)
  218 |   await completeVisibleRegistration(page, code)
  219 |   await page.reload()
  220 |   await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
  221 |   await uploadKnownSourceThroughUi(page)
  222 |   await setMillisecondSelectionAndQuote(page)
  223 |   await page.getByRole('button', { name: 'Process for 9 credits', exact: true }).click()
  224 |   await expect(page.getByRole('heading', { name: 'Check your microphone', exact: true })).toBeVisible()
  225 |   await continueThroughRecordingEntryGate(page)
  226 |   await expect(page.locator('.recording-transport__timeline')).toBeVisible()
  227 |   await expect(page.locator('.recording-transport__controls')).toBeVisible()
  228 |   await expect(page.locator('.recording-transport__recording-note')).toBeVisible()
  229 | 
  230 |   await page.evaluate(() => window.scrollTo(0, 0))
  231 |   const desktop = await inspectRecordingViewport(page)
  232 |   await saveScreenshot(page, testInfo, 'recording-en-1440x900.png')
  233 | 
  234 |   await page.setViewportSize({ width: 1440, height: 700 })
  235 |   await page.evaluate(() => window.scrollTo(0, 0))
  236 |   const shortDesktop = await inspectRecordingViewport(page)
> 237 |   expect(shortDesktop.panel?.position).toBe('static')
      |                                        ^ Error: expect(received).toBe(expected) // Object.is equality
  238 |   await saveScreenshot(page, testInfo, 'recording-en-1440x700.png')
  239 |   const shortDesktopPanel = page.locator('.recording-transport__controls')
  240 |   await shortDesktopPanel.scrollIntoViewIfNeeded()
  241 |   const shortDesktopScrolled = await inspectRecordingViewport(page)
  242 |   const shortDesktopActions = await shortDesktopPanel.locator('button').evaluateAll((buttons) => buttons.map((button) => {
  243 |     const rect = button.getBoundingClientRect()
  244 |     const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
  245 |     return {
  246 |       accessibleName: button.getAttribute('aria-label')?.trim() || button.textContent?.trim() || '',
  247 |       fullyVisible: rect.left >= 0 && rect.top >= 0 && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight,
  248 |       centerReceivesPointer: target === button || Boolean(target && button.contains(target)),
  249 |     }
  250 |   }))
  251 |   await saveScreenshot(page, testInfo, 'recording-en-1440x700-scrolled.png')
  252 | 
  253 |   await page.getByLabel('Language').selectOption({ label: 'RU' })
  254 |   await expect(page.getByRole('heading', { name: 'Запишите свою реплику', exact: true })).toBeVisible()
  255 |   await expect(page.locator('.recording-transport__controls')).toBeVisible()
  256 |   await page.setViewportSize({ width: 390, height: 844 })
  257 |   await page.evaluate(() => window.scrollTo(0, 0))
  258 |   await expect(page.locator('.recording-transport__recording-note')).toBeVisible()
  259 |   const phone = await inspectRecordingViewport(page)
  260 |   await saveScreenshot(page, testInfo, 'recording-ru-390x844.png')
  261 | 
  262 |   await page.setViewportSize({ width: 1440, height: 900 })
  263 |   await page.getByRole('combobox', { name: /Language|Язык/ }).selectOption({ label: 'EN' })
  264 |   await expect(page.getByRole('heading', { name: 'Record your voice', exact: true })).toBeVisible()
  265 |   const captureAction = page.locator('.recording-transport__actions button').first()
  266 |   await expect(captureAction).toBeEnabled()
  267 |   await captureAction.click()
  268 |   await expect(page.locator('.recording-screen__capture-status progress')).toBeVisible({ timeout: 5_000 })
  269 |   await page.evaluate(() => window.scrollTo(0, 0))
  270 |   const capturing = await inspectRecordingViewport(page)
  271 |   await saveScreenshot(page, testInfo, 'recording-en-capturing-1440x900.png')
  272 |   await expect(page.locator('.recording-screen__take')).toBeVisible({ timeout: 20_000 })
  273 |   await page.evaluate(() => window.scrollTo(0, 0))
  274 |   const candidate = await inspectRecordingViewport(page)
  275 |   await saveScreenshot(page, testInfo, 'recording-en-candidate-1440x900.png')
  276 | 
  277 |   const timing = await page.locator('.recording-screen__timing').innerText()
  278 |   const sourceWindow = timing.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*s/)
  279 |   expect(sourceWindow, 'visible fixed recording window').not.toBeNull()
  280 |   const sourceWindowStart = Number(sourceWindow?.[1])
  281 |   const sourceWindowEnd = Number(sourceWindow?.[2])
  282 |   const sourceMode = page.getByRole('button', { name: 'Original', exact: true })
  283 |   const recordingMode = page.getByRole('button', { name: 'My recording', exact: true })
  284 |   const playButton = page.getByRole('button', { name: 'Play', exact: true })
  285 |   const pauseButton = page.getByRole('button', { name: 'Pause', exact: true })
  286 |   const seek = page.locator('.recording-transport__seek')
  287 |   const audio = page.locator('.recording-screen__stage audio')
  288 | 
  289 |   await expect(recordingMode).toBeEnabled()
  290 |   await recordingMode.click()
  291 |   await expect(recordingMode).toHaveAttribute('aria-pressed', 'true')
  292 |   await expect.poll(async () => Math.abs((await readMediaState(page)).videoTime - sourceWindowStart)).toBeLessThan(0.06)
  293 |   await expect.poll(async () => audio.evaluate((element) => (element as HTMLAudioElement).readyState)).toBeGreaterThanOrEqual(1)
  294 |   const recordingSource = await audio.getAttribute('src')
  295 |   expect(recordingSource).toMatch(/^blob:/)
  296 |   expect(await audio.evaluate((element) => (element as HTMLAudioElement).hidden)).toBe(true)
  297 |   const recordingWaveform = await page.locator('.recording-transport__bar').evaluateAll((bars) =>
  298 |     bars.map((bar) => Number.parseFloat((bar as HTMLElement).style.height)),
  299 |   )
  300 |   expect(recordingWaveform.length).toBeGreaterThan(0)
  301 |   expect(await page.locator('.recording-transport__waveform-note').count()).toBe(0)
  302 | 
  303 |   await sourceMode.click()
  304 |   await expect(sourceMode).toHaveAttribute('aria-pressed', 'true')
  305 |   await expect.poll(async () => {
  306 |     const media = await readMediaState(page)
  307 |     return Math.abs(media.videoTime - sourceWindowStart) < 0.06 && media.videoPaused && media.audioPaused
  308 |   }).toBe(true)
  309 |   const pausedSourceSwitch = await readMediaState(page)
  310 | 
  311 |   await playButton.click()
  312 |   await expect.poll(async () => (await readMediaState(page)).videoTime > sourceWindowStart + 0.08).toBe(true)
  313 |   await pauseButton.click()
  314 |   await expect.poll(async () => {
  315 |     const media = await readMediaState(page)
  316 |     return media.videoPaused && media.audioPaused
  317 |   }).toBe(true)
  318 |   const sourceBeforeScrub = await readMediaState(page)
  319 |   await seek.focus()
  320 |   await seek.press('ArrowRight')
  321 |   await expect.poll(async () => (await readMediaState(page)).videoTime > sourceBeforeScrub.videoTime + 0.05).toBe(true)
  322 |   const sourceAfterScrub = await readMediaState(page)
  323 |   expect(sourceAfterScrub.videoTime).toBeLessThan(sourceWindowEnd)
  324 | 
  325 |   await recordingMode.click()
  326 |   await expect.poll(async () => {
  327 |     const media = await readMediaState(page)
  328 |     return Math.abs(media.videoTime - sourceWindowStart) < 0.06
  329 |       && Math.abs(media.audioTime) < 0.06
  330 |       && media.videoPaused
  331 |       && media.audioPaused
  332 |   }).toBe(true)
  333 |   const pausedRecordingSwitch = await readMediaState(page)
  334 | 
  335 |   await playButton.focus()
  336 |   await expect(playButton).toBeFocused()
  337 |   const playGlyph = await capturePlaybackGlyph(page, testInfo, 'Play')
```