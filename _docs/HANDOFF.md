# Dubbed handoff

## Current scope and status

The frontend directory has been removed at the owner's request, including its source, dependencies, assets, application tests and build outputs. No runnable frontend remains. Specifications, workflow and the current UX audit are retained. Landing must explain the product, truthful intended result/value, user recording effort and clear next step. Record uses a focused performance loop, sequential accepted-take navigation and useful recovery feedback. The twelve [active flows](frontend-flows/README.md), [shared requirements](frontend-flows/00-shared-contract.md) and [implementation contract](frontend-implementation-contract.md) define the corrected requirements.

New composition, selected proof assets, phone/short-screen behavior and bounded direct-action/Settings details still need the [design-first workflow](frontend-design-workflow.md) checkpoints. The [current UX audit and appendices](evidence/ux-root-cause-audit-2026-10-26/report.md) remain the supporting analysis. Specification changes do not establish prototype approval, current runtime conformity, product acceptance or production readiness.

The frontend scope is the existing 22 issues #61–#82, with [#76](https://github.com/dystrophyless/dubbed.ai/issues/76) deferred for the real adapter and its external prerequisites. Earlier implementation and test results do not establish current readiness after removal. Preserve the dirty worktree; read live issue status before lifecycle changes. [Published issues and dependencies](task-drafts/frontend-flows/README.md) remain the task authority. Issue bodies were not changed by removal and must align with the corrected specifications before implementation. Removing the frontend does not start a replacement implementation or change issue acceptance or closure.

Any future frontend must use the typed centralized Services facade and interchangeable backend-free mock. Mock evidence is separate from real auth, email, payment, media, device, storage and production proof. Preserve account/session/operation identity, unknown-outcome reconciliation, credit authorization, candidate/accepted-media safety, one capturing tab per project, immutable result generations and deletion fences. No automatic processing/purchase follows navigation, reauthentication or a credit return.

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
