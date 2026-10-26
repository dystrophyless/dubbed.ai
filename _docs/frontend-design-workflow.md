# Frontend design-first workflow

Owner-adopted on 2026-10-26. This is current project policy. The historical [model and role proposal](evidence/ux-root-cause-audit-2026-10-26/model-role-workflow-proposal.md) and [conceptual design proposal](evidence/ux-root-cause-audit-2026-10-26/design-workflow-proposal.md) remain unchanged evidence; this guide records the adopted workflow.

## Scope and lightweight path

Use this workflow for meaningful new frontend screens, redesigns, changed content hierarchy or navigation, and connected journeys whose interactions or user purpose need design. Run the visible design checkpoints before finalizing the affected specification and task contracts or starting production integration. A short design brief and bounded prototype can come first; exhaustive specification and issue publication are not prerequisites for drawing a reversible proposal.

A small isolated fix with stable, already-approved composition can go directly to a focused Luna implementation and checks. A faithful instance of an established approved pattern may begin with a high-fidelity preview and scoped review. Keep backend and other non-frontend work on the existing SDD sequence. Do not create a duplicate BR/spec or full-flow redesign for a local fix.

An approved prototype is a design artifact, not a production backlog, implementation acceptance, or release decision. Published GitHub issues remain task authority; update them under the existing authorization and lifecycle rules.

## Roles and model policy

| Responsibility | Owner | Boundary |
|---|---|---|
| Coordination and final acceptance | Root/main agent, with its existing user/app-selected model unchanged | Set scope and permissions, keep one version, present owner decisions, verify delivery and acceptance. Do not pretend to change the main-chat model. |
| Design lead | `gpt-6.1-sol`, high | One persistent owner for the slice: purpose, content, journey, runnable prototypes, revisions, and synchronization of affected specs/tasks. |
| Independent design/contract reviewer | Separate `gpt-6.1-sol`, high | Review low-fi, high-fi, and affected contracts independently. The reviewer is not the author and does not begin from an instruction to confirm PASS. Use a fresh review context after production integration. |
| Production frontend executor | `gpt-6-luna`, max | Integrate the approved target with services, mock, domain behavior, accessibility, and checks. No silent redesign. |
| Mechanical publisher, when authorized | `gpt-6-luna`, low | Transfer exact reviewed issue/status/evidence decisions. It makes no product or acceptance decisions and is not required for local documentation. |

Use this Sol/Luna allocation; future Astra work is excluded under the owner's cost constraint. The normal planner, reviewer, executor, and publisher assignments in [orchestration](orchestration.md) remain in force for other work.

## Sequence

