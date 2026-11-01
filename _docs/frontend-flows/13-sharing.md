> WITHDRAWN — owner decision, 2026-10-22. Public sharing/viewing by link is excluded from the MVP. Users can only download the finished file and share it externally. This document is historical, not an active specification or pending question list. See [the shared contract](00-shared-contract.md).

# Flow 13 — Owner sharing controls

Date: 2026-10-22 (Asia/Qyzylorda)  
Status: initial specification draft; owner decisions `OPEN-13-01`–`OPEN-13-03` remain open  
Mode: specification only; no product code, dependency installation, mockup, browser run, GitHub mutation, or implementation verification is authorized or claimed

## 1. Purpose and authority

This flow lets an authenticated project owner control whether the current finished dub is available through its unlisted public link, copy that link, and open the public viewer.

The sharing surface is a **small modal dialog opened from Result**, not a route or separate page. The [shared frontend contract](00-shared-contract.md) governs the shell, current light visual direction, localization, service boundary, and cross-flow behavior. Its latest owner decisions override conflicting older wording in [SPEC-001](../specifications/SPEC-001_dubbed_mvp.md) and [BR-001](../business-requirements/BR-001_custom_video_dubbing.md).

The confirmed product contract is:

- the owner controls access on/off;
- anyone with the unlisted link can view without an account when access is on;
- there is no public gallery, search, discovery feed, editing access, or account context;
- disabling and later re-enabling sharing preserves the same link/token;
- the link resolves only to the latest eligible, validated, successfully published finished generation;
- while a replacement is pending or fails, the previous published finished generation remains the public target;
- project deletion disables that project's link, and account deletion disables all links owned by the account;
- deletion confirmations must warn about those link consequences in their owning flows.

Exact public URL shape, application routes, cache/revocation propagation, and physical erasure promises remain open. This document must not invent them.

## 2. Scope and boundaries

### In scope

- opening and closing the sharing dialog from the finished Result state;
- loading authoritative access/link/target state;
- enabling access for the first time;
- disabling and re-enabling access without rotating the stable link;
- copying the opaque public URL and reporting clipboard success or failure;
- opening the public viewer through the opaque URL supplied by the sharing service;
- truthful loading, mutation, conflict, unknown-outcome, unauthorized, deleted, and unavailable states;
- reload/reopen reconciliation;
- desktop, phone, keyboard, focus, screen-reader, zoom, and localization behavior;
- logical frontend service contracts and backend-free mock requirements;
- handoffs to Result, public viewer, project deletion, and account deletion.

### Out of scope

- a standalone sharing page or share-management dashboard;
- the public viewer layout, media player, public unavailable screen, or viewer analytics; Flow 14 owns them;
- generating, rendering, validating, storing, or deleting video output;
- changing a result, recording, turn, transcript, timing, speaker, or background;
- public comments, reactions, collaboration, social sharing integrations, galleries, indexing, or discovery;
- password-protected links, per-viewer permissions, expiration controls, download permissions, view counts, or link rotation unless later approved;
- deletion confirmation UI; Flow 11 and Flow 15 own the warnings and destructive actions;
- selecting an exact route, host, URL syntax, token format, cache TTL, CDN policy, backup lifetime, or erasure SLA;
- claiming that a backend-free demonstration is reachable outside its explicitly named local browser scope.

## 3. Design-skill application

Both requested skills were read and applied as analysis guidance:

- `design-taste-frontend` classifies Result and this dialog as an app screen/component. Because the owner already fixed the light, flat product direction and this assignment covers one dialog, its component rule applies: skip the random style draw, match the surrounding product, keep the surface quiet, use a shadow only because the dialog floats, use sentence case, and use color only where state or action needs it.
- `frontend-design` informs the restrained hierarchy, plain action labels, specific failure copy, visible focus, phone reflow, and reduced-motion behavior. The dialog has one main job—control access—and does not add decorative sections or template chrome.

No skill-generated palette, typeface, copy, random draw, geometry, or token is approved by this specification. Exact shared tokens, type, measurements, radii, and final wording remain subject to the shared design and localization decisions.

