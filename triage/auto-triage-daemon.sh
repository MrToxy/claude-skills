#!/bin/bash
# auto-triage-daemon.sh — one tick of the unattended Linear->GitHub triage daemon.
# Fired by launchd. Single-instance via mkdir lock. Gated on the live 5h rolling-window %.
# Per-TICKET fan-out: `/triage --list` discovers claimable tickets, then one
# `claude -p /triage <ID>` per ticket runs in parallel (up to maxParallelTickets), each
# capped by --max-budget-usd and killed past maxTicketMinutes. Finally the `triage-cleanup`
# skill unlocks stale claims. Writes state.json + spend-ledger.jsonl. (bash 3.2 compatible — no
# associative arrays.)
set -uo pipefail

DAEMON_DIR="${CLAUDE_TRIAGE_DIR:-$HOME/.claude-triage}"
export CLAUDE_CONFIG_DIR="$DAEMON_DIR"

CFG="$DAEMON_DIR/daemon.config.json"
CONTROL="$DAEMON_DIR/control.json"
STATE="$DAEMON_DIR/state.json"
LEDGER="$DAEMON_DIR/spend-ledger.jsonl"
USAGE_CACHE="$DAEMON_DIR/usage-cache.json"
LOGDIR="$DAEMON_DIR/logs"
LOCK="$DAEMON_DIR/run.lock"

# launchd ships a minimal PATH; node/npm live under nvm (version-specific) -> resolve dynamically.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
NODE_BIN="$(ls -d "$HOME"/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -1)"
[ -n "$NODE_BIN" ] && export PATH="$NODE_BIN:$PATH"

mkdir -p "$LOGDIR"
ts(){ date -u +%FT%TZ; }
dlog(){ echo "$(ts) $*" >> "$LOGDIR/daemon.log"; }
jqr(){ jq -r "$1" "$2" 2>/dev/null; }
# a claude -p `.result` may be wrapped in a ```json fence — strip it to bare JSON text
result_json(){ jq -r '.result' "$1" 2>/dev/null | sed 's/```json//g; s/```//g'; }
write_file(){ printf '%s' "$2" > "$1.tmp" && mv "$1.tmp" "$1"; }
ctl_set(){ local v; v=$(jq "$1" "$CONTROL" 2>/dev/null) && [ -n "$v" ] && write_file "$CONTROL" "$v"; }
paused_global(){ [ "$(jqr '.paused // false' "$CONTROL")" = "true" ]; }
proj_paused(){ jq -e --arg n "$1" '(.pausedProjects // []) | index($n)' "$CONTROL" >/dev/null 2>&1; }
abandoned(){ jq -e --arg a "$1" --arg b "$2" '(.abandon // []) | (index($a) or index($b))' "$CONTROL" >/dev/null 2>&1; }

run_claude(){ # $1=root $2=prompt $3=model $4=maxusd $5=outfile $6=errfile
  ( cd "$1" && CLAUDE_CONFIG_DIR="$DAEMON_DIR" claude -p "$2" \
      --model "$3" --permission-mode "${TRIAGE_PERMISSION_MODE:-dontAsk}" --max-budget-usd "$4" \
      --output-format json < /dev/null > "$5" 2>> "$6" )
}

# best-effort desktop alert; sanitize quotes/backslashes so osascript never breaks the daemon
alert(){ # $1=title $2=message
  command -v osascript >/dev/null 2>&1 || return 0
  local t m; t=$(printf '%s' "$1" | tr -d '"\\'); m=$(printf '%s' "$2" | tr -d '"\\')
  osascript -e "display notification \"$m\" with title \"$t\"" >/dev/null 2>&1 || true
}

# deterministic detection (in the loop) decides a ticket is blocked; this records it on the item's
# OWN tracker via the tracker-agnostic `triage-block` skill (Linear, GitHub, … — the skill binds it,
# never hardcoded here). Idempotent: label `triage-blocked` + return to Todo + one reason comment.
mark_blocked(){ # $1=root $2=ticket $3=reason $4=model
  local out="$LOGDIR/mark-$2.json"
  run_claude "$1" "/triage-block $2 -- $3" "$4" "1.5" "$out" "$LOGDIR/mark.err"
  dlog "marked blocked $2"
}

