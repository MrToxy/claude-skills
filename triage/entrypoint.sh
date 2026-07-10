#!/usr/bin/env bash
# Auto-triage container entrypoint. Wires the daemon's config dir from mounted skills + injected
# secrets, clones the target repos fresh, then runs the tick loop (or a single tick / a shell).
# Subscription-only: fails fast if any billed-API credential is present. No secrets are baked into
# the image — everything below reads from env / read-only mounts / the routing config.
set -euo pipefail

# ---- 1. Subscription-only guard (see feedback: never a billed API key) --------------------------
if [ -n "${ANTHROPIC_API_KEY:-}" ] || [ -n "${ANTHROPIC_AUTH_TOKEN:-}" ]; then
  echo "FATAL: ANTHROPIC_API_KEY/ANTHROPIC_AUTH_TOKEN is set. This runner is SUBSCRIPTION-ONLY —" >&2
  echo "       unset it so inference bills your Claude plan, not the pay-per-token API." >&2
  exit 1
fi
: "${CLAUDE_CODE_OAUTH_TOKEN:?FATAL: CLAUDE_CODE_OAUTH_TOKEN required (mint on your Mac with 'claude setup-token')}"
case "$CLAUDE_CODE_OAUTH_TOKEN" in
  sk-ant-oat01-*) : ;;
  *) echo "FATAL: CLAUDE_CODE_OAUTH_TOKEN is not a subscription OAuth token (expected 'sk-ant-oat01-…')." >&2; exit 1 ;;
esac
: "${GH_TOKEN:?FATAL: GH_TOKEN required (fine-grained, repo-scoped PAT with contents+pull-request write)}"
: "${LINEAR_API_KEY:?FATAL: LINEAR_API_KEY required — Linear > Settings > API > personal API key. The hosted Linear MCP is authed with it (no browser in a container for the OAuth flow).}"

D="${CLAUDE_TRIAGE_DIR:-$HOME/.claude-triage}"
SK="${SKILLS_SRC:-/opt/claude-skills}"
ASK="${AGENTS_SKILLS_SRC:-/opt/agents-skills}"
WS="${WORKSPACE:-/workspace}"
export CLAUDE_CONFIG_DIR="$D"
export TRIAGE_PERMISSION_MODE="${TRIAGE_PERMISSION_MODE:-bypassPermissions}"

# ---- 2. Config dir: skills + agents symlinks, rendered settings + daemon config ------------------
mkdir -p "$D/logs" "$D/skills" "$D/agents" "$D/session-env" "$WS/.claude"
ln -sfn "$SK/triage/auto-triage-daemon.sh" "$D/auto-triage-daemon.sh"
ln -sfn "$SK/triage/triagectl"             "$D/triagectl"
ln -sfn "$SK/triage/skill"   "$D/skills/triage"
ln -sfn "$SK/triage-resolve" "$D/skills/triage-resolve"
ln -sfn "$SK/triage-block"   "$D/skills/triage-block"
ln -sfn "$SK/triage-cleanup" "$D/skills/triage-cleanup"
ln -sfn "$SK/plan-with-docs" "$D/skills/plan-with-docs"
ln -sfn "$SK/agents/triage-verifier.md" "$D/agents/triage-verifier.md"
# optional skills from the ~/.agents/skills collection, if mounted (tdd, agent-browser for UI gate)
[ -d "$ASK/tdd" ]           && ln -sfn "$ASK/tdd"           "$D/skills/tdd"
[ -d "$ASK/agent-browser" ] && ln -sfn "$ASK/agent-browser" "$D/skills/agent-browser"

# container settings profile (sandbox off + bypassPermissions)
cp "$SK/triage/settings.container.example.json" "$D/settings.json"
# daemon config: project root = workspace; enable the ledger-USD budget fallback for headless
sed "s#__PROJECT_ROOT__#$WS#g" "$SK/triage/daemon.config.example.json" \
  | jq --argjson s "${TRIAGE_MAX_SPEND_5H_USD:-25}" \
       '.budget.maxSpend5hUsd = $s | .budget.holdIfUsageUnknown = false | .projects[0].name = "websites"' \
  > "$D/daemon.config.json"
[ -f "$D/control.json" ] || echo '{"paused":false,"pausedProjects":[],"abandon":[]}' > "$D/control.json"

