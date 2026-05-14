import { CANVAS_W, CANVAS_H, ROWS, COLS, CELL, C } from './constants.ts'
import type { GameState, AirplaneState } from './game.ts'
import { drawSprite, drawChar, drawText, drawTextCentered as _drawTextCentered, drawScanlines, getAnimationFrame, type SpectrumColor } from 'zx-kit'
import { loadHighScores } from './assets/highscore.ts'
import {
  PLAYER_RIGHT_A, PLAYER_RIGHT_B,
  PLAYER_LEFT_A, PLAYER_LEFT_B,
  PLAYER_UP_A, PLAYER_UP_B,
  PLAYER_DOWN_A, PLAYER_DOWN_B,
  MINE, EXPLOSION_1, EXPLOSION_2,
  AIRPLANE_RIGHT, AIRPLANE_LEFT,
  HEART, GROUND_A, GROUND_B,
} from './sprites.ts'

const STATUS_Y = ROWS * CELL  // 176

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

function renderStatusBar(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, STATUS_Y, CANVAS_W, 16)

  const scoreStr = `SCORE:${String(state.score).padStart(5, '0')}`
  drawText(ctx, scoreStr, 0, STATUS_Y, C.B_WHITE, C.BLACK)
  if (state.runState === 'idle') {
    const idleStr = 'SCOUT'
    drawText(ctx, idleStr, (COLS - idleStr.length) * CELL, STATUS_Y, C.B_GREEN, C.BLACK)
  } else if (state.comboCount >= 2) {
    const comboStr = `COMBO:x${state.comboCount}`
    drawText(ctx, comboStr, (COLS - comboStr.length) * CELL, STATUS_Y, C.B_YELLOW, C.BLACK)
  } else {
    const lvlStr = `LVL:${state.level + 1}`
    drawText(ctx, lvlStr, (COLS - lvlStr.length) * CELL, STATUS_Y, C.B_CYAN, C.BLACK)
  }

  const minesRemaining = state.totalMines - state.explodedMines
  const minesStr = `MINES:${String(minesRemaining).padStart(3, '0')}`
  drawText(ctx, minesStr, 0, STATUS_Y + CELL, C.B_WHITE, C.BLACK)

  const cycleStr = state.isNight ? `NGT:${String(state.cycleSteps).padStart(2, '0')}` : `DAY:${String(state.cycleSteps).padStart(2, '0')}`
  const cycleInk = state.isNight ? C.B_CYAN : C.B_YELLOW
  drawTextCentered(ctx, cycleStr, STATUS_Y + CELL, cycleInk, C.BLACK)

  const livesLabel = 'LIVES:'
  const livesX = (COLS - livesLabel.length - state.lives) * CELL
  drawText(ctx, livesLabel, livesX, STATUS_Y + CELL, C.B_WHITE, C.BLACK)
  for (let i = 0; i < state.lives; i++) {
    drawSprite(ctx, HEART, livesX + (livesLabel.length + i) * CELL, STATUS_Y + CELL, C.B_RED, C.BLACK)
  }

  if (state.airplane && state.airplane.warningBlink) {
    drawTextCentered(ctx, '** AIRCRAFT **', STATUS_Y, C.B_YELLOW, C.BLACK)
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
  drawTextCentered(ctx, 'GAME  OVER', cy * CELL, C.B_RED, C.BLACK)
  drawTextCentered(ctx, `SCORE: ${String(state.score).padStart(5, '0')}`, (cy + 2) * CELL, C.B_WHITE, C.BLACK)
  if (state.blink) {
    drawTextCentered(ctx, 'PRESS ANY KEY', (cy + 5) * CELL, C.B_YELLOW, C.BLACK)
  }
}

function renderPaused(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = C.BLACK
  ctx.globalAlpha = 0.6
  ctx.fillRect(0, 0, CANVAS_W, ROWS * CELL)
  ctx.globalAlpha = 1.0
  if (state.blink) {
    drawTextCentered(ctx, '** PAUSED **', Math.floor(ROWS / 2) * CELL, C.B_WHITE, C.BLACK)
  }
}

