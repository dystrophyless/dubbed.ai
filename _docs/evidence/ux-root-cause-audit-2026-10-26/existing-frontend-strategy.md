# Strategy for the existing frontend

Recommendation by GPT-6 Astra Medium, analysis only, 2026-10-26. No implementation, tests, Git operations or acceptance were performed. Future work follows the adopted [Sol/Luna design workflow](../../frontend-design-workflow.md); this recommendation assigns Astra no future design work.

## Verdict: restart the weak design, retain the useful engineering

Choose a **selective redesign on the existing codebase**, not a whole application rewrite and not another general cosmetic correction wave. Start design exploration from user jobs for the screens whose composition or interaction model failed. Existing screens are behavioral references and regression fixtures, not mandatory visual targets.

The [audit](report.md) shows why more faithful patching is insufficient: Record's redundant counters, underweighted dialogue and toggle-based listening model were substantially required by the old task. Larger controls and overlap repairs could not correct that model. Landing's sparse contract omitted its communication purpose; it needs product explanation, truthful value/result evidence and a clear next step. Replacing those decisions is a design restart. It does **not** mean deleting React components, services, persistence, assets or all tests, nor abandoning Affect Clean/Light, Mabry and the adopted icon treatment.

A rewrite alone offers no UX guarantee. Without an approved visible target, it could recreate the same mistakes at greater cost.

## Keep, inspect, replace

| Family | Recommendation and reason |
|---|---|
| Service facade, interchangeable mock, persistence and domain protection | Keep as the integration base. Account isolation, grant fences, credit authorization/idempotency, single capture, candidate/accepted preservation and result-generation identity represent valuable work. Recheck touched boundaries; existence of tests is not blanket proof. The real backend remains deferred under #76. |
| Record presentation and interaction orchestration | Redesign composition and control semantics. Inspect event/state wiring rather than blindly retaining it: mandatory sequential acceptance conflicts with the old gap-permitting model; replay at the end needs runtime reproduction and correction. Preserve valid capture/draft machinery while changing how users operate it. |
| Shared visual primitives, tokens, assets and accessible controls | Reuse where rendered behavior fits the approved target. Affect component fidelity is useful, but cannot prescribe the page's content or grouping. Avoid replacing the design system merely because composition failed. |
| UI state/output contracts and tests | Review individually. Technical state need not always become visible text. Assertions requiring obsolete counters, old action names or old layout should be replaced by checks for the approved behavior, not indiscriminately deleted. Preserve invariant, failure/retry and data-retention tests. |

## Page triage

These priorities derive from the [13-page matrix](page-evidence-matrix.md), not a claim that every page needs rebuilding.

- **Record first; Landing next:** create new compositions from their purposes. Record also needs connected interaction design, not a static restyle. Landing needs a new content hierarchy and truthful demonstration of value, not decorative sections around the old sparse content.
- **New dub and Account:** use the improved screens as starting points. New dub's grouping/columns and Account's form work are genuine improvements. Validate the complete task before choosing further changes; do not throw them away for visual uniformity.
- **Microphone, Processing and Result:** review with Record's entry and completion journey. Simplify technical exposition and prioritize the next useful action, preserving permission, progress, retry and result-version behavior. Replace composition only where the connected prototype demonstrates a need.
- **Projects, Credits and Linking:** perform focused job/hierarchy review after the core journey. Repeated identity/accounting explanations and scenario controls should not dominate the product surface. Preserve trustworthy financial and linking semantics; do not generalize these concerns into evidence that every component is unusable.
- **Sign-in, Registration and Reset:** retain functional foundations; inspect content priority, failure/recovery and entry/return continuity. The evidence does not justify a wholesale authentication rewrite.

## Preserve the pending corrections without making them the new target

The 21 correction owners finished local work, but integrated acceptance is pending. The supplied checkpoint is a dirty worktree on `9d2866`, with the last focused run at 37/38 and one New dub pointer-driver failure. This is not an accepted release, and the failure must be diagnosed rather than dismissed as harmless or treated as proof of product failure.

Before authorized redesign execution, Root should record a scoped checkpoint: relevant file versions/hashes or snapshots, correction-to-file/issue mapping, receipts, known failures and acceptance status. Preserve unrelated dirty work. No bulk commit, reset, deletion, rollback, publication or issue closure follows from this advice.

Classify each correction as reusable, requiring adaptation, or superseded by an approved design. Keep useful fixes in place; do not mechanically reapply obsolete visual assertions. Record supersession explicitly in the authorized issue lifecycle, without declaring unfinished work accepted. Avoid adding a second local task queue. Do not resume the old cosmetic list indiscriminately while its visual target is being replaced.

## A small parallel preview, then a single production screen

Use an isolated preview entry/component in the existing frontend stack, with realistic fixtures and simulated transitions. Reuse existing components where helpful; keep scenario controls outside the proposed product surface. Do not create a second service layer, duplicate application or global CSS overlay to disguise the old layout.

Once the target is approved, Luna integrates one bounded slice into the existing production route. Prefer refactoring when domain behavior is separable and existing components fit. Selectively replace the screen composition/controller when old layout assumptions and event wiring are tightly coupled, or adapting them would preserve contradictory interaction semantics. Judge this from the actual dependency/state seams during implementation planning, not line count or dislike of the old screen. Retire the temporary preview after its evidence is preserved and the integrated screen is verified; avoid indefinitely maintaining two implementations.

## Smallest next step

Authorize **Record through the first owner checkpoint only**: Sol 6.1 High creates the low-fi desktop/phone/short-screen prototype; an independent Sol High reviews it. Show replay-to-end/replay-again, record, audition, accept/Next, revisit and failed-save recovery, with microphone entry and completion exit represented minimally. Resolve consequential navigation ambiguity in that artifact.

Stop at owner review of structure and interaction. No production integration or whole-frontend rewrite yet. If two substantial iterations still fail the same concern, revise the underlying assumption instead of polishing it. This bounded trial tests the new approach cheaply in rework terms: the owner can reject a concrete interaction before Luna Max reconnects production behavior. Proceed page by page only after the pilot demonstrates a coherent journey.
