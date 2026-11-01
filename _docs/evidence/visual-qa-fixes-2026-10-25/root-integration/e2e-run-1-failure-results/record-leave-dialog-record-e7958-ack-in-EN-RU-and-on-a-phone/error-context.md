# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-leave-dialog.spec.ts >> recording leave choices stay in a readable full-width stack in EN, RU, and on a phone
- Location: e2e\record-leave-dialog.spec.ts:126:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "28px"
Received: "40px"
```

# Page snapshot

```yaml
- generic:
  - generic:
    - generic:
      - link [aria-hidden]:
        - /url: "#main-content"
        - text: Skip to content
      - banner:
        - generic:
          - link [aria-hidden]:
            - /url: /
            - generic: Dubbed
          - navigation [aria-hidden]:
            - link:
              - /url: /new
              - text: New dub
            - link:
              - /url: /projects
              - text: Projects
            - link:
              - /url: /credits
              - text: Credits
            - link:
              - /url: /account
              - text: Account
          - generic:
            - generic:
              - generic: Credits
              - strong: "111"
            - generic [aria-hidden]:
              - generic:
                - generic: Language
                - combobox
            - button [aria-hidden]: Sign out
      - main:
        - generic:
          - region "Record your voice":
            - generic [aria-hidden]:
              - generic:
                - heading [level=1]: Record your voice
                - generic:
                  - generic: source-dialogue
                  - generic: ·Record
                  - status: ·Draft saved. It has not been accepted as a take.
              - generic:
                - button: Projects
            - generic [aria-hidden]:
              - generic:
                - generic: Line 1 of 3
                - paragraph: A blue light is on.
                - paragraph: "Capture window: 0.75–3.18 s"
              - generic: "Accepted takes: 0 / 3"
            - region [aria-hidden]:
              - generic:
                - slider: "2400"
            - generic [aria-hidden]:
              - generic:
                - group:
                  - button [pressed]: Original
                  - button: My recording
                - button:
                  - generic: Play
                - status: 0:02 / 0:02
              - generic:
                - button: Record again
                - button [disabled]: Previous line
                - button: Next line
                - button: Microphone
            - generic [aria-hidden]:
              - generic: Original video volume
              - slider: "0.8"
            - generic: Recording status
            - region [aria-hidden]:
              - generic:
                - heading [level=2]: Current draft recording
                - generic: Draft saved. It has not been accepted as a take.
              - status: Recorded audio frames were decoded. Next line saves this take and continues.
            - paragraph [aria-hidden]: This prototype saves draft and take state through its local mock workspace. It does not produce a custom rendered performance.
            - region [aria-hidden]:
              - button: Process again
  - dialog [ref=f1e2]:
    - heading "Leave recording?" [level=2] [ref=f1e3]
    - paragraph [ref=f1e4]: Choose what to do with this line before leaving. Saving a draft does not accept it as a take.
    - generic [ref=f1e5]:
      - button "Save and leave" [ref=f1e6] [cursor=pointer]
      - button "Leave without saving" [ref=f1e7] [cursor=pointer]
      - button "Stay here" [active] [ref=f1e8] [cursor=pointer]
