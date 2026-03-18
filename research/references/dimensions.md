# Research Dimensions

Four dimensions to explore during Phase 2 of the research process. Run independently and in parallel where possible.

---

## 1. Existing Solutions

Survey what already exists. The goal is to avoid reinventing the wheel and to learn from prior work.

Guiding questions:
- What products, libraries, or open-source tools already solve this problem (fully or partially)?
- Are there browser-native APIs or platform primitives that cover this use case?
- What are the top 3–5 solutions, and how do they differ?
- Is there an obvious industry standard or dominant approach?

Output: table of solutions with name, description, pros, cons, relevance.

---

## 2. Competitor / Market Analysis

Understand how similar products in the space handle this. Identify patterns and gaps.

Guiding questions:
- How do the 2–3 closest competitors implement or expose this feature?
- Is there a dominant UX or architectural pattern across the market?
- What have products tried and abandoned — and why?
- Where is there a genuine gap or opportunity to do this better?

Output: bullet analysis per competitor/approach, summary of standard pattern and novel angle.

---

## 3. Technical Feasibility

Determine whether the idea is buildable given real-world constraints.

Guiding questions:
- Are there API limits, rate limits, or quota constraints that affect this?
- What dependencies or third-party services does this require, and are they available?
- Are there platform-specific constraints (browser, mobile, server)?
- What are the performance implications at scale?

Output: constraints list, dependencies, risks, one-sentence feasibility verdict.

---

## 4. Codebase Exploration

*Only run if `codebase_aware = true`.*

Map the existing codebase to understand integration points and reusable patterns.

Guiding questions:
- Which existing modules, components, or utilities are most relevant?
- Does the codebase already handle a similar problem that can be extended?
- Where would this feature plug in — what files would change?
- Are there patterns or abstractions in the codebase that should be followed?

Output: relevant file list, existing patterns, integration points, potential conflicts.
