# Cookbook — resolve one row

The common case, and the whole of a resumed session. One row, then the turn
loop in SKILL.md, then clear.

## Phase 2 — Resolve, one at a time

Work the `now` rows — the ones the first slice cannot ship without — in order of
cost-if-wrong. Never batched. If a row turns out to be shippable-around once you
open it, put it back to DEFER with a trigger rather than finishing it because
you're already here.

**RESEARCH** — go read. Return under ten lines: what's there, what it
constrains, what surprised you. Cite files and line ranges so the user can
follow you in.

**PROBE** — hand the row to `/probe`. It owns the build; you own the map.

```
in   the row's question
     the decision rule agreed during triage — what result picks A over B
     the timebox (default: one context window)
     .sight/<effort>/probes/<nn>-<slug>/   spike dir
     .sight/<effort>/findings/<nn>.md      where the finding lands
out  Q / Tried / Found / Decides, plus a micro-world if there's a visible
     surface; spike deleted
```

Two things that stay yours, because they're triage decisions, not build ones:

- **No rule, no probe.** If neither of you can say what result picks A over B,
  the row isn't ready — usually because it's two questions. Split it in the
  table, don't send it.
- **`Decides: nothing` is a real outcome.** An expired probe becomes a re-scoped
  cheaper row or a DEFER with a trigger. Never an opinion.

## Phase 3 — Split the work at the seams

Before building anything, propose which pieces the user writes by hand and which
you write. This is not a courtesy — for a user who understands code by writing
it, hand-writing the load-bearing pieces is the only reliable way the
understanding arrives, and it has to be negotiated before the code exists rather
than recovered afterwards.

Propose the split with this rule: **the user writes whatever they'll need the
concepts of to steer the next ten loops.** In practice the core data structure,
the state machine, the boundary type — almost never the glue, the config, the
third CRUD endpoint, or the test scaffolding. Expect this to be 5–10% of the
lines and a much larger share of the decisions.

Concrete forms, in rough order of how often they apply:

- **Toy version first.** Before anything structural, write one file, 40–80
  lines, that has the architecture and none of the production concerns — no
  error handling, no framework, no auth, fixtures inline. The user reads it,
  edits it, breaks it. Only then scale it up. This is the highest-value move in
  the skill: it puts understanding before the code exists, rather than after,
  which is where review always fails.
- **User writes the types, you write the bodies.** For load-bearing work the
  interface is the design and the implementation is the labour. Cheap for them,
  and it forces every real decision through them. It also hands you an unusually
  precise spec.
- **You build the stage, they do the acting.** On the highest-cost PROBE rows,
  don't run the spike yourself. Set up the harness — fixtures, real data,
  runner, side-by-side scaffold — and leave the thirty lines in the middle for
  them. Building the tool for someone to think with is different work from
  doing the thinking for them.

State the split, let the user move pieces across the line, then respect it.
Never fill in a hand seam because it would be faster, and never fill one in
while "just making the tests pass".

## Phase 4 — Understanding gate

Gate each resolved decision on the user demonstrating they hold it — not on
their approval, which costs nothing to give.

**Default gate: reconstruction.** Ask them to write the next small thing on top
of the decision, without you. Extending it proves they hold it; stalling
identifies the exact missing concept, which a vague feeling of being lost never
does. Keep it to something that takes minutes, not a session.

**When reconstruction doesn't fit** — the decision has no immediate extension,
or the user asks for something lighter — fall back to three questions:
mechanism, why-this-not-the-alternative, and what-breaks-first. Weaker, but it
still catches a nod.

If the gate fails, the decision is not resolved. Re-explain in a form the user
can actually read: a reduced version of the code with the noise stripped out, a
literate walkthrough in dependency order rather than alphabetical, a smaller
probe. Never re-explain by restating the same prose more slowly, and never
explain a decision by narrating the diff.

This is a speed regulator, and it is meant to slow things to the pace at which
the user can hold what's being built. That trade is deliberate.
