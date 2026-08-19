#!/usr/bin/env node
// sightline board — local Excalidraw bound to one file, two-way.
//   node scripts/board-serve.mjs .sight/<effort>/board.excalidraw
// Opens http://localhost:3777, autosaves to that path on every change.
// The file is the source of truth; the agent reads and appends to the same path.
//
// Run it under Monitor (persistent) — stdout is the event stream:
//   you draw  → PUT → 3s of no edits (pen down) → semantic diff → one stdout
//               block → one chat notification. Position/size included; JSON isn't.
//   agent adds → mtime poll → SSE → browser merges by id (append-only, your
//               in-flight drag is never touched) → diff base moves silently, so
//               the agent is never notified of its own edits.
// Everything else (saves) goes to stderr so it can't become an event.
//
// The excalidraw and react it serves are committed under <skill>/vendor/. So the
// board installs nothing, downloads nothing, works offline from the first run,
// and puts nothing at all into the repo being worked on.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = process.argv[2] ?? '.sight/board.excalidraw';
const PORT = Number(process.env.PORT ?? 3777);
const SETTLE = Number(process.env.SETTLE ?? 3000);   // no edits for this long = pen down
const POLL = 750;                                     // how fast agent writes reach the browser
const MOVED = 20;                                     // px below this is jitter, not a move
const EMPTY = { type: 'excalidraw', version: 2, source: 'sightline', elements: [], appState: {} };

// Checked in, one copy for every repo this skill is ever run against. Pinned to
// the last versions that publish a browser-ready UMD build — excalidraw 0.17.6,
// react 18.3.1 — which is what removes the bundler. Replacing either means
// checking a plain <script src> still boots it.
const VENDOR = join(dirname(dirname(fileURLToPath(import.meta.url))), 'vendor');

// 0.17.x injects its own styles from the bundle — there is no stylesheet to link.
const head = `<script>window.EXCALIDRAW_ASSET_PATH="/vendor/";</script>
     <script src="/vendor/react.js"></script>
     <script src="/vendor/react-dom.js"></script>
     <script src="/vendor/excalidraw.js"></script>
     <script>window.Excalidraw=ExcalidrawLib.Excalidraw;window.createRoot=ReactDOM.createRoot;</script>`;

const page = `<!doctype html><html><head><meta charset="utf-8">
<title>sightline — ${FILE}</title>
${head}
<style>html,body,#app{margin:0;height:100%}</style>
</head><body><div id="app"></div><script>
const { useState, useEffect, createElement: h } = React;
let timer, lastSent = '', api = null;

// The agent appends to the same file while this tab is open. Merge by id:
// elements already on screen keep their geometry (you may be mid-drag), and
// only gain what an append can add — arrow bindings and a frame.
function merge(incoming) {
  if (!api) return;
  // including deleted: an element you erased is present with isDeleted, and
  // dropping it here would let the server read it as "never seen" and revive it.
  const scene = (api.getSceneElementsIncludingDeleted ?? api.getSceneElements).call(api);
  const here = new Map(scene.map(e => [e.id, e]));
  const ids = (b) => (b ?? []).map(x => x.id).join();
  let changed = false;
  const out = scene.map(e => {
    const inc = incoming.find(i => i.id === e.id);
    if (!inc) return e;
    const bound = [...(e.boundElements ?? [])];
    for (const b of inc.boundElements ?? []) if (!bound.some(x => x.id === b.id)) bound.push(b);
    const frameId = e.frameId ?? inc.frameId ?? null;
    if (ids(bound) === ids(e.boundElements) && frameId === (e.frameId ?? null)) return e;
    changed = true;
    return { ...e, boundElements: bound, frameId };
  });
  for (const inc of incoming) if (!here.has(inc.id)) { out.push(inc); changed = true; }
  if (changed) api.updateScene({ elements: out });
}

function save(elements, appState) {
  const body = JSON.stringify({
    type: 'excalidraw', version: 2, source: 'sightline',
    elements,
    appState: { viewBackgroundColor: appState.viewBackgroundColor, gridSize: appState.gridSize },
  }, null, 2);
  if (body === lastSent) return;          // no-op changes (cursor moves) must not touch the file
  lastSent = body;
  clearTimeout(timer);
  timer = setTimeout(() => fetch('/board', { method: 'PUT', body }), 400);
}

function App() {
  const [initial, setInitial] = useState(null);
  useEffect(() => { fetch('/board').then(r => r.json()).then(setInitial); }, []);
  useEffect(() => {
    const es = new EventSource('/events');
    es.onmessage = (ev) => merge(JSON.parse(ev.data));
    return () => es.close();
  }, []);
  if (!initial) return h('div', null, 'loading…');
  return h(Excalidraw, {
    initialData: { elements: initial.elements ?? [], appState: initial.appState ?? {}, scrollToContent: true },
    onChange: save,
    excalidrawAPI: (a) => { api = a; },
  });
}
createRoot(document.getElementById('app')).render(h(App));
</script></body></html>`;

