# SPEC-001 task grooming and bounded package seam review

Date: 2026-10-20, Asia/Qyzylorda.
Reviewer: independent GPT-6.1 Sol, high reasoning effort, clean-context task assignment.
Mode: authorized local task-document grooming; no product implementation or external changes.

## Verdict and frozen scope

All **35 individual unpublished task drafts** were reviewed against the complete SPEC-001 and SPEC-002 revision 0.4, BR-001 revision 0.1, relevant confirmed/superseded brainstorm decisions, and the decomposition/workflow guidance. Ponytail full, spec-task-review and task-package-review-loop were applied. The package remains 35 drafts plus its README. No split or new feature is justified by this review.

The task-document findings below are patched. **Execution readiness and product acceptance remain blocked** by applicable unapproved source/visual decisions, unresolved D01–D13 policies/evidence, unassigned owners and absent implementation. A completed investigation or gate report does not satisfy a dependent contract when its required outcome is still blocked. No owner answer, policy approval or risk acceptance was manufactured.

The sources of truth are [SPEC-001](SPEC-001_dubbed_mvp.md), [SPEC-002](SPEC-002_frontend.md), [BR-001](../business-requirements/BR-001_custom_video_dubbing.md) and [brainstorm](../../brainstorm.md). The [package index](../task-drafts/SPEC-001/README.md) owns the proposed order; each linked draft owns its task contract. Specifications, BR and brainstorm were left unchanged. No detailed task bodies or review findings were inserted into the specifications.

The reviewed input and output fingerprints are recorded below. They freeze local file bytes, not a Git commit: this workspace has no established Git/application revision. Input copies were captured before the first edit in an isolated temporary review snapshot. All draft workflow states remain `draft` / `not synchronized`, with no GitHub issue numbers.

## Evidence and method

- Read all individual scope, exclusions, responsibility, prerequisites, AC, checks and delivery fields. Common boilerplate was checked across the complete files; repeated boilerplate was omitted from later reading output so unique contracts remained visible.
- Confirmed the documentation-only root inventory. A fresh Semble query for upload/recording/billing/application tests returned BR/brainstorm/spec documentation, including SPEC-001 §2.3. There is no inspected application entry point, executable product test suite or established build/test command to cite as an implementation anchor.
- Cross-checked producer/consumer ownership for session/slots/trial, source/quote, preparation/credits/capture, corrections/current takes, render/publication/deletion and payment recovery. Future consumers are verified by contract fixtures first and repeated through actual endpoints at the owning downstream task and integrated gate.
- Used two bounded rounds: initial individual review and scoped patches; then changed-seam/sibling recheck plus document validation. This is not an implementation review or a claim that remaining runtime risk is zero.
- Default command startup failed with `helper_unknown_error: setup refresh had errors`. Scoped read/document/check commands succeeded outside the default sandbox. This is tool evidence, not a product bug.

No model/provider API, paid call, product test, microphone session, payment, hosted delivery, Git operation, issue publication or deployment was run. Proposed verification below stays future work.

## Severity-ordered findings and dispositions

### GROOM-001 — HIGH: completed evidence accounting could be mistaken for a passing gate

Status: **confirmed** document gap. Class: verification/acceptance boundary. Impact: frontend mock gate AC-01/AC-03, real integration gate AC-01/AC-03, final acceptance AC-01.

Input proof: [frontend gate](../task-drafts/SPEC-001/frontend_mock_integration_gate.md) AC-01 allowed “compatible executed evidence or explicit failing/blocked disposition”; [real gate](../task-drafts/SPEC-001/real_product_integration_gate.md) AC-01 similarly allowed an “explicit fail/blocked outcome.” Those are valid report contents, but did not separately state the milestone PASS condition. The [release gate](../task-drafts/SPEC-001/release_acceptance_gate.md) consumes these reports. SPEC-001 §§11–12/16 and SPEC-002 §8 require the actual applicable proof.

Fix: reports must account for all required IDs, but PASS requires all mandatory executed compatible proof; missing/failed/blocked proof yields FAIL/BLOCKED. The final gate explicitly rejects a complete failing report as a passing prerequisite. Added exact source-scenario coverage, coherent journey/provenance and required human/device evidence boundaries. Disposition: task-document gap fixed; real gate outcomes remain **not run**.

### GROOM-002 — HIGH: recording/activation race proof lacked a complete producer/consumer handoff

Status: **confirmed** ownership/proof gap; runtime race safety **unconfirmable**. Class: lifecycle/architecture seam. Impact: schema AC-03; mock workspace AC-02; mock preparation AC-02; real preparation AC-02; recording commit AC-03; both integration gates.

Input proof: [preparation coordinator](../task-drafts/SPEC-001/preparation_orchestration.md) promised capture-lock race evidence before its downstream [recording backend](../task-drafts/SPEC-001/recording_commit_backend.md) existed. The schema described revisions but did not name the common serialization owner. Mock [workspace](../task-drafts/SPEC-001/mock_workspace_persistence.md) and [preparation](../task-drafts/SPEC-001/mock_preparation_lifecycle.md) each touched the relevant state. SPEC-001 §8.1 requires one authoritative guard; D05 selects the actual lock boundary.

