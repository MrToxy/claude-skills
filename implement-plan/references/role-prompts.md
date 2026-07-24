# Per-role context recipes + return contract

Follow these verbatim when composing each sub-agent's prompt. Isolation is enforced by
what each context CONTAINS — nothing else.

## Universal return contract (append to every agent prompt)

Every agent must end its return with two blocks:

- `Learnings:` — EVERY durable, reusable discovery (codebase facts, commands, gotchas,
  invariants) useful to later phases. No count cap; the filter is reusability, not
  quantity — no filler. (Bloat control is the orchestrator's job: merge into the brief's
  `## Map`, dedupe, drop stale/one-off lines.)
- `Plan deltas:` — anything that invalidates or changes the plan (wrong assumption, scope
  change, new/changed seam, AC reinterpretation, test adjustments). Empty if none.

Evidence returns are always: command + exit code + last ~30 lines of output. Never full logs.

## Implementer (RED + GREEN — same agent)

Context: contract sheet + the phase's plan section incl. `**Tests**` block (latest rev) +
relevant Findings/Architectural-decisions/Context rows + **full `LANE_BRIEF.md`**.
Never another lane's repo, never another phase.

Task: write the phase's test cases first, run them, return FAILING output. Then implement
until the suite passes; return PASSING output.

## Review+fix agent

Context: same as implementer (contract sheet + phase section + full brief) + the phase diff.

Task: run `/code-review --fix` (effort: high) with two mandatory lenses, neither optional:
1. correctness (native focus);
2. quality cleanups at full /simplify depth — MUST spawn a dedicated simplify-focused
   sub-finder scoped to reuse, simplification, efficiency, altitude.
Resolve every finding or waive with a reason (goes in the ledger); re-run tests once, stay
green.

## Independent verifier

Context: ONLY the phase's ACs + `**Tests**` block (latest rev) + the brief's **`## Env`
section** (commands + setup — never implementer findings or claims) + the commit SHA to
verify. Runs on a detached checkout/temp worktree of that commit — never the live lane
worktree.

Task: re-run the suite from scratch; UI phases: drive agent-browser, screenshot mobile +
desktop. Return PASS/FAIL + evidence.

## Scout (Step 0.5)

Read-only, Explore type, low effort, model `sonnet`. Context: the lane's worktree path +
the lane's phase list (titles only).

Task: write `LANE_BRIEF.md` at worktree root with `## Env` (exact test/build/lint/run
commands, service setup, ports; run the suite once to confirm clean green baseline) and
`## Map` (repo layout, key files per phase, conventions, gotchas). Report baseline status.

## Integrator

Context: contract sheet + the plan's integration/seam sections (latest rev) + `## Env` of
every involved lane.

Task: replace mocks with real endpoints/SDKs, run cross-lane flows. Then the same
review+fix pass on the integration diff.

## Whole-diff reviewer

Context: the entire cumulative diff (all lanes + integration). Task: `/code-review`
(effort: xhigh), fresh pass over the whole change — target cross-phase/cross-lane issues
per-phase reviews each saw only half of.

## Final acceptance agent

Fresh; separate from integrator AND whole-diff reviewer. Context: ONLY the plan's
acceptance gate (all ACs) + its `## Verification` section (latest rev) + briefs' `## Env`.

Task: run the full e2e per the plan. Sign off or return failing ACs. Pure verification —
no review+fix.
