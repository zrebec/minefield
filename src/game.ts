import { createTileMap, createAnimation, createRng, type TileMap, type Tween, type Animation, type Rng } from 'zx-kit'
import { COLS, ROWS, C, type SpectrumColor } from './constants.ts'
import { GEM_COUNT, START_COL, SAFE_RADIUS, MIN_ENTRY_EXIT_ROW_GAP, DAILY_REVEAL_LIMIT, RANDOM_REVEAL_LIMIT, LEVEL_CONFIGS, type LevelConfig, BEACON_MINE_LEVEL, BEACON_MINE_RATIO, CLUSTER_MINE_LEVEL, CLUSTER_MINE_RATIO, DAY_STEPS, WALK_FRAME_MS, TIMER_BASE_MS, BLINK_INTERVAL_MS, DROP_FLASH_MS, MAX_FIELD_ATTEMPTS, atLevel } from './config.ts'
import {
  makeTileGround, makeTileMine, makeTileGem, makeTileVisited, makeTileFence, TILE_EXPLODED,
  type CellVariant, type TerrainType,
} from './sprites.ts'
import { placeBuildings } from './buildings.ts'

const TERRAIN_TYPES: TerrainType[] = ['grass', 'snow', 'dust']

// ── Collectible gems ──────────────────────────────────────────────────────────
// Data-driven: add a colour by dropping another entry here. `weight` is the
// field share (≈ percent; summed and normalised), `color` is the shared GEM
// sprite's ink on the field AND in the HUD inventory. Lives here (not config)
// because per-level distributions may diverge later — make it a function of
// level when that lands.
export interface GemKind {
  id: string
  color: SpectrumColor
  weight: number
}
export const GEM_KINDS: readonly GemKind[] = [
  { id: 'red',   color: C.RED,    weight: 20 },
  { id: 'cyan',  color: C.CYAN,   weight: 50 },
  { id: 'gold',  color: C.YELLOW, weight: 10 },
  { id: 'green', color: C.GREEN,  weight: 20 },
]

// The HUD inventory draws one sprite per held gem along the top row, so the
// backpack caps at the row width — a 33rd item simply isn't picked up.
export const INVENTORY_CAP = COLS

export function gemColor(id: string): SpectrumColor {
  return (GEM_KINDS.find((k) => k.id === id) ?? GEM_KINDS[0]).color
}

export function inventoryTotal(inv: Record<string, number>): number {
  let n = 0
  for (const id in inv) n += inv[id]
  return n
}

// Exact-quota colour assignment (largest remainder; ties → array order).
// 12 gems · 20/50/10/20 → 3 red / 6 cyan / 1 gold / 2 green.
function gemKindSequence(total: number, kinds: readonly GemKind[]): string[] {
  const weightSum = kinds.reduce((s, k) => s + k.weight, 0)
  const exact = kinds.map((k) => (total * k.weight) / weightSum)
  const counts = exact.map(Math.floor)
  let used = counts.reduce((a, b) => a + b, 0)
  const byFraction = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (let k = 0; used < total; k++, used++) counts[byFraction[k % byFraction.length].i]++
  const seq: string[] = []
  kinds.forEach((k, i) => { for (let n = 0; n < counts[i]; n++) seq.push(k.id) })
  return seq
}

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

/**
 * The `YYYY-MM-DD` date a seed belongs to — the prefix of a daily seed
 * (`"2026-06-24:L3"` → `"2026-06-24"`). `null` for a random run (`dropSeedBase === null`)
 * or any non-dated seed. Lets a daily run keep its **origin** date across levels and
 * reloads (so its highscore is dated by the field actually played, not wall-clock).
 */
export function seedDate(seed: string | null): string | null {
  if (seed === null) return null
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(seed)
  return m ? m[1] : null
}

/**
 * The seed for the next level of a run, keeping a daily run on its **origin** date
 * (not today's) so a multi-day / resumed daily stays one coherent challenge.
 * `undefined` for a random run (`currentSeed === null`) — random rerolls fresh.
 */
