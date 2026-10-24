# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shell-evidence.spec.ts >> captures the mounted landing shell in desktop English and phone Russian
- Location: e2e\shell-evidence.spec.ts:7:1

# Error details

```
Error: Phone controls below 48px: [{"tag":"select","label":"Язык","rect":{"x":0,"y":0,"width":0,"height":0},"client":{"width":0,"height":0},"scroll":{"width":0,"height":0},"overflow":{"x":"clip","y":"clip"},"fontFamily":"\"Mabry Pro\", sans-serif","fontSize":"12px","lineHeight":"16px","whiteSpace":"pre","textFits":true}]

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 29

- Array []
+ Array [
+   Object {
+     "client": Object {
+       "height": 0,
+       "width": 0,
+     },
+     "fontFamily": "\"Mabry Pro\", sans-serif",
+     "fontSize": "12px",
+     "label": "Язык",
+     "lineHeight": "16px",
+     "overflow": Object {
+       "x": "clip",
+       "y": "clip",
+     },
+     "rect": Object {
+       "height": 0,
+       "width": 0,
+       "x": 0,
+       "y": 0,
+     },
+     "scroll": Object {
+       "height": 0,
+       "width": 0,
+     },
+     "tag": "select",
+     "textFits": true,
+     "whiteSpace": "pre",
+   },
+ ]
```

# Page snapshot

```yaml
- generic [ref=f5e3]:
  - link "Перейти к содержимому" [ref=f5e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f5e5]:
    - generic [ref=f5e6]:
      - link "Dubbed — Главная" [ref=f5e7] [cursor=pointer]:
        - /url: /
        - generic [ref=f5e8]: Dubbed
      - generic [ref=f5e9]:
        - generic [ref=f5e10]:
          - generic [ref=f5e11]: Кредиты
          - strong [ref=f5e12]: "120"
        - button "Открыть навигацию" [ref=f5e13] [cursor=pointer]
  - main [ref=f5e15]:
    - region [ref=f5e17]:
      - generic [ref=f5e18]:
        - generic [ref=f5e19]:
          - heading "Проверьте почту" [level=1] [ref=f5e20]
          - paragraph [ref=f5e21]: Введите шестизначный код сброса для auth-layout-1792798780264@example.test.
        - generic [ref=f5e23]:
          - status [ref=f5e24]: Если аккаунт с таким email существует, мы отправили код.
          - paragraph [ref=f5e25]: Введите шестизначный код сброса для auth-layout-1792798780264@example.test.
          - status [ref=f5e26]: "Локальный код-мок: 305222. Письмо не отправлялось."
          - generic [ref=f5e27]:
            - generic [ref=f5e28]: 6-значный код сброса
            - generic [ref=f5e29]:
              - generic [ref=f5e33]: —
              - textbox "6-значный код сброса" [ref=f5e38]
          - status [ref=f5e39]: Повторный запрос доступен через 1:01
          - generic [ref=f5e40]:
            - button "Отправить код ещё раз" [disabled] [ref=f5e41]
            - paragraph [ref=f5e42]:
              - link "Вернуться ко входу" [ref=f5e43] [cursor=pointer]:
                - /url: /sign-in
```

# Test source

