---
name: triage
description: >
  Recurring auto-triage orchestrator. Polls the issue tracker(s) configured in
  auto-triage.config.json (Linear, GitHub, … — one or many, at once) for queued issues,
  normalizes each to a work-item, routes by label, then either delegates to `triage-resolve`
  (draft PR) or files a plan issue for human review. Tracker- and project-agnostic — every
  specific lives in config. Run by the scheduler each tick, or `triage <ITEM-ID>` for a
  single dry-run.
---

# triage — orchestrator

The **director**: owns sequence, routing, gating, and tracker sync. It reasons about no repo
internals (that is `triage-resolve`) and binds to no tracker in code — it expresses everything as
**capabilities** (fetch / claim / comment / transition) realized per tracker via the binding
(`references/tracker-binding.md`). Adding a tracker = one config entry, no skill changes.

Read first (cwd-relative — the scheduler runs from the project root):
- `.claude/auto-triage.config.json` — `trackers`, `routing`, `limits`. The only project-specific file. (Don't have one? run `triage-init` first.)
- `.claude/auto-triage.state.json` — the incremental cursor (auto-created first run; see below).
- `references/config-schema.md` — the config's exact shape, incl. the two routing modes.
- `references/work-item-schema.md` — normalized item + capability contract.
- `references/tracker-binding.md` — how to realize a capability against an MCP or CLI tracker.

## Cadence & incremental cursor

The interval ("every 5 min") lives in the scheduler (`/loop 5m /triage`), not here. To avoid
re-examining the same issues every tick, keep a **per-tracker** cursor in
`.claude/auto-triage.state.json`:

```
{ "<trackerName>": { "lastCheckedAt": "<ISO8601>", "lastItem": { "id": "...", "updatedAt": "<ISO8601>" } } }
```

Each tick, per tracker, query only items with **`updatedAt` > `lastCheckedAt`** — `updatedAt`,
not `createdAt`, because an issue can be *moved into* the queue long after it was created and a
createdAt window would miss it. Tie-break equal timestamps with `lastItem.id`. After the pass,
write the new `lastCheckedAt` (now) + the newest item seen.

The cursor is only an **efficiency window**. Authoritative dedup is still the claim transition
+ `claimMarker` (step 2) — it survives clock skew, missed ticks, and re-queued items, which a
timestamp alone cannot.

## Modes

The daemon drives this skill **per ticket**: it calls `--list` once to discover work, fans out
one `triage <ID>` per ticket in parallel, then runs the separate `triage-cleanup` skill to
unstick anything that died. The modes:

- **`triage --list`** — *read-only discovery*. Output **only** a raw JSON array of claimable
  tickets starting with `[` — **no prose, no markdown code fences** — each an object `{"id","sites"}`,
  e.g. `[{"id":"ABC-552","sites":["server"]},{"id":"ABC-645","sites":["site-a"]}]`. `sites` = the
  routing site keys the ticket maps to (its site labels ∩ `routing.siteLabels`; single-repo `default`
  mode → `["default"]`; a ticket routing to ≥2 same-repo sites lists them all).
  **Filter at the query, not after.** Fetch the queue already narrowed by **state** and — in
  label-gated mode — by **site label** (e.g. Linear `list_issues` with a state+label filter; GitHub
  `gh issue list --label <queueLabel>`, then keep only issues carrying ≥1 site label), so a route-less
  ticket is never even retrieved. This is what stops a label-less ticket from reaching a costly
  per-ticket run.
  Claimable = `QUEUED`,
  carries a routing site label (label-gated mode) or single-repo `default`, `hasOpenAutoPR` is
  **false** (no open PR already exists for its `branchName` — the shared SCM check, see
  `references/tracker-binding.md`), does **not** carry the `triage-blocked` label, and is **not
  dependency-blocked** (Linear: no open `blocked by` relation whose blocker isn't yet Done — see
  **Dependency gate**). A ticket with
  **no** routing site label in label-gated mode is **not claimable** — never list it; its `sites` is
  empty, which is never a valid entry (the daemon deterministically drops any empty-`sites` straggler).
  **State is the source of
  truth** — a `QUEUED` ticket is claimable even if it still carries a stale `claimMarker` comment
  from a prior run that crashed and was re-queued; do NOT exclude on marker presence. The one
  exception is `triage-blocked`: that label means a human must intervene before a retry, so exclude
  it (a human clears the label to re-enable the ticket). **Claim or modify nothing.**
  **Site scope is NOT decided here.** Report **every** claimable ticket regardless of
  `TRIAGE_ONLY_SITES`, always populating `sites` — the daemon drops out-of-scope tickets
  deterministically from that field (it does not trust the cheap model to filter). This run's job is
  to *report* each ticket's sites, never to *decide* scope.
- **`triage <ITEM-ID>`** — *one ticket through the whole pipeline* (the Procedure below). Claims
  it, decides, resolves or surfaces, opens a draft PR, syncs back. This is the unit the daemon
  fans out, and also the manual dry-run lever.
- **Queue mode** (`triage`, no arg) — manual: process up to `limits.maxIssuesPerTick` oldest
  queued items in one session. Not used by the daemon (which prefers per-ticket fan-out).

## Dependency gate (blocked-by)

A human splits a cross-repo feature into per-repo sub-tickets linked by **`blocked by`** relations that
express order (e.g. the website sub-ticket is *blocked by* the BisonDesk one). While any blocker is
unsatisfied the dependent is **dependency-blocked**: not claimable — skipped and left `QUEUED` for a
later tick. This is a benign wait, distinct from the **Blocked protocol** (an unrecoverable error) and
from the `triage-blocked` label.

- **Linear only.** At claim time fetch relations (`get_issue` with `includeRelations: true`) and read
  `relations.blockedBy`. Empty → not dependency-blocked. Other trackers: no-op unless they expose an
  equivalent.
- **Satisfied = blocker terminal** — its `statusType` is `completed` (Done) or `canceled`. Any blocker
  not satisfied → dependency-blocked. (If a `blockedBy` element omits the blocker's status, resolve it
  with one `get_issue` on the blocker id.)
- **Applies in `--list` and at claim** — same check both places, so a dependency-blocked ticket is
  never reported claimable and never claimed; it just waits.

Release signal: a human merges + deploys the blocker's PR, then moves the blocker to Done — the
dependent un-blocks on the next tick.

## Procedure (per enabled tracker, per tick)

1. **Fetch queue** — capability `fetchQueue` over `trackers.<t>.scope`, filtered by the cursor.
   Empty → write cursor, continue to next tracker.

2. **Per item — CLAIM (idempotency gate).** Re-fetch (`getItem`).
   - Skip if no longer `QUEUED`, `hasOpenAutoPR` is true (an open PR already exists for its
     `branchName` — the work is in flight; see `references/tracker-binding.md`), or it carries the
     `triage-blocked` label (a prior run hit an unrecoverable block — wait for a human). Do NOT skip
     on a lingering `claimMarker` — a `QUEUED` ticket was re-queued for retry; **state is authoritative**.
   - **Dependency gate (blocked-by).** Skip if the item is *dependency-blocked* — leave it `QUEUED` for
     a later tick (a benign wait, not the Blocked protocol). See **Dependency gate** above.
   - **Label-gated mode** (`siteLabels` non-empty): skip + leave for human if it has none of them.
     **Single-repo mode** (`siteLabels` empty + a `default` target): never skipped on labels.
   - **Out of `TRIAGE_ONLY_SITES` scope** (env set + the item routes to a site not in it): skip and
     leave it `QUEUED` for an in-scope tick — do NOT claim (this runner lacks that site's checkout
     and sidecars). This is a benign scope skip, not the Blocked protocol.
   - Else `setState → CLAIMED` + `comment` the `claimMarker`.
   - **Invariant: a claimed item never *silently* returns to QUEUED** — it exits to a PR
     (→ `IN_REVIEW`, or stays `CLAIMED` if that state isn't mapped), to NEEDS_HUMAN, or — only via the
     **Blocked protocol** — back to QUEUED carrying the `triage-blocked` label + a reason comment.

3. **Normalize** → work-item (id, url, title, body, kind, siteLabels, branchName, comments).

4. **Route** against `routing.map` (see `config-schema.md`):
   - **Single-repo mode** → the `default` target.
   - 1 label → one target.
   - ≥2 labels in the **same repo** → *replicate*: one branch+PR per site base.
   - labels spanning **>1 repo** → **HUMAN** (cross-repo coordination is not auto-resolved).

5. **Triage decision** — read-only `Explore` over the primary target. **HUMAN** if ambiguous,
   multi-repo, or >1 viable solution requiring a product call. Else **SOLVABLE**. (Decision stays
   here; only the read-only scan is delegated.)

6. **HUMAN path** — `plan-with-docs` (self-driven) → create a GitHub plan issue in the target
   repo → `attachLink` + `comment` why → `setState → NEEDS_HUMAN`.

7. **SOLVABLE path** — call `triage-resolve` with `{ item, targets }`. It returns
   `{ prs, humanFallbacks, blocked }`. If `blocked` is non-empty (e.g. a tool denied by permissions
   mid-implement, or a step needing manual intervention), run the **Blocked protocol** and stop here.

8. **Sync back & transition.** `attachLink` + `comment` each PR; `comment` each humanFallback. Then
   move the item off the active board by outcome (a `blocked` return was already handled in step 7):
   - **Every target became a PR, no humanFallbacks** → the bot is done: `setState → IN_REVIEW` if
     `states.IN_REVIEW` is mapped for this tracker, else leave it `CLAIMED`. Either way it is now out
     of the queue and — because it carries an open auto-PR — safe from the reaper.
   - **Any humanFallback** (a site still needs a person, whether or not other sites got PRs) →
     `setState → NEEDS_HUMAN`.

9. **Advance cursor**, then **log**: `<ID> → SOLVED(<prs>) | PLAN(<issue>) | HUMAN(<reason>) | BLOCKED(<reason>) | SKIPPED(<reason>)`.

## Blocked protocol

Distinct from the **HUMAN** path (step 6 — a *product/ambiguity* decision, surfaced as a plan
issue). The Blocked protocol fires on **any error or condition the agent cannot overcome on its
own** — a tool denied by permissions, an access/credential failure, a missing/broken tool or
environment, a verification it cannot get green, an unexpected exception, *anything* that needs a
human before work can continue. The rule is **surface, never swallow**: never ask interactively
(headless — the question is lost and the run looks "done"), never silently report success, never
exit quietly on an error, and never destructively work around a denial. If you are unsure whether
an error is recoverable, treat it as blocked and surface it.

When blocked — at any step, including a `blocked` returned by `triage-resolve` or surfaced by one
of its subagents — STOP and surface it:
1. Do **not** ask interactively (headless — the question is lost) and do **not** report success.
2. Emit, as the **final line** of output, exactly:  `TRIAGE_BLOCKED: <one-line reason>` — name the
   failing step and the precise manual action that would unblock it (e.g.
   *"Edit denied for `<path>`; add `//<path>/**` to the daemon's settings allow-list"*).

You do **not** do the tracker bookkeeping yourself. The scheduler detects the block
**deterministically** (from the headless run's `permission_denials` / `is_error` / `subtype` — it
does not rely on your line) and then marks the item on its own tracker via the tracker-agnostic
`triage-block` skill: `triage-blocked` label + return to queue + a reason comment, the same way for
every tracker. Your only jobs are to stop cleanly and state the reason.

## Guardrails
- Draft PRs only; never merge; never push a base.
- Never delete tracker/SCM data — comment / attach / transition only.
- **Any error you cannot overcome** (permission denial, broken environment, unrecoverable failure,
  unexpected exception) → **Blocked protocol** (above): surface it, do not finish silently and do
  not file it as a `humanFallback` (that is only for product ambiguity on an otherwise-healthy run).
- The reaper is the *last* resort — only for a run whose process **died** before it could self-report
  (it cannot run the Blocked protocol). While you are still running, you surface; you never exit quietly.
- Respect `limits`.
