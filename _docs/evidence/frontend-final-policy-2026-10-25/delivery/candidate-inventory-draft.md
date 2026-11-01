# Candidate path inventory — draft only

Status: **not final and not frozen.** This is the observed scope for Root's later package decision; it is not a staging manifest. Do not calculate or publish the final hash manifest until Root confirms the source freeze and adds the remaining gate artifacts.

Baseline commit: `0c9b9d6069fcf625c1d54a2709ea16e8f0cbb2d2`. The following frontend paths appeared in the current working-copy status snapshot on 2026-10-25. Recheck them after recording implementation and the final gate are complete.

## Candidate frontend delta observed

| Path | Observed state | Scope note |
|---|---|---|
| `frontend/src/features/new-dub/NewDubScreen.tsx` | modified | Short-source eligibility and upload UI path. |
| `frontend/src/features/new-dub/NewDubScreen.test.tsx` | modified | Short-source boundary and localized UI coverage. |
| `frontend/src/services/index.ts` | modified | Shared service surface used by the current frontend changes. |
| `frontend/src/services/mock-projects.ts` | modified | Mock project/source validation behavior. |
| `frontend/src/services/mock-recording.ts` | modified | Recording grant/candidate behavior; final unique-candidate fix remains pending. |
| `frontend/src/services/mock-store.ts` | modified | Mock store behavior used by the source and recording changes. |
| `frontend/tests/services/project-title-and-replacement.test.ts` | modified | Source replacement preservation and title provenance tests. |
| `frontend/tests/services/recording-results.test.ts` | modified | Recording candidate-result coverage; final regression remains pending. |
| `frontend/e2e/full-journey.spec.ts` | modified | Recording journey integration; captured typecheck reported TS6133 at lines 24 and 131. |
| `frontend/e2e/new-dub-upload-boundary.spec.ts` | new | Native-browser short-source upload and replacement path. |

These are observed paths only. New paths or changes after recording freeze are not included until Root confirms the final list. A recording viewport/locale-switching spec may change; its path and status are pending final source freeze.

## Candidate tracked contract summary

| Path | Observed state | Scope note |
|---|---|---|
| `_docs/frontend-implementation-contract.md` | tracked modification | Root reviewed the complete tracked diff and confirmed exactly three bounded current-decision hunks; include only this reviewed summary delta. |

## Candidate dated decision and gate evidence

| Path | Current SHA-256 / status | Scope note |
|---|---|---|
| `_docs/evidence/frontend-final-policy-2026-10-25/owner-decision-receipt.md` | `5077DAC5FDE44BD9ADE64B2AC17ABB8AE1E066851C9162417EAF294353AC949A` | Self-contained owner decisions, local before/after hashes, live issue body hashes, review corrections and provenance. |
| `_docs/evidence/frontend-final-policy-2026-10-25/contract-review.md` | `C4ECA8D974ABCAF701A729FDAE9E16FFAAACC1D3EFB0E0B6647692C8E5298013` | Root-owned bounded semantic review and tracked/untracked provenance confirmation. |
| `_docs/evidence/frontend-final-policy-2026-10-25/short-source/verification.md` | `6FB70DC5E2AE1CB722541AA6718DEAF450F10B3AA4D8083BB691226206A5C71B` | Decision-specific mock/browser proof; typecheck recorded NOT PASS on that verification boundary. |
| `_docs/evidence/frontend-final-policy-2026-10-25/short-source/new-dub-short-source-error-en.png` | `C0DBCBC0ED24E56624020DEF0B140F5B1EE20C190BEDF3C0966559A43C419234` | Initial short-source rejection screenshot. |
| `_docs/evidence/frontend-final-policy-2026-10-25/short-source/new-dub-short-replacement-preserved-en.png` | `5D3C7FC8E57554AB4B216651AB56F51DD950C53A834EDB2EE16B59EE3933F487` | Rejected replacement preservation screenshot. |
| `_docs/evidence/frontend-final-policy-2026-10-25/root-source-before.json` | Root-owned; unchanged, original hash `9E24557F663F1E74568AAC8F47053E2A11DEAB06DB4D880DDA8D26B4EC4F8310` | Preserve as root provenance; final packaging/inclusion remains Root-owned. |
| `_docs/evidence/frontend-final-policy-2026-10-25/remaining-criteria-map.md` | current draft | Live AC map; refresh after final Root gate. |
| `_docs/evidence/frontend-final-policy-2026-10-25/delivery/live-issue-baseline-2026-10-25.md` | current read-only baseline | Three current issue body hashes and comment counts; refresh before any later issue mutation. |
| `_docs/evidence/frontend-final-policy-2026-10-25/delivery/candidate-inventory-draft.md` | this file | Path-selection draft only; not the final manifest. |

## Exclusions and pending artifacts

- Exclude the pre-existing untracked local authorities `_docs/frontend-flows/00-shared-contract.md`, `_docs/frontend-flows/06-new-dub.md`, and `_docs/frontend-flows/09-record.md`, along with the rest of the untracked flow corpus. Their local synchronization and provenance remain intact; the dated receipt and live issue criteria carry the decision summary.
- Exclude unrelated dirty documents and skills, previous dated-proof folders, and old canonical screenshots regenerated by tests. Do not broaden the candidate to make the worktree clean.
- The existing `_docs/evidence/frontend-implementation-2026-10-23/mock-integration-gate-2026-10-24.md` is already present at the baseline commit; cite it as existing evidence rather than adding the old report or its prior evidence tree to this candidate.
- Recording Save-and-leave candidate-ID fix, focused regression, and native UI reload proof are pending. Root's final gate artifacts and any recording viewport/locale-switching evidence are pending. Add only the exact new dated artifacts Root supplies after source freeze.
- The final candidate hash manifest is **not ready**. Create it only after Root confirms the frozen source/evidence inventory and all final gate records exist.

