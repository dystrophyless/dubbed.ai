# Owner decision receipt — frontend policy sync (2026-10-25)

Repository: dystrophyless/dubbed.ai  
Local checkout: main, baseline revision 0c9b9d6069fcf625c1d54a2709ea16e8f0cbb2d2  
Decision source: owner's direct reply, recorded 2026-10-25 (Asia/Qyzylorda)

## Owner answer

> только в одной. отклонять файл. оставляй на будущее

In context: one tab per project owns recording; reject the original source when it is below the accepted duration threshold; leave the real-adapter issue for a future follow-up.

## Settled behavior

- At most one browser tab may own recording access for a project, including same-profile tabs that share the signed-in durable client/session. A second same-project tab may view, but cannot capture or accept a turn or force takeover. This does not change authentication or durable client/session identity.
- Reject an original source shorter than 1.000 seconds during upload validation before committing a new project/source or a replacement. Exactly 1.000 seconds is eligible. This source-file eligibility rule is separate from the existing selected-section bounds of 1.000–120.000 seconds inclusive and does not introduce a minimum recording-turn or microphone-take duration.
- Initial rejection creates no project, capacity/slot mutation, persistent source-media object, quote or credit effect. Rejected replacement preserves the current project, source, title/provenance, selected section, quote, occupied slot, media and credit state. The source contract reuses the existing validation-error state; this answer does not approve new localized error wording.
- #76 remains an open, blocked future real-adapter follow-up outside the current mock-backed milestone. It is neither cancelled nor completed; no real-adapter/backend delivery is promised by this scope. Existing external prerequisites and separate authorization still apply.

## Affected local authorities

The shared contract and Flow 06/Flow 09 files were untracked local authorities at the start of this sync. `_docs/frontend-implementation-contract.md` was tracked; this sync changed only three bounded owner-policy summary hunks there. Hashes below are SHA-256 captured before and after this decision delta.

| Path | Changed sections | Before SHA-256 | After SHA-256 |
|---|---|---|---|
| _docs/frontend-flows/00-shared-contract.md | Added the 2026-10-25 same-profile-tab owner decision beside the existing per-device rule; settled the under-1.000-second source-upload rejection and preservation behavior alongside source-section limits. | 285144A2C4C601A51ADB22F089E97F0A8C2E568783CDA41C28C2B20AD65D9767 | BEA5A398659A5C40A7294A0872166250D77659FE352827D6960D2A3F4B90185F |
| _docs/frontend-flows/09-record.md | §5.11 grant acquisition; §9 acquire/release grant contract; F09-AC-30. Same-profile-tab ownership is settled; OPEN-09-13-LEASE still covers unapproved timing, disconnect classification, and fencing mechanics. | 4E126A3633AD084A8CAFAB499A384B05B8C7BD4DE47D97475F89DB635B68522A | D139D8318AD6D17767BB910D610314036A3169B099C02F462C96635B0C68CC7A |
| _docs/frontend-flows/06-new-dub.md | Source-eligibility summary and validation states; AC-F06-02B; AC-F06-04/04A; §15 resolution note and OPEN-F06-T02 remainder. | A3DBD43DAF0D50E81762F1289DAA286BB02D6B5E4030762CCA981674BFD233DF | 26A4DA315B39EBF8A2291CC34D04C8A6A6EE8DA123ABB9D8169BE656B22E53B2 |
| _docs/frontend-implementation-contract.md | Flow 06 status row and resolved/open summary: source policy is settled; remaining Flow 06 selection edge mechanics stay open. | 5420074C3B9DEB75BACED0B8A627AE44E281EF526006B69706740F8B9F58EB36 | DAE5ED7A2B39759F0C2CB8AC057A1394796CC6CF14498846DCFC56A594F5F18D |

Flow 11 was checked but not edited: its AC-F11-24 already delegates source replacement to Flow 06 and preserves source/title when validation fails. Its flow ownership table also assigns replacement validation to Flow 06. The 2026-10-23 decision batch, publication snapshots, fingerprint archives, mock integration report, and HANDOFF history remain unchanged.