export function nextDailySeed(currentSeed: string | null, nextLevel: number): string | undefined {
  if (currentSeed === null) return undefined
  return `${seedDate(currentSeed) ?? todaySeed()}:L${nextLevel}`
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
  /** Seeded vertical spawn row (0..ROWS-1); also the respawn target. Doubles as
   *  the entry-hole row in the left perimeter fence. */
  startRow: number
  /** Seeded exit-hole row in the right perimeter fence (0..ROWS-1); the only row
   *  where the player can cross the right edge to win. Kept ≥ MIN_ENTRY_EXIT_ROW_GAP
   *  away from startRow. */
  exitRow: number
  playerDir: Dir
  walkTween: Tween | null
  walkAnim: Animation
  bufferedDir: Dir | null
  flashTimer: number
  flashOn: boolean
  debugMode: boolean
  /** How many times the `D` mine-reveal has been turned ON this level (budget gate;
   *  daily = 0, random = RANDOM_REVEAL_LIMIT). Reset per level by createGame. */
  revealsUsed: number
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
  /** Cumulative backpack: gem id → count. Persists across levels, capped at
   *  INVENTORY_CAP, drawn 1:1 in the HUD top row. */
  inventory: Record<string, number>
  /** Mines permanently revealed by the cyan-gem reward, this level only. */
  revealedMines: Array<{ col: number; row: number }>
  droppedMines: Array<{ col: number; row: number }>
  dropFlashTimer: number
  runState: RunState
  isNight: boolean
  cycleSteps: number
  dropSeedBase: string | null
  airplanePassIndex: number
  /** Per-level countdown budget in ms. Ticks only while running; 0 → game over. */
  timeLeftMs: number
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

function placeMines(map: TileMap, count: number, safeCol: number, safeRow: number, exitRow: number, level: number, terrain: TerrainType, rng: Rng): void {
  const clusterRatio = level >= CLUSTER_MINE_LEVEL ? CLUSTER_MINE_RATIO : 0
  const beaconRatio = level >= BEACON_MINE_LEVEL ? BEACON_MINE_RATIO : 0
  let placed = 0
  let attempts = 0
  while (placed < count && attempts < count * 20) {
    attempts++
    const col = randomInt(rng, 0, COLS - 1)
    const row = randomInt(rng, 0, ROWS - 1)
    // Perimeter fence columns are stamped solid later — never spend a mine there.
    if (col === 0 || col === COLS - 1) continue
    // Entry safe zone (around the spawn / entry hole).
    if (Math.abs(col - safeCol) <= SAFE_RADIUS && Math.abs(row - safeRow) <= SAFE_RADIUS) continue
    // Exit safe zone (around the exit hole) — mirror of the entry guarantee, so the
    // approach to the exit can never be a forced mine. This is the canonical rule:
    // skip the attempt without counting it (count stays exact, field stays seeded).
    if (Math.abs(col - (COLS - 1)) <= SAFE_RADIUS && Math.abs(row - exitRow) <= SAFE_RADIUS) continue
    if (map.getTile(col, row)?.id !== 'ground') continue
    const r = rng.next()
    const mineType: MineType = r < clusterRatio ? 'cluster'
      : r < clusterRatio + beaconRatio ? 'beacon'
        : 'normal'
    map.setTile(col, row, makeTileMine(mineType, cellVariant(col, row), terrain))
    placed++
  }
}

// Single source of truth for the SHAPE of the "obstacle ahead + mine on each
// side" trap (forced step onto a mine): given a candidate approach cell and
// which axis its two flanking cells lie on, returns those flank coordinates
// ONLY if the approach itself qualifies as a trap SITE — walkable, and
// adjacent to a solid obstacle on the OTHER axis. Returns null otherwise.
// Deliberately does NOT decide whether the flanks are actually mines — that
// evaluation differs by caller (see below) and mixing it in here caused a
// real bug: an earlier version checked both flanks against the live map,
// which broke createsObstacleTrap for a flank that's still hypothetical (not
// yet placed on the map). Both fixObstacleTraps (scanning forward from every
// obstacle at generation time) and createsObstacleTrap (checking backward
// from one candidate cell, for airplane drops) call this for the geometry —
// a change to what counts as a trap SITE can't update one and silently miss
// the other, which is exactly how the flag/id bug happened.
function obstacleTrapSite(
  map: TileMap, ac: number, ar: number, flankAxis: 'horizontal' | 'vertical',
): [[number, number], [number, number]] | null {
  const approach = map.getTile(ac, ar)
  // Walkable = on the map, not solid, not a mine (a mine approach kills the
  // player first, so it isn't a trap). Matches the invariant we assert.
  if (!approach || approach.solid || approach.id === 'mine') return null
  const obstacleAxis = flankAxis === 'horizontal' ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0]]
  const hasObstacle = obstacleAxis.some(([odc, odr]) => map.getTile(ac + odc, ar + odr)?.solid)
  if (!hasObstacle) return null
  const flankDirs = flankAxis === 'horizontal' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]]
  return flankDirs.map(([fdc, fdr]) => [ac + fdc, ar + fdr]) as [[number, number], [number, number]]
}

