# Skill Patterns

The 5 core patterns from the Claude Code Skills Guide. Use these to structure the skill being built.

---

## Pattern 1: Sequential Workflow Orchestration

**What it is:** A series of numbered phases that must run in order. Each phase depends on the previous one's output.

**When to use:**
- Multi-step processes with clear dependencies (e.g. gather → draft → review → publish)
- Workflows where skipping a step breaks the outcome
- Processes that involve user confirmation between steps

**Key techniques:**
- Number phases explicitly: Phase 1, Phase 2, etc.
- State what each phase produces as output
- Include "checkpoint" instructions (ask user before proceeding to next phase)
- Handle failures per-phase (what to do if Phase 2 fails)

**Example skills:** skill-builder, git-release-manager, deployment-pipeline

**Template structure:**
```
Phase 1 - [Name]: [goal]
- Step 1.1: ...
- Step 1.2: ...
- Output: [what this phase produces]

Phase 2 - [Name]: [goal]
- Requires: [output from Phase 1]
- Step 2.1: ...
```

---

## Pattern 2: Multi-MCP Coordination

**What it is:** Orchestrates multiple MCP servers or external tools together to accomplish a task neither could do alone.

**When to use:**
- Skill needs data from multiple sources (e.g. GitHub + Jira + Slack)
- Combining read-from-one, write-to-another workflows
- Cross-system synchronization or replication tasks

**Key techniques:**
- List all required MCPs/tools in the description's dependencies section
- Fail gracefully if one MCP is unavailable
- Define clear data handoff between systems
- Document auth requirements per MCP

**Example skills:** cross-site-replicator, document-changes, address-github-comments

**Template structure:**
```
## Dependencies
- MCP: [name] — used for [purpose]
- CLI: [tool] — used for [purpose]

## Workflow
1. Fetch from [Source A] using [MCP/tool]
2. Transform: [how data is mapped]
3. Write to [Target B] using [MCP/tool]
```

---

## Pattern 3: Iterative Refinement

**What it is:** Produce a draft, gather feedback, refine. Loop until user is satisfied.

**When to use:**
- Creative or subjective outputs (UI design, writing, naming)
- Skills where "right answer" varies by user preference
- Processes that benefit from intermediate checkpoints

**Key techniques:**
- Generate initial draft quickly
- Present explicit choices or variations (not just one option)
- Ask targeted feedback questions (not "what do you think?")
- Re-run validation after each refinement cycle
- Set a max iteration count to avoid infinite loops

**Example skills:** frontend-design, skill-builder (refine phase), pr-reviewer

**Template structure:**
```
## Draft
[Generate first version]

## Review Questions
Ask the user:
1. [Specific question about aspect A]
2. [Specific question about aspect B]

## Refine
Apply feedback → regenerate → repeat until user approves
```

---

## Pattern 4: Context-Aware Tool Selection

**What it is:** Detect the environment/context first, then select the right tools and approach dynamically.

**When to use:**
- Skill must work across different project types (Next.js vs Vite vs plain JS)
- Behavior changes based on what tools are installed or what files exist
- Skills that adapt to monorepo vs single-package setups

**Key techniques:**
- Start with an explicit detection phase (read config files, check for CLIs)
- Branch the workflow based on detected context
- Document all branches (don't leave implicit paths)
- Include a fallback for unrecognized contexts

**Example skills:** vercel-react-best-practices, storytelling-tests, better-auth-best-practices

**Template structure:**
```
## Context Detection
1. Check for [file/config] to determine [framework/setup]
2. If [condition A]: use [approach A]
3. If [condition B]: use [approach B]
4. If unknown: [fallback behavior]

## Execution
[Proceed with detected context]
```

---

## Pattern 5: Domain-Specific Intelligence

**What it is:** Encodes deep domain knowledge, rules, and heuristics directly into the skill. The skill IS the expert.

**When to use:**
- Skills that enforce standards (security, code style, accessibility)
- Checklist-driven workflows (audits, reviews, compliance)
- Skills that must say "no" to certain patterns

**Key techniques:**
- Embed rules explicitly, not implicitly
- Include examples of GOOD and BAD patterns
- Reference authoritative sources (specs, docs)
- Make rules checkable (yes/no, not subjective)
- Separate rules from workflow (rules section + workflow section)

**Example skills:** web-design-guidelines, email-and-password-best-practices, two-factor-authentication-best-practices

**Template structure:**
```
## Rules

### Rule 1: [Name]
- Enforce: [what must be true]
- Good: [example]
- Bad: [example]
- Why: [rationale]

## Audit Workflow
For each rule: check → flag violation → suggest fix
```

---

## Choosing a Pattern

| Situation | Best Pattern |
|-----------|-------------|
| Step-by-step process with user checkpoints | Sequential Workflow (#1) |
| Needs GitHub + Slack + Jira together | Multi-MCP Coordination (#2) |
| User needs to iterate on creative output | Iterative Refinement (#3) |
| Must work on React AND Vue AND Svelte | Context-Aware Tool Selection (#4) |
| Enforcing security/style/accessibility rules | Domain-Specific Intelligence (#5) |

Most complex skills combine 2+ patterns. For example, skill-builder uses #1 (sequential phases) + #3 (iterative refinement in the review phase) + #5 (domain knowledge about skill best practices).
