# Cookbook — triage what the reading left open

You have `current-state.md`, `impact.md`, `alternatives.md`, and a list of
questions reading could not close — every `(unknown)` in those three files, plus
the approach pick if it demoted to a probe.

Classify them. Ends with a MAP.md, one question file per open row, and a
pointer. Then `cookbooks/resolve-row.md`, one row per context.

What you write has to be machine-readable — `sight resume` parses it:

```
MAP.md              → current: q/02-tool-shape.md      one line, literal

q/<nn>-….md frontmatter
  touched: 2026-08-14           the day this row's answers were true
  paths:   src/lib/tools.ts     what the question depends on (optional)
```

## Triage

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
- **Resolve by** — ASK (the user knows, it just never came up), RESEARCH (the
  answer is in the system but deeper than the reading went), PROBE (nobody knows
  until something is built), DEFER (a real decision, but building isn't blocked
  by it).
  - **A question about a visible surface is not an ASK** — a card, a screen, a
    settings page, anything with a layout. Asked in prose it collects a
    preference between things nobody has seen, and the answer lands as an ASCII
    box that reads exactly like a decision. It is a PROBE: build the variants on
    the same fixtures, let them pick. Ask about a surface only once it is drawn.
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

## Scenarios — for the ones they can't judge

A recommendation costs nothing to accept, and accepting it teaches nothing. When
the options differ in ways they have no vocabulary for, or they stall, or they
take your recommendation instantly, put the same question as two everyday
situations and let them choose between consequences instead of between names.

Works the same on a whole-change **approach** as on a single decision's
**options**:

```
Two doors, same building. You're picking which one to run.

  A  On the way in, the bouncer hands you a signed wristband. Every door
     reads the band and lets you through. Nobody phones anyone.
       · someone finds your dropped band — they're you, until it expires
       · you're barred at 9pm; your band says 11pm. You're in until 11.

  B  The bouncer writes you into a book at the front desk. Every door
     phones the desk before opening.
       · barred at 9pm means barred at 9:01, at every door
       · the desk goes down, every door is shut

Which building do you want to run?
```

Only once they've picked: *"A is a JWT, B is a server session — you chose
revocation lag over availability coupling."*

Four rules, because a bad scenario is worse than a bare recommendation: it
manufactures the feeling of understanding.

| Rule | Why |
|---|---|
| symmetric — same number of consequences each, and each option gets one that **hurts** | an asymmetric scenario is your recommendation in a costume |
| no technology named until after they pick | the name recruits their priors, and "the modern one" answers it for them |
| map the pick back the same turn — what they chose, and what it costs | otherwise they answered about wristbands, not about auth |
| one scenario per question, then it dies | extended metaphors drift, and start generating implications the system doesn't have |

If no everyday situation carries the property the decision actually turns on,
the row was never an ASK. Demote it to PROBE rather than inventing a scenario
that carries something else.

## Exit

Only once the ASKs are answered does the pointer go to the first PROBE or
RESEARCH row. Then [resolve-row.md](resolve-row.md), one row per context.
