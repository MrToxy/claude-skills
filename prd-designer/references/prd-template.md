# PRD Template

Use this structure for every PRD written by the `prd-designer` skill. Each section includes guidance in italics — remove guidance before finalizing.

---

# PRD: {Feature Name}

**Status:** Draft | In Review | Approved
**Author:** {author}
**Date:** {YYYY-MM-DD}
**Version:** 1.0

---

## Problem Statement

*One paragraph. Describe the pain, gap, or opportunity without prescribing a solution. Answer: what breaks today without this feature? Who is affected and how often?*

---

## Goals

*Bullet list. Each goal must be specific and verifiable. Use "Enable X to do Y" or "Reduce X by Y%". Avoid vague verbs like "improve" or "enhance" without a measurable target.*

-
-
-

---

## Non-Goals

*Explicitly list what this feature will NOT do. Non-goals prevent scope creep and align stakeholders early.*

-
-

---

## User Stories

*Format: "As a {persona}, I want to {action} so that {outcome}." Cover the primary flow first, then edge cases.*

**Primary:**
- As a …, I want to … so that …

**Secondary:**
- As a …, I want to … so that …

---

## Requirements

### Functional

*Numbered list. Each requirement must be independently testable. Use "The system shall…" or "The feature must…".*

1.
2.
3.

### Non-Functional

*Address performance, security, accessibility, reliability, and scalability as relevant. Include thresholds (e.g., "p99 latency < 200ms").*

- **Performance:**
- **Security:**
- **Accessibility:**
- **Reliability:**

---

## Technical Considerations

*Describe relevant architecture decisions, integration points, or constraints. If codebase-aware, include specific files, modules, or APIs discovered during research. Flag unknowns that need proof-of-concept work.*

-
-

---

## Scope & Milestones

*Break delivery into phases. Each milestone should be independently shippable or testable. Include what's in/out per phase.*

| Milestone | Scope | Notes |
|-----------|-------|-------|
| M1 | | |
| M2 | | |

---

## Success Metrics

*How will you know this feature succeeded? Tie metrics to the Goals section. Include leading indicators (measurable before launch) and lagging indicators (measurable after).*

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|--------------------|
| | | | |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| | | | |

---

## Open Questions

*Questions that must be answered before implementation begins. Assign an owner and a target resolution date if known.*

1.
2.
