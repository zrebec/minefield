import { COLS, ROWS } from './constants.ts'
import { START_COL, START_ROW, SCORE_PER_CELL, SCORE_MULTIPLIERS, EXPLOSION_FLASH_MS, LEVEL_COMPLETE_DELAY_MS, GEM_SCORE, COMBO_DURATION_MS, COMBO_MAX_MULTIPLIER } from './config.ts'
import { type GameState, countWarningMines, applyClusterBlast, type MineType } from './game.ts'
import type { Direction } from './input.ts'
import { playWarning, playExplosion, playGemCollect, playFootstep, isAmbientSoundActive } from './audio.ts'
import { makeTileVisited, makeTileGround, makeTileMine, makeTileGem, makeTileFlag, TILE_EXPLODED } from './sprites.ts'

function cellVariant(col: number, row: number): 'a' | 'b' {
  return (col + row) % 2 === 0 ? 'a' : 'b'
}

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

  const tile = state.map.getTile(newCol, newRow)
  if (tile === null) return

  if (tile.id === 'mine') {
    const mineType = tile.metadata?.mineType as MineType
    if (mineType === 'cluster') applyClusterBlast(state, newCol, newRow)
    state.map.setTile(newCol, newRow, TILE_EXPLODED)
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
  state.playerWalkFrame = state.playerWalkFrame === 0 ? 1 : 0

  const wasUnvisited = tile.id !== 'visited'
  const hadGem = tile.id === 'gem'

  if (wasUnvisited) {
    state.map.setTile(newCol, newRow, makeTileVisited(cellVariant(newCol, newRow), state.terrain))
    state.comboCount++
    state.comboTimer = COMBO_DURATION_MS
    const levelMult = SCORE_MULTIPLIERS[Math.min(state.level, SCORE_MULTIPLIERS.length - 1)]
    const cMult = comboMultiplier(state.comboCount)
    state.score += Math.round(SCORE_PER_CELL * levelMult * cMult)
  }

  if (hadGem) {
    state.gemsCollected++
    const cMult = comboMultiplier(state.comboCount)
    state.score += Math.round(GEM_SCORE * cMult)
    playGemCollect(state.comboCount)
  }

  const nearby = countWarningMines(state.map, newCol, newRow)
  if (nearby > 0) {
    playWarning(nearby)
  } else if (!hadGem && !isAmbientSoundActive()) {
    playFootstep(state.terrain)
  }
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
  const tile = state.map.getTile(fc, fr)
  if (tile === null) return

  if (tile.id === 'flag') {
    // Unflag: restore what was underneath
    const underneath = tile.metadata?.underneath as string
    const mineType = tile.metadata?.mineType as string | undefined
    const variant = (tile.metadata?.variant as 'a' | 'b') ?? cellVariant(fc, fr)
    if (underneath === 'mine') {
      state.map.setTile(fc, fr, makeTileMine(mineType ?? 'normal', variant, state.terrain))
    } else if (underneath === 'gem') {
      state.map.setTile(fc, fr, makeTileGem())
    } else {
      state.map.setTile(fc, fr, makeTileGround(variant, state.terrain))
    }
  } else if (tile.id === 'ground' || tile.id === 'mine' || tile.id === 'gem') {
    const underneath = tile.id
    const mineType = tile.id === 'mine' ? (tile.metadata?.mineType as string | undefined) : undefined
    const variant = tile.id === 'gem' ? cellVariant(fc, fr) : (tile.metadata?.variant as 'a' | 'b' | undefined) ?? cellVariant(fc, fr)
    state.map.setTile(fc, fr, makeTileFlag(underneath, mineType, variant))
  }
  // 'visited' and 'exploded' cells cannot be flagged
}
