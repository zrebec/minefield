// Shared canvas probes for the Playwright-driven scripts (smoke.mjs,
// offline.mjs). These read the REAL rendered canvas — the only evidence that
// actually proves the game ran, as opposed to "the page returned 200".
//
// They live here rather than in one script because two scripts need them and
// CLAUDE.md coding rule 1 is DRY: extend, don't copy. Each takes `page` first
// so nothing depends on a module-level global.

export const CELL_DEV = 32                  // 8 game px × SCALE 4 = one cell in device px
export const PLAYFIELD_DEV_H = 18 * CELL_DEV
export const CANVAS_DEV_W = 256 * 4         // CANVAS_W × SCALE — what setupCanvas sets

export const B_CYAN = [0, 255, 255]         // FLAG sprite ink
export const B_YELLOW = [255, 255, 0]       // grass visited-trail ink

/** How many pixels of exactly `rgb` sit in one 32×32 device cell. */
export const cellCount = (page, col, row, rgb) => page.evaluate(([c0, r0, want]) => {
  const c = document.getElementById('game')
  const img = c.getContext('2d').getImageData(c0 * 32, r0 * 32, 32, 32).data
  let n = 0
  for (let i = 0; i < img.length; i += 4) {
    if (img[i] === want[0] && img[i + 1] === want[1] && img[i + 2] === want[2]) n++
  }
  return n
}, [col, row, rgb])

/** First cell row in `col` painted with `rgb`, or null. */
export const findTrailRowInCol = (page, col, rgb = B_YELLOW) => page.evaluate(([c0, h0, want]) => {
  const c = document.getElementById('game')
  const img = c.getContext('2d').getImageData(c0 * 32, 0, 32, h0).data
  for (let i = 0; i < img.length; i += 4) {
    if (img[i] === want[0] && img[i + 1] === want[1] && img[i + 2] === want[2]) {
      return Math.floor((i / 4) / 32 / 32) // px index -> device row -> cell row
    }
  }
  return null
}, [col, PLAYFIELD_DEV_H, rgb])

/**
 * Are we in a live run? Detected off the bottom HUD strip, which shows the red
 * LIVES hearts — the story cards never paint bright red down there (their lower
 * half is the white typewriter text).
 */
export const isIngame = (page) => page.evaluate((h0) => {
  const c = document.getElementById('game')
  const img = c.getContext('2d').getImageData(0, h0, c.width, c.height - h0).data
  let red = 0
  for (let i = 0; i < img.length; i += 4) {
    if (img[i] === 255 && img[i + 1] === 0 && img[i + 2] === 0) red++
  }
  return red >= 10 // the LIVES hearts
}, PLAYFIELD_DEV_H)

/**
 * Did the bundle actually execute and paint? A canvas that 404'd its module
 * still exists in the DOM at the browser's default 300×150 and stays blank, so
 * these two together separate "page served" from "game running".
 */
export const canvasAlive = (page) => page.evaluate((w) => {
  const c = document.getElementById('game')
  if (!c || c.width !== w) return { sized: false, colours: 0 }
  const img = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  const seen = new Set()
  for (let i = 0; i < img.length; i += 4) seen.add((img[i] << 16) | (img[i + 1] << 8) | img[i + 2])
  return { sized: true, colours: seen.size }
}, CANVAS_DEV_W)
