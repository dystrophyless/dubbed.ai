# SPEC-001 / SPEC-002 — joint specification review and corrections

Date: 2026-10-20 (Asia/Qyzylorda)
Reviewer: independent GPT-6.1 Sol subagent, high reasoning effort
Scope: read-only review of both specifications against BR-001, brainstorm, project guidance and each other; later user instruction authorized document fixes
Evidence class: document review, not runtime validation or approval of the product

## Reviewed baseline

- SPEC-001 revision 0.1, SHA-256 `AE655C802750E73B30AD3C6593B116E04C608981735755C8ED4AD5AE10CDA1F4`.
- SPEC-002 revision 0.1, SHA-256 `7E503A4A28472580B95D4BFBDBAFB9C66DAD1E5E3360924051BF0812FB425DE4`.
- BR-001 revision 0.1, brainstorm and relevant workflow/review guidance.

Original verdict: coherent draft package, no newly identified CRITICAL/HIGH contradiction; two MEDIUM clarifications and one LOW clarification. Not ready for unrestricted implementation. Existing D01–D12 decisions were explicit blockers, not discovered runtime bugs. The reviewer independently checked the ten reported opaque color-pair contrast calculations and found the reported arithmetic consistent; rendered accessibility remained unproved.

The user subsequently instructed: 'So fix these'. Both specifications are now revision 0.2. This record preserves the original findings and their scoped dispositions; it does not replace a requirement or task backlog.

## DBR-001 — MEDIUM — confirmed acceptance/scope inconsistency

Finding: SPEC-002 allowed the real adapter to remain unimplemented until backend integration, but FE-AC-09 ambiguously required both mock and real adapters to conform at current frontend acceptance. A backend-free demonstration could be rejected for missing explicitly deferred integration.

Affected: FE-AC-09, services boundary and frontend completion gate.

Correction in [SPEC-002](SPEC-002_frontend.md): §7.5 and FE-AC-09 now separate the gates. Present delivery requires the typed facade, conforming executable mock, single-point substitution and explicit failure for unavailable real mode. An executable real adapter and its shared/real-integration checks are required at the later backend-integration gate, not now.

Disposition: corrected; targeted GPT-6.1 Sol High recheck of revision 0.2 confirmed DBR-001 closed, with no residual correction in scope.

## DBR-002 — MEDIUM — confirmed preparation/correction contract gap

Finding: saved text/speaker/timing corrections and manually added turns can exist before recording. Reprocessing is allowed then, but successful reprocessing had no explicit rule about preserving, merging or resetting that manual work. Protection on failed retry did not define successful activation.

Affected: SPEC-001 AC-06/AC-07/AC-13; SPEC-002 FE-AC-03, preparation service results, persistence and test profiles.

Correction in [SPEC-001](SPEC-001_dubbed_mvp.md): §4.2 explicitly prevents treating valid machine output as permission to reset/merge corrections. D13 identifies the missing owner policy: carry/reset/merge rules, matching/conflicts, destructive-change notice/confirmation, concurrent edits and activation result. Until that policy exists, replacement activation cannot silently discard/merge manual work. Charge settlement remains a separate D03 policy.

Correction in [SPEC-002](SPEC-002_frontend.md): Prepare and service contracts expose correction/manual-turn disposition, expected revision, confirmation requirement and activation capability. Named mock profiles demonstrate explicit disposition/confirmation, decline, concurrent-edit conflict and policy-unset behavior without adopting a production transformation policy. T04, component scenarios and FE-AC-03 now exercise those cases. SPEC-001 AC-07 and its verification row cover successful retry after saved corrections plus an added turn.

Disposition: targeted GPT-6.1 Sol High recheck confirmed DBR-002 closed as a document gap. Production preserve/reset/merge choice remains an owner decision under D13, not silently selected by the fix. Backend-free mock work can use its named provisional profile. This finding never proved runtime data loss.

## DBR-003 — LOW — confirmed playback identity ambiguity

Finding: while a replacement candidate was saving or failed, Play my take could mean the previous durable saved take or the new unsaved candidate. Storage protection alone did not tell the user which performance was playing.

Affected: SPEC-001 AC-09/AC-10 and SPEC-002 FE-AC-04, recording state and replacement tests.

Correction in both specs: Play my take targets only the current durable saved take. While replacement saves/fails, label it as the previously saved take; if none exists, disable it with the reason. Do not expose an uncommitted candidate through the same action. Commit changes the next explicit playback target, not an already playing take or an automatic replay. Starting capture stops take playback before original reference starts. This adds no multi-take library or new performance mode.

Tests extended: SPEC-001 AC-09 and its verification scenario; SPEC-002 T05, component replacement scenarios, E02 and FE-AC-04 cover saving/failure/commit with and without a previous saved take.

Disposition: corrected; targeted GPT-6.1 Sol High recheck of revision 0.2 confirmed DBR-003 closed, with no residual correction in scope.

## Remaining readiness and evidence limits

- D01–D13 and relevant owner decisions/feasibility evidence remain open; registration of a policy decision is not policy approval.
- No product code, frontend mock, executable tests, real backend adapter, AI/media benchmark, payment/security integration or deployment was produced or verified.
- No owner approval, full package-readiness PASS or product acceptance is recorded.
- Author checks verify document references, contracts, IDs and traceability only. The independent recheck below closes the bounded document findings; it does not supply runtime evidence.

## Targeted independent recheck

Completed on 2026-10-20 by the same GPT-6.1 Sol High reviewer, read-only, against SPEC-001 and SPEC-002 revision 0.2. Verdict: DBR-001–003 closed as document findings; no residual correction required within the bounded scope.

- DBR-001: SPEC-002 §7.5 and FE-AC-09 separate present frontend/mock acceptance from future real-backend integration.
- DBR-002: SPEC-001 §4.2, D13, AC-07 and its verification align with SPEC-002 Prepare, preparation facade, named mock profiles, T04, component checks and FE-AC-03. The document gap is closed; D13 remains open as an owner policy decision and D03 settlement remains separate.
- DBR-003: both recording contracts and SPEC-001 AC-09/verification, SPEC-002 T05/components/E02/FE-AC-04 consistently identify saved-versus-candidate playback during replacement.

No runtime tests or broader rereview were performed. The reviewer made no edits. This result is not a whole-project readiness PASS, owner approval, implementation acceptance or production proof.
