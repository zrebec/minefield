import { createTileMap, createAnimation, createRng, type TileMap, type Tween, type Animation, type Rng } from 'zx-kit'
import { COLS, ROWS } from './constants.ts'
import GEM_COUNT, { START_COL, START_ROW, SAFE_RADIUS, LEVEL_CONFIGS, BEACON_MINE_LEVEL, BEACON_MINE_RATIO, CLUSTER_MINE_LEVEL, CLUSTER_MINE_RATIO, DAY_STEPS, WALK_FRAME_MS } from './config.ts'
import {
  makeTileGround, makeTileMine, makeTileGem, makeTileVisited, TILE_EXPLODED,
  type CellVariant, type TerrainType,
} from './sprites.ts'
import { placeBuildings } from './buildings.ts'

const TERRAIN_TYPES: TerrainType[] = ['grass', 'snow', 'dust']

/**
 * Today's date as `YYYY-MM-DD` (local time). The daily-challenge field is seeded from
 * this, so every player on the same day gets the **same minefield** → comparable scores
 * (Wordle-style). We embrace this even though the ZX Spectrum had no such thing — we only
 * limit ourselves by the era's *visuals*, not its technical constraints.
 */
export function todaySeed(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Per-level daily seed: same date + level ⇒ an identical field for every player. */
export function dailySeed(level: number): string {
  return `${todaySeed()}:L${level}`
}

export type GamePhase = 'intro' | 'playing' | 'exploding' | 'levelcomplete' | 'gameover'
export type RunState = 'idle' | 'running' | 'paused'
export type Dir = 'up' | 'down' | 'left' | 'right'
export type MineType = 'normal' | 'cluster' | 'beacon'

export interface AirplaneState {
  x: number
  y: number
  dir: 1 | -1
  active: boolean
  dropDone: boolean
  warningBlink: boolean
  scheduledDropCount: number
}

export interface GameState {
  phase: GamePhase
  map: TileMap
  terrain: TerrainType
  level: number
  lives: number
  score: number
  playerCol: number
  playerRow: number
  playerDir: Dir
  walkTween: Tween | null
  walkAnim: Animation
  bufferedDir: Dir | null
  flashTimer: number
  flashOn: boolean
  debugMode: boolean
  airplane: AirplaneState | null
  nextAircraftMs: number
  blink: boolean
  blinkTimer: number
  totalMines: number
  explodedMines: number
  levelCompleteTimer: number
  comboCount: number
  comboTimer: number
  gemsTotal: number
  gemsCollected: number
  droppedMines: Array<{ col: number; row: number }>
  dropFlashTimer: number
  runState: RunState
  isNight: boolean
  cycleSteps: number
  dropSeedBase: string | null
  airplanePassIndex: number
}

function cellVariant(col: number, row: number): CellVariant {
  return (col + row) % 2 === 0 ? 'a' : 'b'
}

function buildMap(terrain: TerrainType): TileMap {
  const map = createTileMap(COLS, ROWS)
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      map.setTile(col, row, makeTileGround(cellVariant(col, row), terrain))
    }
  }
  return map
}

// Inclusive-max integer, drawn from a seeded RNG so the field is reproducible per seed.
function randomInt(rng: Rng, min: number, max: number): number {
  return rng.range(min, max + 1)
}

function placeMines(map: TileMap, count: number, safeCol: number, safeRow: number, level: number, terrain: TerrainType, rng: Rng): void {
  const clusterRatio = level >= CLUSTER_MINE_LEVEL ? CLUSTER_MINE_RATIO : 0
  const beaconRatio = level >= BEACON_MINE_LEVEL ? BEACON_MINE_RATIO : 0
  let placed = 0
  let attempts = 0
  while (placed < count && attempts < count * 20) {
    attempts++
    const col = randomInt(rng, 0, COLS - 1)
    const row = randomInt(rng, 0, ROWS - 1)
    if (Math.abs(col - safeCol) <= SAFE_RADIUS && Math.abs(row - safeRow) <= SAFE_RADIUS) continue
    if (col === COLS - 1) continue
    if (map.getTile(col, row)?.id !== 'ground') continue
    const r = rng.next()
    const mineType: MineType = r < clusterRatio ? 'cluster'
      : r < clusterRatio + beaconRatio ? 'beacon'
        : 'normal'
    map.setTile(col, row, makeTileMine(mineType, cellVariant(col, row), terrain))
    placed++
  }
}

// Prevent the "obstacle ahead + mine on each side" trap (forced step onto a mine)
// around any solid obstacle perimeter. For every walkable approach cell flanked
// by mines on both perpendicular sides, relocate one flank mine back to ground.
//
// Runs to a FIXED POINT: relocating a mine can turn a previously-deadly "mine
// approach" (which the player would die on before ever facing the obstacle) into
// a fresh walkable trap one tile over. A single pass can miss that cascade on a
// dense building perimeter, so we repeat until a full pass changes nothing.
// Termination is guaranteed — every change removes exactly one mine.
export function fixObstacleTraps(map: TileMap, terrain: TerrainType): void {
  let changed = true
  while (changed) {
    changed = false
    for (const { x, y } of map.findById('building')) {
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ac = x + dc, ar = y + dr
        const approach = map.getTile(ac, ar)
        // Walkable = on the map, not solid, not a mine (a mine approach kills the
        // player first, so it isn't a trap). Matches the invariant we assert.
        if (!approach || approach.solid || approach.id === 'mine') continue
        const perpDirs = dc === 0 ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]]
        const perps: Array<[number, number]> = perpDirs.map(([pdc, pdr]) => [ac + pdc, ar + pdr])
        if (perps.every(([pc, pr]) => map.getTile(pc, pr)?.id === 'mine')) {
          const [pc, pr] = perps[0]
          map.setTile(pc, pr, makeTileGround(cellVariant(pc, pr), terrain))
          changed = true
        }
      }
    }
  }
}

