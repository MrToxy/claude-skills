---
name: implement-plan
description: >-
  Implements an existing plan file via gated, context-isolated sub-agents. User-invoked
  only: /implement-plan <plan-file> [PRD_FILE=...] [ADR_FILES=...]. Orchestrates
  TDD-gated lanes (RED, GREEN, review+fix, independent verify), freezes cross-lane
  contracts before fan-out, scouts each lane once into a shared brief, treats the plan
  as a living artifact updated from sub-agent feedback, and maintains an evidence-based
  progress ledger. Produces implemented, reviewed, independently verified code plus an
  as-built plan file.
disable-model-invocation: true
metadata:
  author: joaopetinga
  version: "1.1.0"
  tags: [orchestration, tdd, sub-agents, plan-execution]
---

# implement-plan

Drive implementation of an existing plan via gated, context-isolated sub-agents. You are
the **orchestrator**: you orchestrate **work AND information**. You never write code
yourself and never read repo code — sub-agents do; you hold only the contract sheet, the
ledger, the briefs' curation, and agents' returned summaries/evidence.

## Input

- `$ARGUMENTS` — path to `PLAN_FILE` (required). Optional: `PRD_FILE=`, `ADR_FILES=`
  (consult for ambiguity only, never hand raw to agents).
- If no plan path given: ask for it, stop.
- **Single source of truth:** `PLAN_FILE`. Never split it; lanes consume it by
  phase/section reference at dispatch time — copies drift, references stay current when
  the plan changes mid-run.

Examples:

```
/implement-plan docs/plans/kanban.md
/implement-plan docs/plans/kanban.md PRD_FILE=docs/prds/kanban.md
```

## Step −1 — Parse the plan

Read `PLAN_FILE` and extract into orchestrator context only:

1. **Phases** — each section, its `**Tests**` block, mapped `AC-N`s.
2. **Acceptance criteria** — the whole-plan acceptance gate.
3. **Seams** — every cross-boundary contract (API, event, SDK, schema) two units must agree on.
4. **Lanes** — independent units of work (per repo/worktree/subsystem) and their phases.
5. **Verification section** — the plan's own e2e instructions.

If any is missing (no phases, ACs, Tests blocks, or seams): **stop and report the gap** —
do not invent. Ask the user how to proceed.

## Step 0 — Freeze the seams (blocks all fan-out)

Pin every seam onto a one-page **contract sheet** (template: `references/templates.md`)
handed into every lane. A seam is frozen when both sides can code against it (real one
side, mock the other) without negotiation. **No fan-out until all seams are FROZEN.**

## Step 0.5 — Scout the lanes (parallel, before fan-out)

One read-only scout agent per lane (Explore type, low effort, `sonnet`) writes
`LANE_BRIEF.md` at the lane worktree root (git-ignored):

- `## Env` — exact test/build/lint/run commands, service/env setup, ports; **confirm
  clean green baseline** (this IS the baseline check).
- `## Map` — repo layout, key files per phase, conventions, gotchas.

Brief covers its own lane only; per-run artifact, deleted at run end. Exploration is paid
once per lane, not once per agent. If the environment can't stand up (blocked secrets,
missing services): surface as blocker — never mark phases around it.

## Context isolation + agent contract

One fresh sub-agent per (phase, role); implementer and verifier are always different
agents. Exact per-role context recipes and the mandatory return contract (`Learnings:` +
`Plan deltas:`) are in `references/role-prompts.md` — **read it before dispatching the
first agent and follow it verbatim.** Key rules:

- Implementer/review agents get the full brief; **verifiers get `## Env` only** (never
  implementer claims — independence).
- Cross-lane communication happens only through the frozen contract sheet + mocks.
- Merge every agent's `Learnings:` into the brief's `## Map`; dedupe, drop stale lines,
  keep it lean. Route `Plan deltas:` per "Living plan" below.

## Model policy

Downgrade only agents whose output is later gate-checked by a stronger agent; **never
downgrade a gate.** Scouts/Explore → `sonnet`; trivial lookups → `haiku`; implementer,
review+fix, verifier, integration, whole-diff review, final acceptance → session model.

## NON-NEGOTIABLE GATES

Flip a ledger cell **only on evidence** (command + exit code + last ~30 lines — never
full logs), never on say-so. Why: agents under completion pressure report success
optimistically; evidence is the only signal that survives that bias, and output tails
keep the orchestrator's context flat over long runs.

1. `Tests RED` ✓ — phase's test cases (from its `**Tests**` block) shown **failing** before any implementation.
2. Every mapped `AC-N` → ≥1 test case; an AC without a test blocks the phase.
3. `Impl GREEN` ✓ — passing test output, not a claim.
4. `review+fix` ✓ — merged review pass done; all correctness findings resolved AND quality findings applied or waived w/ reason; tests still green.
5. `Indep verify` ✓ — separate fresh verifier re-ran the suite against the phase's committed snapshot, PASS + evidence (UI phases: agent-browser screenshots mobile + desktop).
6. Phase is `DONE` only with 1–5 all ✓. A failing/blocked task stops the gate — surface it, never mark around it.

