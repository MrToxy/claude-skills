---
name: triage-resolve
description: >
  Project- and tracker-agnostic engineering pipeline. Given a normalized work-item plus one or
  more targets ({repo, base, local checkout, site}), it implements the change with plan-with-docs
  + TDD in an isolated worktree, runs the REPO'S OWN declared verification (whatever its
  AGENTS.md / CLAUDE.md / cloud.md prescribes), then mandatory pipeline gates — an agent-browser
  visual regression for UI changes and `/simplify` + `/code-review` for code changes — then hands to
  the independent `triage-verifier` agent before opening a DRAFT pull request. For bug-kind
  items it propagates a verified fix to other sites that actually reproduce it. Returns PR URLs;
  performs no tracker calls. Usable standalone to resolve a branch against an AC checklist.
---

# triage-resolve — solve · verify · ship

Pure engineering core. No tracker calls. Input = a normalized item + targets; output =
`{ prs: [{site, url, needsOnDevice?}], humanFallbacks: [{site, reason}], blocked: [{site, reason}] }`. All
worktree/PR work uses `git`/`gh`. Reads `limits` from `.claude/auto-triage.config.json`.

`humanFallbacks` vs `blocked`: a **humanFallback** is a *product* call on an otherwise-healthy run
(ambiguous fix, diverged site). **blocked** is a *technical* dead-end you cannot overcome —
a tool denied by permissions, a missing/broken tool, an unrecoverable error. Never silently finish
or fake a green check; surface the block so the orchestrator records it.

## Input

```
{ id, title, body, kind, branchName, acceptanceHints?,
  targets: [ { repo, base, localCheckout, site } ] }   // 1 = single; >1 = replicate
```

## Per target — the resolution unit
(up to `limits.maxConcurrentSubagents` at a time)

### 1. Isolate
Use the **deterministic** worktree path `../.worktrees/<id>-<site>` (relative to `localCheckout`).
**Idempotent start** — first clear any orphan a prior crashed/killed run may have left, so retries
self-heal, then create fresh:
- `git -C <localCheckout> worktree remove --force ../.worktrees/<id>-<site> 2>/dev/null; git -C <localCheckout> worktree prune`
- `git -C <localCheckout> branch -D <branchName> 2>/dev/null`  (the branch may already exist)
- `git -C <localCheckout> worktree add ../.worktrees/<id>-<site> -b <branchName> <base>`
Never work in the live checkout; never commit to `base`. Remove the worktree on completion.
> **`localCheckout` may be a *bare* repo** — object store only, no working tree at its root (the
> container clones bare to skip a redundant base checkout). So do **everything inside the worktree**
> at `../.worktrees/<id>-<site>`: all reads (`AGENTS.md`/`CLAUDE.md`/`cloud.md`/`package.json`/source),
> dependency install (`npm ci`), the verification loop, `git add`/`commit`, `git push origin
> <branchName>`, and `gh pr create`. Never read from, install into, or run commands at the
> `localCheckout` root — a bare checkout has nothing there. (`git -C <localCheckout> worktree …` in
> step 1 is fine — those are object-store ops, not working-tree reads.)

### 2. Implement — Agent A (general-purpose subagent)
1. Read the repo's conventions first (`AGENTS.md`, `CLAUDE.md`, `cloud.md`, `README`) — from inside the worktree.
2. `plan-with-docs` — self-driven; document assumptions. The plan MUST emit an explicit,
   testable **Acceptance Criteria** checklist — the rubric the verifier judges against.
3. Implement with **TDD**.
4. **Run the repo's own declared verification.** What "verified" means is defined by THIS repo —
   its `AGENTS.md` / `CLAUDE.md` / `cloud.md` (fallback: `.github/workflows`, `package.json`
   scripts). It includes whatever the repo prescribes:
   type-check, lint, unit/integration tests, and any regression / E2E / on-device checks. The repo
   declares its own **stack-specific** loop here (the pipeline reads it, doesn't assume it); the
   pipeline's own **cross-cutting** gates — visual regression for UI, `/simplify` + `/code-review`
   for code — are mandatory on top and live in step 3. Loop until the repo's bar is green. (If a
   repo declares no verification, that itself is a signal — surface it rather than inventing one.)
   **Environment capability:** if a declared check needs hardware this runner lacks — a real device
   or an OS-level **simulator/emulator** (iOS Simulator / `xcodebuild` need macOS; an accelerated
   Android emulator needs nested virt) — that is **not** `blocked` (the rest still verifies) and
   **not** a silent pass. Detect the tool's absence (`maestro` / `xcodebuild` / emulator), classify it
   a **device/sim check**, and route it to the hand-off in step 3 — never crash, never green it.
5. Commit + push (from the worktree; `git push origin <branchName>`). Return `{ branch, ac, evidence, summary }`.
6. **Cannot proceed?** A tool denied by permissions, a missing/broken tool, or any error you cannot
   overcome → **STOP**. Do not ask interactively, do not destructively work around the denial, do
   not commit a half-change. Abort this target with `blocked: { reason }` (quote the exact denial/
   error + the manual action that would unblock it). Tell any subagent you spawn to do the same.

