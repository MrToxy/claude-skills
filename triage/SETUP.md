# auto-triage daemon — setup & operation

Unattended issue→PR triage on a launchd timer. Runs `claude -p /triage` per project inside the
**macOS Seatbelt sandbox** with a **`dontAsk`** profile (keeps your deny rules, drops the `ask`
rules that hang headless), **budget-gated on the live 5-hour rolling-window %**, controllable via
`triagectl`.

**Versioned vs local:** the **scripts** (`auto-triage-daemon.sh`, `triagectl`) live in this repo
and are safe to share — they hold no paths/secrets, reading everything from config + env. The
**real config** (`settings.json`, `daemon.config.json`, the plist) is machine-specific (your
paths) and is generated into `~/.claude-triage/` from the `*.example` templates here — **never
commit the filled-in versions.**

## Layout
```
<repo>/triage/                       ← versioned (this folder)
  skill/                             ← the triage skill (SKILL.md + references)
  auto-triage-daemon.sh  triagectl   ← daemon scripts (generic, no secrets)
  settings.example.json
  daemon.config.example.json
  com.auto-triage.plist.example
  SETUP.md
~/.claude-triage/                    ← local runtime (NOT versioned)
  settings.json  daemon.config.json  ← real paths, generated from examples
  control.json  state.json  spend-ledger.jsonl  usage-cache.json   (auto)
  auto-triage-daemon.sh  triagectl   ← symlinks to the repo
  skills/  agents/                   ← symlinks so /triage + verifier load here
  logs/
~/Library/LaunchAgents/com.auto-triage.plist
```

## 1. Install
```sh
D=~/.claude-triage
TRIAGE_DIR=~/Documents/Development/claude-skills/triage     # this repo's triage folder
PROJECT_ROOT=/ABSOLUTE/PATH/TO/your-project                 # the project to triage
mkdir -p "$D/logs" "$D/skills" "$D/agents"

# scripts: symlink to the repo (stay versioned + updatable)
ln -sfn "$TRIAGE_DIR/auto-triage-daemon.sh" "$D/auto-triage-daemon.sh"
ln -sfn "$TRIAGE_DIR/triagectl"             "$D/triagectl"

# configs: fill the templates → local (NOT versioned)
sed -e "s#__PROJECT_ROOT__#$PROJECT_ROOT#g" -e "s#__CLAUDE_TRIAGE_DIR__#$D#g" "$TRIAGE_DIR/settings.example.json" > "$D/settings.json"
sed "s#__PROJECT_ROOT__#$PROJECT_ROOT#g" "$TRIAGE_DIR/daemon.config.example.json" > "$D/daemon.config.json"
echo '{"paused":false,"pausedProjects":[],"abandon":[]}' > "$D/control.json"

# skills + agent discoverable under THIS config dir
ln -sfn ~/.claude/skills/triage          "$D/skills/triage"
ln -sfn ~/.claude/skills/triage-cleanup  "$D/skills/triage-cleanup"
ln -sfn ~/.claude/skills/triage-resolve  "$D/skills/triage-resolve"
ln -sfn ~/.claude/skills/triage-block    "$D/skills/triage-block"
ln -sfn ~/.claude/agents/triage-verifier.md "$D/agents/triage-verifier.md"

ln -sfn "$D/triagectl" /opt/homebrew/bin/triagectl     # optional: triagectl on PATH
```

## 2. Verify auth + MCP carry into the daemon config dir
```sh
CLAUDE_CONFIG_DIR=~/.claude-triage claude mcp list                              # linear-server ✔ Connected
CLAUDE_CONFIG_DIR=~/.claude-triage claude -p "say hi" --output-format json < /dev/null   # auth ok
```
If Linear missing: `CLAUDE_CONFIG_DIR=~/.claude-triage claude mcp add --transport http linear-server https://mcp.linear.app/mcp && CLAUDE_CONFIG_DIR=~/.claude-triage claude mcp login linear-server`

## 3. Verify the 5h-usage read (the budget gate's input)
```sh
TOKEN=$(security find-generic-password -s "Claude Code-credentials" -w | jq -r '.claudeAiOauth.accessToken')
curl -sS https://api.anthropic.com/api/oauth/usage \
  -H "Authorization: Bearer $TOKEN" -H "anthropic-beta: oauth-2025-04-20" \
  -H "User-Agent: claude-code/2.1.193" | jq '.five_hour'
```
Expect `{ "utilization": <n>, "resets_at": ... }`. If Keychain prompts, click **Always Allow**
(else the launchd read fails → with `holdIfUsageUnknown:true` the daemon safely *holds*).

