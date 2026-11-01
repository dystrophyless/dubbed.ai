# Dubbed local A/B recording journey

This isolated React, TypeScript and Zustand host covers the explicitly seeded prepared project and guarded Record/Result routes. It does not provide authentication, upload, processing, billing, project management or production media rendering. The local A/B selector is a manual preview choice, not assignment or analytics.

## Run

```powershell
npm.cmd ci
npm.cmd run dev
```

Open <http://127.0.0.1:5180>. Choose Layout A (side panel) or B (centered studio) to open the seeded Record route. Record and accept the three prepared lines to authorize Result, then compare Original/My dub inside the player or download the illustrative dub. Captured takes persist locally; the Result fixture is not rendered from those takes. A separate `/__dev/native-media` route is available only in development for verifying the owned browser-media port; it is not a microphone setup screen and never runs capture on page load.

The bounded local implementation passed independent integration review and final connected verification on 2026-10-29. See [final acceptance](../_docs/evidence/core-journey-ab-implementation-2026-10-28/root-final-2026-10-29/ACCEPTANCE.md) for evidence and limits. Physical microphone/device behavior, backend rendering and live experiment allocation remain unverified or out of scope.

Set `VITE_DUBBED_ADAPTER=real` to confirm that the unavailable real adapter fails closed. Unknown adapter names are configuration errors; neither case falls back to the local mock.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
```

The browser suite uses the installed Chrome executable with Chromium's fake media input flags. It exercises the real browser `getUserMedia` and `MediaRecorder` APIs, but it is not a physical microphone test.

To regenerate the alternate synthetic result fixture from the prepared source and supplied synthetic takes, run `npm.cmd run fixtures:alternate` from the frontend folder. It needs the installed Chrome executable; set `CHROME_PATH` if Chrome is installed elsewhere.
