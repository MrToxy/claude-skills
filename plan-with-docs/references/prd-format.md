# PRD Format (constraint-extraction contract)

How `plan-with-docs` reads a PRD as a **constraint**. Matched to the `prd-designer` skill's output
(`AC-N` acceptance-criterion IDs) so the handoff is lossless. The PRD is **canonical and read-only**
— this skill never edits it. Use this contract when extracting `prd = { path, goals[], nonGoals[],
acceptanceCriteria[], successMetrics[], scopeIn[], scopeOut[] }` during Phase 1 step 4.

This file is the **single source of truth** for the AC-N referencing, embedding, and gating rules;
SKILL.md and `plan-template.md` point here rather than restating them.

A PRD has **no phases** — delivery phasing is deferred to planning. `plan-with-docs` creates the
phases and distributes the PRD's acceptance criteria across them.

---

## Sections and how to treat each

| PRD section | Extract as | How the plan treats it |
|-------------|-----------|------------------------|
| `Goals` | `goals[]` | Outcome targets that constrain plan **intent/scope**. **Non-gating** — never a completion gate. |
| `Non-Goals` + `Scope → Out of scope` | `nonGoals[]`, `scopeOut[]` | **Hard boundaries.** A slice/answer that expands into one triggers the `[Non-Goal Conflict]` halt. |
| `User Stories` | (context for grouping) | Acceptance criteria are grouped under these. |
| `Acceptance Criteria` | `acceptanceCriteria[]` | The units distributed across phases. Each gates the phase that owns it, and all of them gate the final whole-PRD acceptance gate. |
| `Success Metrics` | `successMetrics[]` | **Non-gating post-launch outcomes.** Recorded in the plan's `Post-launch success metrics` section, never in a completion gate. |
| `Scope → In scope` | `scopeIn[]` | Confirms what the plan must deliver. |

Tolerate heading variants: "Out of scope" pairs with Non-Goals as boundaries; "Success Metrics"
join the post-launch (non-gating) section.

---

## Acceptance-criterion IDs (`AC-N`)

Every acceptance criterion carries a **stable `AC-N` ID** — `AC-1`, `AC-2`, … **monotonic across the
whole PRD** (not per-story), never renumbered or reused. Reordering keeps the ID; deleting leaves a
gap; IDs stay fixed across PRD revisions. Criteria remain grouped under `Story: {name}`, but the IDs
are global.

Extract each as `{ id: "AC-N", story: "<story name>", text: "<verbatim criterion>" }`.

**The PRD is the single source of truth for these criteria.** The plan:
- references them by `AC-N` ID in a traceability map (`AC-N → phase`), and
- embeds only each phase's relevant criteria **verbatim**, labelled *"derived from PRD AC-N — source
  of truth"* — **never paraphrased**.

This keeps the criteria present where the executing agent needs them while keeping any drift between
plan and PRD **mechanically detectable** (a diff of the embed against the PRD must be identical).

If a PRD predates the `AC-N` convention and has no IDs, assign `AC-N` in reading order **for use
within the plan only** — never write IDs back to the PRD — and note in the plan that IDs were derived.

---

## Completion gating (what's a gate, what isn't)

- **Acceptance criteria gate completion.** They are binary and evaluated at ship time. A phase is
  complete only when its mapped `AC-N` pass; the feature is complete only when **every** `AC-N`
  passes (a final whole-PRD acceptance gate = UAT / exit criteria).
- **Goals and Success Metrics do NOT gate completion.** They are outcomes measured *after* shipping.
  Putting them in a completion gate is a category error (you could never close the work). They live
  in the plan's non-gating `Post-launch success metrics` section.

---

## Test-case decomposition (plan-side)

The PRD's acceptance criteria are *what* must hold; the plan turns each into the concrete **test
cases** that prove it. This decomposition lives in the **plan**, never in the PRD (the PRD stays
phase-free and implementation-free).

For every `AC-N` mapped to a phase, the plan lists ≥1 test case as **`input → expected observable
outcome`**, tagged with the test file and level (`unit` / `integration` / `e2e` / `agent-browser`):

- Encode **behavioral intent, not test code** — the implementing agent writes the assertions
  test-first (red→green). Naming the cases up front is what makes "done" binary and lets an
  independent verifier check coverage mechanically.
- Encode **cases, not bare criteria** — one `AC-N` typically expands into several cases. Cover the
  happy path **and** boundaries + failure modes (zero / one / many, invalid input, downstream
  errors), not just the success case.
- An `AC-N` is verified — and its phase gate met — when its decomposed cases are green. This is the
  operational form of the gating rule above.

---

## Execution handoff

At execution time the implementing agent must be given **both the plan and the PRD** — don't rely on
optional retrieval. The plan records this in its `Execution inputs:` note, pointing at the canonical
PRD path.
