# Proposed agent workflow for designing Dubbed

Status: recommendation for owner adoption, not new project policy. This follow-up authorizes analysis only. No wireframe, prototype, product change, spec/issue update or runtime test was produced. Author: GPT-6 Astra Medium, following the owner's request. Based on the [forensic audit](report.md), [13-page evidence matrix](page-evidence-matrix.md) and [conversation evidence](evidence-inventory.md).

## Recommendation

Use a **design-first workflow with code as the preferred prototype medium** for new pages, meaningful redesigns and connected interactions. Begin with the user's job and the content needed to accomplish it; make grouping, layout and behavior visible in a low-fidelity prototype; obtain owner feedback; then refine the approved direction into a high-fidelity browser preview before production integration.

Do not implement detailed prose anatomy as if it were already an approved design. Prose should preserve business rules and explain behavior. A rendered, operable artifact should establish whether the proposed design actually serves those rules and the user. Bad composition or content requirements must be revised, even when the implementation matches them exactly.

There are two proposed design approval checkpoints per meaningful page/journey slice: **structure and interaction**, then **visual direction and implementation handoff**. Bundle related pages into one review when they form a journey. Routine pixel corrections and already-approved patterns do not need repeated owner permission.

### New owner steering: Landing

The original audit was too permissive when it described the Landing as intentionally minimal and compliant. That accurately described the historical contract, but did not adequately judge whether the page performed its purpose. The owner has now made the missing purpose explicit: a guest must understand the product, see its value and intended result, and become interested enough to continue. The current sparse page does not fulfill that job.

Therefore the next Landing design must challenge and revise the restrictive content/composition contract where necessary. This does not mean automatically adding a conventional marketing template. It means selecting enough truthful content and demonstration to explain this particular product. The original audit remains unchanged as historical evidence; this proposal records the corrected product judgment and current direction.

## Why this approach, rather than simply a stronger implementation model

| Approach | Good fit | Failure risk in Dubbed |
|---|---|---|
| A. Implement directly from prose | Small behavior fixes; another instance of an established, visually approved pattern; exact design/reference already supplied | The original Record task explicitly required the crowded anatomy. A faithful executor could not remove it without challenging the contract. Landing's sparse contract omitted the communication job. More faithful implementation would reproduce both problems. |
| B. Goal/content/grouping → owner-visible wireframe → feedback → implementation | New pages, changed hierarchy, new user journeys, unresolved interaction | Useful only if the wireframe is actually visible and feedback is incorporated. A long written “design plan” followed immediately by code repeats the old failure. A static attractive mockup can also hide state/transition defects. |
| Recommended hybrid | Low-fi code tests structure and interaction; high-fi browser preview tests actual type, spacing and responsive composition; approved behavior then enters specs/tasks | Requires one design owner and explicit fidelity boundaries. Prototype code is not automatically production-ready, and owner liking the normal state does not prove error recovery or accessibility. |

