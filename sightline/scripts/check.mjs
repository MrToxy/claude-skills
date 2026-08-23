#!/usr/bin/env node
// sightline check — what is not finished, said out loud, before it is handed on.
// `write` refuses a malformed file at birth; this refuses an unfinished effort
// at the gate. They are different moments on purpose: demanding completeness at
// write would break the write-as-you-go loop, and the loop is what survives a
// context reset.
//
//   node scripts/check.mjs [effort]     read-only. exit 1 if a gate fails.
//
// Run it before moving `→ current:`, and again before landing a plan. It
// changes nothing — a checker that edits is a checker nobody believes.
//
// The last gate is not in here, and that is the honest part: no script can see
// whether the user can explain the system back. This one says so rather than
// implying green means ready. No deps.

import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { die, findSight, pickEffort, frontmatter } from './lib.mjs';
import { kindOf, violations } from './shape.mjs';

const sight = await findSight();
const effort = await pickEffort(sight, process.argv[2]);
const dir = join(sight, effort);
const has = (f) => access(join(dir, f)).then(() => true, () => false);
const read = (f) => readFile(join(dir, f), 'utf8').catch(() => null);

const fails = [];
const notes = [];
const fail = (gate, what, fix) => fails.push({ gate, what, fix });

const map = await read('MAP.md') ?? die(`no MAP.md in ${dir}`);

// ── the reading, and whether it finished ────────────────────────────────────
// Missing artifacts and a full frontier are the same failure at two stages:
// the reading is not done. Both block the handoff, neither blocks a row.
for (const f of ['current-state.md', 'impact.md', 'alternatives.md']) {
  if (!(await has(f))) fail('reading', `no ${f}`, 'cookbooks/reconstruct.md — the order is the whole skill');
}

const state = await read('current-state.md');
if (state && (frontmatter(state).unread ?? '') !== '') {
  fail('frontier', `current-state.md still has \`unread: ${frontmatter(state).unread}\``,
    'read that slice and write it in, or say plainly it is out of scope and clear the field');
}

// A `## Moves` heading with nothing under it is the failure mode, not a missing
// heading — the section gets written early and filled never.
const impact = await read('impact.md');
if (impact) {
  const after = impact.split(/^##\s*Moves\s*$/m)[1];
  if (!after?.split(/^##\s/m)[0].trim()) {
    fail('moves', 'impact.md has no `## Moves` content',
      'name what changes when this lands. If nothing does, the effort has no impact');
  }
}

// ── the rows ────────────────────────────────────────────────────────────────
// Same row-reading as `resume`: a grep, not a parser. Real maps put the class
// in whichever column the effort felt like.
const CLASSES = /\b(ASK|RESEARCH|PROBE|DEFER)\b/;
const rows = map.split('\n').filter((l) => l.trim().startsWith('|') && CLASSES.test(l))
  .map((l) => ({
    line: l.trim(),
    nn: l.match(/\|\s*(\d+)[a-z]?\s*\|/)?.[1],
    cls: l.match(CLASSES)[1],
    resolved: /findings\//.test(l) || /resolved/i.test(l),
  }));

const findingFiles = (await readdir(join(dir, 'findings')).catch(() => [])).filter((f) => f.endsWith('.md'));
const answered = new Set(findingFiles.map((f) => String(Number(f.match(/^(\d+)/)?.[1]))));

for (const r of rows) {
  if (r.cls === 'DEFER' || !r.nn || r.resolved) continue;
  if (!answered.has(String(Number(r.nn)))) {
    fail('rows', `row ${r.nn} (${r.cls}) has no finding`,
      r.cls === 'ASK' ? 'an answered ASK still lands as findings/<nn>.md — in their words'
        : 'resolve it, or demote it to DEFER with a trigger and who notices');
  }
}

// ── the spikes ──────────────────────────────────────────────────────────────
const standing = (await readdir(join(dir, 'probes'), { withFileTypes: true }).catch(() => []))
  .filter((e) => e.isDirectory()).map((e) => e.name);
for (const s of standing) {
  fail('spikes', `probes/${s} is still on disk`, `sight burn ${s.match(/^(\d+)/)?.[1] ?? s}  (or --force, if it was junk)`);
}

// ── the shape of what is already written ────────────────────────────────────
// Efforts that predate `sight write` have unstamped files. That is history, not
// a failure — it is said once and never blocks, because the fix is to rewrite a
// file whose content is fine.
for (const rel of await onDisk()) {
  const text = await read(rel);
  const fm = frontmatter(text);
  const bad = violations({ kind: kindOf(rel), fm, body: text });
  if (!bad.length) continue;
  if (!('touched' in fm)) notes.push(`${rel} — written before \`sight write\`; unstamped, so staleness is invisible`);
  else fail('shape', `${rel}: ${bad.join(', ')}`, `sight write ${rel} ... < body`);
}

// ── the deferred rows: a prompt, not a gate ─────────────────────────────────
// Whether a `When` cell names who notices cannot be read by a script without
// inventing syntax for it. So this asks rather than refuses — and says which
// it is, because a checker that blurs the two teaches you to ignore it.
const deferred = rows.filter((r) => r.cls === 'DEFER' && !r.resolved);

// ── say it ──────────────────────────────────────────────────────────────────
const bar = (t) => `\n── ${t} ${'─'.repeat(Math.max(0, 58 - t.length))}\n`;
console.log(`effort: ${effort}   (${dir})`);

if (fails.length) {
  console.log(bar(`${fails.length} gate${fails.length === 1 ? '' : 's'} not met`)
    + fails.map((f) => `${f.gate.padEnd(9)} ${f.what}\n${' '.repeat(10)}→ ${f.fix}`).join('\n\n'));
}
if (notes.length) console.log(bar('noted, not blocking') + notes.join('\n'));

if (deferred.length) {
  console.log(bar('confirm — every deferred row names who notices')
    + deferred.map((r) => r.line).join('\n')
    + '\n\nA trigger with no owner is a wish. Each of these is the plan\'s (a precondition),\n'
    + 'yours (the three checks), the running code\'s (plant the tripwire as a step), or\n'
    + 'nobody\'s — and nobody\'s means it shipped: write the default and close the row.');
}

if (!fails.length) {
  console.log(bar('mechanical gates met')
    + 'The reading is written down, every row has a finding, no spike is standing.\n\n'
    + 'The gate that matters is not in here. Nothing on disk can show whether the user\n'
    + 'can explain the system back in their own words — and that, not this output, is\n'
    + 'what says the plan is safe to land. Ask them. Green here is permission to ask,\n'
    + 'not permission to hand over.');
}
process.exit(fails.length ? 1 : 0);

// Every artifact the effort keeps, as effort-relative paths.
async function onDisk() {
  const out = [];
  for (const f of ['current-state.md', 'impact.md', 'alternatives.md']) if (await has(f)) out.push(f);
  for (const sub of ['q', 'findings']) {
    for (const f of (await readdir(join(dir, sub)).catch(() => [])).sort()) {
      if (f.endsWith('.md')) out.push(`${sub}/${f}`);
    }
  }
  return out;
}