// Prevent the trap around any solid obstacle perimeter: for every walkable
// approach cell flanked by mines on both perpendicular sides, relocate one
// flank mine back to ground.
//
// Runs to a FIXED POINT: relocating a mine can turn a previously-deadly "mine
// approach" (which the player would die on before ever facing the obstacle) into
// a fresh walkable trap one tile over. A single pass can miss that cascade on a
// dense building perimeter, so we repeat until a full pass changes nothing.
// Termination is guaranteed — every change removes exactly one mine.
export function fixObstacleTraps(map: TileMap, terrain: TerrainType): void {
  // Every solid obstacle — buildings AND the perimeter fence — can form the
  // trap. The obstacle set never changes here (we only relocate mines to
  // ground), so compute it once.
  const obstacles = [...map.findById('building'), ...map.findById('fence')]
  let changed = true
  while (changed) {
    changed = false
    for (const { x, y } of obstacles) {
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ac = x + dc, ar = y + dr
        const flankAxis = dc === 0 ? 'horizontal' : 'vertical'
        const flanks = obstacleTrapSite(map, ac, ar, flankAxis)
        // Both flanks must be real mines on the live map — no hypotheticals here.
        if (flanks && flanks.every(([fc, fr]) => map.getTile(fc, fr)?.id === 'mine')) {
          const [pc, pr] = flanks[0]
          map.setTile(pc, pr, makeTileGround(cellVariant(pc, pr), terrain))
          changed = true
        }
      }
    }
  }
}

