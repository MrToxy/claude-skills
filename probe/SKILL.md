---
name: probe
description: >-
  Answer one question that can't be settled by reading or arguing — build the
  smallest throwaway thing that makes the answer visible, inside a timebox,
  against a decision rule declared before the build starts. Returns a 4-line
  finding (Q / Tried / Found / Decides) plus a manipulable micro-world when the
  thing has a visible surface, then deletes the spike. Use when the user says
  "spike this", "try both and see", "we won't know until we build it", "is X
  fast enough", "which of A or B", "prototype it first", when an interview hits
  "I don't know yet" on something no one can know, or when `sightline` resolves
  a PROBE row. Standalone: /probe <question> [--rule "..."] [--box "..."].
metadata:
  author: joaopetinga
  version: "1.0.0"
---

# Probe

One question. One timebox. One rule that ends it.

## Contract

**In**

| Field | Required | Default |
|---|---|---|
| question | yes | — one question, settled by observation |
| decision rule | yes | — refuse to start without it |
| timebox | no | one context window |
| options | no | inferred from the rule (A vs B is the good case) |
| findings path | no | none → return inline only |

**Out** — always inline, always exactly this:

```
Q:       does LISTEN/NOTIFY hold up at our connection count?
Tried:   500 idle conns, replayed 2h of prod events, LISTEN/NOTIFY vs outbox poll
Found:   p99 notify→handler 34ms; 3 dropped notifications when a listener reconnected
Decides: outbox. rule was "any dropped event → outbox", and it dropped.
```

Plus a micro-world if the thing has a visible surface (see below). Then the
spike is deleted.

## Refuse to start

Most things that arrive as a probe are not one.

| What you're looking at | It's actually | Do this instead |
|---|---|---|
| answer is in the docs, code, or migration history | RESEARCH | read it, cite `file:line`, done |
| answer is in the user's head | ASK | one question, back to the interview |
| "what should we do about X?" | not a question | reframe as A vs B, then probe |
| no result would change the plan | DEFER | name the trigger that reopens it |
| no rule that could end it | unbounded | get the rule first — below |
| the smallest version is still the feature | the project | shrink it or defer it |

Say which one it is and stop. Starting a probe on an unprobeable question burns
the timebox and launders a guess into evidence.

## The decision rule

Declared **before** any code, out loud, in one line. It names the observation
and the branch it picks.

```
BAD   see if the new parser is good enough
GOOD  zero manual fixups across all 340 recorded payloads → swap; one fixup → keep the old one

BAD   check if we can do this client-side
GOOD  bundle grows < 40kb gzipped and cold parse < 100ms on the throttled profile → client-side; else server

BAD   find out how bad the N+1 is
GOOD  > 200ms added at 50 rows → batch loader; under → leave it, revisit at 500 rows
```

If the user can't state the rule, the probe isn't ready — that's the real
finding, and it's usually because the question is two questions.

Write the rule at the top of the spike dir as `RULE.md`, one line. A context
reset mid-probe must not lose what would have ended it.

## Timebox

Default: **one context window**. Caller may override with anything concrete
(turns, wall-clock, "until the harness runs"). State the box before starting.

On expiry with the rule un-fired, the finding is still mandatory:

```
Q:       can we migrate tenants without downtime?
Tried:   dual-write shim over 2 of 11 tables; box was one context
Found:   INCONCLUSIVE — shim works for 2 tables, the FK cycle in billing_* is unsolved
Decides: nothing. next cheaper question: does billing_* need to move at all?
```

`Decides: nothing` is a legitimate outcome. Guessing to fill the line is not.
An expired probe either gets a re-scoped cheaper question or becomes a DEFER
row with a trigger — never an opinion.

## Quarantine

```
.sight/<effort>/probes/<nn>-<slug>/     # called from an effort
.sight/probes/<slug>/                   # standalone
```

Ignore it while it lives, without touching the repo's tracked ignore file:

```
printf '.sight/probes/\n.sight/*/probes/\n' >> .git/info/exclude
```

Spikes only — a map, its question files, and its findings are shareable, and
`sightline` may want them committed. The spike never is.

Rules that don't bend:
- Nothing is imported from the spike into the real tree. Ever. If a line of it
  turns out to be right, it gets rewritten there deliberately.
- No production code is edited during a probe. Reading production code is the
  point; writing it is a different skill.
- Real data. Actual rows, actual payloads, actual recorded failures. A probe on
  fabricated happy-path data answers nothing and feels like it answered
  something, which is worse than not running it.

## Build the smallest thing

- **Two options side by side** wherever the rule names a branch. One option is
  an argument; two are an experiment. Same input, same harness, both running.
- Strip everything the rule doesn't read: no error handling, no auth, no
  framework, no persistence, fixtures inline.
- Instrument the exact quantity in the rule. If the rule says p99, print p99 —
  not a wall of timings for the reader to eyeball.

## Make it manipulable

When the decision has a visible surface — data shape, state transitions, UI,
behaviour under load, a migration's effect — the output is a **single-file HTML
micro-world**, not a description of one.

| Kind of decision | What the micro-world gives them |
|---|---|
| A vs B | both, live, on the same input, side by side |
| anything sequential | a stepper — scrub states, see what changed |
| migration / refactor | before and after, advanced one step at a time |
| load, limits, thresholds | the knob from the rule, wired to the real number |
| data shape | edit the shape, watch what breaks downstream |

Self-contained: no CDN, no build step, opens from `file://`.

The test: **can the user discover you're wrong by using it?** If the only
available reaction is "looks fine", it's a demo. Rebuild it.

## Hand seam

On a structural probe — one whose answer the user will steer by for the next
ten loops — build the stage and leave the middle.

You write: fixtures, real-data loader, runner, side-by-side scaffold, the
measurement. They write: the thirty lines the rule actually turns on.

Offer it, don't impose it, and if they take it, never fill it in later because
it would be faster.

## Ending

In this order, before the context ends:

1. Write the 4-line finding. Inline always; also to the caller's path if one
   was passed.
2. Keep the micro-world **only** if it encodes a structural decision — then it
   moves next to that decision's ADR and is committed with it. A kept
   micro-world must break loudly when the system moves under it; one that can
   rot unnoticed wasn't worth keeping.
3. Delete the spike directory.
4. If the finding settled something hard to reverse, say so and name where it
   belongs (the repo's existing ADR / glossary / plan — never a parallel doc
   system).

`Found` is an observation. `Decides` is the rule firing on it. Keeping them on
separate lines is what stops a probe from becoming a rationalisation.

## Called from sightline

`sightline` passes the row's question, the rule agreed during triage, the box,
and `findings/<nn>.md`. Return the 4-liner; it owns MAP.md, the ADR, and the
understanding gate. Don't update the map, don't open the next row.

## Anti-patterns

- Starting without a rule, then discovering one that fits the result.
- Widening the question mid-probe because the first answer was boring.
- Keeping the spike because it works. Working is not the bar; it was built
  without the concerns that make code survivable.
- Reporting the build instead of the finding. Nobody needs the tour.
- A second probe on the same question because the first was inconclusive and
  that felt like failure. Re-scope to the cheaper question or defer.
