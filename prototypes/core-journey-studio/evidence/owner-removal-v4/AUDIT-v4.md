# REMOVE-01 correction — studio low-fi v4

Date2026-10-27, Asia/Qyzylorda. Bounded correction after the completed [v3 independent review](../../review/REVIEW-v3.md).

Removed exactly one unused EN/RU dictionary pair from each current prototype locale.js. The removed key described replacing the prepared scene/unsaved takes through the withdrawn workflow. Every surrounding byte is preserved, preventing deletion of unrelated translations on the same compact source line.

The old v3 literal check covered known control IDs/copy but missed this untranslated dictionary key and its Russian value. [runtime-copy-check.mjs](runtime-copy-check.mjs) now parses and scans every current dictionary key and value, including unused entries; it also scans all root JS/HTML/CSS runtime files in both prototypes. Case-insensitive English/Russian retired-workflow patterns cover the missed pair. Positive detector fixtures prove that both the English key form and Russian translation form fail the check; ordinary rerecord/save/Result-retry wording remains allowed. Exact expected after-hashes prove this correction removed only that pair.

Result: [runtime-copy-results.json](runtime-copy-results.json), PASS. Both dictionaries have74 remaining pairs and identical SHA2569534363f028e3cd70274c0377863eac891589b215101c77769d08b5f69f0906a. Direct module import verifies syntax and preserved Russian Record/My projects/save-failure labels. Both npm.cmd run build commands pass with Vite7.3.7.

No visual or interaction source changed: studio src.js/studio.css/index.html and all other prior runtime/evidence fingerprints remain exact. The v3 independent49/49 browser assertions and accepted visual dispositions STUDIO-01/STUDIO-02 remain historical evidence for those unchanged files; no new whole-matrix/browser/visual run is claimed for this unused-copy deletion. No screenshots, old review/check results, canonical requirements, tasks or GitHub state were rewritten. Original high-fi approval remains historical with the existing owner removal amendment, now completed by this copy correction.

Current target is core-journey-studio-lowfi-v4. The visible prototype lab still says Studio v3 because the reviewed structure/markup is intentionally unchanged. Preview5179; amended original5178. Integration/production/publication/commit/push remain held. Ready for low-fi review. EDITS PAUSED.
