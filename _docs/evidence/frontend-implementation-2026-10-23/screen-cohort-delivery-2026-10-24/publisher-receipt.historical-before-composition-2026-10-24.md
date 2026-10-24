# Publisher preparation receipt — screen cohort delivery

Prepared: 2026-10-24T00:26:06Z  
Repository: D:\Program\python\Dubbed  
Base revision: 7845b84d171858628128d9e60e6d3d560f43055a  
Mode: preparation only; no Git index, commit, push, or GitHub mutation.

## Candidate boundary

The payload inventory is candidate-manifest.json (SHA-256 58023C0CB5443C97B09FEADE923F7CE31FBD61522046DDCD17D9F4A34CC8BE7D), with 279 payload paths. Add the two control files listed in the manifest to the delivery whitelist: the manifest itself and this receipt. Thus the exact candidate contains 281 paths. The manifest stores byte length and SHA-256 for every payload file; its own SHA-256 is reported here to avoid self-reference.

Included source/test/config/harness paths: 26. Source was frozen at 197 files; the before/after freeze receipts are byte-identical with SHA-256 94B617AF9F2D8ED1548C52F6D02695C71AC57CEADFF891E9226CF1D85F68B3ED.

## Acceptance and verification recorded

Delegated acceptance is recorded for #62, #65, #66, #69, #71, #74, #75, #78, #79, #80, and #82 only. #63, #76, #77, and #81 remain outside closure; #81 retains the unanswered short-source policy question.

Final gate: 44 unit files / 216 tests passed in 37.57s; 117 browser tests passed in 3.6m with no retries or skips; isolated clean install, typecheck, and build passed (JS 946.88 kB and CSS 55.75 kB warnings noted); lint exited 0 with warnings; media checks 3 passed; real-media-unavailable check 1 passed in 4.3s. Browser media was muted and fake devices were used. Earlier failed browser runs, their raw logs, and two bounded error contexts are included as history; they are not presented as passing runs.

## Evidence integrity

Current checksum manifests validate as follows: auth-state-ui 35 entries; result-state-ui 17; workspace-state-ui 55; mic-icon-final-proof 16; shell-final-proof/run-4298 23; nested recording-transport focused archive 3. Historical pre-refresh copies were preserved beside refreshed auth, result, and workspace checksum manifests. Workspace evidence includes only the two approved history items under workspace-state-ui/historical/.

The processing evidence subset contains the 76 current after/ screenshots, the 6 final focus probe screenshots, current metrics/readme, the single documented overflow baseline, and the icon probe metrics row referenced by its README. The README hash table has two stale rows: the earlier full-matrix source fingerprint is historical (the later focused-source row matches the frozen source), and metrics-after.jsonl changed during the final capture. The candidate manifest records current hashes; the worker README was left unchanged.

Required evidence-to-evidence targets were checked against the candidate and existing tracked files. No missing evidence target was found. Pre-existing visual-authority references remain local and are not silently pulled into this cohort: _docs/frontend-flows/ (workflow, adoption contract, catalog, tokens, and flow specs) and _docs/evidence/affect-ui-clean-light/ (Clean Markdown / matching Light PNG source corpus). Executors and Orchestrator inspected the applicable local references; their exclusion is a publication boundary, not a claim that visual references were absent. Unrelated dirty docs, skills, old reviews, broad historical probes, and fixture binaries are excluded.

## Proposed commit

feat(frontend): deliver screen-state cohort

No publication or lifecycle mutation has occurred. This receipt is a provisional delivery inventory for Root's whitelist review. Its own SHA-256 is calculated after writing and returned with the handoff.
