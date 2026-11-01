# Dubbed handoff

## Current scope and status

2026-10-30 visual-copy correction: the owner rejected the earlier implementation's visual approximation and explicitly required copying the prototype markup/CSS into React. The source-based A/B Record and Result port now supersedes that earlier visual acceptance. Independent [visual parity v4 review](evidence/core-journey-ab-implementation-2026-10-28/integration-review/visual-parity-v4/REVIEW.md) passes; VP01–05 are resolved. Root checked all 47 current hashes, HTTP 200 and paired actual-route screenshots. See [local correction acceptance](evidence/core-journey-ab-implementation-2026-10-28/visual-parity-v4/ROOT-ACCEPTANCE.md). Real waveform samples and truthful illustrative-result copy intentionally differ from prototype fixtures. No commit, push, publication or live experiment occurred.

2026-10-28 owner: “Окей. Ну тогда продолжи разработку”. Continue BOTH current A/B candidates through the complete local prepared-video→Record→Result increment:contract/package review,implementation,automated/browser verification,fixes,independent review and final connected proof. This lifts the prior local design-transfer/contract hold only for this slice. It does not lift GitHub mutation,commit/push,deployment/live-experiment holds or authorize unrelated flows/backend. No winner selected.

Current targets:A [panel-highfi-v7 / LogOut amendment](../prototypes/core-journey-lowfi/BRIEF.md),B [studio-highfi-v1 / LogOut amendment](../prototypes/core-journey-studio/BRIEF.md). Historical A3/studio-v6 approvals and subsequent explicit design corrections remain provenance;do not invent a separate unseen paired high-fi approval. Both focused pages use Exit,no globalnavbar/speaker identity/repeat-preparation/legend;A video centered with right panel,B centered controls,shared title/dots/wave rhythm and custom Result Original/My dub.

Current stage: **Bounded local A/B frontend implementation accepted by Root on 2026-10-29.** The [paired contract/package review](evidence/core-journey-ab-contract-sync-2026-10-28/review/REVIEW-v2.md), Luna Max implementation and fixes, [independent integrated review v4](evidence/core-journey-ab-implementation-2026-10-28/integration-review/revision-v4/REVIEW-v4.md), and [Root final connected proof](evidence/core-journey-ab-implementation-2026-10-28/root-final-2026-10-29/ACCEPTANCE.md) are complete for this local increment. Frontend now exists at `frontend/`, preview http://127.0.0.1:5180/. Both A/B native-capture-to-Result journeys pass, with 17 unit tests, typecheck, lint and build. IR01–13 have no material open finding. Preserve the dirty tree; no commit, push, GitHub mutation, deployment or live experiment occurred. Historical prototype and single-target packets remain references, not the running implementation.

Scope starts with an explicitly seeded account-owned prepared project. Build one typed Services facade/backend-free persistent mock and shared Record/Result controllers with BOTH layouts;real browser microphone capture/actual Blobs,not prototype timers/synthetic takes. Fixed Result MP4 remains explicitly illustrative,not custom mixed output. Full auth/onboarding/upload/Processing/Projects/Settings/Credits UI and real backend/render/lease/private delivery are excluded except honest guarded boundaries. Microphone check is once onboarding before registration,then Settings only;Record can acquire input for explicit capture and link Settings after failure,never embed setup.

Future A/B direction is50/50 persistent per user with main durable-result completion metric. Current local fixture selection/override is not a live allocation/tracking system. Identity/privacy/analytics/retention/attribution gates remain separate and do not block local core implementation. No telemetry or public experiment is authorized.

Published issues#61–82 remain task authority;the current packet records live read-only status/dependencies and exact stale alignment. GitHub updates are held,no duplicate task bodies/local queue and no issue acceptance/closure is claimed. Local dispatch requires package review of the bounded current contracts/authorization. Preserve account/session/operation identity,unknown-save reconciliation,candidate/accepted safety,exclusive capture,immutable generations and deletion fences. #76 remains blocked/deferred for real services.

## Workspace and connection

- Workspace: `D:\Program\python\Dubbed`.
- Repository origin: `https://github.com/dystrophyless/dubbed.ai.git`; verify the current branch, commit and upstream with Git before delivery.
- Selected stack: React + Zustand frontend; FastAPI + PostgreSQL + SQLAlchemy backend. Backend/production and the deferred real adapter are outside this frontend specification correction.

## Entry points

- [Quick start](../README.md) and [agent instructions](../AGENTS.md)
- [Development orchestration](orchestration.md), [frontend design-first workflow](frontend-design-workflow.md) and [SDD guides](sdd/README.md)
- [Product brief](PROJECT_BRAINSTORM.md), [BR-001](business-requirements/BR-001_custom_video_dubbing.md) and [SPEC-001](specifications/SPEC-001_dubbed_mvp.md)
- [Active frontend flows](frontend-flows/README.md), [current tokens](frontend-flows/design-tokens.md) and [Affect UI workflow](frontend-flows/affect-ui-workflow.md)
- [Frontend issue index](task-drafts/frontend-flows/README.md) and [SPEC-001 issue index](task-drafts/SPEC-001/README.md)
- [Current UX audit](evidence/ux-root-cause-audit-2026-10-26/report.md)
