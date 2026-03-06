#!/bin/bash
# ============================================
# update-manifest.sh
# Scans the Daily Updates folder for date JSON
# files and rebuilds manifest.json
#
# Usage: Run this script after a new daily JSON
# file is added. You can also set it up to run
# automatically via launchd or as a post-step
# in your co-work scheduler.
# ============================================

DIR="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$DIR/manifest.json"

# Find all YYYY-MM-DD.json files, extract dates, sort
dates=()
for f in "$DIR"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json; do
  [ -f "$f" ] || continue
  basename=$(basename "$f" .json)
  dates+=("\"$basename\"")
done

# Build JSON
joined=$(IFS=,; echo "${dates[*]}")
echo "{
  \"dates\": [$joined]
}" > "$MANIFEST"

echo "✅ manifest.json updated with ${#dates[@]} date(s)"
