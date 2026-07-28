# Tracker binding — one contract, any tracker

The pipeline never calls Linear or `gh` directly in its logic. It calls a fixed set of
**capabilities**; this file says how to realize them against whatever interface a tracker
exposes. There is **no hand-written adapter per tracker** — each tracker just declares a `type`
and an `interface` in config, and you bind at runtime by discovering the available tools/commands.

## Capabilities the pipeline needs
`fetchQueue · getItem · provideBranchName · isClaimed · claim · comment · attachLink · setState`
(defined in `work-item-schema.md`).

## Interfaces — `trackers.<name>.interface`

- **`mcp:<server>`** — use that MCP server's tools; discover them from the live tool list.
  - Linear (`mcp:linear-server`): `list_issues`, `get_issue`, `save_issue`, `save_comment`,
    `create_attachment`, `list_issue_statuses`, `list_comments`.
- **`cli:<command>`** — use that CLI; discover with `<command> --help`.
  - GitHub (`cli:gh`): `gh issue list/view/edit/comment`, `gh pr …`; labels carry state.

Mapping each capability to the right call for the configured interface is deliberately **not**
pre-written here.

## States — resolve live, never hardcode ids
Do not store state ids in config. Map canonical → tracker **names** in `trackers.<t>.states`,
then resolve specifics at runtime:
- Linear: `list_issue_statuses({ team })` → look up the id for the named state when transitioning.
- GitHub: states are labels/Projects columns; `states` uses `label:<name>` (add/remove labels).
- `IN_REVIEW` is **optional**: if `states.IN_REVIEW` is set, transition to it when a target's draft
  PR opens (Linear: an "In Review" workflow status; GitHub: `label:in-review`, swapped in for the
  CLAIMED label — the issue is left **open**, the pipeline never closes tracker items). If it is
  unset, the item stays CLAIMED after its PR — never churned, because the reaper treats an open
  auto-PR as healthy (below).

## Open auto-PR detection (SCM, shared)
`hasOpenAutoPR(item)` — true iff an **open** PR exists whose **head branch** is the item's
`branchName`, in any repo the item routes to (resolve targets from `routing.map` exactly as
`triage --list` does). GitHub realization, per target repo:
`gh pr list --repo <repo> --head <branchName> --state open --json url,isDraft` — a **draft** counts
(the work is done, awaiting review); non-empty ⇒ true. `branchName` is the tracker's `gitBranchName`
or the derived `auto-triage/<id>-<slug>` — the exact branch `triage-resolve` pushed. This is the
single source of truth for "work already in flight"; never re-derive it from tracker attachments,
which lag PR creation. Used identically by `triage --list`, the claim gate, and `triage-cleanup`.

## Branch name
`provideBranchName`: if the tracker supplies one (Linear `gitBranchName`), use it verbatim;
otherwise derive `auto-triage/<id>-<slug>`.

## Identity & dedup
- `claimMarker` (config) marks a comment as **the bot's** — every comment the pipeline writes starts
  with it. The item's single **status comment** is identified by the narrower prefix
  **`<claimMarker> status:`**, which no other comment may ever use.
  Keeping those two apart is load-bearing. While "the `claimMarker` comment" also matched the block
  notice, the PR notice and the "add a site label" ask, any item that had *ever* been commented on
  read as a claim — so a ticket that was never claimed was reaped every tick — and an upsert would
  overwrite a human-facing comment instead of the status line.
- Neither marker is a claimability signal: **state** (QUEUED vs not) decides what's claimable, so a
  re-queued ticket with a lingering marker stays claimable.
- Item ids are tracker-local; the cursor and branch names are per-tracker, so ids never collide
  even when several trackers run at once.

## Claim age & failed attempts — read the tracker's own history, never comments
Reconstructing these from comments is what made the pipeline comment to keep score. Both are native:
- `claimedSince(item)` — when the item entered CLAIMED. Linear: `get_issue` → `stateHistory`, the
  **current** entry (`endedAt: null`); if its state is not the mapped CLAIMED state the item is not
  claimed at all, so there is no claim to age and nothing to reap. GitHub: the timeline event that
  added the CLAIMED label.
- `failedAttempts(item)` — how many runs already died on it: the number of **CLAIMED → QUEUED**
  transitions in that same history. Feeds `triage-cleanup`'s retry cap.

## Notification budget — comment only when a human must act
Every **new** comment notifies every subscriber of the item. Comments are therefore a scarce
resource, not a log: the daemon's own logs are the audit trail, the tracker is for humans.

1. **No state change ⇒ no write.** If a pass leaves the item in the state it already had, it writes
   **nothing** — no comment, no label, no edit. "Nothing changed" never justifies a notification.
   (This is the rule that was broken: one ticket collected 12 identical "returning to queue for
   retry" comments, plus "stale claim reconciled … remaining in work queue" no-ops.)
2. **One status comment per item, edited in place.** All machine lifecycle — claim, attempt count,
   last outcome — lives in a single bot-owned comment whose body starts with `<claimMarker> status:`
   (and nothing else may start with that): created on first claim, thereafter **updated**, never
   re-posted. Editing a comment does not notify subscribers, so lifecycle churn is silent.
   Realization: `list_comments` → the first comment whose
   body starts with `<claimMarker> status:` → Linear `save_comment({ id, body })`; GitHub
   `gh api --method PATCH /repos/<repo>/issues/comments/<id> -f body=…`. Absent → create it once.
   Skip the write entirely when the body would be unchanged.
3. **New comments are allowlisted, once each.** Only these earn a notification, because each names
   something only a person can do next:
   - a draft PR opened — one comment per PR (the deliverable),
   - NEEDS_HUMAN: a plan issue filed, or a `humanFallback` a person must pick up,
   - `triage-blocked` + reason (a person must clear the label),
   - un-routable item: no routing site label, so it can never be picked up (a person must add one).
   Everything else — claim, re-queue for retry, "stale claim reconciled", scope skip, dependency
   wait, `hasOpenAutoPR` skip, any no-op reconcile — updates the **status comment** instead.
4. **Dedup before posting.** `list_comments` first: if an existing bot comment already carries that
   PR url / plan issue / block reason / "add a site label" ask, update it or stay silent — never post
   it again. Re-stating a fact already on the item is a duplicate notification, not an audit trail.
5. **Never write the item's title or description.** The pipeline touches comments, labels, state and
   attachments only. (A past run appended "previous run did not complete…" into a ticket's
   *description* — spam and data loss at once.)
