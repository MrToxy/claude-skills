---
name: triage-cleanup
description: >
  Janitor for the auto-triage pipeline. Scans tickets left CLAIMED (carrying the auto-triage
  claimMarker) whose claim is older than a threshold — a run that crashed, timed out, or was
  abandoned — and reconciles each to its true state: a ticket that already has an open auto-PR is
  healthy (→ IN_REVIEW, or left CLAIMED — never reaped), one with an attached plan issue goes to
  NEEDS_HUMAN, and only a genuinely orphaned one (no PR, no plan) returns to the queue for retry.
  Use as `triage-cleanup [<minutes>]`, or when asked to unstick / reap stale auto-triage claims.
  Tracker- and project-agnostic; reuses the triage config + tracker binding. Read-mostly and
  **quiet**: it transitions state and updates one bot-owned status comment in place, and posts a NEW
  comment only when it parks an item at the retry cap — never edits code, never opens PRs.
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
`triage-cleanup [<minutes>] [<maxAttempts>]` — `<minutes>` is the stale threshold (default **60**);
`<maxAttempts>` caps how many times one item may be re-queued before it is parked instead (default
**3**). The daemon passes `reaper.stuckAfterMinutes` and `reaper.maxAttempts`.

## Procedure (per enabled tracker)

1. **Find candidates — strictly `CLAIMED`, strictly stale.** Both facts come from the tracker's own
   state history (`claimedSince`, see `tracker-binding.md`), never from comments: the item's
   **current** state is the mapped `CLAIMED` state **and** it entered that state more than
   `<minutes>` ago. Anything else — `QUEUED`, `IN_REVIEW`, `NEEDS_HUMAN`, or a younger claim — is
   **not a candidate**: leave it completely untouched (no comment, no label, no state write). An item
   that is already in the queue has nothing to reconcile, so writing to it is pure notification spam —
   this is how one ticket accumulated 12 identical "returning to queue for retry" comments while
   never leaving Todo.

2. **Reconcile each candidate to its true state.** A stale `CLAIMED` item is a run that died before
   it could transition itself — so read what it actually produced and finish the transition it owed.
   Do **not** blindly return it to the queue. Reconciling **forward** is a state change the board
   already shows, so do it **silently** — no comment. If the item is already in the state you would
   move it to, do **nothing at all**. In order:
   - **Open auto-PR exists** — `hasOpenAutoPR` (an open PR whose head is the item's `branchName`; the
     robust SCM query in `~/.claude/skills/triage/references/tracker-binding.md`, **not** a tracker
     attachment lookup). The work completed; the run just died before moving the item. **Self-heal,
     never reap:** `setState → IN_REVIEW` if `states.IN_REVIEW` is mapped, else **leave it `CLAIMED`**
     (still don't reap — it is healthy). This is the case that caused the churn: an item carrying a
     PR must never go back to the queue.
   - **Else an auto plan issue is attached** — a HUMAN-path run that filed the plan but died before
     transitioning → `setState → NEEDS_HUMAN`.
   - **Else genuinely orphaned** (no open PR, no plan) — the run crashed with nothing to show. Read
     `failedAttempts` (the item's CLAIMED→QUEUED transitions, `tracker-binding.md`) and branch:
     - `failedAttempts < <maxAttempts>` → **retry silently**: `setState → QUEUED`, and record the
       attempt by **updating the status comment** (the `claimMarker` comment, edited in place). Post
       **no new comment** — a retry is machine bookkeeping, not news for every subscriber.
     - `failedAttempts >= <maxAttempts>` → retrying is not working, so stop the loop instead of
       re-queuing forever: delegate to **`triage-block`** with reason
       `<n> consecutive runs died without producing a PR or plan`. That one notification is the
       actionable one — a human now has to look.

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
- Only `setState` + the status comment; never edit code, push, merge, or delete. **Never** write the
  item's title or **description** (a past run appended "previous run did not complete…" into a
  ticket's description — data loss, not a status).
- **No state change ⇒ no write, ever.** Never comment to announce that nothing changed — no "stale
  claim reconciled", "remaining in work queue", "now processing normally". Those no-op comments are
  the notification spam humans unsubscribe over. See **Notification budget** in `tracker-binding.md`.
- The only reaper action that posts a NEW comment is parking an item at the retry cap (via
  `triage-block`); retries themselves are silent.
- Conservative on uncertainty: if you can't determine claim age, or whether a PR exists, **leave it**
  (a human will see it stuck) rather than risk un-claiming live work or reaping a healthy item.