## 4. Entry, exit, and ownership

### Entry

Flow 10 Result owns the `Share` entry point. It opens this dialog only in an authenticated project context and passes:

- project identity and current project-access revision;
- the authoritative current finished-generation identity shown by Result;
- the latest sharing summary Result already knows, if any;
- an invocation identity used for focus restoration.

The dialog still reloads or reconciles authoritative sharing state. The passed summary may seed a stable skeleton or known presentation, but it cannot authorize access changes or decide the active public target.

If Result has no validated finished generation, its Share action is unavailable under Flow 10. A forged, stale, or direct invocation must fail closed and must not create a link for incomplete media.

### Exit

The dialog closes through its close control, `Escape`, or the library's accessible outside-dismiss behavior when safe. Closing the dialog does not itself change access.

On close:

- focus returns to the Result `Share` control or the nearest surviving logical control;
- Result receives or refreshes the authoritative sharing summary;
- result playback, download, render state, and accepted recordings remain unchanged;
- if the project or session became inaccessible, the parent flow follows its own access/session behavior instead of restoring focus to a removed control.

Opening the public viewer is an exit to Flow 14. Whether that launch uses the same browsing context or a new one is part of the still-open route/navigation contract; the frontend must use the service-supplied opaque URL rather than assemble a route.

## 5. Dialog anatomy

The small dialog uses one reading column and the minimum structure needed to understand access and act on it.

1. **Programmatic dialog title**
   - user-facing concept: `Share result`;
   - names the current finished result context without exposing internal generation IDs.
2. **Short access explanation**
   - explains that anyone with the link can watch without signing in when access is on;
   - states that the result is unlisted and is not placed in a public gallery;
   - does not claim secrecy from anyone who receives or forwards the link.
3. **Access control row**
   - visible on/off state in text as well as control position;
   - accessible name includes the consequence, not only `On` or `Off`;
   - pending state prevents contradictory duplicate mutations and keeps the last confirmed state legible.
4. **Stable-link region**
   - displays the opaque public URL according to `OPEN-13-02`;
   - never exposes the token as a separate developer-facing value;
   - long URLs truncate visually without changing the copied value and without causing horizontal page overflow.
5. **Actions**
   - `Copy link`;
   - `Open public viewer`;
   - availability follows confirmed access and URL state, subject to `OPEN-13-02`;
   - no generic `Submit`, social-network buttons, or unrelated result actions.
6. **Status/error region**
   - reports loading, saved access state, copy success, copy failure, service failure, conflict, or reconciliation need;
   - status changes are announced without moving focus unexpectedly;
   - an actionable error identifies the failed action and the next safe step.
7. **Close control**
   - has an accessible name;
   - remains reachable at high zoom and phone widths.

Indicative information order, not approved geometry:

```text
┌ Share result                                      Close ┐
│ Anyone with the link can watch. This result is unlisted.│
│                                                        │
│ Link access                              On / Off       │
│                                                        │
│ public URL                                              │
│ [ Copy link ]  [ Open public viewer ]                  │
│                                                        │
│ status or actionable error                             │
└────────────────────────────────────────────────────────┘
```

## 6. Authoritative state model

The UI derives from one authoritative sharing record, not from an isolated local toggle.

### Required logical fields

- project identity;
- owner-access status and project-deletion status;
- stable sharing-record identity;
- access state: enabled or disabled;
- opaque public URL when the service may disclose it to the owner;
- public-target finished-generation identity;
- target publication state and media eligibility;
- sharing revision used for conflict detection;
- latest known result-publication revision;
- optional replacement state: none, pending, validating, failed, or successfully switched;
- local-demo scope when the active service is the backend-free mock.

The frontend must not derive a public URL from a project ID, persist a raw capability in analytics, or infer the public target from whichever render completed most recently.

### State invariants

