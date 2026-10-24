# Processing screen browser evidence

Captured 2026-10-23 22:43–22:44 UTC (2026-10-24 in Asia/Qyzylorda) from revision `35d122949ad0e07a7e365bcbd4c1ec69202796c3`, branch `main`, in a shared dirty worktree. The browser fixture mounts the real `ProcessingScreen` with the current app shell, styles, fonts, and a typed injected `Services` implementation. Every fixture fact is synthetic; the captures do not claim live service or queue behavior.

## Browser coverage

Command, from `frontend/`:

```powershell
npx.cmd playwright test --config=playwright.processing.config.ts
```

Result: **52 passed** in 1.3 minutes, one worker, isolated Vite port 4289. The matrix covers queued, running without trusted progress, running at 48%, failed retry availability, initial zero-turn completion, and zero-turn completion preserving a prior preparation. Those states render in English and Russian at desktop and 390×844 phone sizes. Additional cases cover both sides of the 767/768px breakpoint, cancellation quote display, expired quote refresh and separate confirmation, pending and unresolved cancellation, keyboard dialog containment/focus return, and quote-load failures with `same-operation`, `reconcile-first`, and `none` retry directives. After adding the cancellation-failure → Stay focus-return assertion to the two existing keyboard cases, the focused English/Russian keyboard run passed **2/2**; the full matrix was not repeated because only that test flow changed and the Processing product files remained frozen at the hashes below.

The quote-recovery cases verify that `same-operation` retries with the original operation ID, `reconcile-first` resolves before retrying that same ID, and `none` provides no retry. Neither successful recovery sends a cancellation command: each requires a separate explicit confirmation, which uses the newly returned quote ID. The focus regression requires Escape to return focus to the connected Cancel preparation button. It does not restore focus after authoritative navigation removes the opener.

The full matrix wrote 74 screenshot metric records to `metrics-after.jsonl`: 31 desktop, 35 phone, four at 767px, and four at 768px. The follow-up keyboard probe wrote six additional records to `metrics-final-focus-probe.jsonl`. Every record marks `syntheticServiceFactsOnly: true`, `backendOrQueueCalled: false`, and `mediaOrMicrophoneUsed: false`. All records loaded both Mabry Pro faces; none overflowed horizontally or reported an overflowing element. Every visible 390px phone button remained at least 48px high. Rendered progress bars measured 4px and dialogs measured 10px border radius.

The RU zero-turn retry button at 390×844 measures 358×50px and wraps its long label inside the button. Before the icon correction, Chromium measured its arrow SVG at **11.75×16px**, with `flex-shrink: 1`; the button text caused the width loss. After the scoped phone-state fix, the same rendered SVG measures **16×16px**, with `flex-shrink: 0`. The document remains 390px wide with no horizontal overflow. The final screenshot is `after/zero-turn-initial-ru-phone.png`; the before-state overflow screenshot is `baseline-overflow-detail/zero-turn-initial-ru-phone.png`.

The final Processing captures were visually inspected, including `after/queued-en-desktop.png`, `after/running-known-en-desktop.png`, `after/running-unknown-ru-phone.png`, `after/cancellation-expired-warning-ru-phone.png`, `after/cancellation-failure-ru-phone.png`, `after/cancellation-pending-ru-phone.png`, `after/cancellation-unknown-en-desktop.png`, the same-operation and reconcile-first failure/recovery captures in English and Russian, `after/quote-no-retry-ru-phone.png`, `after/zero-turn-initial-ru-phone.png`, `after/zero-turn-prior-ru-phone.png`, and `after/keyboard-dialog-focus-ru-phone.png`. The phone dialog content fits, error placement remains readable, confirmation stays separate from quote loading, the Russian retry label wraps without clipping, and the focus ring is visible on the focused dialog control.

## Reference mapping

| UI area | Adopted reference | Rendered mapping |
| --- | --- | --- |
| Progress tracker | `_docs/evidence/affect-ui-clean-light/source/components/progress-tracker/Clean/progress-tracker-clean.md.txt`, with its `Clean/Light/01-initial.png` and `03-progress-updated.png` states | The Processing progress track now measures 4px, matching the current token; its pre-fix rendered height was 8px. |
| Buttons | `_docs/evidence/affect-ui-clean-light/source/components/button/Clean/button-clean.md.txt`, with `Clean/Light/01-initial.png` and `03-loading.png` | Current button treatment and 48px phone target are retained. The long Russian CTA wraps; its outlined Lucide arrow remains a 16×16px box. |
| Floating cancellation dialog | `_docs/frontend-flows/design-tokens.md` and the Clean/Light adoption contract; no directly matching Clean dialog capture exists | Dialog radius is 10px per the adopted floating-surface token; pre-fix rendered radius was 14px. No other screen’s dialog styling was changed. |
| Typography | Current frontend token and app font assets | Mabry Pro regular and medium WOFF2 resources loaded and were checked before capture. |

Clean Markdown and matching Light PNG references were visually inspected. Source SHA-256 values:

- Progress Clean Markdown: `2FEB6AD5D0CFEA609D6DA0ABAFDA435BADA310A98F23DA6053BAEA83C58C3575`
- Progress Light initial: `1F9E751BFEB4821CA59F1B65323B6D387737E94BCEF3B1626F992998102D9B3E`
- Progress Light updated: `AD50CC320990FA82C44C49453A8D2BDEC2BB6A67ED4333036E9A7958FD2C07ED`
- Button Clean Markdown: `87E82CD57239270F22C106C40E77D005E310F7AA7A6EDDBFCA0019568B9BD5E6`
- Button Light initial: `11FDC40389E7A7C18BFA7BE5F2AFE7A08CE3486AA9CBE0199D3CEC2D799881C6`
- Button Light loading: `E19747332E2CA13BB86A4B9D22C3D372434C2A857EABD18775E3AD15B12C1D7A`
- Design tokens: `10F2753E82F4DB46003EEE25B866DD73ABA0240FF3624BCDD01FA32511F278E8`

## Changes and verification

The bounded Processing changes are in `frontend/src/features/processing/ProcessingScreen.tsx` and `ProcessingScreen.css`. They preserve retry directives for cancellation quote loading, reconcile the existing operation before a reconcile-first retry, retain a separate explicit confirmation step, return dialog focus to the live opener on dismissal, align the progress and dialog measurements to the adopted references, wrap the long phone CTA, and prevent its icon from shrinking.

Focused verification:

- `npx.cmd playwright test --config=playwright.processing.config.ts` — **52 passed**.
- `npx.cmd playwright test --config=playwright.processing.config.ts --grep 'zero-turn-initial ru phone'` — **1 passed**; captured the 16×16px icon metric.
- `npx.cmd playwright test --config=playwright.processing.config.ts --grep 'keyboard focus'` — **2 passed** after the test-only failure → Stay focus-return extension. The added screenshots are `final-focus-probe/keyboard-cancellation-failure-en-phone.png` and `final-focus-probe/keyboard-cancellation-failure-ru-phone.png`.
- `npx.cmd oxlint e2e/processing-visual.spec.ts e2e/harness/processing.tsx` — passed.
- `npx.cmd tsc --ignoreConfig --noEmit --target ES2023 --lib ES2023,DOM --module ESNext --moduleResolution Bundler --jsx react-jsx --strict --skipLibCheck --verbatimModuleSyntax --moduleDetection force --erasableSyntaxOnly --noUnusedLocals --noUnusedParameters --types node,@playwright/test,vite/client src/features/processing/ProcessingScreen.tsx e2e/processing-visual.spec.ts e2e/harness/processing.tsx` — passed.
- `npm.cmd run typecheck` — the first attempt during this slice reported an unrelated unused `AccountSnapshot` import at `tests/account-linking/AccountLinkingScreen.test.tsx(6,40)`; that file was left untouched. The root later reported the integrated frontend build passing after the Processing product freeze.

The screenshots are rendered component evidence with typed synthetic facts. They do not verify a real backend, queue, microphone, or audio path. The later integrated build result is the root orchestrator's check, separate from this browser capture run.

## Artifact hashes

SHA-256 at the final Processing freeze:

| Artifact | SHA-256 |
| --- | --- |
| `frontend/src/features/processing/ProcessingScreen.tsx` | `FA61A3AFE3EBFFF0BA875610CF209C50F11BC8687EF28899DA29271D4F7B846B` |
| `frontend/src/features/processing/ProcessingScreen.css` | `4F76C3F3003F2282D061AB855DDFF9453E88E8E532485733D6F14303749B12DF` |
| `frontend/e2e/processing-visual.spec.ts`, full 52-case matrix | `9D5CD5FEFC30A447E8DCF08998116AD2DA7C7E7F2335990F9C4189C164FB27E9` |
| `frontend/e2e/processing-visual.spec.ts`, final keyboard extension | `EB689723BB514AB294462589A2AFBBF2C1EBF6041E6B0B9880248B37C98E5E91` |
| `frontend/e2e/harness/processing.tsx` | `93D3208EC85EC85A02D450A3DCFD36D8306B61FD5FA6283C4E213207F224371C` |
| `frontend/e2e/harness/processing.html` | `2F6696F30507F5461658F0863BF2295D935CDFB9279CABCF1826DB99940BDB20` |
| `frontend/playwright.processing.config.ts` | `5191DE2FAB87B0F66116783FC80F417F9C80A6DB9A8FFDC4333F6ED5D681793B` |
| `metrics-after.jsonl` | `1815F8670A696D79BA74111783075CE4A10397D9D4D414BE1D5F52E36B2A095F` |
| `metrics-icon-probe.jsonl` | `01DF93AF521CFF00700CCB2AC21F9B0A2D06E813E543A89A6B50CD0243542C66` |
| `metrics-final-focus-probe.jsonl` | `AB400D686CD221DCFBDA9F299A4A52B8EA013B8185EF21D33186DB19B894733F` |
| Before overflow metric, `metrics-baseline-overflow-detail.jsonl` | `74CC7EACA92C876BF3D25261B7C44DF70AAF0AD111AA24A39435D06494E452BF` |
| Final `after/zero-turn-initial-ru-phone.png` | `92FCCBB3185D32F4F9677485504431796B77803CE0F775D04FDBC5D8571E80B3` |
| Before `baseline-overflow-detail/zero-turn-initial-ru-phone.png` | `50793B8B17471153439D558C39D32D455908E1DD4D641FC68A979DD7812D3561` |
| Final `final-focus-probe/keyboard-cancellation-failure-en-phone.png` | `6AEDF30AEDBE656BEC737FCC3321C842C3F1FD75050825E79C5B1C0AC2CC77C6` |
| Final `final-focus-probe/keyboard-cancellation-failure-ru-phone.png` | `8D30D6F2DA374C07FF5E58FF43F48371501F622CB0C2EC0D374AC15AD7A4019E` |
