# auto-triage.config.json — schema (single source of truth)

One config per project, at `<projectRoot>/.claude/auto-triage.config.json`. Produced by
`triage-init`, consumed by `triage` + `triage-resolve`. All paths in it are relative to the project
root (the directory holding `.claude/`). Everything project/tracker-specific lives here; the
skills carry no specifics.

## Top-level

```
{
  "trackers":    { <name>: Tracker, ... },   // one or many; each independently enabled
  "claimMarker": string,                     // comment posted on claim; dedup backstop
  "routing":     Routing,
  "env":         { <KEY>: string, ... },     // non-secret build vars exported into the container at spin-up (optional)
  "sidecars":    { "services": <compose> },  // auxiliary containers (DB/browser) — container runner only (optional)
  "limits":      Limits,
  "pr":          { draft, neverMerge, neverPushBase }   // safety; keep all true
}
```

## Tracker

```
{
  "type":      "linear" | "github",
  "interface": "mcp:<server>" | "cli:<command>",   // e.g. mcp:linear-server, cli:gh
  "enabled":   boolean,
  "scope":     <tracker-specific>,                 // what counts as the queue
  "states":    { "QUEUED": s, "CLAIMED": s, "NEEDS_HUMAN": s }  // canonical → tracker state NAMES
}
```

- **linear scope**: `{ team, project, queueState }`. states are workflow-state names
  (`"Todo"`, `"In Progress"`, …); ids resolved live via `list_issue_statuses`.
- **github scope**: `{ repo, issueState, queueLabel }`. states are `"label:<name>"` (the
  pipeline adds/removes labels instead of transitioning a workflow state).
- Never store ids here — they're discovered at runtime (see `tracker-binding.md`).

## Routing — two shapes

`routing.map` values are targets: `{ repo, base, localCheckout, kind }` — plus optional container
fields `sidecars` / `sidecarEnv` (see **Sidecars**).
(`kind`: `web` | `backend` | other; drives bug-spread eligibility — only `web` siblings spread.
`localCheckout`: path relative to project root, `"."` for a single-repo project).

**A. Label-gated multi-site** (a container of checkouts, e.g. `websites/`):
```
"routing": {
  "siteLabels": ["site-a","site-b","site-c","site-d","server"],   // an issue must carry ≥1
  "map": { "site-a": {…}, "site-b": {…}, … }
}
```
Issue with 0 site labels → left for human. 1 → that target. ≥2 same-repo → replicate
(one PR per base). labels across >1 repo → human.

**B. Single-repo default** (one app, e.g. myapp):
```
"routing": {
  "siteLabels": [],                                  // empty → no gating
  "map": { "default": { "repo":"…", "base":"main", "localCheckout":".", "kind":"web" } }
}
```
`siteLabels` empty AND a `default` target present → every queued issue routes to `default`,
no label required.

## Sidecars (container runner only)

Auxiliary containers the repo's integration tests / UI gate need (a DB, a headless browser). Declared
ONCE as a compose fragment (Docker Compose accepts JSON) and selected PER SITE. The host wrapper
`triage-tick <site>` brings up only that site's subset on the `triagenet` network, injects its
`sidecarEnv` into the triage container, runs the tick, and tears the sidecars down after. A site with
`sidecars: []` (or none) starts nothing. The Mac-local runner ignores this block.

```
"sidecars": {
  "services": {                    // any compose service map; make it EPHEMERAL (tmpfs / no named volumes)
    "postgres": { "image": "postgres:17", "environment": {…}, "tmpfs": ["/var/lib/postgresql/data"], "networks": ["triagenet"] },
    "dynamodb": { "image": "amazon/dynamodb-local", "command": "-jar DynamoDBLocal.jar -sharedDb -inMemory", "networks": ["triagenet"] },
    "browser":  { "image": "ghcr.io/browserless/chromium", "environment": { "TOKEN": "…" }, "networks": ["triagenet"] }
  }
}
```
Per-site target fields (in `routing.map.<site>`):
```
"site-a": { …, "sidecars": ["browser"], "sidecarEnv": { "AGENT_BROWSER_CDP_URL": "http://browser:3000?token=…" } }
```
- `sidecars`: which of `sidecars.services` to start for a tick on this site (subset → only what it needs).
- `sidecarEnv`: env injected into the triage container so the repo's tests / agent-browser reach those
  services by name on `triagenet`. **Endpoint env only** — non-secret build vars go in top-level `env`;
  real secrets stay in the host `container.env` (never here).
- Every service (and every `sidecarEnv` host) uses the `triagenet` network (the base compose defines it).

## Limits

`{ maxIssuesPerTick, maxConcurrentSubagents, implementVerifyRetries }` — defaults
`3 / 3 / 2`.

## Runtime sibling (not authored)
`.claude/auto-triage.state.json` — per-tracker incremental cursor, auto-created by `triage`.
Add `.claude/auto-triage.state.json` to `.gitignore` (it's machine-local).
