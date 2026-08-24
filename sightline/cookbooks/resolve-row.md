# Cookbook — resolve one row

The common case, and the whole of a resumed session. One row, then the turn
loop in SKILL.md, then clear.

## Resolve — one at a time

Work the `now` rows — the ones the first slice cannot ship without — in order of
cost-if-wrong. Never batched. If a row turns out to be shippable-around once you
open it, put it back to DEFER rather than finishing it because you're already
here — with a trigger *and* the thing that will notice it fire, same as any
other DEFER row (`triage.md` § When / who notices). A row demoted without an
owner is a row you dropped.

**RESEARCH** — go read. Return under ten lines: what's there, what it
constrains, what surprised you. Cite files and line ranges so the user can
follow you in. Return the shape you found — call tree, file tree, the type —
not a description of it; a paragraph about how three modules relate is the
worst form that answer has.

**PROBE** — hand the row to `/probe`. It owns the build; you own the map.

```
in   the row's question
     the decision rule agreed during triage — what result picks A over B
     the timebox (default: one context window)
     .sight/<effort>/probes/<nn>-<slug>/   spike dir
     .sight/<effort>/findings/<nn>.md      where the finding lands
out  Q / Tried / Found / Decides, plus a micro-world if there's a visible
     surface; spike burned
```

The finding lands through the one command, because it is read by a script
months later and a hand-written one is stamped wrong or not at all:

```
sight write findings/07.md --paths "src/db/queue.ts" --requires "single tenant"
```

`--requires` is what the probe assumed and did not test. A probe that held at
500 connections holds *at 500 connections*; say so, or the next session reads
the `Decides:` line as unconditional.

Open the spike dir with the recipe rather than `mkdir`, and close it with the
other one:

```
sight spike 07-transit-api "<the rule>"    # dir + RULE.md + quarantine
sight burn 07                              # after the finding is written
```

Then put the result in front of them in the instrument it belongs to, before
writing it up:

| The row was about | You end with |
|---|---|
| a visible surface | the micro-world open in their browser, and their pick |
| structure the probe moved | a diff on the board, not a paragraph about the change |
| anything else | the finding, in the forms from `SKILL.md` § how to talk |

A surface row written up in prose is the failure this exists to stop. The
description reads like agreement — they cannot disagree with a layout they have
never seen — and the next row builds on a decision nobody actually made.

Two things that stay yours, because they're triage decisions, not build ones:

- **No rule, no probe.** If neither of you can say what result picks A over B,
  the row isn't ready — usually because it's two questions. Split it in the
  table, don't send it.
- **`Decides: nothing` is a real outcome.** An expired probe becomes a re-scoped
  cheaper row or a DEFER carrying a trigger and its owner. Never an opinion.

## Seams — split the work

Before building anything, propose which pieces the user writes by hand and which
you write. This is not a courtesy — for a user who understands code by writing
it, hand-writing the load-bearing pieces is the only reliable way the
understanding arrives, and it has to be negotiated before the code exists rather
than recovered afterwards.

In this session you build only the toy and the probe stage. Everything else the
split assigns you is the plan's work, not this session's — it waits for the user
to trigger the build.

Propose the split with this rule: **the user writes whatever they'll need the
concepts of to steer the next ten loops.** In practice the core data structure,
the state machine, the boundary type — almost never the glue, the config, the
third CRUD endpoint, or the test scaffolding. Expect this to be 5–10% of the
lines and a much larger share of the decisions.

Concrete forms, in rough order of how often they apply:

- **Toy version first.** Before anything structural, write one file, 40–80 lines
  **in the row's spike dir**, that has the architecture and none of the
  production concerns — no error handling, no framework, no auth, fixtures
  inline. The user reads it, edits it, breaks it. This is the highest-value move
  in the skill: it puts understanding before the code exists, rather than after,
  which is where review always fails.

  Scaling it up is implementation, and implementation is the user's trigger. A
  toy that survived iteration and won the direction is a *resolved row*, not a
  head start — its shape carries forward as the finding, and as a kept
  micro-world if it earned one. Otherwise it dies with the spike. Do not grow it
  into the real thing because the direction is now obvious. The obviousness is
  what the toy was for.
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

## Gate — understanding

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

Never offer it. It exists for when they ask, or when there is genuinely nothing
to extend; offering it is skipping the gate, and it slips hardest on exactly the
decisions that have no small extension — the architectural and the negative
ones.

If the gate fails, the decision is not resolved. Re-explain in a form the user
can actually read: a reduced version of the code with the noise stripped out, a
literate walkthrough in dependency order rather than alphabetical, a smaller
probe. Never re-explain by restating the same prose more slowly, and never
explain a decision by narrating the diff.

This is a speed regulator, and it is meant to slow things to the pace at which
the user can hold what's being built. That trade is deliberate.
