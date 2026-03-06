#!/bin/bash
# ============================================
# auto-push.sh
# Run this after your co-work scheduler
# generates a new daily JSON file.
#
# It commits the new file and pushes to GitHub,
# which auto-updates your GitHub Pages site.
#
# Usage:  ./auto-push.sh
#
# You can also add this to your scheduler as
# a post-step so it runs automatically.
# ============================================

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Get today's date
TODAY=$(date +%Y-%m-%d)

echo "⚡ Daily Updates — Auto Push"
echo ""

# Check if there are any changes to commit
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "ℹ️  No new changes to push."
  exit 0
fi

# Stage all JSON files and any app changes
git add *.json index.html style.css app.js .gitignore 2>/dev/null
git add auto-push.sh update-manifest.sh watch-folder.sh 2>/dev/null

# Commit
git commit -m "📱 Updates for $TODAY"

# Push
git push origin main

echo ""
echo "✅ Pushed to GitHub! Site will update in ~1 minute."
echo "🌐 Check your GitHub Pages URL to see the changes."
