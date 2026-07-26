#!/bin/bash
# analyze-diff.sh
# Outputs file change statistics from a git diff

DIFF_SOURCE="$1"
DIFF_TARGET="${2:-HEAD}"

if [ -z "$DIFF_SOURCE" ]; then
  echo "Usage: analyze-diff.sh [--cached|--pr <N>|<SHA>|<branch>] [target]"
  echo ""
  echo "Examples:"
  echo "  analyze-diff.sh --cached          # Staged changes"
  echo "  analyze-diff.sh --pr 42           # Pull request"
  echo "  analyze-diff.sh abc123            # Specific commit"
  echo "  analyze-diff.sh main              # Compare branch to HEAD"
  exit 1
fi

# Determine git diff command
case "$DIFF_SOURCE" in
  --cached)
    FILES=$(git diff --cached --name-status)
    ;;
  --pr)
    PR_NUM="$DIFF_TARGET"
    FILES=$(gh api "repos/{owner}/{repo}/pulls/$PR_NUM/files" --jq '.[] | (if .status == "added" then "A" elif .status == "removed" then "D" elif .status == "renamed" then "R" else "M" end) + "\t" + .filename')
    ;;
  *)
    if git rev-parse "$DIFF_SOURCE" >/dev/null 2>&1; then
      # It's a valid ref (branch or commit)
      if git rev-parse "$DIFF_SOURCE~1" >/dev/null 2>&1; then
        # Has a parent, treat as single commit
        FILES=$(git diff "$DIFF_SOURCE~1..$DIFF_SOURCE" --name-status)
      else
        # No parent (initial commit) or it's a branch
        FILES=$(git diff "$DIFF_SOURCE...$DIFF_TARGET" --name-status)
      fi
    else
      echo "Invalid ref: $DIFF_SOURCE"
      exit 1
    fi
    ;;
esac

if [ -z "$FILES" ]; then
  echo "No changes found."
  exit 0
fi

echo "Change Statistics:"
echo "=================="
echo "$FILES" | awk '
  /^A/ { added++ }
  /^M/ { modified++ }
  /^D/ { deleted++ }
  /^R/ { renamed++ }
  END {
    print "Added:    " (added ? added : 0)
    print "Modified: " (modified ? modified : 0)
    print "Deleted:  " (deleted ? deleted : 0)
    print "Renamed:  " (renamed ? renamed : 0)
    print "Total:    " (added + modified + deleted + renamed)
  }
'

echo ""
echo "Files by type:"
echo "=============="
echo "$FILES" | awk '{print $NF}' | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -10

echo ""
echo "Files by directory:"
echo "==================="
echo "$FILES" | awk '{print $NF}' | xargs -I {} dirname {} | sort | uniq -c | sort -rn | head -10