// Would a mine at (col,row) complete an obstacle-flanking trap? `col,row`
// is treated as a HYPOTHETICAL mine — it does not need to already be on the
// map (the caller may check this before committing the placement, or after;
// either works, since only the OTHER flank is read from the live map).
// Checked outward from this one candidate cell (cheap enough to call once
// per airplane-drop attempt) instead of scanning every obstacle.
// fixObstacleTraps only runs at generation time; without this, airplane
// drops could silently recreate the exact trap generation is built to
// eliminate.
export function createsObstacleTrap(map: TileMap, col: number, row: number): boolean {
  for (const [ddc, ddr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    // (col,row) as a flank of approach ⇒ approach = (col,row) − (ddc,ddr).
    const ac = col - ddc, ar = row - ddr
    const flankAxis = ddr === 0 ? 'horizontal' : 'vertical'
    const flanks = obstacleTrapSite(map, ac, ar, flankAxis)
    if (!flanks) continue
    // The other flank — the one that ISN'T our candidate — must be a real
    // mine on the live map for this to be a live trap.
    const [otherCol, otherRow] = flanks[0][0] === col && flanks[0][1] === row ? flanks[1] : flanks[0]
    if (map.getTile(otherCol, otherRow)?.id === 'mine') return true
  }
  return false
}

function placeGems(map: TileMap, count: number, safeCol: number, safeRow: number, rng: Rng): void {
  const kinds = gemKindSequence(count, GEM_KINDS)
  let placed = 0
  let attempts = 0
  while (placed < count && attempts < count * 20) {
    attempts++
    const col = randomInt(rng, 2, COLS - 2)
    const row = randomInt(rng, 0, ROWS - 1)
    const tile = map.getTile(col, row)
    if (tile?.id !== 'ground') continue
    if (Math.abs(col - safeCol) <= SAFE_RADIUS + 2 && Math.abs(row - safeRow) <= SAFE_RADIUS + 2) continue
    const id = kinds[placed]
    map.setTile(col, row, makeTileGem(id, gemColor(id)))
    placed++
  }
}

// Stamp the left/right perimeter fence. Column 0 and the last column become solid
// fence, except the single entry hole (0, startRow) and exit hole (COLS-1, exitRow),
// which stay walkable ground. The solid walls funnel both entry and the right-edge
// win through exactly one row each. Stamp AFTER mines/gems, BEFORE de-trapping.
function stampFence(map: TileMap, startRow: number, exitRow: number, terrain: TerrainType): void {
  for (let row = 0; row < ROWS; row++) {
    map.setTile(0, row, row === startRow
      ? makeTileGround(cellVariant(0, row), terrain)
      : makeTileFence())
    map.setTile(COLS - 1, row, row === exitRow
      ? makeTileGround(cellVariant(COLS - 1, row), terrain)
      : makeTileFence())
  }
}

// Pick the exit-hole row: at least MIN_ENTRY_EXIT_ROW_GAP rows from the entry
// (startRow), drawn from the seeded RNG so it is reproducible. The candidate set is
// never empty while MIN_ENTRY_EXIT_ROW_GAP < ROWS.
function pickExitRow(rng: Rng, startRow: number): number {
  const valid: number[] = []
  for (let r = 0; r < ROWS; r++) {
    if (Math.abs(r - startRow) >= MIN_ENTRY_EXIT_ROW_GAP) valid.push(r)
  }
  return valid[randomInt(rng, 0, valid.length - 1)]
}

// Orthogonal BFS from the entry hole (col 0, startRow) toward the exit hole
// (col COLS-1, exitRow). Solid tiles (fence/building) always block; mines block
// unless `throughMines` (the carve repair walks over them to know what to clear).
// Returns the entry→exit path as cell keys (row * COLS + col), or null when the
// exit is sealed. Deterministic: fixed neighbour order, no RNG. One function
// serves both the solvability guard and the carve repair — one source of truth
// for "how the player can move"; only the mine predicate differs.
function bfsPath(map: TileMap, startRow: number, exitRow: number, throughMines: boolean): number[] | null {
  const key = (c: number, r: number): number => r * COLS + c
  const passable = (c: number, r: number): boolean => {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false
    const t = map.getTile(c, r)
    if (!t || t.solid) return false
    // Flagging is a pure visual overlay — a flagged mine still has id 'mine',
    // so this one check already covers it (no separate flag special-case needed).
    return throughMines || t.id !== 'mine'
  }
  if (!passable(START_COL, startRow)) return null
  const prev = new Map<number, number>([[key(START_COL, startRow), -1]])
  const queue: Array<[number, number]> = [[START_COL, startRow]]
  // Index-pointer dequeue (O(n), no Array.shift reallocations).
  for (let head = 0; head < queue.length; head++) {
    const [c, r] = queue[head]
    if (c === COLS - 1 && r === exitRow) {
      const path: number[] = []
      for (let k = key(c, r); k !== -1; k = prev.get(k)!) path.push(k)
      return path
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr
      if (prev.has(key(nc, nr)) || !passable(nc, nr)) continue
      prev.set(key(nc, nr), key(c, r))
      queue.push([nc, nr])
    }
  }
  return null
}

// Pure reachability: from the entry hole, can the player reach the exit hole
// stepping only on SAFE cells (not solid, not a mine)? Orthogonal moves only —
// matches the player. Side-effect-free → used both as the generation guard and
// directly in tests to prove "at least one safe path exists".
export function isFieldSolvable(map: TileMap, startRow: number, exitRow: number): boolean {
  return bfsPath(map, startRow, exitRow, false) !== null
}

/**
 * Last-resort repair for a field that every regeneration attempt left sealed.
 * Raw unsolvability rises steeply with density (measured 2026-07-03: ~1% of
 * raw boards at L1, ~53% at L3, ~90% at L4+), so all MAX_FIELD_ATTEMPTS
 * rerolls can fail together — measured ~0.7% of L4+ `createGame` calls,
 * seeded dailies included. This walks the shortest entry→exit route over
 * solid-free cells (mines allowed) and defuses exactly the mines on it,
 * turning "always winnable" from a probabilistic outcome into a construction
 * guarantee. Deterministic (fixed BFS order, no RNG) → a repaired daily is
 * identical for everyone; solvable fields never reach this function.
 * Buildings keep 1-cell edge margins and inter-building gaps, so the
 * solid-free graph always connects the two fence gaps in practice; if it ever
 * didn't, the field is left as generated (and the solvability tests scream).
 */
function carveSafePath(map: TileMap, startRow: number, exitRow: number, terrain: TerrainType): void {
  const path = bfsPath(map, startRow, exitRow, true)
  if (path === null) return
  for (const k of path) {
    const col = k % COLS
    const row = Math.floor(k / COLS)
    if (map.getTile(col, row)?.id === 'mine') {
      map.setTile(col, row, makeTileGround(cellVariant(col, row), terrain))
    }
  }
}

interface BuiltField {
  map: TileMap
  startRow: number
  exitRow: number
  terrain: TerrainType
  firstAcMs: number
}

// Builds one complete field from a single seeded RNG stream. Pulled out of
// createGame so the solvability guard can rebuild deterministically from a derived
// seed when a field happens to seal the exit off.
function buildField(seed: string | number, level: number, cfg: LevelConfig): BuiltField {
  const rng = createRng(seed)
  // Drawn first so buildings, mines and gems carve their safe zones around them.
  const startRow = randomInt(rng, 0, ROWS - 1)
  const exitRow = pickExitRow(rng, startRow)
  // Level 0 is always grass so the player learns the default look first.
  const terrain: TerrainType = level === 0 ? 'grass' : rng.pick(TERRAIN_TYPES)
  const map = buildMap(terrain)
  placeBuildings(map, level, rng, startRow, exitRow)
  placeMines(map, cfg.mines, START_COL, startRow, exitRow, level, terrain, rng)
  placeGems(map, GEM_COUNT, START_COL, startRow, rng)
  stampFence(map, startRow, exitRow, terrain)
  map.setTile(START_COL, startRow, makeTileVisited(cellVariant(START_COL, startRow), terrain))
  // De-trap LAST, on the final board incl. the fence perimeter, to a fixed point.
  fixObstacleTraps(map, terrain)
  const firstAcMs = rng.float(cfg.acFirstMs, cfg.acFirstMaxMs)
  return { map, startRow, exitRow, terrain, firstAcMs }
}

// Mines in the 4 orthogonal neighbours at distance 1 (any type) — the cells the
// player can step onto and die. 0–4. The "immediate danger" count that drives
// the detector meter; any value ≥ 1 means a lethal step exists (never "safe").
export function countAdjacentMines(map: TileMap, col: number, row: number): number {
  let count = 0
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    if (map.getTile(col + dc, row + dr)?.id === 'mine') count++
  }
  return count
}

