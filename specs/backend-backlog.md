# Backend backlog

Review findings that live only inside the mock backend (`frontend/src/services/mock/**`) and are left for the real
server (FastAPI + PostgreSQL) to own. Each entry: where it came from, the scenario, what the server must guarantee.

The mock already handles many of these (0.1.1–0.1.9); they are listed so the server is built to the same guarantees.

## Guarantees the server must keep (from fixes already made in the mock)

- Money and state are decided in one transaction: reserve on Start, charge for finished steps and refund the rest on
  cancel, full refund on failure, slot limit checked at write time.
- A cancel that arrives after preparation finished returns a typed error (`state`), never a refund; removing a
  project in preparation is refused (`state`), never a silent paid cancel.
- An aborted take or upload writes nothing, even if the abort arrives just before commit.
- An older render can't publish over a newer build of the same version.
- Account balance, reserve and slots come from one consistent snapshot.
- A purchase completes at most once: provider confirmation / webhook is idempotent and re-reads purchase state in the transaction.
- The credit history row and balance change are written in one transaction; each project run has one row, updated in place.
- Abandoned checkout expiry is owned by the provider session; the mock cancels awaiting purchases when Credits opens
  (research R5, `specs/002-credits-flow-mock/research.md`).

## Auth (004)

- Deliver verification and reset codes by email and store them on the server; codes and reset tickets are single-use
  and expire on the server (FR-005, FR-021; `specs/004-auth-mock/research.md`).
- Replace the Google stand-in with Google OAuth and the mock's salted SHA-256 password hashes with argon2 or bcrypt.
- Enforce rate limits and sign-in lockout on the server: 5 wrong attempts per email lock sign-in for 1 minute; reset
  requests are throttled identically for existing and unknown emails (FR-013, FR-021).
- Revoke sessions across devices on password reset and sign-out; reset ends all other sessions, while sign-out revokes
  the current session across its open tabs (FR-015, FR-022).
- Enforce one account per normalised email even under concurrent sign-ups; grant welcome credits exactly once in the
  same transaction as account activation (FR-007, FR-008).

## Open

- **Slot limit for purchases made before feature 003** (code review of 003, 2026-11-16). The mock raises the stored
  limit by one step per completed purchase from 0.3.0 on; an account that already had several completed purchases in
  0.2.x keeps 10 instead of the FR-001 value (e.g. 3 purchases → 20). The server must set each account's limit from its
  completed purchases once at migration (`min(50, 10 + 5 × (n − 1))`, 2 with none) and then apply one step per
  completion in the purchase transaction, never above 50. Demo presets are not part of that backfill.

### From the 004 pre-commit review (mock-only, left for the server)

- `services/mock/auth.ts:275–283`, `auth-db.ts:74–80` — a password reset revokes the old session records but then
  replaces the browser-wide `kv.current`, so other tabs of the same browser read the new session and stay signed in
  (US5-5 holds only across browsers/devices). The server needs distinct per-client sessions and delivered revocation.
- `services/mock/auth.ts:164–175` — activation commits stage `active` before the data database is opened and seeded;
  if that open fails, `completeMicrophone` returns `storage` after the stage changed and without a session event. The
  server must activate and grant the welcome credits in one transaction.