Fix: shared guard contract belongs to the schema/coordinator and mock repository respectively; both consumers must use it. Early fixture checks are explicitly narrow. The recording owner repeats both orderings through actual begin-capture/preparation endpoints, with stale window/edit/delete cases; the integrated gates repeat the seam. Disposition: ownership/check gap fixed; D05/D06 and real race proof remain blocked.

### GROOM-003 — HIGH: deletion/accounting/payment outcomes need an explicit scoped policy and consumer proof

Status: **confirmed** task-contract gap; **partial** shared-policy coverage, because D03/D08 intentionally remain open. Class: monetary/lifecycle handoff. Impact: policy AC-01; schema AC-03; mock preparation AC-02; credits AC-03; preparation AC-02; deletion AC-02; purchase AC-03; real gate AC-03.

Input proof: [deletion](../task-drafts/SPEC-001/sharing_project_deletion.md) fenced late media writers but did not explicitly assign pending reservation termination. [ledger](../task-drafts/SPEC-001/credit_reservations.md) covered failures generically. [purchase](../task-drafts/SPEC-001/one_time_purchase_fulfillment.md) covered a closed browser but omitted project deletion while payment succeeds. SPEC-001 §§8.1–10 require reconcilable monetary truth and an independent successful account purchase to survive project failure. D03/D08 have not selected the terminal outcome for deletion at each completion boundary.

Fix: policy investigation must expose that precise D03/D08 question; ledger owns policy-defined terminal recovery; preparation/deletion coordinate immutable attempt identities; deletion cannot erase monetary provenance. Purchase and integrated checks cover success during project deletion without losing or double-granting credit/upgrade. Already-issued URLs/cache/in-flight access require the real D08 delivery path, not just an API response. Disposition: task gaps fixed; the policy answer and real ledger/delivery proof remain blockers. No settle/release/refund rule was invented.

### GROOM-004 — MEDIUM: shell prerequisites and executable demo-session integration were implicit

Status: **confirmed** dependency/ownership gap. Class: decomposition. Impact: fixture AC-01–03; shell AC-02/03; upload UI AC-01; mock gate.

Input proof: [shell](../task-drafts/SPEC-001/visual_system_shell.md) required a permitted local example but depended only on runtime, while [fixtures](../task-drafts/SPEC-001/demo_media_fixtures.md) produced it. Shell session data was injectable, [workspace](../task-drafts/SPEC-001/mock_workspace_persistence.md) owned executable sessions, and no consumer explicitly wired the demo entry. SPEC-002 §§4.1/7 requires a working demo journey.

Fix: add the direct fixture → shell edge and exact reverse Blocks edge. Shell consumes the session facade; [upload UI](../task-drafts/SPEC-001/upload_preparation_ui.md) owns executable demo-entry/protected-return/sign-out wiring and session teardown. The integrated gate checks the real composition. Disposition: fixed; no backend/auth provider is added to the mock prerequisite graph.

### GROOM-005 — MEDIUM: baseline slot entitlement and durable eligibility consumption lacked explicit owners/checks

Status: **confirmed** ownership/verification gap. Class: account/entitlement handoff. Impact: account AC-03; mock credits AC-01/03; ledger AC-01; schema AC-03.

Input proof: [identity](../task-drafts/SPEC-001/account_identity.md) emitted eligibility for “credit/slot grants”; [purchase](../task-drafts/SPEC-001/one_time_purchase_fulfillment.md) owned the later upgrade and [upload](../task-drafts/SPEC-001/project_media_upload.md) consumed capacity, but the initial free slot writer was implicit. An event identity is not proof that [trial accounting](../task-drafts/SPEC-001/credit_reservations.md) survives consumer failure/replay. SPEC-001 §§4.6–4.7/7 requires both.

Fix: identity initializes the D04 baseline slot entitlement once, ledger consumes durable eligibility for the trial once, purchase owns the upgrade. Add duplicate/concurrent initialization and restart reconciliation checks; equivalent mock accounting uses named profiles. Disposition: fixed as ownership/proof; D02/D04/D11 quantities/eligibility remain undecided.

### GROOM-006 — MEDIUM: sample identity changes needed explicit requote/reconfirmation proof

Status: **confirmed** verification gap. Class: source/quote identity. Impact: mock preparation AC-01; mock credits AC-01; upload UI AC-01; real ledger AC-01; integrated gates.

Input proof: [mock preparation](../task-drafts/SPEC-001/mock_preparation_lifecycle.md) switched custom input to a sample and [upload UI](../task-drafts/SPEC-001/upload_preparation_ui.md) showed a service quote, but their checks did not explicitly reject the old differently timed source's quote. SPEC-001 §4.1 binds source/duration/policy/cost; SPEC-002 §§4.2/7.1 requires an honest identity switch.

Fix: test a differently timed sample, renewed source-bound quote/confirmation and rejection of old authorization. Real ledger checks changed/expired source-policy quotes without hidden repricing. File selection/purchase still never starts preparation. Disposition: fixed; production quote values/expiry remain D02/D03.

### GROOM-007 — MEDIUM: post-recording correction recovery and mock mutation ownership were under-specified

Status: **confirmed** task-scope/proof gap. Class: correction/current-take seam. Impact: correction UI AC-01; real corrections AC-03; recording commit AC-03; real gate AC-03.

