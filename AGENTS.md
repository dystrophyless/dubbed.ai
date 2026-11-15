# Dubbed — notes for agents

Dubbed is a browser app for dubbing short video scenes with your own voice (`PRODUCT_BRIEF.md`). Working rules live in
`CLAUDE.md`; feature specs in `specs/<NNN>/`.

The current stage is a **frontend on mock services**: there is no backend yet. `frontend/src/services/mock/` stands in
for a future FastAPI + PostgreSQL server and will be discarded; the contracts in `frontend/src/services/contracts.ts`
and the rules in `frontend/src/services/rules/` move to the server unchanged.

## Code Review Rules

### Mock backend is out of scope

- Do not flag issues that live only inside `frontend/src/services/mock/**` or the demo `?demo=` presets: IndexedDB
  transaction boundaries, write or abort timing, consistency between several tabs editing the same data.
  Exception: flag it when it breaks the contract the UI relies on, or the money rules in
  `specs/001-recording-flow-mock/spec.md` (reserve on Start, charge for finished steps, refunds) — those carry over to
  the server.

### The screen tells the truth

- Flag any place where the user is shown something the services did not confirm: money (charges, refunds, reserves)
  or project state that differs from the service outcome, an error shown as success, a page left loading forever or
  stuck with no way forward.
  Safe path: every service outcome in the contracts, including each error, has a visible, recoverable UI state.

### UI races and navigation

- Flag actions that act on stale state: a control still enabled while its action awaits, a double submit, work
  continuing after unmount or a route change (wrong project or turn), a redirect that lands on a page that can't
  render, a resume that skips unfinished work.
  Safe path: mark the action pending before the first await, and check that the page and target are still current
  before writing or navigating.
