#!/bin/sh
# Serves AlgoQuest at http://localhost:8000
cd "$(dirname "$0")"
PORT=${PORT:-8000}
echo "Open http://localhost:$PORT"
if command -v python3 >/dev/null; then exec python3 -m http.server "$PORT"; fi
exec npx --yes http-server -p "$PORT" -c-1