1. **Owner authorization.** Only an authorized owner session can read or mutate sharing controls.
2. **Capability isolation.** The public URL grants only the Flow 14 viewing capability. It grants no owner shell, project data, source upload, transcript, turns, takes, billing, or editing access.
3. **Stable re-enable.** Disable and re-enable preserve the same sharing record and same token/link. Ordinary toggling never rotates the token.
4. **No mutation by copy/open.** Copying or opening the URL does not change access, create a new render, or rotate the link.
5. **Finished-only target.** A public link targets only an eligible, validated, successfully published finished generation.
6. **Prior-target protection.** Pending, validating, failed, stale, or invalid replacement work cannot replace the prior public target.
7. **Monotonic switch.** The public target switches atomically only when the newest eligible requested generation wins publication. A late older completion cannot move the link backward.
8. **Deletion fence.** Project or account deletion makes affected links unavailable and prevents late jobs/events from reviving them.
9. **Access toggle independence.** Turning sharing off does not delete, rerender, or change the owner's finished result.
10. **Server truth.** Reload, reconnect, duplicate clicks, multi-tab changes, and uncertain responses reconcile against authoritative state and revision.

## 7. Main and alternate flows

### 7.1 Open with sharing already enabled

1. The owner activates `Share` on Result.
2. The dialog opens with its programmatic title and stable loading structure.
3. The frontend requests authoritative sharing state for the authorized project.
4. On success, it shows access as on, the stable link, and the currently published target summary.
5. The owner may copy the link, open the public viewer, turn access off, or close.

If a replacement result is pending or failed, the dialog may state that the link still opens the previous finished result. It must not describe the replacement as public before successful publication.

### 7.2 Enable for the first time

1. The dialog loads a valid finished target with access off and no previously disclosed URL, or an existing disabled sharing record.
2. The owner initiates enabling according to `OPEN-13-01`.
3. The frontend sends desired state `enabled`, the known sharing revision, and an idempotency identity.
4. While the outcome is pending, controls that could issue a contradictory access mutation are unavailable; the last confirmed state remains distinguishable from the requested state.
5. On authoritative success, the service returns enabled state, stable sharing revision, opaque public URL, and published target identity.
6. Only then may the UI announce that link access is on and enable link actions.

The service creates or retrieves the stable sharing record. The client never generates a capability token.

### 7.3 Disable access

1. The owner initiates disabling according to `OPEN-13-01`.
2. The frontend sends desired state `disabled`, expected sharing revision, and an idempotency identity.
3. On authoritative success, the dialog announces that link access is off.
4. The sharing record/token association remains available for same-link re-enable.
5. The owner result remains playable and downloadable in the authenticated Result flow.
6. Flow 14 must resolve the link as unavailable while access is disabled.

What remains visible/copyable in the disabled dialog is blocked by `OPEN-13-02`.

### 7.4 Re-enable access

1. The dialog loads the disabled sharing record and its authoritative revision.
2. The owner initiates enabling according to `OPEN-13-01`.
3. The service enables the same sharing record and returns the same stable URL/token identity.
4. The UI announces success only after the authoritative response.
5. The link resolves to the current eligible published target. If a replacement render is pending or failed, that target remains the prior successfully published result.

The re-enable path must be tested for exact stable-link identity; a visually similar but newly rotated URL does not satisfy the contract.

### 7.5 Copy link

1. The owner activates `Copy link` when allowed by the final `OPEN-13-02` decision.
2. The UI copies the exact opaque public URL currently returned by the sharing service.
3. On success, a concise status such as `Link copied` is shown and announced.
4. Copy success does not claim that an external viewer or global host was reached.
5. On browser clipboard failure, behavior follows `OPEN-13-03`; the UI must not report success.

Clipboard retry never requests a new token and never changes public access.

### 7.6 Open public viewer

1. The owner activates `Open public viewer` only when access is authoritatively enabled and a launchable opaque URL is present.
2. The frontend opens that URL using the eventual route/navigation contract.
3. Flow 14 resolves capability state and owns the public page, player, loading, unavailable, revoked, deleted, and delivery-error presentation.
4. Flow 13 neither embeds a duplicate player in the dialog nor assumes that opening the URL proves successful playback.

### 7.7 Replacement result pending or failed

