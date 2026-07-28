# auto-triage.config.json — schema (single source of truth)

One config per project, at `<projectRoot>/.claude/auto-triage.config.json`. Produced by
`triage-init`, consumed by `triage` + `triage-resolve`. All paths in it are relative to the project
root (the directory holding `.claude/`). Everything project/tracker-specific lives here; the
skills carry no specifics.

## Top-level

```
{
  "trackers":    { <name>: Tracker, ... },   // one or many; each independently enabled
  "claimMarker": string,                     // prefix of EVERY bot comment; `<claimMarker> status:` = the ONE status comment (upserted, never re-posted)
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
  "states":    { "QUEUED": s, "CLAIMED": s, "NEEDS_HUMAN": s, "IN_REVIEW"?: s }  // canonical → tracker state NAMES ("IN_REVIEW" optional)
}
```

- **linear scope**: `{ team, queueState, project?, label? }`. `project` **or** `label` narrows the
  queue: `project` for a project-scoped app; `label` when the app's work is spread across many projects
  and a single label marks it (e.g. `"label": "bisondesk"`). Both may be combined. `fetchQueue` passes
  them straight into `list_issues` (state + project and/or label filter). states are workflow-state
  names (`"Todo"`, `"In Progress"`, …); ids resolved live via `list_issue_statuses`.
- **github scope**: `{ repo, issueState, queueLabel }`. states are `"label:<name>"` (the
  pipeline adds/removes labels instead of transitioning a workflow state).
- **`IN_REVIEW` (optional)**: where an item moves once its draft PR opens, so it leaves the active
  board (out of the queue and the reaper). Linear: a review workflow status (e.g. `"In Review"`).
  GitHub: `"label:in-review"` (swapped in for the CLAIMED label; the issue stays **open** — the
  pipeline never closes tracker items). Omit it and items stay `CLAIMED` after their PR (still never
  churned — the reaper reads an open auto-PR as healthy).
- Never store ids here — they're discovered at runtime (see `tracker-binding.md`).
- **Dependency ordering (no config).** For Linear trackers the pipeline automatically honours
  `blocked by` relations: a queued item whose blocker isn't Done is skipped until it is (see the
  `triage` skill's **Dependency gate**). No config knob — it lets a human split a cross-repo change
  into ordered per-repo sub-tickets that each auto-resolve in turn.

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

### Recipe catalog — pick per target by how its verification gets its infra
- **testcontainers** (dep `@testcontainers/*` or `testcontainers`; or a `new *Container(` call in a
  vitest/jest global-setup) → the repo spins up its OWN containers, so it needs a Docker API, NOT a
  bare service sidecar. Provision `dind` and inject `DOCKER_HOST` (validated: the server integration
  suite runs 70 tests green with postgres:17 started *inside* dind):
  ```
  "dind": { "image": "docker:dind", "privileged": true, "environment": { "DOCKER_TLS_CERTDIR": "" }, "command": ["--host=tcp://0.0.0.0:2375"], "networks": ["triagenet"] }
  sidecarEnv: { "DOCKER_HOST": "tcp://dind:2375", "TESTCONTAINERS_HOST_OVERRIDE": "dind", "TESTCONTAINERS_RYUK_DISABLED": "true" }
  ```
  The triage container still gets NO host docker socket — it talks to the ephemeral dind daemon over
  TCP, and testcontainers pulls its images INSIDE dind (a per-tick pull cost; rootless-dind is an
  untested hardening). `dind` and a bare service sidecar are **mutually exclusive** for one target:
  dind = the repo starts its own containers; a bare sidecar = the repo connects to one we start.
- **injected DB** (tests read `DB_HOST`/`DB_*` and do NOT use testcontainers) → `postgres` sidecar + `DB_*` env.
- **headless browser** (Playwright / agent-browser / e2e UI gate) → `browser` sidecar + `AGENT_BROWSER_CDP_URL`.
- **DynamoDB** (local dynamo in tests) → `dynamodb` sidecar + endpoint env.
- **none** (pure unit tests / no external infra) → `sidecars: []`.

## Limits

`{ maxIssuesPerTick, maxConcurrentSubagents, implementVerifyRetries }` — defaults
`3 / 3 / 2`.

## Runtime sibling (not authored)
`.claude/auto-triage.state.json` — per-tracker incremental cursor, auto-created by `triage`.
Add `.claude/auto-triage.state.json` to `.gitignore` (it's machine-local).
