#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="${1:-chai-aur-sutta}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install with: brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Not logged in to GitHub. Run: gh auth login"
  exit 1
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote 'origin' already exists:"
  git remote get-url origin
  exit 1
fi

gh repo create "$REPO_NAME" \
  --public \
  --source=. \
  --remote=origin \
  --description "Chai aur Sutta — Pan Wala-style 90s & 2000s Bollywood radio page powered by Spotify" \
  --push

echo ""
echo "Done! Repository: $(gh repo view --json url -q .url)"
