# Formatting & Structure-Agnostic Guidelines

## Formatting Guidelines

Follow these rules for consistent, readable issues:

**File paths:**
- Bold with backticks: **\`src/path/file.tsx\`**
- Use relative paths from project root
- Group by directory in large lists

**Code blocks:**
- Always specify language: ```tsx, ```bash, ```json, ```typescript
- Keep snippets focused (10-30 lines for inline)
- Use `// ...` or `[...]` for omitted sections
- For files ≥50 lines, provide skeleton + checkout command

**Commit SHAs:**
- Backticks: \`84fec3a6\`
- GitHub auto-links them

**Tables:**
- Use for structured data (components, props, files, renames)
- Keep columns aligned
- Bold+backtick for file paths

**Sections:**
- `##` for major sections
- `###` for subsections
- `**Subsection**` for emphasis within text

**Emphasis:**
- **Bold** for warnings, file paths, important terms
- *Italic* for minor emphasis (use sparingly)
- \`code\` for inline code, values, keys

**Callouts:**
Use blockquotes for important notes:
```
> **Note:** This depends on translation key `vehicle.color`.
> **Warning:** Breaking change in function signature.
```

## Making Issues "Structure-Agnostic"

Critical for cross-site replication: document **semantic intent**, not **mechanical steps**.

### Focus on Intent, Not Position

**Bad:**
> "Change line 47 in `page.tsx` from `<div>` to `<Section>`"

**Good:**
> "Wrap specs content in `Section` component for consistent spacing. Replace the container div that holds specs with the `Section` component."

### Use Relative Descriptions

**Bad:**
> "Add this code after the Header component at line 23"

**Good:**
> "Add `Overview` component before the main specs section (typically after header/hero, before detailed specs table)"

### Document Patterns, Not Positions

**Bad:**
> "Add `formatInches` function at line 89 in number-format.ts"

**Good:**
> "Add `formatInches` utility following the same pattern as other format functions: uses `Intl.NumberFormat` via `getDefaultFormatter` with `unit: 'inch'` and `unitDisplay: 'narrow'`"

### Provide Multiple Paths

Always offer both:
- **Cherry-pick**: Fast for similar structures
- **Manual steps**: Flexible for diverged structures

### Call Out Assumptions

Make dependencies explicit:
> **Note:** Assumes `DetailsPaper` component exists. If not, use your site's equivalent card/panel wrapper component.

### Abstract Site-Specific Details

Acknowledge differences:
> "Use your site's Link component (`AppLink` in ttc, `Link` in hpa)"

> "The exact path may differ: look for vehicle details page specs section"

### Use Structural Markers

Instead of line numbers, use structural markers:
- "In the component's return statement"
- "After the imports section"
- "Inside the main render method"
- "Before the closing return"
- "In the props interface"
