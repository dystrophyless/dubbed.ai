# Model and role workflow proposal for Dubbed

Author: GPT-6 Astra, Medium (this recommendation only). Status: recommendation for owner adoption, not an enacted policy or implementation authorization. No models, product files, specs or issues were changed. This operationalizes the [design workflow proposal](design-workflow-proposal.md), grounded in the [audit](report.md) and [page evidence](page-evidence-matrix.md).

## Recommended allocation

Respect the owner's cost constraint: **no future Astra work**. Use **one persistent Sol 6.1 High design lead, Luna Max for production integration, and a separate fresh Sol 6.1 High reviewer at bounded milestones**. Keep Root as coordinator. Keep the reviewer context for bounded low-fi/high-fi follow-ups; start a fresh context for production review. Request delta reviews after fixes, not repeated whole-project audits. High effort is assigned to the coupled design decisions and independent judgment; Luna Max remains the explicit owner instruction, not a claim that every task needs maximum effort. The important change is that design authority produces visible, operable designs before production execution; it does not merely write more instructions for Luna.

| Responsibility | Exact model / effort | Ownership |
|---|---|---|
| Coordinator | Existing Root model/effort, unchanged; policy preference is `gpt-6.1-sol` / `high` | Scope, permissions, versions, dispatch, integration verification, acceptance and owner communication. Main-chat model is user/app controlled. |
| Product/design lead and planner | `gpt-6.1-sol` / `high` | User purpose, truthful content, hierarchy, connected interactions, responsive composition, runnable low-fi and high-fi prototypes, owner revisions and design decisions. |
| Independent reviewer | `gpt-6.1-sol` / `high` | Independently critiques demonstrated UX and contract consistency, then production behavior/code. A writer cannot review its own artifact. |
| Production executor | `gpt-6-luna` / `max` | Approved design integration, services/mock boundaries, real interaction logic, accessibility, tests and fixes. Max preserves the owner's current implementation choice. |
| Mechanical publisher, only when authorized | `gpt-6-luna` / `low` | Exact reviewed issue/status/evidence updates and authorized delivery actions; no design or acceptance decisions. |

These assignments exclude Astra from future execution and preserve the owner's Luna Max implementation and Sol 6.1 High review choices. The same Sol design lead also synchronizes specs/tasks, avoiding a second planning handoff. They are a practical division of responsibility, not demonstrated model rankings. The audit did not isolate model ability from weak briefs, mandatory anatomy, review scope or orchestration. Increasing effort everywhere would leave those causes intact.

**Two explicit policy amendments are proposed:** (1) permit the design lead to write bounded prototype code as designer, while Luna remains the production executor; (2) add independent implementation/UX review for this meaningful redesign pilot, although current orchestration does not require a separate implementation reviewer. Neither amendment is active merely because this document exists. Adopt them for the pilot first, not automatically for every future task.

Prototype ownership means an isolated, runnable preview using the existing stack, realistic fixtures and simulated transitions; no production service mutations, billing behavior or replacement of domain contracts. It can reuse existing presentation components. Luna may reuse reviewed prototype code after checking production suitability, rather than re-creating approved geometry from prose. The design lead must not quietly become the production bug fixer.

## Ordered execution

Every row names the actor, concrete input/output and next trigger. The two owner checkpoints cover one connected slice, not each component or pixel.

| Stage and actor | Input → output | Exit / next trigger |
|---|---|---|
| 0. Root, existing model | Owner request, current contracts and evidence → bounded journey, permissions, invariant list, named versions and agent ownership | Scope is concrete; unresolved consequential decisions are identified. Dispatch the Sol design lead. |
| 1. Sol 6.1 High design lead | Scope, actual screens, owner criticisms → short purpose/content hierarchy, journey map and **actual low-fi desktop/phone browser prototype**, including adjacent transitions | A visitor can attempt the intended task; layout and action semantics are visible. Send artifact to fresh Sol reviewer. |
| 2. Sol 6.1 High reviewer; the design lead revises | Frozen low-fi version and user task → independent findings with visible failure, severity and suggested outcome; the design lead returns revised version and disposition | No unresolved blocker to understanding/completing the modeled journey. Root presents the artifact, not only a report. |
| **3. Owner checkpoint 1** | Root presents low-fi link, desktop/phone captures, short task script and at most three consequential decisions | Owner approves **purpose, content priority, grouping and interaction direction**, or gives corrections. The design lead revises; Root returns only the affected decisions. Approval excludes polish and real backend/audio correctness. |
| 4. Sol 6.1 High design lead | Approved low-fi and adopted Affect/Mabry/icon identity → high-fi browser preview with realistic content, responsive layouts and selected failure/repeat states | Sol High independently checks actual screenshots and operation against the user job and checkpoint 1, not just token fidelity. The design lead resolves findings. |
| **5. Owner checkpoint 2** | Root presents high-fi preview, change summary and remaining limits | Owner approves the demonstrated **visual/interaction target for handoff**. Approval excludes unseen states, production reliability and release permission. |
| 6. Same Sol 6.1 High design lead/planner, then the independent Sol High reviewer | Approved artifacts, decision record and obsolete contracts → synchronized affected specs, task scope, acceptance scenarios and exact prototype references; independent contradiction/package review | One active contract agrees with the approved design. Publication uses Luna Low only if authorized. Luna Max receives the implementation-ready packet. |
| 7. Luna Max | Reviewed task package and approved prototype → production integration, backend-free mock integration, checks and evidence with explicit environment/version limits | Executor supplies actual screen/interaction evidence and code/test results. No silent redesign when integration becomes difficult. |
| 8. Fresh Sol 6.1 High reviewer; Root verifies | Integrated build plus approved target, task script and invariants → independent UX and behavior/code findings; Root directly inspects final screens and exercises the critical journey | Luna fixes implementation defects; the design lead resolves design changes. Root records acceptance only when the journey and checks pass under the authorized boundary. Delivery follows existing permissions/order. |

