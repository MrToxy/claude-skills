---
name: plan-with-docs
description: >-
  Doc-aware planning skill. Turns a PRD, ADR, existing plan, or raw idea into a
  tracer-bullet implementation plan via a relentless one-question-at-a-time
  interview. Reads accepted ADRs and a PRD together as constraints: ADRs fix
  architectural decisions; the PRD supplies goals, non-goals, and acceptance
  criteria that gate each phase. Drafts Proposed ADRs — asking whether a decision
  is new or supersedes an existing one — and updates CONTEXT.md as terms resolve.
  Optional tribunal stress-test before finalizing. Use when asked to "plan with
  docs", "plan this ADR", "turn this PRD into a plan", "break this down into
  phases", "tracer bullets", "review my plan", "stress test this approach", or
  /plan-with-docs.
metadata:
  author: joaopetinga
  version: "3.2.0"
---

You are the orchestrator of a doc-aware planning process. Execute the following phases in order. Phases 3–5 only run if the user opts into the tribunal at the end of Phase 2.

Reference files:
- `references/interview-guide.md` — decision-tree interview protocol + plan output format
- `references/plan-template.md` — tracer-bullet vertical-slice template (default plan layout)
- `references/prd-format.md` — PRD constraint-extraction contract (goals, non-goals, AC-N criteria) matched to `prd-designer`
- `references/adr-format.md` — fallback ADR spec when project has no `docs/adr/README.md` of its own
- `references/context-format.md` — fallback CONTEXT.md spec when project has no convention
- `references/personas.md` — Skeptic / Critic / Advocate instructions (tribunal phase)
- `references/jury-rules.md` — jury synthesis + verdict template (tribunal phase)

Maintainer evals (not loaded at runtime): `references/evals.md` — trigger tests + end-to-end scenarios; run after changing the skill.

---

## Phase 1 — Capture Input

1. Parse input — collect *every* path and inline string provided, not just the first:
   - If inline text was provided after `/plan-with-docs`, keep it.
   - Read every file path provided. The skill accepts an ADR path and a PRD path **together** (e.g. `/plan-with-docs <prd-path> <adr-path>`), in any order — this is the `prd-designer` handoff.
   - If no input, check `~/.claude/plans/` for an active plan file and read it. If still nothing, ask the user to provide a PRD path, ADR path, plan path, or raw idea.

2. Classify the **driving source** — pick the first that matches (this sets the Phase 2 output path; it does NOT make the other docs mutually exclusive — every recognized doc is still loaded as a constraint in step 4):
   - **ADR-driven**: path matches `**/docs/adr/*.md` OR file frontmatter has a `status:` field. Read the ADR. If its status is `Superseded`, `Rejected`, or `Deprecated`, refuse with a clear error and stop. Accept `Proposed` or `Accepted`. Use the ADR's Context, Decision, and Consequences sections as the source of intent.
   - **PRD-driven**: path matches `**/docs/prds/*.md` OR `**/prd*.md` OR content contains sections like `Problem`, `Users`, `Goals`, `Scope`.
   - **Existing plan**: content has phases, steps, or numbered decisions. Refine mode.
   - **Raw idea**: any other inline text. Build mode.

3. Record `source = { type, path, basename }` for the driving source. The output path in Phase 2 depends on this. A PRD and/or ADR supplied alongside a different driving source are loaded as constraints in step 4, not as the source.

4. **Load project docs (read-only context):**
   - Walk CWD up to the git root.
   - If `CONTEXT.md` is found, read it and set `glossary = <contents>`. Use these terms verbatim during the interview — never paraphrase project-specific vocabulary.
   - If `docs/adr/` is found, list every `*.md`, read each, extract `{ number, title, status, decision, consequences }`. Keep only entries with `status: Accepted`. Skip `Proposed`, `Superseded`, `Rejected`, `Deprecated`.
   - If the project has its own `docs/adr/README.md`, treat it as the canonical ADR format spec. Otherwise fall back to `references/adr-format.md`. Same for `CONTEXT.md` format: prefer the project's convention if present; else `references/context-format.md`.
   - If neither `CONTEXT.md` nor `docs/adr/` exists, set `glossary = null` and `adrs = []`. Create lazily later — only when the first new domain term resolves (for `CONTEXT.md`) or the first new Proposed ADR is warranted (for `docs/adr/`).
   - **Load the PRD as a constraint** (parallel to ADR loading — this is the new dual-constraint step). Resolve the PRD in order: (i) an explicit PRD path argument; (ii) the driving input if it is PRD-driven; (iii) auto-discovery — scan `docs/prds/*.md` from CWD up to git root. If exactly one is found, load it and state so; if several, ask which (or none); if zero, set `prd = null`. Read it read-only (never edit it), and extract per `references/prd-format.md`:
     `prd = { path, goals[], nonGoals[], acceptanceCriteria[] (each { id: "AC-N", story, text }, grouped under Story), successMetrics[], scopeIn[], scopeOut[] }`.
     The PRD is the **single source of truth** for its criteria. `references/prd-format.md` is the canonical contract for how the plan references (`AC-N`), embeds, and gates them — follow it rather than restating it here.

