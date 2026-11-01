# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microphone-lifecycle.spec.ts >> a failed test can be retried, listened to locally, and its Blob is revoked on exit
- Location: e2e\microphone-lifecycle.spec.ts:181:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('alert')
Expected substring: "The browser could not finish the local microphone test."
Received string:    "This browser cannot record a local microphone test. You can continue without it."
Timeout: 5000ms

Call log:
  - Expect "toContainText" getByRole('alert') with timeout 5000ms
  - waiting for getByRole('alert')
    14 × locator resolved to <p role="alert" class="microphone-check__error">This browser cannot record a local microphone tes…</p>
       - unexpected value "This browser cannot record a local microphone test. You can continue without it."

```

```yaml
- alert: This browser cannot record a local microphone test. You can continue without it.
```

# Test source

```ts
  100 |     Object.defineProperty(URL, 'createObjectURL', {
  101 |       configurable: true,
  102 |       value: (object: Blob | MediaSource) => {
  103 |         const url = nativeCreateObjectURL(object)
  104 |         lifecycle.objectUrlsCreated.push(url)
  105 |         return url
  106 |       },
  107 |     })
  108 |     Object.defineProperty(URL, 'revokeObjectURL', {
  109 |       configurable: true,
  110 |       value: (url: string) => {
  111 |         lifecycle.objectUrlsRevoked.push(url)
  112 |         nativeRevokeObjectURL(url)
  113 |       },
  114 |     })
  115 | 
  116 |     const storePrototype = IDBObjectStore.prototype as unknown as Record<string, unknown>
  117 |     for (const method of ['put', 'add', 'delete', 'clear'] as const) {
  118 |       const original = storePrototype[method] as (...args: unknown[]) => unknown
  119 |       Object.defineProperty(IDBObjectStore.prototype, method, {
  120 |         configurable: true,
  121 |         writable: true,
  122 |         value: function (this: IDBObjectStore, ...args: unknown[]) {
  123 |           if (this.transaction.mode === 'readwrite') lifecycle.idbWrites += 1
  124 |           return original.apply(this, args)
  125 |         },
  126 |       })
  127 |     }
  128 |   })
  129 | }
  130 | 
  131 | async function registerAndOpenMicrophone(page: Page, label: string): Promise<void> {
  132 |   const credentials = newE2ECredentials(label)
  133 |   const code = await startRegistrationFromLanding(page, credentials)
  134 |   await completeVisibleRegistration(page, code)
  135 |   await page.goto('/microphone?origin=new')
  136 |   await expect(page.getByRole('heading', { name: 'Check your microphone' })).toBeVisible()
  137 |   await expect(page.getByRole('button', { name: 'Record test', exact: true })).toBeDisabled()
  138 |   await expect(page.getByRole('button', { name: 'Continue to New Dub', exact: true })).toBeDisabled()
  139 |   await expect(page.locator('audio')).toHaveCount(0)
  140 |   await page.getByRole('button', { name: 'Allow microphone access', exact: true }).click()
  141 |   await expect(page.getByText(/The browser is providing a live microphone track\./)).toBeVisible()
  142 | }
  143 | 
  144 | async function readLifecycle(page: Page): Promise<MicrophoneLifecycleState> {
  145 |   return page.evaluate(() => {
  146 |     if (!window.__microphoneLifecycle) throw new Error('Microphone lifecycle instrumentation is missing.')
  147 |     return {
  148 |       ...window.__microphoneLifecycle,
  149 |       objectUrlsCreated: [...window.__microphoneLifecycle.objectUrlsCreated],
  150 |       objectUrlsRevoked: [...window.__microphoneLifecycle.objectUrlsRevoked],
  151 |     }
  152 |   })
  153 | }
  154 | 
  155 | test('leaving during an active optional test cancels local capture and the next visit is clean', async ({ page }) => {
  156 |   await instrumentMicrophoneLifecycle(page)
  157 |   await registerAndOpenMicrophone(page, 'microphone-active-exit')
  158 |   const writesBeforeTest = (await readLifecycle(page)).idbWrites
  159 | 
  160 |   await page.getByRole('button', { name: 'Record test', exact: true }).click()
  161 |   await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
  162 |   await expect.poll(async () => (await readLifecycle(page)).recorderStarts).toBe(1)
  163 |   await page.getByRole('button', { name: 'Continue to New Dub', exact: true }).click()
  164 |   await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
  165 | 
  166 |   const exited = await readLifecycle(page)
  167 |   expect(exited.recorderStops).toBeGreaterThan(0)
  168 |   expect(exited.trackStops).toBeGreaterThan(0)
  169 |   expect(exited.objectUrlsCreated).toEqual([])
  170 |   expect(exited.objectUrlsRevoked).toEqual([])
  171 |   expect(exited.idbWrites).toBe(writesBeforeTest)
  172 | 
  173 |   await page.goto('/microphone?origin=new')
  174 |   await expect(page.getByRole('heading', { name: 'Check your microphone' })).toBeVisible()
  175 |   await expect(page.getByRole('button', { name: 'Record test', exact: true })).toBeDisabled()
  176 |   await expect(page.getByRole('button', { name: 'Continue to New Dub', exact: true })).toBeDisabled()
  177 |   await expect(page.locator('audio')).toHaveCount(0)
  178 |   await expect(page.getByText('Your browser has not been asked for microphone access yet.')).toBeVisible()
  179 | })
  180 | 
  181 | test('a failed test can be retried, listened to locally, and its Blob is revoked on exit', async ({ page }) => {
  182 |   await instrumentMicrophoneLifecycle(page)
  183 |   await registerAndOpenMicrophone(page, 'microphone-failed-retry')
  184 |   const writesBeforeTest = (await readLifecycle(page)).idbWrites
  185 | 
  186 |   await page.evaluate(() => {
  187 |     const native = window.MediaRecorder
  188 |     window.__microphoneNativeRecorder = native
  189 |     window.MediaRecorder = class {
  190 |       static isTypeSupported(type: string) {
  191 |         return native.isTypeSupported(type)
  192 |       }
  193 | 
  194 |       constructor() {
  195 |         throw new DOMException('Synthetic local recorder failure.', 'NotSupportedError')
  196 |       }
  197 |     } as unknown as typeof MediaRecorder
  198 |   })
  199 |   await page.getByRole('button', { name: 'Record test', exact: true }).click()
> 200 |   await expect(page.getByRole('alert')).toContainText('The browser could not finish the local microphone test.')
      |                                         ^ Error: expect(locator).toContainText(expected) failed
  201 |   await expect(page.locator('audio')).toHaveCount(0)
  202 |   expect((await readLifecycle(page)).objectUrlsCreated).toEqual([])
  203 | 
  204 |   await page.evaluate(() => {
  205 |     if (!window.__microphoneNativeRecorder) throw new Error('Native fake-device recorder was not retained for the explicit retry.')
  206 |     window.MediaRecorder = window.__microphoneNativeRecorder
  207 |     delete window.__microphoneNativeRecorder
  208 |   })
  209 |   await page.getByRole('button', { name: 'Record test', exact: true }).click()
  210 |   await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
  211 |   await page.waitForTimeout(1_200)
  212 |   await page.getByRole('button', { name: 'Stop', exact: true }).click()
  213 | 
  214 |   const localAudio = page.getByLabel('Local test recording')
  215 |   await expect(localAudio).toBeVisible()
  216 |   await expect.poll(async () => (await readLifecycle(page)).objectUrlsCreated.length).toBe(1)
  217 |   await localAudio.evaluate(async (element) => {
  218 |     const audio = element as HTMLAudioElement
  219 |     audio.muted = true
  220 |     audio.volume = 0
  221 |     await audio.play()
  222 |   })
  223 |   await expect.poll(() => localAudio.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0)
  224 | 
  225 |   const beforeExit = await readLifecycle(page)
  226 |   expect(beforeExit.idbWrites).toBe(writesBeforeTest)
  227 |   expect(beforeExit.objectUrlsCreated).toHaveLength(1)
  228 |   expect(beforeExit.recorderStarts).toBe(1)
  229 |   expect(beforeExit.recorderStops).toBe(1)
  230 | 
  231 |   await page.getByRole('button', { name: 'Continue to New Dub', exact: true }).click()
  232 |   await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
  233 |   await expect.poll(async () => (await readLifecycle(page)).trackStops).toBeGreaterThan(0)
  234 |   const afterExit = await readLifecycle(page)
  235 |   expect(afterExit.objectUrlsRevoked).toEqual(beforeExit.objectUrlsCreated)
  236 |   expect(afterExit.idbWrites).toBe(writesBeforeTest)
  237 | 
  238 |   await page.goto('/microphone?origin=new')
  239 |   await expect(page.getByRole('heading', { name: 'Check your microphone' })).toBeVisible()
  240 |   await expect(page.getByRole('button', { name: 'Record test', exact: true })).toBeDisabled()
  241 |   await expect(page.locator('audio')).toHaveCount(0)
  242 |   await expect(page.getByText('Your browser has not been asked for microphone access yet.')).toBeVisible()
  243 | })
  244 | 
  245 | test('keyboard can play the local mic test and the input meter exposes numeric semantics', async ({ page, browser }) => {
  246 |   await page.setViewportSize({ width: 1440, height: 900 })
  247 |   await mkdir(microphoneProofDirectory, { recursive: true })
  248 |   await instrumentMicrophoneLifecycle(page)
  249 |   await registerAndOpenMicrophone(page, 'microphone-keyboard-listen')
  250 |   const writesBeforeTest = (await readLifecycle(page)).idbWrites
  251 | 
  252 |   const meter = page.getByRole('meter', { name: 'Microphone input level' })
  253 |   await expect(meter).toHaveAttribute('aria-valuemin', '0')
  254 |   await expect(meter).toHaveAttribute('aria-valuemax', '100')
  255 |   await expect(meter).toHaveAttribute('aria-valuenow', /^\d+$/)
  256 |   await expect(page.getByText('This local meter reports signal level only. It does not judge speech or readiness.')).toBeVisible()
  257 |   const meterValue = Number(await meter.getAttribute('aria-valuenow'))
  258 |   expect(Number.isInteger(meterValue)).toBe(true)
  259 |   expect(meterValue).toBeGreaterThanOrEqual(0)
  260 |   expect(meterValue).toBeLessThanOrEqual(100)
  261 |   const meterSemantics = await meter.evaluate((element) => ({
  262 |     role: element.getAttribute('role'),
  263 |     name: element.getAttribute('aria-label'),
  264 |     min: Number(element.getAttribute('aria-valuemin')),
  265 |     max: Number(element.getAttribute('aria-valuemax')),
  266 |     value: Number(element.getAttribute('aria-valuenow')),
  267 |     visibleMeaning: 'This local meter reports signal level only. It does not judge speech or readiness.',
  268 |   }))
  269 | 
  270 |   await page.getByRole('button', { name: 'Record test', exact: true }).click()
  271 |   await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
  272 |   await page.waitForTimeout(1_200)
  273 |   await page.getByRole('button', { name: 'Stop', exact: true }).click()
  274 | 
  275 |   const localAudio = page.getByLabel('Local test recording')
  276 |   await expect(localAudio).toBeVisible()
  277 |   await expect.poll(() => localAudio.evaluate((element) => (element as HTMLAudioElement).currentSrc.startsWith('blob:'))).toBe(true)
  278 |   await localAudio.evaluate((element) => {
  279 |     const audio = element as HTMLAudioElement
  280 |     audio.muted = true
  281 |     audio.volume = 0
  282 |   })
  283 | 
  284 |   const recordTestButton = page.getByRole('button', { name: 'Record test', exact: true })
  285 |   await recordTestButton.focus()
  286 |   await page.keyboard.press('Tab')
  287 |   await expect(localAudio).toBeFocused()
  288 |   await expect.poll(() => localAudio.evaluate((element) => (element as HTMLAudioElement).paused)).toBe(true)
  289 |   await page.keyboard.press('Space')
  290 |   await expect.poll(() => localAudio.evaluate((element) => !(element as HTMLAudioElement).paused)).toBe(true)
  291 |   await expect.poll(() => localAudio.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0.1)
  292 | 
  293 |   const playback = await localAudio.evaluate((element) => {
  294 |     const audio = element as HTMLAudioElement
  295 |     return {
  296 |       paused: audio.paused,
  297 |       currentTimeSeconds: audio.currentTime,
  298 |       durationSeconds: audio.duration,
  299 |       muted: audio.muted,
  300 |       volume: audio.volume,
```