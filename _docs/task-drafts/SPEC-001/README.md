# SPEC-001 / SPEC-002 — draft implementation package

Created: 2026-10-20 (Asia/Qyzylorda).
Baseline: [SPEC-001](../../specifications/SPEC-001_dubbed_mvp.md) and [SPEC-002](../../specifications/SPEC-002_frontend.md) revision 0.5; [BR-001](../../business-requirements/BR-001_custom_video_dubbing.md) revision 0.2; confirmed owner follow-up in [brainstorm §17](../../../brainstorm.md#17-confirmed-follow-up-brainstorm-decisions--2026-10-20).

This package contains 35 separate unpublished task drafts. Every task remains `draft` / `not synchronized`. No GitHub issue exists or number is assigned, and no application implementation is authorized by decomposition. Titles/filenames identify local drafts, not a new task-numbering scheme. Individual files own scope, AC, dependencies and verification; this index is a proposed dependency order, not a second live backlog/status table.

## Readiness and decision boundaries

- Specification and applicable policy approval and package readiness are not claimed. Individual draft grooming is recorded in the [independent report](../../specifications/SPEC-001_task_grooming_review.md); it does not resolve production policy or authorize execution. The earlier spec review closed its three document findings, not implementation readiness or this new task package.
- [Media feasibility](media_feasibility.md) supplies evidence. [Production policy baseline](production_policy_baseline.md) records actual owner decisions and remaining scoped blockers, not implementer guesses. D12 is partially resolved: React/Zustand and FastAPI/PostgreSQL/SQLAlchemy stay selected.
- Mock tasks implement confirmed values/policies including D13 reset-on-success with advance confirmation; only genuinely open cash/stage/technical parameters use labeled provisional profiles, and an explicit demo media/browser envelope. Their evidence is not a production decision or real AI/payment/hosted proof.
- Each production task lists the decisions that prevent it being marked ready. Unrelated investigation or mock work need not wait for all D01–D13 to be closed.
- Tests belong to each task. Gates integrate existing outputs and route defects back; they do not conceal feature implementation or lower missing evidence to PASS.
- Independent package review is recorded in the [package report](../../specifications/SPEC-001_task_package_review.md). Its scoped document fixes do not approve sources, resolve owner decisions or authorize execution.

## Proposed execution order

The sequence below is a valid topological order, not an assertion that all entries are ready. Media investigation can run alongside the frontend path; owner policy resolution may start as soon as its evidence is available. Backend runtime setup is independent and can move earlier. The mock milestone does not depend on production policy closure or a real adapter. No parallel agents are requested by this order.

| Sequence position (not a task ID) | Task draft |
|---|---|
| 1 | [Establish the real media pipeline's quality, latency and cost envelope](media_feasibility.md) |
| 2 | [Run a tested React and Zustand frontend in an isolated mock configuration](frontend_runtime.md) |
| 3 | [Freeze the frontend facade and enforce its transport boundary](frontend_service_contract.md) |
| 4 | [Provide playable, annotated and permitted dubbing fixtures](demo_media_fixtures.md) |
| 5 | [Render the flat visual system and responsive public/account shell](visual_system_shell.md) |
| 6 | [Persist and restore the demo workspace through the shared facade](mock_workspace_persistence.md) |
| 7 | [Simulate credit quotes, reservations and one-time purchases consistently](mock_credit_accounting.md) |
| 8 | [Exercise sample preparation and explicit correction disposition without AI](mock_preparation_lifecycle.md) |
| 9 | [Simulate finished generations and local share deletion honestly](mock_result_lifecycle.md) |
| 10 | [Take a demo user from file selection and quote to a usable preview](upload_preparation_ui.md) |
| 11 | [Correct prepared turns and add a missed line without losing saved work](turn_correction_ui.md) |
| 12 | [Capture a bounded local microphone take synchronized to reference audio](browser_capture_adapter.md) |
| 13 | [Record and safely review one durable take per turn](recording_review_ui.md) |
| 14 | [Resume projects and manage honest finished results and public demo links](results_projects_sharing_ui.md) |
| 15 | [Buy demo credit packs and return to the original preparation quote](credits_purchase_ui.md) |
| 16 | [Prove the full backend-free frontend milestone](frontend_mock_integration_gate.md) |
| 17 | [Resolve the production policy baseline needed by dependent implementation](production_policy_baseline.md) |
| 18 | [Run FastAPI against an isolated PostgreSQL and SQLAlchemy test environment](backend_runtime.md) |
| 19 | [Freeze API, timeline and durable data contracts for real integration](backend_contracts_schema.md) |
| 20 | [Authenticate account-owned access and initialize eligible accounts once](account_identity.md) |
| 21 | [Create resumable projects with validated durable source media](project_media_upload.md) |
| 22 | [Maintain durable trial and preparation credit accounting](credit_reservations.md) |
| 23 | [Deliver durable version-bound media jobs without duplicate publication](processing_job_foundation.md) |
| 24 | [Produce validated timed speaker turns including overlap and character sounds](dialogue_preparation.md) |
| 25 | [Produce an auditionable music-and-effects background for a source](background_separation.md) |
| 26 | [Activate a complete preparation with correct credits and retry behavior](preparation_orchestration.md) |
| 27 | [Persist revision-safe turn corrections and manually added dialogue](preparation_corrections.md) |
| 28 | [Authorize recording and commit a compatible durable take safely](recording_commit_backend.md) |
| 29 | [Render a full source-timeline video using current recorded performances](full_video_rendering.md) |
| 30 | [Publish only the latest finished result and revoke a deleted project's access](sharing_project_deletion.md) |
| 31 | [Fulfill verified one-time credit purchases and the permanent slot upgrade once](one_time_purchase_fulfillment.md) |
| 32 | [Run the existing frontend through the real backend services adapter](frontend_real_adapter.md) |
| 33 | [Make the application environment reproducible and recoverable](delivery_recovery_environment.md) |
| 34 | [Prove the complete real-service dubbing journey and failure recovery](real_product_integration_gate.md) |
| 35 | [Establish final acceptance and the actual delivery readiness of the MVP](release_acceptance_gate.md) |

## Milestones and final gates

- [Backend-free frontend gate](frontend_mock_integration_gate.md): complete local React/Zustand experience, service boundary, persisted actual takes/local preview, honest sample export and same-browser sharing, visual/accessibility checks. No FastAPI/PostgreSQL/real adapter is required.
- [Real-service integration gate](real_product_integration_gate.md): all 25 project AC on one compatible environment using actual backend/pipeline/rendered takes and provider test-mode payments; mock-only proofs cannot satisfy this gate.
- [Final acceptance gate](release_acceptance_gate.md): reconcile business/spec/task-to-proof coverage, support/operational policies, actual delivery boundary and authorized acceptance. No automatic merge, public release or live transaction.

## Ownership, dependencies and safe parallelism

`Depends on` in each task is authoritative; `Blocks` is the exact reverse direct-edge set, not every transitive descendant. Verify prerequisite evidence, not filename/order alone. Do not start a dependent task from an unreviewed placeholder contract.

The frontend runtime/facade establishes consumers' contract before mock handlers and screens. Shared `services/mock`, Zustand, schema, ledger and media-generation writes need one owner at a time or explicit non-overlapping assignments. Logical independence is not permission for simultaneous changes to the same file/store. The backend contract baseline consumes the facade and owner policy, then fixes PostgreSQL/time/revision/API contracts before feature handlers. Production credit quotes also depend on validated source identity from the upload task.

Identity/ledger/project/job and model stages can have independent assignments only after shared contracts are stable and isolated test/DB/media environments are assigned. Dialogue and background model work can proceed independently after the worker foundation, but activation joins both. Sharing/deletion must fence all producers, not just the public link route. Real-adapter work joins all backend consumers; recovery/integration gates run against compatible revisions.

Use the listed order as the default single-writer handoff on shared surfaces. The graph records required producer contracts; it does not make every task pair with no direct edge safe to edit concurrently. Before execution, assign one current writer for each shared surface below, including a concrete file/migration boundary once files exist. Transfer that surface explicitly at each handoff; unassigned ownership is a readiness blocker. No additional reviewer role is required.

| Shared surface | Producer and safe extension/consumer order |
|---|---|
| Frontend bootstrap/composition and facade | Runtime establishes startup configuration; facade freezes public types; downstream adapters/screens consume them. Contract changes return to the facade responsibility and update affected consumers before continuation. |
| Demo repository, ledger and lifecycle | Workspace supplies persistence/guard/asset primitives; accounting supplies ledger/checkout; preparation supplies activation and deletion-to-attempt reconciliation; result/deletion composes those outputs. This order is required on shared mock files; screens call services and do not mutate adapter internals. |
| Demo media and browser handles | Fixtures owns asset/annotation identity; workspace owns persisted blob references; device capture owns handles/URLs; recording UI composes saved preview. Cleanup uses the declared reference/active-playback lifetime. |
| Backend API/schema/migrations | Runtime owns infrastructure baseline, schema freezes shared contracts, then identity -> source storage -> ledger -> jobs -> preparation -> corrections -> recording -> rendering -> publication/deletion -> purchases extends named slices. If files overlap, keep this serial order; disjoint stage adapters may proceed separately after their prerequisites. |
| Credits and entitlements | Identity supplies eligibility/baseline slots; ledger alone owns trial/reserve/terminal accounting; purchase fulfillment appends verified purchase/upgrade effects through that ledger contract. Project deletion supplies attempt identities rather than deleting account monetary history. |
| Real media asset lifecycle | Source storage supplies shared reference-safe retirement/cleanup; jobs identify unassociated outputs, preparation identifies rejected/superseded revisions, recording identifies candidates/replaced takes, rendering identifies failed/stale/old generations. Publication/deletion coordinates the project-wide case; recovery configures/rehearses the same mechanism. D08 must settle lifetimes/retention before affected production work. |
| Frontend feature integration | Upload/preview -> corrections -> recording -> result/projects; credits joins quote/purchase return. Follow this order for shared route/store files; independently assigned controls can be separate only with explicit disjoint boundaries. |
| Real adapter and delivery | Backend contracts/consumers and frontend mock gate precede real adapter; delivery recovery follows; real journey gate then final acceptance consume compatible revisions. Gates report defects to owners and do not implement competing fixes. |

Logical asset retirement and physical cleanup are distinct. In an active project, rejected/stale output and replaced-take/old-generation cleanup must protect retained references and playback, not wait for project deletion to discover all orphans. These are existing D08 lifecycle obligations with assigned mechanism/producers, not new retention periods or a take-history feature. The mock result/deletion task now directly depends on preparation so its pending-attempt consumer exists; the exact reverse edge is recorded there. Mock purchase reconciliation remains account-scoped when a project is deleted.

## Coverage and review records

- The project spec's traceability table maps every BR requirement to project AC and actual draft links. Frontend FE-AC ownership is summarized below; the full acceptance/verification text remains in individual files/specs.
- Author checks validate all task fields, matching AC/check rows, local links, source revisions, acyclic dependencies, exact reverse edges, topological order, reachability of every task to a final gate, and coverage of 25 project plus 10 frontend AC.
- The original author checks below describe package creation. Independent individual-task grooming and a bounded cross-task seam recheck are now recorded in the [review report](../../specifications/SPEC-001_task_grooming_review.md). Both are documentation evidence only; product execution, owner decisions, acceptance and publication remain pending.

Historical author validation before independent grooming on 2026-10-20: 35 task files, 65 direct dependency edges, 106 task acceptance/verification scenarios, and 547 local links checked across the package and affected entry points. At that author baseline the graph was acyclic, reverse edges matched, the listed order was topological, every task reached final acceptance, and the mock milestone had no production-policy/real-backend prerequisite. Current independent counts/results, including the added fixture-to-shell edge, are in the review report. All 22 BR rows link to drafts and all 25 project plus 10 frontend criteria have task coverage. These checks establish document structure/coverage, not independent readiness or application correctness.

The later [package review](../../specifications/SPEC-001_task_package_review.md) independently rechecked every task and source-to-owner-to-gate seam rather than accepting those author/grooming counts as proof. It records the historical 67-edge graph at its frozen baseline, targeted fixes, actual validation output, source fingerprints and unresolved decisions. The proposed 35-entry order remains valid; all tasks remain unpublished drafts.

| Frontend criterion | Owning draft(s) / integration proof |
|---|---|
| FE-AC-10 | [Prove the full backend-free frontend milestone](frontend_mock_integration_gate.md); [Prove the complete real-service dubbing journey and failure recovery](real_product_integration_gate.md) |
| FE-AC-01 | [Render the flat visual system and responsive public/account shell](visual_system_shell.md); [Prove the full backend-free frontend milestone](frontend_mock_integration_gate.md) |
| FE-AC-02 | [Render the flat visual system and responsive public/account shell](visual_system_shell.md); [Take a demo user from file selection and quote to a usable preview](upload_preparation_ui.md); [Resume projects and manage honest finished results and public demo links](results_projects_sharing_ui.md); [Buy demo credit packs and return to the original preparation quote](credits_purchase_ui.md) |
| FE-AC-03 | [Exercise sample preparation and explicit correction disposition without AI](mock_preparation_lifecycle.md); [Correct prepared turns and add a missed line without losing saved work](turn_correction_ui.md) |
| FE-AC-04 | [Capture a bounded local microphone take synchronized to reference audio](browser_capture_adapter.md); [Record and safely review one durable take per turn](recording_review_ui.md) |
| FE-AC-05 | [Simulate finished generations and local share deletion honestly](mock_result_lifecycle.md); [Resume projects and manage honest finished results and public demo links](results_projects_sharing_ui.md) |
| FE-AC-06 | [Simulate credit quotes, reservations and one-time purchases consistently](mock_credit_accounting.md); [Buy demo credit packs and return to the original preparation quote](credits_purchase_ui.md) |
| FE-AC-07 | [Freeze the frontend facade and enforce its transport boundary](frontend_service_contract.md); [Run the existing frontend through the real backend services adapter](frontend_real_adapter.md) |
| FE-AC-08 | [Provide playable, annotated and permitted dubbing fixtures](demo_media_fixtures.md); [Persist and restore the demo workspace through the shared facade](mock_workspace_persistence.md); [Prove the full backend-free frontend milestone](frontend_mock_integration_gate.md) |
| FE-AC-09 | [Freeze the frontend facade and enforce its transport boundary](frontend_service_contract.md); [Prove the full backend-free frontend milestone](frontend_mock_integration_gate.md); [Run the existing frontend through the real backend services adapter](frontend_real_adapter.md) |

## Publication boundary

No GitHub numbers, placeholder issue URLs or remote updates are created. If publication is later authorized, freeze reviewed revisions, publish/reconcile with stable markers, resolve dependencies to actual references, then replace only successfully published draft bodies with issue-link stubs. Do not stub or delete unpublished contracts early.


## Follow-up brainstorm synchronization — 2026-10-20

All 35 individual drafts now reference SPEC-001/002 revision 0.5 and BR-001 revision 0.2, with responsibility-specific scope, an additional acceptance criterion and matching verification scenario. Counts/order/dependency fields remain unchanged by this synchronization. The previous independent reviews do not cover these later contract changes; no renewed independent PASS/readiness is claimed.

Confirmed product decisions are no longer blanket D01–D13 blockers: D04/D05/D06/D13 behavior is resolved; other IDs distinguish selected behavior from remaining evidence/policy mechanics. Production-policy and feasibility tasks remain necessary for USD packs, cancellation stage pricing/races, actual media/device/model support, retention mechanics, content/abuse policy and zero-turn export.

Ownership handoffs within the existing graph:

- Visual shell owns bilingual/auth/account screen shells; facade owns typed auth/link/reset/delete and cancel/share APIs; mock persistence owns simulated account access/deletion state. Feature UI uses these contracts without direct transport.
- Identity owns Google/password verification/reset/linking, account disable, session/common-access fencing and durable deletion identity. Sharing/project-deletion owns downstream account-wide project/media cleanup; preparation/ledger own billing outcomes. Public-share checks must reject disabled accounts before cleanup finishes.
- Upload UI/source backend own original-to-selected-section mapping and validation. Dialogue/background producers consume that mapping. Background separation and fixture preparation own original-speaker preview stems; recording UI/device preview consumes them. The final renderer still uses all saved takes plus one background, with no original-voice fallback.
- Per-task new verification rows feed the frontend/mock and real/final gates. Tests remain not run; no issue IDs, code, commits, payments, publication or deployment were added.
