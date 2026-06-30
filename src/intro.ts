/**
 * intro.ts — "The Strip" narrative intro.
 *
 * A short typewriter story shown once on cold load, before the title screen.
 * Each card (from `L.STR_STORY_CARDS`) is a small sprite vignette in the upper
 * half + left-aligned lines typed out one character at a time. The owner asked
 * for a real intro with soul; this is the visual half. The audio half — an AY
 * underscore + per-char beeper ticks — is wired separately (audio.ts/main.ts).
 *
 * Pure rendering + a couple of timing helpers: no module state, no audio here,
 * so it stays trivially testable.
 */

import { drawText, drawSprite, drawChar, drawShade, DITHER, createBitmapFromRows, drawBitmap } from 'zx-kit'
import { CANVAS_W, CANVAS_H, CELL, COLS, C } from './constants.ts'
import { INTRO_VERSION, INTRO_REVALIDATE_DAYS } from './config.ts'
import { L } from './lang.ts'
import { PLAYER_RIGHT_A, GEM, GROUND_A, GROUND_B } from './sprites.ts'

/** Typewriter speed — ms per revealed character. */
export const MS_PER_CHAR = 120
/** Once a card is fully typed, hold this long before auto-advancing. */
export const CARD_HOLD_MS = 4200

/** Total characters in a card (sum of its line lengths) — the typewriter target. */
export function cardCharCount(card: readonly string[]): number {
  return card.reduce((sum, line) => sum + line.length, 0)
}

/** Number of story cards in the active locale. */
export function storyCardCount(): number {
  return L.STR_STORY_CARDS.length
}

/** Playback state of the typewriter story (kept tiny + serialisable-plain). */
export interface StoryState {
  card: number       // index of the card being typed
  revealed: number   // characters typed on the current card (float; floored to draw)
  hold: number       // ms the current card has been fully typed (drives auto-advance)
  finished: boolean  // true once past the last card — main.ts hands off to the title
}

export function createStoryState(): StoryState {
  return { card: 0, revealed: 0, hold: 0, finished: false }
}

/**
 * Advance the story by `dt` ms. `pressed` = any key / gamepad button this frame.
 * A press while still typing **finishes** the current card (so it can be read);
 * a press on an already-typed card — or the hold elapsing — **advances**. Past
 * the last card it sets `finished` (the loop then switches to the title). Pure
 * (mutates + returns the passed state); `cards` is injectable for tests.
 */
export function stepStory(
  s: StoryState,
  dt: number,
  pressed: boolean,
  cards: readonly (readonly string[])[] = L.STR_STORY_CARDS,
): StoryState {
  if (s.finished) return s
  const total = cardCharCount(cards[s.card])
  s.revealed = Math.min(total, s.revealed + dt / MS_PER_CHAR)
  const fullyTyped = s.revealed >= total
  if (fullyTyped) s.hold += dt

  if (pressed && !fullyTyped) {
    s.revealed = total       // first press: reveal the rest of this card
    s.hold = 0
  } else if (pressed || (fullyTyped && s.hold >= CARD_HOLD_MS)) {
    s.card++                 // advance to the next card / past the end
    s.revealed = 0
    s.hold = 0
    if (s.card >= cards.length) s.finished = true
  }
  return s
}

// ── "Seen" gate (localStorage) ─────────────────────────────────────────────
// The intro plays once per mode-start when "due": never seen, the content version
// changed (refreshed), or the last view is older than the revalidate window. The
// `I` key on the title replays it on demand regardless of this gate.

const INTRO_SEEN_KEY = 'minefield_intro'

interface IntroSeen { v: number; t: number }  // content version + last-seen timestamp (ms)

/** Pure due-check — exported for tests; no I/O. */
export function introDue(
  record: IntroSeen | null,
  now: number,
  version: number,
  revalidateDays: number,
): boolean {
  if (!record) return true
  if (record.v !== version) return true
  return now - record.t >= revalidateDays * 86_400_000
}

function readIntroSeen(): IntroSeen | null {
  try {
    const raw = localStorage.getItem(INTRO_SEEN_KEY)
    if (!raw) return null
    const o: unknown = JSON.parse(raw)
    if (o && typeof o === 'object'
      && typeof (o as IntroSeen).v === 'number'
      && typeof (o as IntroSeen).t === 'number') return o as IntroSeen
    return null
  } catch { return null }
}