read_usage_pct(){ # live 5h utilization % (cached ~60s; account-wide)
  local now cache_ts token resp pct resets
  now=$(date +%s)
  if [ -f "$USAGE_CACHE" ]; then
    cache_ts=$(jqr '.ts // 0' "$USAGE_CACHE")
    if [ -n "$cache_ts" ] && [ "$cache_ts" != "null" ] && [ $((now - cache_ts)) -lt 60 ]; then
      jqr '.pct // empty' "$USAGE_CACHE"; return
    fi
  fi
  token="${CLAUDE_CODE_OAUTH_TOKEN:-}"   # container/headless: OAuth token from env (subscription)
  [ -z "$token" ] && token=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null | jq -r '.claudeAiOauth.accessToken // empty' 2>/dev/null)
  [ -z "$token" ] && { echo ""; return; }
  resp=$(curl -sS --max-time 10 "https://api.anthropic.com/api/oauth/usage" \
    -H "Authorization: Bearer $token" -H "anthropic-beta: oauth-2025-04-20" \
    -H "User-Agent: claude-code/2.1.193" -H "Accept: application/json" 2>/dev/null)
  pct=$(echo "$resp" | jq -r '.five_hour.utilization // empty' 2>/dev/null)
  resets=$(echo "$resp" | jq -r '.five_hour.resets_at // empty' 2>/dev/null)
  [ -n "$pct" ] && write_file "$USAGE_CACHE" "$(jq -nc --argjson pct "$pct" --arg resets "$resets" --argjson ts "$now" '{pct:$pct,resets_at:$resets,ts:$ts}')"
  echo "$pct"
}

# trailing-5h sums from the daemon's own ledger ($1 = field: cost_usd | tokens)
ledger_5h(){
  local cutoff
  cutoff=$(date -u -v-5H +%FT%TZ 2>/dev/null || date -u -d '5 hours ago' +%FT%TZ 2>/dev/null)
  [ -f "$LEDGER" ] || { echo 0; return; }
  jq -s --arg c "$cutoff" --arg f "$1" '[.[] | select(.ts >= $c) | (.[$f] // 0)] | add // 0' "$LEDGER" 2>/dev/null || echo 0
}

write_state(){ # $1 = running JSON array, $2 = pct string
  local spend tok recent paused thr running
  spend=$(ledger_5h cost_usd); [ -z "$spend" ] && spend=0
  tok=$(ledger_5h tokens); [ -z "$tok" ] && tok=0
  recent=$(tail -n 6 "$LEDGER" 2>/dev/null | jq -s '.' 2>/dev/null); echo "$recent" | jq -e . >/dev/null 2>&1 || recent='[]'
  paused=$(jqr '.paused // false' "$CONTROL")
  thr=$(jqr '.budget.maxFiveHourPercent // 40' "$CFG"); [ -z "$thr" ] && thr=40
  running="${1:-[]}"; echo "$running" | jq -e . >/dev/null 2>&1 || running='[]'
  write_file "$STATE" "$(jq -n \
    --argjson running "$running" --arg pct "${2:-}" \
    --arg threshold "$thr" --arg spend5h "$spend" --arg tokens5h "$tok" \
    --argjson recent "$recent" --arg paused "$paused" --arg updated "$(ts)" \
    '{updated:$updated, paused:($paused=="true"), fiveHourPct:($pct|tonumber? // null), thresholdPct:($threshold|tonumber? // 40), daemonTokens5h:($tokens5h|tonumber? // 0), daemonSpend5hUsd:($spend5h|tonumber? // 0), running:$running, recent:$recent}')"
}

# ============================ tick ============================

if ! mkdir "$LOCK" 2>/dev/null; then
  if find "$LOCK" -maxdepth 0 -mmin +60 2>/dev/null | grep -q .; then
    dlog "stale lock; reclaiming"; rmdir "$LOCK" 2>/dev/null; mkdir "$LOCK" 2>/dev/null || exit 0
  else exit 0; fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

[ -f "$CONTROL" ] || write_file "$CONTROL" '{"paused":false,"pausedProjects":[],"abandon":[]}'

if paused_global; then dlog "paused(global); skip"; write_state "[]" ""; exit 0; fi

# budget gate on live 5h %  (--force bypasses it for a manual test run)
FORCE=0; for a in "$@"; do [ "$a" = "--force" ] && FORCE=1; done
THRESH=$(jqr '.budget.maxFiveHourPercent // 40' "$CFG")
HOLD_UNKNOWN=$(jqr '.budget.holdIfUsageUnknown // true' "$CFG")
MAX_SPEND=$(jqr '.budget.maxSpend5hUsd // empty' "$CFG")   # headless fallback budget (USD, from own ledger)
PCT=$(read_usage_pct)
if [ "$FORCE" = "1" ]; then
  dlog "budget gate bypassed (--force); 5h at ${PCT:-?}%"