function renderLevelComplete(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = C.BLACK
  ctx.globalAlpha = 0.6
  ctx.fillRect(0, 0, CANVAS_W, ROWS * CELL)
  ctx.globalAlpha = 1.0

  const cy = Math.floor(ROWS / 2) - 2
  drawTextCentered(ctx, 'LEVEL  COMPLETE!', cy * CELL, C.B_GREEN, C.BLACK)
  drawTextCentered(ctx, `SCORE: ${String(state.score).padStart(5, '0')}`, (cy + 2) * CELL, C.B_WHITE, C.BLACK)
  if (state.blink) {
    drawTextCentered(ctx, 'GET READY...', (cy + 4) * CELL, C.B_CYAN, C.BLACK)
  }
}

// ─── Hi-score name entry ──────────────────────────────────────────────────────

export function renderHiScoreEntry(
  ctx: CanvasRenderingContext2D,
  name: string[],
  cursor: number,
  blink: boolean,
): void {
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  const cy = Math.floor(ROWS / 2) - 4
  drawTextCentered(ctx, 'NEW HIGH SCORE!', cy * CELL, C.B_YELLOW, C.BLACK)
  drawTextCentered(ctx, 'ENTER YOUR NAME:', (cy + 2) * CELL, C.B_WHITE, C.BLACK)

  const startX = Math.floor((COLS - 5) / 2) * CELL
  for (let i = 0; i < 3; i++) {
    const x = startX + i * 2 * CELL
    const y = (cy + 4) * CELL
    if (i < name.length) {
      const ink = i === cursor - 1 ? C.B_YELLOW : C.B_WHITE
      drawChar(ctx, name[i].charCodeAt(0), x, y, ink, C.BLACK)
    } else if (i === cursor) {
      drawChar(ctx, 127, x, y, blink ? C.B_WHITE : C.BLACK, blink ? C.BLACK : C.B_WHITE)
    } else {
      drawChar(ctx, 127, x, y, C.BLACK, C.WHITE)
    }
  }

  if (cursor >= 1) {
    if (blink) drawTextCentered(ctx, 'ENTER=SAVE   ESC=SKIP', (cy + 6) * CELL, C.B_GREEN, C.BLACK)
  } else {
    drawTextCentered(ctx, 'TYPE 1-3 LETTERS', (cy + 6) * CELL, C.CYAN, C.BLACK)
  }
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
  drawTextCentered(ctx, 'M I N E F I E L D', 1 * CELL, C.B_CYAN, C.BLACK)
  drawTextCentered(ctx, 'ZX  SPECTRUM  EDITION', 3 * CELL, C.CYAN, C.BLACK)

  // === TREE SILHOUETTES ON HORIZON (rows 4-5) ===
  const treeCols = [0, 1, 6, 7, 13, 14, 24, 25, 30, 31]
  for (const col of treeCols) {
    drawSprite(ctx, INTRO_TREE_TOP,   col * CELL, 4 * CELL, C.GREEN,  C.BLACK)
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

  // === GREEN MINEFIELD (rows 8-12) ===
  for (let row = 8; row <= 12; row++) {
    for (let col = 0; col < COLS; col++) {
      const isA = (col + row) % 2 === 0
      drawSprite(ctx, isA ? GROUND_A : GROUND_B, col * CELL, row * CELL,
        isA ? C.B_GREEN : C.GREEN, C.BLACK)
    }
  }

  // Soldier entering from left
  drawSprite(ctx, PLAYER_RIGHT_A, 2 * CELL, 9 * CELL, C.B_WHITE, C.BLACK)

  // Mines scattered across the field
  drawSprite(ctx, MINE,  7 * CELL, 10 * CELL, C.B_RED, C.BLACK)
  drawSprite(ctx, MINE, 14 * CELL, 11 * CELL, C.B_RED, C.BLACK)
  drawSprite(ctx, MINE, 19 * CELL, 10 * CELL, C.RED,   C.BLACK)
  drawSprite(ctx, MINE, 26 * CELL, 12 * CELL, C.B_RED, C.BLACK)

  // 2×2 explosion on the right — soldier stepped on a mine
  drawSprite(ctx, EXPLOSION_1, 22 * CELL,  8 * CELL, C.B_YELLOW, C.BLACK)
  drawSprite(ctx, EXPLOSION_2, 23 * CELL,  8 * CELL, C.B_YELLOW, C.B_RED)
  drawSprite(ctx, EXPLOSION_2, 22 * CELL,  9 * CELL, C.B_YELLOW, C.B_RED)
  drawSprite(ctx, EXPLOSION_1, 23 * CELL,  9 * CELL, C.B_YELLOW, C.BLACK)

  // Soldier fleeing right
  drawSprite(ctx, PLAYER_LEFT_A, 28 * CELL, 9 * CELL, C.B_WHITE, C.BLACK)

  // === TEXT PANEL (rows 13-23) ===
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 13 * CELL, CANVAS_W, 11 * CELL)

  for (let c = 0; c < COLS; c++) {
    drawChar(ctx, 0x2D, c * CELL, 13 * CELL, C.BLUE, C.BLACK)
  }

  const scores = loadHighScores()
  if (scores.length > 0 && page % 2 === 1) {
    drawTextCentered(ctx, 'HIGH SCORES', 14 * CELL, C.B_YELLOW, C.BLACK)
    scores.forEach((e, i) => {
      const line = `${i + 1}. ${e.name}  ${String(e.score).padStart(5, '0')}  LVL:${e.level}`
      drawTextCentered(ctx, line, (15 + i) * CELL, C.WHITE, C.BLACK)
    })
  } else {
    drawTextCentered(ctx, 'ARROWS = MOVE',    14 * CELL, C.WHITE,   C.BLACK)
    drawTextCentered(ctx, 'F = FLAG MINE',    15 * CELL, C.WHITE,   C.BLACK)
    drawTextCentered(ctx, 'P = PAUSE',        16 * CELL, C.WHITE,   C.BLACK)
    drawTextCentered(ctx, 'CROSS THE FIELD!', 17 * CELL, C.B_GREEN, C.BLACK)
    drawTextCentered(ctx, 'KEYBOARD REQUIRED', 18 * CELL, C.YELLOW, C.BLACK)
  }

  if (blink) {
    drawTextCentered(ctx, 'SPACE / ENTER / S = START', 19 * CELL, C.B_YELLOW, C.BLACK)
  }

  for (let c = 0; c < COLS; c++) {
    drawChar(ctx, 0x2D, c * CELL, 20 * CELL, C.BLUE, C.BLACK)
  }

  const build = import.meta.env.VITE_APP_BUILD ?? 'DEV'
  const zxKit = import.meta.env.VITE_ZX_KIT_VERSION ?? '?'
  drawTextCentered(ctx, `(C) 2026  RELEASE:${build}`, 21 * CELL, C.BLUE, C.BLACK)
  drawTextCentered(ctx, `ZX-KIT:${zxKit}`, 22 * CELL, C.BLUE, C.BLACK)
}

// ─── Main render entry ────────────────────────────────────────────────────────

export function renderFrame(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Clear
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Game world — TileMap renders all cells in one call
  state.map.render(ctx)

  // Night overlay — paint unvisited terrain black (ground, mine, gem invisible)
  // Visited path, flags, and exploded tiles remain visible
  if (state.isNight) {
    ctx.fillStyle = C.BLACK
    for (const { x, y } of state.map.findById('ground')) {
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
    }
    for (const { x, y } of state.map.findById('mine')) {
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
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

  // Drop flash overlay — newly dropped mines blink white
  if (state.dropFlashTimer > 0) {
    const flashOn = Math.floor(state.dropFlashTimer / 100) % 2 === 1
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
  if (state.phase === 'playing' && state.runState === 'paused') renderPaused(ctx, state)
  if (state.phase === 'gameover') renderGameOver(ctx, state)
  if (state.phase === 'levelcomplete') renderLevelComplete(ctx, state)

  // CRT scanline overlay — always last so it covers everything
  drawScanlines(ctx, 0.7)
}
