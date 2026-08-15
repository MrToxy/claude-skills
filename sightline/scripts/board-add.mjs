#!/usr/bin/env node
// sightline board-add — append elements to an .excalidraw file, correctly.
// The 30-field element schema lives here once instead of being re-derived by
// hand every time. Append-only: user elements are never moved, edited, or
// deleted; everything this writes is id-prefixed `sl-` and coloured to match.
//
//   node scripts/board-add.mjs box "Queue" --at 0,0
//   node scripts/board-add.mjs arrow Queue Worker --label events
//   node scripts/board-add.mjs frame "07 — tenant isolation" --contains Queue,Worker
//   node scripts/board-add.mjs --json '[{"box":"Queue","at":[0,0]},{"box":"Worker"},
//                                       {"arrow":["Queue","Worker"],"label":"events"}]'
//   node scripts/board-add.mjs --list          # every id on the board, mine and theirs
//
// Refs (arrow endpoints, --contains) are ids or labels — `Queue` resolves to
// `sl-queue`. Default board: <sight>/<effort>/board.excalidraw, or --board <path>.
// No deps.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { die, findSight, pickEffort, slug } from './lib.mjs';

const AGENT = '#1971c2';                       // agent-added: blue. user default is #1e1e1e
const EMPTY = { type: 'excalidraw', version: 2, source: 'sightline', elements: [], appState: {} };
const rnd = () => Math.floor(Math.random() * 2 ** 31);

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = argv[i + 1];
  argv.splice(i, v && !v.startsWith('--') ? 2 : 1);
  return v && !v.startsWith('--') ? v : true;
};

const boardFlag = flag('board');
const listOnly = flag('list');
const jsonArg = flag('json');
const opt = {
  at: flag('at'), w: flag('w'), h: flag('h'),
  frame: flag('frame'), id: flag('id'), label: flag('label'), contains: flag('contains'),
};
const [verb, ...rest] = argv.filter((a) => !a.startsWith('--'));

const board = boardFlag ?? await (async () => {
  const sight = await findSight();
  return join(sight, await pickEffort(sight), 'board.excalidraw');
})();

const doc = JSON.parse(await readFile(board, 'utf8').catch(() => JSON.stringify(EMPTY)));
doc.elements ??= [];

if (listOnly) {
  for (const e of doc.elements.filter((e) => !e.isDeleted && e.type !== 'text')) {
    const label = doc.elements.find((t) => t.containerId === e.id)?.text ?? e.name ?? '';
    console.log(`${e.id.startsWith('sl-') ? 'mine ' : 'THEIRS'} ${e.type.padEnd(9)} ${e.id.padEnd(24)} ${label}`);
  }
  process.exit(0);
}

// ── refs ────────────────────────────────────────────────────────────────────
const byRef = (ref) => {
  const hit = doc.elements.find((e) => e.id === ref)
    ?? doc.elements.find((e) => e.id === `sl-${slug(ref)}`)
    ?? doc.elements.find((e) => doc.elements.some((t) => t.containerId === e.id && t.text === ref));
  if (!hit) {
    const ids = doc.elements.filter((e) => e.type !== 'text').map((e) => e.id);
    die(`no element "${ref}" on the board.\nknown: ${ids.join(', ') || '(empty board)'}`);
  }
  return hit;
};

const freshId = (want) => {
  let id = want.startsWith('sl-') ? want : `sl-${want}`;
  for (let n = 2; doc.elements.some((e) => e.id === id); n++) id = `sl-${want.replace(/^sl-/, '')}-${n}`;
  return id;
};

// next free column, so `box` without --at still lands somewhere sane
const nextX = () => doc.elements.filter((e) => e.type === 'rectangle')
  .reduce((m, e) => Math.max(m, e.x + e.width + 60), 0);

// ── element factories ───────────────────────────────────────────────────────
const base = (type, id, x, y, width, height) => ({
  id, type, x, y, width, height, angle: 0,
  strokeColor: AGENT, backgroundColor: 'transparent',
  fillStyle: 'solid', strokeWidth: 2, strokeStyle: 'solid', roughness: 1, opacity: 100,
  groupIds: [], frameId: null, index: null, roundness: null,
  seed: rnd(), version: 1, versionNonce: rnd(), isDeleted: false,
  boundElements: [], updated: Date.now(), link: null, locked: false,
});

const boundText = (text, container, x, y, width, height) => ({
  ...base('text', freshId(`${container.id.replace(/^sl-/, '')}-label`), x, y, width, height),
  fontSize: 20, fontFamily: 1, text, textAlign: 'center', verticalAlign: 'middle',
  containerId: container.id, originalText: text, autoResize: true, lineHeight: 1.25,
  boundElements: null,
});

