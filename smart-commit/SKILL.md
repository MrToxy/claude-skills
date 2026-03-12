---
name: smart-commit
description: >
  Stages and commits git changes using semantic commits with logical grouping. Use when the user asks
  to "commit my changes", "commit these changes", "commit staged files", "commit unstaged files",
  "commit specific files", "make a commit", "create commits", or /commit. Defaults to staged-only
  scope. Warns if unstaged changes exist. Groups related changes into separate semantic commits
  with meaningful titles and body descriptions. Supports three scopes: staged (default), unstaged,
  or specific files/paths provided by the user.
metadata:
  author: joaopetinga
  version: "1.0.0"
---

# smart-commit

Create semantic git commits with logical grouping and meaningful descriptions.

## Scope Resolution

Determine scope from user's request:

- **Staged** (default): no qualifier → operate on currently staged changes only
- **Unstaged**: user says "unstaged", "untracked", "working tree", or "all changes" → stage then commit unstaged changes
- **Specific files**: user provides paths or globs → stage only those files

If scope is staged and there are also unstaged changes, warn:
> "Warning: you have unstaged changes in [list files]. These will NOT be included. Pass specific files or say 'unstaged' to include them."

Do not proceed with a different scope unless the user confirms.

## Phase 1 — Gather Change Info

Run these commands to understand the current state:

```bash
git status --porcelain
git diff --cached --stat        # staged summary
git diff --stat                  # unstaged summary (for warning)
git diff --cached               # staged full diff
git log --oneline -5            # recent commits (style reference)
```

For unstaged scope, use `git diff --stat` and `git diff` instead of `--cached`.

For specific files, use `git diff HEAD -- <files>` (or `--cached` if already staged).

## Phase 2 — Stage Files (if needed)

- **Staged scope**: files are already staged — skip staging
- **Unstaged scope**: run `git add <each unstaged file>` (not `git add -A`, to avoid accidentally including ignored files)
- **Specific files**: run `git add <file>` for each provided path

Never run `git add .` or `git add -A` unless the user explicitly requests it.

## Phase 3 — Analyze and Group

Read the full diff and group changes into logical commits. Each group should:

- Touch a single concern (feature, fix, refactor, chore, etc.)
- Be independently understandable
- Not mix unrelated concerns (e.g., don't mix a bug fix with a style change)

Common groupings:
- One commit per feature or bug fix
- Separate commits for config/tooling changes vs. application logic
- Separate commits for test changes if substantial
- If all changes are clearly one concern → single commit is fine

If only one logical group exists, create one commit. Do not split artificially.

## Phase 4 — Write Commit Messages

For each group, write a semantic commit following this format:

```
<type>(<scope>): <short imperative title>

<body — what and why, not how. 1-3 sentences. Wrap at 72 chars.>
```

**Types**: `feat`, `fix`, `refactor`, `chore`, `test`, `docs`, `style`, `perf`, `build`, `ci`

**Title rules**:
- Imperative mood: "add X", not "added X" or "adds X"
- No period at end
- Under 72 characters
- Scope is optional but useful: `feat(auth):`, `fix(queue):`

**Body rules**:
- Explain *what* changed and *why*, not *how* (the diff shows how)
- Omit body only if the title is fully self-explanatory
- Reference issue numbers if the user mentions them

**Examples of good messages**:
```
feat(categories): add centroid fallback for cold-start classification

Falls back to name-derived embedding when fewer than 3 labeled
examples exist, preventing unclassified results on new categories.
```
```
fix(queue): handle null accountId before enqueuing webhook

Without this guard, null accountIds silently enqueued invalid jobs
that failed only at worker pickup time, obscuring the root cause.
```

**Avoid**:
- `fix: bug fix`
- `chore: update stuff`
- `feat: implement feature`
- Generic filler with no context

## Phase 5 — Commit

For multiple groups, commit each group separately in dependency order (foundational changes first).

For each commit:

1. Stage only the files for that group (unstage others temporarily if needed using `git restore --staged`)
2. Run: `git commit -m "$(cat <<'EOF' ...EOF)"`  using a HEREDOC to preserve formatting
3. Confirm the commit was created: `git log --oneline -1`

If a pre-commit hook fails:
- Read the hook error output
- Fix the underlying issue (lint, format, type errors)
- Re-stage the fixed files
- Retry the commit — do NOT use `--no-verify`

## Error Cases

- **Nothing staged / no changes in scope**: report "Nothing to commit in the selected scope." and stop
- **Merge conflict markers detected**: warn and stop — do not commit with conflict markers
- **Hook failure**: fix the issue, do not bypass hooks
- **Ambiguous scope**: if the user's request is unclear, ask before staging anything
