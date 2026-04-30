import { CANVAS_W, CANVAS_H, ROWS, COLS, CELL, C } from './constants.ts'
import type { GameState, AirplaneState } from './game.ts'
import { drawSprite, drawChar, drawText, drawTextCentered as _drawTextCentered } from 'zx-kit'
import { loadHighScores } from './highscore.ts'
import {
  PLAYER_RIGHT_A, PLAYER_RIGHT_B,
  PLAYER_LEFT_A, PLAYER_LEFT_B,
  PLAYER_UP_A, PLAYER_UP_B,
  PLAYER_DOWN_A, PLAYER_DOWN_B,
  MINE, EXPLOSION_1, EXPLOSION_2, FLAG, GROUND_A, GROUND_B,
  AIRPLANE_RIGHT, AIRPLANE_LEFT, GEM,
} from './sprites.ts'

const STATUS_Y = ROWS * CELL  // 176

// Bind COLS so callers don't need to pass it every time
function drawTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  y: number,
  ink: string, paper?: string,
): void {
  _drawTextCentered(ctx, text, y, COLS, ink, paper)
}

// ─── Cell rendering ───────────────────────────────────────────────────────────

function getCellInkPaper(state: GameState, col: number, row: number): [string, string] {
  const cell = state.grid[row][col]
  const isPlayer = col === state.playerCol && row === state.playerRow

  if (isPlayer) {
    if (state.phase === 'exploding') return [C.B_YELLOW, C.B_RED]
    return [C.B_WHITE, C.BLACK]
  }
  if (cell.exploded) return [C.B_YELLOW, C.BLACK]
  if (cell.flagged) return [C.B_CYAN, C.BLACK]
  if (state.debugMode && cell.hasMine) {
    const ink = cell.mineType === 'cluster' ? C.B_YELLOW
      : cell.mineType === 'beacon' ? C.B_CYAN
      : C.B_RED
    return [ink, C.BLACK]
  }
  if (cell.hasGem && !cell.visited) return [C.B_CYAN, C.BLACK]
  if (cell.visited) return [C.B_YELLOW, C.BLACK]

  // Checkerboard for unvisited ground
  return (col + row) % 2 === 0
    ? [C.B_GREEN, C.BLACK]
    : [C.GREEN, C.BLACK]
}

function renderCell(ctx: CanvasRenderingContext2D, state: GameState, col: number, row: number): void {
  const x = col * CELL
  const y = row * CELL
  const cell = state.grid[row][col]
  const isPlayer = col === state.playerCol && row === state.playerRow

  // Flash newly dropped mines so player sees where they landed
  if (state.dropFlashTimer > 0 && !isPlayer) {
    const isDropped = state.droppedMines.some(m => m.col === col && m.row === row)
    if (isDropped) {
      const flashOn = Math.floor(state.dropFlashTimer / 100) % 2 === 1
      if (flashOn) {
        ctx.fillStyle = C.B_WHITE
        ctx.fillRect(x, y, CELL, CELL)
        return
      }
    }
  }

  const [ink, paper] = getCellInkPaper(state, col, row)

  const ground = (col + row) % 2 === 0 ? GROUND_A : GROUND_B

  if (isPlayer) {
    if (state.phase === 'exploding') {
      const frame = state.flashTimer > 300 ? EXPLOSION_1 : EXPLOSION_2
      drawSprite(ctx, frame, x, y, ink, paper)
    } else {
      const f = state.playerWalkFrame === 1
      const sprite = state.playerDir === 'left'  ? (f ? PLAYER_LEFT_B  : PLAYER_LEFT_A)
        : state.playerDir === 'up'   ? (f ? PLAYER_UP_B    : PLAYER_UP_A)
        : state.playerDir === 'down' ? (f ? PLAYER_DOWN_B  : PLAYER_DOWN_A)
        :                              (f ? PLAYER_RIGHT_B : PLAYER_RIGHT_A)
      drawSprite(ctx, sprite, x, y, ink, paper)
    }
    return
  }

  if (cell.exploded) {
    drawSprite(ctx, EXPLOSION_2, x, y, ink, paper)
    return
  }

  if (cell.flagged) {
    drawSprite(ctx, FLAG, x, y, ink, paper)
    return
  }

  if (state.debugMode && cell.hasMine) {
    drawSprite(ctx, MINE, x, y, ink, paper)
    return
  }

  if (cell.hasGem && !cell.visited) {
    drawSprite(ctx, GEM, x, y, C.B_CYAN, C.BLACK)
    return
  }

  drawSprite(ctx, ground, x, y, ink, paper)
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
  // Background
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, STATUS_Y, CANVAS_W, 16)

  // Row 1: SCORE:NNNNN  [COMBO:xN | IDLE | LVL:N]
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

  // Row 2: MINES:NNN  LIVES:███
  const minesRemaining = state.totalMines - state.explodedMines
  const minesStr = `MINES:${String(minesRemaining).padStart(3, '0')}`
  drawText(ctx, minesStr, 0, STATUS_Y + CELL, C.B_WHITE, C.BLACK)

  // Lives: filled block per life
  const livesLabel = 'LIVES:'
  const livesX = (COLS - livesLabel.length - state.lives) * CELL
  drawText(ctx, livesLabel, livesX, STATUS_Y + CELL, C.B_WHITE, C.BLACK)
  for (let i = 0; i < state.lives; i++) {
    drawChar(ctx, 127, livesX + (livesLabel.length + i) * CELL, STATUS_Y + CELL, C.B_GREEN, C.BLACK)
  }

  // Aircraft warning (blinking)
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

  // 3 name slots, spaced 2 chars apart, centered in the 32-char grid
  const startX = Math.floor((COLS - 5) / 2) * CELL
  for (let i = 0; i < 3; i++) {
    const x = startX + i * 2 * CELL
    const y = (cy + 4) * CELL
    if (i < name.length) {
      // already entered — highlight current slot yellow
      const ink = i === cursor - 1 ? C.B_YELLOW : C.B_WHITE
      drawChar(ctx, name[i].charCodeAt(0), x, y, ink, C.BLACK)
    } else if (i === cursor) {
      // cursor position — blink filled block
      drawChar(ctx, 127, x, y, blink ? C.B_WHITE : C.BLACK, blink ? C.BLACK : C.B_WHITE)
    } else {
      // future empty slot — inverted block as placeholder
      drawChar(ctx, 127, x, y, C.BLACK, C.WHITE)
    }
  }

  if (cursor >= 3) {
    if (blink) drawTextCentered(ctx, 'PRESS ENTER', (cy + 6) * CELL, C.B_GREEN, C.BLACK)
  } else {
    drawTextCentered(ctx, `TYPE ${3 - cursor} MORE LETTER${cursor < 2 ? 'S' : ''}`, (cy + 6) * CELL, C.CYAN, C.BLACK)
  }
}

