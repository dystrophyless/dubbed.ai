# Feature Specification: Sign-up and sign-in on mock services

**Feature Branch**: `004-auth-mock`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Фича 004: вход и регистрация на mock-сервисах — регистрация (email+пароль или Google), код из
письма, проверка микрофона, вход, сброс пароля, выход" — sign-up (email + password or Google), the emailed code, the
microphone check, sign-in, password reset and sign-out, on the mock services.

**Sources (binding)**: `PRODUCT_BRIEF.md` §2 step 2 and §3 "Accounts, projects, credits" · `design-system/ia.md`
(public routes, core flow 1 — the microphone step is mandatory, owner 2026-11-02; auth pages have no bar, brand above the
form, EN/RU in the corner) · the Auth archetype in `design-system/templates.md` · features 001–003 (the signed-in app,
credits, welcome credits, slots), which until now run as one always-signed-in demo user.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an account with email and password (Priority: P1)

A new visitor opens Dubbed, chooses to start dubbing, enters an email and a password, receives a 6-digit code by email
and enters it, then completes a one-time microphone check. Only then is the account active: it receives the 120 welcome
credits and lands on New dub, ready to upload the first clip.

**Why this priority**: Every new user starts here; without it there is no account to own projects and credits.

**Independent Test**: In a fresh browser, sign up with a new email, enter the code, pass the microphone check, and check
that New dub opens with a balance of 120 credits, 0 of 2 project slots used and no projects.

**Acceptance Scenarios**:

1. **Given** a guest on the sign-up page, **When** they enter a valid email and a password that meets the rules and
   submit, **Then** a code is sent to that email and the code step opens, naming the email it was sent to.
2. **Given** the code step, **When** the user enters the correct code, **Then** the email is verified and the microphone
   step opens.
3. **Given** the code step, **When** the user enters a wrong code, **Then** they are told the code is wrong and can try
   again; after 5 wrong attempts the code stops working and the user must request a new one.
4. **Given** the code step, **When** the user asks to resend the code, **Then** a new code is sent (the old one stops
   working); resending is possible at most once per 60 seconds, and the page shows when it becomes possible.
5. **Given** the code step, **When** the user realises the email is wrong, **Then** they can go back and change it.
6. **Given** the microphone step, **When** the user allows the microphone and the check hears their voice, **Then** they
   can finish; the account becomes active, receives 120 welcome credits once, and New dub opens.
7. **Given** a sign-up email that already belongs to an account, **When** the user submits, **Then** they are told an
   account with this email exists and offered to sign in or reset the password.
8. **Given** an invalid email or a password that breaks the rules, **When** the user submits, **Then** the field explains
   what to fix and nothing is sent.

---

### User Story 2 - Sign in and sign out (Priority: P1)

A returning user signs in with email and password (or Google) and lands on My projects with their own projects, credits
and slots. They stay signed in across reloads and browser restarts until they sign out from the account menu; after
signing out, signed-in pages are no longer reachable without signing in again.

**Why this priority**: Without sign-in nobody can come back to their work; without sign-out a shared computer exposes the
account.

**Independent Test**: Sign in as the demo account, check My projects shows its projects and balance, reload, sign out
from the account menu, then open `/projects` directly and check that the sign-in page opens instead.

**Acceptance Scenarios**:

1. **Given** an active account, **When** the user enters the right email and password, **Then** My projects opens with
   that account's projects, balance and slots.
2. **Given** wrong credentials, **When** the user submits, **Then** they see one message "Email or password is wrong"
   that does not say which part was wrong, and the email they typed is kept.
3. **Given** a guest opening any signed-in page (e.g. a project link), **When** they sign in, **Then** they land on the
   page they originally asked for, not on My projects.
4. **Given** a signed-in user, **When** they reload or reopen the browser, **Then** they are still signed in.
5. **Given** a signed-in user, **When** they choose Sign out in the account menu, **Then** they are signed out, see the
   sign-in page, and every other open tab of the app is signed out too and shows the sign-in page.
6. **Given** a signed-in user opening the sign-in or sign-up page, **Then** they are taken to My projects.
7. **Given** a user who started sign-up but did not finish it (email not verified, or microphone step not done),
   **When** they sign in with that email and password, **Then** they continue at the step where they stopped, and the
   account is not active and has no welcome credits until that step is done.
8. **Given** the studio open in one tab with an unsaved take, **When** the user signs out in another tab, **Then** the
   studio tab shows the sign-in page as if it had been closed: the unsaved take is not claimed as saved, and saved takes
   stay with the account. (The studio itself has no sign-out — its only way out is Exit, which already asks about an
   unsaved take.)

