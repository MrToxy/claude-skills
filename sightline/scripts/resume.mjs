#!/usr/bin/env node
// sightline resume — the only thing a fresh context reads.
//   node scripts/resume.mjs [effort]
// Prints: MAP.md, the current row's question file, what moved in the repo since
// that row was last touched, and one Decides: line per finding. Nothing else —
// finished question files stay closed, which is the whole point.
// Read-only. No deps.

import { readFile, readdir, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { die, findSight, pickEffort, frontmatter, gitIn } from './lib.mjs';

const rule = (t) => `\n── ${t} ${'─'.repeat(Math.max(0, 58 - t.length))}\n`;

const sight = await findSight();
const effort = await pickEffort(sight, process.argv[2]);
const dir = join(sight, effort);
const git = gitIn(dirname(sight));

const map = await readFile(join(dir, 'MAP.md'), 'utf8').catch(() => die(`no MAP.md in ${dir}`));
console.log(`effort: ${effort}   (${dir})`);
// A board is the one thing outside this output that a fresh context must read.
const hasBoard = await access(join(dir, 'board.excalidraw')).then(() => true, () => false);
if (hasBoard) {
  console.log(rule('BOARD') + 'board.excalidraw exists — read it before anything else '
    + '(cookbooks/board.md). It is the most recent thing the user said.');
}

console.log(rule('MAP') + map.trim());

// Which of the reading artifacts exist. Their absence is what separates "still
// reconstructing" from "at the horizon" when the pointer is missing.
const artifacts = [];
for (const f of ['current-state.md', 'impact.md', 'alternatives.md']) {
  if (await access(join(dir, f)).then(() => true, () => false)) artifacts.push(f);
}

// The pointer is a line in MAP.md: `→ current: q/07-slug.md` while resolving,
// or `→ current: current-state.md` while still reading. Read it through
// whatever markdown decoration a hand added — a missed pointer looks exactly
// like a finished effort, and that mistake lands a plan over an open row.
const pointer = map.match(/^\s*(?:[-*>]\s+)?\**\s*→\s*current:\s*\**\s*(\S+)/mi)?.[1]
  ?.replace(/^[`*]+/, '').replace(/[`*]+$/, '');
if (!pointer) {
  // No pointer means one of two very different things. Say which.
  const qs = (await readdir(join(dir, 'q')).catch(() => [])).filter((f) => f.endsWith('.md'));
  const done = new Set((await readdir(join(dir, 'findings')).catch(() => []))
    .map((f) => f.match(/^(\d+)/)?.[1]).filter(Boolean));
  const open = qs.filter((f) => !done.has(f.match(/^(\d+)/)?.[1]));
  // Three very different states share one symptom. Say which.
  const missing = ['current-state.md', 'impact.md', 'alternatives.md'].filter((f) => !artifacts.includes(f));
  console.log(rule('CURRENT') + 'no `→ current:` line in MAP.md.\n' + (open.length
    ? `${open.length} row(s) still open with no finding:\n  ${open.join('\n  ')}\n`
      + 'An ASK row never holds the pointer, so this is an ASK batch waiting on the user —\n'
      + 'the effort is BLOCKED on it, not at its horizon. Do not land a plan over it.'
    : qs.length === 0
      ? `the front half is unfinished — no rows yet, and ${missing.length ? `missing ${missing.join(', ')}` : 'the reading artifacts are all present but untriaged'}.\n`
        + 'Read cookbooks/reconstruct.md and point `→ current:` at the artifact you are writing.'
      : 'every row has a finding — the effort is at its horizon. Read cookbooks/land.md.'));
} else {
  const row = await readFile(join(dir, pointer), 'utf8').catch(() => null);
  const label = pointer.startsWith('q/') ? 'CURRENT ROW' : 'CURRENT — still reading';
  console.log(rule(`${label} — ${pointer}`) + (row ? row.trim() : `missing file: ${pointer}`));

  const fm = row ? frontmatter(row) : {};
  // The reading frontier. Only reconstruction carries it, and it is the one
  // thing a cold context cannot re-derive from what's on disk.
  if (fm.unread) {
    console.log(rule('FRONTIER — not yet read') + fm.unread
      + '\n\nWrite each slice into the artifact as you read it, then update `unread:`.\n'
      + 'Stop when you can name what moves — reading past that is archaeology.');
  }
  const since = fm.touched;
  const paths = (fm.paths ?? '').split(/[,\s]+/).filter(Boolean);
  if (!since) {
    const misplaced = row && /^touched:/m.test(row);
    console.log(rule('MOVED SINCE') + 'no `touched:` in the row\'s frontmatter — staleness unknown.'
      + (misplaced ? '\nThe row does say `touched:`, but outside the opening `---` fence, so it '
        + 'was not read.\nMove it into the fence at the top of the file.' : ''));
  } else {
    const log = git(['log', '--oneline', '--since', since, '--', ...(paths.length ? paths : ['.'])]);
    console.log(rule(`MOVED SINCE ${since}${paths.length ? ` — ${paths.join(' ')}` : ' — whole repo'}`) +
      (log || 'nothing. what this file established still holds.'));
    if (log && !paths.length) console.log('\n(row has no `paths:` — narrow it to cut this noise)');
  }
}

const findings = await readdir(join(dir, 'findings')).catch(() => []);
if (findings.length) {
  const lines = [];
  for (const f of findings.filter((f) => f.endsWith('.md')).sort()) {
    const t = await readFile(join(dir, 'findings', f), 'utf8');
    lines.push(`${f.replace(/\.md$/, '').padEnd(4)} ${t.match(/^Decides:\s*(.+)$/m)?.[1] ?? '(no Decides: line)'}`);
  }
  console.log(rule('FINDINGS — Decides only') + lines.join('\n'));
}

// A spike is supposed to die with its finding, and the context that ends
// mid-probe takes that intention with it. So the survivors are named, not
// remembered.
try {
  const spikes = execFileSync(process.execPath,
    [join(import.meta.dirname, 'spike.mjs'), 'list', '--effort', effort], { encoding: 'utf8' }).trim();
  if (spikes && !spikes.startsWith('no spikes')) console.log(rule('SPIKES — still on disk') + spikes);
} catch {}

console.log(`\n${'─'.repeat(62)}\nRead nothing else${hasBoard ? ' but the board' : ''}. `
  + 'Closed rows are closed; findings are the compression.');
