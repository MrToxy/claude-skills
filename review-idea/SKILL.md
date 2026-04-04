---
name: review-idea
description: >-
  Interview the user relentlessly about a plan or implementation idea until
  reaching shared understanding, resolving each branch of the decision tree.
  For existing plans, refines them. For raw ideas, builds a plan from scratch.
  Then stress-tests the plan through a tribunal of AI personas (Skeptic, Critic,
  Advocate) and produces a verdict with strengths, weaknesses, risks, and action
  items. Use when asked to "review my plan", "review my idea", "challenge my
  design", "stress test this approach", "get feedback on my plan", "flesh out
  this idea", or /review-idea.
metadata:
  author: joaopetinga
  version: "2.0.0"
---

You are the orchestrator of a plan review process. Execute the following 5 phases in order.

---

## Phase 1 — Capture Input

1. Parse the input:
   - If inline text was provided after `/review-idea`, use it.
   - If a file path was provided, read the file.
   - If no input: check `~/.claude/plans/` for an active plan file and read it. If nothing found, ask the user to provide a plan or idea.

2. Determine the input type:
   - **Existing plan** — has concrete decisions, structure, phases, or steps
   - **Raw idea** — a concept or goal without a fleshed-out plan

3. Confirm what was captured, which mode applies, and that the interview phase comes next. Ask the user to proceed.

---

## Phase 2 — Interview

Read `references/interview-guide.md` for the full interview protocol.

1. Analyze the input and build a decision tree — identify all major decision branches. See `references/interview-guide.md` for how to derive branches by input type and how to structure them.

2. Present the decision tree to the user: "I've identified the following decision branches to explore: [list]. Let's walk through each one."

3. Walk each branch **one question at a time**:
   - Before asking the user: check if the question can be answered by exploring the codebase (existing patterns, current implementations, API shapes, etc.). If yes, explore and present the finding — ask the user to confirm or correct rather than posing an open question.
   - If not answerable from the codebase: ask a single, focused question. Include your recommended answer.
   - Show progress on every message: `[Branch N/M — Name (question K)]`
   - Wait for the user's response before asking the next question.

4. When a user's answer reveals a new decision branch not in the original tree, add it and note: "Your answer surfaced a new branch: [X]. Added to the tree."

5. Terminate the interview when:
   - All branches are resolved, **or**
   - The user signals "move on", "enough", "done", or similar.

6. Produce the **Plan** — see `references/interview-guide.md` for the output format:
   - If input was an existing plan: produce a **Revised Plan** incorporating all interview decisions
   - If input was a raw idea: produce a **New Plan** built from the interview decisions

   Present the plan to the user and ask: "Here's the plan as we've defined it. Ready to stress-test it with the tribunal?"

---

## Phase 3 — Tribunal Analysis

1. Read `references/personas.md` to load persona instructions.
2. Spawn 3 persona agents **in parallel** (all `subagent_type: "general-purpose"`). Each agent receives:
   - The plan text produced in Phase 2 (and only that — no interview transcript)
   - Its persona instructions from `references/personas.md`

   Agents must NOT edit any files — read-only analysis only.

   - **Skeptic** (`name: "skeptic"`): questions every assumption, returns structured analysis
   - **Critic** (`name: "critic"`): finds flaws and failure modes, returns risk register
   - **Advocate** (`name: "advocate"`): identifies strengths and opportunities, returns validation

3. Collect all 3 results. Do not proceed until all 3 are complete.

---

## Phase 4 — Jury Synthesis + Resolution

1. Read `references/jury-rules.md`.
2. Spawn a jury agent (`name: "jury"`, `subagent_type: "general-purpose"`) with:
   - The plan text from Phase 2
   - All 3 persona analyses
   - The jury rules from `references/jury-rules.md`
3. The jury produces:
   - **Consensus concerns** — issues raised by 2+ personas
   - **Disagreements** — where personas conflict
   - **Blind spots** — angles no persona covered
   - **Unresolved questions** — questions the plan still doesn't answer

4. For each unresolved question:
   - If answerable from the codebase → explore and resolve without asking the user. Pass findings to the jury via SendMessage.
   - Otherwise → display the question to the user and wait for their answer. Pass their answer to the jury via SendMessage.
   - Repeat until the jury has no more questions.

5. Once all questions are resolved, instruct the jury to produce the final verdict (see Phase 5).

---

## Phase 5 — Verdict

The jury produces the final verdict using the template in `references/jury-rules.md`:

- **Strengths** — bulleted, validated by tribunal consensus
- **Weaknesses** — bulleted, each tagged with severity: `[HIGH]`, `[MEDIUM]`, or `[LOW]`
- **Risks** — table with columns: Risk | Likelihood | Impact | Mitigation
- **Jury Verdict** — 1-2 paragraph narrative assessment. Must end with one classification:
  - `PROCEED` — plan is solid, execute as-is
  - `PROCEED WITH CHANGES` — plan works but specific items must be addressed first
  - `REVISE` — significant gaps or risks require a revised plan before execution
  - `RETHINK` — fundamental flaws; the approach itself needs reconsideration
- **Action Items** — numbered list, prioritized by impact, each concrete and actionable

Display the full verdict inline. Shut down the jury agent by sending it a shutdown message.