---

### User Story 3 - Sign up or sign in with Google (Priority: P2)

A visitor chooses "Continue with Google" on the sign-up or sign-in page. On the mock, a stand-in Google step lets them
pick a demo Google account. A new Google user skips the emailed code (Google has confirmed the email) and goes straight
to the microphone step; a returning Google user goes to My projects.

**Why this priority**: Fewer steps for many users, but email + password alone already makes a complete product.

**Independent Test**: Choose "Continue with Google" with a demo Google identity that has no account → the microphone step
opens without a code step → finishing it gives 120 credits. Sign out and continue with Google again → My projects opens.

**Acceptance Scenarios**:

1. **Given** a Google identity with no Dubbed account, **When** the user continues with Google, **Then** an account is
   created with the Google email and the microphone step opens; finishing it activates the account with 120 welcome
   credits.
2. **Given** a Google identity whose email already has a Dubbed account (made with email + password), **When** the user
   continues with Google, **Then** they are signed in to that same account (one account per email), not a new one.
3. **Given** the Google step, **When** the user cancels it or Google fails, **Then** they are back on the page they came
   from with a short explanation, and nothing was created.
4. **Given** an account created with Google only, **When** the user tries email + password sign-in, **Then** they are
   told this account uses Google and are offered "Continue with Google" or setting a password through password reset.

---

### User Story 4 - Microphone check during onboarding (Priority: P2)

Before the account becomes active, the user grants the microphone and confirms it works. The step cannot be skipped. If
the browser blocks the microphone or there is no microphone, the step explains how to fix it and offers "Try again".

**Why this priority**: Recording is the product; a microphone problem found in the studio is the worst place to find it.
It is P2 only because User Story 1 depends on it and is tested through it.

**Independent Test**: On the microphone step, deny permission → the blocked explanation and "Try again" show; allow it
and speak → the step confirms the voice is heard and lets the user finish.

**Acceptance Scenarios**:

1. **Given** the microphone step, **When** the user allows the microphone, **Then** a live level shows that sound is
   heard, and once their voice is heard the step lets them finish.
2. **Given** the microphone step, **When** the browser blocks the microphone, **Then** the step explains how to allow it
   in the browser and offers "Try again"; there is no way to skip.
3. **Given** no microphone is connected, **Then** the step says so, asks to connect one and offers "Try again".
4. **Given** several microphones, **Then** the user can choose which one to use, and the choice is remembered for
   recording.
5. **Given** permission was granted but no voice is heard for 10 seconds, **Then** the step suggests speaking louder or
   choosing another microphone, and still does not let the user finish.
6. **Given** the microphone step, **Then** it recommends headphones without requiring them.

---

### User Story 5 - Reset a forgotten password (Priority: P2)

A user who forgot their password asks for a reset on the sign-in page, receives a 6-digit code by email, enters it and
sets a new password, and is then signed in.

**Why this priority**: Without it a forgotten password means a lost account with its projects and paid credits.

**Independent Test**: From sign-in choose "Forgot password", enter the demo email, enter the code, set a new password →
My projects opens; sign out and sign in with the new password; the old password no longer works.

**Acceptance Scenarios**:

1. **Given** the reset page, **When** the user enters an email, **Then** they are told "If an account exists for this
   email, we sent a code" — the same message whether or not the account exists — and the code field opens.
2. **Given** the correct code, **Then** a separate step asks for the new password twice; **When** both match and meet
   the rules, **Then** the password is changed, the user is signed in and lands on My projects, and the old password
   stops working. If the two entries differ, the step says so and nothing changes.
3. **Given** a wrong or expired code, **Then** the same wrong-code, 5-attempt and resend rules as in sign-up apply.
4. **Given** a Google-only account, **When** its password is reset, **Then** the account can afterwards also sign in with
   email + password.
5. **Given** a user who reset their password, **Then** other devices or tabs signed in to that account are signed out.
6. **Given** an account that has not finished sign-up, **When** its password is reset, **Then** after the reset the user
   continues sign-up at the step where they stopped.

---

### Edge Cases

- A code expires 10 minutes after it was sent; entering an expired code says so and offers a new code.
- The user closes the tab on the code step and comes back later: signing in with the same email and password returns
  them to the code step (User Story 2, scenario 7); the code they had still works if it has not expired.
- Two sign-ups for the same email in two tabs: only one account exists; the second submit is told the email is taken
  and offered to sign in.
