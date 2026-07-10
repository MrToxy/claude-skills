---
name: prd-designer
description: >-
  Transforms loose ideas or refined concepts into structured PRDs that capture
  the what, who, and why — problem, target users, goals, non-goals, and testable
  acceptance criteria — while deliberately deferring the how (architecture, data
  models, APIs, delivery phasing) to the planning phase. Works through a
  progressive interview, light de-risking of risky assumptions, and optional
  codebase exploration. Use when asked to "write a PRD", "create a PRD",
  "design a feature", "flesh out this idea", "turn this into a spec",
  "product requirements", "spec this out", or /prd-designer. Outputs a
  markdown PRD at docs/prds/{name}.md. Optionally creates a GitHub issue
  via gh CLI. Dependencies: gh CLI (optional, for issue creation).
metadata:
  author: joaopetinga
  version: "2.2.0"
---

# PRD Designer

Transform a loose idea or refined concept into a structured PRD through a 5-phase pipeline: intake, probing interview, de-risking risky assumptions, draft, and review.

Reference files:
- `references/prd-template.md` — PRD section structure and guidance
- `references/probing-guide.md` — 8 probing dimensions with example questions

---

## What a PRD Is — and Is Not

This is the core principle that governs every phase. Enforce it relentlessly.

A PRD captures:
- **Why** — the problem, with evidence it's real and worth solving now
- **Who** — the primary user (one person, not "everyone") and affected users
- **What** — goals (outcomes), non-goals, scope, and user stories
- **Done** — testable, binary acceptance criteria and success metrics

A PRD does **not** capture the **how**: architecture, tech stack, data models, APIs, file-level design, algorithms, or delivery phasing/milestones. That belongs to the planning phase (`/plan`), run after the PRD is approved.

The PRD draws the perimeter of the solution space; planning and design fill it in. When the user (or your own draft) drifts into implementation, acknowledge the input, park it for planning, and add it to Open Questions instead of baking it into the spec. Goals must be outcome-shaped, not feature-shaped. Every non-goal carries a reason. Every acceptance criterion must be something a tester could mark pass/fail without judgement.

**Acceptance criteria are the handoff contract to planning.** Each one carries a stable ID (`AC-1`, `AC-2`, …) and this PRD stays their single source of truth. The downstream planning phase references criteria by ID rather than copying them, embedding only each phase's relevant criteria verbatim and labelled with their source — so the criteria are present where the agent needs them, yet drift between plan and PRD stays mechanically detectable. This is why the IDs must be stable and the criteria must be testable: they double as the implementation's verification harness.

---

## Phase 1 — Intake & Triage

1. Accept input in any form:
   - Inline text in the user's message
   - File path → read the file
   - No input provided → ask: "Describe the idea in a few sentences."

2. Detect research doc. Set `has_research = true` if:
   - The user explicitly provides a path like `docs/research/{name}.md` → read it
   - OR `docs/research/` exists → list files, ask: "Found research docs: [list]. Should I use any of these?"
   - If `has_research = true`: read the research doc and extract key findings (existing solutions, feasibility, risks, codebase findings).

3. Classify maturity:
   - **Loose**: fewer than 5 sentences, or missing at least two of: target user, core goal, key constraint
   - **Refined**: has target user, core goal, and key constraint clearly stated

4. Detect codebase context. Set `codebase_aware = true` if `.git` exists in the working directory AND the user's idea references existing code, a repo, or a specific feature.

5. Confirm understanding before proceeding. Output a 2–3 sentence summary of what you understood and ask: "Is this right, or should I adjust anything before we go deeper?"

---

## Phase 2 — Probing Interview

Read `references/probing-guide.md` for the 8 dimensions and example questions.

**Rules:**
- Probe in order: Problem → Users → Goals → Non-Goals → Acceptance Criteria → Scope → Constraints & Dependencies → Risks & Prior Art
- Loose ideas: probe all 8 dimensions. Refined ideas: probe only gaps.
- Keep every question about the what/who/why. If the user volunteers implementation detail, park it for planning and steer back — do not chase the how.
- If `has_research = true`: skip dimensions already covered by the research doc:
  - Prior Art is covered → skip it within dimension 8
  - Risks + external constraints covered → skip dimension 7 and the risks half of 8
  - State explicitly: "Skipping [dimension] — already covered in research doc."
  - Only probe remaining gaps (typically: Users, Goals, Non-Goals, Acceptance Criteria)
- Ask at most 3 questions per message
- Label each message with the dimension(s) being explored: `[Probing: Problem → Users]`
- Stop probing when ALL of the following are true, OR the user says "enough" / "skip" / "done":
  - Problem is clearly stated, with at least one piece of evidence (or an Open Question if none)
  - Primary user is identified
  - At least one measurable, outcome-shaped goal exists
  - At least one testable acceptance criterion exists for the primary story

After the final probing round, summarize findings in a bullet list and ask: "Anything to correct before I move on?"

---

## Phase 3 — De-Risk Assumptions

Only enter this phase if Phase 2 surfaced risky assumptions — claims the PRD depends on that, if false, would change the problem, the users, the scope, or whether the feature is worth building at all.

