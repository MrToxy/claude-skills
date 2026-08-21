#!/usr/bin/env node
// sightline spike — the lifecycle of a throwaway spike dir, as commands.
// A probe that ends with the model *remembering* to delete its spike leaves
// spikes behind; one effort finished with 17 of them still on disk. So opening
// and burning a spike are recipes, and `resume` names every one still standing.
//
//   node scripts/spike.mjs open 07-transit-api --rule "p99 < 40ms → LISTEN/NOTIFY"
//   node scripts/spike.mjs list                # what's on disk, and whether it can go
//   node scripts/spike.mjs burn 07             # refuses until findings/07*.md exists
//   node scripts/spike.mjs burn --all          # every spike whose finding has landed
//   node scripts/spike.mjs burn 07 --force     # it was junk, there is no finding coming
//
// The gate is the finding, not a confirmation: a spike dies once the thing it
// was built to produce is on disk. No deps.

import { mkdir, writeFile, readdir, readFile, stat, rm, appendFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { die, findSight, listEfforts, pickEffort, gitIn, slug } from './lib.mjs';

const EXCLUDE = ['.sight/probes/', '.sight/*/probes/'];

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = argv[i + 1];
  argv.splice(i, v && !v.startsWith('--') ? 2 : 1);
  return v && !v.startsWith('--') ? v : true;
};

const rule = flag('rule');
const all = flag('all');
const force = flag('force');
const wantedEffort = flag('effort');
const [verb = 'list', name] = argv.filter((a) => !a.startsWith('--'));

// `open` may be the first thing a standalone probe ever does, so it creates
// .sight/ rather than sending the user to a different skill for one mkdir.
const root = gitIn(process.cwd())(['rev-parse', '--show-toplevel']) || process.cwd();
const sight = await findSight({ orNull: verb === 'open' }) ?? join(root, '.sight');
const efforts = await listEfforts(sight).catch(() => []);
const probes = efforts.length
  ? join(sight, await pickEffort(sight, wantedEffort), 'probes')
  : join(sight, 'probes');
const findings = join(dirname(probes), 'findings');

if (verb === 'open') await open();
else if (verb === 'list') await list();
else if (verb === 'burn') await burn();
else die(`unknown: ${verb}\nhave: open | list | burn`);

// ── open ────────────────────────────────────────────────────────────────────
// The rule is the argument, not a nicety. `/probe` refuses to start without one;
// this refuses to make it a directory without one, which is the same refusal
// somewhere it cannot be talked out of.
async function open() {
  if (!name) die('name the spike:  sight spike <nn>-<slug> "<the rule>"');
  if (typeof rule !== 'string' || !rule.trim()) {
    die('no rule, no spike.\n'
      + 'One line naming the observation and the branch it picks:\n'
      + '  --rule "p99 < 40ms over 500 conns → LISTEN/NOTIFY; any dropped event → outbox"');
  }
  const dir = join(probes, slug(name));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'RULE.md'), `${rule.trim()}\n`);
  await exclude();
  console.log(dir);
  console.log(`RULE.md written. Nothing here is imported into the real tree; when the finding
lands, burn it:  sight burn ${nn(slug(name)) ?? slug(name)}`);
}

// Quarantine without touching the repo's tracked ignore file — the effort is
// shareable, the spike never is.
async function exclude() {
  const path = join(root, '.git', 'info', 'exclude');
  const have = await readFile(path, 'utf8').catch(() => null);
  if (have === null) return;                       // not a repo, or no .git/info — nothing to quarantine
  const missing = EXCLUDE.filter((l) => !have.split('\n').includes(l));
  if (missing.length) await appendFile(path, `${have.endsWith('\n') || !have ? '' : '\n'}${missing.join('\n')}\n`);
}

