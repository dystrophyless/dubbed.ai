# A smaller workflow that tests the experience early

This is a recommendation, not an executed redesign, approved specification, new mandatory approval ceremony or implementation authorization. Keep the service facade, interchangeable mock and safety invariants. Replace the order of UI decisions and the evidence used to judge them.

## 1. Design one complete journey before splitting its pages

Start with **new visitor → account → source/section → price authorization → preparation → microphone readiness → rehearse/record/review/accept → result/download → return and revise**. Include the purchase detour and a resumed project as alternate paths. The outcome is a person understanding and operating the journey without an agent explaining it; E2E-ready does not mean only that a locator script can complete it.

One design owner maintains the shared interaction/composition. Implementation can still be delegated by stable module ownership after the journey is established. There is no need for another permanent review role per issue or a second task backlog.

Produce three compact artifacts:

1. **Journey sheet:** entry/exit, user goal, next action, success signal and preserved work for each transition. Name only decisions that change what a user can do; retain technical invariants in a separate compact checklist.
2. **Connected, realistically populated prototype:** actual reusable UI or an interactive mock using the current stack/reference. Cover normal desktop, short desktop and phone. Include ready, loading, empty, error/retry, permission, unsaved candidate, unknown operation and changed-version states. It must be possible to move through the core journey, not merely inspect disconnected screenshots.
3. **One-page design decision record:** hierarchy, action grouping, what is visible by default versus on demand, responsive behavior, and explicitly unresolved choices. Use screenshots with annotations rather than another long prose anatomy.

The owner has already supplied a strong Record direction. Prototype that direction first: centered media/dialogue/waveform and a contextual desktop action rail. Resolve sequential Next versus skip/gap behavior and how re-recorded accepted turns behave. Do not silently preserve the old gap contract while deleting its progress/recovery UI.

## 2. Separate product decisions from invariant checks

| Product-visible question | Internal invariant that must remain |
|---|---|
| Can I replay this line, record it and hear my take in one obvious group? | Only one source/capture runs; turn-window start/end and synchronization are correct |
| What happens when I press Next? | Candidate persists and accepts only against compatible identities; failed/unknown acceptance preserves media |
| Is my work safe, and what can I do if saving failed? | Local candidate, recoverable draft and accepted take are distinct; late outcomes are fenced |
| What will this process cost? | Exact current quote, reservation/settlement and idempotency remain authoritative |
| Which result am I watching/downloading? | Download targets the displayed immutable generation; new-ready does not replace active playback without consent |
| Can I leave and continue later? | Correct route intent, safe guard, grant release and account isolation |

The invariant can require a test without requiring a permanent UI label. Conversely, a friendly label cannot substitute for the invariant. For example, remove idle “Recording status” while retaining unmistakable active-capture feedback; simplify accepted-progress presentation only after deciding navigation semantics.

## 3. Review the prototype through work, then specify the accepted behavior

Use the existing Orchestrator/design owner to review the entire journey. A fresh reviewer can challenge it when explicitly delegated, but the artifact and criteria matter more than another model name. Ask the owner for unresolved product choices only when needed; routine revisions proceed under the eventual authorized scope. No requirement for a fresh human approval after each page is proposed.

Run a small, repeatable scenario set:

- **First success:** start as a new visitor, create/verify account, choose a permitted scene/section, understand price, prepare, connect mic, record/accept every required turn, recognize completion and download the intended result.
- **Performance repetition:** replay twice including from the end; switch/audition own candidate; rerecord; navigate back; return to the current task. Verify no accidental capture/acceptance and no competing audio.
- **Recovery:** permission denied then recovered; failed save with candidate retained; unknown acceptance/payment reconciled; processing failure with usable prior preparation; expired session returns safely.
- **Revision:** play an older finished version while a new one is ready; decide when to watch it; download exactly what is displayed; return to recording without unintended assembly.
- **Responsive stress:** long RU dialogue/title/email, portrait/square/landscape, 1440×700, phone390×844 and near 767/768 boundary; actual zoom and keyboard path on the final implementation. Include focus, error and status while the primary task is visible.

Capture a short screen recording of each connected path plus selected state screenshots. A screen recording can expose misleading transitions and action hunting that stills miss. Keep a concise observation log: task, hesitation/wrong action, cause, change, recheck. Do not require exhaustive Cartesian screenshots for every cosmetic state before learning whether the interaction works.

Then update only the affected shared contracts and task descriptions. Replace obsolete clauses; do not append a contradictory “latest decision” forever. Preserve historical snapshots in evidence/Git history and keep one active rule per behavior.

## 4. Split implementation into user-visible increments

Use existing GitHub issues for ownership and lifecycle when implementation is authorized. Organize work around complete outcomes rather than “make every component match”:

| Increment | Completion artifact |
|---|---|
| Record a turn comfortably | Operable ready→replay→capture→candidate→accept/next loop, including failed-save retention, on desktop/phone |
| Complete and revise a dub | All-turn completion→result→download→return/re-record→new version, with displayed-version continuity |
| Prepare the right section | Upload/replace→select→quote→process, including purchase-return and quote invalidation |
| Enter and recover an account | Register/sign in/reset/link and safe protected return, with stable forms and clear completion |
| Resume/manage work | Project recognition/resume and account/credit management, including consequential deletion and cancellation |

