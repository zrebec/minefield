#!/bin/sh
# MINEFIELD — offline launcher (macOS). Double-click me.
#
# This is an INSTALLER, not the game.
#
# The game is an ES module and browsers refuse modules over file://, so it needs
# an HTTP server for exactly as long as it takes your browser to read the files
# once. After that a service worker keeps its own copy and the game runs with no
# server, no network, and this window closed — so the script hands the page over
# and then shuts itself down. That is why it exits on its own.
#
# The server is whatever this Mac already has — see serve.sh. We do not ship a
# binary. Nothing is uploaded; the game has no network code at all.

set -eu
cd "$(dirname "$0")"

PORT=8137
URL="http://127.0.0.1:$PORT/"

. ./serve.sh

echo "MINEFIELD — offline"
echo

start_server || {
  echo "No usable runtime found on this Mac (looked for python3, php, node, ruby)."
  echo
  echo "Play in the browser instead:  https://zrebec.github.io/minefield/"
  echo "Once it has loaded there, your browser can install it — then it works"
  echo "offline from the Dock with no server at all."
  echo
  echo "Press Return to close."
  read -r _
  exit 1
}

cleanup() { kill "$SERVER_PID" 2>/dev/null || true; rm -f "$SERVE_LOG"; }
trap cleanup EXIT INT TERM

wait_for_server || {
  echo "The local server did not come up on port $PORT."
  echo "Something else may already be using it. Press Return to close."
  read -r _
  exit 1
}

open "$URL"
echo "Opened $URL"
echo "Waiting for your browser to take its copy…"
echo

if wait_until_served; then
  echo "Done — your browser has the game."
else
  echo "Your browser never connected, so nothing was copied."
  echo "Open $URL yourself, or just run this again."
fi

echo
echo "The local server is shutting down now. The tab you just opened keeps"
echo "working with it gone — it has its own copy."
echo
echo "Want it in the Dock? Use the .app from the disk image, not your browser."
echo "Adding THIS address to the Dock from Safari does not work: a Safari web"
echo "app starts in its own empty profile and would look for a server that is"
echo "no longer running."
echo
echo "You can close this window."
