# Cookbook — reconstruct, fit, approaches

A need arrived and nothing is on disk. This is the front half: read the system
the change lands in, establish where it lands and what moves, weigh the
approaches, pick one. Ends with `current-state.md`, `impact.md`,
`alternatives.md`, and a list of questions the reading could not close.

Then `cookbooks/triage.md` for that list.

The need is the **input**, not yet a design. It scopes where you look. You do
not design against it here.

What you write has to be machine-readable — `sight resume` parses it:

```
MAP.md              → current: current-state.md      one line, literal

current-state.md frontmatter
  touched: 2026-08-21          the day these answers were true
  paths:   src/api src/db      what has been read
  unread:  the retry path below OrderQueue     the frontier, one line
```

## Proportionality — read this before you open a file

The front door scales **down**. A need that touches one component gets a
reconstruction of one component, and that can be four lines and a call tree.

| The need | The reading |
|---|---|
| add a field to an existing form | the form, its validator, its write path. Minutes. |
| add a second tenant | every write path, every cache key, every background job. Days. |

The check is the same either way: **can you name what moves when this lands?**
If yes, stop. There is no credit for depth, and a reconstruction that outruns
its need is the failure mode this skill is most likely to have.

## Reconstruct — how it works today, and why

### Read in this order

```
1  entry     where the need first touches the running system
             the route, the command, the event, the button
2  outward   follow it. who calls it, what it calls, what data crosses,
             in what shape, and who owns the write
3  why       the decisions already taken — git log on those paths, ADRs,
             the neighbouring feature that solved the same problem
4  stop      when you can name what moves
```

Step 3 is the one that gets skipped and the one the user actually needs. *How*
it works, they can read for themselves. *Why* it works that way is what tells
them whether the new thing belongs inside the existing shape or beside it.

Pattern discovery lives here too: if the codebase already solved something
adjacent, that solution is a constraint, not a suggestion. Name it.

### Write as you go — never at the end

Read a slice → write it into `current-state.md` → read the next slice. One
command does the writing, and the stamps come with it:

```
<the artifact so far> | sight write current-state.md \
    --paths "src/api/orders.ts src/db/orders.ts" \
    --unread "the retry path below OrderQueue"
```

`--unread ""` when the frontier closes; that empty field is what `sight check`
reads to know the reading finished.

Holding four slices in context to write up a tidy document at the end is the
turn the session dies on, and it is exactly the turn that feels most productive.

```markdown
---
touched: 2026-08-21
paths:   src/api/orders.ts src/db/orders.ts src/jobs/settle.ts
unread:  the retry path below OrderQueue
---

## Components
`OrderService`   src/api/orders.ts     validates, owns the transaction
`OrderRepo`      src/db/orders.ts      the only writer to `orders`
`SettleJob`      src/jobs/settle.ts    nightly, reads and closes

## Flow — placing an order
POST /orders
  OrderService.create
    validate            rejects on stock, not on price
    OrderRepo.insert    one transaction, status='open'
    emit order.created  fire-and-forget, no retry

## Why it's like this
- one writer by design — `OrderRepo` is the only module importing `db.orders`
  [orders.ts:1-8, "// all writes go through here, see ADR-004"]
- settlement is nightly, not per-order, because the ledger API is rate-limited
  to 100/min [ADR-011]

## Not confirmed
- (inferred) `emit` has no retry — no retry code in the path, but I did not
  read the transport
- (unknown) whether `SettleJob` is idempotent
```

### Every claim is quoted, or it's marked

The quote is the whole check. A citation that only points — `[source: auth.ts]`
— reads identically whether it was quoted or inferred, and an inference that
lands with provenance is trusted *more* than an honest guess, not less.

Three states, and the third is not a failure:

| | |
|---|---|
| **confirmed** | you can quote the line that says it. Quote it inline. |
| **inferred** | it follows from what you read, but nothing states it. Say `(inferred)`. |
| **unknown** | you did not read it, or reading did not settle it. Say `(unknown)`. |