- The sharing dialog keeps showing the current public target as the previously published finished generation.
- Access on/off continues to apply to the stable link itself.
- Copy/open, when enabled, continue to use the same URL and previous public target.
- A pending result is not labeled `latest shared version` until publication succeeds.
- A failed replacement leaves both the previous target and access state unchanged.
- When successful publication occurs, the service atomically moves the same link to the new finished generation; reopening or refreshing the dialog reflects that state.

### 7.8 Project or account deletion

Flow 13 does not initiate deletion.

- Flow 11 project deletion obtains share-link existence/state and warns that the shared video will be removed and the link will stop working.
- Flow 15 account deletion warns that all account-owned links will stop working.
- Once deletion commits, this dialog can no longer mutate or restore the sharing record.
- Late result or sharing events cannot re-enable access or republish a target.
- The UI must not promise a specific cache purge or physical erasure time until the operational policy is approved.

## 8. Loading, error, reload, and concurrency behavior

### Initial load

- Keep the compact dialog structure stable while loading.
- Do not show a fabricated URL or assume the passed Result summary is current.
- Link actions and access mutation remain unavailable until authoritative state is known.
- A slow request gets an honest loading label; it does not silently fall back to a locally remembered access state.

### Load failure

- Keep the dialog open with an inline error that names the failed load and offers `Retry` or close.
- Do not expose a stale cached capability as confirmed current state after authorization, deletion, or access status becomes unknown.
- A known prior URL may remain visually masked or withheld, but its usability must not be claimed until reconciliation. Exact sensitive-cache handling belongs to the service/security contract.

### Mutation failure with a definite rejection

- Restore or retain the last confirmed access state.
- Explain that the access change was not saved.
- Offer a retry using a new request identity while preserving stable sharing-record identity.
- Never create a second link as a recovery shortcut.

### Unknown mutation outcome

Timeout, lost response, reconnect, or browser interruption may leave the outcome unknown.

1. Mark the submitted action as needing reconciliation rather than failed or successful.
2. Re-fetch authoritative sharing state/revision.
3. If the desired state already committed, show it without sending a duplicate mutation.
4. If it did not commit, return to the last confirmed state and offer retry.
5. If reconciliation still fails, keep link actions conservative and state what could not be confirmed.

### Conflict or another tab

- A stale revision response triggers a fresh state load.
- The latest authoritative access state wins; the local toggle does not overwrite it blindly.
- The dialog explains that sharing changed elsewhere only when that fact is known, then presents the current state.
- A conflict cannot rotate the token or publish an ineligible generation.

### Reload and reopen

- Reloading Result and reopening the dialog loads the same authoritative sharing record.
- Access and the stable link survive ordinary browser reload according to server/mock persistence scope.
- A submitted unknown mutation is reconciled before another mutation is issued.
- The dialog must not depend on transient component state to remember whether sharing is enabled.

### Session expiry or authorization loss

- No capability or project detail is shown as usable after owner authorization is lost.
- The dialog follows the shared reauthentication/session behavior and preserves only safe return context.
- Reauthentication reloads sharing state; it does not replay an access mutation automatically.

### No valid public target

If the service reports no eligible finished target, invalid media, deleted project, or fenced publication state:

- access cannot be newly enabled;
- copy/open remain unavailable;
- the error identifies whether the owner should return to Result, retry loading, or has lost access;
- Flow 13 never repairs or rerenders the result.

## 9. Desktop, phone, keyboard, and assistive technology

### Desktop and tablet

- The dialog overlays Result and keeps the compact top navigation and Record / Result workspace in the background; it does not introduce a sidebar.
- The background is inert while the modal is open.
- The dialog remains a single reading column with flat white/light-gray surfaces and restrained separation.
- A shadow is permitted only to establish that the dialog floats; no gradient, glow, glass, decorative illustration, or tinted icon tile is introduced.
- The black video stage stays in Result and is not duplicated in this dialog.

### Phone

