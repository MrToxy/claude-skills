#!/usr/bin/env node
// sightline resume — the only thing a fresh context reads.
//   node scripts/resume.mjs [effort]
// Prints: MAP.md, the current row's question file, what moved in the repo since
// that row was last touched, and one Decides: line per finding. Nothing else —
// finished question files stay closed, which is the whole point.
// Read-only. No deps.

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { die, findSight, pickEffort, frontmatter, gitIn } from './lib.mjs';

const rule = (t) => `\n── ${t} ${'─'.repeat(Math.max(0, 58 - t.length))}\n`;

const sight = await findSight();
const effort = await pickEffort(sight, process.argv[2]);
const dir = join(sight, effort);
const git = gitIn(dirname(sight));

const map = await readFile(join(dir, 'MAP.md'), 'utf8').catch(() => die(`no MAP.md in ${dir}`));
console.log(`effort: ${effort}   (${dir})`);
console.log(rule('MAP') + map.trim());

// The pointer is a literal line in MAP.md: `→ current: q/07-slug.md`
const pointer = map.match(/^→ current:\s*(\S+)/m)?.[1];
if (!pointer) {
  console.log(rule('CURRENT ROW') + 'no `→ current:` line in MAP.md — pick a row and add one.\n'
    + '(expected if every `now` row is closed: the effort is at its horizon.)');
} else {
  const row = await readFile(join(dir, pointer), 'utf8').catch(() => null);
  console.log(rule(`CURRENT ROW — ${pointer}`) + (row ? row.trim() : `missing file: ${pointer}`));

  const fm = row ? frontmatter(row) : {};
  const since = fm.touched;
  const paths = (fm.paths ?? '').split(/[,\s]+/).filter(Boolean);
  if (!since) {
    console.log(rule('MOVED SINCE') + 'no `touched:` in the row\'s frontmatter — staleness unknown.');
  } else {
    const log = git(['log', '--oneline', '--since', since, '--', ...(paths.length ? paths : ['.'])]);
    console.log(rule(`MOVED SINCE ${since}${paths.length ? ` — ${paths.join(' ')}` : ' — whole repo'}`) +
      (log || 'nothing. the row\'s Phase 0 answers still hold.'));
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

console.log(`\n${'─'.repeat(62)}\nRead nothing else. Closed rows are closed; findings are the compression.`);