- Double-pressing a submit button sends one request and one email; the button shows it is working.
- The mock service fails (network/storage) during sign-up, sign-in, code check or reset: the page shows a retryable
  error, keeps what the user typed, and nothing is half-created (no account without its password, no credits twice).
- Too many wrong passwords: after 5 wrong sign-in attempts in a row for one email, sign-in for that email waits
  1 minute, and the page says when it can be tried again.
- The user signs out in one tab while another tab is mid-upload or recording: that tab shows the sign-in page; an
  upload in flight is abandoned (as when a tab is closed) and the studio's unsaved take is not claimed as saved.
- The welcome credits are given exactly once per account, even if the microphone step is finished twice (two tabs,
  reload at the moment of finishing).
- Email is compared without regard to letter case and surrounding spaces.
- The language chosen on the auth pages (EN/RU) carries into the app after sign-in.
- Phone width (390 px): every auth step fits without horizontal scrolling; the code field works with the phone's
  one-time-code autofill and paste.

## Requirements *(mandatory)*

### Functional Requirements

**Access**

- **FR-001**: Every signed-in page (My projects, New dub, Processing, the studio, Result, Credits, Checkout) MUST be
  reachable only by a signed-in user with an active account; a guest MUST be sent to sign-in and returned to the page
  they asked for after signing in.
- **FR-002**: The sign-up, code, microphone, sign-in and reset pages MUST follow the Auth archetype: no app bar, the brand
  above the form, an EN/RU switch in the corner.
- **FR-003**: Each account MUST see only its own projects, takes, results, credits, history and slots; two accounts used
  in the same browser one after the other MUST NOT see each other's data.

**Sign-up**

- **FR-004**: Sign-up MUST take an email and a password; passwords MUST be at least 8 characters and the page MUST say
  so before the user submits. A "show password" control MUST be offered.
- **FR-005**: After sign-up the system MUST email a 6-digit code; the code is valid for 10 minutes, at most 5 wrong
  attempts, and can be resent at most once per 60 seconds (a resent code replaces the previous one).
- **FR-006**: On the mock there is no real email: the code page (sign-up and reset) MUST show, in demo mode only, a
  clearly marked demo notice with the code that was "sent" — a new random code each time, so wrong, expired and resent
  codes behave as for real (owner, 2026-11-16). The real adapter shows no such notice.
- **FR-007**: An account becomes **active** only after its email is verified (by the code, or by Google) **and** the
  microphone step is finished. The 120 welcome credits MUST be given exactly once, at activation.
- **FR-008**: An existing email MUST NOT create a second account; sign-up with it MUST say the account exists and offer
  sign-in or password reset.
- **FR-009**: A user who leaves sign-up unfinished MUST be able to resume it by signing in (FR-013), at the step where
  they stopped.

**Microphone step**

- **FR-010**: The microphone step MUST be mandatory, with no skip. The user can finish only when the microphone is
  allowed and their voice has been heard on a live level indicator; no test recording is made (owner, 2026-11-16).
- **FR-011**: The microphone step MUST handle: blocked by the browser (how to allow it + "Try again"), no microphone
  ("connect one" + "Try again"), several microphones (choose one; the choice is used by the studio), no voice heard for
  10 seconds (hint), and MUST recommend headphones without requiring them.
- **FR-012**: The microphone step MUST NOT be shown again after activation; later microphone changes belong to Settings
  (feature 005).

**Sign-in, sign-out, sessions**

- **FR-013**: Sign-in MUST accept email + password or Google; wrong credentials MUST give one message that does not reveal
  whether the email exists; 5 wrong attempts in a row for one email MUST pause sign-in for that email for 1 minute.
- **FR-014**: A session MUST last across reloads and browser restarts until sign-out (no "remember me" choice).
- **FR-015**: Sign-out MUST be in the account menu (desktop and the phone sheet); it MUST end the session in every open
  tab of the app at once, and each tab MUST show the sign-in page.
- **FR-016**: The studio keeps its focused shell with no sign-out; a sign-out in another tab MUST end the studio tab's
  session like closing the tab — an unsaved take is never claimed as saved, saved takes stay with the account.
- **FR-017**: A signed-in user opening sign-in or sign-up MUST be sent to My projects.
- **FR-027**: Until the landing feature, `/` MUST send a guest to sign-in and a signed-in user to My projects; the
  sign-in page MUST link to sign-up and back (owner, 2026-11-16).

**Google**

- **FR-018**: "Continue with Google" MUST be offered on sign-up and sign-in. On the mock, a stand-in Google step lets the
  user pick or type a demo Google identity, or cancel; the demo can make it fail.
