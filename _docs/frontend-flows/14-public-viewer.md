> WITHDRAWN — owner decision, 2026-10-22. Public sharing/viewing by link is excluded from the MVP. Users can only download the finished file and share it externally. This document is historical, not an active specification or pending question list. See [the shared contract](00-shared-contract.md).

# Flow 14 — Unlisted public result viewer

Date: 2026-10-22 (Asia/Qyzylorda)  
Status: initial specification draft; owner decisions `OPEN-14-01`–`OPEN-14-03` remain open  
Mode: specification only; no product code, dependency installation, mockup, browser run, GitHub mutation, or implementation verification is authorized or claimed

## 1. Purpose and authority

This flow lets a person who has an opaque unlisted link watch the currently published finished dub without signing in.

The [shared frontend contract](00-shared-contract.md) governs localization, the centralized service boundary, confirmed visual direction, and cross-flow behavior. [Flow 13](13-sharing.md) owns the authenticated owner's small Result dialog, access on/off, link copy, and public-viewer launch. This flow starts only after the opaque URL is opened and owns public resolution, presentation, playback, and public failure states.

The confirmed contract is:

- link holders can watch without an account while access is enabled;
- the result is unlisted and is not exposed through a gallery, search, or discovery feed;
- the public capability exposes only the intended finished result, never the source, transcript, turns, takes, credits, project controls, or editing access;
- disabling and re-enabling sharing preserves the same token and URL;
- the same URL resolves to the latest eligible, validated, successfully published finished result;
- a pending, failed, invalid, stale, or reversed-order replacement does not displace the prior published result;
- an eligible successful replacement switches the public target atomically;
- project deletion disables that project's link, and account deletion disables every link owned by the account.

This document does not promise global hosting, a route shape, cache-purge timing, physical erasure, or revocation of copies already obtained.

## 2. Scope and boundaries

### In scope

- resolving an opaque public capability without an owner session;
- showing a public top bar and one result-viewing surface with no sidebar;
- loading, playable, unavailable, revoked/disabled, deleted, invalid, and media-delivery states;
- public playback behavior after the media descriptor is authorized;
- retry/re-resolution behavior where the owner approves it;
- refresh and newer-published-result behavior;
- English/Russian copy, desktop/phone layout, keyboard use, focus, zoom, contrast, and reduced motion;
- logical services and backend-free mock truth;
- acceptance criteria and a verification plan that has not been executed.

### Out of scope

- owner sharing/link controls; sign-in, projects, account, billing, recording, editing, or owner navigation;
- source media/data, transcript, turns, takes, speakers, background tracks, internal processing, comments, reactions, collaboration, analytics, gallery, search, or discovery;
- password, expiry, per-viewer permission, reporting/removal, traffic, retention, CDN/cache, hosting, route, token, or physical-erasure policy;
- owner/project identity, title, timestamps, link metadata, download, or any other public field/action unless later approved.

## 3. Design-skill application

Both requested skills were read and applied. `design-taste-frontend` supplies the no-sidebar viewer shell, flat surfaces, truthful states, dominant real media, restrained chrome, focus, and phone composition; the owner-fixed direction replaces a random draw. `frontend-design` keeps the finished video dominant and informs plain state/action copy, responsive access, and the removal of decorative cards, gradients, glows, generic hero copy, and scattered motion.

The result is a white/light-gray shell, compact top bar, and black video stage. Exact colors, type, dimensions, radii, controls, top-bar contents, and motion remain open; no skill default, screenshot, or browser result is approved or claimed.

## 4. Entry, exit, and ownership

### Entry

The viewer enters through the exact opaque public URL supplied by Flow 13. No owner authentication is required or requested for ordinary enabled-link playback.

The client passes the opaque capability to the public resolver. It does not parse the token into project data, infer access from local state, or construct a media URL itself.

Opening a locally mocked URL is an entry only to the declared mock scope. It is not evidence that an anonymous person on another device can reach it.

### Exit

The browser controls ordinary back, close, and refresh behavior. No owner workspace return, sign-in CTA, project CTA, download CTA, or other destination is introduced here without an owner decision.

