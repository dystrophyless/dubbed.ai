# Issue 81 phone hit-area verification

## Final run

- Captured: 2026-10-25T15:25:31.625Z
- Browser: Chromium 156.0.8078.4, viewport 390 × 844, touch enabled
- Source: uploaded `portrait-long-source.mp4`; a decoded 540 × 960 frame was presented. Media duration was 35.9591 seconds and the source timeline max was 35,959 ms.
- Command: `node _docs/evidence/visual-qa-fixes-2026-10-25/issue-81/phone-hit-probe-after-fix/phone-hit-probe-after-fix.cjs`
- Result: pass. The actual pointer target was the 48 px gesture surface, above the native 16 px range thumbs. Primary touch events reached the surface and were captured through pointer up/lost capture.

## Interaction evidence

- A same-thumb touch at 12,000 ms retained the 12,000–13,000 ms interval and did not show “Save section”.
- With the initial 1,000 ms interval, the start handle moved at a 20 px vertical offset (12,000 → 9,042 ms; 42 ms rounding on a 35,959 ms source axis).
- The end handle clamped exactly to 1,000 ms after the start at the center and at a 20 px offset. Both handles then moved independently from close positions.
- Requests beyond the valid start/end gap clamped to the exact 1,000 ms minimum. A full-source rail tap selected the nearest start boundary within one CSS pixel of the requested coordinate.
- The underlying project and operation counters were unchanged by pointer gestures: quote, quote operation, preparation, reservation, purchase, and processing start were all 0 before and after. No Process button appeared and the browser reported no errors.
- Focused component tests: `npm.cmd test -- src/features/new-dub/NewDubScreen.test.tsx` — 1 file, 12 tests passed.

## Artifacts

- `phone-hit-probe-after-fix.json` is the accepted final run with event-level coordinates, database counts, and browser errors.
- `portrait-35.96s-phone-390x844-minimum-interval.png` shows the source at the initial 1,000 ms interval.
- `portrait-35.96s-phone-390x844-nearest-rail-tap.png` shows the final interval after the nearest-boundary rail tap.
- `phone-hit-probe-after-fix.partial.json` is a retained intermediate diagnostic from probe tuning; it ended on a stale expected-duration assertion and is not the accepted result.

## SHA-256

```text
NewDubScreen.tsx  8F32F4DAF145DF3AA16216D8AB1C656115B296B34CCF844F25B9EE47C3BF4C8B
NewDubScreen.css  39ABF4553AD035CB3B55D0DC379BAD1138459A7F8CB4507042AE4B01B877BE9B
NewDubScreen.test.tsx  865C7A250593D066CFA05DCDC7D8F4627F87E3DD5F661560ED6645C6AC452BC4
phone-hit-probe-after-fix.cjs  8344D9E9F3D12525E501A80EFA8B586FD29051F70EC1427E02650D26BB270B75
phone-hit-probe-after-fix.json  3314A0C879F9871446FBF25FB11755A3A403EE50F69ADBE80E7C2F46DD818BB1
minimum-interval screenshot  A6BCDEE30E6B9795CD3507C8F393491106DFF147C2564AAA6492B2C88E250A92
nearest-rail-tap screenshot  6333DAC82220EBA3FB945B710956D197ECACE58754BEDFC4BD83A721CFD11D26
```

No full suite or global typecheck was run for this bounded fix.
