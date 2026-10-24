# Publisher preparation receipt — screen cohort delivery

Prepared: 2026-10-24T01:04:18Z  
Repository: D:\Program\python\Dubbed  
Base revision: 7845b84d171858628128d9e60e6d3d560f43055a  
Mode: preparation only; no index change, commit, push, or GitHub mutation occurred during this renewal.

## Candidate boundary

The exact candidate is the 306-file payload inventory in candidate-manifest.json (SHA-256 F76018F133CE36FB369A87AF89DFEC870AC0AC8B92369A3DF9D9BFB893F89121) plus six delivery controls listed in that manifest, for 312 paths total. The controls are the manifest, this receipt, precommit receipt, guarded-update preverify readback, prior verified readback, and composition-hold readback. Every payload file has a byte length and SHA-256 in the manifest; missing references: 0.

The payload contains 30 frontend source/test/config/harness files, 161 screen-evidence files, 88 processing-evidence files, 24 final-verification files, and 3 publisher-baseline files. Four current source paths added after the earlier candidate are frontend/src/app/locale.tsx, frontend/tests/app/locale.test.tsx, frontend/src/features/account/AccountScreen.css, and frontend/src/features/account-linking/AccountLinkingScreen.css.

The current source boundary is 197 frozen files. Before/after freeze receipts are byte-identical, SHA-256 9E24557F663F1E74568AAC8F47053E2A11DEAB06DB4D880DDA8D26B4EC4F8310 (root-final-composition-freeze-before.json and root-final-composition-freeze-after.json). HEAD remains 7845b84d171858628128d9e60e6d3d560f43055a; the prior 284 staged paths were left unchanged. This renewed candidate has not been staged.

## Acceptance and verification recorded

The renewed Root acceptance record (screen-cohort-acceptance.md, SHA-256 86488461C984DE490C1F457C8BDEEF51D403B52CBA7055BD62DF79434EDC878F) and criterion map (acceptance-evidence-map.md, SHA-256 00BF02470A6E31787461186C5938C3C7FC6E38F6C7E0F47FE1A0810DC12A753C) record delegated acceptance for #62, #65, #66, #69, #71, #74, #75, #78, #79, #80, and #82 only. #63, #76, #77, and #81 remain outside this cohort; #63 is not accepted or closed, and #81 retains the unanswered short-source policy question.

Live issue workflow state was not updated during this preparation. #62 and #66 remain open / in progress from the composition-hold readback; the other nine accepted issues remain open / verified. No issue was closed. The current acceptance record applies to the repaired, frozen boundary and does not itself claim a live workflow-state update.

Final gate on the frozen boundary: 44 unit files / 217 tests passed in 42.29s; 117 browser tests passed in 3.9m with no retries or skips; isolated clean install, typecheck, and build passed (JavaScript 946.84 kB and CSS 55.71 kB); lint exited 0 with warnings; media checks 3 passed; real-adapter-unavailable check 1 passed in 5.6s. Browser media was muted and fake devices were used. The six Root logs and two freeze receipts are included. The mock-integration-gate report, SHA-256 B59A410517E307801E8191E7CA689517F24843401625BB7DF1033E25B52FDB01, records that #63 remains outside acceptance and closure; its 25 evidence links resolved, while AC-03 short-source presentation and AC-04 same-profile-tab ownership remain unsettled. Earlier failed browser-run logs and bounded error contexts remain included as history, not as passing verification.

The representative composition screenshots inspected by Root were account-screen-en-1440.png, account-screen-ru-390.png, account-linking-screen-en-1440.png, and account-linking-screen-ru-390.png. All eight EN/RU desktop/phone screenshots plus account-app-layout.json are included because the metrics file references all eight. Recorded title-left values are Account 16/16/32/120 px and Account Linking 16/16/32/300 px across the measured EN/RU widths. The mock-only browser evidence establishes local frontend behavior; source/token audit remains a separate check. No deployed, backend, payment, or external-provider integration is claimed.

## Evidence integrity and publication limits

The refreshed auth, result, and workspace checksum manifests validate all 35, 17, and 55 entries respectively; all references resolve. Their superseded manifests are preserved byte-for-byte under SHA256SUMS.historical-before-composition-refresh-2026-10-24.txt. The mic-icon manifest (16 entries), shell-final-proof manifest (23 entries), and nested recording-transport archive (3 entries) were checked and required no refresh. Superseded candidate/receipt bytes are preserved as candidate-manifest.historical-before-composition-2026-10-24.json and publisher-receipt.historical-before-composition-2026-10-24.md.

Processing evidence contains the current after-state screenshots, current metrics/readme, final focus captures, and the explicitly referenced bounded historical items. Its README retains two stale hash rows: the earlier full-matrix source fingerprint is historical (the later focused-source row matches the frozen source), and metrics-after.jsonl changed during the final capture. The candidate manifest records current bytes; the worker README was left unchanged.

The local visual-authority sources _docs/frontend-flows/ (workflow, adoption contract, catalog, tokens, and flow specs) and _docs/evidence/affect-ui-clean-light/ (Clean Markdown and matching Light PNG corpus) remain excluded from this publication whitelist. Executors and Root inspected applicable local references; their exclusion is a publication boundary, not a claim that visual references were unavailable. Unrelated dirty docs, skills, old reviews, broad historical probes, and fixture binaries are also excluded.

## Proposed commit

feat(frontend): deliver screen-state cohort

This receipt is a preparation inventory for Root review. No GitHub issue was closed, and no commit or push has occurred.