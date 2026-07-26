# Edge Cases Reference

## No Staged Changes
```bash
if [ -z "$(git diff --cached --name-only)" ]; then
  echo "No staged changes found."
  echo "Stage your changes or specify a commit SHA / branch for comparison"
  exit 1
fi
```

## Invalid Commit SHA
```bash
if ! git cat-file -e "$SHA"^{commit} 2>/dev/null; then
  echo "Commit $SHA not found in repository."
  exit 1
fi
```

## Binary Files or Assets
Skip binary files in semantic analysis. List separately in "Binary/Asset Changes" section:

```markdown
## Binary/Asset Changes

The following files changed but need manual replication:

| File | Action |
|------|--------|
| **\`public/images/icon.png\`** | Added |
| **\`public/fonts/custom.woff2\`** | Modified |

Copy these files manually from source website.
```

## Large Diffs (>30 files)
Prompt user:
```
Found <N> changed files. This is large for one issue.

Options:
1. Continue with all files (may be hard to follow)
2. Filter by path (e.g., only src/components/*)
3. Split into multiple issues by feature area

What would you prefer?
```

## Merge Commits
Detect and handle:
```bash
# Check if merge commit
if [ $(git cat-file -p "$SHA" | grep -c "^parent") -gt 1 ]; then
  echo "This is a merge commit with multiple parents."
  echo "Documenting changes introduced by the merge."
fi

# Use same diff command - works for merge commits
git diff "$SHA"~1.."$SHA"
```

## Protected Files (.gitattributes)
Read and report:
```bash
if [ -f .gitattributes ]; then
  PROTECTED=$(grep "merge=ours" .gitattributes | awk '{print $1}')
  if [ -n "$PROTECTED" ]; then
    # Include in issue adaptation notes section
  fi
fi
```

In issue:
```markdown
> **Warning:** These files are protected in `.gitattributes` (merge=ours) and won't auto-merge:
> - `src/app/**`
> - `messages/**`
> - `tailwind.config.ts`
>
> Manual replication required for these files.
```

## No GitHub Repository
```bash
if ! gh repo view &>/dev/null; then
  echo "Not in a GitHub repository or gh not authenticated."
  echo "Run: gh auth login"
  exit 1
fi
```

## Empty Diffs (whitespace only)
```bash
if [ -z "$(git diff "$SOURCE" --ignore-all-space)" ]; then
  echo "Changes are whitespace-only. No semantic changes to document."
  exit 0
fi
```

## Invalid PR Number
```bash
if ! gh pr view "$PR_NUM" --json number &>/dev/null; then
  echo "PR #$PR_NUM not found in this repository."
  exit 1
fi
```

## PR from Fork
Warn that `git checkout <SHA> -- file` commands may not work since the fork's commits may not be available locally. Diff is still accessible via `gh pr diff <N>`.

> **Warning:** This PR originates from a fork. `git checkout <SHA> -- file` commands in the Dependencies section may not work. Use `gh pr diff <N>` or manually copy files from the fork's branch.

## Draft PR
```bash
STATE=$(gh pr view "$PR_NUM" --json isDraft --jq '.isDraft')
if [ "$STATE" = "true" ]; then
  echo "⚠️  PR #$PR_NUM is a draft — changes may be incomplete or in-progress."
fi
```

Note this in the issue Context section so implementers know the PR wasn't finalized.