- The sharing surface remains a modal dialog within Result, not a new page.
- It uses the available viewport width with safe outer space and can scroll internally when text, browser chrome, zoom, or the on-screen keyboard reduces height.
- Controls remain touch-operable without precise gestures; the URL wraps or truncates without page-level horizontal scrolling.
- English and longer Russian text may increase height without covering the status, close control, or actions.
- The exact centered-versus-sheet presentation and measurements are shared design decisions; either must preserve the same semantics, focus containment, information order, and actions.

### Focus and keyboard

- Opening moves focus into the dialog at its title or first meaningful control in a way that announces context before mutation controls.
- Focus is contained within the modal while it is open.
- Logical order follows title, explanation, access control, URL, link actions, error/retry, close.
- `Tab` and `Shift+Tab` reach every available action once in a predictable cycle.
- `Space`/`Enter` operate the focused switch/button according to native semantics.
- `Escape` closes when closing is safe; closing never silently discards a locally staged change if `OPEN-13-01` selects a Save model.
- On close, focus returns to the Result `Share` control or nearest surviving logical control.
- Visible focus must meet contrast requirements on every light surface and cannot rely on color alone.

### Screen readers and announcements

- The dialog has a name and description.
- The access control exposes checked/state semantics and a consequence-oriented label.
- Loading, access saved, copy success, copy failure, mutation failure, and reconciled conflict use an appropriate polite status announcement.
- Authorization loss, deleted project, and unavailable target are announced as errors without repeatedly stealing focus.
- Disabled actions have an adjacent or programmatic explanation; no required explanation exists only in a hover tooltip.

### Motion, zoom, and contrast

- Dialog open/close motion, if any, is brief and functional; reduced-motion preference removes nonessential movement.
- No state depends only on animation.
- At 200% zoom and narrow reflow, controls and error recovery remain reachable without page-level horizontal scrolling.
- Final contrast cannot be verified until exact shared tokens are approved.

## 10. Visible copy and localization contract

English and Russian are required. Final strings require product/localization review; the table below defines meaning and gives provisional plain-language copy, not approved copywriting.

| Intent | Provisional English | Provisional Russian |
|---|---|---|
| Dialog title | Share result | Поделиться результатом |
| Access explanation | Anyone with the link can watch without signing in. This result is unlisted. | Любой, у кого есть ссылка, сможет посмотреть результат без входа. Результат не публикуется в каталоге. |
| Access control | Link access | Доступ по ссылке |
| Enabled state | On | Включен |
| Disabled state | Off | Выключен |
| Copy action | Copy link | Копировать ссылку |
| Open action | Open public viewer | Открыть публичный просмотр |
| Copy success | Link copied | Ссылка скопирована |
| Access save failure | Access change was not saved. Try again. | Изменение доступа не сохранено. Попробуйте еще раз. |
| Retry | Retry | Повторить |
| Prior target while rendering | The link still opens the previous finished result while the new result is being prepared. | Пока новый результат готовится, по ссылке открывается предыдущий готовый результат. |
| Prior target after failure | The new result was not published. The link still opens the previous finished result. | Новый результат не опубликован. По ссылке по-прежнему открывается предыдущий готовый результат. |
| Local mock scope | Local demo link — available only in this browser profile. | Локальная демоссылка — доступна только в этом профиле браузера. |

Copy rules:

- say `anyone with the link`, not `public to everyone` or `private`;
- say `unlisted`, not `secure`, `secret`, or `cannot be forwarded`;
- name the action that failed and the safe next step;
- do not expose internal words such as token, capability, generation fence, revision, CDN, or cache;
- do not claim deletion erased every copy or cache before the operational contract exists;
- do not claim a local demo URL is globally reachable.

## 11. Logical service contracts

Names are descriptive, not prescribed API endpoints.

### 11.1 `GetOwnerSharingState`

**Input:** authenticated account/session context; project ID; known project/result/sharing revision when available.

**Success result:** authorized project summary safe for the dialog; stable sharing-record identity; enabled/disabled state; opaque public URL when disclosable; public-target finished-generation identity and publication status; sharing revision; current replacement status; deleted/inaccessible fence; local-demo scope when applicable.

**Errors:** unauthenticated; unauthorized; project not found/deleted; no eligible finished result; target/media unavailable; temporary service failure; inconsistent state requiring reconciliation.