## 4. DRY-RUN one tick by hand BEFORE arming  ⚠ real: claims tickets, opens draft PRs
Tag one small single-site Todo ticket with a routing label first.
```sh
~/.claude-triage/auto-triage-daemon.sh            # normal — respects the 5h budget gate
~/.claude-triage/auto-triage-daemon.sh --force    # bypass the gate (e.g. when already ≥ threshold)
~/.claude-triage/triagectl run --force            # same, via the control CLI
~/.claude-triage/triagectl status
tail -n 40 ~/.claude-triage/logs/daemon.log
```
On-the-fly threshold (persists in config): `triagectl budget 80` (show with `triagectl budget`).

## 5. Arm the timer
```sh
sed "s#__HOME__#$HOME#g" "$TRIAGE_DIR/com.auto-triage.plist.example" > ~/Library/LaunchAgents/com.auto-triage.plist
launchctl load ~/Library/LaunchAgents/com.auto-triage.plist
launchctl list | grep com.auto-triage
```

## How a tick works (per-ticket fan-out)
1. budget gate on the live 5h % (hold if ≥ `maxFiveHourPercent`).
2. `/triage --list` per project → claimable ticket IDs (cheap, read-only).
3. fan out one `claude -p /triage <ID>` per ticket, up to `maxParallelTickets`; each capped by
   `perTicketMaxUsd` and **killed past `maxTicketMinutes`**.
4. `/triage-cleanup <stuckAfterMinutes>` → return crashed/killed claims to the queue.

## Operate
```sh
triagectl status            # running tickets + live 5h gauge + 5h spend + recent
triagectl session [ticket]  # full Claude transcript of a ticket's latest run (or the latest session)
triagectl watch [ticket]    # live-tail a running ticket's agent transcript
triagectl pause [project]   # hold all new ticks (or one project); in-flight continues
triagectl abandon <ticket>  # kill that ticket's run now
triagectl stop              # pause + kill everything running
triagectl resume [project]
```
**State source.** On the container path the daemon writes state, control, and session transcripts into
the Docker volume `auto-triage_triage-state` (inside Docker Desktop's VM — no host path), so `triagectl`
reaches them via a throwaway `alpine` helper and `status` prints `source: container volume …`. It falls
back to host `~/.claude-triage` (the legacy Mac path) when the volume is absent; force host mode with
`TRIAGE_STATE_VOLUME=` (empty). Override the volume/helper with `TRIAGE_STATE_VOLUME` / `TRIAGE_HELPER_IMG`.

## Tune (no code changes) — `~/.claude-triage/daemon.config.json`
`budget.maxFiveHourPercent` (40) · `budget.perTicketMaxUsd` (4) · `limits.maxParallelTickets` (3)
· `limits.maxTicketMinutes` (30) · `reaper.stuckAfterMinutes` (60) · add `projects[]`.

## Models — right model per phase (`models` block)
Two tiers, so the cheap parts stay cheap and the engineering stays strong:
- **`models.orchestrator`** (`haiku`) — the mechanical polls that fire EVERY tick for EVERY project
  regardless of ticket volume: `/triage --list` (discovery), `/triage-cleanup` (reaper),
  `/triage-block` (mark). These dominate idle cost (e.g. 5 sites × 15-min ticks ≈ 192 poll runs/
  day/site with zero tickets), so keep this small.
- **`models.write`** (`opus`) — `/triage <ID>`: route + `plan-with-docs` + TDD implement + gates +
  verifier. Its subagents inherit this model, so plan AND implementation run here. Only fires on a
  real ticket, where correctness pays for itself. A project may override it with its own `.model`.

Aliases track the latest of each tier (`opus`→4.8, `haiku`→4.5). The container re-renders
`daemon.config.json` from `daemon.config.example.json` every tick and bind-mounts the daemon script
live, so a model change lands next tick — no image rebuild.

**If Haiku mis-classifies on `--list`** (wraps the JSON array in prose, or misjudges claimability),
bump `models.orchestrator` to `sonnet` — still far cheaper than Opus on those polls.

**Possible future tier — `models.verify` (NOT wired yet).** The `triage-verifier` agent (re-runs the
repo's tests + gates, judges each AC) currently inherits `models.write` (Opus) on every ticket. It's
mechanical enough to run on Sonnet. To add it: give the verifier a dedicated model — either pin
`model:` in `agents/triage-verifier.md`'s frontmatter, or thread a `models.verify` read into the
`triage-resolve` step-4 spawn. Left on the write model for now because it gates PR quality; add the
tier only if verifier spend proves material.

## Disarm
```sh
launchctl unload ~/Library/LaunchAgents/com.auto-triage.plist
```
