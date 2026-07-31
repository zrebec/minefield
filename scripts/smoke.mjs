// Browser smoke test — boots the PRODUCTION build in headless Chromium and walks
// one true end-to-end path: title → start a random run → skip the story → move →
// place a flag → walk into night (flag stays visible) → manual save → reload →
// auto-resume with the flag intact. Pixel-level assertions on the real canvas.
//
// Run AFTER `npm run build`:   npm run smoke
// Not part of `npm test` (needs Playwright's chromium, like scripts/capture.mjs).
// Exit code 0 = all checks passed; 1 = a check failed (JSON report either way).

import { chromium } from 'playwright'
import { preview } from 'vite'

import * as probe from './lib/canvas-probe.mjs'

const B_CYAN = probe.B_CYAN       // FLAG sprite ink
const B_YELLOW = probe.B_YELLOW   // grass visited-trail ink — unique in the L1 playfield

const checks = {}
let page

// On L1 the terrain is always grass, whose walked trail is BRIGHT YELLOW — the
// gold gem and the HUD yellows are different hexes or outside the crop. The
// player does NOT blink and stands exactly on the only visited cell at spawn,
// covering it — so the trail in a column becomes detectable only for cells the
// player has LEFT. "In game at all" is detected separately: the bottom HUD
// strip shows the red LIVES hearts, and the story cards never paint bright red
// in that strip (their lower half is the white typewriter text).
//
// The probes themselves live in lib/canvas-probe.mjs — offline.mjs reads the
// same canvas the same way, and CLAUDE.md rule 1 says extend, don't copy.
const cellCount = (col, row, rgb) => probe.cellCount(page, col, row, rgb)
const findTrailRowInCol = (col) => probe.findTrailRowInCol(page, col)
const isIngame = () => probe.isIngame(page)

const walk = async (key) => { await page.keyboard.press(key); await page.waitForTimeout(380) }
const dirFlag = async (arrow) => {
  // Hold SHIFT across a few frames. The game decides flag-vs-move with a
  // frame-polled isHeld('Shift') guard (input.ts + main.ts): releasing Shift in
  // the same tick as the arrow makes the arrow read as MOVEMENT, not a flag — the
  // real cause of this test's historical flakiness (not the random field; the L1
  // flag cell is always clean ground). A human holds Shift far longer than one
  // frame, so mirror that: keep it down around the arrow tap.
  await page.keyboard.down('Shift')
  await page.waitForTimeout(80)
  await page.keyboard.press(arrow)
  await page.waitForTimeout(80)
  await page.keyboard.up('Shift')
  await page.waitForTimeout(300)
}

const server = await preview({ preview: { port: 4181 } })
const browser = await chromium.launch()
page = await browser.newPage()
await page.goto('http://localhost:4181/minefield/')
await page.waitForTimeout(800)

// 1. Shell: document title + the ARIA live regions (the a11y contract, live).
checks.title = (await page.title()).includes('THE STRIP')
checks.ariaRegions = await page.evaluate(() =>
  document.getElementById('sr-announcer') !== null && document.getElementById('sr-status') !== null)

// 2. Start a RANDOM run (never touches the daily leaderboard). The 5-card story
//    pre-roll may play first (2 presses per card) — keep skipping until the
//    spawn trail shows up, then PROVE interactivity with one real step.
await page.keyboard.press('r')
let ingame = false
for (let i = 0; i < 90 && !ingame; i++) {
  await page.keyboard.press('x')
  await page.waitForTimeout(250)
  ingame = await isIngame()
}
await page.waitForTimeout(500)
let p1 = null
if (ingame) {
  await walk('ArrowRight')                 // entry safe zone is mine-free
  // The step uncovers the spawn cell in column 0 — its yellow trail is the
  // proof the run is interactive AND tells us the spawn row.
  const spawnRow = await findTrailRowInCol(0)
  if (spawnRow !== null) p1 = { col: 1, row: spawnRow }
}
checks.runStarted = p1 !== null
if (!checks.runStarted) await finish()   // no interactive player -> bail with the report

// 3. Flag a neighbour with SHIFT+arrow — vertical direction chosen to stay
//    on-board (the cell is still inside the mine-free entry safe zone).
const goDown = p1.row < 16
const [flagArrow, backArrow] = goDown ? ['ArrowDown', 'ArrowUp'] : ['ArrowUp', 'ArrowDown']
const fc = { col: p1.col, row: p1.row + (goDown ? 1 : -1) }
await dirFlag(flagArrow)
checks.flagPlaced = (await cellCount(fc.col, fc.row, B_CYAN)) >= 100  // FLAG = 7 px × 16 = 112

// 4. The flag-overlay rule: walking ONTO the flag must not eat it.
await walk(flagArrow)   // step onto the flagged cell (player covers it)
await walk(backArrow)   // step back off along own (always safe) trail
checks.flagSurvivedWalk = (await cellCount(fc.col, fc.row, B_CYAN)) >= 100

// 5. Walk to night on own trail (3 steps so far + 12 = 15 = DAY_STEPS) — the
//    playfield darkens but the flag stays visible (drawFlags after the sweep).
for (let i = 0; i < 12; i++) await walk(i % 2 === 0 ? flagArrow : backArrow)
checks.nightFell = await page.evaluate((h0) => {
  const c = document.getElementById('game')
  const img = c.getContext('2d').getImageData(0, 0, c.width, h0).data
  let black = 0, total = 0
  for (let i = 0; i < img.length; i += 16) { total++; if (img[i] < 10 && img[i + 1] < 10 && img[i + 2] < 10) black++ }
  return black / total > 0.5
}, probe.PLAYFIELD_DEV_H)
checks.flagVisibleAtNight = (await cellCount(fc.col, fc.row, B_CYAN)) >= 100

// 6. Manual save, hard reload, auto-resume: trail and flag must be back.
await page.keyboard.down('Shift'); await page.keyboard.press('s'); await page.keyboard.up('Shift')
await page.waitForTimeout(400)
await page.reload()
await page.waitForTimeout(1200)
checks.resumedAfterReload = (await cellCount(0, p1.row, B_YELLOW)) >= 20  // the spawn trail is back (col 0 — the player resumes at col 1, covering its own cell)
checks.flagSurvivedReload = (await cellCount(fc.col, fc.row, B_CYAN)) >= 100

await finish()

// Prints the report, tears everything down and exits — never returns.
async function finish() {
  const ok = Object.values(checks).every(Boolean)
  console.log(JSON.stringify({ ok, checks }, null, 1))
  await browser.close()
  await server.close()
  process.exit(ok ? 0 : 1)
}