The [Record chain](report.md#ux-01-recording-makes-the-problem-unusually-clear) shows why: the review caught Back, overlap and size; the executor repaired exactly those; Root caught more incomplete geometry; the performance interaction stayed substantially unchanged. The [New dub correction](page-evidence-matrix.md#6-new-dub) shows the opportunity: changing grouping made preview, selection and price visible together, whereas increasing the paid button alone would not have solved the page.

No evidence in this project isolates model capability from mandate, tools, time, fixtures or context. Keep model selection separate from the workflow decision. The current project role policy still governs any future authorized execution unless the owner adopts a change; this document does not silently replace it.

**When to skip stages:** a localized fix with settled behavior and unchanged composition goes directly to code and focused verification, using the existing approved artifact. A faithful new instance of an approved pattern can start at the high-fi preview and receive a scoped review rather than repeat low-fi approval. A change to the page's purpose, content priority, action grouping or navigation starts at low-fi. A technical feasibility spike can precede design, but its rough UI is not automatically the design. If implementation exposes a new consequential interaction, return only that slice to design.

## Before implementation: a short brief, then something the owner can see

The designer first extracts four things from the request and existing contracts:

1. **User and moment:** who is here, what they know, what they want to accomplish, and what brought them here.
2. **Required content and decisions:** what they need to see now, their primary next action, what success means, and which secondary details can wait.
3. **Constraints:** adopted Affect/Mabry/Lucide identity, real available content, responsive needs and business/safety invariants.
4. **Conflicts:** existing UI instructions that obstruct the job, owner decisions still needed, and unsupported claims or assets.

Keep this to one page or less. Do not require the owner to approve a document before the agent can draw a reversible proposal. Present it alongside the first visual artifact. Distinguish “must preserve account isolation” from “must put three status labels below the heading”: the former is an invariant; the latter is a design hypothesis unless explicitly and currently approved as a visual choice.

### Proposed sequence and owner artifacts

| Stage | Agent work and artifact | What the owner sees/decides |
|---|---|---|
| Frame the job | Compact brief plus a page/journey map: entry, page purpose, next action, success destination, recovery detours | A short explanation accompanying the low-fi review, not a separate approval request. Owner corrects the goal/content assumptions if needed. |
| Compose low-fi | Actual desktop and phone wireframes with realistic copy/content lengths; simple grayscale, approximate spacing, explicit action groups. Connect meaningful transitions in a runnable prototype. | **Checkpoint 1:** openable preview plus two representative screenshots and a short task walkthrough. Decide whether content, priority, grouping, navigation and behavior are right. |
| Revise structure | Incorporate feedback; show changed region/transition and affected phone/short-screen counterpart. Resolve business conflicts explicitly. | Re-review only disputed or meaningfully changed parts. “Looks good” is scoped to the named version/states, not every future page. |
| Refine in browser | Apply adopted visual language, actual Mabry, controls and media. Exercise key states and responsive constraints; independent review before owner presentation. | **Checkpoint 2:** high-fi browser preview, representative desktop/phone/short views, a concise change list and named limitations. Decide whether this is the visual/interaction direction to implement. |
| Synchronize and implement | Replace affected obsolete spec clauses; update the owning drafts/issues under authorization; freeze the visual decision reference. Integrate/harden code and verify domain behavior. | No extra approval for each implementation detail. Show material deviation from the approved design before treating it as accepted. |
| Verify the whole outcome | Repeat the connected task and negative paths on the frozen implementation. Compare with approved artifact and check actual inputs/accessibility. | Existing agreed product acceptance/delivery process applies. Design approval is not permission to deploy, publish, commit or close issues beyond existing authorization. |

The high-fi prototype may already use substantial reusable frontend code. “Before implementation” here means before committing to full production integration and exhaustive behavior work, not banning code from design. Avoid building two apps: prototype within an isolated, explicitly disposable preview boundary using existing tools, then reuse sound components when integrating. Do not connect experimental UI to destructive or paid operations.

Exit conditions are explicit: framing ends when the job, required content and conflicts can be stated; low-fi ends when the owner accepts the named structure/interaction version and blockers are resolved; high-fi ends when the owner accepts the demonstrated direction after substantive review findings are addressed; implementation ends when the agreed scenario/invariant checks pass with documented limits. A blocked state may be excluded only explicitly, not by omitting it from the preview.

## Make approval meaningful and limited

Each checkpoint should ask for decisions about a concrete version, not “Do you approve the design?” without context. Supply one recommended direction. Show a second option only for a genuine tradeoff the owner must choose, such as keeping the scene larger versus keeping all performance controls visible on a short screen.

Use this compact review packet:

```text
Version: <artifact/revision identifier and preview>
Job: <what the person should accomplish>
Please try: <2-3 short tasks>
Decisions requested: <at most 2-3 consequential choices>
This review covers: <pages, states and responsive layouts>
Not established yet: <backend/media/accessibility/other relevant limits>
Changes since prior version: <only meaningful differences>
```

Record the owner's actual response, artifact identifier, covered scope and remaining conditions in the existing evidence/decision location. Preserve screenshots or a reproducible snapshot so an evolving localhost preview cannot silently change underneath the approval. A URL alone is insufficient version identity. Git is useful when already authorized; a local immutable artifact/hash record can preserve the decision without creating an unsolicited commit.

**Checkpoint 1 approval** means agreement with the content priorities and interaction structure shown. It does not approve final visual polish, every sentence, implementation correctness or unseen error states. **Checkpoint 2 approval** means the demonstrated appearance and interaction are the implementation target. It does not certify backend behavior, physical audio, complete accessibility or production readiness.

Reopen only affected approval when a change alters the user's goal, available actions, page grouping, major composition, navigation/acceptance semantics, consequential copy or responsive strategy. Examples: replacing the Record toggle with direct actions, enabling skip, changing the Landing promise, or replacing the desktop action rail with another architecture. Minor spacing fixes, wrapping repairs and faithful corrections do not invalidate the whole design. If a new error state forces the approved controls offscreen, reopen that state/layout rather than the entire project.

Do not keep asking until the owner supplies a layout solution. The designer diagnoses the problem, proposes a revision and shows it. After two unsuccessful iterations on the same concern, revisit the brief/assumption or offer a sharply different composition; do not continue blind pixel adjustments. Owner feedback is evidence, not a guarantee that the first approved version will need no further changes.

## Which prototype medium fits Dubbed?

**Default: runnable low-fi frontend using the existing stack**, once such prototyping is authorized. Dubbed's hardest questions concern moving media, repeated actions, state transitions, long text and viewport height. A browser prototype can expose these early and evolve into the high-fi preview without a tool translation step. Use deterministic scenario controls in a separate review panel; do not put fake payment/capture controls into the intended product surface. Label simulated outcomes honestly.

| Medium | Appropriate use | Not sufficient for |
|---|---|---|
| Brief/ASCII sketch | Agent reasoning, quick communication of alternatives before a visual is ready | Owner wireframe approval. A paragraph saying “video centered, controls right” is not a wireframe. |
| Static low-fi image | Fast composition comparison; simple Landing content order; visible desktop/phone alternatives | Replay, saving, navigation, permission, version continuity or actual reflow behavior |
| Figma | Useful if the owner wants to edit design layers, maintain a design library or collaborate there | Mandatory extra stage here. It adds handoff/synchronization cost when the important validation is browser behavior. Use only if that benefit is wanted. |
| Runnable low-fi browser | Default for Record and connected flows; real content lengths, clickable paths and state simulation | Production timing, real persistence, physical audio or final visual acceptance while still low-fi |
| High-fi browser preview | Actual adopted type/components/spacing/media and responsive judgment | Safety/behavior proof without relevant tests, or product acceptance from screenshots alone |

Low-fi deliberately omits fine shadows, hover polish and decorative choices. It must retain meaningful content, relative sizes, reading order and primary/secondary distinction. Otherwise it cannot reveal the actual hierarchy. High-fi retains the same agreed structure while resolving the visual details; it must not introduce a new information architecture unnoticed.

## Connected journey or one page?

Design connected slices whenever one page's meaning depends on what happened before or what happens next. Record cannot be judged without microphone readiness, candidate acceptance, next-turn behavior and Result. New dub needs quote invalidation, preparation and purchase return. Authentication needs success/protected return, not only a nice form.

Per-page work is sufficient when entry, exit and state meanings are already stable and the change is local: correcting Account field alignment, containing a long project title or refining a familiar form. Still inspect the immediate entering/leaving state. Landing can be designed as a page, but its CTA must connect to the correct registration/sign-in destination and match the promise made before it.

Use **a small set of high-information scenarios**, not a screenshot quota:

- One normal complete path through the slice, shown in a short recording or live preview.
- One repeated-use path: Replay at end, rerecord, accept/next, return/revise.
- One preservation/recovery path: failed save or unknown result, then safe recovery.
- Relevant empty, loading and permission states available through deterministic review controls; capture only states that materially change layout or decision-making.
- Desktop, phone and short-screen views of the hardest composition; long RU and portrait/landscape/square content where applicable. Test 767/768 where layout changes, not every width for every trivial state.

Maintain a compact state ledger: state/trigger, what remains visible, primary action, protected data, recovery, evidence, untested limit. Reuse shared error/loading patterns, but inspect each page where their height or meaning changes the task. Financial unknown outcomes, destructive confirmation and lost recording access cannot be represented solely by an ephemeral toast. Keyboard, actual touch interaction and zoom checks belong to implementation verification; a 48px bounding box alone is not proof, as New dub already demonstrated.

## Responsibilities and parallel work

| Responsibility | Accountable role | Boundary |
|---|---|---|
| Product purpose and consequential choices | Owner, supported by one product/UX design lead | Decide what the experience should accomplish and tradeoffs affecting users, money, data or permissions |
| Content hierarchy, interaction and visual composition | One design lead for the connected slice | Challenge bad specs; own coherence from low-fi through high-fi; do not scatter page composition across unrelated executors before a direction exists |
| Coordination, source-of-truth synchronization and acceptance accounting | Orchestrator | Keep one active decision version, route conflicts and preserve scope/evidence; do not substitute receipt aggregation for experiencing the journey |
| Implementation | Executor(s) with bounded module ownership | Realize the approved design, preserve invariants, identify deviations and supply behavior/render evidence |
| Independent critique | Reviewer with the complete slice and primary artifacts | Evaluate the job and the design itself as well as conformance; no requirement to manufacture findings or defend an approved mistake |

These are responsibilities, not a requirement for five separate agents. A lean run can have the Orchestrator also lead design, with a fresh review before owner presentation and an executor for integration. If the owner wants the same designer to implement, preserve independent critique and explicit scope rather than adding roles ceremonially.

Parallelism should begin after shared vocabulary, layout principles and transitions are agreed. Independent auth and project-list refinements can proceed in parallel; two agents should not independently redesign the same recording shell. Share the same versioned preview/decision record, assign nonoverlapping files and an integration owner, and require a connected recheck after merging their work. Bigger models may help critique; they do not remove these coordination requirements. This proposal recommends responsibilities, not an unproved model ranking.

## Specs and issues follow design decisions without losing business rigor

Before design, extract the true requirements and conflicting presentation clauses. Do not produce exhaustive CSS/anatomy prose that preselects the answer. During exploration, keep proposals labeled and use the existing active contract as the behavioral baseline; a conflict is a design finding to resolve, not a reason to silently ignore it.

After Checkpoint 1, record the chosen interaction decisions and required spec changes. After Checkpoint 2, make the affected shared behavior/presentation rules authoritative, link the approved artifact and update individual task scope/AC under the user's authorization. Remove or replace obsolete active clauses; preserve history separately. Published issues stay the task authority; do not maintain a competing live local queue.

If a contract makes a page fail its purpose, the design lead must propose a contract correction. Examples: Landing cannot remain limited to a sparse title/CTA if it must explain and demonstrate value; Record cannot retain mandatory source-toggle anatomy while the approved design uses Replay/Your take. Neither change permits weakening account isolation, credit authorization, candidate protection or generation identity.

## Readiness definitions

| Gate | Observable evidence |
|---|---|
| Design-ready for owner review | Clear job/content brief; actual low-fi desktop/phone views; realistic content; connected actions where needed; conflicts and tradeoffs named. A written layout description alone fails this gate. |
| Implementation-ready | Owner-approved relevant structure and high-fi direction; exact artifact version; consequential interactions settled; key alternate states shown; affected spec/task conflicts resolved; module boundaries and verification plan defined. Any simulation/technical feasibility gap is explicitly bounded. |
| E2E-ready | A person can understand and operate the complete intended journey without coaching; primary and repeat actions work; success and recovery are understandable; required domain/input/responsive checks pass on the named implementation. Record includes explicit replay-from-end, candidate audition, rerecord, accept/next and failed-save retention. Backend-free evidence is labeled as such. |

Design approval and implementation verification are separate evidence types. A beautiful prototype can fail persistence, and perfectly preserved data can sit behind an unusable page. E2E-ready requires both within the stated scope; it does not imply production deployment or a guarantee against future usability findings.

## Concrete trial: Landing

**Job:** a new visitor understands what Dubbed does, why the result is interesting, what they must provide/do, and how to start. Preserve truthful scope: the person records characters in their own voice; do not imply automatic voice cloning, quality guarantees, real rendered proof or unapproved prices.

**Before production implementation, the owner receives:**

1. A content argument with proposed real copy: the promise; a recognizable example of the intended result; the brief path “choose scene → record lines → get a video”; what Start dubbing leads to. Identify what authentic permitted demonstration media actually exists. If none exists, show an explicitly labeled illustrative concept and mark the missing proof; do not present the current synthetic generation fixture as a genuine customer result.
2. Actual low-fi desktop and phone wireframes. Recommended starting composition: a concise promise paired with the main scene/result demonstration; a clear primary CTA; a short explanation of the required user effort below/alongside it; relevant eligibility/support information subordinate to the decision. This is a starting hypothesis, not a mandatory hero/three-card template. Show the first viewport and necessary continuation, not only a full-page miniature.
3. A clickable path from Start dubbing into the intended account entry, with a sample return for existing users. Owner decisions at Checkpoint 1: “Does this explain the product and make the result worth trying?” and “Is the promise/example truthful and compelling?” Confirm the content hierarchy, not every gap in pixels.
4. High-fi browser preview applying the existing brand with representative media/copy. Checkpoint 2 evaluates legibility, balance, demonstration salience, CTA and phone composition. Show unresolved real-demo availability separately; do not call placeholder proof complete.

Acceptance question: after viewing the page, can an unfamiliar visitor explain what they will upload, what they themselves will do, what they receive, and where to begin? Ask them rather than supplying the answer. A few formative observations are enough to expose obvious confusion, not to claim a statistically proven conversion lift.

## Concrete trial: Record

**Job:** follow the scene and supplied dialogue, rehearse, capture, hear the take and progress confidently. Use the owner's proposed center video → centered dialogue → boxed waveform, with desktop right rail containing clip position, Replay/Record/Your take, then navigation. Do not make the owner reapprove that starting direction merely because the old spec differs.

**Before production implementation, the owner receives:**

1. A compact behavioral decision card explaining the conflict with old skip/gap navigation. Adopt the owner's intended sequential acceptance for the proposal; ask only unresolved consequences: how Previous revisits accepted clips and whether Next on a revisited accepted clip simply advances. Preserve existing safe draft/acceptance semantics unless the owner changes them. State whether accepting a usable partial remains eligible, rather than hiding that rule in a count.
2. Actual low-fi desktop and phone screens populated with a realistic scene and long RU dialogue. Desktop follows the proposed rail. Phone puts media/dialogue/waveform and the same action groups in a deliberate single-column order; a short-height variant demonstrates what scrolls. No tiny-video workaround solely to pass a fit assertion.
3. A connected low-fi loop: Replay → end → Replay again; Record → candidate → Your take → rerecord or accept/Next; Previous; last acceptance → Result; failed save with take retained; microphone loss/access denied with contextual recovery. Simulate technical outcomes explicitly, and keep the reviewer state selector outside the proposed product UI. Checkpoint 1 asks whether the action model and grouping match the owner's intended workflow and whether short-screen tradeoffs are acceptable.
4. High-fi preview with actual Mabry/Affect controls, bounded media for multiple aspect ratios, useful capture feedback, integrated reference-volume control and contained persistent errors. Show idle, capturing and candidate states side by side or through toggles. Checkpoint 2 asks whether dialogue and performance actions are clearly prioritized and the composition remains comfortable in the demonstrated states.

Implementation then verifies actual capture/media/transport semantics. The original end-cursor bug must have a browser reproduction and regression: play to the fixed turn boundary, activate Replay, observe the synchronized scene/audio restart and advance. A low-fi simulated restart is design evidence only. Persistent saved-take/error/unknown state must survive UI simplification; hiding a redundant label cannot delete the underlying safety behavior.

## Lean reusable prompts

### Orchestrator

```text
Design <page/journey and user outcome> within <authorized scope>.
Extract business invariants and current owner direction; identify obsolete UI
clauses instead of treating prose anatomy as approved visual design.
Use one design owner and the existing brand/tools. Produce a compact brief plus
actual low-fi desktop/phone and connected states where the task requires them.
Bring a versioned artifact to the owner for structure/interaction decisions,
then refine and independently critique a high-fi browser preview for handoff.
Bundle consequential questions; no approval per pixel. Record exactly what each
approval covers. Update affected specs/issues only when authorized; preserve one
active rule, source history and unrelated work. Do not infer deployment authority.
```

### Designer

```text
Make this user outcome understandable and operable: <goal>.
Inventory required content, primary decision, secondary utilities and success.
Challenge any existing composition requirement that obstructs that goal; preserve
the listed business invariants and adopted Affect/Mabry/icon identity.
Show actual wireframes, not just descriptions. Use realistic copy/media lengths.
Recommend one coherent layout; offer alternatives only for a real tradeoff.
Connect the normal path, repeated use and the highest-impact recovery states.
Show desktop, phone and short-screen behavior before polishing. Explain what is
simulated. Revise from owner feedback and capture the approved version explicitly.
```

### Independent reviewer

```text
Review <versioned connected artifact> against the user's purpose first, then the
behavior/safety contract and visual identity. Try the task without the author's
click script. What does the user understand, notice, do next, repeat and recover?
Do not defend a poor design because the spec requires it; identify the spec change.
Check real content, primary hierarchy, grouping, transitions and phone/short views.
For Record, explicitly replay from the end and exercise candidate/failed-save paths.
Separate observed behavior, visual judgment, simulation and untested inference.
Return the few highest-impact findings with evidence, a coherent correction and
the next check. Conformance, screenshot count and green tests are not UX acceptance.
```

## Smallest useful next authorization

Authorize **one bounded Record design pilot through Checkpoint 1 only**: compact behavior card, actual low-fi desktop/phone/short-screen wireframes and a clickable rehearsal/candidate/recovery loop, using existing tools in an isolated preview. No product integration, spec publication, Git/GitHub mutation or acceptance implied. Record is the best first test because the owner has supplied a concrete direction and the audit identified repeatable interaction failures.

The owner would then review a tangible artifact and decide whether to continue to high fidelity. Landing can be the next separate slice using the corrected product-purpose brief; it need not wait for a new exhaustive specification package. The pilot tests whether this workflow produces better decisions before scaling it across all pages.