- **FR-019**: One account per email: Google sign-in with an email that already has an account MUST sign in to that
  account; a new Google user MUST skip the code step and go to the microphone step.
- **FR-020**: An account without a password (Google only) MUST be told so on email + password sign-in and offered Google
  or password reset.

**Password reset**

- **FR-021**: Reset MUST be three separate steps: email → 6-digit code (FR-005 rules) → new password (FR-004 rules),
  entered twice and required to match → signed in. The new-password step MUST open only after a correct code (owner,
  2026-11-17). The response to the email MUST be the same whether or not an account exists.
- **FR-022**: A reset MUST end every other session of that account and make the old password stop working.

**Mock and demo**

- **FR-023**: Accounts, sessions and codes MUST live in the services layer behind one typed interface with a mock
  implementation that keeps them in the browser with the rest of the demo state; swapping in the real backend MUST NOT
  change the screens.
- **FR-024**: The demo MUST keep a ready demo account that already has the current demo data (projects, credits, slots),
  so the existing demo and features 001–003 keep working after signing in to it; its sign-in details MUST be shown on the
  sign-in page in demo mode only, and MUST NOT be the owner's real email.
- **FR-025**: The demo controls MUST be able to: expire the current code, make the next service call fail, make the
  Google step fail or be cancelled, and reset all accounts.

**Quality**

- **FR-026**: Every page in this feature MUST have loading, error (with retry) and success states, work at 1440 × 900 and
  390 × 844, pass WCAG 2.2 AA (axe clean), and have every string in English and Russian. Passwords and codes MUST never
  appear in the page address, logs or error messages.

### Key Entities

- **Account**: one per email (case-insensitive). Email, whether the email is verified, whether the microphone step is
  done, active (both done), whether a password is set, whether Google is linked, language, the chosen microphone. Owns
  projects, credits, history, slots (features 001–003). Welcome credits granted: yes/no.
- **Session**: a signed-in browser for one account; lasts until sign-out or a password reset ends it.
- **Email code**: 6 digits for one purpose (verify email / reset password) and one account; sent time, expiry
  (10 minutes), wrong attempts (max 5), replaced by a resend.
- **Demo Google identity**: on the mock only — a stand-in for a Google account (email, name).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can go from the sign-up page to New dub with 120 credits in under 2 minutes with email +
  password, and under 1 minute with Google.
- **SC-002**: A returning user can sign in and reach My projects in under 20 seconds.
- **SC-003**: In 100 % of scripted demo cases (finish twice in two tabs, reload while finishing, unfinished sign-up
  resumed, Google with an existing email, reset of a Google-only account) the welcome credits are given exactly once and
  one email never has two accounts.
- **SC-004**: After sign-out, 0 signed-in pages are reachable in any open tab without signing in again.
- **SC-005**: No account becomes active without a verified email and a finished microphone check.
- **SC-006**: Every auth page and state passes the automated accessibility check and the end-to-end tests on desktop and
  phone sizes, in English and Russian.

## Assumptions

- This feature runs on the mock services only; real email delivery, real Google sign-in and server-side security
  (password storage, rate limiting) arrive with the backend and are recorded in `specs/backend-backlog.md`.
- Settings (change email, change password while signed in, microphone, delete account) is feature 005.
- New dub, My projects, the studio and the other signed-in pages keep their current behaviour; this feature only puts
  them behind sign-in and scopes their data to the account.
- After activation the user lands on New dub (ia.md core flow 1); after sign-in, on My projects or the page they asked for.
- Password rules are kept simple (at least 8 characters); no strength meter, no forced character classes.
- No "remember me", no two-factor authentication, no other social providers.
- Layout and wording are designed in `/speckit-design` from the Auth archetype and approved by the owner; the texts quoted
  above state the meaning, not the final copy.
- The landing page (`/`) is a separate later feature (owner, 2026-11-16). Until then `/` sends a guest to sign-in and a
  signed-in user to My projects; sign-in and sign-up link to each other.
- `_carryover/` is non-visual input only.

## Clarifications

### Session 2026-11-16

- Q: Is the landing page part of this feature? → A: No — a separate later feature; `/` sends guests to sign-in and
  signed-in users to My projects for now (FR-027).
- Q: How does the user get the emailed code on the mock? → A: A demo-only notice on the code page shows the code that
  was sent, a new random code each time (FR-006).
- Q (2026-11-17, design review): Code and new password on one reset step? → A: No — separate steps; the new password
  only after a correct code, and entered twice (FR-021).
- Q: What must the microphone check confirm? → A: The microphone is allowed and the user's voice is heard on a live
  level indicator; no test recording (FR-010).
