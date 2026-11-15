# Backend backlog

Review findings that live only inside the mock backend (`frontend/src/services/mock/**`) and are left for the real
server (FastAPI + PostgreSQL) to own. Each entry: where it came from, the scenario, what the server must guarantee.

The mock already handles many of these (0.1.1–0.1.9); they are listed so the server is built to the same guarantees.

## Guarantees the server must keep (from fixes already made in the mock)

- Money and state are decided in one transaction: reserve on Start, charge for finished steps and refund the rest on
  cancel, full refund on failure, slot limit checked at write time.
- A cancel that arrives after preparation finished returns a typed error (`state`), never a refund; removing a
  project in preparation is refused (`state`), never a silent paid cancel.
- An aborted take or upload writes nothing, even if the abort arrives just before commit.
- An older render can't publish over a newer build of the same version.
- Account balance, reserve and slots come from one consistent snapshot.

## Open

_None yet._
