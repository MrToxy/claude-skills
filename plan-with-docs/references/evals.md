# Evals (maintainer-facing)

Test scenarios for `plan-with-docs`. **Not loaded at runtime** — run these by hand (or in CI) after
changing the skill. Covers trigger selection and end-to-end behavior.

## Contents

- Trigger tests (SHOULD fire / should NOT fire)
- End-to-end scenarios (A–D)

---

## Trigger tests

**SHOULD fire** (the description must make the model pick this skill):

1. "plan this PRD" / "turn docs/prds/offline-mode.md into a plan"
2. "/plan-with-docs docs/prds/offline-mode.md docs/adr/0003-localstorage.md"
3. "break this ADR down into tracer-bullet phases"
4. "stress test this plan with the tribunal"

**Should NOT fire** (belongs to another skill):

1. "write me a PRD for offline mode" → `prd-designer` (authoring a PRD, not planning from one)
2. "commit my changes" → `smart-commit`

PASS: each SHOULD prompt selects `plan-with-docs`; neither should-NOT prompt does.

---

## End-to-end scenarios

Each scenario: **setup → action → expected observable output → pass/fail check.** Run against a repo
that has real `docs/adr/` + `docs/prds/` (e.g. `credito-habitacao-journey`).

### A — Dual ADR+PRD constraint load + non-goal guard
- **Setup**: repo with ≥2 Accepted ADRs and a PRD containing a clear non-goal.
- **Action**: `/plan-with-docs <prd-path> <adr-path>`; during the interview, give an answer that
  expands scope into the PRD's non-goal.
- **Expected**: Phase 1 capture names both the PRD constraints (goal/non-goal/AC counts) and the
  loaded Accepted ADRs. The scope-violating answer triggers a `[Non-Goal Conflict]` halt with options
  a/b/c.
- **PASS**: both constraint sources appear in capture; the halt fires (does not silently proceed).

### B — `prd-designer` handoff + hybrid carrying
- **Setup**: a PRD with `AC-N` IDs across ≥2 user stories.
- **Action**: hand the PRD path to `/plan-with-docs`.
- **Expected**: plan has an `Execution inputs` note pointing at the canonical PRD; a `PRD constraints`
  traceability map keyed by `AC-N` (IDs only, no re-authored criteria); each phase embeds its criteria
  verbatim labelled *"derived from PRD AC-N — source of truth"*.
- **PASS**: diffing any phase embed against the PRD's criterion text is identical (no paraphrase).

### C — Decision Capture supersede path
- **Setup**: an Accepted ADR the interview will contradict.
- **Action**: give an answer that contradicts that ADR.
- **Expected**: `[ADR Conflict → Decision Capture]` fires with **(b) Supersede** recommended; choosing
  it writes `docs/adr/NNNN-*.md` with `status: Proposed` and a `Supersedes ADR-NNNN` line.
- **PASS**: new Proposed ADR written; the old ADR file is byte-for-byte unchanged.

### D — Total AC-N coverage + gating
- **Setup**: a PRD with several `AC-N` across stories.
- **Action**: complete an interview and produce the plan.
- **Expected**: every `AC-N` maps to exactly one phase (no orphans); each phase carries a completion
  gate; a final `Acceptance gate (whole-PRD)` phase lists all `AC-N`; goals/metrics sit in a separate
  non-gating `Post-launch success metrics` section.
- **PASS**: traceability table covers every `AC-N` once; no metric appears in any completion gate.

### E — Test-case decomposition per phase
- **Setup**: a PRD with several `AC-N`, against a repo that already has a test suite (so existing
  test patterns are discoverable).
- **Action**: complete an interview and produce the plan.
- **Expected**: each phase carries a `Test cases` block **directly after** its acceptance criteria,
  decomposing every mapped `AC-N` into ≥1 case written as *input → expected observable outcome*,
  tagged with a test file and level (unit / integration / e2e / agent-browser), including at least
  one boundary/failure case — not just the happy path. The cases are behavioral intent, **not**
  literal test code. Each phase's completion gate reads as passing only when its test cases are green.
- **PASS**: every `AC-N` has ≥1 decomposed case; at least one non-happy-path case per phase; no block
  contains actual test source (assertions/imports/`describe`/`it`); gate wording ties completion to
  green tests.