/** Should the intro pre-roll on this mode start? */
export function isIntroDue(): boolean {
  return introDue(readIntroSeen(), Date.now(), INTRO_VERSION, INTRO_REVALIDATE_DAYS)
}

/** Record the intro as seen (on finish OR skip) — silences it for the window. */
export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, JSON.stringify({ v: INTRO_VERSION, t: Date.now() }))
  } catch { /* storage unavailable → intro simply re-shows, harmless */ }
}

const TEXT_X = 2 * CELL    // left margin of the typed text block
const TEXT_TOP = 13 * CELL  // first text row (just below the separator)
const SEP_ROW = 12 * CELL   // dashed separator between scene and text

// ── Hand-drawn establishing shot (card 1) ─────────────────────────────────
// Bespoke 8×8 tiles composed into a wide night scene: two walled-in sides, a
// barbed-wire crown, the dark Strip between them, a moon and a couple of barely
// visible buried mines. Every tile is one ink + one paper, so the whole scene
// is colour-clash-correct by construction (no bright/normal mix within a cell).
// MSB = leftmost pixel.

const T_BRICK = new Uint8Array([   // wall masonry: mortar courses + offset joints
  0b11111111,
  0b00001000,
  0b00001000,
  0b00001000,
  0b11111111,
  0b10000000,
  0b10000000,
  0b10000000,
])
const T_WIRE = new Uint8Array([    // barbed-wire strand with X barbs (wall crown)
  0b00000000,
  0b00000000,
  0b01000010,
  0b00100100,
  0b11111111,
  0b00100100,
  0b01000010,
  0b00000000,
])
const T_GROUND = new Uint8Array([  // frozen Strip surface: crust line + frost specks
  0b11111111,
  0b00000000,
  0b01000100,
  0b00000000,
  0b00010001,
  0b00000000,
  0b01000100,
  0b00000000,
])
const T_MOON = new Uint8Array([    // full moon disc
  0b00111100,
  0b01111110,
  0b11111111,
  0b11111111,
  0b11111111,
  0b11111111,
  0b01111110,
  0b00111100,
])
const T_STAR = new Uint8Array([    // a small twinkle
  0b00000000,
  0b00000000,
  0b00010000,
  0b00111000,
  0b00010000,
  0b00000000,
  0b00000000,
  0b00000000,
])
const T_MINE_DOME = new Uint8Array([  // a buried mine just breaking the surface
  0b00000000,
  0b00000000,
  0b00000000,
  0b00000000,
  0b00011000,
  0b00111100,
  0b01111110,
  0b11111111,
])
// (The dithered night sky now uses zx-kit's drawShade + DITHER.HALF — see below.)

// The signature image: walls left (cols 0–2) and right (cols 29–31), wire-
// crowned at row 2, brick down to row 11; a moon + stars in the night sky; the
// dark Strip (row 11) between them with two faint mine domes (row 10).
function drawEstablishingShot(ctx: CanvasRenderingContext2D): void {
  // Dimmed-blue night sky (rows 0–9): zx-kit's drawShade dithers black over
  // B_BLUE to fake an overcast night shade. Walls + field overdraw it.
  drawShade(ctx, 0, 0, COLS * CELL, 10 * CELL, C.BLACK, C.B_BLUE, DITHER.HALF)

  drawSprite(ctx, T_MOON, 24 * CELL, 1 * CELL, C.B_YELLOW, C.B_BLUE)
  for (const [c, r] of [[6, 0], [13, 2], [20, 1], [10, 3], [27, 4]] as const) {
    drawSprite(ctx, T_STAR, c * CELL, r * CELL, C.B_WHITE, C.B_BLUE)
  }

  // Walls: barbed-wire crown (row 2) against the sky, brick down to row 11.
  for (const baseCol of [0, 29]) {
    for (let c = 0; c < 3; c++) {
      const x = (baseCol + c) * CELL
      drawSprite(ctx, T_WIRE, x, 2 * CELL, C.B_WHITE, C.B_BLUE)
      for (let row = 3; row <= 11; row++) drawSprite(ctx, T_BRICK, x, row * CELL, C.BLUE, C.WHITE)
    }
  }

  // The dark Strip between the walls: row 11 crust, row 10 the dark field that
  // holds the two faint buried-mine domes.
  for (let col = 3; col <= 28; col++) drawSprite(ctx, T_GROUND, col * CELL, 11 * CELL, C.B_BLUE, C.BLACK)
  for (const col of [10, 20]) drawSprite(ctx, T_MINE_DOME, col * CELL, 10 * CELL, C.RED, C.BLACK)
}

