# Focused run manifest

Command from `frontend/`: `npm.cmd run test:e2e -- --grep "keyboard can play the local mic test"`

Result: 1 passed, test 3.9s / total 8.3s. The run used the mock adapter and Chromium fake media device/permission UI. No physical microphone was used. Browser audio was launched muted; the local audio element was also muted at volume 0.

| Artifact | SHA-256 |
|---|---|
| `microphone-listen-keyboard-en-1440.png` | `E7E2CD8E20C01E194199B3BBEFB819ED1415AE31169025D48F49113FFE6A1C11` |
| `microphone-listen-keyboard-proof.json` | `9F4D60A75995F9B3F8E4B22AC28B0F739353A0390E38F213CF68CA475A05999D` |
| `microphone-listen-keyboard-test.log` | `A1368A49FDD6FFCF356B7371728E1809377FF4769437B7E65F6F630EEB4C25C9` |

The JSON records focused native audio controls, active playback at 0.366267s of a 1.2s clip, meter role/name/value, zero IndexedDB writes, one stopped recorder/track, matching created/revoked Blob URL, and no audio element after clean return. The screenshot was visually inspected.
