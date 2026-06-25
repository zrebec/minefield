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

import { drawText, drawSprite, drawChar, drawShade, DITHER } from 'zx-kit'
import { CANVAS_W, CANVAS_H, CELL, COLS, C } from './constants.ts'
import { L } from './lang.ts'
import { PLAYER_RIGHT_A, AIRPLANE_RIGHT, MINE, GEM } from './sprites.ts'

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

// Upper-half scene per card. Card 1 is the hand-drawn establishing shot; the
// rest are simpler sprite vignettes (to be redrawn bespoke if card 1 lands).
// Card order maps to the beats: the Strip → the Sower → the crossing → delivery.
function drawVignette(ctx: CanvasRenderingContext2D, cardIndex: number): void {
  switch (cardIndex) {
    case 0:  // hand-drawn: two walls + the Strip between, a moon, buried mines
      drawEstablishingShot(ctx)
      break
    case 1:  // the Sower (aircraft) dropping a fresh mine
      drawSprite(ctx, AIRPLANE_RIGHT, 12 * CELL, 4 * CELL, C.B_WHITE, C.BLACK)
      drawSprite(ctx, MINE, 14 * CELL, 7 * CELL, C.B_RED, C.BLACK)
      break
    case 2:  // the runner crossing blind, mines around
      drawSprite(ctx, PLAYER_RIGHT_A, 10 * CELL, 6 * CELL, C.B_WHITE, C.BLACK)
      drawSprite(ctx, MINE, 16 * CELL, 6 * CELL, C.RED, C.BLACK)
      drawSprite(ctx, MINE, 20 * CELL, 7 * CELL, C.RED, C.BLACK)
      break
    default:  // the runner + his first delivery (gems = shipments)
      drawSprite(ctx, PLAYER_RIGHT_A, 13 * CELL, 6 * CELL, C.B_WHITE, C.BLACK)
      drawSprite(ctx, GEM, 17 * CELL, 6 * CELL, C.B_GREEN, C.BLACK)
      break
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

  for (let c = 0; c < COLS; c++) drawChar(ctx, 0x2D, c * CELL, SEP_ROW, C.BLUE, C.BLACK)

  drawTypedLines(ctx, L.STR_STORY_CARDS[cardIndex], revealed, blink)

  if (blink) drawText(ctx, L.STR_STORY_SKIP_HINT, TEXT_X, 22 * CELL, C.B_BLUE, C.BLACK)
  drawText(ctx, `${cardIndex + 1}/${L.STR_STORY_CARDS.length}`, (COLS - 4) * CELL, 22 * CELL, C.BLUE, C.BLACK)
}
