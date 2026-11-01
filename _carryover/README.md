# Carry-over from the archived version

Material worth reusing from tag `archive/chatgpt-v1`. **Inputs, not authority**: none of it is an approved design,
contract or task. Use what helps during bootstrap and delete the rest once it has been absorbed.

| Folder | What it is | How to use it |
|---|---|---|
| `affect-ui-clean/design-tokens.md` | The archived token table for affect-ui Clean / Light (colours, type roles, control sizes, shadows, motion) with accessibility adaptations | Starting point for `design-system/audit.md` and `frontend/src/styles/tokens.css` — **re-check every value against the Clean source** in `D:\Program\frontend\affect-ui\affectui-free\components\*\Clean\` before adopting it. Numeric action sizes there were chosen by an agent, not measured from the source. |
| `affect-ui-clean/clean-light-reference.md`, `clean-light-adoption.md` | Catalogue of inspected Clean components and the mapping rules used last time | Read for orientation; the archive's page-level rules (A/B layouts, dialogue clamp formulas) are history, not requirements. |
| `affect-ui-clean/source-evidence/` | Copies of the Clean source Markdown and Light PNGs for button, profile menu, OTP, decision inbox, email draft, comment thread | Visual references while porting; the full pack lives in `D:\Program\frontend\affect-ui\affectui-free`. |
| `frontend-services/services/` | Engineering code from the archived frontend: typed services contract (`contracts.ts`), real browser microphone capture with exclusive capture locks (`browser-capture/`), native media helpers (`browser-media/`), an IndexedDB-backed mock project store and result port (`mock/`) with unit tests (Vitest) | Valuable non-visual logic (capture, persistence, recovery). Review and re-import into the new frontend's services layer when the Record feature is built; it has no UI and must not dictate design. |
| `frontend-services/i18n.ts` | The archived EN/RU string helper | Reference for the localization approach. |
| `media/` | `scene.mp4` (prepared test scene), `example-dub.mp4`, `result-generation-002.webm` and the script that built an alternate fixture | Demo and e2e fixtures for the mock services. Check usage rights before any public use (the archive marks them as permitted test fixtures). |

Everything else (process docs, flow specs, prototypes, evidence, the previous frontend) is only in the archive:
`git show archive/chatgpt-v1:<path>` or `git switch --detach archive/chatgpt-v1` to look around.
