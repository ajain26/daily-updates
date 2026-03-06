#!/bin/bash
# ============================================
# watch-folder.sh
# Watches the Daily Updates folder for new JSON
# files and auto-updates the manifest + serves
# the app via a local HTTP server.
#
# Usage:  ./watch-folder.sh
# Stop:   Ctrl+C
# ============================================

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8080

echo "⚡ Daily Updates — Starting..."
echo "📂 Watching: $DIR"
echo ""

# Step 1: Update manifest on start
bash "$DIR/update-manifest.sh"

# Step 2: Start HTTP server in background
echo ""
echo "🌐 Starting server at http://localhost:$PORT"
echo "   Open this URL in your browser!"
echo "   (or use your local IP for phone access)"
echo ""

# Get local IP for phone access
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")
echo "📱 Phone access: http://$LOCAL_IP:$PORT"
echo ""
echo "👀 Watching for new JSON files..."
echo "   Press Ctrl+C to stop."
echo ""

# Start server
cd "$DIR"
python3 -m http.server "$PORT" &
SERVER_PID=$!

# Cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Stopping server..."
  kill $SERVER_PID 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# Step 3: Watch for file changes using fswatch (macOS)
# If fswatch isn't installed, fall back to polling
if command -v fswatch &>/dev/null; then
  fswatch -0 --include='\.json$' --exclude='manifest\.json' "$DIR" | while read -d '' file; do
    basename=$(basename "$file")
    # Only react to date-named JSON files
    if [[ "$basename" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\.json$ ]]; then
      echo "📥 New file detected: $basename"
      bash "$DIR/update-manifest.sh"
      echo "🔄 App will auto-refresh in a few seconds..."
      echo ""
    fi
  done
else
  echo "ℹ️  fswatch not found — using polling mode (checks every 30s)"
  echo "   Install fswatch for instant detection: brew install fswatch"
  echo ""
  LAST_COUNT=$(ls "$DIR"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json 2>/dev/null | wc -l)
  while true; do
    sleep 30
    NEW_COUNT=$(ls "$DIR"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json 2>/dev/null | wc -l)
    if [ "$NEW_COUNT" -ne "$LAST_COUNT" ]; then
      echo "📥 New file(s) detected!"
      bash "$DIR/update-manifest.sh"
      LAST_COUNT=$NEW_COUNT
      echo "🔄 App will auto-refresh in a few seconds..."
      echo ""
    fi
  done
fi