const read = async () => {
  try { return JSON.parse(await readFile(FILE, 'utf8')); }
  catch { return EMPTY; }
};

// ── what changed, in board vocabulary ───────────────────────────────────────
// Excalidraw soft-deletes and rewrites version/seed on every touch, so a raw
// JSON diff is unreadable. Track only what someone would say out loud.

const labelOf = (els, e) => e.name
  ?? els.find((t) => t.containerId === e.id && !t.isDeleted)?.text
  ?? (e.type === 'text' ? e.text : '') ?? '';

const snap = (els) => {
  const m = new Map();
  for (const e of els) {
    if (e.type === 'text' && e.containerId) continue;      // shows up as its container's label
    m.set(e.id, {
      type: e.type, deleted: !!e.isDeleted, label: labelOf(els, e),
      from: e.startBinding?.elementId ?? null, to: e.endBinding?.elementId ?? null,
      frameId: e.frameId ?? null, x: Math.round(e.x ?? 0), y: Math.round(e.y ?? 0), inbound: 0,
    });
  }
  for (const e of els) {
    const t = e.type === 'arrow' && !e.isDeleted && e.endBinding?.elementId;
    if (t && m.has(t)) m.get(t).inbound++;
  }
  return m;
};

const who = (id) => (id.startsWith('sl-') ? 'mine  ' : 'THEIRS');
const q = (s) => (s ? `"${s}"` : '');
// An unlabelled box is normal — people draw the shape first. Say where it is;
// its 21-char excalidraw id is noise, and worse, unrepeatable back to them.
const at = (e) => (e ? `@${e.x},${e.y}` : '?');
const nameIn = (m, id) => (id ? (m.get(id)?.label || at(m.get(id))) : '?');
const row = (mark, id, e, tail) => `  ${mark} ${who(id)} ${e.type.padEnd(9)} ${tail}`;

function diff(before, after) {
  const out = [];
  for (const [id, a] of after) {
    const b = before.get(id);
    if (a.deleted) { if (b && !b.deleted) out.push(row("-", id, a, q(a.label) || at(a))); continue; }
    if (!b || b.deleted) {
      // both flags are gap-mining signal — see cookbooks/board.md
      const shape = ['rectangle', 'ellipse', 'diamond'].includes(a.type);
      const flags = [];
      if (!a.label && a.type !== 'frame') flags.push('unlabelled');
      if (shape && !a.inbound) flags.push('no inbound arrow');
      const flag = flags.length ? `   (${flags.join(', ')})` : '';
      const what = a.type === 'arrow'
        ? `${nameIn(after, a.from)} → ${nameIn(after, a.to)} ${q(a.label)}`.trim()
        : q(a.label) || at(a);
      out.push(row('+', id, a, what + flag));
      continue;
    }
    const seen = q(a.label) || at(a), ch = [];
    if (a.label !== b.label) ch.push(`label: ${q(b.label) || '(none)'} → ${q(a.label) || '(none)'}`);
    if (a.from !== b.from || a.to !== b.to)
      ch.push(`${nameIn(before, b.from)} → ${nameIn(before, b.to)}  becomes  ${nameIn(after, a.from)} → ${nameIn(after, a.to)}`);
    if (a.frameId !== b.frameId) ch.push(`frame: ${b.frameId ? nameIn(before, b.frameId) : '(none)'} → ${a.frameId ? nameIn(after, a.frameId) : '(none)'}`);
    if (!ch.length && (Math.abs(a.x - b.x) > MOVED || Math.abs(a.y - b.y) > MOVED))
      ch.push(`moved ${a.x - b.x >= 0 ? '+' : ''}${a.x - b.x},${a.y - b.y >= 0 ? '+' : ''}${a.y - b.y}`);
    for (const c of ch) out.push(row('~', id, a, `${seen}  ${c}`));
  }
  for (const [id, b] of before) if (!after.has(id) && !b.deleted) out.push(row("-", id, b, q(b.label) || at(b)));
  return out;
}

