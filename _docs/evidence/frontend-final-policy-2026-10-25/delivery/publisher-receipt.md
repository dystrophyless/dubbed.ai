# Publisher preparation receipt — Root review

Date: 2026-10-25 (Asia/Qyzylorda)  
State: **exact candidate whitelist prepared for Root review; no files staged or committed.**

## Accepted mock scope

Root's delegated acceptance of #77, #81 and #63 is recorded in [`mock-milestone-acceptance.md`](../mock-milestone-acceptance.md), SHA-256 `566D93A575AFBDB2B6E7329BAEB3DAAC7E43E6BCD14D7AAC5A8BC9389949FE9B`. It accepts the backend-free frontend and measured mock/Chromium envelope only. Physical microphone behavior, live providers, real rendering, production cross-device durability/security/retention/billing, hosting and deployment remain outside that acceptance.

The owner decisions in [`owner-decision-receipt.md`](../owner-decision-receipt.md) are reflected in implementation and proof: one recording tab per project, source durations below 1,000 ms rejected before commit with exactly 1,000 ms eligible, and a persisted candidate preserved through Save and leave/reload. #76 remains open as future real-adapter work; it is not cancelled or completed.

## Exact payload whitelist

[`final-hash-manifest.json`](final-hash-manifest.json) is the path whitelist for Root review. Its SHA-256 is `21A56B47B40A19CC5878B5BCD72D15F14429EFF5DAD2AC522AA9065441DC2675`. It contains **41 payload paths**: 11 frontend source/test changes, 2 tracked documentation changes, and 28 selected dated evidence/control artifacts. Every listed payload SHA-256 was recomputed against current bytes after manifest generation; **41 of 41 matched**.

The two tracked documentation paths are `CHANGELOG.md` (SHA-256 `9F87E01CA1D8EED8DD0355760F9F4C0843BE5A8268CD8DC3F60E00D21B4912DE`) and `_docs/frontend-implementation-contract.md` (SHA-256 `9223198A75B855BA60B7E364C5189DF9FE6EEC57AAD420DD2E9B490FA011DC76`, the reviewed three-hunk decision summary). The dated payload includes the self-contained owner receipt, semantic contract review, acceptance record, source/freeze snapshots, seven Root raw logs, short-source verification and two screenshots, recording verification and historical failure note, six recording screenshots, the final criteria map, and the live issue baseline.

The manifest lists changed frontend paths individually. It excludes the three pre-existing untracked local authorities `_docs/frontend-flows/00-shared-contract.md`, `_docs/frontend-flows/06-new-dub.md` and `_docs/frontend-flows/09-record.md`, all other untracked flow corpus, unrelated dirty documents/skills and old regenerated proof folders. `delivery/candidate-inventory-draft.md` is an earlier preparation snapshot, superseded by the exact whitelist, and is not part of the payload.

The manifest separately declares five delivery controls: `delivery/final-hash-manifest.json`, `delivery/publisher-receipt.md`, `delivery/precommit-receipt.md`, `delivery/issues-preverify.json`, and `delivery/issues-verified-readback.json`. The planned stage whitelist is exactly the **41 payload paths plus these 5 controls (46 paths)**. The last three controls are generated only after Root's publication GO and have no hashes in this manifest because they are mutable mechanical records. Post-push/closure receipts remain untracked separately. The manifest and publisher receipt are declared controls, not recursively hashed payload files.

## Source and verification boundary

Root's before/after freeze files enumerate the same 198 frontend source/test/configuration/media files, aggregate SHA-256 `372E957FAFA6DA284EA88657F4FC0BE138F2E5498B8C6C44C0E2191EC7ADE781`. Unit and isolated build ran on the pre-capture inventory `7985597676C0ADAE90C447E922F74C7F53817FB4888D1FB2570DFAB70D5F31FE`; `root-capture-followup.json` records the single later test-only screenshot change. The final typecheck and browser run followed that capture. The captured final results are 44 unit files/222 tests passed, isolated build/typecheck passed (947.46 kB JS/55.71 kB CSS), final typecheck passed, lint exit 0 with warnings, browser 118/118 passed without retries/skips/failures, media 3/3 passed, and real-unavailable mode 1/1 passed without external requests. Detailed commands and raw results are in the manifest-listed acceptance and log files.

The baseline [issue snapshot](live-issue-baseline-2026-10-25.md) records #77, #81 and #63 open/in_progress, every original acceptance checkbox unchecked, and zero comments. No live issue body/comment was changed in this Publisher preparation. Delegated acceptance is recorded separately; issue closure remains pending later delivery verification and a separate closure decision.

## Handoff boundary

Root's publication GO has been received. Fresh guarded readbacks confirm #77, #81 and #63 remain open with workflow status `verified`, all original criteria checked for the accepted mock scope, original titles and `frontend` labels preserved, and zero comments; their body hashes and readbacks are recorded in `issues-verified-readback.json`, with the before-state in `issues-preverify.json`. This Publisher did not rerun tests. Before staging, `precommit-receipt.md` records the final HEAD/index guard and scoped diff check. The exact stage path set is the 41 entries in the manifest's `files` array plus the 5 entries in `delivery_control_files`; no other path is eligible. Issues remain open pending delivery verification and a separate closure decision. The SHA-256 of this receipt is reported with the handoff because the receipt is not recursively included in its own payload hash list.

