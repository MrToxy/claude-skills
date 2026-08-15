#!/usr/bin/env node
// sightline board — local Excalidraw bound to one file.
//   node scripts/board-serve.mjs .sight/<effort>/board.excalidraw
// Opens http://localhost:3777, autosaves to that path on every change.
// The file is the source of truth; the agent reads and appends to the same path.
//
// First run bundles @excalidraw/excalidraw with esbuild into .sight/vendor/ —
// the published ESM has bare imports and split chunks a browser can't resolve.
// Cached after that, so every later run is offline and instant.
//   npm i -D @excalidraw/excalidraw react react-dom esbuild
// Without those installed it falls back to the unpkg CDN (needs network).

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat, cp } from 'node:fs/promises';
import { dirname, join, resolve, extname } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const FILE = process.argv[2] ?? '.sight/board.excalidraw';
const PORT = Number(process.env.PORT ?? 3777);
const EMPTY = { type: 'excalidraw', version: 2, source: 'sightline', elements: [], appState: {} };

// .sight/vendor/ sits beside the effort dirs, so one bundle serves every board.
const VENDOR = FILE.includes('.sight')
  ? join(FILE.slice(0, FILE.indexOf('.sight') + 6), 'vendor')
  : join(dirname(FILE), 'vendor');

const exists = (p) => stat(p).then(() => true, () => false);

async function ensureBundle() {
  if (await exists(join(VENDOR, 'excalidraw.js'))) return true;
  let esbuild, pkgDir;
  try {
    // the skill folder has no node_modules — resolve from the repo being worked on
    const req = createRequire(join(process.cwd(), 'noop.js'));
    esbuild = await import(pathToFileURL(req.resolve('esbuild')).href);
    pkgDir = dirname(req.resolve('@excalidraw/excalidraw'));
  } catch {
    console.log('! @excalidraw/excalidraw + esbuild not installed — falling back to unpkg (needs network).');
    console.log('  npm i -D @excalidraw/excalidraw react react-dom esbuild   → offline after first run');
    return false;
  }
  console.log(`bundling excalidraw → ${VENDOR}/ (first run only)`);
  await mkdir(VENDOR, { recursive: true });
  await esbuild.build({
    stdin: {
      contents: `
        import * as React from "react";
        import { createRoot } from "react-dom/client";
        import { Excalidraw } from "@excalidraw/excalidraw";
        window.React = React; window.createRoot = createRoot; window.Excalidraw = Excalidraw;`,
      resolveDir: process.cwd(), loader: 'js',
    },
    bundle: true, format: 'iife', minify: true, conditions: ['production'],
    define: { 'process.env.NODE_ENV': '"production"', 'process.env.IS_PREACT': '"false"' },
    outfile: join(VENDOR, 'excalidraw.js'),
    logLevel: 'error',
  });
  await cp(join(pkgDir, 'index.css'), join(VENDOR, 'index.css'));
  if (await exists(join(pkgDir, 'fonts'))) await cp(join(pkgDir, 'fonts'), join(VENDOR, 'fonts'), { recursive: true });
  return true;
}

const local = await ensureBundle();

const CDN = 'https://unpkg.com/@excalidraw/excalidraw@0.17.6/dist';
const head = local
  ? `<link rel="stylesheet" href="/vendor/index.css">
     <script>window.EXCALIDRAW_ASSET_PATH="/vendor/";</script>
     <script src="/vendor/excalidraw.js"></script>`
  : `<link rel="stylesheet" href="${CDN}/excalidraw.production.min.css">
     <script>window.EXCALIDRAW_ASSET_PATH="${CDN}/";</script>
     <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
     <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
     <script src="${CDN}/excalidraw.production.min.js"></script>
     <script>window.Excalidraw=ExcalidrawLib.Excalidraw;window.createRoot=ReactDOM.createRoot;</script>`;

const page = `<!doctype html><html><head><meta charset="utf-8">
<title>sightline — ${FILE}</title>
${head}
<style>html,body,#app{margin:0;height:100%}</style>
</head><body><div id="app"></div><script>
const { useState, useEffect, createElement: h } = React;
let timer, lastSent = '';

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
  if (!initial) return h('div', null, 'loading…');
  return h(Excalidraw, {
    initialData: { elements: initial.elements ?? [], appState: initial.appState ?? {}, scrollToContent: true },
    onChange: save,
  });
}
createRoot(document.getElementById('app')).render(h(App));
</script></body></html>`;

const read = async () => {
  try { return JSON.parse(await readFile(FILE, 'utf8')); }
  catch { return EMPTY; }
};

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
    await mkdir(dirname(FILE), { recursive: true });
    await writeFile(FILE, Buffer.concat(chunks));
    process.stdout.write(`\rsaved ${FILE} ${new Date().toLocaleTimeString()}`);
    return res.end('ok');
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
}).listen(PORT, () => console.log(`board → ${FILE}\nhttp://localhost:${PORT}`));
