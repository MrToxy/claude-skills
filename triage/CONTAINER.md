# auto-triage in a container — setup & operation

Runs the unattended issue→PR daemon inside a **Linux container** instead of on macOS. The container
is the isolation boundary, so Claude Code runs with **`bypassPermissions`** and its Bash sandbox
**off** — no macOS TCC / Seatbelt fighting `git worktree`. Follows Docker's *develop-with-containers*
model: Compose stack + named volume for state + read-only bind mounts for the skills you iterate on.
Repos are **cloned fresh** inside the container (isolation); nothing org-specific or secret is baked
into the image.

## Layout
```
triage/
  Dockerfile                        # node:20-slim + git/gh/jq + claude CLI; non-root user `triage`
  entrypoint.sh                     # subscription guard → wire config dir → gh/git auth → fresh clone → tick loop
  docker-compose.yml                # triage + postgres + dynamodb sidecars; volume + bind mounts + watch
  settings.container.example.json   # bypassPermissions + sandbox off
  .env.example                      # secrets + host paths (copy to .env — gitignored)
  auto-triage-daemon.sh triagectl   # shared with the Mac path; Linux-guarded (env-driven)
```

## Prerequisites (once)
Secrets + host paths live in **`~/.claude-triage/container.env`** (not in any repo; host paths are
pre-filled). Edit only the four secret lines:
1. **Subscription token** (never an API key): on your Mac run `claude setup-token` → paste the
   `sk-ant-oat01-…` value as `CLAUDE_CODE_OAUTH_TOKEN`.
2. **GitHub PAT**: fine-grained, scoped to ONLY the target repos, Contents + Pull requests = write → `GH_TOKEN`.
3. **npm token** for the private `@yourscope/*` packages → `NPM_TOKEN`.
4. **Linear API key**: Linear → Settings → API → Personal API keys (read + write issues) → `LINEAR_API_KEY`.
   Inference stays on your subscription; this key only connects the hosted Linear MCP (there's no browser
   in a container for the OAuth flow), passed as an `Authorization: Bearer` header.

## Run
Secrets + paths come from `~/.claude-triage/container.env` via `--env-file`. Build once, then run a
tick. Sidecars (DB/browser) are per-site — use the `triage-tick` wrapper so only what a site needs
comes up (see the project's `sidecars` config).
```sh
E=~/.claude-triage/container.env
cd "$CLAUDE_SKILLS_DIR/triage"
docker compose --env-file "$E" build

./triage-tick server                 # RECOMMENDED: postgres sidecar → server tick → teardown
./triage-tick site-a                    # no sidecars → plain tick
./triage-tick server -- --force      # pass --force through (bypass budget for a manual test)
./triage-all                         # one pass over every site in the routing map (what the scheduler fires)

docker compose --env-file "$E" run --rm triage tick --force   # low-level primitive: NO sidecars (only for sites/tickets that need none)
docker compose --env-file "$E" watch                          # dev loop: entrypoint/Dockerfile rebuild; skill edits live
```
Inspect (fresh-container-per-tick → no persistent service; state/logs live on the `triage-state` volume):
```sh
E=~/.claude-triage/container.env
docker compose --env-file "$E" run --rm triage shell                                  # interactive debug in a fresh container
docker compose --env-file "$E" run --rm triage bash -lc 'tail -n40 ~/.claude-triage/logs/daemon.log'
```

## Schedule (unattended)
The host scheduler fires `triage-all` each interval — one per-site tick per site, each provisioning
only its sidecars. **Docker Desktop must be running.**
- **launchd:** copy `com.auto-triage-container.plist.example` → `~/Library/LaunchAgents/`, replace
  `__SKILLS__` / `__HOME__`, then `launchctl load` it. Fires every 15 min; `triage-all`'s mkdir-lock
  prevents overlap if a tick runs long. **TCC:** if the skills repo or routing config lives under
  `~/Documents`, launchd's bash can't read it (exit 126 "Operation not permitted") — route through the
  FDA launcher + `container-sched/` shim instead; see the comment in the plist example.
- **cron:** `*/15 * * * * "$CLAUDE_SKILLS_DIR/triage/triage-all" >> ~/.claude-triage/logs/scheduler.log 2>&1`
- **scope/pause:** `TRIAGE_ONLY_SITES=<subset>` in `container.env` pins the scheduler to a subset of
  sites; the daemon's `control.json` (`{"paused":true}`) still halts all claiming.

## Subscription-only (guaranteed)
`entrypoint.sh` **fails fast** if `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` is present or the token
isn't an `sk-ant-oat01-…` OAuth token. Inference bills your Claude plan, exactly like interactive use.
Budget-gating uses the subscription 5h-usage endpoint, or — if that rejects the headless token — the
daemon's own local ledger (`TRIAGE_MAX_SPEND_5H_USD`). No API key for billing or budgeting, ever.

## What's macOS vs container
The Mac path (launchd + FDA launcher + Seatbelt, `dontAsk`) still works unchanged — the `daemon.sh`
edits are env-guarded. The container overrides via env: `TRIAGE_PERMISSION_MODE=bypassPermissions`,
`CLAUDE_CODE_OAUTH_TOKEN` (instead of Keychain), and a ledger budget fallback.
