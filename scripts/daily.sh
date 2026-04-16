#!/bin/bash
# Pulse daily refresh — runs news + stocks + podcasts, then pushes to Vercel
set -e
export PATH="$HOME/.local/bin:$HOME/Library/Python/3.9/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "$(date): Starting daily refresh..."

# 1. Refresh news, stocks, picks
bash scripts/refresh.sh

# 2. Refresh podcast summaries
bash scripts/podcasts.sh

# 3. Push to GitHub (triggers Vercel deploy)
if git remote -v 2>/dev/null | grep -q origin; then
  git add data/dashboard.json data/podcasts/
  git diff --cached --quiet || {
    git commit -m "Daily Pulse refresh $(date +%Y-%m-%d)"
    git push origin main 2>/dev/null || git push origin HEAD 2>/dev/null
  }
  echo "$(date): Pushed to GitHub"
else
  echo "$(date): No git remote, skipping push"
fi

echo "$(date): Daily refresh complete!"
