# Carry-over

Non-visual material worth reusing. **Inputs, not authority.** Nothing here describes or constrains any screen.

| Folder | What it is | How to use it |
|---|---|---|
| `frontend-services/services/` | Engineering code: a typed services contract (`contracts.ts`), real browser microphone capture with exclusive capture locks (`browser-capture/`), native media helpers (`browser-media/`), an IndexedDB-backed mock project store and result port (`mock/`) with unit tests (Vitest) | Review and re-import into the services layer when the recording feature is built. It has no UI and must not influence design. |
| `media/` | `scene.mp4` (a short test scene) and `example-dub.mp4` (an example dubbed result) | Demo and e2e media for the mock services and for page templates. |

The affect-ui source pack itself lives at `D:\Program\frontend\affect-ui\affectui-free` — measure everything from there.
