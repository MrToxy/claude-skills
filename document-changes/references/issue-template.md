# Issue Template Reference

All template sections for Step 5: Build Structured Issue.

## Template: Context Section

```markdown
## Context

**Source:** `<branch-name>` branch (<website>)
**Target:** Other website branches (ttc, hpa, hpabo, mrlease - exclude source)

[1-2 sentences: WHAT changed and WHY. Include commit SHA if applicable.]

Example:
"**Source:** `mrlease` branch
**Target:** ttc, hpa, hpabo branches

Commit `84fec3a6` in `mrlease` refactored vehicle specs into granular components and added new fields. This issue documents changes for replication across other website branches."
```

## Template: Architecture Section (Optional)

Only include if structure significantly changed:

```markdown
## Architecture: Before → After

**Before** — `file.tsx` contained:
- Inline implementation (~135 lines)
- Component A
- Component B

**After** — `file.tsx` composes:
```tsx
<NewWrapper>
  <RefactoredA />
  <RefactoredB />
  <NewComponent />
</NewWrapper>
```
```

## Template: Changes Section

Group changes logically (by feature area, component type, etc.):

```markdown
## [Section Name: e.g., "New Components", "Refactoring", "New Fields"]

[Description of changes in this section]

| Component | File | Purpose | Props |
|-----------|------|---------|-------|
| `ComponentName` | **\`src/path/file.tsx\`** | What it does | `prop1`, `prop2` |
| `AnotherComponent` | **\`src/path/another.tsx\`** | Purpose | `propA`, `propB` |

**Key patterns:**
- How null/empty states handled: [explanation]
- Conditional rendering: [pattern used]
- Data flow: [how data moves through components]
```

## Template: Dependencies Section

```markdown
## Dependencies — may need to be created if missing

### `ComponentName` (**\`src/path/file.tsx\`**)

[1-2 sentence description of what it does and why it's needed]

```tsx
// Small components (<50 LOC): show full code
export const ComponentName = ({ prop }: Props) => {
  return <div>{/* ... */}</div>;
};

// Large components (≥50 LOC): show skeleton
interface Props {
  prop1: string;
  prop2: number;
}
// Implementation in source file
```

Checkout from `<source-branch>`:
```bash
# From your target branch (e.g., if replicating from mrlease to hpa)
git checkout <SHA> -- src/path/file.tsx
```

> **Note:** [Gotchas: "depends on translation key X", "requires util Y", etc.]

### New utilities in **\`src/utils/helpers.ts\`**

[List functions, signatures, purposes]

```typescript
export const formatInches = (value: number, locale: string) =>
  getDefaultFormatter(locale)({
    style: 'unit',
    unit: 'inch',
    unitDisplay: 'narrow'
  }).format(value);
```

Follow pattern from other format functions.
```

## Template: Translations Section

```markdown
## New translation keys

Add to all locale files (`messages/en.json`, `messages/fr.json`, etc.):

```json
{
  "key": "English value",
  "nestedKey": "Another value",
  "nested.dotNotation": "Dot notation key"
}
```

[Note if keys use nesting or specific format]
```

## Template: Renames Section

```markdown
## Renames

| Before | After |
|--------|-------|
| `OldName` / **\`old-file.tsx\`** | `NewName` / **\`new-file.tsx\`** |
| `GeneralSpecs` | `Overview` |

[Note if exports also changed]
```

## Template: Binary/Asset Changes (if applicable)

```markdown
## Binary/Asset Changes

The following files changed but need manual replication:

| File | Action |
|------|--------|
| **\`public/images/icon.png\`** | Added |
| **\`public/fonts/custom.woff2\`** | Modified |

Copy these files manually from source website.
```

## Template: Replication Paths

```markdown
## How to replicate

### Option A: Cherry-pick from `<source-branch>` (if structure similar)

```bash
# From your target branch (e.g., hpa, ttc, hpabo)
# Checkout files from source branch using commit SHA
git checkout <SHA> -- \
  src/path/file1.tsx \
  src/path/file2.tsx \
  src/path/file3.tsx
```

Then manually handle:
- Update imports if paths differ
- Adapt site-specific components
- Add translation keys
- Test functionality

### Option B: Manual implementation (if structure differs)

1. Create `ComponentWrapper` - renders `SharedUI` + title + children
2. Extract inline logic from `page.tsx` into new `ComponentA` component
3. Implement conditional rendering pattern: build array → filter nulls → return null if empty
4. Add `ComponentB` following same pattern as `ComponentA`
5. Rename `OldComponent` to `NewComponent` and update exports
6. Add utility functions to `utils/helpers.ts`
7. Update imports in `page.tsx` to use new components
8. Add translation keys to all locale files
9. Test with real data

[Make steps specific but structure-agnostic]
```

## Template: Adaptation Notes

```markdown
## Adaptation notes

**Origin:** Changes originated in `<source-branch>` branch. Target branches may have diverged differently since last sync.

[Critical warnings about site-specific differences]

- **`page.tsx` will likely conflict** if target branch has diverged from `<source-branch>`. Focus on [specific change to apply].
- **Link components differ**: ttc uses `AppLink`, hpa uses `Link` - keep target site's component.
- **Component structure**: If target lacks `SharedWrapper`, use equivalent card/panel component.
- **Translation structure**: Verify nested keys work with your i18n setup (`t('parent.child')` vs separate files).
- Shared UI components (`SpecsContainer`, `DetailsPaper`) must already exist in `specs/index.tsx`.
- Protected files won't auto-merge (see `.gitattributes`): [list critical ones]
- **Branch divergence**: Check if target branches have conflicting changes in same files since last merge from main.
```

## Template: Files Summary

```markdown
## Files summary

[Quick reference of all touched files]

| Action | Path |
|--------|------|
| Create | **\`src/components/new-component.tsx\`** |
| Modify | **\`src/app/page.tsx\`** |
| Rename | **\`old.tsx\`** → **\`new.tsx\`** |
| Delete | **\`deprecated.tsx\`** |

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
