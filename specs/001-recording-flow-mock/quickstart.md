# Quickstart: validate the recording flow on mock services

## Prerequisites

- `cd frontend && npm install` (adds Vitest and fake-indexeddb for this feature).
- A microphone (or Chrome's fake device in e2e). Use Chrome/Edge for the manual run; Safari downloads MP4 instead of WebM.

## Run

```bash
cd frontend
npm run dev            # http://localhost:5174 → redirects to /projects
```

Demo controls (mock adapter only, not shown in the product UI): open any route with
`?demo=reset` (fresh account: 120 credits, 2 slots), `?demo=balance:40`, `?demo=slots:full`,
`?demo=outcome:no-dialogue|failed@2|assembly-failed`, `?demo=turns:6`,
`?demo=turnms:30000` (turn window in milliseconds, capped to each turn's share of the section),
`?demo=speed:4` (preparation and assembly time divided by N; parameters combine with commas). The setting is stored in the mock and the
parameter is removed from the URL.

## Manual end-to-end check (≈ 5 min)

1. `/new?demo=reset` → choose `public/media/scene.mp4` → upload → check → the video and the section appear; Start reads
   "Start dubbing · 14 credits" (the clip is 13.4 s, 1 credit per started second). Balance in the top bar: 120.
2. Start → Processing: "Waiting for our turn" → steps 1–3 → "Ready — opening the studio" → studio turn 1. Balance 106.
3. In the studio record every turn (scene muted, red take, auto-stop), listen to My take, Next; on the last turn
   "Build the result".
4. Result: assembling (≈ section length) → player; full screen with F / double-click / button; Download saves
   `Scene.webm` with your voice over the muted scene.
5. "Re-record a turn" → turn 2 → Record again → Stop → "Build the new version" → back on the result, version 2
   assembling while version 1 plays; "Watch version 2" plays from 0:00.
6. Reload on any page → same place. `/projects` shows the project as "Ready".
7. Money rules: `?demo=balance:5` on /new → Start disabled with the shortfall; `?demo=outcome:failed@2` → failure refunds
   (balance back), Try again resumes at step 2; cancel during step 2 shows the quoted charge.

## Automated

```bash
cd frontend
npm run build && npm run lint && npm run lint:css
npx vitest run                         # services rules
npx playwright test e2e/flow-*.spec.ts --workers=1
```

Expected: all green; `flow-*` covers US1–US5 on desktop and phone, EN + RU, with axe.