Input proof: [correction UI](../task-drafts/SPEC-001/turn_correction_ui.md) allowed unspecified “mock mutation extensions,” overlapping the repository's mutation owner; its AC-01 checked additions without the source's concrete five-saved-takes case. [real corrections](../task-drafts/SPEC-001/preparation_corrections.md) seeded a take but did not name a later actual-flow recheck. SPEC-001 §§4.3/12 AC-06 requires corrections and a missed line after recording while honoring D05/D06.

Fix: UI owns interaction only, workspace/preparation own domain mutations. Check five saved takes then a missed line/recorded-turn edit with lock and compatibility evidence; early seeded checks are repeated using actual committed takes by the recording task and integration gate. Disposition: fixed; D06 grouping/edit recovery and D13 disposition still need owner decisions.

### GROOM-008 — MEDIUM: candidate/media timing and local-review proof needed observable assertions

Status: **confirmed** verification gap; physical quality/sync **unconfirmable**. Class: media/device proof. Impact: browser capture AC-01; recording UI AC-03; recording backend AC-01/03; render AC-01; mock result AC-01.

Input proof: [capture](../task-drafts/SPEC-001/browser_capture_adapter.md) measured a window without explicitly tying canonical/local duration to decoded candidate bytes; [recording backend](../task-drafts/SPEC-001/recording_commit_backend.md) checked permit metadata generically. [review UI](../task-drafts/SPEC-001/recording_review_ui.md) said “hear user/fixture capture plus background” but needed a precise video/audio/provenance boundary. SPEC-001 §§4.4–5 and SPEC-002 §7.2 distinguish real captured local review from a prepared downloadable sample.

Fix: [3,7] → [0,4] timing, actual decoded duration/tolerance and acoustic leakage; corrupt/wrong-duration/cross-account candidates rejected under bounded validation; actual voice/video plus one background and explicit D09 review profile; next-play identity and simulated-capture labels retained. Real render checks distinguish intentional original-voice mixing from measured separation remnants. Mock exports test named D07 eligibility and real fixture bytes. Disposition: fixed as test requirements; no tolerance, quality threshold, codec or local encoder selected.

### GROOM-009 — MEDIUM: foundation checks did not directly prove their stated rejection/error contracts

Status: **confirmed** verification gap. Class: API/authorization/validation. Impact: facade AC-03; workspace AC-02; upload UI AC-03; project source AC-02; ledger AC-01/03.

Input proof: [facade](../task-drafts/SPEC-001/frontend_service_contract.md) AC-03 promised replay/conflict/pending/unset semantics but its check only described minimal adapters and unavailable real mode. Several downstream checks were broad rather than identifying changed-input replay, previous-account responses, content-boundary cases or hostile captions required by SPEC-001 §§8–9 and SPEC-002 §§6/8.

Fix: add externally visible changed-input/replay/pending/stale/unset outcomes, session isolation, source duration/content/decoder-resource/expired-asset negatives, literal caption rendering and synchronized Original/background audition. These are boundary checks, not helper-call mirrors or assertions of deployed security. Disposition: fixed as verification contracts; real authorization/media safety remains untested.

### GROOM-010 — LOW: task and index review metadata would become misleading after grooming

Status: **confirmed** documentation state gap. Class: provenance.

Input proof: all tasks said independent review was pending, and README described only the author's 65-edge baseline as current. Fix: link every draft to this independent record, label author results historical, retain draft status and source revisions, and record current structural checks separately. Disposition: fixed. Review metadata is not a workflow advancement or accepted delivery.

## Evidence classification and rejected hypotheses

- **Confirmed:** GROOM-001–010 are document/ownership/check gaps, supported by the frozen inputs and the source clauses cited above. Their task-document patches are accounted for below.
- **Partial:** GROOM-003 now exposes a precise D03/D08 deletion/accounting decision; the general shared decision register exists, but no selected policy or runtime proof exists. GROOM-002/008 specify better checks without proving race safety/synchronization.
- **Refuted H01:** the frontend milestone does not require a real backend adapter; SPEC-002 FE-AC-09 and its gate already defer it correctly. Preserved.
- **Refuted H02:** the original mock scope did not promise arbitrary custom AI, user-take video rendering or global sharing; explicit fixture/same-browser limitations already existed. They were retained, not replaced by new product features.
- **Refuted H03:** there is no demonstrated need to split tasks by files/layers. The backend schema/runtime tasks have named consumers and bounded technical outcomes; real-adapter and final gates have distinct integration/proof purposes. The later delivery-environment task does not prevent earlier isolated setup supplied by runtime/source/job tasks.
- **Unconfirmable:** actual media quality/cost/latency, durable save semantics, device/acoustic synchronization, auth/payment correctness, distributed consistency, hosted revocation and every product AC. No document check is evidence of these behaviors or a confirmed runtime bug.

## Remaining decisions, owners and execution limits

The requesting product owner decides observable product/commercial policy; an authorized implementer supplies technical mechanics/evidence. None was assigned by this review. A task can consume a scoped resolved contract, not merely a completed investigation containing unresolved blockers.

