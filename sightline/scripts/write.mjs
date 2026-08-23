#!/usr/bin/env node
// sightline write — the only way an artifact comes into existence.
// Every artifact the effort keeps is machine-read later: `touched:` drives the
// staleness check, `paths:` drives the git-log, `unread:` is the frontier a
// cold context resumes from. All three were prose instructions, so all three
// were missed — stamps below the fence, findings with no `Decides:` line, a
// row whose `paths:` was never narrowed. A file that can only be born through
// this cannot be born malformed.
//
//   ... | node scripts/write.mjs findings/07.md --paths src/db --requires "single tenant"
//   ... | node scripts/write.mjs current-state.md --paths "src/api src/db" --unread "the write path"
//
// The body arrives on stdin. `touched:` is never yours to pass. No deps.

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { die, findSight, pickEffort, frontmatter } from './lib.mjs';
import { SHAPES, KNOWN, kindOf, today, violations } from './shape.mjs';

const HINT = {
  paths: '"src/api/orders.ts src/db"   what this depends on — git watches these',
  requires: '"single tenant; < 50 groups"   what must stay true, or `none`',
  unread: '"the write path below OrderService"   the frontier, or "" when done',
};

const WHY = {
  findings: 'A finding without `Decides:` is a note. The line is what `resume` shows\n'
    + 'a cold context, and `burn` looks for — without it the effort keeps the spike.',
  'impact.md': '`## Moves` is the point of impact.md: what changes when this lands.\n'
    + 'An impact with no Moves section is a description of the feature.',
};

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = argv[i + 1];
  argv.splice(i, v !== undefined && !v.startsWith('--') ? 2 : 1);
  return v !== undefined && !v.startsWith('--') ? v : '';
};

const given = { paths: flag('paths'), requires: flag('requires'), unread: flag('unread') };
const wantedEffort = flag('effort');
const [rel] = argv.filter((a) => !a.startsWith('--'));

if (!rel) die(`name what you are writing:\n  ${KNOWN.map((k) => `sight write ${k} ...`).join('\n  ')}`);

const kind = kindOf(rel);
if (!kind) {
  die(`\`${rel}\` is not an artifact this effort keeps.\n`
    + `have:\n  ${KNOWN.join('\n  ')}\n`
    + 'There is no fourth store. An open question is a `q/` row, not a new file.');
}

const body = (await read(process.stdin)).trim();
if (!body) die('nothing on stdin. The body is the argument; the frontmatter is mine.');
if (/^﻿?\s*---\s*$/m.test(body.split('\n')[0])) {
  die('the body starts with a `---` fence.\n'
    + 'Pass the body only — the stamp is written here so it cannot be wrong:\n'
    + '  --paths, --requires, --unread as flags; `touched:` never.');
}

// Refuse before writing, naming the flag rather than the field: the fix has to
// be the thing you retype, not the thing you'd have to go and learn.
const missing = SHAPES[kind].keys.filter((k) => given[k] === undefined);
if (missing.length) {
  die(`\`${rel}\` needs ${missing.map((k) => `--${k}`).join(' and ')}.\n`
    + missing.map((k) => `  --${k} ${HINT[k]}`).join('\n')
    + (missing.includes('requires')
      ? '\n\n`--requires none` is a real answer. A finding with no stated conditions '
        + 'is\na finding nobody can tell has expired.' : ''));
}
const bad = violations({ kind, fm: { touched: today(), ...clean(given) }, body });
const noun = { q: 'question file', findings: 'finding' }[kind] ?? kind;
if (bad.length) die(`\`${rel}\` is not yet a ${noun}:\n  ${bad.join('\n  ')}\n\n${WHY[kind] ?? ''}`.trim());

const sight = await findSight();
const dir = join(sight, await pickEffort(sight, wantedEffort));
const file = join(dir, rel);

// Overwriting is the normal case — an artifact is re-stamped every time it is
// worked. What is not normal is `paths:` getting shorter, which happens when a
// later write retypes half the list from memory. Show the old one either way.
const before = frontmatter(await readFile(file, 'utf8').catch(() => ''));

const fm = { touched: today(), ...clean(given) };
const width = Math.max(...Object.keys(fm).map((k) => k.length)) + 1;
const head = Object.entries(fm).map(([k, v]) => `${(k + ':').padEnd(width)} ${v}`.trimEnd()).join('\n');

await mkdir(dirname(file), { recursive: true });
await writeFile(file, `---\n${head}\n---\n\n${body}\n`);

console.log(`${rel}  —  touched: ${fm.touched}`);
for (const [k, v] of Object.entries(before)) {
  if (k !== 'touched' && fm[k] !== undefined && fm[k] !== v) console.log(`  ${k}: was  ${v}`);
}

function clean(o) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

async function read(stream) {
  if (stream.isTTY) return '';
  let out = '';
  for await (const chunk of stream) out += chunk;
  return out;
}
