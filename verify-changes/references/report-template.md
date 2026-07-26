# Report Template

Emit exactly this format at the end of every verification run.

```
VERIFICATION REPORT
==================

Build:     [PASS/FAIL/SKIPPED]
Types:     [PASS/FAIL/SKIPPED] (X errors)
Lint:      [PASS/FAIL/SKIPPED] (X warnings)
Tests:     [PASS/FAIL/SKIPPED] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL/SKIPPED] (X issues)
Diff:      [X files changed]

Overall:   [READY/NOT READY] for PR

Issues to Fix:
1. ...
2. ...
```

## Status rules

- `PASS` — phase ran, no blocking findings
- `FAIL` — phase ran, has blockers, retries exhausted
- `SKIPPED` — phase could not run (missing tool/script/git). Include reason in parentheses
- `WARN` — treated as PASS for Overall but listed under Issues to Fix

## Overall gating

- `READY` requires: no `FAIL` in any phase
- Any single `FAIL` → `NOT READY`
- All `SKIPPED` + no `FAIL` → `READY` with a note about skipped phases

## Issues to Fix

- Number sequentially across all phases
- Prefix each with the phase: `[Types] Missing return annotation in src/foo.ts:42`
- Put security findings first (highest severity)
- Diff-review observations last (advisory, not blocking)
- Empty section → omit the "Issues to Fix:" header entirely
