import { CANVAS_W, CANVAS_H, ROWS, STATUS_ROWS, COLS, CELL, C } from './constants.ts'
import { TIMER_LOW_MS, GEM_TIME_BONUS_MS, GEM_SCORE, GOLD_SCORE_BONUS, CONTROLS, DROP_FLASH_BLINK_MS } from './config.ts'
import type { GameState, AirplaneState } from './game.ts'
import { countAdjacentMines, countBeaconSignals, GEM_KINDS, INVENTORY_CAP } from './game.ts'
import { drawSprite, drawChar, drawText, drawTextCentered as _drawTextCentered, drawScanlines, getAnimationFrame, type SpectrumColor, type Tile } from 'zx-kit'
import { loadHighScores } from './assets/highscore.ts'
import { L, getLocale } from './lang.ts'
import {
  PLAYER_RIGHT_A, PLAYER_RIGHT_B,
  PLAYER_LEFT_A, PLAYER_LEFT_B,
  PLAYER_UP_A, PLAYER_UP_B,
  PLAYER_DOWN_A, PLAYER_DOWN_B,
  MINE, GEM, EXPLOSION_1, EXPLOSION_2,
  AIRPLANE_RIGHT, AIRPLANE_LEFT,
  HEART, GROUND_A, GROUND_B,
  LED_ON, LED_OFF,
} from './sprites.ts'

// The bottom HUD spans STATUS_ROWS (6) rows below the playfield. One concern per
// row keeps each readable on the narrow 256 px width. Rows are addressed as
// STATUS_TOP + n*CELL:
//   0 backpack · 1 timer · 2 score+detector · 3 mines+level · 4 day/night · 5 lives
const STATUS_TOP = ROWS * CELL          // top of the HUD strip (first row: backpack)
const ROW_BACKPACK = STATUS_TOP             // gem inventory (can fill the full width)
const ROW_TIMER    = STATUS_TOP + 1 * CELL  // countdown clock (left)
const ROW_SCORE    = STATUS_TOP + 2 * CELL  // score (left) + mine detector / aircraft (right)
const ROW_MINES    = STATUS_TOP + 3 * CELL  // remaining mines (left) + level/combo/idle (right)
const ROW_CYCLE    = STATUS_TOP + 4 * CELL  // day/night counter
const ROW_LIVES    = STATUS_TOP + 5 * CELL  // lives label + hearts (left) + random tag (right)

function drawTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  ink: SpectrumColor, paper?: SpectrumColor,
): void {
  _drawTextCentered(ctx, text, y, COLS, ink, paper)
}

// ─── Player rendering ─────────────────────────────────────────────────────────

function renderPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
  const x = state.walkTween ? Math.round(state.walkTween.x) : state.playerCol * CELL
  const y = state.walkTween ? Math.round(state.walkTween.y) : state.playerRow * CELL

  if (state.phase === 'exploding') {
    const frame = state.flashTimer > 300 ? EXPLOSION_1 : EXPLOSION_2
    drawSprite(ctx, frame, x, y, C.B_YELLOW, C.B_RED)
    return
  }

  const f = getAnimationFrame(state.walkAnim) === 1
  const sprite = state.playerDir === 'left' ? (f ? PLAYER_LEFT_B : PLAYER_LEFT_A)
    : state.playerDir === 'up' ? (f ? PLAYER_UP_B : PLAYER_UP_A)
      : state.playerDir === 'down' ? (f ? PLAYER_DOWN_B : PLAYER_DOWN_A)
        : (f ? PLAYER_RIGHT_B : PLAYER_RIGHT_A)
  drawSprite(ctx, sprite, x, y, C.B_WHITE, C.BLACK)
}

// ─── Airplane rendering ───────────────────────────────────────────────────────

function renderAirplane(ctx: CanvasRenderingContext2D, plane: AirplaneState): void {
  const x = Math.floor(plane.x)
  const y = plane.y
  const sprite = plane.dir === -1 ? AIRPLANE_LEFT : AIRPLANE_RIGHT
  drawSprite(ctx, sprite, x, y, C.B_WHITE, C.BLACK)
}

// ─── Status bar ───────────────────────────────────────────────────────────────