`(unknown)` items are candidate rows — carry them to triage. Never round one up
to `(inferred)` because it would make the document read better.

### Report it, then gate it

Report in the forms from SKILL.md § how to talk — a call tree is the flow, a
file tree is the ownership. Never a paragraph about how three modules relate.

Then gate it, before Fit. The user has to hold the system or they cannot judge
where the new thing goes.

**Let them pick the medium.** A drawing is right or wrong the same way a type
is, and a missing arrow names the exact thing they didn't read — but a typed
answer is not a worse answer:

```
"Before I say where this lands — draw or write the path an order takes
 from POST to the row being written, and who owns the write."
```

Grade it mechanically against `current-state.md`. A miss names the slice to
re-read, not a reason to re-explain more slowly. If they miss twice on the same
slice, that slice was never held: re-read it *with them*, in a smaller form.

Never skip this because the reading felt obvious. It felt obvious to you
because you did it.

## Fit — where it lands, and what moves

One file, `impact.md`. Fit and impact are the same question asked twice.

```markdown
## Lands in
`OrderService.create` — validation step, before the insert

## Moves
`OrderRepo.insert`     +1 column, and the migration
`SettleJob`            must now skip held orders, or it closes them early
`order.created` event  gains a field — one consumer, the emailer

## Boundary — what this provably does not cross
the ledger API contract (ADR-011 rate limit is unchanged)
anything reading `orders` outside `OrderRepo` — there is nothing

## Not confirmed
- (unknown) whether the emailer tolerates an unknown field
```

Rules:
- **Name a thing, not a worry.** `SettleJob closes held orders early` is impact.
  `settlement might be affected` is not.
- **The boundary is load-bearing.** It is what says the reading is done, and it
  is the first thing a probe can disprove.
- An `(unknown)` in `## Moves` is a row. Carry it.

## Approaches — two or three whole shapes

An **approach** is a whole-change shape, before any decision inside it exists.
An **option** is a choice inside one. Approaches here; options inline, later,
when the decision comes up.

```
approaches      A  extend the existing pipeline
                B  new service alongside it
                C  do it client-side

options         tenant id → column / schema-per-tenant / RLS policy
```

Two or three. One is not a choice; four is a survey. Each must be a thing that
could actually be built against `current-state.md` — an approach the reading
already rules out doesn't go on the list to make the pick look considered.

```markdown
## A — hold the order in `OrderService`
status column, `SettleJob` skips held. No new component.

## B — separate hold queue
new table + worker. `OrderService` unchanged.

## Trade-offs
|   | new concepts | touches settlement | reversible |
|---|---|---|---|
| A | 0            | yes                | migration back |
| B | 2            | no                 | drop the table |

## Picked — A
Fewer concepts, and settlement already reads status.
Costs: every future settlement rule has to know about holds.
```

Compare on what this codebase actually pays: new concepts, blast radius,
reversibility, consistency with what's already there. Not on generic
"complexity" — every approach is complex in a way the table should name.

### When they can't judge the approaches

Same instrument as an unjudgeable ASK, and the same demotion:

```
detect     instant yes, a shrug, a stall
scenario   the approaches as everyday situations, symmetric,
           no technology named until after they pick
  they pick and can say what it costs   → the approach stands
  still a shrug                         → PROBE row, onto the map
```

Rules for a scenario that doesn't manufacture the feeling of understanding —
symmetric, tech unnamed, mapped back the same turn, one scenario then it dies —
and a worked example: [triage.md](triage.md) § scenarios.

If the approaches differ in a way no everyday situation carries — latency,
throughput, whether a library can do the thing at all — that was never a
scenario. It's a probe. Put the pick on the map as row `00` with a decision
rule, and carry on with the rest of triage around it.

## Exit

Everything the reading could not close is now a question. That includes every
`(unknown)` in the three artifacts, and the approach pick if it demoted to a
probe.

Take that list to [triage.md](triage.md). Do not resolve any of it here.