// Beacon mines broadcasting from distance 2 orthogonally — a ranged early
// warning (cyan mines, level 3+), not steppable this turn. 0–4. Drives the
// separate cyan beacon indicator.
export function countBeaconSignals(map: TileMap, col: number, row: number): number {
  let count = 0
  for (const [dr, dc] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
    const tile = map.getTile(col + dc, row + dr)
    if (tile?.id === 'mine' && tile.metadata?.mineType === 'beacon') count++
  }
  return count
}

// Total proximity the audio beep escalates over (0–8) = immediate + ranged.
// Kept as one number so the sound is unchanged; the HUD splits it back out.
export function countWarningMines(map: TileMap, col: number, row: number): number {
  return Math.min(countAdjacentMines(map, col, row) + countBeaconSignals(map, col, row), 8)
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

/**
 * Permanently reveal one still-live mine for the rest of the level (cyan-gem
 * reward). Candidates come from `findById('mine')`, which by construction holds
 * only undetonated mines off the walked path (a stepped-on mine is 'exploded',
 * a walked cell is 'visited', buildings are 'building') — filtered to exclude
 * already-flagged mines, since revealing one the player already marked would
 * waste the reward on something they already know about. The pick is seeded
 * off the field seed (like airplane drops) so a daily challenge reveals the same
 * mines for identical play. Returns false when nothing is left to reveal.
 */
export function revealMine(state: GameState): boolean {
  const shown = new Set(state.revealedMines.map((m) => `${m.col},${m.row}`))
  const candidates = state.map.findById('mine')
    .filter(({ tile }) => !tile.metadata?.flagged)
    .map(({ x, y }) => ({ col: x, row: y }))
    .filter((m) => !shown.has(`${m.col},${m.row}`))
    .sort((a, b) => a.row - b.row || a.col - b.col) // stable order before the seeded pick
  if (candidates.length === 0) return false
  const rng = state.dropSeedBase !== null
    ? createRng(`${state.dropSeedBase}:reveal${state.revealedMines.length}`)
    : createRng(randomSeed())
  state.revealedMines.push(candidates[randomInt(rng, 0, candidates.length - 1)])
  return true
}

/** A fresh 32-bit integer seed for `createRng`. `Math.random()` alone (a float in
 *  [0,1)) is truncated to 0 by createRng's `seed >>> 0`, so every game would share
 *  one seed (identical terrain/mines/drops). This spreads it across the full uint32. */
function randomSeed(): number {
  return (Math.random() * 0x100000000) >>> 0
}

export function createGame(level = 0, initialScore = 0, seed?: string | number, initialInventory: Record<string, number> = {}): GameState {
  const cfg = atLevel(LEVEL_CONFIGS, level)
  // Field generation is seeded: pass a `seed` (e.g. dailySeed(level)) for a reproducible
  // daily field; omit it (tests / free play) to get a fresh field each call.
  const baseSeed = seed ?? randomSeed()
  // Solvability guard: build the field, then prove a safe entry→exit path exists
  // (BFS). If a field happens to seal the exit off, rebuild from a derived seed —
  // still fully reproducible per daily seed. At high mine densities most raw
  // boards are sealed (~90% at L4+), so the reroll is only the fast path — the
  // carve below is what actually guarantees the invariant.
  let field = buildField(baseSeed, level, cfg)
  for (let attempt = 1;
    attempt < MAX_FIELD_ATTEMPTS && !isFieldSolvable(field.map, field.startRow, field.exitRow);
    attempt++) {
    field = buildField(`${baseSeed}:r${attempt}`, level, cfg)
  }
  // If every attempt stayed sealed (measured ~0.7% at L4+ before this existed),
  // repair the last field instead of shipping an unwinnable one.
  if (!isFieldSolvable(field.map, field.startRow, field.exitRow)) {
    carveSafePath(field.map, field.startRow, field.exitRow, field.terrain)
  }
  const { map, startRow, exitRow, terrain, firstAcMs } = field

  return {
    phase: 'playing',
    map,
    terrain,
    level,
    lives: cfg.lives,
    score: initialScore,
    playerCol: START_COL,
    playerRow: startRow,
    startRow,
    exitRow,
    playerDir: 'right',
    walkTween: null,
    walkAnim: createAnimation(2, WALK_FRAME_MS, { loop: true }),
    bufferedDir: null,
    flashTimer: 0,
    flashOn: false,
    debugMode: false,
    revealsUsed: 0,
    airplane: null,
    nextAircraftMs: firstAcMs,
    blink: true,
    blinkTimer: BLINK_INTERVAL_MS,
    totalMines: map.findById('mine').length,
    explodedMines: 0,
    levelCompleteTimer: 0,
    comboCount: 0,
    comboTimer: 0,
    gemsTotal: GEM_COUNT,
    gemsCollected: 0,
    inventory: { ...initialInventory },
    revealedMines: [],
    droppedMines: [],
    dropFlashTimer: 0,
    runState: 'idle',
    isNight: false,
    cycleSteps: DAY_STEPS,
    dropSeedBase: seed !== undefined ? String(seed) : null,
    airplanePassIndex: 0,
    timeLeftMs: TIMER_BASE_MS,
  }
}

/**
 * Toggles the debug mine-reveal (`D`), respecting the per-mode budget. Turning the
 * reveal OFF is always free; turning it ON consumes one reveal and is blocked once
 * the budget is spent. Daily fields get DAILY_REVEAL_LIMIT (0 → the key does nothing,
 * because revealing every mine would leak the scored daily solution); random/practice
 * gets RANDOM_REVEAL_LIMIT (`null` = unlimited). Call only while idle (scout phase).
 */
export function tryToggleReveal(state: GameState): void {
  if (state.debugMode) { state.debugMode = false; return }   // turning off is free
  const limit = state.dropSeedBase === null ? RANDOM_REVEAL_LIMIT : DAILY_REVEAL_LIMIT
  if (limit !== null && state.revealsUsed >= limit) return    // budget spent → no-op
  state.debugMode = true
  state.revealsUsed++
}

/**
 * Counts the per-level timer down by `dtMs`. Call only while the run is active
 * (`runState === 'running'`) so idle scouting and pause freeze the clock. When the
 * budget hits 0 the run ends immediately (game over) — no respawn, no carry-over.
 */
export function tickTimer(state: GameState, dtMs: number): void {
  state.timeLeftMs = Math.max(0, state.timeLeftMs - dtMs)
  if (state.timeLeftMs === 0) state.phase = 'gameover'
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
    // Forward bias: max of two draws skews the column toward the exit side (higher
    // cols), so the plane concentrates mines AHEAD, not behind the player. Seeded, so
    // it stays player-independent → the daily field is identical for everyone.
    const col = Math.max(randomInt(rng, 0, COLS - 2), randomInt(rng, 0, COLS - 2))
    const row = randomInt(rng, minRow, maxRow)
    // Never let an airdrop seal the exit: keep the exit safe zone clear (fence
    // columns are already skipped by the ground-only check below).
    if (Math.abs(col - (COLS - 1)) <= SAFE_RADIUS && Math.abs(row - state.exitRow) <= SAFE_RADIUS) continue
    const tile = state.map.getTile(col, row)
    if (tile?.id !== 'ground') continue
    // Solvability guard: tentatively drop, then keep the mine ONLY if a safe entry→exit
    // path still exists. Mines never land on the player's `visited` trail, so entry→exit
    // solvability ⇒ the player can always win (retreat along the safe trail to the entry,
    // then take the guaranteed path). entry→exit is player-independent, so the daily
    // field stays deterministic. If this drop would seal the field, revert it and skip —
    // a pass can legitimately place fewer mines than `count`, even 0.
    state.map.setTile(col, row, makeTileMine('normal', cellVariant(col, row), state.terrain))
    // Same revert-and-skip pattern as the solvability guard above: a drop that
    // would recreate a "forced step onto a mine" trap next to a building/fence
    // (see createsObstacleTrap) is rejected, not just ones that seal the field.
    if (!isFieldSolvable(state.map, state.startRow, state.exitRow) || createsObstacleTrap(state.map, col, row)) {
      state.map.setTile(col, row, makeTileGround(cellVariant(col, row), state.terrain))
      continue
    }
    state.totalMines++
    dropped.push({ col, row })
  }
  state.droppedMines = dropped
  state.dropFlashTimer = DROP_FLASH_MS
}
