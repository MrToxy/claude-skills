---
name: triage-cleanup
description: >
  Janitor for the auto-triage pipeline. Scans tickets left CLAIMED (carrying the auto-triage
  claimMarker) whose claim is older than a threshold — a run that crashed, timed out, or was
  abandoned — and reconciles each to its true state: a ticket that already has an open auto-PR is
  healthy (→ IN_REVIEW, or left CLAIMED — never reaped), one with an attached plan issue goes to
  NEEDS_HUMAN, and only a genuinely orphaned one (no PR, no plan) returns to the queue for retry.
  Use as `triage-cleanup [<minutes>]`, or when asked to unstick / reap stale auto-triage claims.
  Tracker- and project-agnostic; reuses the triage config + tracker binding. Read-mostly: only
  posts a comment and a status transition — never edits code, never opens PRs.
---

# triage-cleanup — reconcile stale claims

The pipeline's invariant is that a CLAIMED ticket exits **forward** — to a PR (→ `IN_REVIEW`, or
left CLAIMED awaiting merge) or to NEEDS_HUMAN — never silently back to the queue. But an unattended
run can die mid-flight (crash, `maxTicketMinutes` timeout, operator `abandon`) before it makes that
exit, leaving a ticket stuck CLAIMED. This skill is the safety net: for each stale claim it reads
what the run actually produced and **finishes the transition the dead run owed**, instead of assuming
the worst and re-queuing.

Reaping is the **last** resort — only for a claim with genuinely nothing to show. A stale claim that
already carries an open auto-PR is a *completed* run that merely died before moving the ticket;
returning it to the queue (the old behavior) re-triages finished work on the next tick, which then
re-claims it, and so on — the reaper churn this skill must not cause.

It is intentionally a **separate skill** from `triage`: triage *processes* the queue, this
*cleans up after* it — a different job (maintenance), even though it shares the same config and
tracker semantics.

Read first (cwd-relative — run from the project root; shared with `triage`, single source):
- `.claude/auto-triage.config.json` — `trackers`, `routing`, `claimMarker`, canonical states.
- `~/.claude/skills/triage/references/tracker-binding.md` — capabilities (`getItem`/`comment`/`setState`) per tracker.
- `~/.claude/skills/triage/references/work-item-schema.md` — canonical states + capability contract.

## Invocation
`triage-cleanup [<minutes>]` — `<minutes>` is the stale threshold (default **60**). The daemon
passes `reaper.stuckAfterMinutes`.

## Procedure (per enabled tracker)

1. **Find candidates** — items currently `CLAIMED` (mapped per tracker) whose `claimMarker` comment
   is **older than `<minutes>`** (read its timestamp). A younger claim is live work — skip it.

2. **Reconcile each candidate to its true state.** A stale `CLAIMED` item is a run that died before
   it could transition itself — so read what it actually produced and finish the transition it owed.
   Do **not** blindly return it to the queue. In order:
   - **Open auto-PR exists** — `hasOpenAutoPR` (an open PR whose head is the item's `branchName`; the
     robust SCM query in `~/.claude/skills/triage/references/tracker-binding.md`, **not** a tracker
     attachment lookup). The work completed; the run just died before moving the item. **Self-heal,
     never reap:** `setState → IN_REVIEW` if `states.IN_REVIEW` is mapped, else **leave it `CLAIMED`**
     (still don't reap — it is healthy). This is the case that caused the churn: an item carrying a
     PR must never go back to the queue.
   - **Else an auto plan issue is attached** — a HUMAN-path run that filed the plan but died before
     transitioning → `setState → NEEDS_HUMAN`.
   - **Else genuinely orphaned** (no open PR, no plan) — the run crashed with nothing to show:
     `comment` "🤖 auto-triage: previous run did not complete; returning to queue for retry" and
     `setState → QUEUED`.

3. **Output** — your entire final message is JSON:
   `{"reaped": ["<id>", ...], "reconciled": [{"id":"<id>","to":"IN_REVIEW"|"NEEDS_HUMAN"}, ...]}`.
   `reaped` = items returned to the queue; `reconciled` = items self-healed forward (omit items left
   `CLAIMED` unchanged). Both empty if nothing matched. Idempotent: a re-run finds each item already
   in its resolved state and does nothing.

## Guardrails
- **An open auto-PR means healthy — never reap it.** The item goes to `IN_REVIEW` (if mapped) or
  stays `CLAIMED`; it never returns to the queue. This is the invariant the churn violated.
- Detect that PR by **head branch = `branchName`** (the robust SCM query), not by reading tracker
  attachments — a run can die after `gh pr create` but before `attachLink`, so the PR exists with no
  attachment yet. An attachment is a fallback signal, never the primary one.
- Never touch a ticket whose claim is younger than the threshold.
- Only `comment` + `setState`; never edit code, push, merge, or delete.
- Conservative on uncertainty: if you can't determine claim age, or whether a PR exists, **leave it**
  (a human will see it stuck) rather than risk un-claiming live work or reaping a healthy item.