The goal here is to validate the **why/what**, not to design the **how**. Do not produce implementation sketches, architecture, or solution approaches — feasibility and design are the planning phase's job. A genuine feasibility doubt is captured as an Open Question, not resolved here.

**Limit:** 3 assumptions max. 2 cycles per assumption.

For each risky assumption:

1. **Investigate** — gather evidence for or against it:
   - Is the problem real and frequent? Look for the evidence the user cited (or its absence).
   - Is the primary user the right one? Is the expected outcome plausible?
   - If `codebase_aware = true`: use Glob, Grep, and Read only to confirm whether the problem/constraint actually exists in the code — not to design a solution.
   - If conceptual or external: reason from context, or use WebSearch.

2. **State the finding** — write 2–4 sentences: does the evidence support the assumption, weaken it, or leave it open?

3. **Validate** — present the finding to the user. Ask: "Does this hold up the assumption, or do we need to dig deeper?"
   - If supported: move on.
   - If weakened: adjust the relevant Phase 2 finding (problem, users, scope) before drafting.
   - If still open: capture it as an Open Question and move on — do not invent a resolution.

If no risky assumptions were surfaced in Phase 2, skip this phase entirely and say: "No risky assumptions identified — proceeding to draft."

---

## Phase 4 — Draft PRD

1. Load `references/prd-template.md` for section structure and guidance

2. Determine output path:
   - Target: `docs/prds/{kebab-name}.md` in the current working directory
   - Create `docs/prds/` if it doesn't exist
   - Derive `{kebab-name}` from the feature name (lowercase, hyphens, no special chars)

3. Write the PRD using all information gathered in Phases 1–3:
   - Remove guidance text (italics) from each section before writing
   - Keep the draft on the what/who/why. Do not write architecture, data models, APIs, or delivery milestones into any section. If such detail came up, route it to Open Questions for the planning phase.
   - Goals must be outcome-shaped; every non-goal must carry a reason; every acceptance criterion must be testable and binary; every success metric must tie to a goal.
   - Assign each acceptance criterion a stable ID (`AC-1`, `AC-2`, … — monotonic across the whole PRD, never renumbered or reused). These are the traceability anchors the planning phase links to; on a revision, keep existing IDs fixed and only append new ones.
   - If `has_research = true`:
     - Add a "Research Reference" line at the top: `> Research: [docs/research/{name}.md](docs/research/{name}.md)`
     - Problem evidence ("why now"): pull supporting findings from the research doc
     - Constraints & Feasibility note: pull only hard constraints/known feasibility risks (keep it thin); deeper technical detail stays out
     - Risks table: seed with risks identified in the research doc
   - Constraints & Feasibility note: record any hard constraint confirmed in Phase 3 (keep it short; no solution design)
   - Open Questions: include any unresolved items from probing, de-risking, or the research doc

4. After writing, display the file path and a one-sentence summary of what was written

**Error handling:**
- If `docs/` directory creation fails (permissions), write to the working directory root and warn the user
- If the feature name cannot be derived, ask: "What should I name the PRD file?"

---

## Phase 5 — Review & Handoff

1. Ask the user to review the PRD. Allow up to 3 revision rounds:
   - Accept targeted feedback ("expand the risks section", "add a metric for X")
   - Apply changes, re-save the file, confirm what changed

2. If the user requests a GitHub issue:
   - Check that `gh` is authenticated: run `gh auth status`
   - If not authenticated: instruct the user to run `gh auth login` and skip issue creation
   - If authenticated: run `gh issue create --title "{Feature Name}" --body "$(cat docs/prds/{kebab-name}.md)"`
   - Return the issue URL

3. Hand off to planning. Show the user the exact command, with `{kebab-name}` replaced by the real saved filename, so it's copy-pasteable:
   - `/plan-with-docs docs/prds/{kebab-name}.md` — `plan-with-docs` reads this PRD read-only as a constraint, distributes its `AC-N` criteria across the plan's phases, and gates each phase on them.
   - If accepted ADRs constrain this work, pass them alongside the PRD (any order): `/plan-with-docs docs/prds/{kebab-name}.md <adr-path>`.
   - The plan references criteria by their AC-IDs and embeds each phase's criteria verbatim, labelled with their source — this PRD stays the single source of truth; criteria are never re-authored or paraphrased.
   - At execution, give the implementing agent BOTH the plan and this PRD — don't rely on optional retrieval.
   - Optionally, run /review-idea to stress-test the approach before implementation.

4. Finalize. Do not make further changes unless the user asks.

---

## Edge Cases

- **User skips a phase**: respect the skip. Proceed with available information.
- **Codebase search returns nothing relevant**: don't force it into the PRD; if it matters, note it as an Open Question for the planning phase.
- **User provides a file path that doesn't exist**: report the error, ask for the correct path or inline text.
- **Feature is very large (many goals / unrelated problems)**: suggest splitting into multiple PRDs, one problem each. Offer to scope this PRD to the single most important problem.
- **gh CLI not installed**: skip issue creation, inform the user, and provide the PRD path for manual copy.
