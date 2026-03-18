---
name: research
description: >-
  Deep research on an idea before writing a PRD. Explores existing solutions
  via web search, analyzes competitors, assesses technical feasibility, and
  optionally explores the codebase. Use when asked to "research this idea",
  "investigate this feature", "what already exists for X", "explore solutions
  for X", "do research before the PRD", "look into X", or /research. Outputs a
  structured research document at docs/research/{name}.md. Suggests running
  /prd-designer as the next step. Dependencies: WebSearch (optional).
metadata:
  author: joaopetinga
  version: "1.0.0"
---

# Research

Deep research on an idea before committing to a PRD. Runs 4 dimensions in parallel: existing solutions, competitor analysis, technical feasibility, and codebase exploration.

Reference files:
- `references/research-template.md` — output doc structure
- `references/dimensions.md` — 4 dimensions with guiding questions

---

## Phase 1 — Intake

1. Accept input in any form:
   - Inline text in the user's message
   - File path → read the file
   - No input → ask: "Describe the idea or problem in a few sentences."

2. If the idea is too vague for meaningful research (no discernible problem or domain), ask 2–3 clarifying questions before proceeding. Do not proceed until you have enough to scope the research.

3. Detect codebase context. Set `codebase_aware = true` if `.git` exists in the working directory AND the idea references existing code, a repo, or a specific feature in the project.

4. Confirm understanding. Output a 2–3 sentence summary of the idea and ask: "Is this right, or should I adjust the scope before I start?"

---

## Phase 2 — Research

Load `references/dimensions.md` for guiding questions per dimension.

Run all applicable dimensions. Where dimensions are independent, use sub-agents or parallel tool calls.

**Dimension 1 — Existing Solutions**
Use WebSearch to find products, libraries, open-source projects, and browser/platform APIs that solve or overlap with the problem. Summarize the top 3–5 with a comparison table (name, description, pros, cons, relevance).

**Dimension 2 — Competitor / Market Analysis**
Use WebSearch to examine how similar products in the space handle this. Identify the dominant pattern, what has been tried and failed, and where there is a genuine gap.

**Dimension 3 — Technical Feasibility**
Assess real constraints: API limits, platform restrictions, dependency availability, performance implications. If `codebase_aware = true`, also check how the current stack handles related concerns.

**Dimension 4 — Codebase Exploration** (only if `codebase_aware = true`)
Use Glob, Grep, and Read to map relevant modules, existing patterns, integration points, and potential conflicts. Identify reusable abstractions.

**Degradation rules:**
- If WebSearch is unavailable: note it, skip Dimensions 1–2, proceed with Dimensions 3–4 and reasoning only.
- If not `codebase_aware`: skip Dimension 4 entirely.
- If a dimension returns no useful results: note "No findings" in that section.

---

## Phase 3 — Synthesis

1. Compile all findings into `docs/research/{kebab-name}.md` using `references/research-template.md`:
   - Replace all placeholder text with actual findings
   - Omit the Codebase Findings section if `codebase_aware = false`
   - Populate Key Takeaways with the most actionable insights

2. Create `docs/research/` if it doesn't exist.

3. Derive `{kebab-name}` from the idea/feature name (lowercase, hyphens, no special chars). If ambiguous, ask: "What should I name the research file?"

4. If research reveals the problem is already fully solved by an existing tool: flag it clearly at the top of Key Takeaways. Let the user decide whether to proceed.

---

## Phase 4 — Handoff

1. Present a concise summary of findings — 3–5 bullets covering: what exists, what's feasible, what's novel, what's risky.

2. Ask: "Anything to add or correct before we move on?"

3. Suggest the next step:
   > "Run `/prd-designer` to create a PRD from this research. Reference the research doc: `docs/research/{kebab-name}.md`"

---

## Edge Cases

- **Idea too vague**: ask 2–3 clarifying questions before starting research. Do not proceed with a vague scope.
- **WebSearch unavailable**: note in the doc, skip web dimensions, continue with feasibility + codebase.
- **No codebase**: skip Dimension 4 entirely. Do not mention it in the output doc.
- **Problem already solved**: flag clearly in Key Takeaways. Present options: adopt existing solution, build on top of it, or proceed with a differentiated approach.
- **Codebase search returns nothing relevant**: note "No relevant existing code found" in Codebase Findings.
- **File path provided doesn't exist**: report the error, ask for correct path or inline description.
