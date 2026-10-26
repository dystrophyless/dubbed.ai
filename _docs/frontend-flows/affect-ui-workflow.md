# Affect UI frontend workflow

Date: 2026-10-23, Asia/Qyzylorda. This workflow applies to frontend specification, published task-contract maintenance, implementation and verification. It adds concrete source and evidence requirements within the owner-adopted [design-first workflow](../frontend-design-workflow.md). It does not independently authorize product implementation.

## Icon-family requirement

Apply the owner's **Lucide Icons with Affect UI outline treatment** decision in the [token contract](design-tokens.md#iconography--owner-decision-2026-10-23) to every active flow. Use stroke width 1.1, no fill, currentColor, rounded caps/joins and normal viewBox-relative scaling. Record actual asset names/version; compare equivalent reference contours and inspect rendered thin-stroke legibility, semantic colors, component slot sizes, localized accessible names and phone targets. Audit shared, screen-local and default shadcn icons for unmodified stroke-width 2 or other-family fallbacks. Brand logos are separate assets. Keep source snapshots immutable and record any geometry adaptation. #78 owns shared adoption; screen owners consume it; #63 includes the integrated check.

## Authority and entry points

Use the [Clean/Light adoption contract](affect-ui-clean-light-adoption.md), [reference catalog](affect-ui-clean-light-reference.md), current [design tokens](design-tokens.md), [shared behavior](00-shared-contract.md) and applicable active flow specification. The local reference root is `D:\Program\frontend\affect-ui\affectui-free`. The catalog identifies exact Clean Markdown / Light PNG pairs and source fingerprints.

If that external path is unavailable, use the catalog's byte-identical pinned [portable source/Light PNG evidence](../evidence/affect-ui-clean-light/README.md), verifying its manifest hashes. A changed external hash requires an explicit mapping/evidence update before claiming fidelity to the changed source; do not silently replace the selected snapshot or guess from memory.

The owner selected this visual language and explicitly retained Mabry Pro. Both project design skills remain useful for deliberate composition and critique, but their random direction draws, stock type/palette choices, mandatory marketing imagery/motion counts and generic style prohibitions cannot replace the owner reference. Read the app-screen guidance for working screens. Do not add features, sample content, pricing claims or whole marketing blocks merely because they occur in the library.

For meaningful screen composition, content hierarchy and connected journeys, use the [design-first workflow](../frontend-design-workflow.md) before finalizing UI contracts. Clean/Light examples establish mapped component appearance and behavior, not a page layout or a ban on useful truthful content that an older spec omitted. Preserve business invariants; propose and synchronize changes to obstructive UI requirements through the workflow's owner checkpoints.

The adoption contract, current tokens, reference catalog and active flow specifications define the visual authority. Preserve product behavior, responsive navigation, light-only scope, meaningful accessibility, privacy and domain invariants.

## Before changing a screen