// Mine-detector — an accessible visual twin of the proximity beep, split into
// the two dangers the sound conflates. A 4-segment meter shows IMMEDIATE mines
// (countAdjacentMines, 0–4): a lit slot is a filled disc, amber (1–2) → red
// (3–4) — never green, because any adjacent mine is a lethal step. Empty slots
// are ALWAYS green rings (never recolouring), so a full meter reads "all clear".
// Each tile stays 2-colour (one ink on black). A separate cyan lamp lights for a
// ranged BEACON broadcasting 2 cells out.
// Detector occupies columns DETECTOR_COL..DETECTOR_COL+7 — right-aligned on its
// row, sitting to the right of the score.
const DETECTOR_COL = 24

function renderDetector(ctx: CanvasRenderingContext2D, adjacent: number, beacon: number, y: number): void {
  drawText(ctx, '[', DETECTOR_COL * CELL, y, C.B_CYAN, C.BLACK)
  const litInk = adjacent <= 2 ? C.B_YELLOW : C.B_RED
  for (let i = 0; i < 4; i++) {
    const x = (DETECTOR_COL + 1 + i) * CELL
    if (i < adjacent) drawSprite(ctx, LED_ON, x, y, litInk, C.BLACK)
    else drawSprite(ctx, LED_OFF, x, y, C.BLUE, C.BLACK)  // empty = green ring, always
  }
  drawText(ctx, ']', (DETECTOR_COL + 5) * CELL, y, C.B_CYAN, C.BLACK)
  // Separate beacon lamp, one cell after the bracket — cyan disc when broadcasting,
  // else the same green empty ring as the meter (consistent, no recolouring).
  const bx = (DETECTOR_COL + 7) * CELL
  if (beacon > 0) drawSprite(ctx, LED_ON, bx, y, C.B_CYAN, C.BLACK)
  else drawSprite(ctx, LED_OFF, bx, y, C.B_RED, C.BLACK)
}

// First HUD row = the player's backpack: one gem sprite per held item, grouped by
// colour in GEM_KINDS order, left-to-right, capped at the row width.
function renderInventory(ctx: CanvasRenderingContext2D, state: GameState): void {
  let slot = 0
  for (const kind of GEM_KINDS) {
    const n = state.inventory[kind.id] ?? 0
    for (let i = 0; i < n && slot < INVENTORY_CAP; i++, slot++) {
      drawSprite(ctx, GEM, slot * CELL, ROW_BACKPACK, kind.color, C.BLACK)
    }
  }
}

function renderStatusBar(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, STATUS_TOP, CANVAS_W, STATUS_ROWS * CELL)

  // H1 — backpack
  renderInventory(ctx, state)

  // H2 — countdown clock (left). Steady white; red + blinking when low.
  const lowTime = state.timeLeftMs <= TIMER_LOW_MS
  if (!lowTime || state.blink) {
    drawText(ctx, L.STR_TIME(state.timeLeftMs), 0, ROW_TIMER, lowTime ? C.B_RED : C.B_WHITE, C.BLACK)
  }

  // H3 — score (left) + mine detector, or the aircraft warning in its place (right)
  drawText(ctx, L.STR_SCORE(state.score), 0, ROW_SCORE, C.B_WHITE, C.BLACK)
  if (state.airplane && state.airplane.warningBlink) {
    drawTextCentered(ctx, L.STR_AIRCRAFT, ROW_SCORE, C.B_YELLOW, C.BLACK)
  } else {
    renderDetector(
      ctx,
      countAdjacentMines(state.map, state.playerCol, state.playerRow),
      countBeaconSignals(state.map, state.playerCol, state.playerRow),
      ROW_SCORE,
    )
  }

  // H4 — remaining mines (left) + level / combo / idle (right)
  drawText(ctx, L.STR_MINES(state.totalMines - state.explodedMines), 0, ROW_MINES, C.B_WHITE, C.BLACK)
  if (state.runState === 'idle') {
    drawText(ctx, L.STR_IDLE, (COLS - L.STR_IDLE.length) * CELL, ROW_MINES, C.B_GREEN, C.BLACK)
  } else if (state.comboCount >= 2) {
    const comboStr = L.STR_COMBO(state.comboCount)
    drawText(ctx, comboStr, (COLS - comboStr.length) * CELL, ROW_MINES, C.B_YELLOW, C.BLACK)
  } else {
    const lvlStr = L.STR_LEVEL(state.level + 1)
    drawText(ctx, lvlStr, (COLS - lvlStr.length) * CELL, ROW_MINES, C.B_CYAN, C.BLACK)
  }

  // H5 — day / night counter (left)
  const cycleStr = state.isNight ? L.STR_NIGHT(state.cycleSteps) : L.STR_DAY(state.cycleSteps)
  const cycleInk = state.isNight ? C.B_CYAN : C.B_YELLOW
  drawText(ctx, cycleStr, 0, ROW_CYCLE, cycleInk, C.BLACK)

  // H6 — lives label + hearts (left) + random-run tag (right)
  const livesLabel = L.STR_LIVES_LABEL
  drawText(ctx, livesLabel, 0, ROW_LIVES, C.B_WHITE, C.BLACK)
  for (let i = 0; i < state.lives; i++) {
    drawSprite(ctx, HEART, (livesLabel.length + i) * CELL, ROW_LIVES, C.B_RED, C.BLACK)
  }
  // Random (R-rerolled) run flag — steady tag + blinking "off the leaderboard"
  // warning. dropSeedBase===null ⇔ random.
  if (state.dropSeedBase === null) {
    const noScoreX = (COLS - L.STR_NO_SCORE.length) * CELL
    const tagX = noScoreX - (L.STR_RANDOM_TAG.length + 1) * CELL
    drawText(ctx, L.STR_RANDOM_TAG, tagX, ROW_LIVES, C.B_MAGENTA, C.BLACK)
    if (state.blink) drawText(ctx, L.STR_NO_SCORE, noScoreX, ROW_LIVES, C.B_RED, C.BLACK)
  }
}

