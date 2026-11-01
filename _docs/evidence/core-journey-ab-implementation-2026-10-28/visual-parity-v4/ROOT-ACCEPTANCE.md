# Root acceptance — literal prototype presentation port

Date: 2026-10-30, Asia/Qyzylorda. Base HEAD `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`. Accepted locally within the owner's explicit request to copy both approved prototypes into the working frontend. This supersedes the earlier visual approximation acceptance, without rewriting its historical evidence.

Record and Result markup/CSS were ported from the frozen A/B prototype sources into React and bound to the existing real controllers. The independent v2 audit verified 426/426 source selector/declaration recipes; subsequent corrections removed competing legacy rules and restored their effective cascade. VP01–05 are resolved in the final independent review.

Evidence chain:

- `phase4/visual-parity-v2/handoff-2026-10-29/SOURCE-MAPPING.md`: prototype-to-React correspondence and adaptations.
- `integration-review/visual-parity-v3/REVIEW.md`: VP01–04 resolutions, 36/36 targeted A/B checks, short/phone/Russian/candidate/volume/finite Replay and nearby playback safety.
- `integration-review/visual-parity-v4/REVIEW.md`: actual native-capture-to-Result selector comparisons, 4/4 exact A/B short/phone pairs; sole final change is one CSS declaration.
- `visual-parity-v3/AUTHOR-HANDOFF-2026-10-30.md`: typecheck, lint, 17 unit tests, build and focused connected A/B / long-Russian tests, with raw runs and limitations.

Root final checks: all 47 entries in the reviewer's `source-hashes-end.json` matched the current filesystem with zero mismatches; preview returned HTTP 200. Root visually inspected paired A short Result and B phone Result screenshots in `integration-review/visual-parity-v4/route-1793301574611/`. Layout, controls and selector match; differing sample-ready disclosure is intentional and truthful. A/B route tabs were requested in the app. No broad suite was repeated for the final single-declaration correction.

The real source/take waveform samples differ from synthetic prototype samples. The app's Result is still an explicitly disclosed fixed illustrative sample, not a render of captured speech. Chrome fake input exercised actual native recording; physical microphones, backend rendering and live A/B allocation remain outside this acceptance. Pre-existing dirty work and frozen prototypes were preserved. No commit, push, GitHub mutation or deployment occurred.
