# Visual parity baseline

Capture date: 2026-10-29 (Asia/Qyzylorda). Frozen A at http://127.0.0.1:5178/, frozen B at http://127.0.0.1:5179/, current integrated app at http://127.0.0.1:5180/. Playwright Chromium with a fresh context, device scale 1, prefers-reduced-motion: reduce. Evidence files in this run: A-prototype-*, A-app-*, B-prototype-*, B-app-*, plus metrics.json and focused-measurements.json. The app screenshots were taken at the initial prepared line; source media reaches readyState 4 and is 960×408. Prototype lab controls/fixture-credit are prototype-only surrounding elements and are not part of the product viewport.

## Measured deltas

| Layout / viewport | Approved target | Integrated app | Discrepancy |
| --- | --- | --- | --- |
| A, 1440×900 | Header/video x=328, y=96, 784×441; side panel 272px wide and 332px tall | Header/video same; panel 272×311 | Main axis and source geometry match; panel is 21px too short because the line-help slot lacks the approved 40px minimum. |
| A, 1280×600 | Video x=328, y=56, 624×351; compact panel 272×234 | Video matches; panel remains 272×311 and keeps three vertical actions | Compact A action grouping is absent. Approved compact panel uses Original/Your take in row one, Record full width in row two, 12px padding and smaller navigation gaps. |
| A, 390×844 | Product header begins y=40 after the prototype-only 28px toolbar; video x=16, y=156, 358×201; panel y=595, 358×224 | Header y=16; video y=140; panel y=553, 358×343 | The app omits the external toolbar’s vertical slot, placing product content 24px higher; all three performance actions stack instead of using the approved three-column row, making the panel 119px taller. |
| B, 1440×900 | Video x=282.67, y=96, 874.66×491.98; controls start y=816 | Video x=295.09, y=96, 849.8×478; action group y=805.98 | The integrated layout shrinks the scene by 24.86px. Its 26px bottom padding versus B’s 16px and the waveform metadata gap/height account for the fit difference. B controls also lack the prototype’s 24px top rhythm. |
| B, 1280×600 | Video x=350.22, y=56, 579.55×325.98; controls begin y=530 | Video x=352, y=56, 576×324; controls begin y=532 | The app stops at the 576px minimum and the metadata gap moves the actions down 2px. |
| B, 390×844 | Product header y=40, video x=16, y=156, 358×201; three actions in row one, Previous/Next on row two | Header y=16, video y=132; action controls use a different two-column arrangement | The app is 24px higher from omitted prototype toolbar space; its mobile grid does not follow the approved 3-column action / split navigation pattern. |

Additional source-level differences visible in these captures: the fixture title is Sintel · The Search while both approved compositions show Sintel · The search; B’s approved waveform has a #f4f4f4 fill and 6px radius, while the app waveform is unfilled; the app’s volume range uses a thick browser-default track instead of the approved 2px track and 10px thumb. The actual app waveform comes from decoded source audio and must remain data-backed; only its presentation will change.

The initial 390px app screenshot was captured after 500ms and B’s frame was still black. A focused follow-up waited 1100ms: both app videos reported readyState 4 and 960×408 metadata. This is a capture timing artifact, not a layout correction; later screenshots wait for a presented video frame before capture.
