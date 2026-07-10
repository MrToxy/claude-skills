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

## Branch name
`provideBranchName`: if the tracker supplies one (Linear `gitBranchName`), use it verbatim;
otherwise derive `auto-triage/<id>-<slug>`.

## Identity & dedup
- `claimMarker` (config) is posted as a comment on claim — an audit trail + the timestamp
  `triage-cleanup` reads to age stale claims. It is NOT a claimability signal: **state** (QUEUED
  vs not) decides what's claimable, so a re-queued ticket with a lingering marker stays claimable.
- Item ids are tracker-local; the cursor and branch names are per-tracker, so ids never collide
  even when several trackers run at once.
