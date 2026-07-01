// Minefield save profile — wraps the zx-kit save API with game-specific
// serialization. The map is encoded as one char per cell (see CELL_CODES) so
// the payload is small and human-readable when inspected in DevTools.

import { createSaveProfile, createAnimation, createTileMap, type TileMap, type SaveProfile } from 'zx-kit'
import { COLS, ROWS } from './constants.ts'
import { GEM_COUNT, START_ROW, WALK_FRAME_MS, TIMER_BASE_MS, BLINK_INTERVAL_MS } from './config.ts'
import { type GameState, type Dir, gemColor } from './game.ts'
import {
  type TerrainType, type CellVariant, type BuildingPart,
  makeTileGround, makeTileVisited, makeTileMine, makeTileGem,
  makeTileBuilding, flagTile, makeTileFence, TILE_EXPLODED,
} from './sprites.ts'

// Building parts ↔ save chars (none collide with the mine/flag/terrain codes below).
// Roof shade is a pure function of position, so 'roof' stores one char and the
// variant is recomputed on load (makeTileBuilding(part, col, row)).
const BUILDING_PART_CHAR: Record<BuildingPart, string> = {
  roof: 'R', eave: 'E', brick: 'H', side: 'S', window: 'N', concrete: 'F', chimney: 'Y',
}
const CHAR_BUILDING_PART: Record<string, BuildingPart> = {
  R: 'roof', E: 'eave', H: 'brick', S: 'side', N: 'window', F: 'concrete', Y: 'chimney',
}

// Gem kind ↔ save char (digits, unused elsewhere). Ground gems 1-4, flagged
// gems 5-8. Legacy 'G'/'g' (pre-colour saves) still decode as plain cyan.
const GEM_GROUND_CHAR: Record<string, string> = { red: '1', cyan: '2', gold: '3', green: '4' }
const CHAR_GEM_GROUND: Record<string, string> = { '1': 'red', '2': 'cyan', '3': 'gold', '4': 'green' }
const GEM_FLAG_CHAR: Record<string, string> = { red: '5', cyan: '6', gold: '7', green: '8' }
const CHAR_GEM_FLAG: Record<string, string> = { '5': 'red', '6': 'cyan', '7': 'gold', '8': 'green' }

export interface MinefieldSave {
  terrain: TerrainType
  level: number
  lives: number
  score: number
  playerCol: number
  playerRow: number
  playerDir: Dir
  /** Seeded spawn row / respawn target. Optional: saves written before this
   *  feature lack it and default to the old fixed START_ROW (exactly where
   *  those games spawned), so they stay loadable without a version bump. */
  startRow?: number
  /** Seeded exit-hole row in the right fence. Optional: older saves derive it from
   *  the map (the single non-solid cell in the last column). */
  exitRow?: number
  totalMines: number
  explodedMines: number
  gemsCollected: number
  /** Cumulative backpack (gem id → count). Optional: older saves restore empty. */
  inventory?: Record<string, number>
  /** Mines revealed by the cyan-gem reward this level. Optional: older saves []. */
  revealedMines?: Array<{ col: number; row: number }>
  /** Per-level countdown remaining (ms). Optional: saves written before the timer
   *  lack it and resume at the full base budget (generous, never broken). */
  timeLeftMs?: number
  cycleSteps: number
  isNight: boolean
  comboCount: number
  nextAircraftMs: number
  /** Seeded airplane pass counter — drives the `:pass`/`:drop`/`:next` seeds.
   *  Optional: saves written before it was persisted resume at 0 (old behaviour). */
  airplanePassIndex?: number
  /** Debug mine-reveal budget already spent this level (see RANDOM_REVEAL_LIMIT
   *  in config.ts). Optional: saves written before it was persisted resume at 0
   *  — a one-time free reveal on old saves, not worth a migration for. */
  revealsUsed?: number
  /** Field seed base: a string for daily runs, null for a random (R-rerolled)
   *  run. Persisted so a resumed random run stays random (and off the
   *  leaderboard). Optional: older saves lack it and resume as daily. */
  dropSeedBase?: string | null
  /** Row-major map encoding; each row is a string of length COLS. */
  map: string[]
}

// ── Cell encoding ───────────────────────────────────────────────────────────

function cellVariant(col: number, row: number): CellVariant {
  return (col + row) % 2 === 0 ? 'a' : 'b'
}

// The exit hole is the single non-solid cell in the last column. Fallback for any
// (older / hand-edited) save that lacks an explicit exitRow.
function deriveExitRow(map: TileMap): number {
  for (let row = 0; row < ROWS; row++) {
    const t = map.getTile(COLS - 1, row)
    if (t && !t.solid) return row
  }
  return START_ROW
}

