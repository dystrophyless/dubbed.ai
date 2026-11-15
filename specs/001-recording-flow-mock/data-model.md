# Data model: Recording flow on mock services

All entities live in the mock adapter (IndexedDB). Credits are integers. Times are ms since epoch unless noted.

## Account (single demo user)

| Field | Type | Rules |
|---|---|---|
| balance | int ≥ 0 | starts at 120 (welcome credits) |
| reserved | int ≥ 0 | sum of reserves of queued/preparing projects |
| slotLimit | 2 \| 10 | 10 after the first purchase (purchase itself is out of scope; demo control sets it) |
| language | `en` \| `ru` | UI language |

Derived: `slotsUsed` = projects in any state except cancelled; `canCreate` = slotsUsed < slotLimit.

## Project

| Field | Type | Rules |
|---|---|---|
| id | string | |
| name | string | from the file name: strip extension, `-`/`_`/`.` → space, collapse spaces, first letter upper; renamable later |
| video | Blob ref + {durationMs, width, height} | MP4/MOV/WebM, ≤ 250 MB (browser), ≤ 10 min, readable, has audio (server check) |
| section | {startMs, endMs} | 1 000 ≤ length ≤ 120 000; default whole video if ≤ 120 s else 0–120 000 |
| price | int | ceil(sectionLength / 1 000) |
| state | see state machine | |
| step | 1 \| 2 \| 3 | while preparing |
| timeline | {queuedAt, stepStartedAt[], readyAt, …} | server time; state is derived from it at read |
| demoOutcome | `ready` \| `no-dialogue` \| `failed@1..3` | mock only |
| failedAtStep | 1..3 \| null | resume point for Try again |
| charged | int | settled credits (0 until delivery; cancel/no-dialogue rules below) |
| notify | bool | opt-in "notify me when it's ready" (also stored per project for the ready watcher) |
| currentVersion / pendingVersion | version refs | see Result version |
| createdAt, changedAt | ms | My projects sorts by changedAt desc |

### State machine

```text
            upload checked                Start (reserve price)
 (none) ───────────────▶ draft ─────────────────────────▶ queued ──▶ preparing(1→2→3) ──▶ recording
                           │  Replace video (same slot)      │cancel: free     │cancel: charge(steps done)   │
                           │  delete → slot freed           ▼                  ▼                              │ all turns have takes
                           ▼                            cancelled (removed, slot freed)                      ▼ "Build the result"
                        deleted                                                                          assembling ──▶ done
                                        preparing ──failure──▶ failed (reserve refunded) ──Try again──▶ preparing(failedAtStep)
                                        preparing ──0 turns──▶ no_dialogue (charge settled)
                                        assembling ──failure (after 1 auto retry)──▶ assembly_failed ──Try again──▶ assembling
 done ── re-record turns + "Build the new version" ──▶ done + pendingVersion(assembling → ready | failed) ── switch ──▶ done(current = new)
```

- **Reserve / settle**: Start → `balance -= price; reserved += price`. Ready (turns found) → `reserved -= price; charged = price`
  (settled on delivery of the prepared scene). No dialogue → same settle. Failure → `reserved -= price; balance += price`.
  Try again → reserve again. Cancel while queued → full refund. Cancel while preparing → `charge = cancelCharge(stepsDone)`
  (mock placeholder table, e.g. 25 % / 70 % of price, rounded up — the real split is an open owner question),
  rest refunded, project removed.
- New versions and assembly are free (owner).
- A project with `state ∈ {queued, preparing}` cannot be opened in the studio; `recording` cannot open the result.

## Turn

| Field | Type | Rules |
|---|---|---|
| projectId, n | string, 1-based int | n ≤ 40 |
| startMs, windowMs | int | inside the section; windowMs 2 500–4 500 in the mock |
| text | {en, ru} | sound captions in brackets shown quieter |
| originalPeaks | number[] | decoded from the user's video audio for the window |

## Take

| Field | Type | Rules |
|---|---|---|
| projectId, n | | one current take per turn |
| audio | Blob | MediaRecorder output; saved only after the IndexedDB write resolves |
| peaks | number[] | drawn indigo when saved, red while recording |
| durationMs | int | ≤ windowMs (Stop early allowed) |
| savedAt | ms | |
| inVersion | version number \| null | null = a new take not yet built into a version (re-record mode) |

## Result version

| Field | Type | Rules |
|---|---|---|
| projectId, number | | 1, 2, … |
| takes | {n → takeSavedAt} | the takes it was built from |
| state | `assembling` \| `ready` \| `failed` | one auto retry before `failed` |
| file | Blob + mime | WebM (or MP4 on Safari); name = `<project name>.<ext>` |

Rules: at most a current version and one pending version; switching makes pending current and deletes the old one;
re-record is blocked while any version is assembling (owner 5b).
