# Dubbed — notes for agents

Dubbed is a browser app for dubbing short video scenes with your own voice (`PRODUCT_BRIEF.md`). Working rules live in
`CLAUDE.md`; feature specs in `specs/<NNN>/`.

The current stage is a **frontend on mock services**. There is no backend yet: `frontend/src/services/mock/` stands in
for a future FastAPI + PostgreSQL server and will be replaced by it. The `services` contracts
(`frontend/src/services/contracts.ts`) are what the real server will implement.

## Code Review Rules

- Review the frontend: what the user sees and does. Priorities:
  - the screen tells the truth, above all about money (charges, refunds, reserves) and project state;
  - UI handling of every service outcome in the contracts, including errors, without showing an error as success;
  - races in the UI itself: an action still awaiting while other controls work, navigation or unmount during an
    await, double submits, stale props after a route change;
  - routing and guards, reload and resume, malformed URLs;
  - media playback and recording controls in the page;
  - accessibility (WCAG AA, keyboard, focus), EN and RU copy, and the design system (tokens only, kit components
    only — see `design-system/`).
- Do **not** report issues that live only inside the mock backend (`frontend/src/services/mock/**`, the IndexedDB
  layer and the demo `?demo=` presets). Examples: IndexedDB transaction boundaries, consistency between several open
  tabs editing the same data, abort or commit timing of mock writes, cross-tab cache sync of mock data. The real
  server and its database will own these, and the mock code will be discarded.
- Do report a mock issue when it breaks the contract the UI relies on (an outcome or error type the page can't
  handle) or the money rules in `specs/001-recording-flow-mock/spec.md`, since those carry over to the server.
- Contract shapes (`services/contracts.ts`) and pure rules (`services/rules/**`) are in scope: they move to the
  server unchanged.
