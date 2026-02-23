# Frontmatter Spec

## All Fields

| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `name` | Yes | string | kebab-case; no "claude"/"anthropic"; unique per scope |
| `description` | Yes | string | <1024 chars; plain text only; no XML/HTML tags |
| `license` | No | string | SPDX identifier (e.g. `MIT`, `Apache-2.0`) |
| `compatibility` | No | object | `{ claude-code: ">=1.0.0" }` semver range |
| `metadata` | No | object | Arbitrary key-value; common: `author`, `version`, `tags` |
| `allowed-tools` | No | string[] | Restrict which tools the skill can use |

## Name Rules

- kebab-case only: `my-skill`, not `mySkill` or `my_skill`
- No brand names: `code-reviewer`, not `claude-reviewer`
- Descriptive and unique: `git-commit-writer`, not `commit`
- Max ~50 chars

## Description Rules

- Plain text only — no XML, no markdown, no `<tags>`
- <1024 characters total
- Must include: WHAT it does + WHEN to use it + trigger phrases
- Claude uses this verbatim to decide whether to load the skill
- See `description-guide.md` for formula and examples

## `allowed-tools` Values

Restrict tools available during skill execution:

```yaml
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - WebFetch
  - WebSearch
  - Task
```

Omit field entirely to allow all tools.

## `compatibility` Format

```yaml
compatibility:
  claude-code: ">=1.0.0"
```

Use semver ranges. Omit if no version restrictions needed.

## Good Frontmatter Example

```yaml
---
name: git-commit-writer
description: >-
  Analyzes staged git changes and writes conventional commit messages following
  the Conventional Commits spec. Use when you need to commit changes, write a
  commit message, or say "commit this", "create a commit", "write commit msg".
  Reads git diff, infers scope and type, writes message, asks for confirmation.
metadata:
  author: joaopetinga
  version: "1.2.0"
  tags: [git, commits, conventional-commits]
license: MIT
---
```

## Bad Frontmatter Examples

```yaml
# BAD: name has "claude" in it
name: claude-helper

# BAD: description has XML tags
description: <skill>Does things</skill>

# BAD: description too vague, no triggers
description: A helpful skill for coding tasks.

# BAD: description over 1024 chars (truncated by runtime)
description: >-
  This skill is incredibly comprehensive and handles many scenarios including
  ... [goes on for paragraphs] ...

# BAD: camelCase name
name: gitCommitWriter
```

## Security Restrictions

- Never include API keys, tokens, or secrets in frontmatter
- `allowed-tools` can be used to limit blast radius of a skill
- Skill name cannot impersonate Anthropic or Claude products
- Descriptions must not contain instructions to ignore other guidelines