## Per-phase loop (fixed order)

**RED → GREEN → review+fix → independent verify → gate.**

1. **RED** — fresh implementer writes the phase's tests; returns failing output.
2. **GREEN** — same implementer implements until suite passes; returns passing output.
3. **REVIEW+FIX** — one agent runs `/code-review --fix` (effort: **high**) on the phase
   diff, two mandatory lenses: correctness, AND quality cleanups at full /simplify depth —
   the agent **must spawn a dedicated simplify-focused sub-finder** (reuse, simplification,
   efficiency, altitude). Resolve or waive every finding; re-run tests once (green).
4. **COMMIT + VERIFY (pipelined)** — commit the phase snapshot. Dispatch the fresh
   verifier against **that commit** (detached checkout/temp worktree) **in parallel with
   the next phase's RED** on the lane worktree. On FAIL: halt lane, fix agent gets the
   failure evidence, re-run review+fix + verify; redo affected in-flight work.
5. **GATE** — flip `DONE` only with all cells green.

**Concurrency rule: one writer per worktree at a time.** Mutating stages (RED, GREEN,
review+fix) serialize within a lane; only read-only verify overlaps, and only on committed
snapshots. Cross-lane parallelism is unrestricted. Why: overlapping writers means the next
phase builds on code the fixer is simultaneously rewriting — the rework costs more than
the overlap saves; a read-only verifier on an immutable commit can't collide with anything.

## Living plan — information orchestration

`PLAN_FILE` is continuously updated through implementation; it ends as the as-built record.

- **Single writer:** only the orchestrator edits `PLAN_FILE`. Agents report `Plan deltas:`.
- Apply each delta immediately; append `rev N — change — source — why` to a
  `## Plan changelog` section in `PLAN_FILE`. Rev counter = staleness detector.
- Agents always dispatch against the latest rev (section-reference consumption makes this free).
- **Impact triage per delta:** not-yet-dispatched phase → apply, done. In-flight phase →
  apply + push delta to that agent (SendMessage). `DONE` phase → apply + un-tick its
  `Indep verify`/`Gate`, re-verify if behavior-relevant. FROZEN seam → pause consuming
  lanes, update contract sheet, re-freeze, notify both sides, resume.
- Final acceptance runs against the **latest** rev, never the original.

## Verification loop (4 rungs)

1. **Per phase** — the loop above.
2. **Integration** (one agent, after all lanes `DONE`) — replace mocks with real
   endpoints/SDKs, run cross-lane flows; touches code → same review+fix pass on its diff.
3. **Whole-diff review** — `/code-review` (effort: **xhigh**) on the entire cumulative
   diff (all lanes + integration) before acceptance; fresh pass, not a re-run. Resolve or
   waive every correctness finding; suite stays green.
4. **Final acceptance** — fresh agent, separate from integrator and reviewer; context =
   only the ACs + plan `## Verification` (latest rev) + brief `## Env`. Runs full e2e;
   signs off or returns failing ACs. The integrator never self-certifies. Pure
   verification — no review+fix.

## Progress ledger

Templates + column spec in `references/templates.md`. State machine per phase:
`TODO → RED → GREEN → REVIEWED → VERIFYING → DONE`.

**Render policy:** per state change re-render **only the changed row**; render the
**full table** on gate flips to `DONE` and at run end.

**Feature-done signal** (the only one): every phase `DONE` + Integration ✓ + Whole-diff
review ✓ + Final acceptance ✓, against the latest plan rev.

## Execution order

Step −1 → Step 0 (freeze) → Step 0.5 (scouts, parallel) → fan out lanes in parallel →
per-phase loop gates each phase (verify of N overlaps RED of N+1) → Integration →
whole-diff review (xhigh) → Final acceptance. Hard sequence only:
integration-after-all-lanes, whole-diff-before-acceptance, acceptance-last. Apply plan
deltas the moment any agent reports them.

## Prerequisites

- Worktrees: one per lane off its base branch on the plan's feature branch; reuse
  worktrees the plan says exist.
- Test env per the plan's `## Prerequisites`/`## Verification`; scouts confirm the green
  baseline (Step 0.5).
- Dependencies: `Agent` tool, git worktrees, `/code-review` skill; `agent-browser` for UI
  phases. If `/code-review` is unavailable, stop and report — the gates cannot run.

## Run end

When the whole-plan gate is green (or the run is stopped as blocked):

1. Delete every `LANE_BRIEF.md` (per-run artifacts; stale briefs mislead future runs).
2. Render the final full ledger.
3. Report: whole-plan gate result, waived findings w/ reasons, and point to
   `## Plan changelog` in `PLAN_FILE` — the plan is now the as-built record.
