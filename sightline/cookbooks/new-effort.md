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
  - <question> → <answer>   [source: PRD §2 / auth.ts:40-58 / your prompt]
Still open (M): → triage below
```

Anything sourced to your own reasoning rather than a document, a file, or the
user's words is not answered. Put it back in the open pile.

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

| # | Question | Cost if wrong | Resolve by | When |
|---|----------|---------------|------------|------|

- **Cost if wrong** — cheap / annoying / structural.
- **Resolve by** — ASK (the user knows, it just never came up — send it back to
  the interview), RESEARCH (the answer exists but is deeper than Phase 0 went),
  PROBE (nobody knows until something is built), DEFER (a real decision, but
  building isn't blocked by it).
- **When** — now, or the trigger that will force it (`when the second tenant
  lands`, `when a job first fails mid-run`).

Push hard on DEFER. Most fogged questions are deferrable, and shrinking what has
to be decided today is most of this table's value. Three resolved decisions and
nine dated triggers beats twelve guesses.

**A row is `now` only if the first slice cannot ship without it.** Cheap-to-answer
is not a reason to answer. If you can picture the tracer shipping with the
question still open, it is DEFER, and the trigger is whatever will make it stop
being shippable.

This is the rule that gets broken, and cost-if-wrong is what breaks it: a row
marked *cheap* reads as an invitation to settle it in one line. Four rows out of
eight went that way on the first real run — measures, caps, ordering, rendering,
none of them blocking anything. Cheapness attracts resolution. Answer the two
that block; date the rest.

Have the user correct the triage before resolving anything. Their moves between
rows are the most informative signal in the session — a question you filed as
PROBE that they move to DEFER tells you the fog was never load-bearing.

Then, in the same breath, **put every ASK row to them as one batch** — four at a
time, each with your recommended answer. They're already looking at the table;
that is the cheapest moment they will ever have to answer. Do not carry an ASK
into the probe work, and do not open a later session to ask one.

Only once the ASKs are answered does the pointer go to the first PROBE or
RESEARCH row.
