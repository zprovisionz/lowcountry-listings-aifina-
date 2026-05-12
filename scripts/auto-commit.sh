#!/usr/bin/env bash
# Auto-commit WIP for this repo. Intended for cron every 15 minutes (recommended rate).
# Respects .gitignore (e.g. .env.local is never committed).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Not a git repository: $REPO_ROOT" >&2
  exit 1
fi

# Avoid committing during merge/rebase
git_dir="$(git rev-parse --git-dir)"
if [[ -f "${git_dir}/MERGE_HEAD" ]] || [[ -d "${git_dir}/rebase-merge" ]] || [[ -d "${git_dir}/rebase-apply" ]]; then
  exit 0
fi

# No local changes at all
if git diff --quiet && git diff --cached --quiet; then
  if [[ -z "$(git ls-files --others --exclude-standard 2>/dev/null)" ]]; then
    exit 0
  fi
fi

git add -A

# Nothing staged (e.g. only ignored files changed)
if git diff --cached --quiet; then
  exit 0
fi

ts="$(date -u +%Y-%m-%dT%H:%MZ)"
git commit -m "chore: auto-save ${ts}" || exit 0
