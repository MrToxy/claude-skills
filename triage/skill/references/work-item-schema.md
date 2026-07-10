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

The pipeline knows only three. Each tracker maps them to its own vocabulary in
`trackers.<name>.states` — state **names**, resolved to ids/labels live (never hardcoded):

| canonical     | meaning                              |
|---------------|--------------------------------------|
| `QUEUED`      | waiting to be triaged                |
| `CLAIMED`     | owned by the pipeline, in progress   |
| `NEEDS_HUMAN` | surfaced for a person to plan/decide |

No canonical "done": the pipeline opens *draft* PRs and stops; a human merges.

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