// ── Hand-drawn scenes for cards 2–4 (same bespoke 8×8-tile technique) ──

const T_PLANE_TAIL = new Uint8Array([  // bomber: tail fin + fuselage + wing line (left cell)
  0b00000000,
  0b00110000,
  0b00111000,
  0b01111110,
  0b11111111,
  0b01111110,
  0b00000000,
  0b00000000,
])
const T_PLANE_NOSE = new Uint8Array([  // bomber: fuselage tapering to a pointed nose (right cell)
  0b00000000,
  0b00000000,
  0b00000000,
  0b11111100,
  0b11111110,
  0b11111100,
  0b00000000,
  0b00000000,
])
const T_SEED = new Uint8Array([        // a mine-seed dropped by the Sower
  0b00000000,
  0b00011000,
  0b00111100,
  0b00111100,
  0b00011000,
  0b00000000,
  0b00000000,
  0b00000000,
])
const T_PING = new Uint8Array([        // a sonar ring around a hidden mine — "you hear them"
  0b00111100,
  0b01000010,
  0b10000001,
  0b10011001,
  0b10011001,
  0b10000001,
  0b01000010,
  0b00111100,
])
const T_SUN = new Uint8Array([         // dawn sun with rays (card 4 — spring)
  0b10011001,
  0b01011010,
  0b00111100,
  0b01111110,
  0b01111110,
  0b00111100,
  0b01011010,
  0b10011001,
])

// Card 2 — the Sower flies over at night and seeds the field with fresh graves.
function drawSowerScene(ctx: CanvasRenderingContext2D): void {
  drawShade(ctx, 0, 0, COLS * CELL, 10 * CELL, C.BLACK, C.B_BLUE, DITHER.HALF)
  drawSprite(ctx, T_MOON, 3 * CELL, 1 * CELL, C.B_YELLOW, C.B_BLUE)
  for (const [c, r] of [[11, 1], [18, 0], [25, 2], [15, 4]] as const) {
    drawSprite(ctx, T_STAR, c * CELL, r * CELL, C.B_WHITE, C.B_BLUE)
  }
  // the bomber, mid-air, flying right; seeds raining down behind it
  drawSprite(ctx, T_PLANE_TAIL, 13 * CELL, 2 * CELL, C.B_WHITE, C.B_BLUE)
  drawSprite(ctx, T_PLANE_NOSE, 14 * CELL, 2 * CELL, C.B_WHITE, C.B_BLUE)
  for (const [c, r] of [[13, 4], [12, 6], [11, 8]] as const) {
    drawSprite(ctx, T_SEED, c * CELL, r * CELL, C.B_RED, C.B_BLUE)
  }
  // thin side walls + the dark Strip, freshly sown with graves
  for (const col of [0, 31]) for (let row = 2; row <= 11; row++) drawSprite(ctx, T_BRICK, col * CELL, row * CELL, C.BLUE, C.WHITE)
  for (let col = 1; col <= 30; col++) drawSprite(ctx, T_GROUND, col * CELL, 11 * CELL, C.B_BLUE, C.BLACK)
  for (const col of [5, 10, 16, 22, 27]) drawSprite(ctx, T_MINE_DOME, col * CELL, 10 * CELL, C.RED, C.BLACK)
}

// Card 3 — the blind crossing: can't see the mines, you hear them; find the gap.
function drawCrossingScene(ctx: CanvasRenderingContext2D): void {
  drawShade(ctx, 0, 0, COLS * CELL, 10 * CELL, C.BLACK, C.B_BLUE, DITHER.HALF)
  drawSprite(ctx, T_MOON, 27 * CELL, 1 * CELL, C.B_YELLOW, C.B_BLUE)
  for (const [c, r] of [[5, 1], [12, 0], [20, 2]] as const) {
    drawSprite(ctx, T_STAR, c * CELL, r * CELL, C.B_WHITE, C.B_BLUE)
  }
  // far wall (right, 3 cols), wire-crowned, with a GAP at rows 9–10 (the exit)
  for (let c = 0; c < 3; c++) {
    const col = 29 + c
    drawSprite(ctx, T_WIRE, col * CELL, 2 * CELL, C.B_WHITE, C.B_BLUE)
    for (let row = 3; row <= 11; row++) {
      if (row === 9 || row === 10) continue
      drawSprite(ctx, T_BRICK, col * CELL, row * CELL, C.BLUE, C.WHITE)
    }
  }
  for (let row = 2; row <= 11; row++) drawSprite(ctx, T_BRICK, 0, row * CELL, C.BLUE, C.WHITE)  // entry wall
  // runner facing the far gap; cyan pings = mines he hears, not sees
  drawSprite(ctx, PLAYER_RIGHT_A, 6 * CELL, 10 * CELL, C.B_WHITE, C.BLACK)
  for (const [c, r] of [[13, 10], [20, 10]] as const) drawSprite(ctx, T_PING, c * CELL, r * CELL, C.B_CYAN, C.BLACK)
  for (let col = 1; col <= 28; col++) drawSprite(ctx, T_GROUND, col * CELL, 11 * CELL, C.B_BLUE, C.BLACK)
}

