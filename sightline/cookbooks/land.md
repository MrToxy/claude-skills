# Cookbook — land what was decided

A row resolved and its finding written; now it goes where the repo already keeps
decisions. Also covers what to do when building re-fogs something.

## The horizon check — before the plan is written

No `now` rows left. The gate ran per decision as each landed, but it runs
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
  covered it and you're charging twice. ASK rows count — their answers are
  decisions on the map like any other, and they are the ones no per-row gate
  ever tested
- a signature, a type, a schema, a state machine — something that is right or
  wrong. Never a summary, never "explain the approach"
- minutes, not a session

When the artifact is a **shape** rather than a signature — what calls what, what
crosses which boundary, which thing owns the write — offer the board and let
them draw it. Same instrument: a drawing is right or wrong the same way a type
is, and a missing arrow names its row exactly like a wrong return type does.
Offer, don't require — a typed answer is not a worse answer.

Grading is mechanical, and that's the point: each finding predicts a property of
the artifact, so a mismatch names its row. *"Your return type is `{count, total}`
— that's finding 02, which chose a separate tool precisely because grouping
changes the shape."*

On a miss, hand them that row's finding and ask again. Do not re-explain, and do
not accept the artifact with a note about what's wrong with it — a corrected
answer they didn't produce proves nothing.

A second miss on the same row means that row was never held. Stop the map check
— it has told you what it had to — reopen the row and re-run the gate on it. The
loop has an exit and this is it; without one, the only way out of a third pass
is the accept-with-a-note this rule forbids.

A quiz would be the weaker instrument here and a multiple-choice one weaker
still: recognition passes when understanding doesn't, and MCQ sets get answered
off answer length and position rather than content.

Skip this entirely if the effort resolved fewer than three rows.

## Land — decisions to the repo, understanding to the effort

Two lifespans, and the difference *is* the filing rule:

| | Where | Why |
|---|---|---|
| decisions, and why | the repo, in the shape it already keeps them | outlives the change |
| `current-state.md`, `impact.md`, `alternatives.md` | stay in `.sight/<effort>/` | **dated by construction** — they describe the system *before* this change, so they are stale the moment it lands |

Do not invent a parallel documentation system. If the repo has ADRs, a glossary,
or per-phase plan files, decisions land there in the repo's existing shape.

If it has none, don't design one and don't leave the decision in `.sight/` —
that's how `.sight/` quietly becomes the parallel system this rule exists to
prevent. Use the planning skill's fallback formats
(`plan-with-docs/references/adr-format.md`, `references/context-format.md`), so
what you write is what it will later load as a constraint.

And do not promote `current-state.md` into the repo as architecture
documentation, however good it turned out. It was true on one day, about one
slice, for one change. Living in `.sight/` is what lets it be written fast and
wrong in places; the same file under `docs/` acquires an obligation to be
maintained, and won't be. It has one consumer — the handoff — and it dies after.

- A probe that settled a **structural, hard-to-reverse** question is an ADR —
  and unusually, one with evidence attached rather than reasoning alone.
- A micro-world that encodes a **structural** decision is worth keeping, next to
  its ADR, committed in the same change. Everything else gets deleted. Kept
  micro-worlds earn their place by being runnable: when the system moves under
  them they break loudly, where prose would have drifted silently. Prove the
  loudness before keeping it — change the real value it encodes and watch it
  break. If nothing breaks, it can rot without anyone noticing, and it wasn't
  worth keeping.
- Terms the probe sharpened go in the glossary the same session they resolve.

Then `sight spikes` must come back empty. Anything still standing is a probe
whose finding never landed — read `RULE.md` and either write the finding or
`sight burn --force` it, but decide now. A spike that outlives the effort is
indistinguishable from live code to whoever opens the directory next.

Then the plan itself, short by construction:

```
## Destination
## Decided          — one line each, linking finding or ADR
## Route to horizon — the steps that are actually knowable now
## Deferred         — the decision, and the trigger that forces it
## Known unknowns   — what we expect to learn at the horizon
```

If this document is long, you planned past the horizon. Cut it back.

The plan is where sightline stops. It is the handoff, not the go-ahead — do not
open the first slice in this session, however settled the direction now looks.

Put both exits to the user. They pick:

| Exit | When it's the right one |
|---|---|
| `/plan-with-docs` | the default. Phasing, acceptance criteria, tracer bullets. It loads the ADRs and glossary you just landed as constraints, and the `.sight/` artifacts are there if it wants them. It does not need to know sightline ran |
| build it now | the change is small enough that phasing would be ceremony — the reading was one component, the findings and micro-worlds already say how |

Say which you'd take and why — then wait. Recommending is yours, choosing is
theirs, and neither exit starts in this session.

## Re-fog — when the build contradicts something

Once the user has started the build, it generates new questions; that's the
point of stopping early. When implementation contradicts an assumption, or
reveals a decision the plan glossed over: stop, triage it, resolve it the same
way. Never decide it quietly inside
an implementation turn — that's the silent decision-making that leaves the user
behind. When a deferred trigger fires, say so and reopen that row.
