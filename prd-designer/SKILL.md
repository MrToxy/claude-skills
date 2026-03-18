---
name: prd-designer
description: >-
  Transforms loose ideas or refined concepts into structured PRDs through
  progressive interview, thin E2E slices for risky unknowns, and optional
  codebase exploration. Use when asked to "write a PRD", "create a PRD",
  "design a feature", "flesh out this idea", "turn this into a spec",
  "product requirements", "spec this out", or /prd-designer. Outputs a
  markdown PRD at docs/prds/{name}.md. Optionally creates a GitHub issue
  via gh CLI. Dependencies: gh CLI (optional, for issue creation).
metadata:
  author: joaopetinga
  version: "1.0.0"
---

# PRD Designer

Transform a loose idea or refined concept into a structured PRD through a 5-phase pipeline: intake, probing interview, tracer bullets for risky unknowns, draft, and review.

Reference files:
- `references/prd-template.md` — PRD section structure and guidance
- `references/probing-guide.md` — 7 probing dimensions with example questions

---

## Phase 1 — Intake & Triage

1. Accept input in any form:
   - Inline text in the user's message
   - File path → read the file
   - No input provided → ask: "Describe the idea in a few sentences."

2. Classify maturity:
   - **Loose**: fewer than 5 sentences, or missing at least two of: target user, core goal, key constraint
   - **Refined**: has target user, core goal, and key constraint clearly stated

3. Detect codebase context. Set `codebase_aware = true` if `.git` exists in the working directory AND the user's idea references existing code, a repo, or a specific feature.

4. Confirm understanding before proceeding. Output a 2–3 sentence summary of what you understood and ask: "Is this right, or should I adjust anything before we go deeper?"

---

## Phase 2 — Probing Interview

Read `references/probing-guide.md` for the 7 dimensions and example questions.

**Rules:**
- Probe in order: Problem → Users → Goals → Scope → Constraints → Risks → Prior Art
- Loose ideas: probe all 7 dimensions. Refined ideas: probe only gaps.
- Ask at most 3 questions per message
- Label each message with the dimension(s) being explored: `[Probing: Problem → Users]`
- Stop probing when ALL of the following are true, OR the user says "enough" / "skip" / "done":
  - Problem is clearly stated
  - Primary user is identified
  - At least one measurable goal exists

After the final probing round, summarize findings in a bullet list and ask: "Anything to correct before I move on?"

---

## Phase 3 — Tracer Bullets

Only enter this phase if Phase 2 surfaced risky unknowns — things that are unclear, technically uncertain, or dependency-laden.

**Limit:** 3 unknowns max. 2 research cycles per unknown.

For each unknown:

1. **Explore** — resolve the unknown:
   - If `codebase_aware = true`: use Glob, Grep, and Read to find relevant files, APIs, and patterns
   - If conceptual: reason from context, or use WebSearch if external information is needed

2. **Sketch** — write 3–5 sentences describing a minimal approach to address the unknown

3. **Validate** — present the sketch to the user. Ask: "Does this resolve the uncertainty, or do we need to dig deeper?"
   - If resolved: move to the next unknown
   - If not: do one more cycle, then move on regardless

If no risky unknowns were surfaced in Phase 2, skip this phase entirely and say: "No risky unknowns identified — proceeding to draft."

---

## Phase 4 — Draft PRD

1. Load `references/prd-template.md` for section structure and guidance

2. Determine output path:
   - Target: `docs/prds/{kebab-name}.md` in the current working directory
   - Create `docs/prds/` if it doesn't exist
   - Derive `{kebab-name}` from the feature name (lowercase, hyphens, no special chars)

3. Write the PRD using all information gathered in Phases 1–3:
   - Remove guidance text (italics) from each section before writing
   - Technical Considerations: include codebase findings from Phase 3 if applicable
   - Open Questions: include any unresolved items from probing or tracer bullets

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

3. Suggest next steps:
   - "Enter plan mode to create an implementation plan from this PRD."
   - "Run /review-idea to stress-test the approach before implementation."

4. Finalize. Do not make further changes unless the user asks.

---

## Edge Cases

- **User skips a phase**: respect the skip. Proceed with available information.
- **Codebase search returns nothing relevant**: note it in Technical Considerations as "No relevant existing code found."
- **User provides a file path that doesn't exist**: report the error, ask for the correct path or inline text.
- **Feature is very large (10+ milestones)**: suggest splitting into multiple PRDs. Offer to scope to a single milestone.
- **gh CLI not installed**: skip issue creation, inform the user, and provide the PRD path for manual copy.
