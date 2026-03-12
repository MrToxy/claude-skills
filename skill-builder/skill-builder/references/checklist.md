# Skill Pre-Flight Checklist

Adapted from the official Claude Code Skills Guide — Reference A.

Run this checklist before finalizing any skill. Each item must pass.

---

## Phase 1: Before Starting

- [ ] Skill has a clear, single purpose (not a general-purpose catch-all)
- [ ] Name is in kebab-case (e.g. `my-skill`, not `mySkill`)
- [ ] Name contains no "claude" or "anthropic"
- [ ] Decided: global (`~/.claude/skills/`) vs project-local (`.claude/skills/`)
- [ ] No existing skill already covers this use case

---

## Phase 2: Frontmatter

- [ ] `name` field present and valid (kebab-case, no brand names)
- [ ] `description` field present
- [ ] Description is plain text (no XML, no HTML, no markdown formatting)
- [ ] Description is under 1024 characters
- [ ] Description includes: WHAT it does
- [ ] Description includes: WHEN to use it
- [ ] Description includes: at least 3 trigger phrases (quoted or listed)
- [ ] Description includes: key capabilities or output format
- [ ] `metadata.version` follows semver (e.g. `"1.0.0"`)
- [ ] `allowed-tools` set if skill should be restricted (optional but intentional)

---

## Phase 3: Body Content

- [ ] Body is under 5000 words
- [ ] Written in imperative tone ("Do X", not "You should do X")
- [ ] No XML tags in body
- [ ] Uses progressive disclosure (overview first, details later)
- [ ] Workflow steps are numbered and ordered by execution sequence
- [ ] Error handling is addressed (what to do when things fail)
- [ ] Edge cases are covered
- [ ] Examples provided for key decisions
- [ ] References to external files use relative paths
- [ ] No hardcoded secrets, tokens, or credentials

---

## Phase 4: File Structure

- [ ] Main file is named `SKILL.md` (not `README.md`, not `skill.md`)
- [ ] Directory name matches the `name` field in frontmatter
- [ ] Helper scripts are executable (`chmod +x`)
- [ ] Reference files placed in `references/` subdirectory
- [ ] No unnecessary files (no `.DS_Store`, no temp files)

---

## Phase 5: Trigger Validation

Test the skill loads correctly:

- [ ] Generate 3 prompts that SHOULD trigger the skill
- [ ] Generate 2 prompts that should NOT trigger the skill
- [ ] Verify trigger phrases in description match actual user phrasing
- [ ] Confirm skill doesn't over-trigger (too broad a description)
- [ ] Confirm skill doesn't under-trigger (too narrow a description)

---

## Phase 6: Quality

- [ ] Skill accomplishes its stated purpose end-to-end
- [ ] Output format is specified (what does the skill produce?)
- [ ] Dependencies are documented (MCPs, CLI tools, APIs needed)
- [ ] Skill handles graceful degradation if dependencies unavailable
- [ ] No duplicate functionality with existing skills

---

## Quick Reference: Common Failures

| Failure | Fix |
|---------|-----|
| Skill never triggers | Add more trigger phrases; make description more specific |
| Skill triggers too often | Add negative triggers; narrow the WHEN clause |
| Description too long | Cut backstory; lead with verb; use bullet list style |
| XML in description | Replace all `<tags>` with plain text |
| Wrong file name | Rename to `SKILL.md` exactly |
| CamelCase name | Convert to kebab-case |
| No error handling | Add "If X fails, do Y" instructions |
| Missing output spec | State explicitly what the skill produces |
