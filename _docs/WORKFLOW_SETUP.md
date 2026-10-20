# Workflow setup provenance

Prepared 2026-10-20 (Asia/Qyzylorda) from the live local setup at `D:\Program\python\pin`.

## Adaptations

- Project names, skill UI metadata, publication markers and repository references now target Dubbed; no GitHub remote is invented.
- Preserved the three existing skills, their support metadata, BR/spec/task/evidence templates, six guides, issue forms, PR template, and project-local Superpowers disable setting.
- Consolidated the source owner override: independent reviews apply to specs, individual tasks and packages; the Orchestrator directly verifies implementation and integration evidence. Removed contradictory mandatory implementation-Reviewer stages.
- Preserved source model/effort routing and native dispatch contracts. Live tool allowlists still govern availability; installing policy does not change model settings or start agents.
- Removed Pin-specific product assumptions; architecture and domain rules must come from actual Dubbed decisions. Kept general illustrative guide text as examples, not requirements.
- Created a clean quick start, brief scaffold, HANDOFF, artifact-directory instructions and changelog without inherited approval or execution claims.
- Included the current user's Semble, Context7 and batched tool-use instructions in AGENTS.md.

## Excluded

Pin BRs/specifications, task drafts/indexes, review reports, brainstorm decisions, HANDOFF history, evidence, product code, assets, secrets, Git history/remotes, runtime/backup CI workflows, deployment configuration and existing issues were not imported. Domain-specific SDD example documents were omitted; templates and quick-start prompts supply the reusable entry points.

No commit, push, publication, issue creation, model setting change, product implementation or deployment was performed.

## Source inventory

SHA-256 values identify the exact source bytes at copy time, before project adaptations.

| Destination / source-relative path | Source SHA-256 |
|---|---|
| `.agents/skills/ponytail/SKILL.md` | `fc12a0b9588a7fa3543d31ddc41541f735a5626105781643873110f2da1bd52a` |
| `.agents/skills/spec-task-review/SKILL.md` | `c7c5948c46d3127c2ea0d35931dc71564a04993427c224c863cc695b58dab4ba` |
| `.agents/skills/spec-task-review/agents/openai.yaml` | `60bed78a3630d9bf8ab3b0b37fb516eb16191208c287f53b649f190477fd4dbd` |
| `.agents/skills/task-package-review-loop/SKILL.md` | `67bb079add0b7f125c9f0c6b357683add7c7ddf2e139d2a69078dd7d47e4e54a` |
| `.agents/skills/task-package-review-loop/agents/openai.yaml` | `b46e4ab6e9dc340040ff5a7cfad1b89365cbd1e6606e3cfa4b58bb072e02ccc2` |
| `.codex/config.toml` | `44b35a40def1ce6b275b19ba01002d76ef9512d4e6b1217444f141aa5f916f6b` |
| `.github/ISSUE_TEMPLATE/01_task.yml` | `748f7dd5b3ff304afefdf1be8db9d383b05142ab58a5ffcddea84ce0dce5d05b` |
| `.github/ISSUE_TEMPLATE/02_bug.yml` | `ee3b275daa0ff325307f12d4f908843facd7cfc4a583e95413612a1324c21bbb` |
| `.github/ISSUE_TEMPLATE/03_investigation.yml` | `bce8b3dab04d34fd971dbf55f37c6ce1444c7411e06ff9bde3c29d67445a7d58` |
| `.github/ISSUE_TEMPLATE/04_verification_gate.yml` | `c8e9a689019eecd251c1dff24740404eb393d5d408e71daeb98a4be87130f0fb` |
| `.github/ISSUE_TEMPLATE/config.yml` | `13064e7bea658e01e718b414fbb7b3b244f36411fe25ee2055c151f7b534547a` |
| `.github/PULL_REQUEST_TEMPLATE.md` | `1d135f9374d2dedd0a6df99c37865c0a6d2f1fd612a3daebd8b62b02b795b37a` |
| `AGENTS.md` | `62433fb2ff5cbe685204892ddc6ce5a6a8fe601fe03a6d6ecf9723149317d468` |
| `_docs/business-requirements/README.md` | `96ed2f5a35b3b71c605a71e9ab7e3b4a8bec4a9b2aec29ec1ada57f234133613` |
| `_docs/orchestration.md` | `af6ed600345833b62b438e430f5b0995c60112012c41754565cfbf968185416b` |
| `_docs/sdd/README.md` | `f2d064ef4e896ea919219d80cb1bae8c34f07e1681ba3d5d396ee8f3d8401e4e` |
| `_docs/sdd/guides/business-requirements-guide.md` | `02775dd0b2bad0824776bccbc5f263b4daf6e730522f4b41c6c5f687fe10b70b` |
| `_docs/sdd/guides/doc-conventions.md` | `e0bcbd4ef5311a43bc17f54699dc9adbc4a179ea4313a5bf150ca2673198fe01` |
| `_docs/sdd/guides/github-issues-workflow.md` | `fb39a9c25afb215f8d6ceb7c152c029639a2da97f20ffc6ee0b76acfaf1978c5` |
| `_docs/sdd/guides/specifications-guide.md` | `676ee4029c0fee0f872a2d9750914c1e8002aa2647efdc10b10105a50e44e313` |
| `_docs/sdd/guides/task-decomposition-guide.md` | `a0b44c27f10fd5ca0e1115b3c4c119ad8c7b871b5fe92952db592055e804d4a3` |
| `_docs/sdd/guides/versioning-guidelines.md` | `97bfe26da377f94f51e91735a39004c931166abd5e917fdf2709b1ae98f8bdd1` |
| `_docs/sdd/templates/business-requirements.md` | `55ac97eb409206e746460e7a4186492cc209af0d53e4cca484cb22edae1fc81a` |
| `_docs/sdd/templates/issue-evidence.md` | `70b49cc32b294348c5ed4d33dc52c7d22735caf046b0171843c88005283d853e` |
| `_docs/sdd/templates/specification.md` | `0d1b19aa4d5af87d6969689a8ba574745e4dabd5d60f17f9f68e40deee5a4118` |
| `_docs/sdd/templates/task-issue.md` | `4d3dfd1a73b2a6c5096b1c9e32f31af45d58de674fad752e41adc0827f27b099` |

## Setup verification

- 33 setup files prepared; all 82 local Markdown links resolve.
- All three skill entrypoints have matching names and required descriptions.
- Project TOML parses and retains the source project-local Superpowers disable setting.
- No actual BRs/specifications/task packages or runtime workflows are installed.
- Source inventory hashes rechecked after migration: all 26 source files unchanged.
- No inherited Pin remote or contradictory mandatory implementation-review stage remains.
- YAML parsed for 7 issue-form/config/skill-metadata files; required form fields and unique field IDs passed.
- Checks verify local file structure and configuration syntax. A new-session skill-discovery run and live GitHub forms/publication were not exercised. No agent model/account settings were changed.
- The default sandbox runner failed with `helper_unknown_error: setup refresh had errors`; read-only validation completed through the approved outside-sandbox command runner.
