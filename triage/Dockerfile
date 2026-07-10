# Auto-triage runner — Linux container. The CONTAINER is the isolation boundary.
# Nothing org-specific or secret is baked in: skills + routing config arrive as read-only
# bind mounts, the repos are cloned fresh at runtime, and every credential is injected via env.
# Build context = this dir (claude-skills/triage/). Only entrypoint.sh is COPYed in.
# node:22 (LTS ≥ 22.13) ships the `node:sqlite` builtin that pnpm@11 requires — Node 20 lacks it, so
# the repo-pinned pnpm won't launch there and no repo can install/build/test. Do NOT drop below 22.
FROM node:22-slim

# System deps: build-essential/python3/pkg-config/libvips-dev = native builds (bcrypt, sharp);
# git/curl/jq/ca-certificates = the daemon + clones; tini = clean PID 1 / signal handling.
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential python3 pkg-config libvips-dev \
      git curl ca-certificates jq bash tini unzip \
    && rm -rf /var/lib/apt/lists/*

# GitHub CLI via the official apt repo (always a valid version for this arch)
RUN set -eux; \
    mkdir -p -m 755 /etc/apt/keyrings; \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli-archive-keyring.gpg; \
    chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg; \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list; \
    apt-get update && apt-get install -y --no-install-recommends gh; \
    rm -rf /var/lib/apt/lists/*

# Enable Corepack so each repo's pinned package manager (packageManager field, e.g. pnpm@11.1.0) is on
# PATH deterministically and at the exact pinned version, instead of being bootstrapped ad-hoc per tick.
# Must run as root (writes shims into the global bin dir) — i.e. before `USER node` below.
RUN corepack enable

# The node image already ships a non-root `node` user (uid 1000) — reuse it (bypassPermissions
# refuses to run as root). Create the workspace + mount points owned by node.
# Pre-create the state dir node-owned so the named volume initializes with node ownership
# (a fresh volume otherwise mounts root-owned and the non-root user can't write to it).
RUN mkdir -p /workspace /opt/claude-skills /opt/agents-skills /home/node/.claude-triage \
    && chown -R node:node /workspace /home/node/.claude-triage
USER node
WORKDIR /home/node

# Claude Code CLI (native installer → ~/.local/bin). Subscription auth via CLAUDE_CODE_OAUTH_TOKEN at runtime.
RUN curl -fsSL https://claude.ai/install.sh | bash
ENV PATH="/home/node/.local/bin:${PATH}"

COPY --chown=node:node entrypoint.sh /usr/local/bin/entrypoint.sh

ENV CLAUDE_TRIAGE_DIR=/home/node/.claude-triage \
    CLAUDE_CONFIG_DIR=/home/node/.claude-triage \
    WORKSPACE=/workspace \
    SKILLS_SRC=/opt/claude-skills \
    AGENTS_SKILLS_SRC=/opt/agents-skills \
    TRIAGE_PERMISSION_MODE=bypassPermissions

ENTRYPOINT ["tini", "--", "bash", "/usr/local/bin/entrypoint.sh"]
CMD ["loop"]