The exact top-bar navigation destinations and language-switch behavior remain open. Whatever is selected must not expose owner-only navigation or suggest that the viewer can edit the result.

### Ownership handoffs

- Flow 13 owns enable/disable/copy/open; Flow 10 owns authenticated Result, download, rendering, and Share entry.
- Publication owns eligibility, generation order, validation, prior-target protection, and atomic target selection.
- Public resolution and media delivery own minimized authorization, playable delivery, and delivery errors.
- Project/account deletion flows own warnings and destructive confirmation; this viewer respects their committed fence.

## 5. Page anatomy

The public viewer is one quiet page, not an owner workspace: a compact light top bar, an accessible resolution/state region, a dominant black video stage, and only approved playback/recovery controls. Top-bar contents are open; credits, account/project navigation, Record/Result tabs, and owner identity are forbidden. A newer-result notice exists only if `OPEN-14-03` selects it.

The viewer has no project/owner card, source preview, transcript, turns, takes, editing toolbar, sharing controls, related videos, or gallery recommendations. Failure states retain stage geometry where practical to avoid layout shift.

## 6. Main behavior

### 6.1 Initial resolution

The page sends the URL's opaque capability to `ResolvePublicCapability`. During resolution it shows the final frame with a flat loading treatment and no shimmer, fabricated title, poster, duration, or owner metadata. Only an enabled response naming one eligible, validated, published result authorizes a delivery request; the playable stage then replaces loading without a material layout shift.

The UI does not claim that capability resolution proves that media bytes can be played. Resolution and delivery have separate failure states.

### 6.2 Playback

Playback is result-only. It cannot reveal or request source audio, isolated tracks, transcript, turns, takes, or an owner session.

The specification makes no autoplay guarantee. Browser policy and the still-open playback decision must not be hidden behind a test that assumes media begins automatically. A keyboard- and touch-operable start path is required.

The permitted visible controls, seeking behavior, fullscreen behavior, and public download action are blocked by `OPEN-14-02`. The page must not add a download affordance by analogy with the authenticated Result flow.

Media playback errors do not change sharing state or retarget the link. Recovery re-resolves or retries delivery according to the eventual error contract; it never publishes a result or rotates a token.

### 6.3 Same URL and latest successful result

The resolver returns the publication service's current eligible public target, not merely the most recently started or completed job.

Queued/running, failed, invalid, and stale replacements leave the prior published result current. Generation/revision fencing prevents a late older job from moving the URL backward. Successful eligible publication changes the target atomically; a fresh open or refresh then resolves the newer target and never a half-published result.

What happens to a viewer who already has the prior result open is blocked by `OPEN-14-03`. Until answered, the spec does not select automatic interruption, an update notice, or refresh-only behavior.

### 6.4 Disable, re-enable, and deletion

- When the owner disables access, subsequent public resolution must fail closed at that same URL.
- Re-enabling restores resolution through the same token/URL and selects the current eligible published target.
- Project deletion permanently fences that project's capability from public resolution.
- Account deletion permanently fences all capabilities owned by that account.
- Late render, publication, sharing, or cache events cannot restore access after a deletion fence.

The public presentation may classify these causes internally, but whether it names them to a link holder is blocked by `OPEN-14-01`. The page must not imply that disabling or deletion erased downloads, recordings, browser caches, intermediary caches, backups, or copies held by other people.

## 7. State model and recovery

| Internal state | Required invariant | Public presentation boundary |
|---|---|---|
| Resolving | No media request before authoritative capability success | Stable loading frame; provisional copy only |
| Playable | Enabled capability and one eligible published result | Black stage and owner-approved player controls |
| Replacement pending | Prior published target remains current | Do not expose unfinished work; continue serving prior result |
| Replacement failed/stale | Prior published target remains current | Do not expose internal failure; continue serving prior result |
| Disabled/revoked | No playback descriptor is returned | Public wording is blocked by `OPEN-14-01` |
| Project/account deleted | Deletion fence wins over late events | Public wording is blocked by `OPEN-14-01` |
| Invalid/unknown capability | Fail closed and disclose no project/account existence | Public wording is blocked by `OPEN-14-01` |
| Temporary resolver failure | Do not reinterpret as revoked or deleted | Retry visibility/copy is blocked by `OPEN-14-01` |
| Media delivery/broken media | Sharing state remains enabled; media is not falsely shown as playable | Safe error and retry model is blocked by `OPEN-14-01` |
| Newer result published | Same URL now targets the new eligible result | Already-open-page behavior is blocked by `OPEN-14-03` |