function encodeCell(state: GameState, col: number, row: number): string {
  const tile = state.map.getTile(col, row)
  if (!tile) return '_'
  const flagged = tile.metadata?.flagged === true
  switch (tile.id) {
    case 'ground': return flagged ? 'f' : '.'
    case 'visited': return 'V'
    case 'fence': return '#'
    case 'building': return BUILDING_PART_CHAR[tile.metadata?.part as BuildingPart] ?? '_'
    case 'gem': {
      const kind = (tile.metadata?.gemKind as string) ?? 'cyan'
      return flagged ? (GEM_FLAG_CHAR[kind] ?? '6') : (GEM_GROUND_CHAR[kind] ?? '2')
    }
    case 'exploded': return 'X'
    case 'mine': {
      const mt = tile.metadata?.mineType as string | undefined
      if (flagged) return mt === 'cluster' ? 'c' : mt === 'beacon' ? 'b' : 'm'
      return mt === 'cluster' ? 'C' : mt === 'beacon' ? 'B' : 'M'
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
  const part = CHAR_BUILDING_PART[ch]
  if (part) { target.map.setTile(col, row, makeTileBuilding(part, col, row)); return }
  const gemGround = CHAR_GEM_GROUND[ch]
  if (gemGround) { target.map.setTile(col, row, makeTileGem(gemGround, gemColor(gemGround))); return }
  const gemFlag = CHAR_GEM_FLAG[ch]
  if (gemFlag) { target.map.setTile(col, row, flagTile(makeTileGem(gemFlag, gemColor(gemFlag)))); return }
  switch (ch) {
    case '.': target.map.setTile(col, row, makeTileGround(variant, t)); return
    case '#': target.map.setTile(col, row, makeTileFence()); return
    case 'V': target.map.setTile(col, row, makeTileVisited(variant, t)); return
    case 'G': target.map.setTile(col, row, makeTileGem()); return
    case 'X': target.map.setTile(col, row, TILE_EXPLODED); return
    case 'M': target.map.setTile(col, row, makeTileMine('normal', variant, t)); return
    case 'C': target.map.setTile(col, row, makeTileMine('cluster', variant, t)); return
    case 'B': target.map.setTile(col, row, makeTileMine('beacon', variant, t)); return
    case 'f': target.map.setTile(col, row, flagTile(makeTileGround(variant, t))); return
    case 'm': target.map.setTile(col, row, flagTile(makeTileMine('normal', variant, t))); return
    case 'c': target.map.setTile(col, row, flagTile(makeTileMine('cluster', variant, t))); return
    case 'b': target.map.setTile(col, row, flagTile(makeTileMine('beacon', variant, t))); return
    case 'g': target.map.setTile(col, row, flagTile(makeTileGem())); return
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
    startRow: state.startRow,
    exitRow: state.exitRow,
    totalMines: state.totalMines,
    explodedMines: state.explodedMines,
    gemsCollected: state.gemsCollected,
    inventory: state.inventory,
    revealedMines: state.revealedMines,
    timeLeftMs: state.timeLeftMs,
    cycleSteps: state.cycleSteps,
    isNight: state.isNight,
    comboCount: state.comboCount,
    nextAircraftMs: state.nextAircraftMs,
    airplanePassIndex: state.airplanePassIndex,
    revealsUsed: state.revealsUsed,
    dropSeedBase: state.dropSeedBase,
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
  target.startRow = data.startRow ?? START_ROW
  target.totalMines = data.totalMines
  target.explodedMines = data.explodedMines
  target.gemsCollected = data.gemsCollected
  target.inventory = data.inventory ?? {}
  target.revealedMines = data.revealedMines ?? []
  target.timeLeftMs = data.timeLeftMs ?? TIMER_BASE_MS  // pre-timer saves resume at full base
  target.gemsTotal = GEM_COUNT
  target.cycleSteps = data.cycleSteps
  target.isNight = data.isNight
  // Combo is a short-term "hot hand" streak, not resume-worthy state — reload
  // clears it outright (comboCount AND comboTimer together), same as death
  // already does. Previously only comboTimer was zeroed while comboCount
  // survived from the save; since the auto-expiry check in main.ts only runs
  // when comboTimer > 0, that stale comboCount silently outlived a reload and
  // applied its score multiplier to the player's next step.
  target.comboCount = 0
  target.comboTimer = 0
  target.nextAircraftMs = data.nextAircraftMs
  target.airplanePassIndex = data.airplanePassIndex ?? 0
  // null is meaningful (random run) so check presence, not truthiness; absent in
  // older saves → keep the daily seed the fresh game was created with.
  if (data.dropSeedBase !== undefined) target.dropSeedBase = data.dropSeedBase

  // Replace map wholesale
  const fresh = createTileMap(COLS, ROWS)
  target.map = fresh
  for (let row = 0; row < ROWS; row++) {
    const line = data.map[row] ?? ''
    for (let col = 0; col < COLS; col++) {
      placeFromChar(target, col, row, line[col] ?? '_')
    }
  }
  // Exit-hole row: explicit when present, else derived from the loaded fence.
  target.exitRow = data.exitRow ?? deriveExitRow(target.map)

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
  // Persisted (older saves without it resume with a one-time free reveal —
  // harmless, not worth a migration): previously always reset to 0, letting
  // a save→reload cycle repeatedly bypass RANDOM_REVEAL_LIMIT.
  target.revealsUsed = data.revealsUsed ?? 0
  target.levelCompleteTimer = 0
  target.blink = true
  target.blinkTimer = BLINK_INTERVAL_MS
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
  // v2: terrain encoding gained high-angle buildings (parts R/E/H/S/N/F/Y) and
  // dropped the old linear-wall code 'W'.
  // v3: playfield shrank 22→21 rows. A v2 map has one extra row, so loading it
  // into a 21-row world would misalign every cell — no migrate, old saves are
  // cleanly rejected (version_unsupported) rather than loaded half-broken.
  // v4: HUD grew to 6 rows, so the playfield shrank 21→18. Same reasoning — a v3
  // map has 3 extra rows and can't be realigned, so v3 saves are cleanly rejected.
  // v5: perimeter fence (left/right walls + one entry hole and one exit hole). A v4
  // map has open edge columns and no exit hole, so its semantics no longer match —
  // cleanly rejected (version_unsupported); the game then falls back to the title.
  version: 5,
  serialize: () => serializeState(getCurrentState()),
  deserialize: (data) => applyToState(getCurrentState(), data),
  // No migrate needed for v1 — add when the shape changes.
})
