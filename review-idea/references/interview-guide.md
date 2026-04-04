# Interview Guide

This file defines the protocol for Phase 2 of the review-idea skill.

---

## Decision Tree Construction

Build the decision tree by analyzing the input for open or implicit decisions. The branches vary by input type:

**For an existing plan**, derive branches from:
- Decisions already made that need validation (are the stated choices correct?)
- Gaps where a decision is implied but not stated
- Dependencies between decisions that could create conflicts

**For a raw idea**, derive branches from what must be decided to turn the idea into a plan:
- What problem exactly is being solved and for whom?
- What is the system boundary (what's in scope vs. out)?
- Architecture and system design choices
- Technology, library, and tool selections
- Data model and storage choices
- API and interface design
- Sequencing and phasing (what gets built first?)
- Trade-offs explicitly or implicitly made
- External dependencies and integrations
- Success criteria and definition of done

Group minor decisions under the nearest parent branch rather than creating shallow top-level branches.

---

## Question Rules

1. **One at a time** — ask exactly one question per message turn. Never ask a compound question.
2. **Recommended answer** — always include your recommendation: "My recommendation: [answer]. Do you agree, or would you go a different direction?"
3. **Codebase first** — before asking the user, check if the codebase already answers the question (existing implementations, patterns, API shapes, config). If it does, present the finding and ask the user to confirm or correct. Do not ask the user what the codebase already shows.
4. **Consequential only** — only ask questions where the answer would materially change the plan. Do not ask questions that are merely interesting or clarifying.
5. **Specific** — reference a concrete element, decision, or component. No vague "have you thought about X?" questions.

---

## Progress Labels

Every message during the interview must start with a progress label:

```
[Branch N/M — Branch Name (question K)]
```

Example: `[Branch 2/6 — Data Model (question 1)]`

When a new branch is discovered mid-interview: `[Branch 7/7 — New Branch Name (question 1)] ⟵ surfaced from your previous answer`

---

## Termination

End the interview when one of:
- All branches are fully resolved (every open decision has a confirmed answer)
- The user signals "move on", "enough", "done", "skip", "proceed", or similar

If the user skips a branch, mark it as **Open** in the plan output.

---

## Plan Output Format

At the end of the interview, produce a standalone plan document. This is the only artifact the tribunal will see — it must stand alone without reference to the interview.

**If input was an existing plan → Revised Plan:**

Rewrite the original plan incorporating all decisions made in the interview. Do not diff or annotate — produce a clean, complete plan. Preserve the original structure where unchanged.

**If input was a raw idea → New Plan:**

Produce a structured plan document with:

```
# [Plan Title]

## Overview
[2-4 sentence summary of what is being built, why, and for whom]

## Goals
- [concrete, measurable goal]
- ...

## Non-Goals
- [explicitly out of scope]
- ...

## Approach
[The chosen architecture/design/approach, with rationale for key decisions]

## Phases / Steps
### Phase 1 — [Name]
[What gets built, in what order, and why]

### Phase 2 — [Name]
...

## Key Decisions
- **[Decision]**: [Choice made] — [1-sentence rationale]
- ...

## Open Items
- [Decisions left unresolved during the interview, if any]

## Dependencies
- [External systems, services, or teams this plan depends on]
```

---

## Interview Summary (internal)

After producing the plan, keep an internal note of:
- Which decisions were made during the interview vs. already in the original input
- Any codebase findings that informed decisions
- Open items the user deferred

This context may be useful for answering jury questions in Phase 4.
