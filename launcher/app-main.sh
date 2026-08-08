#!/bin/sh
# THE STRIP — the executable inside The Strip.app.
#
# Same job as ../The Strip.command: hand the game to the browser once, then get
# out of the way. Three differences that come from being an app bundle:
#
#   1. No Terminal window. A bundle's executable runs headless, so every echo
#      below goes nowhere a player can see — hence the notification.
#   2. The game lives in Contents/Resources/game, not next to this file.
#   3. Nothing here answers Cmd+Q (a shell script has no NSApplication). The
#      first version solved that with a blocking dialog whose only button was
#      Quit — which meant the player saw a modal EVERY launch and the server
#      lived until they clicked it. Exiting on its own is the better answer to
#      both: no modal, and nothing left listening on 8137.
#
# The install hint is a notification, not a dialog, and it fires only on the
# first run. After the game is installed this app has no job left.

set -eu

HERE="$(cd "$(dirname "$0")" && pwd)"
RES="$HERE/../Resources"

PORT=8137
URL="http://127.0.0.1:$PORT/"
STATE="$HOME/Library/Application Support/The Strip"
HINT_SHOWN="$STATE/install-hint-shown"

notify() {
  osascript -e "display notification \"$1\" with title \"The Strip\"" >/dev/null 2>&1 || true
}

. "$RES/serve.sh"
cd "$RES/game"

if ! start_server; then
  osascript -e 'display dialog "The Strip could not start a local server.\n\nIt needs one of python3, php, node or ruby, and this Mac has none of them.\n\nPlay in a browser instead:\nhttps://zrebec.github.io/minefield/" buttons {"OK"} default button 1 with title "The Strip" with icon stop' >/dev/null 2>&1
  exit 1
fi

cleanup() { kill "$SERVER_PID" 2>/dev/null || true; rm -f "$SERVE_LOG"; }
trap cleanup EXIT INT TERM

if ! wait_for_server; then
  osascript -e "display dialog \"The Strip could not open port $PORT.\n\nSomething else on this Mac is probably using it.\" buttons {\"OK\"} default button 1 with title \"The Strip\" with icon stop" >/dev/null 2>&1
  exit 1
fi

open "$URL"

if wait_until_served; then
  if [ ! -f "$HINT_SHOWN" ]; then
    mkdir -p "$STATE"
    : > "$HINT_SHOWN"
    # Deliberately does NOT say "add it to the Dock from Safari". That advice is
    # right for the hosted build and wrong here, and it took a real failure to
    # see the difference: a Safari web app gets its own sandboxed container
    # (~/Library/Containers/com.apple.Safari.WebApp) and inherits nothing from
    # Safari — no service worker, no cache. Added from this address it launches
    # into an empty profile, goes to the network, finds a server that shut down
    # minutes ago, and shows "cannot connect". THIS app is the Dock icon.
    notify "Ready. Keep this app — drag it from Applications to the Dock and it will open the game any time, online or not."
  fi
else
  notify "Your browser never opened the game. Try again, or open $URL yourself."
fi
