# Pre-commit publisher guard

Captured: 2026-10-24 20:22:01 UTC (UTC)

## Repository and accepted boundary

- Branch: `main`.
- HEAD before staging: `0c9b9d6069fcf625c1d54a2709ea16e8f0cbb2d2`.
- Index before staging: empty.
- No test was run by this Publisher; Root's accepted gate remains the frozen source/test boundary.
- Root's source freeze is 198 files, SHA-256 `372E957FAFA6DA284EA88657F4FC0BE138F2E5498B8C6C44C0E2191EC7ADE781`.
- Payload whitelist: `final-hash-manifest.json`, SHA-256 `21A56B47B40A19CC5878B5BCD72D15F14429EFF5DAD2AC522AA9065441DC2675`; 41 payload entries, all current payload hashes matched.
- The exact candidate set is the 41 manifest payload paths plus its 5 separately declared delivery controls, 46 paths total. The pre-commit receipt itself is the last declared control being created now; the only missing candidate path at the guard was this file.
- Preserve all unrelated dirty documents/skills, untracked local active-flow authorities and old regenerated proof folders. #76 remains open/deferred as future real-adapter work and is outside this mock milestone.

## Scoped diff check

- `git diff --check` over the 12 tracked payload paths (the 10 tracked frontend changes plus `CHANGELOG.md` and `_docs/frontend-implementation-contract.md`) exited 0 with no whitespace findings.
- Git emitted 12 LF-to-CRLF working-copy warnings; these are line-ending notices, not whitespace findings. No file bytes were normalized by this check.
- Index remained empty at the pre-stage guard.

## Exact staged-set check

- The manifest-derived stage operation produced exactly 46 paths: 41 payload paths plus all 5 declared controls; no outside path is staged.
- After staging, the cached diff check over CHANGELOG.md, _docs/frontend-implementation-contract.md, and frontend exited 0 with no findings.
- The whole-set cached diff check exited 2 because selected evidence contains these captured formatting bytes:
  - delivery/live-issue-baseline-2026-10-25.md:12 has a blank line at EOF.
  - delivery/publisher-receipt.md:3 and :31 have Markdown hardbreak trailing spaces and a blank line at EOF.
  - owner-decision-receipt.md:3-4 and short-source/verification.md:3-4 have Markdown hardbreak trailing spaces.
  - root-final-isolated-build.log:18 preserves the raw Vite line [plugin builtin:vite-reporter]  with its trailing space.
  - root-final-typecheck.log:4 and root-final-unit.log:19 have blank lines at EOF.
- These are evidence/receipt formatting observations outside the checked frontend and tracked documentation sources. Accepted payload evidence bytes were preserved; no whitespace normalization was applied.

## Fresh issue readback before commit

All three authorized issue updates were read back with comments across all pages. Each remains open, carries workflow status `verified`, retains its title and sole `frontend` label, has zero comments, and has all original mock-scope criteria checked. Commit/push/remote verification remain pending; separate closure decision remains required.

| Issue | Body SHA-256 | Criteria checked |
|---|---|---:|
| #77 | `DE238B292BEE43C44017978CF517AC0E0E967D3E2C4923CD65C27AB4D0A9E064` | 10/10 |
| #81 | `458FEFF5E4803E339753878428D4A6DC71CB5D86095508D3F757397B1979DB64` | 8/8 |
| #63 | `BB46D63866A1E564286217D200F0FE4886087B04298DB8E1A7FCCB908F6A1644` | 10/10 |

Readback details: [`issues-verified-readback.json`](issues-verified-readback.json). Before-update state: [`issues-preverify.json`](issues-preverify.json).

## Stage/commit instruction

Stage only the 46 paths formed by `files[].path` plus `delivery_control_files[].path` in the approved final hash manifest. Verify the staged path set equals that exact set before committing. Do not close issues in this publication step.