# ---- 3. GitHub auth (gh + git push over HTTPS) + git identity -----------------------------------
gh auth setup-git                                   # git uses gh's token as the https credential helper
git config --global user.name  "${GIT_AUTHOR_NAME:-auto-triage}"
git config --global user.email "${GIT_AUTHOR_EMAIL:-auto-triage@users.noreply.github.com}"
git config --global advice.detachedHead false
git config --global init.defaultBranch main

# ---- 4. Linear MCP (hosted) — authed with a Linear API KEY via header (headless; no browser) ----
# The subscription OAuth token drives inference; Linear's hosted MCP takes the API key as a bearer.
# --scope user makes it visible from every cwd — the daemon runs `claude -p` after cd-ing into each
# repo (/workspace/<repo>); default/local scope binds the server to THIS cwd only → no Linear tools there.
claude mcp remove --scope user linear-server >/dev/null 2>&1 || true
claude mcp add --scope user --transport http linear-server https://mcp.linear.app/mcp \
  --header "Authorization: Bearer $LINEAR_API_KEY" >/dev/null 2>&1 || true

# ---- 5. Fresh-clone the target repos (targets come from the MOUNTED routing config — no repo -----
#         names are baked into this versioned image). Honors TRIAGE_ONLY_SITES for fast iteration.
# routing config is bind-mounted read-only at /opt/routing.config.json → copy into the project root
[ -f /opt/routing.config.json ] && cp /opt/routing.config.json "$WS/.claude/auto-triage.config.json"
CFG="$WS/.claude/auto-triage.config.json"
if [ ! -f "$CFG" ]; then
  echo "FATAL: routing config missing — mount your <project>/.claude/auto-triage.config.json to /opt/routing.config.json." >&2
  exit 1
fi
# Pull THIS project's build env from its own config (`.env` map) and export it, so repos' build/lint
# hooks (e.g. site-a's pre-push `next build`, which needs PostHog vars defined) get what they need —
# WITHOUT baking project specifics into the generic container. Non-secret build vars only; real
# secrets stay in the host env file. Skips the `_comment` key.
while IFS= read -r kv; do [ -n "$kv" ] && export "$kv"; done <<EOF
$(jq -r '.env // {} | to_entries[] | select(.key | startswith("_") | not) | "\(.key)=\(.value)"' "$CFG")
EOF

ONLY="${TRIAGE_ONLY_SITES:-}"   # e.g. "site-a" or "site-a,server"; empty = all sites in routing.map
clone_one(){ # $1=site $2=repo(owner/name) $3=base-branch $4=local-dir
  case ",$ONLY," in *",$1,"*) : ;; ,,) : ;; *) return 0 ;; esac
  git -C "$WS/$4" rev-parse --git-dir >/dev/null 2>&1 && { echo "clone: $4 already present"; return 0; }
  echo "clone: $1 -> $2@$3 into $4 (bare)"
  # Bare = object store only (no redundant base working tree); /triage-resolve makes a worktree off it
  # per ticket. --depth implies --single-branch, so only the base branch's recent history is fetched.
  git clone --bare --depth 50 --branch "$3" "https://github.com/$2.git" "$WS/$4"
  # Ensure a push remote (modern git sets remote.origin.url on --bare; belt-and-suspenders for older git).
  git -C "$WS/$4" remote get-url origin >/dev/null 2>&1 \
    || git -C "$WS/$4" remote add origin "https://github.com/$2.git"
}
while IFS=$'\t' read -r site repo base dir; do
  [ -n "$site" ] && clone_one "$site" "$repo" "$base" "$dir"
done < <(jq -r '.routing.map | to_entries[] | [.key, .value.repo, .value.base, .value.localCheckout] | @tsv' "$CFG")

# ---- 6. Sanity: subscription auth + Linear reachable --------------------------------------------
echo "== claude auth/mcp =="
claude mcp list 2>&1 | sed 's/^/  /' || true

# ---- 7. Run ------------------------------------------------------------------------------------
mode="${1:-loop}"
case "$mode" in
  tick)  shift; exec "$D/auto-triage-daemon.sh" "$@" ;;         # one tick (add --force to bypass budget)
  shell) exec bash ;;                                            # interactive debug
  loop|*)
    echo "auto-triage container up; tick loop every ${TICK_INTERVAL:-900}s"
    while true; do "$D/auto-triage-daemon.sh" || true; sleep "${TICK_INTERVAL:-900}"; done ;;
esac