// Card 4 — dawn, spring: the first runner made it across, carrying the delivery.
function drawDeliveryScene(ctx: CanvasRenderingContext2D): void {
  // dawn sky — a pale cyan haze (lighter QUARTER dither) with a rising sun
  drawShade(ctx, 0, 0, COLS * CELL, 10 * CELL, C.B_WHITE, C.B_CYAN, DITHER.QUARTER)
  drawSprite(ctx, T_SUN, 4 * CELL, 1 * CELL, C.B_YELLOW, C.B_CYAN)
  // the far wall with the gap he's reached (rows 9–10)
  for (let c = 0; c < 3; c++) {
    const col = 29 + c
    for (let row = 3; row <= 11; row++) {
      if (row === 9 || row === 10) continue
      drawSprite(ctx, T_BRICK, col * CELL, row * CELL, C.BLUE, C.WHITE)
    }
  }
  // spring grass band (rows 10–11)
  for (let row = 10; row <= 11; row++) {
    for (let col = 1; col <= 28; col++) {
      const isA = (col + row) % 2 === 0
      drawSprite(ctx, isA ? GROUND_A : GROUND_B, col * CELL, row * CELL, isA ? C.B_GREEN : C.GREEN, C.BLACK)
    }
  }
  // the runner at the gap with his first delivery, carried home
  drawSprite(ctx, GEM, 24 * CELL, 9 * CELL, C.B_GREEN, C.B_CYAN)
  drawSprite(ctx, PLAYER_RIGHT_A, 26 * CELL, 9 * CELL, C.B_WHITE, C.B_CYAN)
}

// A sitting cat silhouette, 4×-majority-downscaled from a 96×128 hand-authored
// source (zxart white_cat_sitting) to 24×32 so it fits the 12-row vignette.
const CAT_SITTING = createBitmapFromRows([
  '..X.....................',
  '..XX.......XXX..........',
  '..XXX.....XXXX..........',
  '..XXXXXXXXXXXX..........',
  '..XXXXXXXXXXXX..........',
  '..XXXXXXXXXXXX..........',
  '..XXXXXXXXXXX...........',
  '..XXXXXXXXXXX...........',
  '..XXXXXXXXXXXX..........',
  '...XXXXXXXXXX...........',
  '.XXXXXXXXXXXXX..........',
  '..XXXXXXXXXXXX..........',
  '...XXXXXXXXXX...........',
  '...XXXXXXXXXX...........',
  '..XXXXXXXXXXXX..........',
  '..XXXXXXXXXXXX..........',
  '...XXXXXXXXXXXX.........',
  '...XXXXXXXXXXXX...XXX...',
  '...XXXXXXXXXXXXX..XXXX..',
  '...XXXXXXXXXXXXX....XXX.',
  '...XXXXXXXXXXXXX....XXX.',
  '..XXXXXXXXXXXXXXX...XXX.',
  '..XXXXXXXXXXXXXXX...XXX.',
  '..XXXXXXXXXXXXXXXX..XXX.',
  '..XXXXXXXXXXXXXXXX..XXX.',
  '..XXXXXXXXXXXXXXX..XXX..',
  '...XXXXXXXXXXXXXX.XXXX..',
  '...XXXXXXXXXXXXXXXXXX...',
  '....XXXXXXXXXXXXXXXX....',
  '...XXXXXXXXXXXXXXX......',
  '...XXXXXXXXXXX..........',
  '........................',
])

