# Tables: contract sheet, lanes, progress ledger

Build all rows from the plan at run time — never hard-code a feature's specifics.

## Contract sheet (Step 0 — one row per seam)

| # | Seam | Producer → Consumer | Freeze (what's pinned) |
|---|------|---------------------|------------------------|
| 1 | signature / endpoint / payload / schema | producer → consumer (who mocks whom) | the exact shape both sides commit to |

Track freeze status above the ledger as `[ ] #N` — all FROZEN before fan-out.

## Lanes table (one row per independent unit)

| Lane | Repo / worktree | Phases (internal order) | Mapped ACs |
|------|-----------------|--------------------------|------------|
| A | repo, worktree, branch | phases w/ intra-lane deps | AC-Ns |

Flag every **cross-lane AC** (halves in different lanes) explicitly: each lane proves its
half against mocks; fully verified only at integration + final acceptance.

## Progress ledger

One row per plan phase + an Integration row + a Whole-diff review row + a Final
acceptance row. `agent-browser` = n/a for non-UI phases.

| Phase | Lane | ACs | Tests RED | Impl GREEN | review+fix | Indep verify | agent-browser | Gate |
|-------|------|-----|:--:|:--:|:--:|:--:|:--:|:--:|
| phase name | lane | ACs | ☐ | ☐ | ☐ | ☐ | ☐ / n/a | ☐ |
| **Integration** (seams wired) | — | — | — | — | ☐ | ☐ | — | ☐ |
| **Whole-diff review** (cumulative diff) | — | — | — | — | ☐ | — | — | ☐ |
| **Final acceptance** (all ACs e2e) | — | all | — | — | — | ☐ | — | ☐ |

Render policy: changed row only per state change; full table on gate flips to DONE + run
end. Waivers (review findings / skipped items) are recorded in the row's phase notes with
a reason — never silently.

## Plan changelog (lives in PLAN_FILE, orchestrator-appended)

```
## Plan changelog
rev 1 — <change> — source: <phase/role> — <why>
```
