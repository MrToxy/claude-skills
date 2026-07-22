# Normalized work-item & capability contract

The pipeline operates **only** on this normalized shape and a fixed set of capabilities. Each
tracker is bound to those capabilities at runtime (see `tracker-binding.md`); the skills never
see a Linear-ism or a GitHub-ism.

## WorkItem

```
WorkItem {
  id          string   // tracker-local id, e.g. "ABC-552" or "#123"
  url         string
  title       string
  body        string   // markdown
  kind        enum     // bug | feature | improvement | chore | question
  siteLabels  string[] // subset of routing.siteLabels — drives routing
  branchName  string?  // from the tracker if offered; else SCM derives auto-triage/<id>-<slug>
  state       enum     // canonical (below)
  comments    {author, body, createdAt}[]
}
```

`kind` is read from the tracker's type/labels during normalization. `kind === "bug"` is the
trigger for cross-site spread in `triage-resolve`.

## Canonical states (mapped per tracker)

The pipeline knows four (the last **optional**). Each tracker maps them to its own vocabulary in
`trackers.<name>.states` — state **names**, resolved to ids/labels live (never hardcoded):

| canonical     | meaning                                            |
|---------------|----------------------------------------------------|
| `QUEUED`      | waiting to be triaged                              |
| `CLAIMED`     | owned by the pipeline, in progress                 |
| `NEEDS_HUMAN` | surfaced for a person to plan/decide               |
| `IN_REVIEW`   | draft PR open, awaiting human review/merge (opt)   |

The pipeline never merges and never marks a tracker item "done" — a human does. `IN_REVIEW` is the
**bot-terminal** state: once a target's draft PR is open the bot's work is finished, and the item
leaves the active board — out of both the queue (`triage --list` only claims `QUEUED`) and the
reaper's reach (`triage-cleanup` only scans `CLAIMED`). It is **optional**: a tracker that doesn't
map `states.IN_REVIEW` leaves the item `CLAIMED` after its PR opens. Either way the item is never
churned — the reaper treats an item with an open auto-PR as healthy (see the shared SCM signal below).

## Capability contract (realized per tracker via tracker-binding.md)

| capability          | input                     | effect / returns                              |
|---------------------|---------------------------|-----------------------------------------------|
| `fetchQueue`        | tracker scope + cursor    | new WorkItem[] in QUEUED, oldest first        |
| `getItem`           | id                        | one fresh WorkItem                            |
| `provideBranchName` | item                      | a working branch name                         |
| `isClaimed`         | item                      | bool — state≠QUEUED (state is authoritative)  |
| `claim`             | item                      | state→CLAIMED + post claimMarker              |
| `comment`           | item, markdown            | post a comment                                |
| `attachLink`        | item, url, title          | attach a link (PR / plan issue)               |
| `setState`          | item, canonicalState      | transition the item                           |

SCM actions (branches, draft PRs, plan issues via `git`/`gh`) are **not** capabilities — they're
identical across trackers and live in `triage-resolve`.

### Open auto-PR — the shared SCM signal (not a tracker capability)

Several steps must answer "is there already work in flight for this item?" The authoritative answer
is **an open PR whose head branch is the item's `branchName`** — an SCM fact, identical across
trackers, so (like branch/PR creation) it lives outside the capability set. Realize it once (see
`tracker-binding.md` → *Open auto-PR detection*) as `hasOpenAutoPR(item)` and reuse the SAME check
in `triage --list`, the claim gate, and `triage-cleanup`. Prefer it over reading tracker
"attachments": a run can die between `gh pr create` and `attachLink`, so the PR exists with no
attachment yet — the head-branch query still finds it, the attachment lookup misses it. Reading the
attachment instead of the branch is exactly what let the reaper reap tickets that already had a PR.
