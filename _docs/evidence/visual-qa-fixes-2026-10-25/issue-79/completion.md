# Issue 79 correction completion

## Scope and source boundary

Implemented the Result screen corrections for issue 79 only. Source changes are limited to:

- frontend/src/features/result/ResultScreen.tsx
- frontend/src/features/result/ResultScreen.css
- frontend/src/features/result/ResultScreen.test.tsx

The local browser harness and its output are under this issue evidence directory. Shared Button and App CSS work from issue 78 was consumed as-is. QA-79-06 is the shared sr-only fix owned by issue 78; this task verified its rendered behavior and did not edit shared CSS. No services, stores, adapters, other features, or GitHub issue state were changed.

The repository was already dirty with parallel task work. At HEAD 9d286621177200fdb5f61ef963d0b6818ae76774, the scoped status showed ResultScreen.tsx and ResultScreen.css modified, ResultScreen.test.tsx untracked, and this issue 79 evidence directory untracked. Other dirty paths were preserved. No commit or push was made.

## Behavior changed

- A first playback descriptor failure keeps the generation identity, displays recovery text and Retry playback, and reloads the same generation on retry without assembling or spending credits.
- A displayed older result is labeled Previous version throughout replacement assembly, with Watch new available when the new output is ready.
- A pending download remains readable and focusable with a busy announcement, while other generation actions remain available. Concurrent requests and retries retain their activation-time generation ID.
- The Download MP4 action is the prominent large action. It follows the video and uses the shared 44px desktop / 48px phone target. Return to recording follows it.
- Long Russian recovery labels wrap inside narrow phone content without horizontal overflow.
- Assembly and assembly failure reserve a 16:9 stage only when no player is displayed. When an older player is retained, assembly or failure messaging stays compact above it so the player remains dominant.
- The existing sr-only announcement has no visible duplicate line.

## QA finding dispositions

| QA ID | Disposition | Evidence |
| --- | --- | --- |
| QA-79-01 | Resolved | Descriptor failure and same-generation retry assertions in metrics.json; descriptor-failure-en-desktop.png and descriptor-recovered-en-desktop.png; focused Result regression test. |
| QA-79-02 | Resolved | replacement-en-short.png and localized replacement captures show Previous version while assembly continues, without a second stage. |
| QA-79-03 | Resolved | unknown-download-ru-phone-error.png and 390px document-width assertion in metrics.json. |
| QA-79-04 | Resolved | Pending old request and Watch new screenshots; exact generation journal records requests for 001, 002, then retry 001, with zero assembly, credit, or other operation calls. |
| QA-79-05 | Resolved | ready desktop and phone captures measure Download at 44px and 48px; actions are below the player. |
| QA-79-06 | Shared fix validated | Shared issue 78 sr-only utility measured at 1px, clipped, absolute; new-ready-while-playing-ru-phone.png shows no duplicate visible announcement. No shared CSS edit in issue 79. |
| QA-79-07 | Resolved | initial-assembly-en-short.png, initial-assembly-ru-phone.png, and metrics.json show the first assembly stage when no player exists. Replacement screenshots prove a retained player does not receive a second stage. |
| FIX-R79-01 | Resolved | Root-confirmed duplicate-stage regression corrected; short desktop and phone replacement and retained-result failure captures are compact in both locales. See replacement-en-short.png, replacement-ru-phone.png, retained-result-failure-en-short.png, retained-result-failure-ru-phone.png, and metrics.json. |

The conditional-stage regression test covers initial assembly without a result, replacement assembly with a retained result, and failed replacement with a retained result.

## Verification

- PASS: npm.cmd run test -- src/features/result/ResultScreen.test.tsx — 1 file, 3 tests passed.
- PASS: node _docs/evidence/visual-qa-fixes-2026-10-25/issue-79/capture-corrections.cjs — final state matrix and 37 unique viewport screenshots, assertions passed, browser version 156.0.8078.4. Vite ran on 127.0.0.1:4579 and was stopped after capture.
- PASS: git diff --check — exit 0; Git emitted only existing LF/CRLF normalization warnings.
- NOT GREEN at capture time: npm.cmd run typecheck — five TypeScript errors in the concurrently edited, out-of-scope frontend/src/features/auth/OtpInput.test.tsx at lines 46, 53, 82, 88, and 89 (HTMLElement selection APIs). No Result screen diagnostics appeared. The owner asked not to rerun global typecheck until the parallel source freeze.

The screenshots and browser journal came from the existing controlled synthetic Result harness, not the production media service. Browser download events establish request delivery in the harness, not the operating system's final save confirmation. The two focused tests and browser assertions do not establish full-suite, native-device, production integration, real media, or manual owner acceptance.

## Evidence files

- metrics.json — final assertions, viewport metrics, exact generation request journal, and hidden announcement measurement.
- screenshot-manifest.json — final 37 unique PNG captures and state provenance.
- capture-corrections.cjs — repeatable controlled browser capture and assertions.
- evidence/ — fresh English and Russian desktop, short desktop, phone, 767/768px boundary, initial assembly, replacement, retained-result failure, recovery, and generation-switch captures.

## Final source hashes

- ResultScreen.tsx: 844FB76C067C9B361D1D801BF96B3A64F292A88C2FBC72C667C2FD7D4B991438
- ResultScreen.css: BD2A6E80650535716E931A12EBD1860FE8A36732DA7BE744A2B20A29FFA9581D
- ResultScreen.test.tsx: C2366F0DE0E31190B7ED1937ABD0EAD0C514813D95AEA4F88D703B6889E118A4
- capture-corrections.cjs: 0F5D648794BECAFD2D1FC25881C80FFCE9E9A824CBA655074F617CBD01B72DCF