// Card 3 — despair: for years no one crossed; the field is wired off and sown.
// A stray cat sits undisturbed in the gap between two mines — a first, quiet
// hint (before THE RUNNER finds the same gap on purpose) that a way exists.
function drawDespairScene(ctx: CanvasRenderingContext2D): void {
  drawShade(ctx, 0, 0, COLS * CELL, 10 * CELL, C.BLACK, C.B_BLUE, DITHER.HALF)  // grim, no moon
  drawShade(ctx, 1 * CELL, 8 * CELL, 30 * CELL, CELL, C.BLACK, C.YELLOW, DITHER.QUARTER)  // first light, low on the horizon
  for (const [c, r] of [[7, 1], [16, 0], [23, 2]] as const) {
    drawSprite(ctx, T_STAR, c * CELL, r * CELL, C.WHITE, C.B_BLUE)  // cold, dim stars
  }
  for (const col of [0, 31]) for (let row = 2; row <= 11; row++) drawSprite(ctx, T_BRICK, col * CELL, row * CELL, C.BLUE, C.WHITE)
  // a barbed-wire barrier strung across the field, buried mines beneath it
  for (let col = 1; col <= 30; col++) drawSprite(ctx, T_WIRE, col * CELL, 9 * CELL, C.WHITE, C.B_BLUE)
  for (let col = 1; col <= 30; col++) drawSprite(ctx, T_GROUND, col * CELL, 11 * CELL, C.B_BLUE, C.BLACK)
  for (const col of [4, 10, 16, 22, 27]) drawSprite(ctx, T_MINE_DOME, col * CELL, 10 * CELL, C.RED, C.BLACK)
  drawBitmap(ctx, CAT_SITTING, 6 * CELL, 11 * CELL - CAT_SITTING.height, C.B_WHITE)
}

// Upper-half scene per card — all five hand-drawn. Beats: the Strip → the Sower
// seeds it → despair (the graves) → the blind crossing → dawn & the delivery.
function drawVignette(ctx: CanvasRenderingContext2D, cardIndex: number): void {
  switch (cardIndex) {
    case 0:  drawEstablishingShot(ctx); break
    case 1:  drawSowerScene(ctx); break
    case 2:  drawDespairScene(ctx); break
    case 3:  drawCrossingScene(ctx); break
    default: drawDeliveryScene(ctx); break
  }
}

// Draw each line's visible prefix so the whole card reveals as one continuous
// stream of `revealed` characters flowing line to line, with a blinking caret
// at the live typing position.
function drawTypedLines(
  ctx: CanvasRenderingContext2D,
  lines: readonly string[],
  revealed: number,
  blink: boolean,
): void {
  let consumed = 0
  let caretDrawn = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const inLine = revealed - consumed                  // chars into this line
    const show = Math.max(0, Math.min(line.length, inLine))
    if (show > 0) drawText(ctx, line.slice(0, show), TEXT_X, TEXT_TOP + i * CELL, C.B_WHITE, C.BLACK)
    if (!caretDrawn && inLine >= 0 && inLine < line.length && blink) {
      drawChar(ctx, 0x5F /* _ */, TEXT_X + show * CELL, TEXT_TOP + i * CELL, C.B_YELLOW, C.BLACK)
      caretDrawn = true
    }
    consumed += line.length
  }
}

/**
 * Render one story card with `revealed` characters typed in. Clears to black,
 * draws the vignette + a dashed separator (matching the title screen) + the
 * typed lines, and blinks the skip hint and a card counter.
 */
export function renderStoryCard(
  ctx: CanvasRenderingContext2D,
  cardIndex: number,
  revealed: number,
  blink: boolean,
): void {
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  drawVignette(ctx, cardIndex)

  // Chapter heading on the separator rule, book-style: "──  N/5  TITLE  ──"
  for (let c = 0; c < COLS; c++) drawChar(ctx, 0x2D, c * CELL, SEP_ROW, C.BLUE, C.BLACK)
  const heading = `  ${cardIndex + 1}/${L.STR_STORY_TITLES.length}  ${L.STR_STORY_TITLES[cardIndex]}  `
  drawText(ctx, heading, ((COLS - heading.length) >> 1) * CELL, SEP_ROW, C.B_YELLOW, C.BLACK)

  drawTypedLines(ctx, L.STR_STORY_CARDS[cardIndex], revealed, blink)

  if (blink) drawText(ctx, L.STR_STORY_SKIP_HINT, TEXT_X, 22 * CELL, C.B_BLUE, C.BLACK)
}