| Decision | Concrete remaining answer/evidence | Main dependent work |
|---|---|---|
| D01 | Exact two-minute/media/language/device/export envelope | Source validation, capture, export, real gates |
| D02 | Rate/rounding/grant/free expiry/packs/currency/prices | Quote/trial/purchase and commercial evidence |
| D03 | Ready/partial/empty/failed retry/expiry/cancel/refund/reversal outcomes, including deletion across the completion boundary | Credit/preparation/deletion/purchase recovery |
| D04 | Free/upgraded slots and occupy/release lifecycle | Baseline account entitlement, project capacity, purchase upgrade |
| D05 | Authoritative first-recording event, failed/deleted-take behavior and racing commands | Shared guard, preparation and recording |
| D06 | Text/speaker/window compatibility, stale candidate treatment and grouping recovery | Corrections/current takes/export eligibility |
| D07 | Next/skip/zero/incomplete/invalidated-turn export and audio policy | Progression/result/rendering |
| D08 | Publication ordering, URL/cache/in-flight revocation, cleanup/retention/backups and account-deletion launch scope | Share/deletion/delivery and ledger handoff |
| D09 | Accepted layouts/labels, listening/readiness and single-turn overlap review | Visual/recording/recovery acceptance |
| D10 | Measured real pipeline, annotations, source normalization, pause/margins, tolerance/leakage and full timing/load/cost protocol | Feasibility, speech/background/capture/render and timing claim |
| D11 | Identity/recovery/trial eligibility, content/reporting/removal/support/release and account lifecycle | Identity/public release; included account-deletion work needs explicit ownership |
| D12 | Remaining toolchain/schema/driver/migration/worker/storage/payment/environment choices | Engineering foundations; React/Zustand and FastAPI/PostgreSQL/SQLAlchemy stay selected |
| D13 | Successful retry carry/reset/merge, matching conflicts/confirmation and concurrent edits | Replacement activation; named demo profiles may differ openly |

No additional product decision ID was allocated: GROOM-003's handoff and account-deletion scope are scoped questions under existing D03/D08/D11. If the owner includes account deletion or reporting/removal functionality at launch, assign concrete task coverage before dependent readiness; a policy note alone is not its implementation. No such feature was silently added here.

The current dependency order in README is retained after adding fixture → shell. Production handlers require applicable policy and architecture contracts; mock tasks may use explicitly named provisional profiles and a declared demo device/tolerance envelope. Shared facade/mock repository/schema/ledger writes require coordinated ownership. Investigation evidence is not acceptance, and no issue lifecycle/publication/commit/deployment authority follows from this review.

Next concrete action: resolve and approve the scoped source/demo decisions for the intended first execution slice, record owner/engineering assignments and execution authority, and only then reassess readiness. Broader production execution must await its applicable D01–D13 answers and feasibility evidence. No implementation was started by grooming.

## Per-task review accounting

Every row means an individual contract was read and checked, including scope/exclusions, producer/consumer ownership, dependencies, AC/check correspondence and delivery limits. “Retained” means no separate task-local defect was established; it does not mean ready or runtime verified. All rows received the common GROOM-010 provenance update. Criterion IDs below are local to the linked draft.

