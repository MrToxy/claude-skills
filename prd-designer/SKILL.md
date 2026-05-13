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

2. Detect research doc. Set `has_research = true` if:
   - The user explicitly provides a path like `docs/research/{name}.md` → read it
   - OR `docs/research/` exists → list files, ask: "Found research docs: [list]. Should I use any of these?"
   - If `has_research = true`: read the research doc and extract key findings (existing solutions, feasibility, risks, codebase findings).

2.5. Detect project context. Walk from CWD up to the git root (stop at `.git` or filesystem root):
   - If `CONTEXT.md` is found: read it. Set `glossary = <contents>`. Use these terms verbatim during the interview — do not paraphrase project-specific vocabulary.
   - If `docs/adr/` is found: list all `*.md` files, read each, and extract `{number, title, status, decision}`. Set `adrs = [...]`. Skip ADRs whose status is `Superseded`, `Rejected`, or `Deprecated`.
   - If neither exists: set `glossary = null`, `adrs = []`, continue silently. No warning needed.

   If `adrs` is non-empty, list them in your Phase-1 confirmation summary so the user sees what's loaded:
   > "Loaded ADRs that may constrain this work: 0001 Event-sourced orders, 0002 Postgres for write model. I'll flag conflicts as we go."

3. Classify maturity:
   - **Loose**: fewer than 5 sentences, or missing at least two of: target user, core goal, key constraint
   - **Refined**: has target user, core goal, and key constraint clearly stated

4. Detect codebase context. Set `codebase_aware = true` if `.git` exists in the working directory AND the user's idea references existing code, a repo, or a specific feature.

5. Confirm understanding before proceeding. Output a 2–3 sentence summary of what you understood and ask: "Is this right, or should I adjust anything before we go deeper?"

---

## Phase 2 — Probing Interview

Read `references/probing-guide.md` for the 7 dimensions and example questions.

**Interview discipline — relentless, one question at a time:**

Walk down each branch of the design tree, resolving every question before moving on. No cap on turns. No cap on depth. Ask one focused question per message, wait for the user's answer, then ask the next. Always include your recommended answer with each question so the user has something concrete to react to. Label each message with the dimension being explored: `[Probing: Problem (question K)]`.

Probe in order: Problem → Users → Goals → Scope → Constraints → Risks → Prior Art. Loose ideas: walk all 7 dimensions. Refined ideas: walk only the dimensions with real gaps. If `has_research = true`, skip dimensions already covered by the research doc and state it explicitly: "Skipping [dimension] — already covered in research doc." (Prior Art covered → skip 7. Technical Feasibility + Risks covered → skip 5 and 6.)

**Doc-aware checks during the walk:**
- If `adrs` is non-empty, before each new question, scan the user's most recent answer for ADR conflicts. A conflict is any proposed approach, technology, or scope item that contradicts an accepted ADR's decision.
  - **On conflict: halt the interview.** Do not ask the next probing question. Output:
    ```
    [ADR Conflict]
    Your answer ("<quote>") conflicts with ADR <NNNN> — <title>:
    "<one-line summary of the ADR decision>"

    Pick one before we continue:
      a) Change scope to honor the ADR
      b) Supersede the ADR (requires writing a new ADR — out of
         scope for this PRD; do separately first)
      c) I disagree this is a conflict — explain why
    ```
  - Resume probing only after the user picks (a) or convinces you of (c). If (b), stop the PRD and tell the user to handle the ADR change first.
- When a question touches an Accepted-ADR-covered area, cite the ADR in the question itself. Do not re-litigate already-decided ground.
- When the user's term conflicts with `CONTEXT.md`, surface it immediately and reconcile before moving on.

**Termination:**

Terminate the interview only when every dimension in scope has been walked to resolution, OR the user explicitly says "enough" / "skip" / "done" / "move on" / "proceed". The minimum bar for "resolved" is:
- Problem clearly stated
- Primary user identified
- At least one measurable goal exists
- No question raised during probing is left dangling

If a question genuinely cannot be answered without information the user does not have (external dependency, missing stakeholder input, data the user has not gathered), stop the interview and tell the user what to go find out. Do not draft the PRD around the gap. Resume the interview when they return with the answer.

After the final probing round, summarize findings in a bullet list and ask: "Anything to correct before I move on?"

---

## Phase 3 — Tracer Bullets

