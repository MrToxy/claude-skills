# Description Writing Guide

## Why Descriptions Matter

The `description` field is the **triggering mechanism**. Claude reads it to decide whether to load a skill when the user sends a message. A weak description = skill never triggers. An overfitted description = skill triggers when it shouldn't.

The description is NOT shown to the user — it's read by Claude internally.

## The Formula

```
[What it does] + [When to use it] + [Trigger phrases] + [Key capabilities]
```

All in plain text, under 1024 characters.

## 3 Good Examples

### Example 1: git-commit-writer

```
Analyzes staged git changes and writes conventional commit messages following
the Conventional Commits spec. Use when you need to commit changes, write a
commit message, or say "commit this", "create a commit", "write commit msg".
Reads git diff, infers scope and type, writes message, asks for confirmation.
```

Why it works:
- Clear WHAT: "analyzes staged git changes and writes conventional commit messages"
- Clear WHEN: "when you need to commit changes"
- Explicit trigger phrases: "commit this", "create a commit", "write commit msg"
- Lists key capabilities so Claude knows the scope

### Example 2: pr-reviewer

```
Reviews open GitHub pull requests and provides structured feedback on code
quality, test coverage, and adherence to project conventions. Use when asked
to "review this PR", "check my pull request", "give feedback on PR #N",
or "look at my changes". Fetches PR diff via gh CLI, reads changed files,
posts inline comments. Requires gh CLI authenticated.
```

Why it works:
- States output format: "structured feedback"
- Lists explicit trigger phrases
- Mentions dependency: "Requires gh CLI authenticated"
- Scopes what it checks: "code quality, test coverage, project conventions"

### Example 3: frontend-design

```
Create distinctive, production-grade frontend interfaces with high design
quality. Use this skill when the user asks to build web components, pages,
artifacts, posters, or applications (examples include websites, landing pages,
dashboards, React components, HTML/CSS layouts, or when styling/beautifying
any web UI). Generates creative, polished code and UI design that avoids
generic AI aesthetics.
```

Why it works:
- Strong differentiation: "avoids generic AI aesthetics"
- Lists many trigger contexts
- Parenthetical examples expand coverage without bloating primary description

## 3 Bad Examples

### Bad 1: Too Vague

```
A helpful coding assistant that can help with various programming tasks.
```

Problems:
- No trigger phrases
- "Various tasks" gives Claude no signal when to use it
- Will never trigger reliably

### Bad 2: Too Long / Rambling

```
This skill is designed to help developers who work with TypeScript and want
to ensure their code follows best practices. It was created because many
developers struggle with type safety and it provides guidance on generics,
utility types, conditional types, mapped types, template literal types,
and many other advanced TypeScript features. It can also help with...
[continues for 300 more chars]
```

Problems:
- Buries the trigger signal in prose
- Wastes character budget on backstory
- Claude can't extract "when to use this" quickly

### Bad 3: XML Tags in Description

```
<skill type="formatter">Formats code. Use when <trigger>formatting</trigger> is needed.</skill>
```

Problems:
- XML tags are explicitly prohibited
- May break skill parsing entirely
- Use plain text only

## Tips

1. **Lead with the verb**: "Analyzes...", "Reviews...", "Generates...", "Builds..."
2. **Include trigger phrases in quotes**: `"create a skill"`, `"audit my skill"`
3. **Add negative triggers** if needed: "Do NOT use for X" to prevent false positives
4. **Mention key dependencies**: If the skill needs `gh` CLI or a specific MCP, say so
5. **Stay under 800 chars** to leave buffer before the 1024 limit
6. **Test by asking**: "Would Claude know to use this skill from this description alone?"

## Trigger Phrase Patterns

Include both natural language and slash-command forms:

```
Use when user says "create a skill", "build a skill", "make a new skill",
"write a skill", "improve this skill", "audit this skill", or /skill-builder.
```

Include common misspellings or variants if the task name is ambiguous.