// ─── Overlays ─────────────────────────────────────────────────────────────────

function renderFlashOverlay(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.flashTimer <= 0 || !state.flashOn) return
  ctx.fillStyle = C.B_WHITE
  ctx.globalAlpha = 0.85
  ctx.fillRect(0, 0, CANVAS_W, ROWS * CELL)
  ctx.globalAlpha = 1.0
}

function renderGameOver(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = C.BLACK
  ctx.globalAlpha = 0.75
  ctx.fillRect(0, 0, CANVAS_W, ROWS * CELL)
  ctx.globalAlpha = 1.0

  const cy = Math.floor(ROWS / 2) - 3
  drawTextCentered(ctx, L.STR_GAME_OVER, cy * CELL, C.B_RED, C.BLACK)
  drawTextCentered(ctx, L.STR_SCORE_OVERLAY(state.score), (cy + 2) * CELL, C.B_WHITE, C.BLACK)
  if (state.blink) {
    drawTextCentered(ctx, L.STR_PRESS_ANY_KEY, (cy + 5) * CELL, C.B_YELLOW, C.BLACK)
  }
}

// Paged pause screen: 0 controls · 1 gems · 2 scoring. Key labels come from the
// CONTROLS single source; gem times and point values are read live from config,
// so this help can never drift from the actual numbers.
function renderPaused(ctx: CanvasRenderingContext2D, page: number): void {
  ctx.fillStyle = C.BLACK
  ctx.globalAlpha = 0.85
  ctx.fillRect(0, 0, CANVAS_W, ROWS * CELL)
  ctx.globalAlpha = 1.0

  drawTextCentered(ctx, L.STR_PAUSED, 1 * CELL, C.B_WHITE, C.BLACK)
  drawTextCentered(ctx, `- ${L.STR_PAUSE_TITLES[page] ?? ''} -`, 3 * CELL, C.B_YELLOW, C.BLACK)

  let y = 5 * CELL
  if (page === 0) {
    // Controls — engine-owned (arrows/F/P) and game-owned alike; skip title-only keys.
    for (const c of CONTROLS) {
      if (c.scope === 'title') continue
      drawText(ctx, c.keys, 2 * CELL, y, C.B_CYAN, C.BLACK)
      drawText(ctx, L.CONTROL_DESC[c.id] ?? c.id, 11 * CELL, y, C.B_WHITE, C.BLACK)
      y += CELL
    }
  } else if (page === 1) {
    // Gems — label in its own colour, live time bonus, special function.
    for (const k of GEM_KINDS) {
      const secs = Math.round((GEM_TIME_BONUS_MS[k.id] ?? 0) / 1000)
      drawText(ctx, L.GEM_LABEL[k.id] ?? k.id, 2 * CELL, y, k.color, C.BLACK)
      drawText(ctx, `+${secs}s`, 9 * CELL, y, C.B_WHITE, C.BLACK)
      drawText(ctx, L.GEM_SPECIAL[k.id] ?? '', 14 * CELL, y, C.B_WHITE, C.BLACK)
      y += CELL
    }
    y += CELL
    drawText(ctx, L.STR_GEM_ALL(GEM_SCORE), 2 * CELL, y, C.B_GREEN, C.BLACK); y += CELL
    drawText(ctx, L.STR_GEM_FULL, 2 * CELL, y, C.B_GREEN, C.BLACK)
  } else {
    for (const line of L.STR_SCORE_LINES(GEM_SCORE, GOLD_SCORE_BONUS)) {
      drawText(ctx, line, 2 * CELL, y, C.B_WHITE, C.BLACK)
      y += CELL
    }
  }

  drawTextCentered(ctx, L.STR_PAUSE_HINT, (ROWS - 2) * CELL, C.B_MAGENTA, C.BLACK)
}