5. Confirm capture. Output a 2–3 sentence summary including the source type, any loaded ADRs, and the PRD constraint:
   > *"Captured: ADR-driven plan for ADR-0003 (localStorage persistence). Also constrained by PRD `docs/prds/offline-mode.md` — 3 goals, 2 non-goals, 7 acceptance criteria (AC-1…AC-7). Loaded Accepted ADRs: 0001 static export, 0002 shadcn-ui, 0004 pt-pt only, 0005 dev-only routes. I'll cite ADRs as we go, keep every phase traceable to AC-IDs, and ask before capturing any new/superseding ADR. Ready to start the interview?"*

---

## Phase 2 — Interview + Plan

Read `references/interview-guide.md` for the full protocol. Summary:

1. **Build the decision tree** from the input. Branch derivation depends on input type — see `references/interview-guide.md` for the four input-type cases.

2. **Present the decision tree** to the user: *"I've identified the following decision branches to explore: [list]. Let's walk through each one."*

3. **Walk each branch one question at a time:**
   - Before asking the user, check if the question can be answered by exploring the codebase (existing patterns, current implementations, API shapes, config). If yes, explore and present the finding — ask the user to confirm or correct.
   - If not answerable from the codebase, ask one focused question. **Always include your recommended answer.** Show progress: `[Branch N/M — Name (question K)]`.
   - Wait for the user's response before asking the next question.