| Individual draft | Reviewed outcome / disposition | Impacted task AC / findings |
|---|---|---|
| [media_feasibility](../task-drafts/SPEC-001/media_feasibility.md) | Retained bounded investigation; real corpus/device/time/cost evidence remains required. | AC-01–03; retained |
| [frontend_runtime](../task-drafts/SPEC-001/frontend_runtime.md) | Retained isolated React/Zustand bootstrap, command discovery and fail-clear mode boundary. | AC-01–03; retained |
| [frontend_service_contract](../task-drafts/SPEC-001/frontend_service_contract.md) | Explicit replay/conflicting input/pending/stale/unset contract outcomes. | AC-03; GROOM-009 |
| [demo_media_fixtures](../task-drafts/SPEC-001/demo_media_fixtures.md) | Added reverse fixture-to-shell edge; playable permitted EN/RU annotations retained. | AC-01–03; GROOM-004 |
| [visual_system_shell](../task-drafts/SPEC-001/visual_system_shell.md) | Fixture prerequisite and session facade consumer; exact visual/accessibility scope retained. | AC-02/03; GROOM-004 |
| [mock_workspace_persistence](../task-drafts/SPEC-001/mock_workspace_persistence.md) | Single correction/capture guard owner; session/stale response and failed-save negatives. | AC-02/03; GROOM-002/007/009 |
| [mock_credit_accounting](../task-drafts/SPEC-001/mock_credit_accounting.md) | One eligible trial/baseline entitlement, source-bound quotes and replay/non-expiry proof. | AC-01–03; GROOM-005/006 |
| [mock_preparation_lifecycle](../task-drafts/SPEC-001/mock_preparation_lifecycle.md) | Fresh sample quote, shared capture guard and deletion/attempt accounting profiles. | AC-01–03; GROOM-002/003/006 |
| [mock_result_lifecycle](../task-drafts/SPEC-001/mock_result_lifecycle.md) | Named incomplete/invalidated eligibility and actual fixture-byte identity checks. | AC-01; GROOM-008 |
| [upload_preparation_ui](../task-drafts/SPEC-001/upload_preparation_ui.md) | Executable session wiring, source requote and synchronized safe preview. | AC-01/03; GROOM-004/006/009 |
| [turn_correction_ui](../task-drafts/SPEC-001/turn_correction_ui.md) | UI/domain owner separation; missed line after five saved takes and lock proof. | AC-01; GROOM-007 |
| [browser_capture_adapter](../task-drafts/SPEC-001/browser_capture_adapter.md) | Decoded duration/canonical-local mapping and separate acoustic evidence. | AC-01; GROOM-008 |
| [recording_review_ui](../task-drafts/SPEC-001/recording_review_ui.md) | Actual saved voice/video/background mix and unchanged active-playback identity. | AC-03; GROOM-008 |
| [results_projects_sharing_ui](../task-drafts/SPEC-001/results_projects_sharing_ui.md) | Retained truthful fixture output, same-browser public share, delete/cancel/recovery UI. | AC-01–03; retained |
| [credits_purchase_ui](../task-drafts/SPEC-001/credits_purchase_ui.md) | Retained explicit simulated purchase/return, authoritative ledger and narrow-screen checks. | AC-01–03; retained |
| [frontend_mock_integration_gate](../task-drafts/SPEC-001/frontend_mock_integration_gate.md) | PASS differs from report completion; actual composed seams and required manual proof. | AC-01/03; GROOM-001/002/004/006/007/008 |
| [production_policy_baseline](../task-drafts/SPEC-001/production_policy_baseline.md) | Scoped unresolved-decision handoffs and explicit deletion/account lifecycle questions. | AC-01; GROOM-003 |
| [backend_runtime](../task-drafts/SPEC-001/backend_runtime.md) | Retained real isolated PostgreSQL lifecycle and redacted failure/cleanup boundary. | AC-01–03; retained |
| [backend_contracts_schema](../task-drafts/SPEC-001/backend_contracts_schema.md) | Common serialization/accounting handoff and all producer/consumer ownership. | AC-03; GROOM-002/003/005 |
| [account_identity](../task-drafts/SPEC-001/account_identity.md) | Baseline slot initialization and durable eligibility handoff; account-deletion scope blocked. | AC-03; GROOM-005 |
| [project_media_upload](../task-drafts/SPEC-001/project_media_upload.md) | Actual duration/content/resource/capacity/authenticated-asset boundary cases. | AC-02; GROOM-009 |
| [credit_reservations](../task-drafts/SPEC-001/credit_reservations.md) | Eligibility consumption, historic/source-bound quotes and terminal deletion recovery. | AC-01/03; GROOM-003/005/006 |
| [processing_job_foundation](../task-drafts/SPEC-001/processing_job_foundation.md) | Retained durable restart/replay, version/deletion fence and sanitized progress checks. | AC-01–03; retained |
| [dialogue_preparation](../task-drafts/SPEC-001/dialogue_preparation.md) | Retained real annotated EN/RU/overlap/nonverbal/30-second/malformed output proof. | AC-01–03; retained |
| [background_separation](../task-drafts/SPEC-001/background_separation.md) | Retained source-aligned auditionable output and explicit quality/failure limits. | AC-01–03; retained |
| [preparation_orchestration](../task-drafts/SPEC-001/preparation_orchestration.md) | Shared guard and policy-defined accounting; inert proof repeated by real consumer. | AC-02; GROOM-002/003 |
| [preparation_corrections](../task-drafts/SPEC-001/preparation_corrections.md) | Five saved-take/locked missed-line recovery; seeded versus actual proof boundary. | AC-03; GROOM-007 |
| [recording_commit_backend](../task-drafts/SPEC-001/recording_commit_backend.md) | Bounded candidate validation and actual endpoint race/correction recovery. | AC-01/03; GROOM-002/007/008 |
| [full_video_rendering](../task-drafts/SPEC-001/full_video_rendering.md) | Observable new-voice/source/background proof; separation residue distinguished. | AC-01; GROOM-008 |
| [sharing_project_deletion](../task-drafts/SPEC-001/sharing_project_deletion.md) | Pending-credit handoff and issued-URL/cache/late-producer proof. | AC-02; GROOM-003 |
| [one_time_purchase_fulfillment](../task-drafts/SPEC-001/one_time_purchase_fulfillment.md) | Payment success survives originating-project deletion, independently reconciled. | AC-03; GROOM-003 |
| [frontend_real_adapter](../task-drafts/SPEC-001/frontend_real_adapter.md) | Retained full facade substitution, no fallback and real transport/media conformance. | AC-01–03; retained |
| [delivery_recovery_environment](../task-drafts/SPEC-001/delivery_recovery_environment.md) | Retained compatible isolated startup/backup/restore/rollback and delivery limits. | AC-01–03; retained |
| [real_product_integration_gate](../task-drafts/SPEC-001/real_product_integration_gate.md) | All 25 source scenarios; coherent actual journey, seam proof and strict PASS. | AC-01/03; GROOM-001/002/003/007 |
| [release_acceptance_gate](../task-drafts/SPEC-001/release_acceptance_gate.md) | Full BR/project/frontend evidence audit; no complete-but-failing prerequisite. | AC-01; GROOM-001 |

## Bounded recheck and executed document checks