function renderLevelComplete(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = C.BLACK
  ctx.globalAlpha = 0.6
  ctx.fillRect(0, 0, CANVAS_W, ROWS * CELL)
  ctx.globalAlpha = 1.0

  const cy = Math.floor(ROWS / 2) - 2
  drawTextCentered(ctx, L.STR_LEVEL_COMPLETE, cy * CELL, C.B_GREEN, C.BLACK)
  drawTextCentered(ctx, L.STR_SCORE_OVERLAY(state.score), (cy + 2) * CELL, C.B_WHITE, C.BLACK)
  if (state.blink) {
    drawTextCentered(ctx, L.STR_GET_READY, (cy + 4) * CELL, C.B_CYAN, C.BLACK)
  }
}

// ─── Hi-score name entry ──────────────────────────────────────────────────────

export function renderHiScoreEntry(
  ctx: CanvasRenderingContext2D,
  name: string[],
  cursor: number,
  blink: boolean,
  padLetter = '',
): void {
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  const cy = Math.floor(ROWS / 2) - 4
  drawTextCentered(ctx, L.STR_NEW_HIGH_SCORE, cy * CELL, C.B_YELLOW, C.BLACK)
  drawTextCentered(ctx, L.STR_ENTER_YOUR_NAME, (cy + 2) * CELL, C.B_WHITE, C.BLACK)

  const startX = Math.floor((COLS - 5) / 2) * CELL
  for (let i = 0; i < 3; i++) {
    const x = startX + i * 2 * CELL
    const y = (cy + 4) * CELL
    if (i < name.length) {
      const ink = i === cursor - 1 ? C.B_YELLOW : C.B_WHITE
      drawChar(ctx, name[i].charCodeAt(0), x, y, ink, C.BLACK)
    } else if (i === cursor) {
      if (padLetter) {
        drawChar(ctx, padLetter.charCodeAt(0), x, y, C.B_CYAN, C.BLACK)
      } else {
        drawChar(ctx, 127, x, y, blink ? C.B_WHITE : C.BLACK, blink ? C.BLACK : C.B_WHITE)
      }
    } else {
      drawChar(ctx, 127, x, y, C.BLACK, C.WHITE)
    }
  }

  if (cursor >= 1) {
    if (blink) drawTextCentered(ctx, L.STR_HISCORE_CONFIRM, (cy + 6) * CELL, C.B_GREEN, C.BLACK)
  } else {
    drawTextCentered(ctx, L.STR_HISCORE_PROMPT, (cy + 6) * CELL, C.CYAN, C.BLACK)
  }
  drawTextCentered(ctx, padLetter ? L.STR_HISCORE_HINT_PAD : L.STR_HISCORE_HINT_KEYBOARD, (cy + 7) * CELL, C.BLUE, C.BLACK)
}

// ─── Intro screen scene sprites ───────────────────────────────────────────────

