// Offline proof — the one test the PWA wrap actually has to pass.
//
// Boots the PRODUCTION build in headless Chromium, lets the service worker
// install, then CUTS THE NETWORK and reloads. If the game still boots and is
// still playable after that, the offline wrap works; anything less (a registered
// worker, a populated cache, a green Lighthouse score) is circumstantial.
//
// Run AFTER `npm run build`:   npm run offline
// Not part of `npm test` (needs Playwright's chromium, like smoke.mjs/capture.mjs).
// Exit code 0 = all checks passed; 1 = a check failed (JSON report either way).

import { chromium } from 'playwright'
import { preview } from 'vite'
import { isIngame, canvasAlive } from './lib/canvas-probe.mjs'

const PORT = 4182     // not smoke.mjs's 4181, so the two can run back to back
const URL = `http://localhost:${PORT}/minefield/`

const checks = {}
const server = await preview({ preview: { port: PORT } })
const browser = await chromium.launch()
const context = await browser.newContext()   // fresh profile: no save, no cache
const page = await context.newPage()

// 1. Online once. This is the honest precondition of every PWA: a worker can
//    only cache what it was allowed to fetch at least one time.
await page.goto(URL)
await page.waitForTimeout(600)

checks.swRegistered = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return false
  const reg = await navigator.serviceWorker.ready
  return reg.active !== null
})

// The worker must be CONTROLLING this page, not merely installed — otherwise
// the reload below would be served by the browser's HTTP cache and we would be
// testing nothing. clients.claim() in the worker is what makes this true on the
// very first load.
checks.swControlling = await page.evaluate(() => navigator.serviceWorker.controller !== null)

checks.precacheFilled = await page.evaluate(async () => {
  const names = (await caches.keys()).filter((k) => k.startsWith('minefield-'))
  if (names.length !== 1) return false
  const keys = await (await caches.open(names[0])).keys()
  return keys.length >= 5 && keys.some((r) => r.url.endsWith('/index.html'))
})

// 2. Cut the network. Not a mock, not a stubbed fetch — Chromium is now offline
//    exactly as it would be on a train.
await context.setOffline(true)

// Count what the reload pulls, and where from. `fromServiceWorker()` is the
// browser's own answer to "did this come out of the cache we built?".
const served = []
page.on('response', (res) => served.push({ url: res.url(), sw: res.fromServiceWorker() }))

const reload = await page.reload({ waitUntil: 'load' }).catch((e) => ({ error: String(e) }))
checks.offlineReloadOk = !reload?.error
await page.waitForTimeout(900)

// 3. Did the game come back? A page that fails to load its module still has a
//    <canvas id="game"> in the DOM — at the browser's default 300×150, blank.
//    Size + colour count separate "served something" from "the game is running".
const alive = await canvasAlive(page)
checks.bundleRan = alive.sized
checks.canvasPainted = alive.colours >= 3
checks.title = (await page.title()).includes('MINEFIELD')
checks.ariaRegions = await page.evaluate(() =>
  document.getElementById('sr-announcer') !== null && document.getElementById('sr-status') !== null)

checks.allFromServiceWorker = served.length > 0 && served.every((r) => r.sw)

// 4. Playable, not just visible: start a random run with the network still cut
//    and walk until the HUD hearts prove a live game. Same skip loop as smoke.mjs
//    (the 5-card story pre-roll needs a couple of presses per card).
await page.keyboard.press('r')
let ingame = false
for (let i = 0; i < 90 && !ingame; i++) {
  await page.keyboard.press('x')
  await page.waitForTimeout(250)
  ingame = await isIngame(page)
}
checks.playableOffline = ingame

const ok = Object.values(checks).every(Boolean)
console.log(JSON.stringify({
  ok,
  checks,
  responses: { total: served.length, fromServiceWorker: served.filter((r) => r.sw).length },
}, null, 1))

await context.setOffline(false)
await browser.close()
await server.close()
process.exit(ok ? 0 : 1)
