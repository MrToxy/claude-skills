---
name: triage-init
description: >
  One-time setup for the auto-triage pipeline on a project. Interviews you, detects the
  project's repo shape and issue tracker(s), builds the routing map, writes
  .claude/auto-triage.config.json, and creates the routing labels in the tracker. Use when
  onboarding a new project to auto-triage, or when asked to "set up triage", "configure
  auto-triage", or "add triage to this repo". After it finishes, run `/loop /triage` from
  the project root. Produces config only — it does not run triage itself.
---

# triage-init — set a project up for auto-triage

Goal: turn the **current project** (cwd root) into a ready-to-run auto-triage target. Output
is `<cwd>/.claude/auto-triage.config.json` + the tracker labels it references. Run `triage`
afterwards; this skill never triages.

Read first: `../triage/skill/references/config-schema.md` (installed at
`~/.claude/skills/triage/references/config-schema.md`) — the exact file you are producing.

Interview one decision at a time; confirm before any mutation. Steps:

## 1. Detect project shape (read-only)
- `git -C . remote -v` at root and one level down; list branches of each remote.
- Classify: **single-repo app** (one repo at root → routing shape B, `localCheckout: "."`) vs
  **container of checkouts** (several sibling dirs cloned from one or more repos → shape A,
  one target per checkout/branch).
- Present what you found; let the user correct it.

## 2. Pick tracker(s)
- Ask which tracker(s): Linear, GitHub, or several. For each, pick `interface`
  (`mcp:linear-server` if the MCP is connected; else `cli:gh` for GitHub).
- **Linear**: `list_teams` → `list_projects` → confirm team/project; `list_issue_statuses`
  → map `QUEUED/CLAIMED/NEEDS_HUMAN` to real state names (don't invent; show the options). Also map
  the optional `IN_REVIEW` to a review status if the team has one (e.g. `"In Review"`) — where an
  item lands once its draft PR opens; if the team has no such column, omit it (items then stay in the
  CLAIMED status after their PR, never churned).
- **GitHub**: confirm `repo`; states are labels (`label:triage` / `label:in-progress` /
  `label:needs-plan`, plus the optional `label:in-review` for `IN_REVIEW`) — these get created in
  step 5 too. Omit `IN_REVIEW` to leave items on `label:in-progress` after their PR.

## 3. Build routing
- **Shape A**: agree the site→label list with the user; for each, resolve `{repo, base,
  localCheckout, kind}` from the detected remotes/branches. Verify every `base` branch exists
  (`gh api repos/<repo>/branches/<base>` or `git branch -r`). Flag any that don't.
- **Shape B**: single `default` target, `siteLabels: []`.
- Set `kind` per target (`web` / `backend`); only `web` siblings participate in bug-spread.

## 3b. Detect each target's verification environment → sidecars (container runner)
For each target, inspect how its declared verification gets its infra, then emit `sidecars` +
`sidecarEnv` from the **recipe catalog** in `config-schema.md` (read-only detection; show findings):
- grep deps + test setup for **testcontainers** (`@testcontainers/*` / `testcontainers` in
  `package.json`; `new *Container(` in a global-setup) → `dind` + `DOCKER_HOST`/`TESTCONTAINERS_*` env.
  The repo runs its verification unchanged — no repo edits needed.
- else grep for an **injected DB** the tests expect (`DB_HOST` reads + a compose/`.env` postgres, no
  testcontainers) → `postgres` sidecar + `DB_*` env.
- grep for **headless browser / e2e** (Playwright, `agent-browser`, a UI gate) → `browser` + CDP env.
- **DynamoDB** (`dynamodb-local`, `DYNAMODB_ENDPOINT`) → `dynamodb` sidecar + endpoint env.
- pure unit / no external infra → `sidecars: []`.
Show the per-target services you'll add and confirm before writing (step 4). This is the piece that
makes "onboard a repo → it declares its own provisioning" work; skip it and the Mac-local runner is
unaffected (it ignores sidecars).

## 4. Write the config
- Assemble per `config-schema.md`; default `claimMarker` `🤖 auto-triage`, `limits` `3/3/2`,
  `pr` all-true. **Show the full JSON and get explicit approval.**
- Write `.claude/auto-triage.config.json`. Ensure `.claude/auto-triage.state.json` is gitignored.
- The agent's sandbox may block writing under `.claude/`. If so, print the JSON and the
  exact path and ask the user to save it (or to `/sandbox`-allow `.claude/`).

## 5. Create the routing labels (mutates the tracker — confirm first)
- Show the labels to be created and where, then create them:
  - **Linear**: `create_issue_label` per site label, scoped to the team (`teamId`), with a
    description naming its route (e.g. `→ <repo> @ <base>`). Skip any that already exist
    (`list_issue_labels`).
  - **GitHub**: `gh label create <state-label>` for the queue/claim/needs-plan labels (and
    `in-review` if `IN_REVIEW` is mapped).
- Shape B (no site labels): create only the tracker's state labels if it's GitHub; Linear
  shape B needs none.

## 6. Verify the repo declares its verification
- Check each target repo for a verification section in `AGENTS.md` / `CLAUDE.md` / `cloud.md`.
  `triage-resolve` defers entirely to it — if absent, **warn** that triage will verify with only
  whatever exists, and offer to draft one.

## 7. Hand off
Print: config path, labels created, any branches/verification gaps flagged, and the exact
next command — `/loop /triage` (or `/triage <ITEM-ID>` for a single dry-run) **from this
project root**, in a fresh session so the skill is loaded.

## Guardrails
Read-only until step 4. Never create labels or write config without showing the plan and
getting a yes. Idempotent: re-running detects an existing config/labels and offers to update
rather than duplicate.