### 3. Prove the change — mandatory gates BEFORE the adversarial verifier
The repo's own loop (step 2.4) is the **floor, not the ceiling**. Type-check + lint passing does
NOT mean the bug is fixed: a change can be green yet **visually inert** — e.g. removing a class
that never applied at the reported resolution, so the pixels never move. These gates are
pipeline-owned and run regardless of what the repo declares:

- **UI-related change** (anything that renders or visually affects a page) → run an **agent-browser
  visual regression**. Render the affected page under the issue's **reported conditions** — if the
  issue names a viewport / device / resolution, use **exactly** that — and prove the reported
  symptom is actually GONE, not merely that the page still renders. The diff must **demonstrably
  move the pixels that matter**: capture before (base) vs after (branch) screenshots and confirm the
  symptom resolved. A change that doesn't visibly alter the symptom **FAILS this gate → no PR**.
  Fold the symptom into the Acceptance Criteria as an observable check at the reported resolution.
  **Browser source:** if `$AGENT_BROWSER_CDP_URL` is set (the containerized runner attaches to a
  headless-Chrome **sidecar** over remote CDP), first `agent-browser connect "$AGENT_BROWSER_CDP_URL"`,
  and serve the app bound to `0.0.0.0` (e.g. `next dev -H 0.0.0.0`) so the sidecar reaches it at
  `http://triage:<port>`. If it's unset (local Mac), agent-browser launches Chrome itself — the
  snapshot/screenshot commands are identical after that.
- **Touches code/logic** → run **`/simplify`** (the code-simplifier) on the change, then
  **`/code-review`**, and resolve their findings before proceeding.
- **Needs a device/sim this runner can't provide** (diff touches `ios/`, `android/`,
  `capacitor.config.*`, `e2e/maestro/`, a native plugin, or link/scheme/deep-link handoff) → you
  **cannot** prove it here. Do NOT skip-and-green, do NOT `blocked`. Run every check you *can*, then
  mark the affected Acceptance Criteria **`deferred-on-device`** and carry a
  **`needs-on-device-verification`** hand-off: exactly which flows / platforms / native outcomes a
  human must run (cite the repo's own coverage table). Absence of `maestro` / `xcodebuild` / an
  emulator is *classified*, never an error.

A change may hit several of these (UI + code + device/sim) — run each that applies. Only a change
that clears the gates it **can** run here reaches the adversarial verifier; device/sim-deferred
items proceed too, but flagged (step 5).

### 4. Independent verify — `triage-verifier` agent (read + test only)
Spawn clean — fresh worktree of the *pushed* branch, zero implementation context — with
`{ item, ac, diff }`. It re-runs the repo's verification **and the step-3 gates** from scratch
(re-render the UI symptom at the reported resolution; don't take the implementer's word), judges
each AC with evidence, runs the anti-gaming checks, and returns `{ pass, perAc, gamingFlags, deferredOnDevice, notes }`.
**Gate:** a full draft PR opens only if `pass` and no `gamingFlags`. If the *only* non-passes are
`deferredOnDevice` (no real AC failure, no `gamingFlags`), open a **flagged** draft PR per step 5 —
a device limitation the runner can't clear is not a fail. A genuine failure still blocks the PR.

### 5. Reconcile
- pass → open **DRAFT PR** into `base` (body: item id, ticked AC, verification + regression evidence). Record `{site, url}`.
- pass **except** AC marked `deferred-on-device` (no fails, no gaming) → open the **DRAFT PR**
  anyway, add the **`needs-on-device-verification`** label + a comment listing the deferred checks,
  leave those AC unticked with the reason, and record `{site, url, needsOnDevice:[checks]}`. The PR
  must **not** claim device/mobile verification it didn't run.
- !pass within `limits.implementVerifyRetries` → back to Agent A with the verifier's report; re-verify.
- still !pass → no PR; `humanFallbacks += {site, reason}`.
- Agent A aborted on a technical dead-end → no PR; `blocked += {site, reason}` (not a humanFallback).

## Bug spread (bug-kind items only, after the origin target passes verify)

Why bug-only: a feature is built for one site **on purpose**, but a bug is an accidental defect
in code the sites **share** — so a fix that stops at the origin leaves the same bug shipping
elsewhere. Spread = bug-fix propagation, never a general broadcast.

For each other `kind: web` site in `routing.map`:
1. **Reproduce before replicating** — confirm the buggy path exists AND the bug actually
   reproduces there (run the repo's own regression check). Doesn't reproduce → skip (diverged / never affected).
2. Reproduces → run the same resolution unit (fix **adapted** to that site's differences →
   verifier → draft PR). Each site must pass its own verification, not inherit the origin's.
3. Adapting is ambiguous because the site drifted → no PR; `humanFallbacks += {site, "diverged; needs human"}`.

Scope = `web` sites in routing; other repos are out of the spread.

## Guardrails
Isolated worktrees always; draft PRs only; never merge / push a base; clean up worktrees on
completion; bounded retries; on a product dead-end return a `humanFallback`, never a broken PR.
Any error you cannot overcome (permission denial, broken tool/env, unrecoverable failure) → return
`blocked` and stop: never ask interactively, never finish silently, never fake a green check to
open a PR. Surfacing beats limping on.
