# Data model: Sign-up and sign-in on mock services

Mock storage: `dubbed-mock-auth` (new, R1) and one data database per account (R2). Interface: [contracts/auth.md](./contracts/auth.md).

## AuthAccount (`dubbed-mock-auth` → `accounts`, key `id`, unique index `email`)

| Field | Type | Rules |
|---|---|---|
| `id` | string | `"demo"` for the demo account, otherwise a random UUID |
| `email` | string | normalised: trimmed, lower case; unique (FR-008, FR-019) |
| `passwordHash` | `{ salt, hash }` \| null | salted SHA-256 (R6); null = Google-only (FR-020) |
| `google` | `{ name }` \| null | set when Google was used (FR-019) |
| `stage` | `"verify"` \| `"microphone"` \| `"active"` | see transitions |
| `createdAt`, `activatedAt` | number \| null | `activatedAt` set once |
| `dataDb` | string | `"dubbed-mock"` for the demo account, else `"dubbed-mock-<id>"` (R2) |

**Stage transitions**

```text
sign-up (email+password) ──► verify ──(correct code)──► microphone ──(voice heard, Finish)──► active
sign-up (Google, new email) ───────────────────────────► microphone
password reset of a verify-stage account: verify → microphone (the code proves the email; R4, US5-6)
```

`active` is final. Only `active` accounts open a data database; the welcome credits are written once at `→ active` (R8).

## EmailCode (`codes`, key `[accountId, purpose]`)

| Field | Type | Rules |
|---|---|---|
| `purpose` | `"verify"` \| `"reset"` \| `"reset-ticket"` | `reset-ticket` = the ResetTicket below, same store |
| `code` | string | 6 random digits |
| `sentAt` / `expiresAt` | number | expires 10 min after sending |
| `wrongAttempts` | 0–5 | at 5 the code is dead → "request a new code" |

A resend replaces the record (new code, attempts 0) and is allowed when `now ≥ sentAt + 60 s`. A correct code
deletes the record. Never shown anywhere except the demo notice (`demo.lastCode`).

## ResetTicket (`codes`, key `[accountId, "reset-ticket"]`)

Issued when a reset code is correct (the code is used up): random `ticket`, `expiresAt` = +10 min, single use. Only
the ticket lets `finishReset` set the new password, so the password is asked only after a correct code (owner,
2026-11-17). Kept in memory on the page (never in the URL).

## Session (`sessions`, key `id`) and the current session (`kv.current`)

| Field | Type | Rules |
|---|---|---|
| `id` | string | random UUID |
| `accountId` | string | |
| `createdAt` | number | |
| `revokedAt` | number \| null | sign-out (this one), password reset (all others) |

`kv.current` = the session id of this browser, or absent (guest). A revoked or missing session = guest.

## SignInThrottle (`throttle`, key = normalised email)

`{ wrong: 0–5, lockedUntil: number | null }` — 5 wrong passwords in a row → locked 1 min; a success deletes the record.
Kept for unknown emails too, so lockout does not reveal whether an account exists.

## Per-account data (existing stores, one database per account)

Unchanged from 001–003: `kv` (account record: balance, slotLimit; demo settings), `projects`, `turns`, `takes`,
`videos`, `results`, `history` (welcome row id `"welcome"`), `purchases`. A new account's database starts with balance
120, 2 slots, the welcome row and nothing else.

## Microphone choice (browser, not server)

localStorage `dubbed.mic.<accountId>` = device id chosen on the microphone step; used by recording, falls back to
the default microphone if missing (R9).

## Invariants

1. One account per normalised email.
2. Welcome credits exist exactly once per account and only for `active` accounts.
3. No data database is opened for a guest or a non-active account.
4. A session of account A never reads or writes account B's data database.
5. Passwords and codes never appear in URLs, logs, errors or the change feed.