A Retry action, if selected, repeats only the failed resolution or delivery step, prevents duplicate concurrent attempts, remains available by keyboard and touch, and reports repeated failure honestly. It cannot bypass a disabled/deleted fence.

Refresh starts authoritative resolution again. It does not rely on a cached local access flag or stale media URL as proof that access remains enabled.

## 8. Desktop, phone, and accessibility

### Desktop and wider layouts

- The top bar and stage share one frame; the video is largest, keeps its aspect ratio, and is not cropped for decoration.
- State text stays close to the stage; empty side space does not become promotional or metadata panels.

### Phone and narrow layouts

- One column, no sidebar or page-level horizontal scroll; video preserves aspect ratio and orientation.
- Controls regroup without covering video or clipping EN/RU labels; meaningful state and playback start remain reachable at representative widths, including 390 px in future verification.
- Browser chrome, safe areas, orientation changes, and fullscreen return cannot strand focus or hide recovery.

Exact margins, stage maximum width, touch-target size, control layout, and breakpoints remain shared design decisions rather than values invented here.

### Keyboard, screen reader, motion, and zoom

- Focus follows top bar, player, recovery, then any approved update action; every control is named, stateful, keyboard operable, and visibly focused on light surfaces and the black stage.
- Loading/errors and approved updates are announced without repeatedly moving focus or forcing playback.
- Reduced motion removes nonessential transitions; 200% zoom/narrow reflow keeps playback and recovery reachable without page-level horizontal scroll.
- Final contrast and focus styling await approved shared tokens.

## 9. Visible copy and localization

English and Russian are required. These strings define intent only and remain provisional pending product/localization review.

| Intent | Provisional English | Provisional Russian |
|---|---|---|
| Generic page name | Shared video | Видео по ссылке |
| Resolution loading | Loading video… | Загружаем видео… |
| Playback start | Play | Воспроизвести |
| Retry action | Retry | Повторить |
| Generic unavailable candidate | This video isn't available. | Это видео недоступно. |
| Temporary failure candidate | We couldn't load the video. Try again. | Не удалось загрузить видео. Попробуйте еще раз. |
| New-version candidate | A newer version is available. | Доступна новая версия. |
| Update candidate | Update | Обновить |
| Local mock scope | Local demo — available only in this browser profile. | Локальная демоверсия — доступна только в этом профиле браузера. |

The unavailable, temporary-failure, Retry, and newer-version strings are candidates, not selected behavior. Their use depends on `OPEN-14-01` and `OPEN-14-03`.

Copy rules:

- use plain sentence-case viewer language without token, generation, CDN/cache, account, or project internals;
- do not call an unlisted link secure/private/secret, identify an owner/project without approval, or imply it cannot be forwarded;
- do not claim revocation erases existing copies or present a local mock as globally reachable.

## 10. Logical service contracts

Names are descriptive, not prescribed endpoints.

### 10.1 `ResolvePublicCapability`

**Input:** opaque capability; optional known public-target revision; locale hint conveying no owner identity.

**Success:** enabled status, opaque publication revision, one eligible published-result media descriptor, minimum approved public metadata, delivery authorization, and declared local-mock scope when applicable.

**Unavailable/error:** disabled/revoked, deletion-fenced, invalid/unknown, no eligible target, temporary failure, inconsistent publication, or delivery-authorization failure. Detailed cause may remain internal; no result discloses owner/session/project/source/edit data.

The resolver applies access, deletion, eligibility, validation, and generation-order fences together. A stale success cannot revive access or move the target backward.

### 10.2 `GetPublicMediaDelivery`

