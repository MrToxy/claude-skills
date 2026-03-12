---
name: skill-builder
description: >-
  Build, audit, and improve Claude Code skills through guided interview and generation.
  Use when user says "create a skill", "build a skill", "make a new skill",
  "write a skill", "improve this skill", "audit this skill", "review my skill",
  "skill from scratch", "turn this into a skill", or /skill-builder.
  Produces guide-compliant skill directories with SKILL.md, references, and scripts.
metadata:
  author: joaopetinga
  version: "1.0.0"
---

# skill-builder

Meta-skill that creates and audits other Claude Code skills. Two modes:
- **Create**: guided interview → generate guide-compliant skill directory
- **Edit**: read existing skill → audit against checklist → apply improvements

Consult `references/` files throughout — they are the source of truth for rules.

---

## Create Mode Workflow

### Phase 1 — Capture Intent

If the user described the skill in detail, extract from context and jump to gap-filling. Otherwise ask:

1. What should this skill do? (capability in one sentence)
2. What would a user say to trigger it? (list 3-5 phrases)
3. What does it produce? (files, output, actions)

Then ask: **Where should the skill live?**
- Global: `~/.claude/skills/` — available in all projects
- Project-local: `.claude/skills/` — only in current repo

Do not proceed until you have answers to all three questions + scope decision.

### Phase 2 — Deep Interview

Probe for details needed to generate a complete skill. Ask 2-3 questions per message max. Stop interviewing when you have enough to draft.

Probe topics (cover all that are relevant):
- What are the edge cases or failure modes?
- Does it need external tools? (MCPs, CLI tools like `gh`, APIs)
- What files does it read/write?
- Does it need reference files? (rules, specs, examples)
- Does it need helper scripts?
- Input: what does the user provide? Output: what exactly is produced?
- Should it loop/iterate or run once?
- Any existing skills this should NOT overlap with?

**Rule:** If the user provided a detailed spec upfront, skip directly to Phase 3.

### Phase 3 — Draft Generation

Select the right pattern from `references/patterns.md` before writing. Most skills use 1-2 patterns.

Generate in this order:

1. Create directory: `mkdir -p {scope}/{name}/references`
2. Write `SKILL.md` — frontmatter + body (see Generation Rules below)
3. Write reference files if needed (rules, specs, checklists, examples)
4. Write helper scripts if needed — make them executable (`chmod +x`)

**Frontmatter generation rules** (full spec in `references/frontmatter-spec.md`):
- `name`: kebab-case, no "claude"/"anthropic", matches directory name
- `description`: apply formula from `references/description-guide.md`; include all trigger phrases; plain text only; under 1024 chars
- `metadata`: always include `author` and `version: "1.0.0"`

**Body generation rules:**
- Imperative tone throughout: "Do X" not "You should do X"
- Progressive disclosure: overview first, details later
- Number workflow steps; order by execution sequence
- Cover error handling: "If X fails, do Y"
- No XML tags anywhere in the file
- No README.md (SKILL.md is the only root file)
- Under 5000 words total
- Reference files use relative paths: `references/checklist.md`

### Phase 4 — Review + Validate

After generating:

1. Run through every item in `references/checklist.md` — report pass/fail per item
2. Show file summary: list all files created with sizes
3. Generate test prompts:
   - 3 prompts that SHOULD trigger the skill
   - 2 prompts that should NOT trigger the skill
4. Ask the user: "Any changes before finalizing?"

### Phase 5 — Refine

On user feedback:
1. Apply all requested changes
2. Re-run the checklist on changed files
3. Show summary of what changed (diff-style: "Changed X to Y")
4. Regenerate test prompts if description changed
5. Confirm: "Skill finalized. Files are at {path}."

---

## Edit Mode Workflow

Triggers when user says "audit", "improve", "review", or "edit" an existing skill, or provides a path to one.

### Phase 1 — Audit

1. Read the skill directory (all files)
2. Run every checklist item from `references/checklist.md` automatically
3. Report findings:
   - Issues found (label as FAIL)
   - Warnings (label as WARN)
   - Passing items (label as PASS)
4. Suggest specific improvements per issue — be concrete, not vague

Common issues to check:
- Description missing trigger phrases → add them
- Description has XML tags → strip them
- Description over 1024 chars → trim
- Body uses passive voice → rewrite in imperative
- No error handling → add "If X fails, do Y" clauses
- Wrong file name (README.md instead of SKILL.md) → rename
- Name is camelCase → convert to kebab-case
- No examples in description → add
- Pattern mismatch (workflow described but no phase structure) → restructure

### Phase 2 — Apply Changes

Accept both:
- Audit-suggested changes (applied automatically if user agrees)
- User-directed changes (apply exactly as requested)

For each change: state what you're changing and why before making it.

After all changes: re-run checklist, confirm all previously failing items now pass.

### Phase 3 — Summary

1. Show diff of all changes (before/after for each modified section)
2. Generate 3 SHOULD-trigger + 2 should-NOT-trigger test prompts
3. Run final checklist — all items should pass
4. State: "Skill updated. All checklist items pass."

---

## Generation Rules

Quick reference — details in reference files.

### Naming
- Directory name = `name` field in frontmatter
- Always kebab-case
- Never contains "claude" or "anthropic"
- Descriptive: `pr-reviewer`, not `reviewer`

### Description Formula
See `references/description-guide.md` for full guide.
```
[Verb] + [what it does] + [when to use it] + [trigger phrases] + [key capabilities/output]
```
- Lead with a verb: "Analyzes...", "Generates...", "Builds..."
- Quote trigger phrases: `"create a skill"`, `"audit this skill"`
- Include slash command if applicable: `or /skill-name`
- Under 800 chars for safety margin

### File Rules
- Root file: `SKILL.md` exactly (not `readme.md`, not `skill.md`)
- Reference files: `references/{name}.md`
- Scripts: `scripts/{name}.sh` or `scripts/{name}.ts`
- No XML tags anywhere
- No hardcoded credentials

### Body Rules
- Imperative mood: "Run...", "Write...", "Ask..."
- Progressive disclosure: summary → details
- Phases numbered: "Phase 1 — Name"
- Steps numbered within phases
- Error cases addressed inline
- Under 5000 words

### Pattern Selection
See `references/patterns.md` for when to use each of the 5 patterns:
1. Sequential Workflow — ordered phases, user checkpoints
2. Multi-MCP Coordination — multiple external tools
3. Iterative Refinement — creative output, user iteration
4. Context-Aware Tool Selection — adapts to environment
5. Domain-Specific Intelligence — encodes rules/standards

---

## Reference Files Index

| File | Use When |
|------|----------|
| `references/frontmatter-spec.md` | Writing or validating frontmatter fields, types, constraints |
| `references/description-guide.md` | Writing the `description` field — formula, examples, bad patterns |
| `references/checklist.md` | Validating any skill before finalizing or after edits |
| `references/patterns.md` | Choosing how to structure the skill's workflow |
