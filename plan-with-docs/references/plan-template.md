# Plan Template (tracer-bullet vertical slices)

Default plan layout for `plan-with-docs` output. Use this structure unless refining an existing plan with its own structure.

## Contents

- Plan skeleton (header, Architectural decisions, PRD constraints)
- Phase blocks (per-phase acceptance criteria + test cases + completion gate)
- Acceptance gate (whole-PRD) + Post-launch success metrics
- Proposed PRD scope changes / Proposed ADRs / Glossary / Open questions
- Vertical-slice rules

The AC-N referencing, embedding, and gating rules — and the test-case decomposition contract (encode behavioral cases, not test code) — are defined once in `references/prd-format.md`; this template only shows the resulting output shape.

---

```md
# Plan: <Feature Name>

> Source ADR: [docs/adr/<basename>](../adr/<basename>)
> — OR — Source PRD: <path>
> — OR — Refined from: <existing plan path>
> — OR — Origin: raw idea
>
> Constrained by PRD: [<path>](<path>)   <!-- only when a PRD is a constraint but not the driving source -->
> Execution inputs: run with BOTH this plan and the canonical PRD (`<path>`) loaded; the PRD is the source of truth for all AC-N criteria. <!-- omit if no PRD -->

## Architectural decisions

Durable decisions that apply across all phases. Cite any loaded Accepted ADRs that constrain the plan.

Constrained by: ADR-0001 (<title>), ADR-0003 (<title>).

- **Routes**: …
- **Schema**: …
- **Key models**: …
- **Auth**: …
- (add/remove sections as appropriate)

---

## PRD constraints

<!-- Only when a PRD is loaded. Reference criteria by AC-N ID (contract: references/prd-format.md). -->

**Goals** (intent/scope only — non-gating):

- <goal>

**Acceptance-criteria traceability** (every AC-N maps to exactly one phase — total coverage):

| AC-ID | Story | → Phase |
|-------|-------|---------|
| AC-1  | <story> | Phase 1 |
| AC-2  | <story> | Phase 2 |

**Non-goals respected** (slices must not cross these):

- <non-goal> — *because <reason>*

---

## Phase 1: <Title>

**User stories / Source intent**: <list from PRD, or quote from ADR, or "N/A — refinement">

### What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation.

### Acceptance criteria

Mapped PRD criteria, verbatim + labelled with source (per `references/prd-format.md`):

- [ ] **AC-1** *(derived from PRD AC-1 — source of truth)* — <verbatim criterion text>
- [ ] **AC-2** *(derived from PRD AC-2 — source of truth)* — <verbatim criterion text>

### Test cases

Each AC-N above decomposes into concrete cases — *input → expected observable outcome*. Behavioral intent only; the implementer writes the assertions test-first (red→green). Cover the happy path **and** boundaries/failures, not just the happy path. Contract: `references/prd-format.md`.

**`<test file path>`** — unit | integration | e2e | agent-browser
- *(AC-1)* <valid input> → <expected observable outcome>
- *(AC-1)* <boundary / invalid input> → <expected error or outcome>
- *(AC-2)* <failure mode, e.g. downstream timeout> → <expected behavior, no partial write>

> ☐ **Phase complete only when every AC-N above passes — i.e. its test cases are green.**

<!-- If no PRD constrains this plan, fall back to plain authored criteria; still decompose each into test cases. -->

---

## Phase 2: <Title>

**User stories / Source intent**: …

### What to build

…

### Acceptance criteria

- [ ] **AC-3** *(derived from PRD AC-3 — source of truth)* — <verbatim criterion text>

### Test cases

<!-- Same shape as Phase 1: one block per test file, cases as input → expected outcome, tagged with level, covering boundaries + failures. -->

> ☐ **Phase complete only when every AC-N above passes — i.e. its test cases are green.**

<!-- Repeat for each phase -->

---

## Phase N: Acceptance gate (whole-PRD)

<!-- Final phase when a PRD is loaded; distinct closing phase. Acceptance criteria ONLY — no metrics. -->

Re-verify every PRD acceptance criterion as a whole (UAT / exit criteria):

- [ ] **AC-1** — <how verified: test / manual>
- [ ] **AC-2** — <how verified>
- [ ] … (every AC-N)

> ☐ **Feature complete only when all AC-N are checked.**

---

## Post-launch success metrics

<!-- Only when a PRD is loaded. Non-gating (see references/prd-format.md). -->

| Metric | Tied to goal | Baseline | Target | How measured |
|--------|--------------|----------|--------|--------------|
| <metric> | <goal> | <baseline> | <target> | <method> |

> Measured **after shipping**. Not a completion gate.

---

## Proposed PRD scope changes

Non-goal amendments the user chose during a `[Non-Goal Conflict]` (the user edits the PRD outside this skill). (Empty list if none.)

- <non-goal being relaxed> — <why, and which phase depends on it>

## Proposed ADRs awaiting acceptance

ADRs drafted during the interview that need user review before plan execution begins. (Empty list if none were drafted.)

- [docs/adr/0006-<title>.md](../adr/0006-<title>.md) — <one-line summary> (note `Supersedes ADR-NNNN` if applicable)

## Glossary terms added

New domain terms appended to `CONTEXT.md` during the interview. (Empty list if none.)

- **<Term>** — <one-line definition as written to CONTEXT.md>

## Open questions

Decisions the user deferred or asked to revisit. (Empty list if none.)

- <question>
```

---

## Vertical-slice rules

- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests).
- A completed slice is demoable or verifiable on its own.
- Prefer many thin slices over few thick ones.
- Do NOT include specific file names, function names, or implementation details that are likely to change as later phases are built.
- DO include durable decisions: route paths, schema shapes, data model names.