**Input:** resolver-issued descriptor/authorization and any eventual supported range request.  
**Success:** playable finished media or bounded delivery response.  
**Errors:** expired/invalid authorization, unavailable/unsupported media, transient failure, or interrupted delivery.

The client re-resolves when authorization or publication freshness requires it. It never substitutes the source upload or an owner-only media URL.

### 10.3 Optional publication freshness

If `OPEN-14-03` selects in-page awareness, a freshness check may return unchanged, newer eligible target, revoked/deleted, or temporary failure. Polling/push, interval, page visibility, and network budget remain unselected.

## 11. Backend-free mock boundary

A backend-free implementation may expose a **local mock public route** through the interchangeable mock service. It must use the same logical state model and must be visibly labeled as available only in the named same-browser/profile or local development scope.

Required mock scenarios cover: enabled playback; same-URL disable/re-enable; prior target during pending/failed replacement; atomic newer-target switch; reversed completion order; disabled, deletion-fenced, invalid, and unknown capability; temporary resolution failure; broken/unsupported/interrupted media; refresh and owner-selected open-page behavior; EN/RU, desktop/phone, keyboard, and reduced motion.

A local mock demonstrates only the named browser/local scope. It does not prove public DNS, anonymous cross-device reachability, backend authorization, production storage, media hosting, CDN behavior, cache revocation, privacy, or deletion timing.

## 12. Acceptance criteria

- [ ] **AC-14-01 Anonymous entry:** an enabled opaque link resolves without sign-in or owner-session prompts.
- [ ] **AC-14-02 Result-only boundary:** public responses and UI expose only the approved finished result and minimum approved metadata, never source, transcript, turns, takes, credits, owner navigation, or editing commands.
- [ ] **AC-14-03 Unlisted boundary:** there is no gallery, search, discovery feed, related-content surface, or indexable listing introduced by this flow.
- [ ] **AC-14-04 Finished eligibility:** playback is offered only for an eligible, validated, successfully published finished result.
- [ ] **AC-14-05 Prior-target protection:** pending, failed, invalid, stale, or reversed-order replacement work preserves the prior published result.
- [ ] **AC-14-06 Atomic latest switch:** a newer eligible successful publication changes the same URL's target atomically and cannot expose partial or backward state.
- [ ] **AC-14-07 Stable re-enable:** disable/re-enable preserves the exact token/URL and resumes against the current eligible target.
- [ ] **AC-14-08 Deletion fence:** project/account deletion prevents public resolution, and late events cannot revive it.
- [ ] **AC-14-09 Resolution/delivery truth:** capability success and media delivery are distinct; broken delivery is never shown as successful playback.
- [ ] **AC-14-10 No autoplay assumption:** implementation and tests provide a usable playback-start path and do not treat automatic start as guaranteed.
- [ ] **AC-14-11 Viewer anatomy:** light flat shell, compact top bar, no sidebar, dominant black stage, no gradients or decorative marketing blocks.
- [ ] **AC-14-12 Responsive access:** desktop and phone preserve aspect ratio, readable EN/RU states, reachable playback/recovery, and no page-level horizontal scroll.
- [ ] **AC-14-13 Keyboard and assistive technology:** all approved controls are keyboard/touch operable, named, visibly focused, and state changes are announced appropriately.
- [ ] **AC-14-14 Refresh authority:** refresh re-resolves authoritative access and target state instead of trusting a stale local access flag or media URL.
- [ ] **AC-14-15 Local-demo honesty:** any backend-free route is labeled same-browser/profile/local only and makes no global-hosting claim.
- [ ] **AC-14-16 Operational restraint:** copy does not promise cache purge, backup deletion, physical erasure timing, or revocation of copies already obtained.
- [ ] **BLOCKED AC-14-17 Public failure privacy:** visible unavailable/deleted/revoked/invalid/temporary states and Retry behavior follow `OPEN-14-01`.
- [ ] **BLOCKED AC-14-18 Playback actions:** public controls and any download action follow `OPEN-14-02`.
- [ ] **BLOCKED AC-14-19 Already-open latest revision:** successful replacement behavior for an already-open viewer follows `OPEN-14-03`.