Spec changes are mandatory when the approved design corrects a bad requirement. They occur before dependent production work; stage 6 is synchronization, not permission for a planner to redesign an already approved composition. If a shared contract must be settled to make the prototype meaningful, resolve that narrow decision earlier and carry its version forward.

## Coherence, independence and stopping rules

Keep at most **Root plus three active agents**. Reuse the design lead for design iterations and Luna for implementation fixes. Keep the design lead context throughout; it owns the brief, prototypes, revisions and contract edits. Use one separate reviewer slot, fresh for production review so it has not helped author the implementation. Do not keep an extra planner, architect, copywriter or screenshot agent.

During low-fi design, Luna may investigate a bounded feasibility question while the design lead composes. Start the reviewer only when there is a concrete artifact; the lead handles initial contract discovery. Luna must not build the unapproved layout. During production integration, the design lead can assess responsive fidelity while Sol reviews completed, frozen slices; Root coordinates integration. Dependent contract decisions, owner approvals and conflicting file writes remain sequential. Parallel work receives explicit file ownership and a common artifact version.

Fresh reviewers receive the owner goal, latest decisions, constraints, approved artifact, realistic scenarios and access to the running preview/source. They do **not** begin with the author's self-evaluation or a demand to confirm PASS. For production review, freeze independent findings first, then reconcile with previous findings and executor receipts so known regressions are not lost. Independence requires a new review context, not merely a new role label on the writer.

The design lead owns proposed product/design resolutions; reviewers own their findings; Root owns evidence sufficiency and acceptance. Neither executor nor reviewer silently overrides design. If evidence disproves the design, the design lead revises it. If the resolution changes approved purpose, hierarchy, navigation or consequential behavior, return that slice to the owner. Domain/data/billing invariants remain constraints until explicitly resolved, regardless of aesthetics.

After **two iterations fail to resolve the same substantial UX concern**, stop cosmetic patching. Root asks the design lead to identify the failed assumption and propose a materially different grouping/interaction, with one concrete alternative. Missing information or conflicting owner decisions go to the owner. Do not respond by increasing effort indefinitely, adding agents or repeatedly taking the same screenshot.

Record approval as artifact version, screenshot/preview snapshot references, owner response, approved scope and known limits. A mutable localhost URL alone is insufficient. Meaningful changes invalidate only affected approval; spacing corrections and faithful implementation fixes do not restart the whole process.

## Record pilot: named actors and observable gates

Root scopes Record plus its microphone entry and result exit. The Sol 6.1 High design lead starts from the owner's center-video → centered-dialogue → boxed-waveform direction, with the right rail grouping clip context, Replay/Record/Your take, then navigation. It removes unnecessary filename/timestamp/status repetition while preserving active capture feedback and durable actionable errors. Phone and short-screen layouts are designed deliberately rather than shrinking the desktop rail.

The design lead makes ready → replay ended → replay again → record → candidate playback → accept/next → final completion clickable. It includes save failure and microphone loss. Mandatory sequential acceptance is the new direction; previous/accepted-turn revisit and replacement semantics must be made explicit, not inherited accidentally from the old gap-permitting contract. Simulated capture is labeled as prototype evidence.

Sol High attempts those tasks and critiques prominence, control meaning, recovery and state continuity. At checkpoint 1 the owner sees actual desktop/phone wireframes and decides the remaining navigation semantics and layout direction. The design lead then produces the branded preview; Sol reviews it; checkpoint 2 approves that target. The same design lead synchronizes the conflicting contracts, the independent Sol reviewer checks them, and Luna Max integrates actual recording and service/mock behavior.

The final Sol review and Root check must demonstrate **Replay after the end cursor restarting the intended clip**, repeated capture/replay, accepted-take preservation, failure/retry, final transition, narrow/short viewport usability and appropriate media aspect ratios. Actual capture and permissions require runtime evidence; simulated low-fi success cannot establish them. Financial, identity and single-capture invariants remain independently checked where touched.

For Landing, the same lead must challenge the sparse contract: explain what Dubbed does, show truthful value/result evidence and offer a clear next action. Compliance with the old minimalist anatomy is not product success. The [earlier proposal](design-workflow-proposal.md#new-owner-steering-landing) records this owner correction without rewriting historical audit evidence.

**Design-ready:** visible low-fi, realistic content, connected actions and explicit conflicts. **Implementation-ready:** approved versioned target plus synchronized reviewed contracts and checkable scenarios. **E2E-ready:** an understandable, operable complete journey, including relevant repeat/recovery paths, demonstrated in the integrated environment with limitations stated. No stage guarantees first-shot perfection.

Small fixes with settled composition can go directly to Luna and focused verification; an established approved pattern may begin at high-fi. New purpose, hierarchy or navigation requires low-fi. The smallest next authorization is **this Record pilot through checkpoint 1 only**, including the Sol design lead's bounded prototype-code exception and one fresh Sol High review. It does not authorize production integration, specification publication or delivery actions.


