// Does the game survive the launcher shutting itself down?
//
// scripts/offline.mjs proves a RELOAD works with the network cut. That is not
// the same question. The launcher now seeds the cache and exits, so the real
// question is whether a player who never installs the game — who just keeps the
// tab or a bookmark — is stranded the next time they open their browser.
//
// So this goes further than offline.mjs deliberately:
//   1. seed the cache from a live server, in a PERSISTENT browser profile
//   2. kill the server process outright
//   3. close the whole browser
//   4. reopen the same profile and navigate cold
//
// If step 4 plays, "seed and quit" traps nobody. If it does not, the launcher
// must keep running and the design is wrong.
//
// WHAT THIS DOES NOT COVER — learned the hard way. It reuses ONE persistent
// profile, so it says nothing about a FRESH storage partition. A Safari web app
// (File > Add to Dock) is exactly that: its own sandboxed container, inheriting
// no service worker and no cache from Safari. Added from the launcher's address
// it fails on first launch, and this script stays green throughout. That is why
// the local package's Dock icon is The Strip.app and not a Safari web app —
// docs/offline.md, Known limits.
//
// Run AFTER `npm run build`:   npm run persist

import { chromium } from 'playwright'
import { preview } from 'vite'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { canvasAlive, isIngame } from './lib/canvas-probe.mjs'

const PORT = 4185
const URL = `http://localhost:${PORT}/minefield/`

const checks = {}
const profile = await mkdtemp(join(tmpdir(), 'the-strip-profile-'))

// ── 1. Seed, with a profile that outlives the browser ────────────────────────
const server = await preview({ preview: { port: PORT } })
let ctx = await chromium.launchPersistentContext(profile, {})
let page = await ctx.newPage()
await page.goto(URL)
await page.waitForTimeout(1000)

checks.seeded = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready
  const names = (await caches.keys()).filter((k) => k.startsWith('the-strip-'))
  if (reg.active === null || names.length !== 1) return false
  return (await (await caches.open(names[0])).keys()).length >= 5
})

// ── 2 + 3. Kill the server, then the browser ─────────────────────────────────
await ctx.close()
await server.close()
await new Promise((r) => setTimeout(r, 500))
checks.serverDead = !(await fetch(URL).then(() => true).catch(() => false))

// ── 4. Cold start: same profile, no server anywhere ──────────────────────────
ctx = await chromium.launchPersistentContext(profile, {})
page = await ctx.newPage()
const fails = []
page.on('requestfailed', (r) => fails.push(r.url()))
const nav = await page.goto(URL, { waitUntil: 'load' }).catch((e) => ({ error: String(e) }))
checks.coldNavigationOk = !nav?.error
await page.waitForTimeout(1200)

const alive = await canvasAlive(page)
checks.bundleRan = alive.sized
checks.canvasPainted = alive.colours >= 3
checks.noFailedRequests = fails.length === 0

// Playable, from a cold browser, with nothing serving anything.
await page.keyboard.press('r')
let ingame = false
for (let i = 0; i < 90 && !ingame; i++) {
  await page.keyboard.press('x')
  await page.waitForTimeout(250)
  ingame = await isIngame(page)
}
checks.playableFromColdStart = ingame

const ok = Object.values(checks).every(Boolean)
console.log(JSON.stringify({ ok, checks, failedRequests: fails }, null, 1))

await ctx.close()
await rm(profile, { recursive: true, force: true })
process.exit(ok ? 0 : 1)
