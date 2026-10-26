# Evidence inventory and limits

Audit: 2026-10-26, Asia/Qyzylorda. Author: GPT-6 Astra Medium, explicitly assigned by the owner through Root. Mode: forensic review/report only. Product baseline under discussion: `9d286621177200fdb5f61ef963d0b6818ae76774`; correction evidence belongs to a later shared dirty worktree. This audit produced no product or spec changes and executed no browser/test run. It inspected saved images, source, task/spec snapshots, original conversations and correction records. Root gathered chat excerpts and byte-preserved owner inputs independently; the auditor owns report interpretation.

Current source limitation: the local copies of original published task bodies and the older QA review reports cited below were removed during documentation cleanup. Current GitHub issue URLs lead to live task bodies, not the exact original copies. This audit's existing analysis, quotations and screenshots remain as recorded.

## Evidence layers

| Layer | Exact entry point | What it proves / does not prove |
|---|---|---|
| Owner observations | [input manifest](inputs/attachment-manifest.json), owner-recording-1/2/3.png | Byte-preserved submitted visual evidence and requirements input; no capture environment, original media aspect ratio or runtime trace inferred |
| Route/source boundary | [audited-source-snapshot.json](audited-source-snapshot.json) | Read-time SHA256/size of routes, dispatcher, recording source and active flow documents; does not claim all code was reviewed or code matches every older screenshot |
| Current document anatomy | [contract-anatomy-excerpts.md](contract-anatomy-excerpts.md) | Selected current anatomy paragraphs with original source line numbers; correction-era wording is not automatically an original cause |
| Original published tasks | Local publication archive, published-body copies, source copies and hashes (removed) | Full task contracts and linked flow snapshot identities used to attribute what implementers were originally required to do |
| QA-reviewed issue revision | Copied review-contract bodies (removed) | Captured issue bodies used for the independent review; historical closed status is not today's correction acceptance |
| Original visual review | Report index, dispatch and individual review reports (removed); screenshots remain | What reviewers found, their mandate and their stated limits; finding totals include overlap and do not quantify UX quality |
| Correction authorization/scope | [execution packet](../visual-qa-fixes-2026-10-25/EXECUTION-PACKET.md), [routing](../visual-qa-fixes-2026-10-25/package-routing.md), receipts | Exact owner scopes and QA-ID dispositions; executor-reported verification is attributed, not treated as independent acceptance |
| Orchestrator handling | [root findings](../visual-qa-fixes-2026-10-25/root-findings.md), [receipt index](../visual-qa-fixes-2026-10-25/root-receipt-index.json) | Real follow-up findings and bounded rechecks, including correction regressions; current acceptance explicitly not granted |
| Actual conversation records | [chat index](chat-evidence/index.json), [extraction limits](chat-evidence/README.md) | Original absolute JSONL paths, hashes, actual model/effort and source-line/timestamp pointers; inventory is not a claim of exhaustive reading |
| Images used in this report | [audited-image-manifest.json](audited-image-manifest.json) | Embedded images individually opened by this auditor, plus selected additional opened reference/state images; hashes identify exact bytes, not runtime correctness |

Primary code references were discovered through Semble and then directly read: `frontend/src/app/routes.ts`, `frontend/src/app/FeatureRoute.tsx`, and `frontend/src/features/recording/RecordingScreen.tsx` transport logic around lines 990-1107. No source edit or dependency/docs API investigation was necessary. No library behavior is inferred as a substitute for inspecting that business logic.

## Conversations actually analyzed

The inventory contains **69 chats**. This audit analyzed readable commentary/final messages in the following subset, plus the original #77 custom-tool-call records. It did not read every full JSONL/tool result or every inventoried conversation. Some earlier review extracts contain little readable narrative beyond a final response; that limit is explicit.

| Conversation | Relevant original records / use |
|---|---|
| [spec_flow09_record](chat-evidence/spec_flow09_record.md) | Lines 17,144,162,173,194; 2026-10-21 19:26-19:38 UTC. Initial author explicitly produced prose/spec and no mockup, then synchronized owner waveform/guard choices |
| [independent_media_spec_review](chat-evidence/independent_media_spec_review.md) | Lines 17,103,162,231; 2026-10-22 17:02-17:07 UTC. Read-only tool fallback and persistence/exit/assembly focus |
| [independent_auth_spec_review](chat-evidence/independent_auth_spec_review.md) | Extract inspected for readable assistant narrative; no substantive narrative printed by the bounded filter. Do not infer its detailed reasoning from absence |
| [independent_package_spec_review](chat-evidence/independent_package_spec_review.md) | Lines 17,78,112,177,194,208,248; 2026-10-22 17:02-17:57 UTC. Zero-turn preservation and purchase correlation findings/rechecks |
| [record_result_batch_author_61](chat-evidence/record_result_batch_author_61.md) | Lines 223,264; 2026-10-22 19:19-19:22 UTC. Playback/recording decisions synchronized across behavior/services/mocks/AC; no runtime claim |
| [independent_batch_review_61](chat-evidence/independent_batch_review_61.md) | Final line 342, 2026-10-22 19:25:36 UTC; bounded PASS and unproved runtime/presentation gates. Opaque message bodies not interpreted |
| [review_frontend_task_package](chat-evidence/review_frontend_task_package.md) | Lines 17,38,85,169,243; 2026-10-22 19:59-20:10 UTC. Lifecycle focus and player-delivery verification addition |
| [review_frontend_task_dependencies](chat-evidence/review_frontend_task_dependencies.md) | Line 206, 2026-10-22 20:09:45 UTC. Dependency graph result explicitly excluded runtime |
| [review_affect_adoption](chat-evidence/review_affect_adoption.md) | Lines 17,89,167,232,331; 2026-10-22 22:55-23:09 UTC. Source images/provenance, task-contract preservation and bounded mapping fixes |
| [visual_qa_77](chat-evidence/visual_qa_77.md) | Final line 283, 2026-10-24 23:12:38 UTC; original custom tool calls separately inspected as below |
| [visual_qa_81](chat-evidence/visual_qa_81.md) | Final line 249, 2026-10-24 23:13:04 UTC; sliders, composition, thin CTA and bounded review limits |
| [visual_qa_63](chat-evidence/visual_qa_63.md) | Final line 346, 2026-10-25 07:50:40 UTC; native journey succeeded but visual acceptance evidence incomplete |
| [fix_77](chat-evidence/fix_77.md) | Readable progress/finals from lines 15-1930, 2026-10-25 10:52-11:47 UTC. Three-item scope, guard/fit implementation, target-only clearance claim, Root follow-up and full-scene repair |