1. Read the actual published issue and latest discussion, the relevant flow, current tokens, adoption contract and applicable catalog entries. Published issue bodies remain the live task contracts; issue-link stubs stay stubs.
2. Start with the catalog’s [visual entry](affect-ui-clean-light-reference.md#start-here), then open each applicable Clean Markdown and visually inspect its matching Light PNG. Select the few references needed for the slice; a whole-library audit is not required for every task. Record exact file paths and named component/state, not only a library name or broad visual impression. Reject Classic and Dark examples.
3. Make a compact source-to-product map in the issue/evidence: source component/state; adopted fill, border, radius, shadow, typography, spacing and motion; destination shadcn semantic/control; required product states; and any documented adaptation or genuine gap. Use the token contract for numeric values rather than creating a second token list here.
4. Preserve accepted behavior and business invariants. Meaningful composition follows the approved versioned target; a source component example does not prescribe the whole page hierarchy. Reuse the shell/shared controls supplied by #78, while the feature issue owns its composition and domain states. Do not import sample fetch logic, OTP expiry/resend policy, billing rules, artificial progress or navigation from example code.

The map is implementation evidence, not a new local task queue. Routine compatible engineering decisions proceed under existing authorization. A genuinely unresolved product decision blocks only its dependent slice and follows the existing issue/Orchestrator process.

## Component and state adaptation

Directly represented library components should preserve their adopted Clean/Light appearance and functional feedback. shadcn remains the accessible behavioral foundation: native semantics, focus management, keyboard operation, disabled/loading behavior, labels, announcements and dialog dismissal/focus return remain required. Copying a screenshot never waives them.

The reference catalog distinguishes direct examples, embedded examples, derivatives and missing components. Direct families are BTN button, FIL filter-menu, PRO profile-menu, SEG segmented-control, PGR progress-tracker, NOT notification-stack, OTP otp-input and THK thinking-loader in their cataloged roles. Generic inputs/password fields, dialogs, file selection, timelines/waveforms/meters, players, payment forms and project/history rows use named derivatives and shared shadcn behavior; do not claim a nonexistent Affect Input, Dialog, Card, Table or Badge component. OTP is a direct visual reference whose accessible adaptation remains one logical value and retains the product's confirmed code/resend and verification rules. FIL/NOT do not introduce filters or a notification feed absent from the flow.

Keep exact Mabry Pro role/weight/size/line-height requirements from the current tokens. Missing licensed font assets, weights, fallback agreement or actual font loading remain explicit acceptance limits. Do not silently use a font included by the scaffold or reference examples.

The source component CSS hardcodes Inter in component declarations. Adapt those mapped declarations as well as the global body family; a global Mabry setting alone can leave Inter/scaffold fallbacks in controls. Audit rendered component labels, actual/visually hidden inputs and native controls separately. Record loaded font resources and computed styles after fonts settle; no font asset availability or installation is established by this documentation.

Current Dubbed sizes use the baseline roles in design-tokens.md: task40px/Medium14px/20px, prominent/landing44px/Medium16px/24px, secondary32px/Medium14px/20px, navigation36px/Medium14px/20px, and medium segmented40px/14px/20px desktop plus48px/16px/24px phone. Catalogued original source24/28/32px heights and12/16,13/20 labels remain provenance only. Phone action targets remain at least48px; preserve mapped source state/shape/brand without treating source compact measurements as Dubbed targets. Keep these defaults until approved calibration/prototype feedback is synchronized through the canonical token file and affected flows; do not create local alternate scales. OTP and other non-button controls keep their named geometry and accessibility adaptations. The phone minimum applies to the full usable interaction region; compact visible artwork requires collision-free focus/click geometry and actual pointer/touch testing, not a bounding-box claim.

Approved Clean hairlines, bounded surface shadows and functional motion supersede prior blanket visual bans only as stated in the adoption contract. Source colors that do not meet the product's required text/control/focus contrast must use its explicit semantic correction; decorative low-contrast lines must not be presented as the only control boundary or focus signal. Record corrections as adaptations rather than source-exact claims.

Use only adopted functional feedback: control interactions, disclosure/selection changes, progress state and supported spinner behavior. Follow the source-specific duration/easing and property limits in the token/adoption contract. Reduced motion makes the relevant transitions immediate and preserves visible status. No user command, capture clock, service result, navigation or announcement waits for an animation. No marketing loops, dedicated shimmer, text-reveal, parallax, decorative page entry or fabricated progress.

## Task ownership and publication

- #61 records technical/source availability and unresolved decision slices; it does not choose another visual direction.
- #78 owns shared tokens, component mappings/derivatives, shell, common states and locale behavior. Each UI-owning issue composes its applicable components and states without creating a second shared control system.
- #63 owns integrated browser/reference evidence across the active flows. Media fixtures, ledger, persistence, facade and adapter issues retain their existing responsibilities; visual adoption does not make them owners of screen redesign.

When a published contract changes, inspect the live issue and latest discussion, review the affected current contract, update the spec and issue together, and read back the final issue body. Preserve status, dependencies, assignees, labels and unaffected AC unless separately authorized. Keep the task index concise and local published files as issue-link stubs. Record owner approval in the current contract with its scope and a link to the owner's reply. Keep only evidence needed for current verification or acceptance; do not stage duplicate task-body archives, immutable publication copies or a separate decision journal. Ordinary authorized commits record normal Git history.

Before whole-page high-fi, follow the design workflow’s [internal component calibration](../frontend-design-workflow.md#internal-component-calibration). It is internal lead/reviewer work inside the authorized prototype, not an extra owner checkpoint or authorization to build an app now.

## Rendered verification

For each changed UI, record the actual browser/OS/device, date, code/document/fixture revision or dirty boundary, font assets actually loaded, commands/steps, expected/actual result and artifact paths. Run the issue's existing behavioral checks and the bounded visual checks below.

1. Capture and inspect final screenshots at desktop, 767/768px boundary and 390px phone in EN/RU, plus the issue's short viewport and 200% zoom cases. Compare applicable component crops/states to their cataloged Light PNG and Clean values, accounting for source preview scale/DPR and the approved Mabry substitution. The demo screenshot's canvas/frame/whitespace/content is not Dubbed page layout, and source Inter text widths are not Mabry acceptance targets. Measure actual CSS geometry after Mabry loads, including long localized labels, phone touch targets, control density, cards and media/safe-area clearance.
2. Exercise default, hover, active/pressed, keyboard focus, disabled, loading, selected, invalid and service-error states that actually apply. Verify focus remains visible, errors preserve values and layout, dialogs return focus and essential meaning is not color-only. Test forced colors where the issue requires it.
3. Inspect functional transitions and reduced motion in the actual browser. Record source duration/easing versus observed behavior and verify no animation gates work. Still images alone do not prove timing, interactivity, accessibility or media behavior.
4. Fix visible mismatches and inspect the final screenshots again. Record justified contrast/semantic/source-gap adaptations and any unresolved font/copy/device limits. The design-skill inspector may assist, but it cannot reject an explicitly adopted source property merely because of a generic house rule; explain the scoped exception and verify the adopted contract.

Report visual results separately from business logic, build/tests, actual browser media/device behavior and production services. A document migration, source hash, test PASS or screenshot capture without inspection does not establish visual fidelity. Mark missing required evidence `blocked` or `not run`; do not claim browser, font or product acceptance from this documentation assignment.