### 11.2 `SetOwnerSharingAccess`

**Input:** authenticated account/session context; project ID; desired enabled/disabled state; expected sharing revision; current eligible finished-generation/publication reference; idempotency identity.

**Success result:** committed access state; stable sharing-record identity; same opaque URL on re-enable; new sharing revision; current public target; server timestamp/status safe for UI.

**Errors:** unauthorized; deleted/inaccessible project; no eligible finished target; stale/conflicting revision; stale result-publication reference; invalid state; definite rejection; temporary failure; unknown outcome requiring reconciliation.

The operation is idempotent for the request identity. It never rotates the stable link as part of ordinary disable/re-enable and never changes the owner result.

### 11.3 `ResolvePublicCapability` handoff to Flow 14

Flow 14 receives the capability through the opaque public URL and resolves:

- access enabled/disabled/revoked/deleted;
- current eligible published finished-generation descriptor;
- safe public presentation metadata;
- unavailable or temporary delivery state.

It receives no owner session, owner shell, source, transcript, turns, takes, credits, or edit commands. Flow 13 does not duplicate this resolver or player.

### 11.4 Deletion-impact handoffs

- Flow 11 may query whether a project has a sharing record and whether its link is active, then includes the confirmed project-deletion warning.
- Flow 15 may query the count/existence of account-owned sharing records for its account-deletion warning.
- After deletion commits, sharing mutations and public resolution remain fenced even if a late job/event arrives.

## 12. Backend-free mock boundary

The frontend may be exercised against an interchangeable mock service before the live backend exists, but the mock must implement the same logical contracts and invariants.

Required mock scenarios:

- never shared, eligible finished result;
- enabled with a stable URL;
- disabled then re-enabled with the exact same URL;
- previous published target while a replacement is pending;
- previous published target after replacement failure;
- atomic switch after a newer eligible result succeeds;
- load failure, definite mutation failure, unknown mutation outcome, and stale revision conflict;
- deleted project and deleted account fences;
- unauthorized/session-expired owner;
- clipboard success/failure seams;
- reload/reopen reconciliation within the declared mock persistence scope.

Any mock public link must be labeled as a **local demo link available only in the named local browser profile/scope** until a live backend and public host exist. The specification requires that label; it does not claim the current scaffold already implements it. A successful local mock open proves only the declared local scope, not anonymous global availability, hosting, CDN behavior, cache revocation, or production privacy.

## 13. Acceptance criteria

