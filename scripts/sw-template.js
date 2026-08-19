// Service worker TEMPLATE. The build fills the three constants below from the
// files Vite actually wrote (see the `offline-wrap` plugin in vite.config.ts)
// and emits the result as `sw.js` next to index.html. The plugin matches whole
// assignment lines and fails the build if one is left unfilled, so keep those
// three lines literal — and do not write their placeholder names anywhere else
// in this file.
//
// It is a template and not a finished file for one reason: Vite hashes asset
// filenames (`assets/index-pro3BI4c.js`), so a hand-written precache list —
// like the one this was adapted from in ../../../timeholder/sw.js — would go
// stale on the very next build and cache a bundle that no longer exists.
//
// EDIT THIS FILE, never dist/sw.js.

const CACHE = '__CACHE__'
const INDEX = '__INDEX__'
const PRECACHE = __PRECACHE__

// Every cache read passes this, and it is not optional. `cache.addAll` fetches
// with mode `no-cors`, so the stored entries carry no `Origin` header — but the
// page asks for its module with `crossorigin` (Vite emits that attribute), which
// does send one. Servers that answer `Vary: Origin` — vite preview does, and CDNs
// commonly do — then treat those as different requests, every lookup misses, and
// the game dies offline with ERR_FAILED on its only script while the cache sits
// there full. Ignoring Vary is safe because every URL in here is a static
// same-origin file whose bytes do not depend on any request header.
const MATCH = { ignoreVary: true }

// INSTALL — pull the whole build into a cache named after its content hash, then
// take over at once. skipWaiting is safe here because the game is a single
// bundle with no dynamic imports: there is no chunk a running page could ask for
// and miss. Without it a new build would sit idle until every tab was closed.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

// ACTIVATE — drop every older build of THIS game and claim open pages. The
// prefix filter matters: on github.io the origin is shared with the other games
// in this portfolio, and deleting caches by "not mine" would wipe theirs.
//
// `the-strip-` is here for the builds shipped while the game was briefly going
// to be renamed (cancelled 2026-08-16). Nothing writes that prefix any more, so
// anyone carrying one has a cache no later release would ever collect — this is
// the one activate that can still reach it. Safe to delete this line once no
// device can plausibly be that far behind.
const OWNED_PREFIXES = ['minefield-', 'the-strip-']

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k !== CACHE && OWNED_PREFIXES.some((p) => k.startsWith(p)))
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  )
})

// FETCH — two strategies, because the build has two kinds of file.
//
// Hashed assets are immutable by construction: a changed byte means a changed
// filename. Cache-first is not just an optimisation there, it is correct.
//
// index.html is the one mutable name in the build, so it gets network-first: an
// online player always lands on the current build, and an offline one falls back
// to the last index that was cached. Cache-first here (which is what Timeholder
// does, and it is fine for an app whose filenames never change) would strand a
// player on an old build until the cache rolled over.
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(INDEX, copy))
          return res
        })
        .catch(() => caches.open(CACHE).then((cache) => cache.match(INDEX, MATCH))),
    )
    return
  }

  event.respondWith(caches.match(req, MATCH).then((hit) => hit || fetch(req)))
})