Round 1: reviewed all 35 drafts and patched GROOM-001–010 within source behavior. No task split, source-policy change or new feature was introduced. One dependency was added, with its exact reverse edge.

Round 2: rechecked changed seams and direct siblings: fixture/shell/session composition; eligibility/slot/trial; sample/quote identity; preparation/recording/corrections; deletion/accounting/purchase; capture/review/render provenance; gate verdicts. Explicit contract-fixture versus real-consumer proof and source policy boundaries were retained. Required document-check results are recorded below after execution. No new full-package pass or expanded runtime test campaign is implied.

Command: `python C:\Users\roman\AppData\Local\Temp\dubbed_task_grooming_check.py` (Python 3.13.6, Windows PowerShell, workspace `D:\Program\python\Dubbed`, 2026-10-20). Temporary checker/snapshot are review tools outside the application tree. Evidence: this report, exact file hashes below and the command output in the review turn.

| Executed check | Result |
|---|---|
| All required fields, honest anchors, draft/not-synchronized status | PASS — 35/35 drafts |
| Local task AC IDs versus ordered verification rows, uniqueness | PASS — 106 matching rows |
| Dependencies reference existing tasks, no self/duplicate edges | PASS — 66 direct edges |
| Dependency acyclicity and exact reverse direct Blocks | PASS |
| Proposed README order includes every draft exactly once and is topological | PASS — 35 entries |
| Every draft reaches final acceptance through dependencies | PASS — 35/35 |
| Mock gate has no production-policy/feasibility/real-backend prerequisite | PASS — 14 mock prerequisites; zero production prerequisites |
| Declared project/frontend AC coverage and actual indexed drafts | PASS — 25/25 project, 10/10 frontend; spec indexes resolve without duplicate entries |
| BR traceability rows link to actual draft owners | PASS — 22/22 rows; semantic ownership separately reviewed above |
| Local Markdown links and explicit heading anchors across package, report, sources and HANDOFF | PASS — 656 links, 2 explicit anchors, 42 files |
| Task/report/source whitespace checks | PASS |
| Input/output source fingerprint comparison | PASS — both specs, BR and brainstorm unchanged |
| Mutation boundary | PASS — 35 draft review records/task edits + README; one added report; no product files |

Coverage/link checks establish declared document consistency, not that a future test will prove the outcome. The source matrices and gate scenarios remain the required behavioral proof. A link count excludes external URLs; this review did not browse or verify their content. Check output: `{"acyclic": true, "added_report": 1, "br_rows_with_existing_task_links": 22, "direct_dependency_edges": 66, "exact_reverse_blocks": true, "explicit_local_anchors_checked": 2, "fields_complete": 35, "frontend_ac_coverage": 10, "local_links_checked": 656, "matched_ac_verification_rows": 106, "mock_prerequisites": 14, "modified_existing_files": 36, "product_tests": "NOT RUN", "production_prerequisites_of_mock": 0, "project_ac_coverage": 25, "source_files_unchanged": 4, "task_files": 35, "tasks_reaching_final_gate": 35, "topological_order_entries": 35}`.


Executed document checks do not establish product readiness, human acceptance, visual fidelity, real-service correctness or an SLA. Product checks are **NOT RUN**; applicable decisions/environment/device/provider access are **BLOCKED/UNRESOLVED**. No missing evidence was waived.

## Frozen file fingerprints

SHA-256 input/output fingerprints cover exact reviewed bytes. Source revision labels and hashes do not imply approval. The report itself is excluded from its own fingerprint manifest. README is an index, not a 36th task.

