# Issue 81 mixed pointer and keyboard verification

## Final run

- Captured: 2026-10-25T15:34:02.432Z
- Browser: Chromium 156.0.8078.4, viewport 390 × 844
- Source: decoded `portrait-long-source.mp4`, 540 × 960, 35.9591 seconds; range domain 0–35,959 ms with a 1 ms step
- Command: `node _docs/evidence/visual-qa-fixes-2026-10-25/issue-81/mixed-input-focus-after-fix/mixed-input-focus-probe.cjs`
- Result: pass. The focused native range has z-index 4; the transparent gesture surface has z-index 5 and receives hits at both overlapping thumb centers while `:focus-visible` is true.

## Interaction evidence

- At a 1,001 ms interval, keyboard focus and ArrowLeft moved the native start range from 12,000 to 11,999 ms. Both thumb-center hit points still resolved to the gesture surface.
- A pointer grip 4 px off the start thumb center moved 12 px away (11,999 → 10,737 ms) and back to its original x. The value returned exactly to 11,999 ms and the native start range remained focused.
- A pointer drag then moved the start range to 9,000 ms; ArrowLeft on the focused native range continued at exactly 1 ms (9,000 → 8,999 ms).
- The end range was independently keyboard-focused, dragged from 13,001 to 16,000 ms, and continued by exactly 1 ms with ArrowRight (16,000 → 16,001 ms).
- No Process button appeared and the browser reported no errors.
- Focused component tests: `npm.cmd test -- src/features/new-dub/NewDubScreen.test.tsx` — 1 file, 14 tests passed.
- The two native slider `aria-valuetext` values now use the existing localized range formatter. A focused RU assertion verifies `0.000 с` and `8.000 с`; this string-only follow-up did not change the pointer or keyboard handlers above.

## Artifacts

- `mixed-input-focus-probe-final.json` is the accepted final report.
- `portrait-35.96s-phone-390x844-keyboard-pointer-focus-final.png` shows the final native focused range.
- `mixed-input-focus-probe.json` and `portrait-35.96s-phone-390x844-keyboard-pointer-focus.png` are retained from the earlier focus/stack/keyboard run before the pointer round-trip correction.
- The original `phone-hit-probe-after-fix` report and screenshots remain unchanged as the historical phone hit-area proof.

## SHA-256

```text
NewDubScreen.tsx  60CF795FCC40092C7100110D80D9D9F5B78F4B7466F5D100F3A2D703AA7D01E7
NewDubScreen.css  B442AEDC3B53DC4AD49A2EAEEE71E2AF139C5631771A72A2AE08748300A566DE
NewDubScreen.test.tsx  42FC7C9C9841B03C4C6D25405D87E3D94315A48780084A3261AF923D50034880
mixed-input-focus-probe.cjs  F7C9E54AB60BEA15DA4C432396441CE69FF7BFBEAAB88ABFF3284D194AED1E25
mixed-input-focus-probe-final.json  DCD47A0B8FFA5BB939CD5FEC9D0CE593A7EB5E3A8F017AD7F965C945A9C9FF30
keyboard-pointer-focus screenshot  8AE536951D042EB9568D6712E129EF64584D00356A4012A1F136933339D476E3
```

No full suite or global typecheck was run for this bounded follow-up.
