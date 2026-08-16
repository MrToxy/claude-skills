# Cookbook — land what was decided

A row resolved and its finding written; now it goes where the repo already keeps
decisions. Also covers what to do when building re-fogs something.

## The horizon check — before the plan is written

No `now` rows left. Phase 4 gated each decision as it landed, but it gates them
**one at a time**, so nothing so far has tested whether the user holds them
together. That's the failure this catches: every row understood, the shape they
add up to not.

One reconstruction, not a quiz. Name the single artifact the whole map implies —
the thing the first slice would start by writing — and ask them to write it:

```
"Write the group_orders signature the map implies — its params, its return
 type, and which filters it inherits."

  requires  01 the key enum          03 no null bucket
            02 the return shape      04 which date column
```

Choosing it:
- it must need **at least three** resolved rows, or the per-row gates already
  covered it and you're charging twice
- a signature, a type, a schema, a state machine — something that is right or
  wrong. Never a summary, never "explain the approach"
- minutes, not a session

Grading is mechanical, and that's the point: each finding predicts a property of
the artifact, so a mismatch names its row. *"Your return type is `{count, total}`
— that's finding 02, which chose a separate tool precisely because grouping
changes the shape."*

On a miss, hand them that row's finding and ask again. Do not re-explain, and do
not accept the artifact with a note about what's wrong with it — a corrected
answer they didn't produce proves nothing.

A quiz would be the weaker instrument here and a multiple-choice one weaker
still: recognition passes when understanding doesn't, and MCQ sets get answered
off answer length and position rather than content.

Skip this entirely if the effort resolved fewer than three rows.

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
