# Independent integrated review — visual parity v4

**Verdict: PASS. VP-05 resolved. No remaining finding in this narrow review.** VP-01–04 and the 36 successful v3 runtime checks retain their recorded dispositions; this selector-only correction does not reopen that matrix.

Reviewed on 2026-10-30 Asia/Qyzylorda following the author's explicit `Ready for integrated frontend review — visual parity v4 / EDITS PAUSED` handoff. Product, frozen prototypes, canonical files and unrelated dirty artifacts remained read-only. No commit, push, GitHub or deployment action occurred. Reviewer writes are confined to this evidence directory.

## Actual-route confirmation

`node .../integration-review/visual-parity-v4/selector-route.cjs` completed **4/4 paired comparisons, zero browser errors** in isolated Chrome contexts. Each implementation context followed its actual Record route, captured/accepted three usable native fake-device Blobs, and reached the actual ready Result route. This did not use a production-class fixture or bypass Result rendering. Reference contexts loaded the frozen completed Result fixture; only the prototype lab strip and fixture credit were hidden.

| Layout | Viewport | Actual selector | Frozen selector | Result |
| --- | --- | --- | --- | --- |
| A | 1280×600 | 160.28125×44 | 160.28125×44 | PASS |
| B | 1280×600 | 160.28125×44 | 160.28125×44 | PASS |
| A | 390×844 | 166.3125×52 | 166.3125×52 | PASS |
| B | 390×844 | 166.3125×52 | 166.3125×52 | PASS |

Individual button widths/heights and the selector's position also match within 0.01 px. Both phone buttons retain 48 px height. The selector is borderless with no backdrop filter; no horizontal overflow occurred. Fonts and decoded video readiness were awaited, pages scrolled to top, focus cleared, and pointer moved away before screenshots. Paired screenshots were visually inspected. The truthful sample-ready wording/disclosure remains intentionally different from the prototype's rendered-dub claim.

Raw evidence: `route-1793301574611/browser.json`, eight full-page-view PNG captures, and unique A/B trace archives. Browser temporary files used `C:\Users\roman\AppData\Local\Temp`.

## Source boundary

All **47** entries from the v3 combined boundary match their expected current hashes before and after review; **46 remain unchanged** from v3 and the sole changed file is `frontend/src/styles/prototype-result.css`, current SHA-256 `F3CB56682F9D094C9808510A04F1A8BB47C8A5CFCC4F75CDA9CB02C0F607BD09`.

Removing only the inserted `min-width: 0` declaration from the current `.result-page .result-sources button` recipe reconstructs the exact reviewed v3 file hash `5D8F011A9AE88E1794CB1AD29BCA9BFE640DFBDA04ED62146FA36CB81364CAD1`. This proves the sole source delta without modifying the file. See `css-change-proof.json`, `source-hashes-start.json`, and `source-hashes-end.json`.

## Limits

This was the requested narrow actual-route selector recheck. The prior 36-check browser matrix, author static/unit checks, and earlier integration audit were not repeated. Chrome fake input exercises native capture APIs and yields actual Blobs; it does not establish physical microphone behavior. Result remains the disclosed fixed illustrative sample, not backend output rendered from accepted takes. No claim of deployment or publication is made. The author remained paused throughout this completed review.