## 13. Verification plan — not executed

No implementation, public host, browser, accessibility, media, or security verification was authorized or run. Future evidence must record command/manual procedure, environment, date, revision or dirty-worktree boundary, and artifact location.

### Contract and service tests

- resolve enabled/unavailable/error capabilities anonymously and assert response minimization;
- preserve the prior target through pending/failed/stale/reversed jobs, then atomically switch one valid newer target on the same URL;
- assert exact token identity after disable/re-enable and no revival after project/account deletion plus late events;
- separate resolver success from authorization/delivery/interruption failure; test freshness only after `OPEN-14-03`.

### Component, browser, and media tests

- inspect all resolution/delivery states and approved controls by pointer, touch, and keyboard in no-autoplay environments;
- test reload during access/publication changes and only the seeking/fullscreen/download behavior approved by `OPEN-14-02`;
- check EN/RU, long copy, 200% zoom, reduced height/motion, orientation, desktop/tablet/390 px phone, aspect ratio, crop, overflow, focus, and announcements;
- verify Back/refresh/fullscreen focus and absence of owner, project, source, take, edit, gallery, or related-video leakage.

### Manual, security, and operational checks

- owner approves failure privacy, player actions, open-page updates, top-bar/navigation, language, and copy;
- security/operations review capability minimization, logs/referrers, enumeration, hosting, delivery, abuse, cache/revocation, retention, and deletion claims;
- cross-device anonymous playback requires a real public host; local mock evidence is recorded separately.

## 14. Dependencies and open decisions

### Dependencies

- [Shared frontend contract](00-shared-contract.md): localization, confirmed light direction, service boundary, and unresolved design tokens.
- [Flow 13 sharing](13-sharing.md): owner access control, exact opaque URL handoff, stable-token behavior, and separate open copy/link decisions.
- Flow 10 Result: finished-result lifecycle and authenticated player; its public handoff exposes no owner context.
- Publication service: eligibility, validation, generation ordering, prior-target preservation, and atomic target selection.
- Public resolver/media delivery: anonymous capability authorization, minimized responses, playable delivery, revocation, and operational evidence.
- Project/account deletion flows: destructive warnings and committed deletion fences.

Flow 13's `OPEN-13-01`–`OPEN-13-03` remain separate owner-dialog decisions. This flow does not decide its toggle commit model, disabled-link Copy/Open behavior, or clipboard recovery.

### Owner questions sent through the Orchestrator

#### `OPEN-14-01` — Public failure privacy and Retry

Choose whether link holders see one neutral unavailable state, state-specific revoked/deleted/invalid messages, or a single message even for temporary delivery failures. This controls privacy disclosure, Retry visibility, and failure copy.

#### `OPEN-14-02` — Public player actions

Choose the allowed playback controls and whether public MP4 download exists. No download permission is inferred from the authenticated Result page.

#### `OPEN-14-03` — A newer result while the viewer is open

Choose automatic switch, a non-interrupting update notice with manual update, or refresh/new-open only. This controls interruption, freshness checks, announcements, and tests.

### Other unresolved contracts

- exact top-bar contents, destinations, language selection/persistence, and whether any destination leaves the viewer;
- exact public route/host/URL syntax/token format and browsing-context behavior;
- approved safe public metadata, if any; owner identity and project/link metadata are currently excluded;
- exact shared palette, typography, dimensions, spacing, radii, focus treatment, controls, breakpoints, and final copy;
- media range delivery, poster behavior, buffering UI, fullscreen/orientation details, and supported browser versions;
- cache/revocation propagation, offline and already-downloaded copies, backups, old exports, physical cleanup, rate/abuse controls, and public launch policy.

## 15. Evidence boundary
This file specifies intended behavior only. It does not establish that a viewer route, mock/live service, public host, media delivery, or anonymous playback exists; that the interrupted scaffold implements it; that a link works outside one local browser profile; or that responsive, accessibility, security, privacy, revocation, deletion, and browser checks passed. Those claims require authorized implementation and recorded evidence against a named revision and environment.
