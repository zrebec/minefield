import { COLS, ROWS } from './constants.ts'
import { START_COL, START_ROW, SCORE_PER_CELL, SCORE_MULTIPLIERS, EXPLOSION_FLASH_MS, LEVEL_COMPLETE_DELAY_MS, GEM_SCORE, COMBO_DURATION_MS, COMBO_MAX_MULTIPLIER } from './config.ts'
import { type GameState, countWarningMines, applyClusterBlast } from './game.ts'
import type { Direction } from './input.ts'
import { playWarning, playExplosion, playGemCollect } from './audio.ts'

function comboMultiplier(comboCount: number): number {
  return Math.min(1 + (comboCount - 1) * 0.1, COMBO_MAX_MULTIPLIER)
}

export function movePlayer(state: GameState, dir: Direction): void {
  if (state.phase !== 'playing') return

  state.playerDir = dir
  const newCol = state.playerCol + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0)
  const newRow = state.playerRow + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0)

  if (newCol >= COLS) {
    state.phase = 'levelcomplete'
    state.levelCompleteTimer = LEVEL_COMPLETE_DELAY_MS
    return
  }

  if (newCol < 0 || newRow < 0 || newRow >= ROWS) return

  const cell = state.grid[newRow][newCol]

  if (cell.hasMine && !cell.exploded) {
    if (cell.mineType === 'cluster') applyClusterBlast(state, newCol, newRow)
    cell.exploded = true
    cell.hasMine = false
    state.explodedMines++
    state.playerCol = newCol
    state.playerRow = newRow
    state.phase = 'exploding'
    state.flashTimer = EXPLOSION_FLASH_MS
    state.flashOn = true
    playExplosion()
    return
  }

  state.playerCol = newCol
  state.playerRow = newRow

  if (!cell.visited) {
    cell.visited = true
    state.comboCount++
    state.comboTimer = COMBO_DURATION_MS
    const levelMult = SCORE_MULTIPLIERS[Math.min(state.level, SCORE_MULTIPLIERS.length - 1)]
    const cMult = comboMultiplier(state.comboCount)
    state.score += Math.round(SCORE_PER_CELL * levelMult * cMult)
  }

  if (cell.hasGem) {
    cell.hasGem = false
    state.gemsCollected++
    const cMult = comboMultiplier(state.comboCount)
    state.score += Math.round(GEM_SCORE * cMult)
    playGemCollect(state.comboCount)
  }

  const nearby = countWarningMines(state.grid, newCol, newRow)
  playWarning(nearby)
}

export function respawnPlayer(state: GameState): void {
  state.lives--
  state.playerCol = START_COL
  state.playerRow = START_ROW
  state.playerDir = 'right'
  state.phase = state.lives <= 0 ? 'gameover' : 'playing'
}

// Flag the cell directly in front of the player (in the direction they're facing)
export function toggleFlag(state: GameState): void {
  if (state.phase !== 'playing') return
  const dc = state.playerDir === 'right' ? 1 : state.playerDir === 'left' ? -1 : 0
  const dr = state.playerDir === 'down' ? 1 : state.playerDir === 'up' ? -1 : 0
  const fc = state.playerCol + dc
  const fr = state.playerRow + dr
  if (fc < 0 || fc >= COLS || fr < 0 || fr >= ROWS) return
  const cell = state.grid[fr][fc]
  if (!cell.visited) {
    cell.flagged = !cell.flagged
  }
}
