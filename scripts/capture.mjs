// Deterministic screenshot capture for the docs.
//
// Spins up the Vite dev server in-process (needed so the dev-only window.__mf
// capture hook exists) and drives the game in a headless Chromium. The hook can
// ONLY play for real — start a fixed-seed game (newGame) and take genuine moves
// (steps → the actual movePlayer + walk). So every PNG is a state the game can
// truly reach: score, backpack and trail are all consistent. We use a read-only
// field snapshot to route the player (BFS around mines/buildings); the moves
// themselves are real. Output: pixel-exact PNGs (canvas.toDataURL) in docs/img/.
//
//   node scripts/capture.mjs            # all shots
//   node scripts/capture.mjs intro play # only the named shots
//
// Needs the dev-only devDependency `playwright` (browser: `npx playwright install chromium`).

import { createServer } from 'vite'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'docs/img')
const SEED = 'rules-demo' // fixed seed → reproducible field across runs/dates

// ── In-page driver calls ──────────────────────────────────────────────────────
const call = (page, method, ...args) =>
  page.evaluate(({ m, a }) => window.__mf[m](...a), { m: method, a: args })
const canvasPng = (page) =>
  page.evaluate(() => document.getElementById('game').toDataURL('image/png'))

// ── BFS router (runs in Node off a read-only snapshot; only ROUTES, never fakes) ─
const DIRS = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]]

function bfsNearest(start, goals, passable) {
  const seen = new Set([`${start.col},${start.row}`])
  let frontier = [{ col: start.col, row: start.row, dirs: [] }]
  while (frontier.length) {
    const next = []
    for (const node of frontier) {
      for (const [name, dc, dr] of DIRS) {
        const c = node.col + dc, r = node.row + dr
        const key = `${c},${r}`
        if (seen.has(key) || !passable(c, r)) continue
        seen.add(key)
        const dirs = [...node.dirs, name]
        if (goals.has(key)) return { dirs, end: { col: c, row: r } }
        next.push({ col: c, row: r, dirs })
      }
    }
    frontier = next
  }
  return null
}

// Plan a real walk that collects up to `maxGems` gems, avoiding mines/buildings.
// (En-route gems get collected too — that's genuine, so the backpack may hold more.)
function planCollect(field, maxGems) {
  const blocked = new Set([...field.mines, ...field.buildings].map((c) => `${c.col},${c.row}`))
  const passable = (c, r) =>
    c >= 0 && c < field.cols && r >= 0 && r < field.rows && !blocked.has(`${c},${r}`)

  let pos = { ...field.player }
  const remaining = new Map(field.gems.map((g) => [`${g.col},${g.row}`, g]))
  const dirs = []
  for (let n = 0; n < maxGems && remaining.size; n++) {
    const leg = bfsNearest(pos, remaining, passable)
    if (!leg) break
    dirs.push(...leg.dirs)
    pos = leg.end
    remaining.delete(`${pos.col},${pos.row}`)
  }
  return dirs
}

// ── Shots (each returns a PNG data URL) ───────────────────────────────────────
const SHOTS = {
  intro: async (page) => {
    await call(page, 'showIntro', 0)
    return canvasPng(page)
  },

  // Authentic mid-game: start the fixed-seed field, then really walk it to pick
  // up a handful of gems. Score, trail and backpack reflect those exact moves.
  play: async (page) => {
    const field = await call(page, 'newGame', SEED)
    const dirs = planCollect(field, 4)
    const after = await call(page, 'steps', dirs)
    console.log(`  play: ${dirs.length} steps, score ${after.score}, backpack ${JSON.stringify(after.inventory)}`)
    return canvasPng(page)
  },
}

async function run() {
  const wanted = process.argv.slice(2)
  const names = wanted.length ? wanted : Object.keys(SHOTS)
  await mkdir(outDir, { recursive: true })

  const server = await createServer({ root, server: { host: '127.0.0.1' }, logLevel: 'warn' })
  await server.listen()
  const url = server.resolvedUrls.local[0]
  console.log(`dev server: ${url}`)

  const browser = await chromium.launch()
  const page = await browser.newPage()
  // First load triggers Vite's on-demand dep pre-bundling, which fires an
  // auto-reload that can wipe the canvas mid-capture. Reload once more (deps now
  // cached) for a stable page before driving the hook.
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForFunction(() => !!window.__mf, null, { timeout: 15000 })

  for (const name of names) {
    const shot = SHOTS[name]
    if (!shot) { console.warn(`! unknown shot: ${name}`); continue }
    const dataUrl = await shot(page)
    const png = Buffer.from(dataUrl.split(',')[1], 'base64')
    const file = resolve(outDir, `${name}.png`)
    await writeFile(file, png)
    console.log(`✓ ${name} → docs/img/${name}.png (${png.length} B)`)
  }

  await browser.close()
  await server.close()
}

run().catch((err) => { console.error(err); process.exit(1) })
