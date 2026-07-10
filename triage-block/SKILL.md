---
name: triage-block
description: >
  Marks a single auto-triage work-item as BLOCKED on its OWN tracker when a run hit something it
  could not overcome (permission denial, broken environment, timeout, unrecoverable error). Applies
  the `triage-blocked` label, returns the item to the queue (Todo), and comments the reason — so it
  leaves the auto-queue until a human resolves the cause and clears the label. Tracker- and
  project-agnostic: reuses the triage config + tracker binding (Linear, GitHub, …), never assumes
  one. The daemon calls it after DETERMINISTICALLY detecting a block; also usable as
  `triage-block <ITEM-ID> -- <reason>`.
---

# triage-block — mark an item blocked (tracker-agnostic)

Detecting a block is deterministic and lives in the **scheduler**, not here: it reads Claude Code's
own `permission_denials` / `is_error` / `subtype` from the headless run, so detection never depends
on a model choosing to self-report. This skill is the **tracker-side effect** — record the block on
whatever tracker the item came from, via the same capability binding the rest of the pipeline uses.
It must never assume Linear; bind to the item's tracker from config.

Read first (cwd-relative — run from the project root; shared with `triage`, single source):
- `.claude/auto-triage.config.json` — `trackers` (each with its `interface` + `states`), `claimMarker`.
- `~/.claude/skills/triage/references/tracker-binding.md` — capabilities (`comment` / `setState` / label) per interface (`mcp:linear-server`, `cli:gh`, …).
- `~/.claude/skills/triage/references/work-item-schema.md` — canonical states + capability contract.

## Invocation
`triage-block <ITEM-ID> -- <reason>` — `<reason>` is a short human-readable cause (e.g.
`permission denied — Edit(/path/to/file)`). Both are supplied by the scheduler.

## Procedure

1. **Resolve the tracker** — determine which configured, **enabled** tracker owns `<ITEM-ID>` (by id
   shape and by looking it up through that tracker's binding). Act through ONLY that tracker's
   `interface` + `states`.
2. **Apply the `triage-blocked` label** — ensure it exists on that tracker first (idempotent: create
   if missing — a Linear label, `gh label create`, …), then add it to the item.
3. **Return to queue** — `setState → QUEUED` (that tracker's mapped queued/Todo state, e.g. Linear
   `Todo` or GitHub `label:triage`).
4. **Comment the reason** — exactly one comment:
   `🤖 auto-triage blocked: <reason>. A human must resolve this, then remove the 'triage-blocked' label to re-queue.`
5. **Output** — your entire final message is JSON: `{"blocked": "<ITEM-ID>"}` (or `{"blocked": null}`
   if the item could not be found on any enabled tracker).

## Why label + Todo (not a dead-end state)
The `triage-blocked` label is what keeps the item out of `triage --list` / CLAIM, so it stays
visible in the normal queue yet is never auto-re-claimed. A human clears the label to re-enable it —
the single, explicit human-in-the-loop gate. Pairing it with Todo means the item also surfaces in
the operator's usual queue view rather than rotting in an in-progress lane.

## Guardrails
- Bind to the item's OWN tracker — never hardcode Linear or GitHub.
- Only label + `setState` + one `comment`; never edit code, push, merge, or delete tracker data.
- Idempotent: applying an already-present label or re-posting the same state is a no-op, never a duplicate.
