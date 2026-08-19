# Shared by BOTH launchers — the .command in the offline zip and the .app
# bundle. Sourced, never run on its own.
#
# Expects: $PORT set, and the current directory already being the folder to
# serve. Sets $SERVER_PID and $SERVE_LOG on success; returns 1 if the Mac has no
# usable runtime.
#
# One copy on purpose (CLAUDE.md rule 1): the runtime-detection ladder is the
# only fiddly part of either launcher, and two copies of it would drift the
# first time one of them is fixed.

SERVE_LOG="${TMPDIR:-/tmp}/minefield-serve.$$.log"

# 127.0.0.1, never 0.0.0.0: this is your machine's game, not the coffee shop's.
start_server() {
  : > "$SERVE_LOG"
  if command -v python3 >/dev/null 2>&1 && python3 -c '' >/dev/null 2>&1; then
    echo "server: python3"
    python3 -m http.server "$PORT" --bind 127.0.0.1 >>"$SERVE_LOG" 2>&1 &
  elif command -v php >/dev/null 2>&1; then
    echo "server: php"
    php -S "127.0.0.1:$PORT" -t . >>"$SERVE_LOG" 2>&1 &
  elif command -v node >/dev/null 2>&1; then
    echo "server: node"
    # Explicit MIME types: a .js served as anything but text/javascript makes
    # the browser reject the module and the screen stays black. The request line
    # is written in python3's format on purpose, so wait_until_served can parse
    # one shape instead of four.
    PORT="$PORT" node -e '
      const http = require("http"), fs = require("fs"), path = require("path")
      const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
                      ".svg": "image/svg+xml", ".png": "image/png",
                      ".webmanifest": "application/manifest+json", ".json": "application/json" }
      http.createServer((req, res) => {
        const rel = decodeURIComponent(req.url.split("?")[0])
        const file = path.join(process.cwd(), rel === "/" ? "/index.html" : rel)
        const log = (code) => process.stderr.write(`- - - "GET ${rel} HTTP/1.1" ${code} -\n`)
        if (!file.startsWith(process.cwd())) { log(403); res.writeHead(403).end(); return }
        fs.readFile(file, (err, buf) => {
          if (err) { log(404); res.writeHead(404).end("not found"); return }
          log(200)
          res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" })
          res.end(buf)
        })
      }).listen(process.env.PORT, "127.0.0.1")
    ' >>"$SERVE_LOG" 2>&1 &
  elif command -v ruby >/dev/null 2>&1; then
    echo "server: ruby"
    ruby -run -e httpd . -p "$PORT" -b 127.0.0.1 >>"$SERVE_LOG" 2>&1 &
  else
    return 1
  fi
  SERVER_PID=$!
  return 0
}

# Opening the browser before the port answers shows a connection error the
# player then has to reload past.
wait_for_server() {
  i=0
  while [ "$i" -lt 25 ]; do
    if curl -fs -o /dev/null "http://127.0.0.1:$PORT/"; then return 0; fi
    sleep 0.2
    i=$((i + 1))
  done
  return 1
}

# How many distinct paths the log has answered. python3's http.server and the
# node fallback both write `"GET /path HTTP/1.1"`; php and ruby do not, and that
# is fine — see wait_until_served, where this is an accelerator and never the
# guarantee.
served_count() {
  grep -o '"GET [^ ]*' "$SERVE_LOG" 2>/dev/null | sort -u | wc -l | tr -d ' '
}

# Wait until the browser has pulled the whole build, so the service worker's
# cache is seeded and the server becomes disposable. Call AFTER wait_for_server.
#
# It waits for the request stream to go QUIET rather than counting files. The
# first version compared against `find . -type f`, which can never be reached:
# the folder also holds this script, the launcher and the READ ME, and a browser
# never asks for those. Quiescence needs no arithmetic and works whatever the
# build happens to contain.
#
# Phase 1 is the important one. We do not start counting down until the browser
# has actually connected — a Mac that takes 40 s to launch a cold browser would
# otherwise have its server killed before a single byte moved, and the player
# would get a blank page with no idea why. `wait_for_server`'s own curl probe is
# already in the log, so the bar is "something BEYOND the probe".
wait_until_served() {
  baseline=$(served_count)

  # php and ruby do not log in a shape we can read. Rather than pretend, fall
  # back to a flat wait: the probe proved the port answers, and 140 kB over
  # loopback is not what takes the time — starting the browser is.
  if [ "$baseline" -eq 0 ]; then
    sleep "${SEED_BLIND_WAIT:-30}"
    return 0
  fi

  waited=0
  while [ "$(served_count)" -le "$baseline" ] && [ "$waited" -lt "${SEED_CONNECT_TIMEOUT:-300}" ]; do
    sleep 1
    waited=$((waited + 1))
  done
  [ "$(served_count)" -le "$baseline" ] && return 1

  last=-1
  still=0
  waited=0
  while [ "$waited" -lt "${SEED_GRACE:-25}" ]; do
    now=$(served_count)
    if [ "$now" -eq "$last" ]; then
      still=$((still + 1))
      [ "$still" -ge 3 ] && break     # three quiet seconds = it has what it needs
    else
      still=0
      last="$now"
    fi
    sleep 1
    waited=$((waited + 1))
  done

  sleep 2   # let the worker finish writing what it just fetched
  return 0
}
