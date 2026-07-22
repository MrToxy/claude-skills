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
- `claimMarker` (config) is posted as a comment on claim — an audit trail + the timestamp
  `triage-cleanup` reads to age stale claims. It is NOT a claimability signal: **state** (QUEUED
  vs not) decides what's claimable, so a re-queued ticket with a lingering marker stays claimable.
- Item ids are tracker-local; the cursor and branch names are per-tracker, so ids never collide
  even when several trackers run at once.