const INTRO_TREE_TOP = new Uint8Array([
  0x18, // ...##...  narrow crown tip
  0x3C, // ..####..
  0x7E, // .######.
  0xFF, // ########  widest point
  0x7E, // .######.
  0x3C, // ..####..
  0x18, // ...##...  meets trunk
  0x18, // ...##...
])

const INTRO_TREE_TRUNK = new Uint8Array([
  0x18, // ...##...
  0x18, // ...##...
  0x18, // ...##...
  0x3C, // ..####..  roots start spreading
  0x3C, // ..####..
  0x18, // ...##...
  0x18, // ...##...
  0x18, // ...##...
])

const INTRO_FENCE_POST_TOP = new Uint8Array([
  0x18, // ...##...  post
  0x18, // ...##...
  0x18, // ...##...
  0x7E, // .######.  upper wire arm
  0x18, // ...##...
  0x18, // ...##...
  0x7E, // .######.  lower wire arm
  0x18, // ...##...
])

const INTRO_FENCE_POST_BOT = new Uint8Array([
  0x18, // ...##...
  0x18, // ...##...
  0x7E, // .######.  wire arm
  0x18, // ...##...
  0x18, // ...##...
  0x18, // ...##...
  0x18, // ...##...
  0x18, // ...##...
])

const INTRO_FENCE_WIRE = new Uint8Array([
  0x00, // ........
  0x55, // .#.#.#.#  upper strand
  0xAA, // #.#.#.#.  lower strand (interlocked = barbs)
  0x00, // ........
  0x55, // .#.#.#.#
  0xAA, // #.#.#.#.
  0x00, // ........
  0x00, // ........
])

const INTRO_FENCE_SKULL_TOP = new Uint8Array([
  0x7E, // .######.  skull dome
  0xDB, // ##.##.##  eye sockets
  0xFF, // ########
  0x7E, // .######.  jaw
  0x5A, // .#.##.#.  teeth
  0x7E, // .######.  chin
  0x00, // ........
  0x00, // ........
])

const INTRO_FENCE_SKULL_BOT = new Uint8Array([
  0x00, // ........
  0xC3, // ##....##  bone ends
  0x66, // .##..##.
  0x3C, // ..####..  crossing bones
  0x3C, // ..####..
  0x66, // .##..##.
  0xC3, // ##....##  bone ends
  0x00, // ........
])

// ─── Intro screen ─────────────────────────────────────────────────────────────

