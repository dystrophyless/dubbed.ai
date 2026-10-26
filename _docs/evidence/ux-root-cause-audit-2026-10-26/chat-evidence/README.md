# Local conversation evidence

Root extracted 2026-10-26 audit inputs from known Dubbed session logs, selected by workspace and review/spec-author/correction-owner roles. `index.json` records original absolute paths, source hashes at extraction, actual turn-context model/effort, and per-tool counts. No inference from preferred role policy is used to identify models.

Each transcript preserves user/assistant text messages and native agent dispatches, labelled with original JSONL line numbers and timestamps. Companion tool-call JSON preserves call inputs. Tool results, image binary data, system/developer base instructions, session account metadata are not copied. This is a navigation aid, not a complete transcript export; the original JSONL remains the authoritative local record. Some user records in Root excerpts exceed 15,000 characters and are explicitly truncated; consult the original. Evidence of omitted tool outputs cannot be inferred from excerpts. Root continuation source hashes are read-time snapshots of live append-only files.

Selection now inventories69 logs and covers all21 original per-issue visual reviewers, relevant earlier spec/task/package/Affect reviewers and spec authors, Root review/fix orchestration, and recording/New dub correction chats. It does not claim every historical chat was reviewed. Report must identify which conversations were actually analyzed and which are only inventoried.

These extracted conversations are local audit working evidence. No permission to publish complete chat/tool-call exports, credentials, or unrelated workspace content is implied. Link exact relevant excerpts in the audit; no public GitHub mutation is authorized by this review request. Three owner screenshots are separately byte-preserved in `../inputs/` with SHA256 manifest.

## Opaque payload limitation

Some native agent lifecycle arguments in original logs are opaque `gAAAA...` encoded payloads rather than readable JSON messages. They cannot establish the text of a dispatch/follow-up. Long opaque token strings in derived transcripts/tool inputs are replaced by explicit length/SHA256 omission markers; `opaque-payload-omissions.json` records affected files/counts. Original logs remain untouched. This is an excerpt transform, not a claim to decrypt or recover messages. Only readable records may support content claims. The inventory has69 conversations; the report must distinguish inspected conversations from inventory-only entries.

## Tool inventory correction

The initial extraction counted only `function_call` records. Astra identified omitted `custom_tool_call` records (including functions.exec image/read calls). Root regenerated all69 tool-input inventories to include BOTH types, retaining original line/timestamp and applying the same opaque token omission. Tool outputs remain omitted. Do not use the initial incomplete counts to claim a reviewer never inspected an image.