// ── the two directions ──────────────────────────────────────────────────────
const doc0 = await read();
let latest = doc0.elements ?? [];                       // last known state, from either side
let base = snap(latest);                                // last state the agent was told about
let onDisk = await readFile(FILE, 'utf8').catch(() => null);
let settle;

// user drew: hold until the pen goes down, then emit one block for the batch
function penMoved() {
  clearTimeout(settle);
  settle = setTimeout(() => {
    const now = snap(latest);
    const lines = diff(base, now);
    base = now;
    if (lines.length) process.stdout.write(
      `board: ${lines.length} change${lines.length > 1 ? 's' : ''} — ${FILE}\n${lines.join('\n')}\n`);
  }, SETTLE);
}

// agent wrote: push it to the open tab, and move the base WITHOUT emitting —
// this is what stops the agent being notified of its own appends.
const clients = new Set();
const broadcast = (els) => {
  const payload = `data: ${JSON.stringify(els)}\n\n`;
  for (const res of clients) res.write(payload);
};

// Only the ids the agent's write actually touched. Re-snapping wholesale would
// swallow a user change drawn seconds earlier whose settle hasn't fired yet.
function agentTouched(before, after) {
  for (const [id, e] of after) {
    const b = before.get(id);
    if (!b || JSON.stringify(b) !== JSON.stringify(e)) base.set(id, e);
  }
  for (const id of before.keys()) if (!after.has(id)) base.delete(id);
}

setInterval(async () => {
  const text = await readFile(FILE, 'utf8').catch(() => null);
  if (text == null || text === onDisk) return;
  onDisk = text;
  let doc; try { doc = JSON.parse(text); } catch { return; }
  const before = snap(latest);
  latest = doc.elements ?? [];
  agentTouched(before, snap(latest));
  broadcast(latest);
}, POLL);

const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json' };

createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/board' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(await read()));
  }
  if (url === '/board' && req.method === 'PUT') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let text = Buffer.concat(chunks).toString('utf8');
    let doc; try { doc = JSON.parse(text); } catch { return res.end('ok'); }
    // The tab may have drawn this scene before an agent append reached it — and
    // deletions arrive as isDeleted, never as absence. So an id the tab has
    // never heard of is one the agent just wrote: union it back, don't drop it.
    // Against the file, not `latest` — an append seconds old may not be polled yet.
    const onFile = await readFile(FILE, 'utf8').then((t) => JSON.parse(t).elements ?? [], () => []);
    const has = new Set((doc.elements ?? []).map((e) => e.id));
    const unseen = onFile.filter((e) => !has.has(e.id));
    if (unseen.length) {
      doc.elements = [...(doc.elements ?? []), ...unseen];
      text = JSON.stringify(doc, null, 2);
    }
    await mkdir(dirname(FILE), { recursive: true });
    await writeFile(FILE, text);
    onDisk = text;                                   // our own write — the poll must ignore it
    latest = doc.elements ?? [];
    if (unseen.length) {
      const now = snap(latest);                      // unioned back = the agent's own, so
      for (const e of unseen) if (now.has(e.id)) base.set(e.id, now.get(e.id));   // never emit it
      broadcast(latest);                             // the poll won't: onDisk already matches
    }
    penMoved();
    process.stderr.write(`\rsaved ${FILE} ${new Date().toLocaleTimeString()}`);
    return res.end('ok');
  }
  if (url === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(': open\n\n');
    clients.add(res);
    return req.on('close', () => clients.delete(res));
  }
  if (url.startsWith('/vendor/')) {
    const file = resolve(VENDOR, '.' + url.slice('/vendor'.length));
    if (!file.startsWith(resolve(VENDOR))) { res.writeHead(403); return res.end(); }
    const body = await readFile(file).catch(() => null);
    if (!body) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    return res.end(body);
  }
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(page);
})
  .on('error', (e) => {
    if (e.code !== 'EADDRINUSE') throw e;
    console.error(`port ${PORT} is busy — another board is already served there.`);
    console.error(`kill it, or:  PORT=${PORT + 1} node scripts/board-serve.mjs ${FILE}`);
    process.exit(1);
  })
  .listen(PORT, () => console.log(`board → ${FILE}\nhttp://localhost:${PORT}`));
