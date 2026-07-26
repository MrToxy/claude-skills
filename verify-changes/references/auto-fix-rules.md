# Auto-Fix Rules

Guardrails for the fix loop. Max 3 retries per phase. Always re-run the phase command after a fix batch.

## Safe to auto-fix

| Category | Example | Why safe |
|----------|---------|----------|
| Missing imports | `Cannot find name 'useState'` → add `import { useState } from 'react'` | Mechanical, inferable from usage |
| Lint rule with `--fix` | ESLint / Biome / ruff autofixes | Tool-verified, no semantic change |
| Formatting | Prettier / ruff-format | Style only |
| Dead `console.log` in `src/` | Leftover debug statements | No behavior change |
| Obvious type annotations | `const x = 1` → `const x: number = 1` when requested by strict rules | Mechanical |
| Unused imports | Removal of unreferenced symbols | Static analyzers agree |

## Never auto-fix — escalate to user

| Category | Reason |
|----------|--------|
| Secrets / API keys | Deleting the string is not enough — rotate first |
| Test assertions | Rewriting assertions hides bugs |
| Business logic | Changing behavior to make a test pass defeats the test |
| Public API shapes | Breaking consumers |
| Anything surfaced by `/simplify focus on security` | That skill owns the decision; we only report |
| Large refactors | Scope creep; out of task bounds |
| Dependency versions | Can break transitively |

## Retry accounting

- Count a retry each time the phase command is re-run after an edit
- After 3 retries, STOP fixing that phase, mark `FAIL`, include the last error in the report
- A successful run resets the counter for later phases

## Phase-specific notes

- **Build FAIL after 3 retries** → abort entire verification run. Later phases depend on a working build
- **Type check FAIL** → continue to lint/tests; they may still surface useful signal
- **Tests FAIL** → continue to security; skipping security over a test failure hides secrets
- **Security** → always report, never fix in-place
- **Diff review** → never fix; observations only