- [ ] **AC-13-01 Dialog boundary:** Result opens a small modal sharing dialog; there is no standalone owner-sharing page, sidebar, duplicate Result player, or duplicated public viewer.
- [ ] **AC-13-02 Authoritative load:** the dialog loads owner-authorized sharing state and does not fabricate a URL, access state, or public target from local component state.
- [ ] **AC-13-03 Anonymous unlisted contract:** visible copy states that link holders can watch without an account and that the result is unlisted; no gallery/discovery/editing capability is introduced.
- [ ] **AC-13-04 Finished-only publication:** the public target is always an eligible, validated, successfully published finished generation.
- [ ] **AC-13-05 Prior-target protection:** pending, failed, invalid, or stale replacement work preserves the previous public target; successful eligible publication switches atomically.
- [ ] **AC-13-06 Stable re-enable:** disabling and re-enabling preserves the exact sharing-record/token/link identity and does not rerender or delete the owner result.
- [ ] **AC-13-07 Deletion fence:** project deletion disables its link, account deletion disables all owned links, and late events cannot restore access.
- [ ] **AC-13-08 Deletion warning handoff:** Flow 11/15 receive enough authoritative sharing impact to warn about link consequences before destructive confirmation; Flow 13 does not duplicate deletion UI.
- [ ] **AC-13-09 Mutation truth:** access changes are announced only after authoritative commit; definite failure preserves the last confirmed state and unknown outcome reconciles before retry.
- [ ] **AC-13-10 Concurrency:** stale revisions, duplicate requests, multi-tab changes, reload, and reversed result completion cannot rotate the stable link, overwrite newer access state blindly, or move the target backward.
- [ ] **AC-13-11 Copy integrity:** successful copy uses the exact service-supplied opaque URL, changes no state, and reports clipboard failure honestly.
- [ ] **AC-13-12 Open-viewer boundary:** Open uses the opaque public URL and hands off to Flow 14; Flow 13 does not claim playback success or define the public player.
- [ ] **AC-13-13 Privacy boundary:** owner controls require authorization; the public capability exposes only safe public metadata and intended finished media, never source, transcript, turns, takes, billing, or owner navigation.
- [ ] **AC-13-14 Responsive modal:** the dialog remains usable on desktop, tablet, and phone, including long EN/RU copy, zoom/reflow, reduced height, and long URLs, with no page-level horizontal overflow.
- [ ] **AC-13-15 Keyboard and focus:** the dialog traps focus, supports keyboard operation and Escape semantics, explains unavailable actions, announces state changes, and restores focus to Result on close.
- [ ] **AC-13-16 Local-demo honesty:** a backend-free public-link demonstration is labeled as limited to its named local browser profile/scope and makes no global-hosting claim.
- [ ] **AC-13-17 Operational restraint:** UI copy does not promise an exact URL shape, cache purge, backup/CDN deletion, physical erasure time, or public-host availability before those contracts are approved.
- [ ] **BLOCKED AC-13-18 Toggle commit model:** enabling/disabling follows the owner-selected immediate, Save, or confirmation model from `OPEN-13-01`.
- [ ] **BLOCKED AC-13-19 Disabled-link presentation:** disabled-state URL visibility and Copy/Open availability follow `OPEN-13-02`.
- [ ] **BLOCKED AC-13-20 Clipboard recovery:** copy-failure recovery follows `OPEN-13-03` and remains keyboard/phone accessible.

## 14. Verification plan — not executed

No implementation or browser verification was authorized or run. When implementation is authorized, record command, environment, date, revision/dirty-worktree boundary, and evidence location.

### Contract and service tests

- load never-shared, enabled, and disabled sharing records;
- enable first access and verify server-issued opaque URL;
- disable/re-enable and assert exact same link identity;
- assert copy/open do not mutate access or result state;
- assert a pending/failed replacement keeps the previous public target;
- assert an eligible successful replacement switches the same link atomically;
- complete old/new result jobs in reverse order and assert the old one cannot retarget the link;
- exercise definite failure, timeout/unknown outcome, idempotent retry, stale revision, and multi-tab conflict;
- delete project/account, then deliver late result/share events and assert no revival;
- assert authorization and public-data minimization boundaries.

### Component and interaction tests

- dialog open/close and focus restoration from Result;
- loading, loaded, mutation-pending, enabled, disabled, conflict, deleted, unauthorized, and retry states;
- owner-selected toggle commit behavior after `OPEN-13-01` is resolved;
- owner-selected disabled-link presentation after `OPEN-13-02` is resolved;
- clipboard success and owner-selected failure fallback after `OPEN-13-03` is resolved;
- opaque long URL display versus exact copied value;
- open-viewer handoff without embedded player or owner data;
- reload/reopen after committed and unknown-outcome mutations.

### Browser, responsive, and accessibility checks

- inspect representative states at desktop, tablet, and supported phone widths, including 390 px;
- check long English/Russian strings, mixed-script project names, long opaque URLs, 200% zoom/reflow, and reduced viewport height;
- complete load, toggle, retry, copy, open, and close paths using keyboard only;
- verify dialog naming/description, switch semantics, live announcements, unavailable-action reasons, focus containment, Escape, and focus return with a screen reader;
- verify visible focus, contrast after tokens are approved, reduced motion, touch targets, and no page-level horizontal scroll;
- verify a local mock public link is visibly limited to the named browser profile and does not claim production reachability.

### Manual/product checks

- owner reviews final EN/RU copy and understands on/off, unlisted access, same-link re-enable, previous-result preservation, and deletion consequences;
- owner confirms the dialog remains small and subordinate to Result on desktop and phone;
- security/operations review the eventual opaque URL, logging/analytics redaction, cache revocation, retention, deletion, and public-host contracts before production claims;
- Flow 14 owner verifies the handoff without duplicating player behavior in this document.

