# Account deletion late-work regression: independent verification

Date: 2026-10-24, Asia/Qyzylorda. Source boundary: main at 35d122949ad0e07a7e365bcbd4c1ec69202796c3 plus the active frontend working tree. This is a focused test receipt, not whole-issue acceptance or delivery.

The owner explicitly authorized adding `frontend/tests/services/account-deletion-late-work.test.ts` with the reply “Да, добавить тест”. The previous report-only-role restriction no longer blocks this exact test. A Luna executor added the test without changing product source.

Root independently ran `npm.cmd run test -- tests/services/account-deletion-late-work.test.ts` from `frontend` at 03:31:17 local time. Vitest v5.0.5 exited 0: one file, one test passed, duration 1.51 seconds. The reviewed file SHA-256 was `4023237EA6D6C77266855C69A44D81C65E1FD38F9FC333F0BDD1B38A8E73A6AA`.

The public-facade scenario creates an account and two distinct authenticated clients, accepts pending preparation, deletes the account using the current revision, advances the injected clock, and reconstructs both client facades. Old sessions remain signed out and old operation/preparation/project/source/result access is denied. Registering the same email produces a new canonical account with empty projects and credits, without repeating the welcome grant. Old workspace access remains denied and the second old client stays signed out.

This proves the exercised deterministic mock privacy boundary. It does not establish real backend worker cancellation, physical storage erasure, server session revocation, or production retention behavior. No acceptance, commit, push, or issue closure follows from this focused result alone.

## Combined current-services check

Root subsequently ran `npm.cmd run test -- tests/services` at 03:39:00 local time: 21 files and 78 tests passed, exit 0, duration 14.92 seconds. This includes the privacy case and the newly added service-owned history pagination cases. Complete output is in `root-privacy-and-history-services.log`. The fixture integrity command `npm.cmd run test:media` also passed all three tests; output is in `root-privacy-cohort-media.log`.

The earlier concurrent full-suite run in `root-privacy-cohort-unit.log` is deliberately retained as a failure receipt: 203 passed and two existing Credits UI tests failed because their injected service fixture had not yet acquired `historyPage`. The executor then updated that fixture and reported the focused eight-test rerun passing. A final frozen full-suite check remains required; the focused correction does not retroactively change the failed run.