Root conversation metadata was consulted through the index to distinguish actual Medium effort from preferred High policy. Root handling content in this report is supported primarily by the readable execution packet/root-findings/receipts, not inferred from opaque Root messages. The expanded author/reviewer inventory provides provenance; it does not permit claiming that all authors' reasoning was reconstructed.

### Direct check of original reviewer tool use

Original file for #77: `C:\Users\roman\.codex\sessions\2026\10\25\rollout-2026-10-25T04-04-19-01a17028-692c-7f10-b615-87d06dceac3e.jsonl`. Its source hash and session identity are retained in the `original_log` entry for `/root/visual_qa_77` in [index.json](chat-evidence/index.json).

The auditor read that indexed original and found `response_item.type=custom_tool_call`/`name=exec` at original lines **144,154,167,200,228,248**, containing explicit `tools.view_image` calls for the recording PNGs. Original lines **14,23,33** read the review packet, and line **86** reads the button/segmented Clean source and reference image work. These records establish that image inspection/source reading occurred; they do not reveal private reasoning or prove the reviewer made the right design judgment. The final tool-input inventory now includes these records in [visual_qa_77.tool-calls.json](chat-evidence/visual_qa_77.tool-calls.json).

The first extraction omitted `custom_tool_call` and therefore undercounted reads/images in `functions.exec`. The auditor identified this by inspecting the original JSONL; Root corrected all 69 inventories. Never use the earlier incomplete counts to claim that a reviewer did not look at images.

## What was visually inspected

All 13 primary page sections have an opened before/after sample. Additional opened evidence includes the three owner images, the original/corrected expired-session gate, original storage-open-denied landing, the corrected short-height Record fallback and the Affect button/segmented Light PNGs. The image manifest lists exact paths and hashes. Two reference PNGs support the distinction between a component specimen and a whole task composition; this is not an exhaustive source-fidelity audit.

The original 401 screenshots were **not all reopened by this auditor**. The frozen review reports say their assigned reviewers opened them; that claim is attributed. The report relies on a page-complete representative sample, not an invented 401-image independent audit. No new screenshot is represented as freshly captured. Several correction screenshots use controlled state fixtures without full shell, and full-page images do not establish initial-viewport visibility.

## Known limits and confidence rules

- No new runtime execution, audio playback, physical mic, production/backend/provider/payment, or complete accessibility test was performed. Current focused-suite status comes from the coordinating checkpoint, not a rerun.
- Saved before/after images are not always same-state/same-viewport/same-data. Each page section explains the comparison boundary. Later product changes can postdate owner captures; do not use a receipt image as universal current-worktree proof.
- Current specs were read selectively for anatomy/contracts; original published recording scope was inspected directly for historical causality. Other page task/spec links are exact provenance and relevant requirement mappings, not a claim that every paragraph of every revision was re-audited.
- Chat extracts omit tool outputs/images and contain explicit truncation/opaque-message markers. Original paths/hashes permit further checking. Opaque payloads were not decoded or interpreted. Actual model/effort metadata is factual; assigning causal superiority/inferiority to a model is not supported.
- The replay finding is owner-reported and source-supported. It needs the named browser reproduction before being labeled independently runtime-confirmed.
- Page composition judgments are expert interpretations grounded in visible structure. No novice observation or controlled preference study was run. Proposed alternatives and rubric remain recommendations.
- Review/refinement skill guidance was used as an analytic lens: Ponytail full, spec-task-review, frontend-design and design-taste-frontend app guidance. The adopted Affect authority supersedes generic style draws. No random visual direction or product rewrite was introduced.
- A lightweight memory lookup located prior Dubbed context, but current artifacts establish the report's factual claims. Historical issue state from memory was not used as current acceptance evidence.

This report is local working evidence. No authorization to publish full chat exports is implied. It changes neither authoritative task status nor acceptance and creates no parallel task queue.
