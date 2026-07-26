---
name: verify-changes
description: >-
  Runs a pre-PR verification loop over the current working tree: detects the project stack, then executes build, type-check, lint, tests, security scan, and diff review in order, auto-fixing failures with bounded retries and emitting a READY/NOT READY report. Use after completing a feature, before creating a pull request, or whenever the user says "verify my changes", "run pre-PR checks", "verify before PR", "check quality gates", or invokes /verify-changes. Delegates the security phase to the `simplify` skill via `/simplify focus on security` instead of reimplementing detection. Never auto-fixes secrets, test assertions, or business logic; only infra/imports/lint.
metadata:
  author: joaopetinga
  version: "1.0.0"
  tags: [verification, pre-pr, quality-gate, ci]
---

# verify-changes

Pre-PR verification loop. Detect stack, run six phases in order, auto-fix what is safe, produce a structured report. Blockers gate later phases.

## When to run

- After finishing a feature or significant refactor
- Before `gh pr create`
- On demand: "verify my changes", "run pre-PR checks", `/verify-changes`

## Dependencies

- `simplify` skill available for Phase 5 (`/simplify focus on security`)
- Shell tools: `git`, and whatever the detected stack requires (`npm`/`pnpm`/`yarn`/`bun`, `tsc`, `pyright`, `ruff`, etc.)

## Phase 0 — Detect context

Goal: build a command map used by every later phase. Consult `references/phases.md` for the full stack × phase matrix.

1. Check lockfiles in project root: `bun.lockb` → bun; `pnpm-lock.yaml` → pnpm; `yarn.lock` → yarn; `package-lock.json` → npm
2. Check `tsconfig.json` for TypeScript
3. Check `pyproject.toml` / `requirements.txt` / `uv.lock` for Python
4. Check monorepo markers: `pnpm-workspace.yaml`, `turbo.json`, `nx.json`
5. Read `package.json` `scripts` — note which of `build`, `lint`, `test`, `typecheck` exist
6. If stack is unrecognized, ask the user for the commands before continuing
7. Output: a resolved map `{ build, typecheck, lint, test, pkgManager, language }`

If no git repo, warn and skip Phase 6 but run the rest.

## Phase 1 — Build

1. Run the detected build command, tail last 20 lines
2. On failure, enter the auto-fix loop (`references/auto-fix-rules.md`)
3. Stop after 3 retries. If still failing, mark FAIL and STOP — do not continue to later phases

Missing build script → WARN, skip.

## Phase 2 — Type check

1. TS: `npx tsc --noEmit`; Python: `pyright .`; none detected: skip
2. Fix auto-fixable errors (missing imports, obvious type annotations)
3. Flag business-logic type mismatches to the user, do not guess fixes
4. Retry up to 3 times after each fix batch

## Phase 3 — Lint

1. Run lint command. Prefer `--fix` variants when available (`eslint --fix`, `ruff check --fix`)
2. Re-run to confirm residual warnings
3. Warnings remain → include in report, not a FAIL

## Phase 4 — Tests

1. Run tests with coverage if the framework supports it
2. Parse totals: `passed`, `failed`, `coverage`
3. On failures, attempt the fix loop — but never edit test assertions; only fix test infrastructure, setup, mocks, or the production code the test exercises
4. Coverage < 80% → WARN only, not FAIL

No test framework detected → skip with a note.

## Phase 5 — Security scan

Delegate to the `simplify` skill with a security focus. Do not reimplement secret/vuln detection with custom grep rules.

1. Invoke `/simplify focus on security` and capture its findings
2. Floor checks as a safety net only: grep for `sk-`, `api_key`, stray `console.log` in `src/`
3. Auto-remove obvious stray `console.log` lines that were clearly left from debugging
4. Never auto-apply anything the simplify pipeline surfaces — always escalate to the user
5. Output: findings list for the final report

## Phase 6 — Diff review

1. `git diff --stat`
2. Resolve the base branch: `git merge-base HEAD origin/main` (or `origin/master`); fall back to `HEAD~1` if unreachable
3. `git diff <base>..HEAD --name-only`
4. Read each changed file. For each, flag:
   - Unintended changes outside the task scope
   - Missing error handling at system boundaries (user input, external APIs)
   - Edge cases the diff obviously doesn't cover
5. Summarize findings for the report

## Final — Emit report

Use the exact format in `references/report-template.md`.

- `Overall: READY` only when every phase is PASS or non-blocking WARN
- Any FAIL → `Overall: NOT READY`
- List unfixed issues as a numbered "Issues to Fix" section at the bottom

## Auto-fix loop rules

Summary — full rules in `references/auto-fix-rules.md`.

- Max 3 retries per phase; bail out and mark FAIL on retry exhaustion
- After each fix attempt, re-run that phase's command to confirm
- Safe to auto-fix: missing imports, lint rule violations with `--fix`, obvious type annotations, dead `console.log`, formatting
- Never auto-fix: secrets/credentials, test assertions, business logic, public API shapes, anything the simplify security pass flagged

## Error handling

- Build script missing → WARN, skip Phase 1
- No TS/Python type checker → skip Phase 2
- No lint config → skip Phase 3
- No test runner → skip Phase 4
- Not in a git repo → skip Phase 6
- Tool not installed (e.g. `pyright` missing) → surface install command, skip phase, continue