```ts
  275 |   const mobileMenu = page.getByRole('dialog')
  276 |   await expect(mobileMenu).toBeVisible()
  277 |   await expect(mobileMenu.locator('.sheet-close')).toBeFocused()
  278 |   const mobileMenuMetrics = await mobileMenu.evaluate((dialog) => {
  279 |     const rect = dialog.getBoundingClientRect()
  280 |     const nav = dialog.querySelector<HTMLElement>('.mobile-nav')
  281 |     if (!nav) throw new Error('The signed-in mobile navigation is missing.')
  282 |     const links = [...nav.querySelectorAll<HTMLElement>('a, button')]
  283 |     return {
  284 |       viewport: { width: innerWidth, scrollWidth: document.documentElement.scrollWidth },
  285 |       dialog: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
  286 |       nav: { clientWidth: nav.clientWidth, scrollWidth: nav.scrollWidth },
  287 |       targetHeights: links.map((link) => link.getBoundingClientRect().height),
  288 |       closeTargetHeight: dialog.querySelector('.sheet-close')?.getBoundingClientRect().height ?? 0,
  289 |     }
  290 |   })
  291 |   const menuIcon = await page.locator('.mobile-menu-trigger svg').evaluate((svg) => {
  292 |     const rect = svg.getBoundingClientRect()
  293 |     return {
  294 |       viewBox: svg.getAttribute('viewBox'),
  295 |       width: rect.width,
  296 |       height: rect.height,
  297 |       fill: svg.getAttribute('fill'),
  298 |       stroke: svg.getAttribute('stroke'),
  299 |       strokeWidth: svg.getAttribute('stroke-width'),
  300 |       strokeLinecap: svg.getAttribute('stroke-linecap'),
  301 |       strokeLinejoin: svg.getAttribute('stroke-linejoin'),
  302 |       ariaHidden: svg.getAttribute('aria-hidden'),
  303 |     }
  304 |   })
  305 |   const closeIcon = await mobileMenu.locator('.sheet-close svg').evaluate((svg) => {
  306 |     const rect = svg.getBoundingClientRect()
  307 |     return {
  308 |       viewBox: svg.getAttribute('viewBox'),
  309 |       width: rect.width,
  310 |       height: rect.height,
  311 |       fill: svg.getAttribute('fill'),
  312 |       stroke: svg.getAttribute('stroke'),
  313 |       strokeWidth: svg.getAttribute('stroke-width'),
  314 |       strokeLinecap: svg.getAttribute('stroke-linecap'),
  315 |       strokeLinejoin: svg.getAttribute('stroke-linejoin'),
  316 |       ariaHidden: svg.getAttribute('aria-hidden'),
  317 |     }
  318 |   })
  319 |   for (const icon of [menuIcon, closeIcon]) {
  320 |     expect(icon.viewBox).toBe('0 0 24 24')
  321 |     expect(icon.fill).toBe('none')
  322 |     expect(icon.stroke).toBe('currentColor')
  323 |     expect(icon.strokeWidth).toBe('1.1')
  324 |     expect(icon.strokeLinecap).toBe('round')
  325 |     expect(icon.strokeLinejoin).toBe('round')
  326 |     expect(icon.ariaHidden).toBe('true')
  327 |   }
  328 |   expect(mobileMenuMetrics.viewport.scrollWidth).toBeLessThanOrEqual(390)
  329 |   expect(mobileMenuMetrics.nav.scrollWidth).toBeLessThanOrEqual(mobileMenuMetrics.nav.clientWidth)
  330 |   expect(mobileMenuMetrics.targetHeights.every((height) => height >= 48)).toBe(true)
  331 |   expect(mobileMenuMetrics.closeTargetHeight).toBeGreaterThanOrEqual(48)
  332 |   measurements.mobileMenu390English = { ...mobileMenuMetrics, triggerHeight: mobileMenuTriggerHeight }
  333 |   measurements.mobileMenuIcons390English = { menu: menuIcon, close: closeIcon }
  334 |   await page.screenshot({
  335 |     path: resolve(evidenceDirectory, 'shell-mobile-menu-en-390.png'),
  336 |     fullPage: true,
  337 |   })
  338 |   await page.keyboard.press('Escape')
  339 |   await expect(mobileMenu).toBeHidden()
  340 |   await expect(mobileMenuTrigger).toBeFocused()
  341 |   measurements.mobileMenuKeyboardDismissal = await mobileMenuTrigger.evaluate((trigger) => {
  342 |     const active = document.activeElement as HTMLElement | null
  343 |     return {
  344 |       closedByEscape: true,
  345 |       triggerRegainedFocus: active === trigger,
  346 |       activeElement: {
  347 |         tag: active?.tagName.toLowerCase() ?? null,
  348 |         ariaLabel: active?.getAttribute('aria-label') ?? null,
  349 |       },
  350 |     }
  351 |   })
  352 | 
  353 |   await page.goto('/reset-password')
  354 |   await page.getByRole('textbox', { name: 'Email' }).fill(auditEmail)
  355 |   await page.getByRole('button', { name: 'Send reset email' }).click()
  356 |   const resetCode = page.getByRole('textbox', { name: '6-digit reset code' })
  357 |   await expect(resetCode).toBeVisible()
  358 |   await setLocale(page, 'ru')
  359 |   await expect(page.getByRole('heading', { name: 'Проверьте почту' })).toBeVisible()
  360 |   const resendCountdown = page.getByRole('status').filter({
  361 |     hasText: /Повторный запрос доступен через/,
  362 |   })
  363 |   await expect(resendCountdown).toBeVisible()
  364 |   await expect(page.getByRole('button', { name: 'Отправить код ещё раз' })).toBeDisabled()
  365 | 
  366 |   for (const width of [768, 767, 390]) {
  367 |     await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
  368 |     const reset = await readAuthMetrics()
  369 |     measurements[`passwordResetCodeRu${width}`] = reset
  370 |     expect(reset.viewport.scrollWidth).toBeLessThanOrEqual(width)
  371 |     expect(reset.clippedControls).toEqual([])
  372 |     expect(reset.controls.filter((control) => control.tag === 'a' && !control.textFits)).toEqual([])
  373 |     if (width < 768) {
  374 |       const undersizedControls = reset.controls.filter((control) => control.rect.height < 48)
> 375 |       expect(undersizedControls, `Phone controls below 48px: ${JSON.stringify(undersizedControls)}`).toEqual([])
      |                                                                                                      ^ Error: Phone controls below 48px: [{"tag":"select","label":"Язык","rect":{"x":0,"y":0,"width":0,"height":0},"client":{"width":0,"height":0},"scroll":{"width":0,"height":0},"overflow":{"x":"clip","y":"clip"},"fontFamily":"\"Mabry Pro\", sans-serif","fontSize":"12px","lineHeight":"16px","whiteSpace":"pre","textFits":true}]
  376 |     }
  377 |     await page.screenshot({
  378 |       path: resolve(evidenceDirectory, `shell-password-reset-code-ru-${width}.png`),
  379 |       fullPage: true,
  380 |     })
  381 |   }
  382 | 
  383 |   writeFileSync(
  384 |     resolve(evidenceDirectory, 'shell-rendered-metrics.json'),
  385 |     `${JSON.stringify(measurements, null, 2)}\n`,
  386 |   )
  387 | })
  388 | 
```