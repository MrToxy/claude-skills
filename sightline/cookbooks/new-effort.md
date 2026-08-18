# Cookbook — a new fogged effort

Nothing on disk yet. Burn the question list down, then triage what survives.
Ends with a MAP.md, one question file per open row, and a pointer.
Then `cookbooks/resolve-row.md`, one row per context.

What you write has to be machine-readable — `sight resume` parses it:

```
MAP.md              → current: q/02-tool-shape.md      one line, literal

q/<nn>-….md frontmatter
  touched: 2026-08-14           the day this row's Phase 0 answers were true
  paths: src/lib/tools.ts       what the question depends on (optional)
```

## Phase 0 — Answer everything you can before asking anything

Never hand the user a question you could have answered yourself. Most of what
looks like fog is just unread context.

Take the raw question list and burn it down first:

1. **From what was already said** — the PRD, the brief, the interview
   transcript, the initial prompt, the board sketch if one exists. Half the list
   usually dies here.
2. **From the codebase** — read it. Existing patterns, the shape of the data,
   how the neighbouring feature solved the same thing, what the migration
   history says about decisions already taken.
3. **From the world** — library docs, API constraints, platform limits.

Report the burn-down before the triage table, in this shape, so the user can
catch a bad inference before it becomes a foundation:

```
Answered from context (N):
  - <question> → <answer>   [auth.ts:40-58: "<the clause that says it>"]
Still open (M): → triage below
```

The quote is the whole check. A citation that only points — `[source: auth.ts]`
— reads identically whether it was quoted or inferred, and an inference that
lands with provenance is trusted *more* than an honest guess, not less.

So: if you can't quote the source saying it, it's your reasoning. Back in the
open pile.

## Phase 1 — Triage what remains

Two different jobs here, and getting them the wrong way round is why triage
feels like busywork:

- **Yours**: does an answer exist anywhere, and where. That's a factual
  question, and you can propose a classification for every row with a reason.
- **Theirs**: what does it cost to be wrong, and is this blocking. That depends
  on business context, deadlines, and risk appetite you don't have. Propose a
  guess, flag it as a guess, and expect to be overruled.

So: fill in the whole table with your proposals, mark the columns you're
guessing at, and hand it over for correction. Don't present a blank table — that
just moves the work back to the user. Don't present a locked one either.

Render one table and nothing else:

| # | Question | What stops without it | Cost if wrong | Resolve by | When |
|---|----------|-----------------------|---------------|------------|------|

- **What stops without it** — fill this in **first**, before the other columns,
  and name a concrete thing in the first slice: *"the tool's key enum"*, *"the
  return type"*, *"the migration's column list"*. Not a worry — a thing that
  cannot be written.
  - can't name one → the row is **DEFER**. Not a judgement call; the empty cell
    is the verdict.
  - writing *"we'd have to guess"* → also DEFER. A guess you can revise later
    isn't a blocker, it's a default.
- **Cost if wrong** — cheap / annoying / structural. This orders the `now` rows.
  It does **not** decide which rows are `now`; the previous column already did.
- **Resolve by** — ASK (the user knows, it just never came up — send it back to
  the interview), RESEARCH (the answer exists but is deeper than Phase 0 went),
  PROBE (nobody knows until something is built), DEFER (a real decision, but
  building isn't blocked by it).
- **When** — now, or the trigger that will force it (`when the second tenant
  lands`, `when a job first fails mid-run`).

The column order is the whole mechanism. Asked cost-first, *cheap* reads as
permission to settle a row in one line, and four rows out of eight went that way
on the first real run — measures, caps, ordering, rendering, none of them
blocking anything. Cheapness attracts resolution. Asking what stops first gives
the cheap rows nothing to fill in.

It cuts the other way too, which is the part worth trusting: on that same effort
a row filed as DEFER (*"month bucket — which date, whose timezone"*) turned out
to hold two questions. **Which date column** stops the SQL from being written and
was `now`; **whose timezone** stops nothing and stays deferred. A row that can't
name one clean blocker is often two rows.

Three resolved decisions and nine dated triggers beats twelve guesses.

Have the user correct the triage before resolving anything. Their moves between
rows are the most informative signal in the session — a question you filed as
PROBE that they move to DEFER tells you the fog was never load-bearing.

Then, in the same breath, **put every ASK row to them as one batch** — four at a
time, each with your recommended answer. They're already looking at the table;
that is the cheapest moment they will ever have to answer. Do not carry an ASK
into the probe work, and do not open a later session to ask one.

Land each answer the turn it arrives — `findings/<nn>.md` with the question,
their answer in their words, and a `Decides:` line — then flip the row on the
map. No turn loop runs for an ASK row, so this is the only thing standing
between four answers and a dead context. The batch isn't done until it's on
disk.

Only once the ASKs are answered does the pointer go to the first PROBE or
RESEARCH row.