export function renderIntro(ctx: CanvasRenderingContext2D, blink: boolean, page: number): void {
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // === SKY + TITLE (rows 0-3) ===
  drawTextCentered(ctx, L.STR_TITLE, 1 * CELL, C.B_CYAN, C.BLACK)
  drawTextCentered(ctx, L.STR_SUBTITLE, 3 * CELL, C.CYAN, C.BLACK)

  // === TREE SILHOUETTES ON HORIZON (rows 4-5) ===
  const treeCols = [0, 1, 6, 7, 13, 14, 24, 25, 30, 31]
  for (const col of treeCols) {
    drawSprite(ctx, INTRO_TREE_TOP, col * CELL, 4 * CELL, C.GREEN, C.BLACK)
    drawSprite(ctx, INTRO_TREE_TRUNK, col * CELL, 5 * CELL, C.YELLOW, C.BLACK)
  }

  // === BARBED WIRE FENCE (rows 6-7, full width) ===
  for (let col = 0; col < COLS; col++) {
    const x = col * CELL
    if (col % 8 === 0) {
      drawSprite(ctx, INTRO_FENCE_POST_TOP, x, 6 * CELL, C.YELLOW, C.BLACK)
      drawSprite(ctx, INTRO_FENCE_POST_BOT, x, 7 * CELL, C.YELLOW, C.BLACK)
    } else if (col % 8 === 4) {
      drawSprite(ctx, INTRO_FENCE_SKULL_TOP, x, 6 * CELL, C.B_RED, C.BLACK)
      drawSprite(ctx, INTRO_FENCE_SKULL_BOT, x, 7 * CELL, C.B_RED, C.BLACK)
    } else {
      drawSprite(ctx, INTRO_FENCE_WIRE, x, 6 * CELL, C.WHITE, C.BLACK)
      drawSprite(ctx, INTRO_FENCE_WIRE, x, 7 * CELL, C.WHITE, C.BLACK)
    }
  }

  // === GREEN MINEFIELD (rows 8-11) ===
  for (let row = 8; row <= 11; row++) {
    for (let col = 0; col < COLS; col++) {
      const isA = (col + row) % 2 === 0
      drawSprite(ctx, isA ? GROUND_A : GROUND_B, col * CELL, row * CELL,
        isA ? C.B_GREEN : C.GREEN, C.BLACK)
    }
  }

  // Soldier entering from left
  drawSprite(ctx, PLAYER_RIGHT_A, 2 * CELL, 9 * CELL, C.B_WHITE, C.BLACK)

  // Mines scattered across the field
  drawSprite(ctx, MINE, 7 * CELL, 10 * CELL, C.B_RED, C.BLACK)
  drawSprite(ctx, MINE, 14 * CELL, 11 * CELL, C.B_RED, C.BLACK)
  drawSprite(ctx, MINE, 19 * CELL, 10 * CELL, C.RED, C.BLACK)
  drawSprite(ctx, MINE, 26 * CELL, 11 * CELL, C.B_RED, C.BLACK)

  // 2×2 explosion on the right — soldier stepped on a mine
  drawSprite(ctx, EXPLOSION_1, 22 * CELL, 8 * CELL, C.B_YELLOW, C.BLACK)
  drawSprite(ctx, EXPLOSION_2, 23 * CELL, 8 * CELL, C.B_YELLOW, C.B_RED)
  drawSprite(ctx, EXPLOSION_2, 22 * CELL, 9 * CELL, C.B_YELLOW, C.B_RED)
  drawSprite(ctx, EXPLOSION_1, 23 * CELL, 9 * CELL, C.B_YELLOW, C.BLACK)

  // Soldier fleeing right
  drawSprite(ctx, PLAYER_LEFT_A, 28 * CELL, 9 * CELL, C.B_WHITE, C.BLACK)

  // === TEXT PANEL (rows 12-23) ===
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 12 * CELL, CANVAS_W, 12 * CELL)

  for (let c = 0; c < COLS; c++) {
    drawChar(ctx, 0x2D, c * CELL, 12 * CELL, C.BLUE, C.BLACK)
  }

  const scores = loadHighScores()
  if (scores.length > 0 && page % 2 === 1) {
    drawTextCentered(ctx, L.STR_HIGH_SCORES_HEADER, 13 * CELL, C.B_YELLOW, C.BLACK)
    scores.forEach((e, i) => {
      drawTextCentered(ctx, L.STR_HIGH_SCORE_LINE(i + 1, e.name, e.score, e.level, e.date),
        (14 + i) * CELL, C.WHITE, C.BLACK)
    })
  } else {
    drawTextCentered(ctx, L.STR_CTRL_MOVE, 13 * CELL, C.WHITE, C.BLACK)
    drawTextCentered(ctx, L.STR_CTRL_FLAG, 14 * CELL, C.WHITE, C.BLACK)
    drawTextCentered(ctx, L.STR_CTRL_PAUSE, 15 * CELL, C.WHITE, C.BLACK)
    drawTextCentered(ctx, L.STR_GOAL, 16 * CELL, C.B_GREEN, C.BLACK)
    drawTextCentered(ctx, L.STR_AUDIO_HINT, 17 * CELL, C.YELLOW, C.BLACK)
  }

  // Language toggle hint — inherently a language code, not prose, so it's built
  // locally rather than routed through the L.STR_* translation pack.
  drawTextCentered(ctx, `L: ${getLocale().toUpperCase()}`, 18 * CELL, C.YELLOW, C.BLACK)

  if (blink) {
    drawTextCentered(ctx, L.STR_START_HINT, 19 * CELL, C.B_YELLOW, C.BLACK)
  }

  for (let c = 0; c < COLS; c++) {
    drawChar(ctx, 0x2D, c * CELL, 20 * CELL, C.BLUE, C.BLACK)
  }

  const build = import.meta.env.VITE_APP_BUILD ?? 'DEV'
  const zxKit = import.meta.env.VITE_ZX_KIT_VERSION ?? '?'
  drawTextCentered(ctx, L.STR_COPYRIGHT(build), 21 * CELL, C.BLUE, C.BLACK)
  drawTextCentered(ctx, L.STR_ZXKIT_VERSION(zxKit), 22 * CELL, C.BLUE, C.BLACK)
}