```

# Test source

```ts
  75  |         })(),
  76  |         withinDialog: (() => {
  77  |           const rect = button.getBoundingClientRect()
  78  |           const dialogRect = dialog.getBoundingClientRect()
  79  |           return rect.top >= dialogRect.top - 1 && rect.bottom <= dialogRect.bottom + 1
  80  |         })(),
  81  |       })),
  82  |     }
  83  |   })
  84  | }
  85  | 
  86  | async function capture(page: Page, testInfo: TestInfo, name: string) {
  87  |   const body = await page.screenshot({ fullPage: false })
  88  |   writeFileSync(resolve(evidenceDirectory, name), body)
  89  |   await testInfo.attach(name, { body, contentType: 'image/png' })
  90  | }
  91  | 
  92  | function expectFullWidthStack(measurement: Awaited<ReturnType<typeof inspectLeaveActions>>, minHeight: number) {
  93  |   expect(measurement.documentWidth).toBeLessThanOrEqual(measurement.viewportWidth)
  94  |   expect(measurement.actionGroup.scrollWidth).toBeLessThanOrEqual(measurement.actionGroup.clientWidth)
  95  |   expect(measurement.buttons).toHaveLength(3)
  96  |   for (let index = 0; index < measurement.buttons.length; index += 1) {
  97  |     const button = measurement.buttons[index]!
  98  |     expect(button.textFits, button.label).toBe(true)
  99  |     expect(button.withinActionGroup, button.label).toBe(true)
  100 |     expect(button.withinDialog, button.label).toBe(true)
  101 |     expect(button.width).toBeCloseTo(measurement.actionGroup.clientWidth, 0)
  102 |     expect(button.height).toBeGreaterThanOrEqual(minHeight)
  103 |     if (index > 0) {
  104 |       expect(button.top - measurement.buttons[index - 1]!.bottom).toBeGreaterThanOrEqual(7)
  105 |     }
  106 |   }
  107 | }
  108 | 
  109 | function expectPhoneFocusClearance(measurement: Awaited<ReturnType<typeof inspectLeaveActions>>) {
  110 |   const stay = measurement.buttons[2]!
  111 |   const ringInset = Number.parseFloat(stay.outlineWidth) + Number.parseFloat(stay.outlineOffset)
  112 | 
  113 |   expect(stay.focused).toBe(true)
  114 |   expect(stay.focusVisible).toBe(true)
  115 |   expect(stay.outlineStyle).toBe('solid')
  116 |   expect(Number.parseFloat(stay.outlineWidth)).toBeGreaterThanOrEqual(2)
  117 |   expect(Number.parseFloat(stay.outlineOffset)).toBeGreaterThanOrEqual(2)
  118 |   expect(measurement.viewportHeight - stay.bottom).toBeGreaterThanOrEqual(
  119 |     ringInset + measurement.safeAreaInsetBottom + 2,
  120 |   )
  121 |   expect(Number.parseFloat(measurement.dialog.paddingBottom)).toBeGreaterThanOrEqual(
  122 |     ringInset + measurement.safeAreaInsetBottom + 2,
  123 |   )
  124 | }
  125 | 
  126 | test('recording leave choices stay in a readable full-width stack in EN, RU, and on a phone', async ({ page }, testInfo) => {
  127 |   test.setTimeout(180_000)
  128 |   page.setDefaultTimeout(30_000)
  129 |   await page.setViewportSize({ width: 1440, height: 960 })
  130 | 
  131 |   const credentials = newE2ECredentials('record-leave-dialog')
  132 |   const code = await startRegistrationFromLanding(page, credentials)
  133 |   await completeVisibleRegistration(page, code)
  134 |   await page.reload()
  135 |   await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
  136 |   await uploadKnownSourceThroughUi(page)
  137 |   await setMillisecondSelectionAndQuote(page)
  138 |   await page.getByRole('button', { name: 'Process for 9 credits', exact: true }).click()
  139 |   await continueThroughRecordingEntryGate(page)
  140 | 
  141 |   await page.getByRole('button', { name: 'Record line', exact: true }).click()
  142 |   const draftNotice = page.getByText(
  143 |     'Recorded audio frames were decoded. Next line saves this take and continues.',
  144 |     { exact: true },
  145 |   )
  146 |   await expect(draftNotice).toBeVisible({ timeout: 30_000 })
  147 | 
  148 |   const landingLink = page.locator('.app-header .brand-link')
  149 |   await landingLink.click()
  150 |   const dialog = page.getByRole('dialog')
  151 |   await expect(dialog).toBeVisible()
  152 |   const stayEnglish = page.getByRole('button', { name: 'Stay here', exact: true })
  153 |   await expect(stayEnglish).toBeFocused()
  154 |   await page.keyboard.press('Shift+Tab')
  155 |   expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  156 |   await page.keyboard.press('Tab')
  157 |   await expect(stayEnglish).toBeFocused()
  158 |   const keyboardFocus = await stayEnglish.evaluate((element) => ({
  159 |     visible: element.matches(':focus-visible'),
  160 |     outlineStyle: getComputedStyle(element).outlineStyle,
  161 |     outlineWidth: getComputedStyle(element).outlineWidth,
  162 |   }))
  163 |   expect(keyboardFocus.visible).toBe(true)
  164 |   expect(keyboardFocus.outlineStyle).toBe('solid')
  165 |   expect(Number.parseFloat(keyboardFocus.outlineWidth)).toBeGreaterThanOrEqual(2)
  166 | 
  167 |   const desktopEnglish = await inspectLeaveActions(page)
  168 |   expect(desktopEnglish.buttons.map(({ label }) => label)).toEqual([
  169 |     'Save and leave',
  170 |     'Leave without saving',
  171 |     'Stay here',
  172 |   ])
  173 |   expectFullWidthStack(desktopEnglish, 28)
  174 |   for (const button of desktopEnglish.buttons) {
> 175 |     expect(button.minHeight).toBe('28px')
      |                              ^ Error: expect(received).toBe(expected) // Object.is equality
  176 |     expect(button.fontSize).toBe('13px')
  177 |     expect(button.lineHeight).toBe('20px')
  178 |   }
  179 |   await capture(page, testInfo, 'record-leave-dialog-en-1440-after.png')
  180 | 
  181 |   await page.keyboard.press('Escape')
  182 |   await expect(dialog).toBeHidden()
  183 |   await expect(landingLink).toBeFocused()
  184 |   await expect(page).toHaveURL(/\/projects\/[^/]+\/record$/)
  185 |   await expect(draftNotice).toBeVisible()
  186 | 
  187 |   await setLocale(page, 'ru')
  188 |   await landingLink.click()
  189 |   await expect(dialog).toBeVisible()
  190 |   await expect(page.getByRole('button', { name: 'Остаться', exact: true })).toBeFocused()
  191 |   const desktopRussian = await inspectLeaveActions(page)
  192 |   expect(desktopRussian.buttons.map(({ label }) => label)).toEqual([
  193 |     'Сохранить и выйти',
  194 |     'Выйти без сохранения',
  195 |     'Остаться',
  196 |   ])
  197 |   expectFullWidthStack(desktopRussian, 28)
  198 |   for (const button of desktopRussian.buttons) {
  199 |     expect(button.minHeight).toBe('28px')
  200 |     expect(button.fontSize).toBe('13px')
  201 |     expect(button.lineHeight).toBe('20px')
  202 |   }
  203 |   await capture(page, testInfo, 'record-leave-dialog-ru-1440-after.png')
  204 | 
  205 |   await page.keyboard.press('Escape')
  206 |   await expect(dialog).toBeHidden()
  207 |   await page.setViewportSize({ width: 390, height: 844 })
  208 |   await landingLink.click()
  209 |   await expect(dialog).toBeVisible()
  210 |   await expect(page.getByRole('button', { name: 'Остаться', exact: true })).toBeFocused()
  211 |   const phoneRussian = await inspectLeaveActions(page)
  212 |   expect(phoneRussian.buttons.map(({ label }) => label)).toEqual([
  213 |     'Сохранить и выйти',
  214 |     'Выйти без сохранения',
  215 |     'Остаться',
  216 |   ])
  217 |   expectFullWidthStack(phoneRussian, 48)
  218 |   for (const button of phoneRussian.buttons) {
  219 |     expect(button.minHeight).toBe('48px')
  220 |     expect(button.fontSize).toBe('16px')
  221 |     expect(button.lineHeight).toBe('24px')
  222 |   }
  223 |   expectPhoneFocusClearance(phoneRussian)
  224 |   await capture(page, testInfo, 'record-leave-dialog-ru-390-after.png')
  225 |   await page.getByRole('button', { name: 'Остаться', exact: true }).click()
  226 |   await expect(dialog).toBeHidden()
  227 |   await expect(page).toHaveURL(/\/projects\/[^/]+\/record$/)
  228 |   await expect(page.getByText(
  229 |     'Аудиокадры декодированы. Кнопка «Следующая реплика» сохранит дубль и продолжит.',
  230 |     { exact: true },
  231 |   )).toBeVisible()
  232 | 
  233 |   writeFileSync(resolve(evidenceDirectory, 'record-leave-dialog-layout-after.json'), JSON.stringify({
  234 |     adaptation: 'No direct Affect UI Dialog reference; derive the three-choice dialog from Clean BTN primary, secondary, and ghost controls, arranged as a full-width vertical stack while preserving source desktop density and the approved phone target exception.',
  235 |     reference: {
  236 |       cleanMarkdown: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/button-clean.md.txt',
  237 |       cleanLightPng: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/Light/01-initial.png',
  238 |       manifestSha256Verified: true,
  239 |     },
  240 |     desktopEnglish,
  241 |     desktopRussian,
  242 |     phoneRussian,
  243 |   }, null, 2))
  244 | })
  245 | 
```