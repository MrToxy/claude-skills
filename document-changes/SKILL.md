---
name: document-changes
description: Use when documenting code changes to replicate across multiple websites - analyzes git diffs (staged, commit, branch, or PR) and creates structured GitHub issues with semantic understanding for cross-site implementation.
---

# Document Changes for Cross-Website Replication

## Overview

Creates detailed GitHub issues documenting code changes for replication across multiple websites in git worktree environments. Focuses on semantic understanding, not just file diffs, enabling Claude Code to adapt implementations to different structures.

**Core principle:** Document the *what* and *why*, not just the *how* - semantic intent survives structural differences.

**Announce at start:** "I'm using the document-changes skill to create a replication guide."

## When to Use

- After implementing a feature in one website (e.g., ttc) that needs replication in others (hpa, hpabo, mrlease)
- Before merging a feature branch when changes should be tracked for other sites
- When creating a reusable pattern/component worth documenting

## Prerequisites

Ensure `gh` is authenticated:
```bash
gh auth status
```

If not logged in: `gh auth login`

## Invocation

User can provide:
- **No args** (default): Documents staged changes
- **Commit SHA**: Mention commit SHA in request (e.g., "document commit 84fec3a6")
- **Branch comparison**: Specify branch (e.g., "document changes since main")
- **PR number or link**: Mention PR number or URL (e.g., "document PR #42")

Examples:
```
/document-changes
/document-changes for commit 84fec3a6
/document-changes comparing against main
/document-changes for PR #42
/document-changes https://github.com/org/repo/pull/42
```

## Workflow

### 1. Determine Change Source

**First, auto-detect source branch/website:**
```bash
# Get current branch name
BRANCH=$(git branch --show-current)

# Map branch to website name
case "$BRANCH" in
  main) WEBSITE="ttc" ;;
  hpabo) WEBSITE="hpabo" ;;
  hpa) WEBSITE="hpa" ;;
  mrlease) WEBSITE="mrlease" ;;
  *) WEBSITE="$BRANCH" ;;
esac
```

Parse user input to identify source:

**Staged changes** (default):
```bash
# Check if any staged changes exist
git diff --cached --name-only

# Get full diff
git diff --cached
```

**Specific commit**:
```bash
# Validate commit exists
git cat-file -e <SHA>^{commit}

# Get changed files
git diff <SHA>~1..<SHA> --name-only

# Get full diff
git diff <SHA>~1..<SHA>

# Get commit message for context
git log -1 --pretty=format:"%H %s%n%n%b" <SHA>
```

**Branch comparison**:
```bash
# Get changed files
git diff <branch>...HEAD --name-only

# Get full diff
git diff <branch>...HEAD

# Get commit history
git log <branch>..HEAD --oneline
```

**Pull request**:
```bash
# Extract PR number from input
# - Strip leading '#': PR_NUM="${INPUT#\#}"
# - Parse URL: PR_NUM=$(echo "$INPUT" | grep -oE '/pull/([0-9]+)' | grep -oE '[0-9]+')

# Validate PR exists
gh pr view <N> --json number

# Get PR metadata
gh pr view <N> --json baseRefName,headRefName,title,body,state,commits

# Get changed files list
gh pr diff <N> --name-only

# Get full diff
gh pr diff <N>

# Get commit messages for context
gh pr view <N> --json commits --jq '.commits[].messageHeadline'
```

Map `headRefName` to website using same branch→website case logic:
```bash
case "$HEAD_BRANCH" in
  main) WEBSITE="ttc" ;;
  hpabo) WEBSITE="hpabo" ;;
  hpa) WEBSITE="hpa" ;;
  mrlease) WEBSITE="mrlease" ;;
  *) WEBSITE="$HEAD_BRANCH" ;;
esac
```

### 2. Validate Input

**If no changes found:**
```
No changes found [for staged/commit <SHA>/comparison with <branch>].
Nothing to document.
```
Exit gracefully.

**If too many files (>30):**
```
Found <N> changed files. This is a large changeset that may be unwieldy as one issue.

Continue with all files, or would you like to filter/split?
```

Wait for user response.

### 3. Analyze Changes Semantically

Read the full diff and understand:

**File-level analysis:**
- Change type: new file, modified, renamed, deleted
- File purpose: component, util, type definition, config, test
- Dependencies: imports, exports, type references

**Semantic analysis:**
- **Intent**: What problem does this solve? Why was this change made?
- **Architecture**: How does structure change? Before/after patterns?
- **New patterns**: Conditional rendering, data flow, error handling
- **Breaking changes**: API changes, renames, signature modifications
- **Dependencies**: New utils/components/types that must exist

**Cross-site considerations:**
- Site-specific code: Component names that differ (AppLink vs Link)
- Shared code: Types from SDKs, shared utilities
- Translation keys: New/modified i18n keys
- Protected files: Check `.gitattributes` for `merge=ours` patterns
- Assets: Images, icons, fonts that need manual copying

**Read supporting files** if referenced:
- Read changed files to understand full context
- Check imports to identify dependencies
- Look at `.gitattributes` to identify protected files
- Check translation files if keys referenced

### 4. Extract Context

**From commit messages** (if using commit/branch):
```bash
git log <range> --pretty=format:"%s%n%b"
```

Use commit messages to understand intent.

**From code analysis:**
- Component names and purposes
- New fields/props added
- Data structures changed
- UI patterns introduced
- Business logic changes

**From related files:**
If changes reference files not in diff (imports), note them as dependencies that may need creation.

### 5. Build Structured Issue

Create markdown following the template structure. Read `references/issue-template.md` for all section templates (Context, Architecture, Changes, Dependencies, Translations, Renames, Binary/Assets, Replication Paths, Adaptation Notes, Files Summary).

### 6. Ensure Replication Label Exists

Before creating issue, verify replication label exists in repo:

```bash
# Ensure replication label exists in repo
if ! gh label list | grep -q "^replication"; then
  echo "Creating 'replication' label..."
  gh label create "replication" \
    --description "Changes to replicate across websites" \
    --color "0E8A16"
fi
```

### 7. Create GitHub Issue

Use heredoc to preserve formatting with verification:

```bash
# Create issue and capture output
ISSUE_OUTPUT=$(gh issue create \
  --title "Replicate from <source-branch>: <concise-description>" \
  --body "$(cat <<'EOF'
[Full generated markdown content here]
EOF
)" \
  --label "documentation" \
  --label "replication" \
  --label "source:<branch-name>")

# Extract issue number and URL
ISSUE_NUMBER=$(echo "$ISSUE_OUTPUT" | grep -oE '#[0-9]+' | head -1 | tr -d '#')
ISSUE_URL=$(echo "$ISSUE_OUTPUT" | grep -oE 'https://[^ ]+')

# CRITICAL: Verify labels applied
echo "Verifying labels..."
APPLIED_LABELS=$(gh issue view "$ISSUE_NUMBER" --json labels --jq '.labels[].name' | tr '\n' ',')

# Check for critical "replication" label
if [[ ! "$APPLIED_LABELS" =~ "replication" ]]; then
  echo "⚠️  WARNING: 'replication' label missing - adding now..."
  gh issue edit "$ISSUE_NUMBER" --add-label "replication"

  # Re-verify after retry
  APPLIED_LABELS=$(gh issue view "$ISSUE_NUMBER" --json labels --jq '.labels[].name' | tr '\n' ',')
  if [[ ! "$APPLIED_LABELS" =~ "replication" ]]; then
    echo "❌ FAILED to apply 'replication' label"
    echo "MANUAL ACTION: gh issue edit $ISSUE_NUMBER --add-label replication"
    echo ""
    echo "Issue created but label missing. Continuing..."
  else
    echo "✓ 'replication' label added successfully"
  fi
else
  echo "✓ All labels verified present"
fi
```

**Title format guidelines:**
- Start with "Replicate from <source-branch>: "
- Describe feature/change in 5-8 words
- Be specific but concise

Examples:
- "Replicate from mrlease: Vehicle specs refactor with new fields"
- "Replicate from hpa: Add authentication flow components"
- "Replicate from ttc: Color swatch component and utilities"

**Label format (CRITICAL REQUIREMENT):**

All three labels REQUIRED:

1. **`documentation`** - Standard documentation label
2. **`replication`** - **CRITICAL** - Flags for cross-site replication
   - **Without this, cross-site-replicator skill cannot find issue**
   - Missing breaks automated replication workflow
   - Auto-created if missing from repo
3. **`source:<branch-name>`** - Identifies source site
   - Format: `source:main` (ttc), `source:hpa`, `source:hpabo`, `source:mrlease`
   - Used to exclude source from replication targets

**Implementation - use multiple flags:**
```bash
--label "documentation" \
--label "replication" \
--label "source:$BRANCH"
```

**Verification always performed:** Script checks labels after creation and retries if missing.

**Report success:**
```
✓ Created issue #<N>: <title>
<issue-url>

✓ Labels verified: documentation, replication, source:<branch-name>

Summary:
- <N> files changed (<added> added, <modified> modified, <renamed> renamed)
- <N> new components
- <N> dependencies to create/checkout
- <N> translation keys

The issue includes:
✓ Architecture overview
✓ Step-by-step replication guide
✓ Dependencies with checkout commands
✓ Adaptation notes for site differences

Next steps:
1. Review issue #<N> in other website repos
2. Use Claude Code to implement based on documentation
3. Adapt to site-specific structure as noted
```

**If label verification failed:**
```
⚠️  Issue #<N> created but 'replication' label missing
<issue-url>

MANUAL ACTION REQUIRED:
  gh issue edit <N> --add-label "replication"

Without this label, cross-site-replicator skill will not find this issue.
```

## Reference Files

When needed during workflow execution, read these files:

- **`references/issue-template.md`** — all section templates for Step 5 (Context, Architecture, Changes, Dependencies, Translations, Renames, Binary/Assets, Replication Paths, Adaptation Notes, Files Summary)
- **`references/edge-cases.md`** — handling for: no staged changes, invalid SHA, binary files, large diffs, merge commits, protected files, no GitHub repo, whitespace diffs, invalid PR, fork PRs, draft PRs
- **`references/guidelines.md`** — formatting rules + structure-agnostic principles (intent focus, relative descriptions, structural markers, etc.)
- **`references/common-patterns.md`** — documentation patterns for components, utilities, translations, renames, architecture changes + tips for large changesets, breaking changes, dependencies

## Red Flags

**Never:**
- Document line numbers or absolute positions
- Assume identical file structure across sites
- Skip semantic explanation ("just changed a div to Section")
- Forget to note site-specific differences
- Omit dependency files/utilities/types
- Use technical jargon without explanation
- Create issues >500 lines (split instead)
- Create issues without verifying labels applied
- Use comma-separated labels (single flag less reliable)

**Always:**
- Explain the **why**, not just the **what**
- Provide both cherry-pick and manual paths
- Use tables for structured data
- Bold+backtick file paths (consistency)
- Include all translation keys (don't say "add keys" without listing)
- Note protected files from `.gitattributes`
- Add footer: "🤖 Generated with [Claude Code](https://claude.com/claude-code)"
- Read actual changed files, don't just summarize diff
- Understand semantic intent before writing
- Use multiple `--label` flags (one per label)
- Verify 'replication' label present after creation
- Provide manual command if automated retry fails

## Troubleshooting

### "replication" Label Missing After Creation

**Symptom:** Issue created successfully but `replication` label not applied

**Immediate fix:**
```bash
gh issue edit <N> --add-label "replication"
gh issue view <N> --json labels --jq '.labels[].name'  # Verify
```

**Check label exists in repo:**
```bash
gh label list | grep replication
```

If missing, create:
```bash
gh label create "replication" \
  --description "Changes to replicate across websites" \
  --color "0E8A16"
```

**Verify gh authentication:**
```bash
gh auth status  # Should show repo, workflow scopes
gh auth login   # If not authenticated
```

### Cross-Site Replicator Cannot Find Issue

**Symptom:** `/replicate #<N>` reports "not a replication issue" or "issue not found"

**Cause:** Missing "replication" label

**Fix:**
```bash
gh issue view <N> --json labels --jq '.labels[].name'  # Check labels
gh issue edit <N> --add-label "replication"            # Add if missing
```
