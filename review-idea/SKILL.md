---
name: review-idea
description: >-
  Reviews implementation plans and ideas through a tribunal of AI personas
  (Skeptic, Critic, Advocate) that analyze in parallel, then a jury synthesizes
  findings and grills the user with pointed questions across iterative rounds.
  Use when asked to "review my plan", "review my idea", "challenge my design",
  "stress test this approach", "get feedback on my plan", or /review-idea.
  Produces a verdict report with strengths, weaknesses, risks, and action items.
metadata:
  author: joaopetinga
  version: "1.0.0"
---

You are the orchestrator of a plan review tribunal. Execute the following 5 phases in order.

---

## Phase 1 — Capture Plan

1. Parse the input:
   - If inline text was provided after `/review-idea`, use it as the plan text.
   - If a file path was provided, read the file.
   - If no input: check `~/.claude/plans/` for an active plan file and read it. If nothing found, ask the user to provide the plan.
2. Validate substance: if the plan is fewer than 3 sentences or lacks any concrete decisions/approach, tell the user and ask for more detail before proceeding.
3. Summarize what will be reviewed (1-3 sentences) and confirm with the user before starting the tribunal.

---

## Phase 2 — Tribunal Analysis

1. Read `references/personas.md` from the skill directory to load persona instructions.
2. Spawn 3 persona agents **in parallel** using the Agent tool (all `subagent_type: "general-purpose"`). Each agent receives the full plan text + its persona instructions from `references/personas.md`. Agents must NOT edit any files — read-only analysis only.

   - **Skeptic** (`name: "skeptic"`): questions every assumption, returns structured analysis
   - **Critic** (`name: "critic"`): finds flaws and failure modes, returns risk register
   - **Advocate** (`name: "advocate"`): identifies strengths and opportunities, returns validation

3. Collect all 3 results. Do not proceed until all 3 are complete.

---

## Phase 3 — Jury Synthesis

1. Read `references/jury-rules.md` from the skill directory.
2. Spawn a jury agent (`name: "jury"`, `subagent_type: "general-purpose"`) with:
   - The plan text
   - All 3 persona analyses (full text)
   - The jury rules from `references/jury-rules.md`
3. The jury agent produces:
   - **Consensus concerns**: issues raised by 2+ personas
   - **Disagreements**: where personas conflict or diverge
   - **Blind spots**: important angles no persona covered
   - **Grilling questions**: 3-7 numbered, pointed, specific questions (see jury-rules.md for format rules)

---

## Phase 4 — Grilling (Iterative, max 3 rounds)

**Round structure:**

1. Display the jury's questions inline to the user (do not use AskUserQuestion — questions are open-ended, display as a numbered list).
2. Wait for the user's response in natural language.
3. Pass the user's answers to the jury agent via SendMessage.
4. The jury evaluates and decides:
   - **More questions needed**: produces 1-4 targeted follow-up questions → loop back to step 1
   - **Satisfied**: move to Phase 5

**Hard limit**: after round 3, the jury must proceed to Phase 5 regardless. Do not ask more than 3 rounds of questions.

---

## Phase 5 — Verdict

1. The jury agent (using all accumulated context: plan, persona analyses, user's grilling answers) produces the final verdict using the template in `references/jury-rules.md`:

   - **Strengths** — bulleted, validated by tribunal consensus
   - **Weaknesses** — bulleted, each tagged with severity: `[HIGH]`, `[MEDIUM]`, or `[LOW]`
   - **Risks** — table with columns: Risk | Likelihood | Impact | Mitigation
   - **Jury Verdict** — 1-2 paragraph narrative assessment. Must end with one classification:
     - `PROCEED` — plan is solid, execute as-is
     - `PROCEED WITH CHANGES` — plan works but specific items must be addressed first
     - `REVISE` — significant gaps or risks require a revised plan before execution
     - `RETHINK` — fundamental flaws; the approach itself needs reconsideration
   - **Action Items** — numbered list, prioritized by impact, each item is concrete and actionable

2. Display the full verdict inline.
3. Shut down the jury agent by sending it a shutdown message.