// ─── Intro screen ─────────────────────────────────────────────────────────────

export function renderIntro(ctx: CanvasRenderingContext2D, blink: boolean, page: number): void {
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Border frame (solid blocks)
  const ink = C.B_CYAN
  const paper = C.BLACK
  for (let c = 0; c < COLS; c++) {
    drawChar(ctx, 127, c * CELL, 2 * CELL, ink, paper)
    drawChar(ctx, 127, c * CELL, 19 * CELL, ink, paper)
  }
  for (let r = 3; r <= 18; r++) {
    drawChar(ctx, 127, 0, r * CELL, ink, paper)
    drawChar(ctx, 127, 31 * CELL, r * CELL, ink, paper)
  }

  drawTextCentered(ctx, 'M I N E F I E L D', 5 * CELL, C.B_CYAN, C.BLACK)
  drawTextCentered(ctx, 'ZX SPECTRUM EDITION', 7 * CELL, C.CYAN, C.BLACK)

  // Separator line
  for (let c = 1; c < COLS - 1; c++) {
    drawChar(ctx, 0x2D, c * CELL, 9 * CELL, C.BLUE, C.BLACK)
  }

  const scores = loadHighScores()
  if (scores.length > 0 && page % 2 === 1) {
    // Page 1: high score table
    drawTextCentered(ctx, 'HIGH SCORES', 10 * CELL, C.B_YELLOW, C.BLACK)
    scores.forEach((e, i) => {
      const line = `${i + 1}. ${e.name}  ${String(e.score).padStart(5, '0')}  LVL:${e.level}`
      drawTextCentered(ctx, line, (11 + i) * CELL, C.WHITE, C.BLACK)
    })
  } else {
    // Page 0: controls
    drawTextCentered(ctx, 'ARROWS = MOVE', 11 * CELL, C.WHITE, C.BLACK)
    drawTextCentered(ctx, 'F = FLAG MINE', 12 * CELL, C.WHITE, C.BLACK)
    drawTextCentered(ctx, 'P = PAUSE', 13 * CELL, C.WHITE, C.BLACK)
    drawTextCentered(ctx, 'CROSS THE FIELD!', 14 * CELL, C.B_GREEN, C.BLACK)
    drawTextCentered(ctx, 'REQUIRES HARDWARE KEYBOARD', 15 * CELL, C.YELLOW, C.BLACK)
  }

  if (blink) {
    drawTextCentered(ctx, 'PRESS ANY KEY', 17 * CELL, C.B_YELLOW, C.BLACK)
  }

  // Copyright-style footer with build + ZX-KIT version (for owner's reference)
  const build = import.meta.env.VITE_APP_BUILD ?? 'DEV'
  const zxKit = import.meta.env.VITE_ZX_KIT_VERSION ?? '?'
  drawTextCentered(ctx, `(C) 2026  RELEASE:${build}`, 20 * CELL, C.BLUE, C.BLACK)
  drawTextCentered(ctx, `ZX-KIT:${zxKit}`, 21 * CELL, C.BLUE, C.BLACK)
}

// ─── Main render entry ────────────────────────────────────────────────────────

export function renderVolumeBar(ctx: CanvasRenderingContext2D, volume: number): void {
  const BAR_CHARS = 10
  const filled = Math.round(volume * BAR_CHARS)
  const filledStr = '\x7f'.repeat(filled)
  const emptyStr = '-'.repeat(BAR_CHARS - filled)
  const label = 'VOL:'
  const totalLen = label.length + BAR_CHARS
  const x = Math.floor((COLS - totalLen) / 2) * CELL
  const y = Math.floor(ROWS / 2) * CELL - CELL
  ctx.fillStyle = C.BLACK
  ctx.fillRect(x - CELL, y - CELL, (totalLen + 2) * CELL, CELL * 3)
  drawText(ctx, label, x, y, C.B_YELLOW, C.BLACK)
  if (filledStr) drawText(ctx, filledStr, x + label.length * CELL, y, C.B_GREEN, C.BLACK)
  if (emptyStr) drawText(ctx, emptyStr, x + (label.length + filled) * CELL, y, C.WHITE, C.BLACK)
}

export function renderFrame(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Clear
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Grid
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      renderCell(ctx, state, col, row)
    }
  }

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
}