1. **Root scopes one connected slice.** Capture the user and job, current owner decisions, relevant contracts, important conflicts, invariants, permissions, and intended evidence. Keep unresolved consequential choices explicit. Do not turn the brief into exhaustive layout prose.
2. **The design lead makes the brief and low-fi.** Write a short purpose/content/journey brief and an actual runnable low-fidelity browser prototype with realistic content. Show desktop, phone, and the relevant short-screen composition; connect actions and the important neighboring states. Prototype code is allowed as part of this design assignment in an isolated preview. Simulate technical outcomes honestly, with scenario controls outside the intended product surface. Do not mutate production services, perform real payments or destructive actions, or present simulated outcomes as real.
3. **A separate Sol reviewer critiques the low-fi.** Test whether the design serves the user's job, can be understood without coaching, preserves required behavior, and works as a connected journey. Review the design itself, not only conformance to existing prose. Return evidence-based, prioritized findings; the design lead revises and records dispositions before owner review.
4. **Owner checkpoint 1: structure and interaction.** Present a named artifact version, preview/captures, task script, covered screens/states/viewports, known limits, and at most two or three consequential decisions. Ask about purpose, content priority, grouping, and interaction direction, not each pixel. The owner's explicit reply is required before high-fi proceeds. Do not request approval to draw a reversible proposal when the design work itself was requested.
5. **The design lead calibrates components, then produces high-fi.** Complete the [internal component calibration](#internal-component-calibration) after checkpoint 1, then build a runnable high-fidelity browser preview of the accepted structure with realistic content and selected relevant states. Apply the owner-selected Affect UI Clean/Light language, Mabry Pro, and Lucide's outlined treatment (1.1 stroke, no fill, currentColor, rounded caps/joins). Follow the [component reference workflow](frontend-flows/affect-ui-workflow.md), but treat component samples as component evidence, not a page layout or content prescription. A source example's missing marketing content is not a blanket ban on useful, truthful product explanation. The independent reviewer checks actual operation and screenshots against the user job as well as the adopted visual contract; the lead resolves findings.
6. **Owner checkpoint 2: visual/interaction handoff.** Present the high-fi version, meaningful changes, named states and viewports it covers, and limits that remain. Record the owner's explicit decision and its scope. Approval is not evidence for unseen states, production reliability, or release readiness.
7. **The design lead synchronizes affected contracts.** Update shared requirements only where the approved design changes them; finish the affected specifications and task drafts/issues, with a direct reference to the approved artifact and checkable scenarios. A bounded independent review checks contradictions and connected-package coverage. Product integration waits until the necessary behavior and task contracts are resolved. Do not keep a parallel local task queue or treat the prototype as one.
8. **Luna Max integrates production behavior.** Implement the approved design through the existing service/mock and domain boundaries, preserving the invariants and validation. Reuse prototype code only after checking production suitability. If an integration obstacle requires a meaningful design or behavior change, stop on that slice and return it to the design lead; do not silently substitute a new layout.
9. **A fresh Sol reviewer and Root check the integrated result.** Review the real screens, task journey, behavior, and code against the approved artifact and contracts. Root verifies raw evidence and the existing acceptance and delivery gates. Screenshots alone do not prove interaction, persistence, accessibility, or recovery.

For a design change that fails its purpose, propose the necessary contract correction; do not preserve bad UI requirements as if they were business invariants. Keep account isolation, credit authorization, draft/candidate/source preservation, single-capture behavior, and generation identity intact. Landing must truthfully explain the product, value, intended result, user effort, and next step. Do not use an obsolete sparse-content clause as acceptance, ban useful marketing content just because it was absent from an old spec, or invent prices, product claims, or testimonials.

## Internal component calibration

After owner checkpoint 1 and before styling the whole high-fi page, the Sol lead opens 3–6 applicable selected Light PNGs and their matching Clean CSS. Use the catalog's [visual entry](frontend-flows/affect-ui-clean-light-reference.md#start-here) to choose references; composition-only examples do not supply new exact CSS recipes.

Build a small calibration area inside the same authorized prototype using Mabry: normal/hover/focus/disabled/loading buttons, a surface/menu, an invalid field and one actual derivative where needed. This is internal lead/reviewer work, not a third owner checkpoint, a whole-library audit or authorization to create an application in a documentation-only task.

Compare actual browser component crops at normalized CSS scale, recording DPR/zoom and the Inter-to-Mabry text-width difference. Explain legitimate font, contrast, focus and target adaptations. Fix unexplained shape, edge, shadow or density mismatch in the shared recipe before composing the whole page; do not accumulate screen-local overrides. Existing token defaults remain until an approved calibration/prototype change is reflected in the canonical tokens and affected flow contracts before integration.

The independent reviewer checks the calibration as well as the page. After two substantial failed calibration iterations, revisit source mapping rather than adding overrides or changing models/agents. Whole-page review remains separate: user hierarchy, grouped actions, readable EN/RU content, phone/short-screen operation and realistic normal/recovery states must work in the connected journey.

## Approval, evidence, and readiness

Design approval is an explicit owner decision on a concrete version. It cannot be inferred from silence, elapsed time, or delegated rule-based issue acceptance. Bundle only the consequential choices for the slice; no approval is needed for every spacing correction.

Record the current approved artifact/version, the scope of the owner's decision, a link to the owner's reply, relevant captures, covered screens/states/viewports, exclusions, and known limits with the current design or specification. A mutable localhost URL alone does not identify what was approved. Do not maintain a separate ADR or immutable artifact archive; ordinary authorized commits record normal Git history. A change to purpose, content priority, page grouping, navigation, consequential copy or interaction reopens only the affected approval. Faithful spacing, wrapping, and implementation corrections do not reopen it.

| Gate | Evidence required |
|---|---|
| Design-ready | Short job/content brief; actual low-fi desktop, phone, and relevant short-screen views; realistic content; connected actions; material conflicts and limits stated; independent review findings addressed. |
| Implementation-ready | Both applicable owner decisions recorded against named versions; high-fi target and important states shown; affected contracts/task scope synchronized and independently checked; invariants, ownership, and verification plan clear. |
| E2E-ready | A person can complete and repeat the intended journey, understand failure, and recover in the actual integrated runtime. Verify behavior and required checks as well as visual fidelity; report mock/backend, device, and other limits. Screenshots alone are insufficient. |

Review high-information paths, not a screenshot quota. For Record, include replay from the end, candidate audition, rerecord, accept/Next, and failed-save recovery with the take retained. For other slices, choose the equivalent normal, repeat-use, and highest-impact recovery cases. Test actual runtime behavior; low-fi simulations are design evidence only. Keep the scenario selector separate from the proposed product UI.

After two substantial iterations fail on the same UX concern, revisit the assumption and present a materially different direction instead of continuing cosmetic adjustments. If review uncovers an unresolved owner decision, pause only the dependent slice.

## Coordination

Keep one design owner per connected slice and respect the live agent-slot limit, with at most Root plus three active agents. Reuse the lead for revisions, the reviewer for bounded design/contract follow-ups, and Luna for integration fixes; do not add agents per pixel. Parallel writing may start only after a common approved version exists, with non-overlapping ownership. Keep dependent decisions and approvals sequential, then recheck the connected journey after integration.