elif [ -z "$PCT" ] && [ -n "$MAX_SPEND" ]; then
  # subscription usage% unavailable (e.g. headless container) → gate on the daemon's own trailing-5h ledger spend
  SPENT=$(ledger_5h cost_usd); [ -z "$SPENT" ] && SPENT=0
  if awk "BEGIN{exit !($SPENT >= $MAX_SPEND)}"; then
    dlog "holding: 5h ledger spend \$$SPENT >= \$$MAX_SPEND (usage% unavailable)"; write_state "[]" ""; exit 0
  fi
  dlog "ledger budget ok: \$$SPENT < \$$MAX_SPEND (usage% unavailable)"
elif [ -z "$PCT" ]; then
  if [ "$HOLD_UNKNOWN" = "true" ]; then dlog "holding: 5h usage unknown (keychain/token?)"; write_state "[]" ""; exit 0; fi
elif awk "BEGIN{exit !($PCT >= $THRESH)}"; then
  dlog "holding: 5h window at ${PCT}% >= ${THRESH}%"; write_state "[]" "$PCT"; exit 0
fi

CAP=$(jqr '.limits.maxParallelTickets // 3' "$CFG")
TICKET_USD=$(jqr '.budget.perTicketMaxUsd // 4' "$CFG")
LIST_USD=$(jqr '.budget.listMaxUsd // 0.25' "$CFG")
REAP_USD=$(jqr '.budget.reapMaxUsd // 0.5' "$CFG")
TIMEOUT=$(( $(jqr '.limits.maxTicketMinutes // 30' "$CFG") * 60 ))
PROJ_COUNT=$(jqr '.projects | length' "$CFG")
# Right model per phase (see daemon.config `models`): the cheap orchestrator model runs the mechanical
# polls that fire every tick regardless of ticket volume (`/triage --list`, reaper, block-marking); the
# per-ticket write model (`/triage <ID>` — route + plan + implement, its subagents inherit it) is read
# per-project so a project can override models.write with its own `.model`.
CHEAP_MODEL=$(jqr '.models.orchestrator // "haiku"' "$CFG")

# ---- 1. discover claimable tickets per project (read-only --list) ----
# parallel indexed job arrays (bash 3.2 safe): Q_PROJ Q_ROOT Q_MODEL Q_TICKET; STATE 0=pending 1=running 2=done 3=skipped
Q_PROJ=(); Q_ROOT=(); Q_MODEL=(); Q_TICKET=(); n=0
for ((p=0; p<PROJ_COUNT; p++)); do
  name=$(jqr ".projects[$p].name" "$CFG"); root=$(jqr ".projects[$p].root" "$CFG")
  enabled=$(jqr ".projects[$p].enabled" "$CFG"); wmodel=$(jqr ".projects[$p].model // .models.write // \"opus\"" "$CFG")
  [ "$enabled" = "true" ] || continue
  proj_paused "$name" && { dlog "paused($name); skip"; continue; }
  [ -d "$root" ] || { dlog "missing root $name: $root"; continue; }
  lout="$LOGDIR/${name}.list.json"
  run_claude "$root" "/triage --list" "$CHEAP_MODEL" "$LIST_USD" "$lout" "$LOGDIR/${name}.err"
  ids=$(result_json "$lout" | jq -r '.[]?' 2>/dev/null)
  cnt=0
  for id in $ids; do
    Q_PROJ[$n]="$name"; Q_ROOT[$n]="$root"; Q_MODEL[$n]="$wmodel"; Q_TICKET[$n]="$id"
    JST[$n]=0; n=$((n+1)); cnt=$((cnt+1))
  done
  dlog "$name: $cnt claimable"
done

if [ "$n" -eq 0 ]; then
  dlog "no claimable tickets"
