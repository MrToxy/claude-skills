# vendor

What the board serves, checked in so it needs no install, no network, and
nothing in the repo being worked on.

| file | package | version | from |
|---|---|---|---|
| `excalidraw.js` | `@excalidraw/excalidraw` | 0.17.6 | `dist/excalidraw.production.min.js` |
| `excalidraw-assets/` | same | 0.17.6 | `dist/excalidraw-assets` — fonts, locales, lazy export chunk |
| `react.js` | `react` | 18.3.1 | `umd/react.production.min.js` |
| `react-dom.js` | `react-dom` | 18.3.1 | `umd/react-dom.production.min.js` |

All MIT — see `LICENSES/`. `excalidraw-assets/` is fetched by excalidraw itself,
relative to `EXCALIDRAW_ASSET_PATH`, so the directory name has to stay.

These are the last versions that publish a browser-ready UMD build, which is why
no bundler is involved. To replace one: download the tarball from
registry.npmjs.org, copy the files above, and check a plain `<script src>` still
boots it.