// ─── Main render entry ────────────────────────────────────────────────────────

/**
 * What the night hides: unvisited, UNFLAGGED terrain (ground and undetonated
 * mines). A flag is the player's own annotation — their memory is never blacked
 * out, same logic as the visited trail staying lit.
 *
 * REGRESSION NOTE (2026-07-04): flags used to survive the night for free because
 * they carried their own tile id; 0.47.0 made flagging a pure metadata overlay
 * (the tile keeps its true id — the right call), which silently put flagged tiles
 * back into the overlay's findById('ground'/'mine') sweeps. Night then painted
 * flags black: existing flags vanished and a freshly placed one looked like the
 * key did nothing (worse — a second press silently toggled it off again). This
 * predicate is the single place that decides night visibility; keep every night
 * sweep going through it.
 */
export function hiddenAtNight(tile: Tile): boolean {
  return (tile.id === 'ground' || tile.id === 'mine') && !tile.metadata?.flagged
}

export function renderFrame(ctx: CanvasRenderingContext2D, state: GameState, pausePage = 0): void {
  // Clear
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Game world — TileMap renders all cells in one call
  state.map.render(ctx)

  // Night overlay — paint unvisited terrain black. Visited path, FLAGS, gems and
  // exploded tiles remain visible; what exactly the night hides is decided by
  // hiddenAtNight (one place — see the regression note on it).
  if (state.isNight) {
    ctx.fillStyle = C.BLACK
    for (const { x, y, tile } of state.map.findById('ground')) {
      if (hiddenAtNight(tile)) ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
    }
    for (const { x, y, tile } of state.map.findById('mine')) {
      if (hiddenAtNight(tile)) ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
    }
  }

  // Debug overlay: draw mine sprites on top of ground-looking mine tiles
  if (state.debugMode) {
    for (const { x, y, tile } of state.map.findById('mine')) {
      const mineType = tile.metadata?.mineType as string
      const ink = mineType === 'cluster' ? C.B_YELLOW
        : mineType === 'beacon' ? C.B_CYAN
          : C.B_RED
      drawSprite(ctx, MINE, x * CELL, y * CELL, ink, C.BLACK)
    }
  }

  // Permanently revealed mines (cyan-gem reward) — drawn after the night overlay
  // so they stay visible even at night, in their type colour like the debug view.
  for (const { col, row } of state.revealedMines) {
    const tile = state.map.getTile(col, row)
    if (tile?.id !== 'mine') continue   // already detonated / cleared → nothing to show
    const mineType = tile.metadata?.mineType as string
    const ink = mineType === 'cluster' ? C.B_YELLOW
      : mineType === 'beacon' ? C.B_CYAN
        : C.B_RED
    drawSprite(ctx, MINE, col * CELL, row * CELL, ink, C.BLACK)
  }

  // Drop flash overlay — newly dropped mines blink white
  if (state.dropFlashTimer > 0) {
    const flashOn = Math.floor(state.dropFlashTimer / DROP_FLASH_BLINK_MS) % 2 === 1
    if (flashOn) {
      for (const { col, row } of state.droppedMines) {
        if (col !== state.playerCol || row !== state.playerRow) {
          ctx.fillStyle = C.B_WHITE
          ctx.fillRect(col * CELL, row * CELL, CELL, CELL)
        }
      }
    }
  }

  // Player sprite (always on top of world tiles)
  renderPlayer(ctx, state)

  // Airplane
  if (state.airplane) renderAirplane(ctx, state.airplane)

  // Status bar
  renderStatusBar(ctx, state)

  // Flash overlay (on top of game, below other overlays)
  renderFlashOverlay(ctx, state)

  // Phase overlays
  if (state.phase === 'playing' && state.runState === 'paused') renderPaused(ctx, pausePage)
  if (state.phase === 'gameover') renderGameOver(ctx, state)
  if (state.phase === 'levelcomplete') renderLevelComplete(ctx, state)

  // CRT scanline overlay — always last so it covers everything
  drawScanlines(ctx, 0.7)
}