function placeGems(map: TileMap, count: number, safeCol: number, safeRow: number, rng: Rng): void {
  let placed = 0
  let attempts = 0
  while (placed < count && attempts < count * 20) {
    attempts++
    const col = randomInt(rng, 2, COLS - 2)
    const row = randomInt(rng, 0, ROWS - 1)
    const tile = map.getTile(col, row)
    if (tile?.id !== 'ground') continue
    if (Math.abs(col - safeCol) <= SAFE_RADIUS + 2 && Math.abs(row - safeRow) <= SAFE_RADIUS + 2) continue
    map.setTile(col, row, makeTileGem())
    placed++
  }
}

export function countWarningMines(map: TileMap, col: number, row: number): number {
  let count = 0
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    if (map.getTile(col + dc, row + dr)?.id === 'mine') count++
  }
  for (const [dr, dc] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
    const tile = map.getTile(col + dc, row + dr)
    if (tile?.id === 'mine' && tile.metadata?.mineType === 'beacon') count++
  }
  return Math.min(count, 8)
}

export function applyClusterBlast(state: GameState, centerCol: number, centerRow: number): void {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const cc = centerCol + dc
      const cr = centerRow + dr
      const tile = state.map.getTile(cc, cr)
      if (tile === null) continue
      if (tile.id === 'mine') {
        state.map.setTile(cc, cr, TILE_EXPLODED)
        state.explodedMines++
      } else if (tile.id === 'ground' || tile.id === 'gem') {
        state.map.setTile(cc, cr, makeTileVisited(cellVariant(cc, cr), state.terrain))
      }
    }
  }
}

/** A fresh 32-bit integer seed for `createRng`. `Math.random()` alone (a float in
 *  [0,1)) is truncated to 0 by createRng's `seed >>> 0`, so every game would share
 *  one seed (identical terrain/mines/drops). This spreads it across the full uint32. */
function randomSeed(): number {
  return (Math.random() * 0x100000000) >>> 0
}

export function createGame(level = 0, initialScore = 0, seed?: string | number): GameState {
  const cfg = LEVEL_CONFIGS[Math.min(level, LEVEL_CONFIGS.length - 1)]
  // Field generation is seeded: pass a `seed` (e.g. dailySeed(level)) for a reproducible
  // daily field; omit it (tests / free play) to get a fresh field each call.
  const rng = createRng(seed ?? randomSeed())
  // Level 0 is always grass so the player learns the default look first
  const terrain: TerrainType = level === 0
    ? 'grass'
    : rng.pick(TERRAIN_TYPES)
  const map = buildMap(terrain)
  placeBuildings(map, level, rng)
  placeMines(map, cfg.mines, START_COL, START_ROW, level, terrain, rng)
  placeGems(map, GEM_COUNT, START_COL, START_ROW, rng)
  map.setTile(START_COL, START_ROW, makeTileVisited(cellVariant(START_COL, START_ROW), terrain))
  // De-trap LAST, on the final board (gems are walkable too), to a fixed point.
  fixObstacleTraps(map, terrain)

  const firstAcMs = rng.float(cfg.acFirstMs, cfg.acFirstMaxMs)

  return {
    phase: 'playing',
    map,
    terrain,
    level,
    lives: cfg.lives,
    score: initialScore,
    playerCol: START_COL,
    playerRow: START_ROW,
    playerDir: 'right',
    walkTween: null,
    walkAnim: createAnimation(2, WALK_FRAME_MS, { loop: true }),
    bufferedDir: null,
    flashTimer: 0,
    flashOn: false,
    debugMode: false,
    airplane: null,
    nextAircraftMs: firstAcMs,
    blink: true,
    blinkTimer: 500,
    totalMines: map.findById('mine').length,
    explodedMines: 0,
    levelCompleteTimer: 0,
    comboCount: 0,
    comboTimer: 0,
    gemsTotal: GEM_COUNT,
    gemsCollected: 0,
    droppedMines: [],
    dropFlashTimer: 0,
    runState: 'idle',
    isNight: false,
    cycleSteps: DAY_STEPS,
    dropSeedBase: seed !== undefined ? String(seed) : null,
    airplanePassIndex: 0,
  }
}

export function addDropMinesInBand(state: GameState, count: number, minRow: number, maxRow: number): void {
  const dropSeed = state.dropSeedBase !== null
    ? `${state.dropSeedBase}:drop${state.airplanePassIndex}`
    : randomSeed()
  const rng = createRng(dropSeed)
  // airplanePassIndex incremented in scheduleNext after the full pass is done
  const dropped: Array<{ col: number; row: number }> = []
  let attempts = 0
  while (dropped.length < count && attempts < count * 20) {
    attempts++
    const col = randomInt(rng, 0, COLS - 2)
    const row = randomInt(rng, minRow, maxRow)
    const tile = state.map.getTile(col, row)
    if (tile?.id !== 'ground') continue
    state.map.setTile(col, row, makeTileMine('normal', cellVariant(col, row), state.terrain))
    state.totalMines++
    dropped.push({ col, row })
  }
  state.droppedMines = dropped
  state.dropFlashTimer = 500
}
