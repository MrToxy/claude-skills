# PRD Template

Use this structure for every PRD written by the `prd-designer` skill. Each section includes guidance in italics — remove guidance before finalizing.

**Golden rule:** a PRD captures the **what, who, and why** — and the **acceptance criteria** that prove it's done. It does NOT capture the **how** (architecture, data models, APIs, file-level design, delivery phasing). The how belongs to the planning phase (`/plan`). When in doubt, leave it out and add it to Open Questions instead.

---

# PRD: {Feature Name}

**Status:** Draft | In Review | Approved
**Author:** {author}
**Date:** {YYYY-MM-DD}
**Version:** 1.0

---

## Summary

*Two or three sentences a stranger could read to understand what this is, for whom, and why it matters. Write this last; lead with the problem and the outcome, never the solution.*

---

## Problem ("why")

*One focused paragraph on a single problem — not a feature pitch and not a laundry list. Use the formula:*

> *"{user type} experiences {problem} when {context}, which results in {negative outcome}."*

*Make it user-centric and evidence-based. Do not describe the product yet.*

**Why now / evidence:**
*Bullets proving the problem is real and worth solving now: customer quotes, support tickets, usage data, research links, a closing market window. If you can't point to evidence, flag it as an Open Question — don't assert it.*

-
-

*Solution-bias check before finalizing: is there more than one way to address this problem? If only one way exists, you've smuggled in a solution — rewrite the problem.*

---

## Target Users ("who")

*Identify the primary user first — the one person whose problem this exists to solve. "Everyone" is not an answer. Add secondary/affected users only if they change requirements.*

**Primary user:**
*Persona or job-to-be-done. Prefer a job story when motivation matters more than demographics:*
> *"When {situation}, I want to {motivation}, so that {outcome}."*

**Secondary / affected users:**
-

---

## Goals

*Outcome-shaped, not feature-shaped. Each goal is a measurable change in user or business behavior. Use "Enable {user} to {outcome}" or "Reduce {metric} by {amount}". Avoid "improve"/"enhance" with no target. 3–5 max; name the single most important one.*

-
-
-

---

## Non-Goals

*An explicit list of what this deliberately will NOT do. Pair each with a reason, and distinguish "not now (future)" from "never (out of mission)". This is the highest-leverage device against scope creep.*

- {Excluded thing} — *because {reason}* (not now | never)
- {Excluded thing} — *because {reason}* (not now | never)

---

## User Stories

*From the user's perspective, never the system's. Format: "As a {persona}, I want to {action} so that {outcome}." Cover the primary flow first, then meaningful secondary flows. Keep these about user value — the implementation lives elsewhere.*

**Primary:**
- As a …, I want to … so that …

**Secondary:**
- As a …, I want to … so that …

---

## Acceptance Criteria

*The testable conditions that prove each story is satisfied. Every criterion must be binary (met or not), unambiguous, result-oriented (describe the outcome, not the process), and free of implementation detail. If you can't test it, it's not a criterion.*

*Every criterion gets a stable ID — `AC-1`, `AC-2`, … — numbered once across the whole PRD. IDs are never renumbered or reused: reordering keeps the ID, deleting leaves a gap. This PRD is the single source of truth for these criteria; the planning phase references them by ID and copies a criterion only verbatim and labelled with its source, never paraphrased — so any drift between plan and PRD stays mechanically detectable. Keep IDs stable across revisions.*

*Choose the format per story:*
- *Given/When/Then — for multi-step flows with meaningful before/after state*
- *Checklist of rules — for simple flows, business rules, edge cases*

**Story: {story name}**

- **AC-1** — **Given** {precondition} **When** {action} **Then** {observable result}
- **AC-2** — **Given** {precondition} **When** {action} **Then** {observable result}

*or*

- **AC-3** — {pass/fail condition phrased as an observable outcome}
- **AC-4** — {edge case: what happens when {boundary}}

---

## Success Metrics

*How you'll know — after shipping — that the problem was actually solved. Tie each metric back to a Goal. Include a baseline and a target. Leading indicators are measurable soon after launch; lagging indicators confirm lasting impact.*

| Metric | Tied to goal | Baseline | Target | How measured |
|--------|--------------|----------|--------|--------------|
| | | | | |

---

## Scope

*Draw the perimeter. In-scope = capabilities this release must deliver (outcomes, not designs). Out-of-scope = boundary cases explicitly excluded for this release. Keep both at the level of "what", not "how".*

**In scope:**
-

**Out of scope (this release):**
-

---

## Assumptions & Dependencies

*Assumptions = things expected to be true but not guaranteed (if false, the PRD may change). Dependencies = other teams, services, or work this relies on. Surfacing these early prevents late surprises.*

**Assumptions:**
-

**Dependencies:**
-

---

## Constraints & Feasibility Note

*Short and deliberately thin. Capture only hard constraints that shape what's acceptable: legal/compliance, accessibility, platform limits, a hard deadline, or a known feasibility risk worth flagging. Do NOT design the solution here — no architecture, data models, APIs, or file-level detail. Anything resembling "how to build it" goes to the planning phase.*

-
-

---

## Risks & Mitigations

*What could make this fail to deliver its outcome — adoption, dependency, or impact on existing users. Keep it about product risk; technical-implementation risk is for planning.*

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| | | | |

---

## Open Questions

*Anything unresolved that must be answered before — or during — planning. This is where premature "how" questions and unproven assumptions live. Assign an owner and a target date if known.*

1.
2.
