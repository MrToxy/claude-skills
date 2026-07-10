---
name: triage-cleanup
description: >
  Janitor for the auto-triage pipeline. Finds tickets left CLAIMED (carrying the auto-triage
  claimMarker) with no attached PR or plan, whose claim is older than a threshold — i.e. a run
  that crashed, timed out, or was abandoned — and returns them to the queue so they get retried.
  Use as `triage-cleanup [<minutes>]`, or when asked to unstick / reap stale auto-triage claims.
  Tracker- and project-agnostic; reuses the triage config + tracker binding. Read-mostly: only
  posts a comment and a status transition — never edits code, never opens PRs.
---

# triage-cleanup — unlock stale claims

The pipeline's invariant is that a CLAIMED ticket exits to a PR or to NEEDS_HUMAN — never back
to the queue on its own. But an unattended run can die mid-flight (crash, `maxTicketMinutes`
timeout, operator `abandon`), leaving a ticket stuck CLAIMED with nothing attached. This skill
is the safety net that frees those.

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

1. **Find candidates** — items currently `CLAIMED` (mapped per tracker) that carry the
   `claimMarker` comment.
2. **Filter to stale + orphaned** — keep only those where BOTH:
   - the `claimMarker` comment is **older than `<minutes>`** (read its timestamp), AND
   - there is **no attached auto PR and no attached plan issue** (an in-flight or completed run
     would have attached one). A ticket with a PR/plan is healthy — leave it.
3. **Return to queue** — for each stale+orphaned item: `comment`
   "🤖 auto-triage: previous run did not complete; returning to queue for retry" and
   `setState → QUEUED`. (Idempotent: re-running finds nothing once it's back in the queue.)
4. **Output** — your entire final message is JSON: `{"reaped": ["<id>", ...]}` (empty array if none).

## Guardrails
- Never touch a ticket that has a PR/plan attached, or whose claim is younger than the threshold.
- Only `comment` + `setState`; never edit code, push, merge, or delete.
- Conservative on uncertainty: if you can't determine claim age or attachments, **leave it** (a
  human will see it stuck) rather than risk un-claiming live work.
