# Interview Guide

Protocol for Phase 2 of `plan-with-docs`.

## Contents

- Decision Tree Construction (branch derivation per input type + PRD branches)
- Question Rules · Progress Labels · Termination
- Plan Output Format (required sections)
- Interview Summary (internal)

---

## Decision Tree Construction

Build the decision tree by analyzing the input for open or implicit decisions. Branches vary by input type:

**For a PRD-driven plan**, derive branches from:
- How to split scope into vertical slices (tracer-bullet phases)
- Durable architectural decisions implied but not stated (routes, schema shape, key data models, auth approach, third-party boundaries)
- Acceptance criteria per slice
- Sequencing — which slice ships first, what unblocks what
- Trade-offs the PRD doesn't make explicit (e.g. tech choice, perf vs simplicity)
- Risks and unknowns that need a tracer-bullet phase to de-risk

**For an ADR-driven plan**, derive branches from:
- How to implement the architectural decision as a vertical slice
- What pre-existing code/schemas/contracts have to change
- Migration / coexistence strategy if the ADR replaces an existing pattern
- Verification: how do we know the ADR is actually honored once implemented
- Dependencies on other Accepted ADRs (which constrain the slice shape)
- Rollout sequencing if the change is risky

**For an existing plan (refine mode)**, derive branches from:
- Decisions already made that need validation (are the stated choices correct?)
- Gaps where a decision is implied but not stated
- Dependencies between decisions that could create conflicts

**For a raw idea**, derive branches from what must be decided to turn the idea into a plan:
- What problem exactly, for whom
- System boundary (in scope vs out)
- Architecture and system design
- Technology, library, tool selections
- Data model and storage
- API and interface design
- Sequencing and phasing
- Trade-offs explicit or implicit
- External dependencies and integrations
- Success criteria and definition of done

**When a PRD constrains the plan** (any input type — including ADR-driven, refine, or raw idea with a PRD loaded as a constraint), add branches for:
- Mapping every `AC-N` acceptance criterion to the one phase that delivers it (total coverage — no orphaned criteria).
- Decomposing each phase's `AC-N` into concrete test cases (*input → expected outcome*, tagged file + level, incl. boundaries/failures) — behavioral intent, not test code. Prefer deriving from existing test patterns in the codebase.
- Non-goal boundaries — confirm no slice crosses a PRD non-goal.
- A final whole-PRD acceptance gate over all `AC-N`.

Group minor decisions under the nearest parent branch rather than creating shallow top-level branches.

---

## Question Rules

1. **One at a time** — exactly one question per message turn. Never compound questions.
2. **Recommended answer** — always include your recommendation: *"My recommendation: [answer]. Do you agree, or would you go a different direction?"*
3. **Codebase first** — before asking the user, check if the codebase already answers the question. If it does, present the finding and ask the user to confirm or correct. Do not ask the user what the codebase already shows.
4. **ADR first** — if an Accepted ADR already settles the question, cite it instead of asking: *"ADR-0003 commits us to localStorage persistence — so this slice has no server-side migration. Confirm?"*
5. **PRD first** — if a PRD goal or acceptance criterion already settles the question, cite it by ID instead of asking: *"AC-4 requires offline reads to resolve in <200ms — so this slice owns the cache layer. Confirm?"* Don't re-ask what the PRD fixes.
6. **Consequential only** — only ask questions where the answer materially changes the plan.
7. **Specific** — reference a concrete element, decision, or component. No vague "have you thought about X?" questions.

---

## Progress Labels

Every message during the interview starts with a progress label:

```
[Branch N/M — Branch Name (question K)]
```

Example: `[Branch 2/6 — Data Model (question 1)]`

When a new branch is discovered mid-interview: `[Branch 7/7 — New Branch Name (question 1)] ⟵ surfaced from your previous answer`

---

## Termination

End the interview when one of:
- All branches are fully resolved.
- The user signals "move on", "enough", "done", "skip", "proceed", or similar.

If the user skips a branch, mark it as **Open** in the plan output's "Open questions" section.

---

## Plan Output Format

Use `references/plan-template.md` as the default layout (tracer-bullet vertical-slice). Always include these sections regardless of input type:

- `Source` (header line: ADR path / PRD path / refined-from path / "raw idea")
- `Constrained by PRD` + `Execution inputs` (header lines — only when a PRD is loaded as a constraint)
- `Architectural decisions` (citing loaded Accepted ADRs by number)
- `PRD constraints` (goals + total `AC-N → phase` traceability map + non-goals respected — only when a PRD is loaded)
- `Phases` (vertical slices — see template; each embeds its `AC-N` criteria verbatim-labelled, then a `Test cases` block decomposing those `AC-N` into *input → expected outcome* cases tagged with file + level, then a completion gate)
- `Acceptance gate (whole-PRD)` (final phase — checklist of every `AC-N`; only when a PRD is loaded)
- `Post-launch success metrics` (non-gating goals/metrics — only when a PRD is loaded)
- `Proposed PRD scope changes` (non-goal amendments chosen during a `[Non-Goal Conflict]`, empty list if none)
- `Proposed ADRs awaiting acceptance` (paths of Proposed ADRs drafted this session, empty list if none)
- `Glossary terms added` (new CONTEXT.md entries, empty list if none)
- `Open questions` (anything deferred during the interview)

The plan must stand alone — the tribunal in Phase 3 sees only this file, not the interview transcript.

**Existing-plan refinement note**: rewrite the original plan incorporating all decisions from the interview. Do not diff or annotate — produce a clean, complete plan. Preserve original structure where unchanged. Append the required sections above if missing.

---

## Interview Summary (internal)

After producing the plan, keep an internal note of:
- Which decisions were made during the interview vs already in the original input
- Any codebase findings that informed decisions
- Open items the user deferred
- Proposed ADRs drafted and CONTEXT.md terms added

This context may be useful for answering jury questions in Phase 4.