Only enter this phase if Phase 2 surfaced risky unknowns — things that are unclear, technically uncertain, or dependency-laden. Resolve every unknown surfaced. No cap on the number of unknowns. No cap on the number of cycles per unknown — keep digging until the user confirms the uncertainty is resolved.

For each unknown:

1. **Explore** — resolve the unknown:
   - If `codebase_aware = true`: use Glob, Grep, and Read to find relevant files, APIs, and patterns
   - If conceptual: reason from context, or use WebSearch if external information is needed
   - If `adrs` is non-empty, cross-check the sketched approach against each loaded ADR before presenting to the user. If the sketch conflicts, halt with the same `[ADR Conflict]` block from Phase 2.

2. **Sketch** — write 3–5 sentences describing a minimal approach to address the unknown.

3. **Validate** — present the sketch to the user. Ask: "Does this resolve the uncertainty, or do we need to dig deeper?"
   - If resolved: move to the next unknown.
   - If not: run another cycle. Repeat until the user confirms resolution, or until the unknown depends on information the user does not have — in which case stop the interview, tell the user what they need to gather, and resume when they return with it. Do not draft the PRD around an unresolved unknown.

If no risky unknowns were surfaced in Phase 2, skip this phase entirely and say: "No risky unknowns identified — proceeding to draft."

---

## Phase 4 — Draft PRD

1. Load `references/prd-template.md` for section structure and guidance

2. Determine output path:
   - Target: `docs/prds/{kebab-name}.md` in the current working directory
   - Create `docs/prds/` if it doesn't exist
   - Derive `{kebab-name}` from the feature name (lowercase, hyphens, no special chars)

3. Write the PRD using all information gathered in Phases 1–3:
   - Use glossary terms from `CONTEXT.md` verbatim throughout. Do not substitute synonyms for project-specific vocabulary.
   - Remove guidance text (italics) from each section before writing
   - If `has_research = true`:
     - Add a "Research Reference" line at the top: `> Research: [docs/research/{name}.md](docs/research/{name}.md)`
     - Technical Considerations: pull from research doc's Technical Feasibility + Codebase Findings sections
     - Risks table: seed with risks identified in the research doc
   - Technical Considerations: include codebase findings from Phase 3 if applicable (and not already pulled from research)
   - **Resolved Questions** (formerly Open Questions): the PRD ships with zero open questions. Any question raised during Phases 2–3 must already be resolved before drafting begins (see Phase 2 termination + Phase 3 validate rules). Use this section as a historical record: list each non-trivial question that came up during the interview alongside the resolution the user converged on. If nothing notable came up, write "None." Do not park unresolved items here.

4. After writing, display the file path and a one-sentence summary of what was written

**Error handling:**
- If `docs/` directory creation fails (permissions), write to the working directory root and warn the user
- If the feature name cannot be derived, ask: "What should I name the PRD file?"

---

## Phase 5 — Review & Handoff

1. Ask the user to review the PRD. Iterate until the user explicitly signs off — no cap on revision rounds. Same relentless discipline as Phase 2 and Phase 3:
   - Accept targeted feedback ("expand the risks section", "add a metric for X")
   - Apply changes, re-save the file, confirm what changed
   - Re-ask for review after each round; do not stop until the user says they are done

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

- **User says "enough" / "skip" / "done" mid-interview**: respect the skip and stop probing. Drafting still requires the Phase 2 minimum bar (problem, primary user, at least one measurable goal, no dangling probing questions). If the skip leaves the bar unmet, tell the user what's missing and ask whether to continue the interview or pause until they're ready. Do not paper over gaps.
- **Codebase search returns nothing relevant**: note it in Technical Considerations as "No relevant existing code found."
- **User provides a file path that doesn't exist**: report the error, ask for the correct path or inline text.
- **Feature is very large (10+ milestones)**: suggest splitting into multiple PRDs. Offer to scope to a single milestone.
- **gh CLI not installed**: skip issue creation, inform the user, and provide the PRD path for manual copy.
- **CONTEXT.md exists but is empty or malformed**: treat as missing, continue silently.
- **ADR file lacks a clear status field**: assume `Accepted`. Do not skip on ambiguity.
- **User insists their answer doesn't conflict (option c) and you agree after re-reading the ADR**: log a one-line note in the PRD's Resolved Questions section ("Confirmed during interview: <answer> aligns with ADR <NNNN> — <reasoning>") and continue.
