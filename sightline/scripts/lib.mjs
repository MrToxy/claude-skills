// sightline — shared bits. No deps, read-only helpers.

import { readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';

export const die = (m) => { console.error(m); process.exit(1); };

// .sight/ lives at the git root, or anywhere up from cwd. `orNull` is for the
// one caller that may legitimately be creating it — opening a standalone spike.
export async function findSight({ orNull = false } = {}) {
  let dir = resolve(process.cwd());
  for (;;) {
    try { await stat(join(dir, '.sight')); return join(dir, '.sight'); } catch {}
    const up = dirname(dir);
    if (up === dir) return orNull ? null : die('no .sight/ found — this is not a sightline effort.');
    dir = up;
  }
}

// probes/ and vendor/ sit beside the efforts without being one.
export async function listEfforts(sight) {
  return (await readdir(sight, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && e.name !== 'vendor' && e.name !== 'probes')
    .map((e) => e.name);
}

export async function pickEffort(sight, wanted) {
  const efforts = await listEfforts(sight);
  if (wanted) {
    if (!efforts.includes(wanted)) die(`no such effort: ${wanted}\nhave: ${efforts.join(', ')}`);
    return wanted;
  }
  if (efforts.length === 1) return efforts[0];
  if (efforts.length === 0) die('.sight/ has no efforts yet.');
  die(`several efforts — name one:\n  ${efforts.join('\n  ')}`);
}

// Tolerant on read: a BOM, leading blank lines or CRLF must not silently cost
// the row its `touched:` stamp. The fence still has to be the first content.
export const frontmatter = (text) => {
  const m = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trimStart()
    .match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  return Object.fromEntries(
    m[1].split('\n').filter((l) => l.includes(':'))
      .map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]),
  );
};

// paths: in a row are relative to the repo, so git always runs from there.
export const gitIn = (cwd) => (args) => {
  try { return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim(); }
  catch { return ''; }
};

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