function addBox(text, o = {}) {
  const [x, y] = o.at ?? [nextX(), 0];
  const w = o.w ?? 200, h = o.h ?? 80;
  const el = { ...base('rectangle', freshId(o.id ?? slug(text)), x, y, w, h), roundness: { type: 3 } };
  if (o.frame) el.frameId = byRef(o.frame).id;
  const label = boundText(text, el, x + 8, y + h / 2 - 12, w - 16, 25);
  if (el.frameId) label.frameId = el.frameId;
  el.boundElements = [{ id: label.id, type: 'text' }];
  doc.elements.push(el, label);
  return el;
}

function addArrow(fromRef, toRef, o = {}) {
  const a = byRef(fromRef), b = byRef(toRef);
  const [ax, ay] = [a.x + a.width / 2, a.y + a.height / 2];
  const [bx, by] = [b.x + b.width / 2, b.y + b.height / 2];
  const el = {
    ...base('arrow', freshId(`${a.id.replace(/^sl-/, '')}-${b.id.replace(/^sl-/, '')}`),
      ax, ay, Math.abs(bx - ax), Math.abs(by - ay)),
    roundness: { type: 2 },
    points: [[0, 0], [bx - ax, by - ay]],
    lastCommittedPoint: null,
    startBinding: { elementId: a.id, focus: 0, gap: 4 },
    endBinding: { elementId: b.id, focus: 0, gap: 4 },
    startArrowhead: null, endArrowhead: 'arrow', elbowed: false,
    frameId: a.frameId === b.frameId ? a.frameId : null,
  };
  // both ends must know about the arrow or it won't follow them when dragged
  for (const end of [a, b]) (end.boundElements ??= []).push({ id: el.id, type: 'arrow' });
  doc.elements.push(el);
  if (o.label) {
    const t = boundText(o.label, el, ax, ay, 100, 25);
    t.strokeColor = AGENT;
    el.boundElements.push({ id: t.id, type: 'text' });
    doc.elements.push(t);
  }
  return el;
}

function addFrame(name, o = {}) {
  const kids = (o.contains ?? []).map(byRef);
  const pad = 40;
  const [x, y] = o.at ?? (kids.length
    ? [Math.min(...kids.map((k) => k.x)) - pad, Math.min(...kids.map((k) => k.y)) - pad]
    : [0, 0]);
  const w = o.w ?? (kids.length ? Math.max(...kids.map((k) => k.x + k.width)) - x + pad : 900);
  const h = o.h ?? (kids.length ? Math.max(...kids.map((k) => k.y + k.height)) - y + pad : 600);
  const el = {
    ...base('frame', freshId(`f-${slug(name)}`), x, y, w, h),
    strokeColor: '#bbb', roughness: 0, name, boundElements: null,
  };
  for (const k of kids) {
    if (!k.id.startsWith('sl-')) die(`refusing to reframe "${k.id}" — it's the user's element.`);
    k.frameId = el.id;
    for (const t of doc.elements.filter((t) => t.containerId === k.id)) t.frameId = el.id;
  }
  doc.elements.push(el);
  return el;
}

// ── dispatch ────────────────────────────────────────────────────────────────
const pair = (s) => (Array.isArray(s) ? s : String(s).split(',').map(Number));
const added = [];

if (jsonArg !== undefined) {
  const raw = jsonArg === true
    ? await new Promise((r) => { let s = ''; process.stdin.on('data', (c) => (s += c)).on('end', () => r(s)); })
    : jsonArg;
  for (const step of JSON.parse(raw)) {
    if (step.box) added.push(addBox(step.box, step));
    else if (step.arrow) added.push(addArrow(step.arrow[0], step.arrow[1], step));
    else if (step.frame) added.push(addFrame(step.frame, step));
    else die(`step has no box/arrow/frame: ${JSON.stringify(step)}`);
  }
} else if (verb === 'box') {
  added.push(addBox(rest.join(' '), {
    at: opt.at && pair(opt.at), w: opt.w && +opt.w, h: opt.h && +opt.h, frame: opt.frame, id: opt.id,
  }));
} else if (verb === 'arrow') {
  added.push(addArrow(rest[0], rest[1], { label: opt.label === true ? undefined : opt.label }));
} else if (verb === 'frame') {
  added.push(addFrame(rest.join(' '), {
    at: opt.at && pair(opt.at), w: opt.w && +opt.w, h: opt.h && +opt.h,
    contains: opt.contains ? String(opt.contains).split(',') : [],
  }));
} else {
  die('usage: board-add.mjs [box|arrow|frame|--json|--list] …  (see header)');
}

await mkdir(dirname(board), { recursive: true });
await writeFile(board, JSON.stringify(doc, null, 2));
console.log(`${board}\n${added.map((e) => `+ ${e.type.padEnd(9)} ${e.id}`).join('\n')}`);
