# ADR Format (bundled fallback)

This file is the fallback ADR spec for `plan-with-docs`. Use it only when the current project has no `docs/adr/README.md` of its own — that file always wins.

Trimmed from `credito-habitacao-journey/docs/adr/README.md`. Covers the four things the skill needs to draft a valid Proposed ADR: frontmatter, format, the 3-condition test, and when NOT to write one.

## Contents

- Naming · Frontmatter · Format
- When to write an ADR (3-condition test) · When NOT to write one
- Superseding an existing ADR

---

## Naming

- Incremental numbering: `0001`, `0002`, …
- Kebab-case titles.
- File pattern: `NNNN-short-title.md`.

Example: `0006-event-sourced-orders.md`.

---

## Frontmatter

Every ADR begins with YAML frontmatter:

```yaml
---
status: Proposed          # Proposed | Accepted | Superseded by NNNN | Deprecated | Rejected
tags: [data, frontend]    # 1–3 tags from the existing vocabulary across docs/adr/
---
```

`status` is the single source of truth for lifecycle. **`plan-with-docs` only ever writes `status: Proposed`.** The user flips it to `Accepted` (or `Rejected`) outside this skill.

Tags should reuse the vocabulary already present in other ADRs in the project. Before introducing a new tag, scan existing frontmatter. Tags must distinguish this ADR from the next; never restate a product-wide baseline — a tag that would apply to every ADR (e.g. `multi-tenancy` in a wholly multi-tenant system) carries no signal.

Author and date are not stored in the file — `git log` knows both.

---

## Format

```md
---
status: Proposed
tags: [tag1, tag2]
---

# ADR-NNNN: Title

## Context

What problem exists and why does it matter? What is the current state of the system that makes this decision necessary? Include business context, constraints, and any existing behavior a future reader would need to understand the decision.

## Decision

What we propose and the key characteristics — enough to understand the shape of the solution, not reconstruct it. Focus on architectural boundaries, integration points, and the reasoning behind the approach. Reference where code lives if helpful, but don't reproduce it.

## Consequences

Positive:

- What we gain

Trade-offs:

- What we give up or defer
```

**Style notes:**
- Context: explain from a business/user perspective, not a code perspective.
- Decision: focus on the **why** and the **shape**. Not implementation details a developer can see by reading the code. Reference paths/modules when helpful, never code snippets or type defs (they drift).
- Consequences: split `Positive:` and `Trade-offs:` bullet lists. Be honest about deferred work.
- For Proposed status, use present/future tense ("We are making…", "This will…"). For Accepted, past tense (flip when the user accepts, outside this skill).
- Exclude ephemera, consumers, provenance, universal baselines, and other projects' internals — see **What to exclude from the body** below.
- Wrap lines at roughly 100 characters.

---

## What to exclude from the body

Even when an ADR is warranted, keep the body to durable decisions. Cut anything that dates the doc or
describes what merely *surrounds* the decision. Five recurring classes to exclude (move them to the
plan if an executor still needs them):

1. **Ephemeral inventory** — names/counts of current artifacts (files, endpoints, the specific
   features/templates that exist today). Describe *how* the system works, not *which* or *how many*
   things exist; that drifts the moment one is added, renamed, or deleted.
2. **Consumers / callers / surrounding systems** — a decision's domain is what it *is*, not who calls
   it. Don't name a sibling project, don't encode "this is hit from X," and don't prefix a module's
   name with a consumer it isn't bound to.
3. **Provenance / process** — where initial values were copied from, who ran a one-time step. That is
   execution detail for the plan, not an architectural property of the system.
4. **Universal baselines** — properties true of the whole product (e.g. "multi-tenant" in a wholly
   multi-tenant system). A statement or tag that applies to everything partitions nothing.
5. **Other projects' internals** — another repo's types, file paths, branch model, or structure —
   not this system's to know or maintain. Reference only durable boundaries this system owns (the
   chosen technology, the module it lives in, the contracts it preserves).

**Per-sentence test:** *"Is this a durable property of the system that made the decision?"* If a
sentence names a count, a current file/feature, a consumer, where a value came from, or a
product-wide given — cut it or move it to the plan.

---

## When to write an ADR (3-condition test)

An ADR is warranted when **all three** of these hold:

1. **Hard to reverse** — the cost of changing your mind later is meaningful.
2. **Surprising without context** — a future reader will look at the code and wonder *"why on earth did they do it this way?"*
3. **Result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons.

If any one is missing, skip the ADR. Easy-to-reverse decisions get reversed; unsurprising ones need no explanation; non-trade-off choices have nothing to record beyond "we did the obvious thing."

---

## When NOT to write an ADR

- **Bug fixes.** The fix lives in code; the story lives in the commit message.
- **Behaviour-preserving refactors.** Same shape, different code.
- **Dependency version bumps**, unless the upgrade forces a real architectural change.
- **Style, lint, formatting, or tests for existing behaviour.**
- **New features that follow a pattern already established by an earlier ADR.** The pattern is the decision; reusing it doesn't merit its own ADR. Cite the existing one in the plan instead.

When in doubt, run the three-condition test. If any of *hard to reverse*, *surprising*, or *real trade-off* fails, skip the ADR.

---

## Superseding an existing ADR

**Ask before drafting.** The skill never decides unilaterally whether a surfaced decision is new or
supersedes an existing one — it asks the user via the `[Decision Capture]` prompt (new ADR vs.
supersede vs. skip). New-vs-supersede is the user's call; acceptance is always the human gate.

When the plan would contradict an Accepted ADR and the user chooses supersede, do not ship the
contradiction silently. Write a new ADR with `status: Proposed` whose body explains why the prior
decision no longer holds and includes a `Supersedes ADR-NNNN` line. **Accepted ADRs are immutable —
do not edit the old ADR** (typos/broken links only; anything that changes meaning goes in the new
ADR). The user, when accepting the new one outside this skill, flips the old ADR's frontmatter to
`status: Superseded by NNNN`. The old ADR's body is left intact as historical record.