## 15. Dependencies and handoffs

| Dependency | Flow 13 responsibility | Other owner responsibility |
|---|---|---|
| [Shared contract](00-shared-contract.md) | Follow shell, light direction, localization, services boundary, and confirmed owner decisions | Shared design/token decisions remain open |
| [Flow 10 Result](10-result.md) | Accept project/current-generation context; return refreshed sharing summary and focus | Own Share entry point, finished-result eligibility, player, download, and render lifecycle |
| Flow 14 public viewer | Supply only opaque public launch/capability handoff | Own public route, resolution UI, player, unavailable/revoked/deleted states, and delivery errors |
| [Flow 11 My projects](11-projects.md) | Expose link existence/state and enforce post-delete fence | Own project deletion impact, warning, confirmation, and slot behavior |
| Flow 15 account settings | Enforce all-link fence after deletion | Own account-deletion warning, confirmation, and policy |
| Authentication/session flow | Fail closed on owner authorization loss | Own sign-in/reauthentication and safe return |
| Result/publication service | Display authoritative target and replacement status | Own eligibility, validation, generation fencing, and atomic current-target publication |
| Sharing service | Call through centralized frontend service boundary | Own stable capability, authorization, access revision, idempotency, and conflict truth |
| Live public hosting/delivery | Avoid claims before it exists | Own public host, media delivery, abuse controls, cache/revocation, retention, and operational evidence |

## 16. Open decisions and operational unknowns

### Owner UI/behavior questions sent through the Orchestrator

#### `OPEN-13-01` — Access-control commit model

How should the dialog apply the access switch?

- **Immediate after toggling (recommended):** fewest steps for a reversible action; on failure, restore the last confirmed state and offer Retry.
- **Only through `Save`:** stage changes in the dialog and send one explicit mutation.
- **Confirm every change:** add a confirmation before enable and disable.

Affected requirements: enable/disable steps, close-during-change behavior, focus order, `AC-13-18`.

#### `OPEN-13-02` — Stable link while access is off

What should the dialog show when the stable link exists but access is disabled?

- **Show the same link but disable Copy/Open (recommended):** demonstrates same-link re-enable without suggesting the link currently works.
- **Hide the link until re-enabled:** visually simpler but makes stable-link preservation less evident.
- **Allow copying the disabled link:** supports advance sharing but recipients see an unavailable viewer until re-enabled.

Affected requirements: disabled anatomy, copy/open availability, `AC-13-19`.

#### `OPEN-13-03` — Clipboard failure recovery

What should happen when browser clipboard access fails?

- **Show a selectable URL and `Select and copy manually` guidance (recommended):** preserves a path to the goal when clipboard permission remains blocked.
- **Show only the error and Retry:** compact, but does not help with a persistent browser denial.
- **Open the system Share menu when supported:** adds a platform-dependent contract.

Affected requirements: copy failure, phone behavior, `AC-13-20`.

### Kept open by higher-level contracts

- exact owner and public routes, public host, URL shape, token format, and whether Open uses the same or a new browsing context;
- exact cache/CDN revocation behavior, propagation target, offline-copy limitations, intermediate/backup/old-export retention, and physical erasure promises;
- content reporting/removal, abuse controls, traffic/download limits, rate limits, and launch policy;
- exact shared palette, typography, sizes, spacing, radii, focus treatment, phone dialog geometry, and final localized copy;
- live backend/public-host readiness and evidence.

These unknowns must remain visible in implementation planning. They do not authorize inventing a temporary production promise.

## 17. Evidence boundary

This file specifies intended behavior only. It does not establish that:

- the interrupted frontend scaffold implements this dialog;
- any mock service or public link exists;
- any URL is globally reachable;
- anonymous production playback works;
- cache revocation or deletion meets a particular timing guarantee;
- responsive, accessibility, security, or browser checks passed.

Those claims require authorized implementation and recorded evidence against a named revision and environment.