4. **Doc-aware checks during the walk:**
   - **ADR cross-reference.** When a question touches an Accepted-ADR-covered area, cite the ADR in the question: *"ADR-0003 commits us to localStorage persistence — so this phase has no server-side migration step. Confirm?"* Do not re-litigate already-decided ground.
   - **PRD cross-reference.** When a PRD goal or acceptance criterion already settles a question, cite it instead of asking: *"AC-4 requires offline reads to resolve in <200ms — so this slice owns the cache layer. Confirm?"* Don't re-ask what the PRD already fixes.
   - **Acceptance-criteria traceability (total, ID-keyed).** Distribute the PRD's `AC-N` criteria across the plan's phases — every `AC-N` maps to **exactly one** phase. Before finalizing, flag any `AC-N` not owned by a phase (never silently drop). Each phase embeds its mapped criteria using the embedding rule in `references/prd-format.md`.
   - **Phase completion gate.** Each phase may be marked complete **only when its mapped `AC-N` pass**; goals/success metrics never gate completion. (Gating contract: `references/prd-format.md`.)
   - **Test-case decomposition.** As each phase's `AC-N` set settles, decompose them into concrete test cases — *input → expected observable outcome* — tagged with the test file and level (unit / integration / e2e / agent-browser), covering boundaries and failure modes, not just the happy path. Behavioral intent only — **never test code**. Prefer deriving cases by exploring existing test patterns in the codebase; ask the user only for behavior the code can't reveal. (Contract: `references/prd-format.md`.)
   - **Non-goal conflict (halt).** If a user's answer or a proposed slice would expand scope into a PRD non-goal, halt with:
     ```
     [Non-Goal Conflict]
     This would expand scope into a PRD non-goal:
     "<quoted non-goal>"

     Pick one before we continue:
       a) Honor the non-goal — drop this from scope
       b) Amend the PRD's non-goals — you'll edit the PRD outside this skill; I'll record it under "Proposed PRD scope changes" in the plan
       c) I disagree this is a non-goal violation — explain why
     ```
     - (a) → resume. (b) → record under the plan's "Proposed PRD scope changes" section; **never edit the PRD**; resume. (c) → if the reasoning is sound, log a one-line note in "Open questions" and resume.
   - **Glossary challenge.** When the user's term conflicts with `CONTEXT.md`, surface immediately: *"Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"*
   - **Inline CONTEXT.md updates.** When a new domain term resolves during the interview, append it to `CONTEXT.md` using `references/context-format.md` structure. Don't batch — capture as it happens. Only domain-meaningful terms; no implementation details.
   - **Decision Capture (new ADR vs supersede vs skip).** When a surfaced architectural decision passes the **3-condition test** — (1) *hard to reverse*, (2) *surprising without context*, (3) *result of a real trade-off* — do not draft silently; ask the user how to record it. If any condition is missing, skip the ADR (cite the existing pattern/ADR in the plan instead).
     ```
     [Decision Capture]
     This decision — "<one-line>" — is architecturally significant (passes the 3-condition test). How should we record it?
       a) New ADR — no Accepted ADR covers this area. I'll draft docs/adr/NNNN-<title>.md as Proposed.
       b) Supersedes ADR-<NNNN> (<title>) — this changes an accepted decision. I'll draft a new Proposed ADR stating "Supersedes ADR-<NNNN>"; the old ADR is left untouched until you accept the new one.
       c) Don't capture — follows an existing pattern / not ADR-worthy.

     My recommendation: <a|b|c, with reason>.
     ```
     - Recommend **(a)** when no Accepted ADR covers the area; **(b)** when the decision contradicts/replaces an Accepted ADR; **(c)** when it merely follows an established pattern.
     - On **(a)** or **(b)**: write `docs/adr/NNNN-<kebab-title>.md` with `status: Proposed` (project's `docs/adr/README.md` format if present, else `references/adr-format.md`). Keep the body to durable decisions only — exclude ephemeral inventory, consumers/callers, provenance/process, universal baselines, and other projects' internals (see *What to exclude from the body* in `references/adr-format.md`). For (b), the body explains why the prior decision no longer holds and includes a `Supersedes ADR-<NNNN>` line. **Never set `status: Accepted`. Never edit the old ADR** — the user flips the old ADR to `Superseded by NNNN` on acceptance, outside this skill. Resume citing the new Proposed ADR.
     - **ADR conflict is a trigger for this prompt.** If a user's answer directly contradicts an Accepted ADR, surface it and route straight into `[Decision Capture]` with **(b) preselected**:
       ```
       [ADR Conflict → Decision Capture]
       Your answer ("<quote>") conflicts with ADR <NNNN> — <title>: "<one-line summary>".
       This changes an accepted decision, so (b) Supersede applies — unless you'd rather honor the ADR (a) or argue it's not a conflict (c).
       ```

5. **Terminate the interview** when all branches are resolved OR the user signals "move on", "enough", "done", "skip", "proceed".

6. **Produce the Plan.** Use `references/plan-template.md` (tracer-bullet vertical-slice format). Glossary terms verbatim throughout.

   **Output path:**
   - If `source.type === 'adr'` → `docs/plans/<source.basename>.md`. Create `docs/plans/` if missing.
   - Else → `./plans/{kebab-name}.md`. Create `./plans/` if missing.

   **Plan header — first lines under the title:**
   - Source line for the driving source: ADR-driven → `Source ADR: [docs/adr/<basename>](../adr/<basename>)`; PRD-driven → `Source PRD: [path](path)`; Existing-plan refinement → `Refined from: <existing path>`; Raw idea → `Origin: raw idea`.
   - If a PRD is loaded as a constraint but is **not** the driving source, add a separate `Constrained by PRD: [path](path)` line.
   - `Execution inputs:` note — *"Execute with BOTH this plan and the canonical PRD (`<path>`) loaded; the PRD is the source of truth for all `AC-N` criteria."* (Omit if `prd = null`.)

   **Required sections (in addition to the template):**
   - `Architectural decisions` — cite loaded Accepted ADRs by number (e.g. *"Constrained by ADR-0001 (static export), ADR-0003 (localStorage persistence)."*).
   - `PRD constraints` — goals (non-gating intent) + a **total traceability map keyed by ID** (every `AC-N` → the one phase that delivers it) + non-goals explicitly respected. IDs only; no re-authored criteria text here. (Omit if `prd = null`.)
   - **Per phase** (in the template body): each phase embeds its mapped criteria **verbatim, labelled "derived from PRD AC-N — source of truth"**, then a one-line completion gate (*"Phase complete only when the above pass"*).
   - **Per phase — Test cases** (in the template body, directly **after** the phase's acceptance criteria): decompose each mapped `AC-N` into concrete **test cases** — *input → expected observable outcome* — tagged with the test file and level (unit / integration / e2e / agent-browser). Encode behavioral intent, **not** test code, and **not** bare criteria; cover boundaries and failure modes, not just the happy path. Each `AC-N` decomposes into ≥1 case, and the phase gate is met when its cases are green. (Contract: `references/prd-format.md`.)
   - **Final `Acceptance gate (whole-PRD)` phase** — a checklist of **every** `AC-N` (no metrics) with the rule *"Feature complete only when all checked."* Distinct closing phase. (Omit if `prd = null`.)
   - `Post-launch success metrics` (non-gating) — PRD goals/success metrics with baseline+target, labelled *"measured after shipping; NOT a completion gate."* (Omit if `prd = null`.)
   - `Proposed PRD scope changes` — non-goal amendments the user chose during a `[Non-Goal Conflict]` (empty list if none).
   - `Proposed ADRs awaiting acceptance` — list every Proposed ADR drafted during this session with its path (note `Supersedes ADR-NNNN` on superseding entries). Plan execution should not begin until the user reviews and accepts/rejects them.
   - `Glossary terms added` — list new entries appended to `CONTEXT.md` inline during the interview.

7. Present the plan path to the user. Ask: *"Plan written to `<path>`. Want to stress-test it with the tribunal? (yes / no)"*
   - If no → end the skill with a one-line summary.
   - If yes → proceed to Phase 3.

---

## Phase 3 — Tribunal Analysis (optional)

1. Read `references/personas.md`.
2. Spawn 3 persona agents **in parallel** (single message, three `Agent` calls, all `subagent_type: "general-purpose"`). Each receives:
   - The plan text produced in Phase 2 (and ONLY that — no interview transcript)
   - Its persona instructions from `references/personas.md`

   Agents must NOT edit any files — read-only analysis only.

   - **Skeptic** (`name: "skeptic"`) — questions every assumption.
   - **Critic** (`name: "critic"`) — finds flaws and failure modes.
   - **Advocate** (`name: "advocate"`) — identifies strengths and opportunities.

3. Collect all 3 results before proceeding.

---

## Phase 4 — Jury Synthesis + Resolution (optional)

1. Read `references/jury-rules.md`.
2. Spawn a jury agent (`name: "jury"`, `subagent_type: "general-purpose"`) with:
   - The plan text from Phase 2
   - All 3 persona analyses
   - The jury rules from `references/jury-rules.md`
3. The jury produces:
   - **Consensus concerns** (raised by 2+ personas)
   - **Disagreements** (where personas conflict)
   - **Blind spots** (angles no persona covered)
   - **Unresolved questions** (questions the plan still doesn't answer)

4. For each unresolved question:
   - If answerable from the codebase → explore and resolve without asking the user. Send findings to the jury via `SendMessage`.
   - Otherwise → display the question to the user, wait for the answer, send it to the jury via `SendMessage`.
   - Repeat until the jury has no more questions.

5. Once questions are resolved, instruct the jury to produce the final verdict.

---

## Phase 5 — Verdict (optional)

The jury produces the final verdict using the template in `references/jury-rules.md`:

- **Strengths** — bulleted, validated by tribunal consensus.
- **Weaknesses** — bulleted, each tagged `[HIGH]` / `[MEDIUM]` / `[LOW]`.
- **Risks** — table: Risk | Likelihood | Impact | Mitigation.
- **Jury Verdict** — 1–2 paragraph narrative. Must end with one classification:
  - `PROCEED` — plan is solid, execute as-is.
  - `PROCEED WITH CHANGES` — plan works but specific items must be addressed first.
  - `REVISE` — significant gaps require a revised plan before execution.
  - `RETHINK` — fundamental flaws; the approach itself needs reconsideration.
- **Action Items** — numbered, prioritized by impact.

Display the full verdict inline. Shut down the jury agent.

---

## Edge cases

- **CONTEXT.md exists but is empty/malformed** — treat as missing, continue silently.
- **ADR lacks a clear `status` field** — assume `Accepted`. Do not skip on ambiguity.
- **Project's `docs/adr/README.md` exists but differs in format from `references/adr-format.md`** — honor the project's convention. Never overwrite it.
- **User insists "no conflict" (option c) and you agree after re-reading the ADR** — log a one-line note in the plan's `Open questions` section and continue.
- **Multiple PRDs found during auto-discovery** — ask which one constrains this plan (or none); never load several silently.
- **PRD present but the driving source is an ADR / plan / raw idea** — load both: the PRD as a constraint (goals/non-goals/AC-N) and the ADR(s) as architectural constraints. Dual constraint is the normal case.
- **An `AC-N` is not owned by any phase** — flag it before finalizing; never silently drop a criterion. Either add a phase/slice that delivers it or record why it's out of this plan's scope under `Open questions`.
- **PRD criteria lack `AC-N` IDs** (older/hand-written PRD) — assign stable `AC-N` IDs in reading order **for use within the plan only**; never write them back to the PRD. Note in the plan that IDs were derived.
- **PRD has no Non-Goals/Out-of-scope section** — treat non-goals as empty; the `[Non-Goal Conflict]` guard simply never triggers.
- **Raw-idea input with no codebase context** — explore is a no-op; rely fully on user answers.
- **User skips the tribunal** — end after Phase 2. Don't re-prompt.