Root's pre-edit manifest _docs/evidence/frontend-final-policy-2026-10-25/root-source-before.json remains unmodified (SHA-256 9E24557F663F1E74568AAC8F47053E2A11DEAB06DB4D880DDA8D26B4EC4F8310).

## Live issue synchronization

Issue state, title, frontend label and comment count were read back after updates. All four remain open; no comments were added and original acceptance checkboxes were left unchanged.

| Issue | Workflow disposition | Body SHA-256 before | Body SHA-256 after |
|---|---|---|---|
| [#77](https://github.com/dystrophyless/dubbed.ai/issues/77) | in_progress; same-profile-tab policy is recorded, with mock/browser implementation and AC-07 re-verification pending. Actual durable media and production lease/cross-device evidence remain separate. | C9B4F7A953A2A815F71B1B2DADE3AF2674101055C549F6580925A7D8814C618F | E479D7D4DA490934424DAE4D374EAE2894CA188CE57EF748AF28A6945F4C6E26 |
| [#81](https://github.com/dystrophyless/dubbed.ai/issues/81) | in_progress; short-source rejection policy is recorded; implementation and AC-03 mock/browser re-verification are pending. Production upload/preview/storage/pricing remain separate gates. | A85DEB1B134D779B676ABD6E8FB8D528528725F8BEE6BF059ADF3907ADAFF3A0 | 6D1895E34491B1AB4795C545FE850599C005720F86C395920EFFA51519908E68 |
| [#63](https://github.com/dystrophyless/dubbed.ai/issues/63) | in_progress; implementation of both decisions and gate re-verification are pending. The issue is not PASS and no product acceptance is recorded. | 002DAAD5025DEF55F354F980DD9317F9337B5D37173028C1F5B1FEED04EB000E | A27E13CDE19FF63771FEBC843CC314385CD8302525840BE0CAF15445D7C91FF4 |
| [#76](https://github.com/dystrophyless/dubbed.ai/issues/76) | Remains blocked and open; owner-deferred outside the current mock-backed milestone, not cancelled or completed. No real-adapter/backend delivery is promised. | 394E9102DFFCC723913E034CB7B6C8B337D4997C429FA09EF9E20902B334842A | 48D6C5BBD90653A52AF27C1839122E720684AFF1D12B6014F482F6C7FD55661B |

## Review and delivery boundary

This receipt records the owner's decision and the contract/issue synchronization only. It is not implementation evidence, product acceptance, or production service evidence. Product code, tests, commit, push, and issue closure are outside this Publisher sync. The new and changed local documentation remains uncommitted pending the root's independent narrow spec review and the owner's existing delivery gates.

## Narrow review correction (2026-10-25)

A fresh read-only review found two stale clauses in the initial synchronization. These wording corrections align the active summary and proof checklist with the owner decision above; they do not change the decision. The original baseline before-hashes in the table above are preserved, and the initial synchronization after-hashes remain recorded there as an intermediate snapshot.

| Path | Review correction | Initial sync after SHA-256 | Post-review correction SHA-256 |
|---|---|---|---|
| _docs/frontend-implementation-contract.md | Removed the settled reject-versus-draft question and short-source-dependent OPEN-F06-T02 clause; retained upload cleanup/commit fencing, format/browser evidence, quote validity, preview recovery, and the remaining transient-input/alignment work. | DAE5ED7A2B39759F0C2CB8AC057A1394796CC6CF14498846DCFC56A594F5F18D | 9223198A75B855BA60B7E364C5189DF9FE6EEC57AAD420DD2E9B490FA011DC76 |
| _docs/frontend-flows/06-new-dub.md | Replaced the unresolved short-source checklist prompt with verification of pre-commit rejection below 1.000 seconds, eligibility at exactly 1.000 seconds, and prior project/source preservation on rejected replacement; retained transient invalid-entry behavior as open. | 26A4DA315B39EBF8A2291CC34D04C8A6A6EE8DA123ABB9D8169BE656B22E53B2 | E16511701F193EAF512054222E9AADD303CDE6EFF4412DCD88D4C16C1253BE19 |