else
  # ---- 2. per-ticket pool: up to CAP concurrent, timeout + abandon + pause aware ----
  PID=(); START=()
  while :; do
    running=0
    # count running + launch up to CAP
    for ((k=0; k<n; k++)); do [ "${JST[$k]}" = "1" ] && running=$((running+1)); done
    if ! paused_global; then
      for ((k=0; k<n; k++)); do
        [ "$running" -ge "$CAP" ] && break
        [ "${JST[$k]}" = "0" ] || continue
        proj_paused "${Q_PROJ[$k]}" && { JST[$k]=3; continue; }
        out="$LOGDIR/${Q_TICKET[$k]}.$(date -u +%Y%m%dT%H%M%SZ).json"
        OUT[$k]="$out"
        run_claude "${Q_ROOT[$k]}" "/triage ${Q_TICKET[$k]}" "${Q_MODEL[$k]}" "$TICKET_USD" "$out" "$LOGDIR/${Q_PROJ[$k]}.err" &
        PID[$k]=$!; START[$k]=$(date +%s); JST[$k]=1; running=$((running+1))
        dlog "launched ${Q_TICKET[$k]} (${Q_PROJ[$k]}) pid ${PID[$k]} cap=\$$TICKET_USD"
      done
    fi
    # poll running: finish / timeout / abandon
    now=$(date +%s)
    for ((k=0; k<n; k++)); do
      [ "${JST[$k]}" = "1" ] || continue
      pid=${PID[$k]}
      if ! kill -0 "$pid" 2>/dev/null; then
        cost=$(jq -r '.total_cost_usd // 0' "${OUT[$k]}" 2>/dev/null); [ -z "$cost" ] && cost=0
        tokens=$(jq -r '((.usage.input_tokens//0)+(.usage.output_tokens//0)+(.usage.cache_creation_input_tokens//0))' "${OUT[$k]}" 2>/dev/null); [ -z "$tokens" ] && tokens=0
        # NB: don't use `.is_error // true` — jq's // treats `false` as absent, flipping it to true.
        iserr=$(jq -r 'if .is_error == false then "false" else "true" end' "${OUT[$k]}" 2>/dev/null); [ -z "$iserr" ] && iserr=true
        full=$(jq -r '.result // ""' "${OUT[$k]}" 2>/dev/null)
        # DETERMINISTIC block detection — Claude Code itself populates `permission_denials`, `is_error`
        # and `subtype`, so detection does NOT rely on the model choosing to self-report. A run can be
        # `is_error:false / subtype:success` (the model gave up politely) yet still have denied tools —
        # that exact case is what silently looked "done" before. The skill's `TRIAGE_BLOCKED:` line is
        # only a bonus reason source, never the trigger.
        # count only WRITE/EXEC denials (Edit/Write/Bash/NotebookEdit) — a denied *Read* (e.g. a
        # deny-rule `.env`) is benign exploration, not a block; a denied edit/command is the work failing.
        ndenials=$(jq -r '[.permission_denials[]? | select(.tool_name|IN("Edit","Write","Bash","NotebookEdit"))] | length' "${OUT[$k]}" 2>/dev/null); [ -z "$ndenials" ] && ndenials=0
        subtype=$(jq -r '.subtype // ""' "${OUT[$k]}" 2>/dev/null)
        blocked=false
        case "$subtype" in error_*) blocked=true;; esac
        [ "$iserr" = "true" ] && blocked=true
        case "$full" in *TRIAGE_BLOCKED:*) blocked=true;; esac
        # write/exec denials are a backstop ONLY when the run reached no real outcome — a run that
        # SOLVED / filed a PLAN / surfaced HUMAN while merely working AROUND a denied command (e.g.
        # a blocked `git worktree remove` it retried as `rm`) is NOT blocked.
        denied_blocks=false
        if [ "$ndenials" -gt 0 ] 2>/dev/null; then
          case "$full" in *SOLVED*|*/pull/*|*"PLAN("*|*"HUMAN("*|*NEEDS_HUMAN*) : ;; *) denied_blocks=true; blocked=true;; esac
        fi
        # reason priority: the model's own TRIAGE_BLOCKED diagnosis is the most accurate reason —
        # a denial is often just the first attempt it then worked around (e.g. ABC-4193: denial on
        # a compound cleanup command, real blocker was the sandboxed worktree checkout).
        if printf '%s' "$full" | grep -q 'TRIAGE_BLOCKED:'; then
          reason="$(printf '%s' "$full" | sed -n 's/.*TRIAGE_BLOCKED:[[:space:]]*//p' | head -1 | head -c 220)"
        elif [ "$denied_blocks" = "true" ]; then
          reason="permission denied — $(jq -r '[.permission_denials[]? | select(.tool_name|IN("Edit","Write","Bash","NotebookEdit")) | .tool_name + "(" + ((.tool_input.file_path // .tool_input.command // "?")|tostring) + ")"] | unique | join("; ")' "${OUT[$k]}" 2>/dev/null | head -c 220)"
        elif case "$subtype" in error_*) true;; *) false;; esac; then
          reason="run error — $subtype"
        else
          reason="unrecoverable error"
        fi
        [ "$blocked" = "true" ] || reason=""
        result=$(printf '%s' "$full" | tr '\n' ' ' | head -c 240)
        jq -nc --arg ts "$(ts)" --arg project "${Q_PROJ[$k]}" --arg ticket "${Q_TICKET[$k]}" --argjson cost "$cost" --argjson tokens "$tokens" --arg is_error "$iserr" --arg blocked "$blocked" --arg reason "$reason" --arg result "$result" \
          '{ts:$ts,project:$project,ticket:$ticket,cost_usd:$cost,tokens:$tokens,is_error:($is_error=="true"),blocked:($blocked=="true"),reason:$reason,result:$result}' >> "$LEDGER"
        dlog "done ${Q_TICKET[$k]} tokens=$tokens cost=\$$cost err=$iserr blocked=$blocked"
        if [ "$blocked" = "true" ]; then
          dlog "BLOCKED ${Q_TICKET[$k]}: $reason"
          alert "auto-triage blocked: ${Q_TICKET[$k]}" "$reason"
          mark_blocked "${Q_ROOT[$k]}" "${Q_TICKET[$k]}" "$reason" "$CHEAP_MODEL"
        fi
        JST[$k]=2; continue
      fi
      if paused_global || abandoned "${Q_TICKET[$k]}" "${Q_PROJ[$k]}"; then
        # user chose to abandon — kill it, leave the ticket untouched (the reaper handles it later).
        kill "$pid" 2>/dev/null; dlog "abandoned ${Q_TICKET[$k]} pid $pid"
        ctl_set "(.abandon // []) -= [\"${Q_TICKET[$k]}\"] | .abandon -= [\"${Q_PROJ[$k]}\"]"
        JST[$k]=2; continue
      elif [ $((now - ${START[$k]})) -ge "$TIMEOUT" ]; then
        # a timeout is an error it could not overcome — surface + mark it, same as a denial.
        kill "$pid" 2>/dev/null; dlog "timeout ${Q_TICKET[$k]} pid $pid (> ${TIMEOUT}s)"
        reason="timed out after ${TIMEOUT}s without finishing"
        jq -nc --arg ts "$(ts)" --arg project "${Q_PROJ[$k]}" --arg ticket "${Q_TICKET[$k]}" --arg reason "$reason" \
          '{ts:$ts,project:$project,ticket:$ticket,cost_usd:0,tokens:0,is_error:true,blocked:true,reason:$reason,result:$reason}' >> "$LEDGER"
        alert "auto-triage blocked: ${Q_TICKET[$k]}" "$reason"
        mark_blocked "${Q_ROOT[$k]}" "${Q_TICKET[$k]}" "$reason" "$CHEAP_MODEL"
        JST[$k]=2; continue
      fi
    done
    # build running state
    running_json="[]"
    for ((k=0; k<n; k++)); do
      [ "${JST[$k]}" = "1" ] || continue
      el=$(( $(date +%s) - ${START[$k]} ))
      running_json=$(echo "$running_json" | jq -c --arg t "${Q_TICKET[$k]}" --arg p "${Q_PROJ[$k]}" --argjson pid "${PID[$k]}" --argjson el "$el" '. + [{ticket:$t,project:$p,pid:$pid,elapsedSec:$el}]')
    done
    write_state "$running_json" "$PCT"
    # done?
    remaining=0
    for ((k=0; k<n; k++)); do case "${JST[$k]}" in 0|1) remaining=$((remaining+1));; esac; done
    [ "$remaining" -eq 0 ] && break
    sleep 5
  done
fi

# ---- 3. reaper: unlock stale claims (crashed/killed runs) ----
if [ "$(jqr '.reaper.enabled // true' "$CFG")" = "true" ]; then
  STUCK=$(jqr '.reaper.stuckAfterMinutes // 60' "$CFG")
  for ((p=0; p<PROJ_COUNT; p++)); do
    name=$(jqr ".projects[$p].name" "$CFG"); root=$(jqr ".projects[$p].root" "$CFG")
    enabled=$(jqr ".projects[$p].enabled" "$CFG")
    [ "$enabled" = "true" ] && [ -d "$root" ] || continue
    rout="$LOGDIR/${name}.cleanup.json"
    run_claude "$root" "/triage-cleanup $STUCK" "$CHEAP_MODEL" "$REAP_USD" "$rout" "$LOGDIR/${name}.err"
    reaped=$(result_json "$rout" | jq -rc '.reaped // []' 2>/dev/null)
    [ -n "$reaped" ] && [ "$reaped" != "[]" ] && dlog "$name reaped: $reaped"
  done
fi

write_state "[]" "$PCT"
