# Cookbook — land what was decided

A row resolved and its finding written; now it goes where the repo already keeps
decisions. Also covers what to do when building re-fogs something.

## Phase 5 — Write findings where the repo already keeps decisions

Do not invent a parallel documentation system. If the repo has ADRs, a glossary,
or per-phase plan files, findings land there in the repo's existing shape.

- A probe that settled a **structural, hard-to-reverse** question is an ADR —
  and unusually, one with evidence attached rather than reasoning alone.
- A micro-world that encodes a **structural** decision is worth keeping, next to
  its ADR, committed in the same change. Everything else gets deleted. Kept
  micro-worlds earn their place by being runnable: when the system moves under
  them they break loudly, where prose would have drifted silently. If a kept
  micro-world can rot without anyone noticing, it wasn't worth keeping.
- Terms the probe sharpened go in the glossary the same session they resolve.

Then the plan itself, short by construction:

```
## Destination
## Decided          — one line each, linking finding or ADR
## Route to horizon — the steps that are actually knowable now
## Deferred         — the decision, and the trigger that forces it
## Known unknowns   — what we expect to learn at the horizon
```

If this document is long, you planned past the horizon. Cut it back.

## Phase 6 — Re-fogging during the build

Building generates new questions; that's the point of stopping early. When
implementation contradicts an assumption, or reveals a decision the plan glossed
over: stop, triage it, resolve it the same way. Never decide it quietly inside
an implementation turn — that's the silent decision-making that leaves the user
behind. When a deferred trigger fires, say so and reopen that row.
