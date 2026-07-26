# Phase Command Matrix

Commands per stack per phase. Resolve the package manager from the lockfile, then map the phase name to the concrete command.

## Package manager resolution

| Lockfile | Manager | Run prefix |
|----------|---------|------------|
| `bun.lockb` | bun | `bun run` |
| `pnpm-lock.yaml` | pnpm | `pnpm` |
| `yarn.lock` | yarn | `yarn` |
| `package-lock.json` | npm | `npm run` |

If multiple lockfiles exist, prefer the newest by mtime.

## JavaScript / TypeScript

| Phase | Command (adjust prefix per manager) |
|-------|-------------------------------------|
| Build | `<prefix> build` — skip with WARN if script missing |
| Type check | `npx tsc --noEmit` — or `<prefix> typecheck` if defined |
| Lint | `<prefix> lint -- --fix` where safe, else `<prefix> lint` |
| Tests | `<prefix> test -- --coverage` when coverage is supported |

Pipe long output: build/typecheck → `| tail -30`, tests → `| tail -50`.

## Python

| Phase | Command |
|-------|---------|
| Build | `uv build` / `python -m build` — skip if neither is configured |
| Type check | `pyright .` |
| Lint | `ruff check --fix .` |
| Tests | `pytest --cov` (requires `pytest-cov`) |

Detect Python manager: `uv.lock` → uv, `poetry.lock` → poetry, else plain `pip` / `python -m`.

## Monorepos

- Turbo: `turbo run build lint test --filter='[HEAD^]'`
- Nx: `nx affected -t build,lint,test`
- pnpm workspaces without turbo/nx: run `pnpm -r <script>` but scope to changed packages via `pnpm --filter ...[origin/main]`

## Git diff reference points

- Preferred: `git merge-base HEAD origin/main`
- Fallback chain: `origin/main` → `origin/master` → `HEAD~1`

## Skipping gracefully

For every phase, before running:
1. Check the command exists (binary on PATH, script in `package.json`)
2. If missing: emit `SKIPPED (reason)` line, do not FAIL
