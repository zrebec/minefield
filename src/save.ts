// Minefield save profile — wraps the zx-kit save API with game-specific
// serialization. The map is encoded as one char per cell (see CELL_CODES) so
// the payload is small and human-readable when inspected in DevTools.

import { createSaveProfile, createAnimation, createTileMap, type SaveProfile } from 'zx-kit'
import { COLS, ROWS } from './constants.ts'
import GEM_COUNT, { WALK_FRAME_MS } from './config.ts'
import { type GameState, type Dir } from './game.ts'
import {
  type TerrainType, type CellVariant,
  makeTileGround, makeTileVisited, makeTileMine, makeTileGem,
  makeTileWall, makeTileFlag, TILE_EXPLODED,
} from './sprites.ts'

export interface MinefieldSave {
  terrain: TerrainType
  level: number
  lives: number
  score: number
  playerCol: number
  playerRow: number
  playerDir: Dir
  totalMines: number
  explodedMines: number
  gemsCollected: number
  cycleSteps: number
  isNight: boolean
  comboCount: number
  nextAircraftMs: number
  /** Row-major map encoding; each row is a string of length COLS. */
  map: string[]
}

// ── Cell encoding ───────────────────────────────────────────────────────────

function cellVariant(col: number, row: number): CellVariant {
  return (col + row) % 2 === 0 ? 'a' : 'b'
}

function encodeCell(state: GameState, col: number, row: number): string {
  const tile = state.map.getTile(col, row)
  if (!tile) return '_'
  switch (tile.id) {
    case 'ground': return '.'
    case 'visited': return 'V'
    case 'wall': return 'W'
    case 'gem': return 'G'
    case 'exploded': return 'X'
    case 'mine': {
      const mt = tile.metadata?.mineType as string | undefined
      return mt === 'cluster' ? 'C' : mt === 'beacon' ? 'B' : 'M'
    }
    case 'flag': {
      const underneath = tile.metadata?.underneath as string
      if (underneath === 'gem') return 'g'
      if (underneath === 'mine') {
        const mt = tile.metadata?.mineType as string | undefined
        return mt === 'cluster' ? 'c' : mt === 'beacon' ? 'b' : 'm'
      }
      return 'f' // flag on ground (default)
    }
    default: return '_'
  }
}

function placeFromChar(
  target: GameState,
  col: number,
  row: number,
  ch: string,
): void {
  const variant = cellVariant(col, row)
  const t = target.terrain
  switch (ch) {
    case '.': target.map.setTile(col, row, makeTileGround(variant, t)); return
    case 'V': target.map.setTile(col, row, makeTileVisited(variant, t)); return
    case 'W': target.map.setTile(col, row, makeTileWall()); return
    case 'G': target.map.setTile(col, row, makeTileGem()); return
    case 'X': target.map.setTile(col, row, TILE_EXPLODED); return
    case 'M': target.map.setTile(col, row, makeTileMine('normal', variant, t)); return
    case 'C': target.map.setTile(col, row, makeTileMine('cluster', variant, t)); return
    case 'B': target.map.setTile(col, row, makeTileMine('beacon', variant, t)); return
    case 'f': target.map.setTile(col, row, makeTileFlag('ground', undefined, variant)); return
    case 'm': target.map.setTile(col, row, makeTileFlag('mine', 'normal', variant)); return
    case 'c': target.map.setTile(col, row, makeTileFlag('mine', 'cluster', variant)); return
    case 'b': target.map.setTile(col, row, makeTileFlag('mine', 'beacon', variant)); return
    case 'g': target.map.setTile(col, row, makeTileFlag('gem', undefined, variant)); return
    // '_' or unknown: leave empty
  }
}

// ── Serialize / apply ───────────────────────────────────────────────────────

function serializeState(state: GameState): MinefieldSave {
  const map: string[] = []
  for (let row = 0; row < ROWS; row++) {
    let line = ''
    for (let col = 0; col < COLS; col++) {
      line += encodeCell(state, col, row)
    }
    map.push(line)
  }
  return {
    terrain: state.terrain,
    level: state.level,
    lives: state.lives,
    score: state.score,
    playerCol: state.playerCol,
    playerRow: state.playerRow,
    playerDir: state.playerDir,
    totalMines: state.totalMines,
    explodedMines: state.explodedMines,
    gemsCollected: state.gemsCollected,
    cycleSteps: state.cycleSteps,
    isNight: state.isNight,
    comboCount: state.comboCount,
    nextAircraftMs: state.nextAircraftMs,
    map,
  }
}

function applyToState(target: GameState, data: MinefieldSave): void {
  // Primitives first — terrain must be set before placeFromChar runs
  target.terrain = data.terrain
  target.level = data.level
  target.lives = data.lives
  target.score = data.score
  target.playerCol = data.playerCol
  target.playerRow = data.playerRow
  target.playerDir = data.playerDir
  target.totalMines = data.totalMines
  target.explodedMines = data.explodedMines
  target.gemsCollected = data.gemsCollected
  target.gemsTotal = GEM_COUNT
  target.cycleSteps = data.cycleSteps
  target.isNight = data.isNight
  target.comboCount = data.comboCount
  target.comboTimer = 0
  target.nextAircraftMs = data.nextAircraftMs

  // Replace map wholesale
  const fresh = createTileMap(COLS, ROWS)
  target.map = fresh
  for (let row = 0; row < ROWS; row++) {
    const line = data.map[row] ?? ''
    for (let col = 0; col < COLS; col++) {
      placeFromChar(target, col, row, line[col] ?? '_')
    }
  }

  // Transient state — resume in idle so player has a beat to orient
  target.phase = 'playing'
  target.runState = 'idle'
  target.walkTween = null
  target.walkAnim = createAnimation(2, WALK_FRAME_MS, { loop: true })
  target.bufferedDir = null
  target.airplane = null
  target.droppedMines = []
  target.dropFlashTimer = 0
  target.flashTimer = 0
  target.flashOn = false
  target.debugMode = false
  target.levelCompleteTimer = 0
  target.blink = true
  target.blinkTimer = 500
}

// ── Profile (singleton) ─────────────────────────────────────────────────────

let getCurrentState: () => GameState = () => {
  throw new Error('save: state getter not registered — call setStateGetter() first')
}

export function setStateGetter(getter: () => GameState): void {
  getCurrentState = getter
}

export const saveProfile: SaveProfile<MinefieldSave> = createSaveProfile<MinefieldSave>({
  key: 'minefield',
  version: 1,
  serialize: () => serializeState(getCurrentState()),
  deserialize: (data) => applyToState(getCurrentState(), data),
  // No migrate needed for v1 — add when the shape changes.
})