| Frozen artifact | Input SHA-256 | Groomed SHA-256 |
|---|---|---|
| `_docs/specifications/SPEC-001_dubbed_mvp.md` | `0afda5ae42f5096dc7ff60f4655b5193acc2065258280bb46c35a36995a48cc0` | `0afda5ae42f5096dc7ff60f4655b5193acc2065258280bb46c35a36995a48cc0` |
| `_docs/specifications/SPEC-002_frontend.md` | `fb21819a91ffc40a442d1b70559b5aefd1d1fd15fc4b45cb6cc69dc1da9e6604` | `fb21819a91ffc40a442d1b70559b5aefd1d1fd15fc4b45cb6cc69dc1da9e6604` |
| `_docs/business-requirements/BR-001_custom_video_dubbing.md` | `a93bd9f1c3af2965a7d32c5ab519b1177433086e91e355d1d28690f88e17c866` | `a93bd9f1c3af2965a7d32c5ab519b1177433086e91e355d1d28690f88e17c866` |
| `brainstorm.md` | `fa30661d3880dabe26cdeabc7c2f327a2af846d96eba9291b746cb99d95e40d5` | `fa30661d3880dabe26cdeabc7c2f327a2af846d96eba9291b746cb99d95e40d5` |
| `_docs/task-drafts/SPEC-001/account_identity.md` | `a4764564a3898f80b74631364520ac4fadf9f37343ccb7adb056bfa03b1fc4e1` | `086fb9ba8857b3b4c7b1745155a620b482b4914064edbb45f00fdf83e6f6f459` |
| `_docs/task-drafts/SPEC-001/backend_contracts_schema.md` | `0950f41cf45720c73a998f207421a074de93f1f10c05d84fc395b52014dd17fb` | `590b1bea516f5be8d01a11e8e8297a174261f45d4fe2907d8d6201c490a48fe3` |
| `_docs/task-drafts/SPEC-001/backend_runtime.md` | `91fd7a3d675a288e7fa852841944f02756fe10ad6b979458fb7ff2bd98f1accb` | `7f8e17e4e892a232d06757877845ac0896b777bee99d429a97f55ed5106a38ed` |
| `_docs/task-drafts/SPEC-001/background_separation.md` | `458b8b55900cbf441e27dd2fd029fc98c3cc3fda5173e5454da975751ede946b` | `b1dcc1f5a2267a072b2b6f7b602dd9abafa7302a2ef883df1259c9b54f467cc5` |
| `_docs/task-drafts/SPEC-001/browser_capture_adapter.md` | `8da6153dcb0e2794ec83a8c9f78ee2ed5832f673526f152cf912a4b39d2c2301` | `563a95fcc3318d1524cc643a442779ec6514667d304288095cfc7c7f7663b5b3` |
| `_docs/task-drafts/SPEC-001/credit_reservations.md` | `2a81a8baf55221f825cc64b0fe4a86e530f525d6505db53ed316e2a9e2bbd782` | `0a5fce27e9899f6b5da2219c79b0ace165327477de1b28f3c53c03ba49fdff49` |
| `_docs/task-drafts/SPEC-001/credits_purchase_ui.md` | `e8ecb6414d5607325671d35961ef4e3debc2826f63cf4505de217a5c299101ad` | `19a47c391388aca35e614a9e6bc895d3cf4e6d0f61d6087d40e442a1f5162497` |
| `_docs/task-drafts/SPEC-001/delivery_recovery_environment.md` | `99ef737c49500fd15a4a1f0a0f83d19ee6076051ab3f5bd454a2a9927225c233` | `34c0dcfe20a50e2cfe694dd593dc1502a64dcb0f26242c254d6d340cf05eeed1` |
| `_docs/task-drafts/SPEC-001/demo_media_fixtures.md` | `c685c7bc5162154b4c1c04c8b9a9450ad0625f8a63d4e79e9e3deec38a8d6fc9` | `8184282839632fda794644a638496bda519bef484d96d64606b80d4c764e8be3` |
| `_docs/task-drafts/SPEC-001/dialogue_preparation.md` | `cba55639911f3c4499bb26d1808829db347ac5a8b8ccde6a7d656cc8f3fa3a42` | `ed54753bd3832462337f33808a52952a5e579be67215ecc796c6747d895b1059` |
| `_docs/task-drafts/SPEC-001/frontend_mock_integration_gate.md` | `d64230001fd82f0c87f61842bdbb56958d2b4cb4ca89418b453f50482f84df1f` | `d40426884a4924cf09735690733127e7d80bf17428aa39c6cd8d15f12f55f7bc` |
| `_docs/task-drafts/SPEC-001/frontend_real_adapter.md` | `00bfa0518775ff995fc191dd78867dd418473875dd05b566af68620cc58da1d4` | `da5e15bd5b943e37826787b0036e7ea2619466cd6d496ac146656fe6e5fc9453` |
| `_docs/task-drafts/SPEC-001/frontend_runtime.md` | `d916567284b8e69441dafa2c082e174246a854a53e8c5eed78df0456baf1e8d2` | `7d6be3108280df793172c85421956b6f144685372c76d4b3dd14af08c3d7eace` |
| `_docs/task-drafts/SPEC-001/frontend_service_contract.md` | `76bb2323e76615b13f2879a141f1242ea92f83be5fecd936ca7d660e7f022d63` | `380b7c88fbb065a7997665d564fd9276afda5098952243c04b0df4bcefd121ae` |
| `_docs/task-drafts/SPEC-001/full_video_rendering.md` | `2b3d53be7daf79e5c68b1650f5ee4857db10f48d77a1b7818e6277b6cc52d9d8` | `864fa75453d1bf5255b6cc01a85dc824c25c00182f6cd99eb041d725e50e7466` |
| `_docs/task-drafts/SPEC-001/media_feasibility.md` | `0ecd1384bfed41980a2f3563e8110f181178e905903e2ea8279fe456ec53cbaf` | `0e521220b184d3e4bcfab03377fa6d67597d3818fcf36a702d2f8ee031b1aec8` |
| `_docs/task-drafts/SPEC-001/mock_credit_accounting.md` | `ab2a8081d832f26177ca1fcad1c979979f15a42427fb7d08bbddce78ab9af323` | `15071b0e94f3b7a5bdacaa8c73be731ec6613792e177d372cb5c230d35d820df` |
| `_docs/task-drafts/SPEC-001/mock_preparation_lifecycle.md` | `963e0400b85c2335bca269eb246764a68309b40435b09864209091a32a8b5dae` | `d1e8182f00fcfabfd5d08bf91b1401bb9d1dc09fccf007d1c6c4e08e1760d9e1` |
| `_docs/task-drafts/SPEC-001/mock_result_lifecycle.md` | `82c196ad8f0b17e577b001198b2acb8f86bbbd0c2961c3beac49e36fa5567360` | `3457c51da02325336164714c7709ee6e414166de59130e50bd520a522d67b8b2` |
| `_docs/task-drafts/SPEC-001/mock_workspace_persistence.md` | `40b54bab2792d3f5b44186c4d4aef4d433f019bb8a83336aeb181935eae57b1c` | `63dae90c52c4c0dc228ea23af39cab91ea645df77bde77fbdd8828e36b2ddb61` |
| `_docs/task-drafts/SPEC-001/one_time_purchase_fulfillment.md` | `9206b4ea940cbd24671115b4692bd067d1ed521d84ce15bf7e39abfebf16802d` | `ac08e0e066427583ac4ff5aedc7cbe758f78b279a8d8b9a61fd32506223947ab` |
| `_docs/task-drafts/SPEC-001/preparation_corrections.md` | `04c4397c8bcc304612403e250de5ea1c6a1fe070001c695967c701a903562205` | `fd696c0af2c1d295f3cb44ed3c00022b38e9a9906474c58a09249e5d333dc297` |
| `_docs/task-drafts/SPEC-001/preparation_orchestration.md` | `541a534f15168becb2d0f6e3ed00ddb06d18bf237904cc29c16dfe919ceee958` | `e2c63de2f046c7b7fd337b0cb055f61122d2d7fb9a56759d9374174bc0f1473b` |
| `_docs/task-drafts/SPEC-001/processing_job_foundation.md` | `11721ad51bacba08f712675a85916972b6cdffb2660cfe3ba0cf5e7ea72efb83` | `0570454166bb07a422d44b2e7254a90c5096eddd307e291eb047994f0e0b9cfd` |
| `_docs/task-drafts/SPEC-001/production_policy_baseline.md` | `86b682ddb3c1ac541a4f8fe004d1f3767468556a651054d1158290dc382aa739` | `096b3f736ba7a5fa011be5848e2a9956182b9754dca12296c212b7f27648168c` |
| `_docs/task-drafts/SPEC-001/project_media_upload.md` | `226463f796bd8a13920ec75e1345db1b53f4fff8c3b390199a2f0ffce5ee510a` | `43357a52d5134261d73d5303121b96eec7fa96b121e11300c0c56052d128849b` |
| `_docs/task-drafts/SPEC-001/README.md` | `77a3e333ddf85df5be924a82dfbe7fa1afb7c127a273e8d6dda46d4455ce7092` | `b1e623ebef5c2bdf368c7fee123fa463e405a8b34efabc7718e69dc46a0ed9a2` |
| `_docs/task-drafts/SPEC-001/real_product_integration_gate.md` | `2cdd7143939999fe2c9c6056980a4b8a715f9426be9795e5378d87b36dac8bac` | `f5928d8edd1ef4d66bf41b93b1881758042226557d861b3113e1a76b7eb14dd5` |
| `_docs/task-drafts/SPEC-001/recording_commit_backend.md` | `03d26ccf4ee4609df53a1ee1c2748493b659600d5eec4d8033a0515becec15fe` | `9e5eb5e5a08cb6bbb9fcc416c436be9c5b39511540b3c66c48760e0ed0264eb9` |
| `_docs/task-drafts/SPEC-001/recording_review_ui.md` | `5c31fed7f16817f7ae7cc00c9a2ab7a01a0f62a20c3b39b82fab76430246a1af` | `78b3eca2450e3f89b3112f6331c9198108427f2cda0557dab1173ccec8189269` |
| `_docs/task-drafts/SPEC-001/release_acceptance_gate.md` | `7deb5e3719294a72d48a9c420cab087a46499c041d5aef4211d0784d1aca428d` | `b23556657db71dbceb5f551486b0790478997c6f279b596fc1cebb64decbc27c` |
| `_docs/task-drafts/SPEC-001/results_projects_sharing_ui.md` | `223dc82f2735a9bfbc59e7fb06fc925ed14d28627f021355342da4e3abab1624` | `e67ee0a1029a49c59413f82d8edabb8328e9fddbab795ecccf3d96af018ff2ab` |
| `_docs/task-drafts/SPEC-001/sharing_project_deletion.md` | `929c25ceee198ee4adbd8c6d618f0cdfe069135479d77027849c582c8d195d02` | `3627b02aea60759e5bc5572ea8cb68abbcfd61efa7d051b3661a3f4e8162207c` |
| `_docs/task-drafts/SPEC-001/turn_correction_ui.md` | `9edf22699c3760cc93bbb8a196ad249ce85fafd45a4522249895de5c75f87065` | `ee949f65ffac73d4f8798b754a227f93c23188a8cc0d8806e084f44665b22398` |
| `_docs/task-drafts/SPEC-001/upload_preparation_ui.md` | `54f899688de1937a73037599f8dec24925d225da319e3e5fc321613f8470c9e6` | `b79d563df3052840cea94921ec14252752da3cd0f8b2573989f5f2e7ecc2b0cd` |
| `_docs/task-drafts/SPEC-001/visual_system_shell.md` | `a0f44beefa9f74e4085af31a238a527280ba50a7f26850fa983440db6a47464a` | `4b532db2e2c23e51dac944f6c4c834055f7e35ca459c56ed2a1a49e68eab54ba` |
