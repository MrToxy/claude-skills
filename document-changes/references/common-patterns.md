# Common Patterns & Tips Reference

## Tips for Good Documentation

### For Large Changesets
Group related changes:
- **UI Components**: New/modified components
- **Utilities**: Helper functions, formatters
- **Types/Interfaces**: Type definitions, enums
- **Translations**: i18n keys
- **Configuration**: Config file changes

### For Breaking Changes
Use clear callouts:
```markdown
> **Breaking Change:** Function signature changed from `fn(a)` to `fn(a, b)`.
> Update all call sites to include new parameter.
```

### For Dependencies
Prioritize clarity over brevity:
- Better to over-document than under-document
- Include "why" for each dependency
- Provide checkout commands for convenience
- Note if dependency is optional

### For Cross-Site Differences
Create dedicated "Adaptation Notes" section:
- Warn about likely conflicts
- List site-specific component names
- Note protected files
- Mention structural differences

### For Complex Logic
Explain algorithms/patterns:
```markdown
**Conditional rendering pattern:**
1. Build array of spec objects
2. Filter out nulls (missing data)
3. Return null if array empty (hide section)
4. Otherwise render table

This pattern ensures sections only show when data exists.
```

## Common Patterns

### Component Creation
For new components, include:
1. **Purpose**: What problem does it solve? (1 sentence)
2. **Props interface**: Types and required/optional
3. **Key logic**: Conditional rendering, data handling, state
4. **Dependencies**: Imports, utilities, types used
5. **Usage example**: How parent component uses it

### Utility Functions
For new utilities, include:
1. **Function signature**: Full TypeScript signature
2. **Purpose**: What it does (1 sentence)
3. **Example usage**: Real-world call example
4. **Dependencies**: Other utils, types, third-party libs
5. **Pattern**: If follows existing pattern, note it

### Translations
For i18n changes:
1. Provide ALL keys in JSON format (copy-pasteable)
2. Include all locales if you have them
3. Note nesting strategy (dot notation vs object nesting)
4. Mention if keys are optional/conditionally used

### File Renames
For renames:
1. Use table format (Before | After)
2. Note if exports also renamed
3. Mention if affects imports elsewhere
4. Note if affects protected files

### Architecture Changes
For structural changes:
1. Show before/after clearly
2. Use tree format or nested lists
3. Explain why change was made
4. Note benefits (DRY, testability, etc.)