// ── list ────────────────────────────────────────────────────────────────────
async function list() {
  const spikes = await survey();
  if (!spikes.length) return console.log('no spikes on disk.');
  for (const s of spikes) {
    console.log(`${s.name.padEnd(28)} ${String(s.files).padStart(3)} file${s.files === 1 ? ' ' : 's'}  ${s.age.padStart(4)}  ${s.why}`);
  }
  const sealed = spikes.filter((s) => s.sealed);
  if (sealed.length) console.log(`\n${sealed.length} can go:  sight burn --all`);
}

// A spike is sealed when the thing it was built to produce is on disk — the
// finding for its row. The gate is existence, not shape: findings in a real
// effort are prose as often as 4-liners, and a gate that fires on two thirds of
// them would be forced every time, which is no gate. A missing `Decides:` line
// is said out loud and burns anyway.
async function survey() {
  const names = (await readdir(probes, { withFileTypes: true }).catch(() => []))
    .filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const out = [];
  for (const n of names) {
    const dir = join(probes, n);
    const found = await findingFor(n);
    out.push({
      name: n,
      dir,
      files: await count(dir),
      age: since((await stat(dir)).mtimeMs),
      sealed: !!found || !nn(n),
      why: found
        ? `sealed — ${found.file}${found.decides ? '' : '  (no `Decides:` line)'}`
        : (nn(n) ? `no findings/${nn(n)}*.md yet` : 'standalone — no finding to wait on'),
    });
  }
  return out;
}

function nn(name) { return name.match(/^(\d+)/)?.[1]; }

// `06-score` is answered by `06a-pipeline.md` as much as by `06.md`, so match on
// the row number and take whatever suffix the effort gave it.
async function findingFor(spikeName) {
  const n = nn(spikeName);
  if (!n) return null;
  const files = (await readdir(findings).catch(() => []))
    .filter((f) => f.endsWith('.md') && Number(f.match(/^(\d+)/)?.[1]) === Number(n)).sort();
  if (!files.length) return null;
  for (const f of files) {
    const text = await readFile(join(findings, f), 'utf8');
    if (/^\s*(?:\*\*)?Decides:/m.test(text)) return { file: f, decides: true };
  }
  return { file: files.length > 1 ? `${files[0]} +${files.length - 1}` : files[0], decides: false };
}

async function count(dir) {
  let n = 0;
  for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    n += e.isDirectory() ? await count(join(dir, e.name)) : 1;
  }
  return n;
}

function since(ms) {
  const h = (Date.now() - ms) / 36e5;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
}

// ── burn ────────────────────────────────────────────────────────────────────
async function burn() {
  if (!name && !all) die('name it or clear them all:  sight burn <nn>  |  sight burn --all');
  const spikes = await survey();
  if (all && !spikes.length) return console.log('no spikes on disk.');
  const targets = all ? spikes
    : spikes.filter((s) => s.name === name
      || (nn(name) && Number(nn(s.name)) === Number(nn(name))));
  if (!targets.length) die(`no spike matching \`${name ?? '--all'}\`.\n` + spikes.map((s) => `  ${s.name}`).join('\n'));

  let burned = 0;
  for (const s of targets) {
    if (!s.sealed && !force) {
      console.log(`kept   ${s.name}  — ${s.why}`);
      if (!all) console.log('\nWrite the finding first. It is the only thing the spike was for.\n'
        + '`Decides: nothing` is a legitimate finding; an undeleted spike is not.\n'
        + 'Then rerun, or --force if this one is junk.');
      continue;
    }
    // Never delete outside the quarantine, whatever survey() was handed.
    if (!resolve(s.dir).startsWith(resolve(probes) + '/')) die(`refusing to delete outside probes/: ${s.dir}`);
    await rm(s.dir, { recursive: true, force: true });
    burned++;
    console.log(`burned ${s.name}  (${s.files} file${s.files === 1 ? '' : 's'})${s.sealed ? '' : ' — forced, no finding'}`);
  }
  // Nothing burned is a failure, so a recipe that chains off this one stops.
  if (!burned) process.exit(1);
}