Shared component work remains a dependency only where it enables these outcomes. Give one owner the integration seam for each increment. Different executors may work on independent modules, but all consume the same visual decision artifact and vocabulary. A task closes its scoped implementation obligation only after the agreed delivery gates; that still does not make the whole product accepted.

## Acceptance rubric

Record each row as **pass / needs change / not checked**, with one exact scenario/image/video reference. A numerical average must not hide a failed core row.

| Criterion | Observable pass condition |
|---|---|
| Orientation | A person can identify current task, source/project and next action without reading implementation notes or receiving a hint |
| Hierarchy | The work object and primary action are visually stronger than status, metadata and utilities; dialogue remains easy to follow during performance |
| Action economy | Frequent replay/record/take/next actions are directly available and grouped by purpose; no unnecessary source-selection step or repeated setup |
| Repetition | Replaying from the end, rerecording and returning work predictably; no dead control or competing audio |
| Transition continuity | Loading/success/error transitions retain relevant context and values; completion is evident; a new version never silently changes the displayed/downloaded object |
| Recovery | The user can understand the problem, what is safe and the next action; persistent blocking/unknown states remain discoverable until resolved |
| Responsive operation | Required dialogue and performance controls can be reached/read without overlap or accidental action; intentional short-screen scrolling is demonstrated, not hidden by a full-page screenshot |
| Input/accessibility | Keyboard focus/order and announcements support the same task; actual targets work beyond their bounding boxes; native zoom evidence matches the stated environment |
| Domain safety | Existing money, account, candidate, grant, revision and generation invariants pass meaningful negative-path checks |
| Visual identity | Affect Clean/Light, Mabry and outlined Lucide treatment remain coherent; justified adaptations serve the product, with no claim that source fidelity alone proves usability |
| Evidence honesty | Frozen revision, environment and fixture provenance match the claim; missing checks stay missing; simulator/production boundaries remain explicit |

For a formative novice check, ask a few people unfamiliar with the implementation to perform the named core tasks without coaching. Record whether they succeed, where they hesitate and which controls they misinterpret. Do not claim statistical UX validation from a tiny sample. Use observations to reject obvious confusion early; reserve broader study for a later product decision if needed.

## Reusable task prompt

```text
Implement this complete user outcome: <goal and entry-to-exit path>.
Use the attached connected prototype and one-page decision record as the
composition authority, with Affect Clean/Light, Mabry and current icon rules.
Read the exact issue/spec revision and preserve the listed domain invariants.

Owned files/modules: <explicit scope>. Other agents may be editing; preserve
their changes. Authorization: <allowed actions and delivery hold>.
Do not add visible technical state unless it helps the user decide or recover.

Required states/transitions: <ready, pending, success, failure/retry, permission,
unknown outcome, preserved work, version change as applicable>.
Required realistic content: <media ratios, long dialogue/RU, titles/addresses>.
Demonstrate the whole named path, including repeated use, in desktop/short/phone.
Return changed paths, scoped behavioral checks, opened screenshots/short journey
recording, exact revision/environment and remaining limits. Surface contradictions
with the prototype/spec before implementing a conflicting user behavior.
```

## Reusable reviewer prompt

```text
Review the user's journey <entry to successful exit>, not just this issue's AC.
Read the frozen task/spec and inspect the actual prototype/runtime and its states.
First perform the task without following the executor's click script. Then verify
domain invariants and specific implementation claims with appropriate evidence.

Assess two independent questions:
1. Does it obey the intended behavior and preserve work/money/identity?
2. Is the intended interaction itself understandable, economical and comfortable?

For each visible region ask: what user decision does this support now; can it be
removed, condensed or disclosed later without losing safety or recovery?
Exercise repetition, success transitions, failure/retry, permission and version
continuity. Inspect realistic media, long RU and short/phone layouts.
Do not equate correct tokens, no overlap, image count or green tests with good UX.

Return severity, observed evidence, user impact, requirement versus implementation
cause, a concrete alternative and its next check. State what works. Distinguish
what you personally executed/opened from inherited receipts and untested inference.
If composition is poor, show the problem in one annotated screenshot and propose
one coherent revision; do not produce only a list of pixel adjustments.
```

## Rollout recommendation

First, keep the current implementation/evidence as a baseline and stop cosmetic expansion. Resolve the few recording behavior choices exposed by the owner's direction. Second, build the connected Record→Result revision prototype with realistic media and errors, and evaluate repeated performance. Third, align New dub/Processing/Microphone with that journey and simplify simulator/debug presentation. Fourth, align auth, linking, projects, credits and account with the same action/status vocabulary. Finally, run the frozen integration checks and the explicit acceptance rubric, preserving all known invariant tests.

This replaces late document-heavy refinement with an early visible decision and a small set of meaningful journeys. It does not require a new spec for every cosmetic change, more reviewers by default, or pretending a prototype establishes production readiness.
