// ═══════════════════════════════════════════════════════════════════════════════
// MINEFIELD — GAME CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
// All game parameters in one place. Change and save — Vite hot-reloads instantly.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Localisation ──────────────────────────────────────────────────────────────

/**
 * Active language code. Picked up by lang.ts via zx-kit's `pickLocale`.
 *
 * - `null` / `'en'` / unknown code → loads default `strings.ts` (English)
 * - `'sk'` → loads `strings.sk.ts` (Slovak)
 *
 * Case-insensitive: `'SK'` works the same as `'sk'`.
 *
 * To add a new translation: create `strings.<code>.ts`, register it
 * in `lang.ts`, widen this type, then set the code here to test.
 * HMR swaps the text live — useful for checking layout overflow.
 */
export const LANGUAGE_CODE: 'sk' | null = null

// ── Input ─────────────────────────────────────────────────────────────────────

// Initial delay before key-repeat starts (ms) — how long after first press
// before auto-repeat begins. 280ms prevents accidental double-steps on D-pad taps.
export const KEY_REPEAT_DELAY = 1200

// Key-repeat interval (ms) — movement rate while key is held.
// Should match WALK_DURATION_MS so held key queues one step per animation.
export const KEY_REPEAT_INTERVAL = 220

// ── Player & Start ────────────────────────────────────────────────────────────

// Starting column and row (0-indexed). START_COL=0 = left edge (every game
// spawns on the left). The live spawn ROW is now seeded per-field (see
// createGame → startRow); START_ROW remains only as the legacy fallback for
// saves written before seeded starts, where games did spawn on this row.
export const START_COL = 0
export const START_ROW = 11

// Safe-zone radius around start position (no mines).
// 1 = 3×3 around player, 2 = 5×5 around player
// Applied around BOTH the entry hole (col 0, startRow) and the exit hole
// (col COLS-1, exitRow) so neither can be sealed by a mine or building.
export const SAFE_RADIUS = 1

// Minimum vertical distance between the entry hole (startRow) and the exit hole
// (exitRow). Forces a non-trivial traversal (no straight horizontal run) and a
// longer mandatory path. Must stay < ROWS so a valid exit row always exists.
export const MIN_ENTRY_EXIT_ROW_GAP = 6

// Debug mine-reveal (`D` key) budget per level, by run mode. `D` reveals EVERY mine
// position, so on a SCORED daily field it would leak the solution — daily gets 0
// (the key does nothing). Random/practice is unscored, so it gets a finite scouting
// allowance. `null` = unlimited. NB: 0 means "none" and `null` means "infinite" —
// we deliberately do NOT overload 0 as "infinite", because daily legitimately needs
// exactly 0, and `null` avoids any `NaN`/`Infinity` arithmetic.
export const DAILY_REVEAL_LIMIT: number | null = 0
export const RANDOM_REVEAL_LIMIT: number | null = 1

// ── Scoring ───────────────────────────────────────────────────────────────────

// Points awarded per newly visited cell (before level multiplier)
export const SCORE_PER_CELL = 10

// Level multipliers — each subsequent level increases scoring rate.
// Level 1 = 1.0×, Level 2 = 1.2×, Level 3 = 1.4×, etc.
// Levels beyond the last index use the final value.
export const SCORE_MULTIPLIERS = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0]

// ── Level configuration ───────────────────────────────────────────────────────
// Each level can have its own settings.
// Levels beyond the last index repeat the last configuration.

export interface LevelConfig {
  mines: number         // number of mines on the field
  lives: number         // starting lives for this level
  acFirstMs: number     // minimum time before first airplane (ms)
  acFirstMaxMs: number  // maximum time before first airplane (ms)
  acMinMs: number       // minimum interval between airplanes after first (ms)
  acMaxMs: number       // maximum interval between airplanes after first (ms)
  acMineDropMin: number // minimum mines dropped per airplane
  acMineDropMax: number // maximum mines dropped per airplane
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  // Level 1 — intro, fewer mines, slower airplanes
  {
    mines: 50,
    lives: 3,
    acFirstMs: 15_000,
    acFirstMaxMs: 30_000,
    acMinMs: 20_000,
    acMaxMs: 45_000,
    acMineDropMin: 3,
    acMineDropMax: 6,
  },
  // Level 2 — more mines, slightly more frequent airplanes
  {
    mines: 80,
    lives: 3,
    acFirstMs: 12_000,
    acFirstMaxMs: 20_000,
    acMinMs: 15_000,
    acMaxMs: 30_000,
    acMineDropMin: 4,
    acMineDropMax: 7,
  },
  // Level 3 — challenge, many mines, airplane every ~15–30 s
  {
    mines: 100,
    lives: 2,
    acFirstMs: 10_000,
    acFirstMaxMs: 15_000,
    acMinMs: 10_000,
    acMaxMs: 20_000,
    acMineDropMin: 5,
    acMineDropMax: 8,
  },
  // Level 4+ — hardcore, frequent airplanes, dense minefield
  {
    mines: 110,
    lives: 2,
    acFirstMs: 8_000,
    acFirstMaxMs: 12_000,
    acMinMs: 8_000,
    acMaxMs: 15_000,
    acMineDropMin: 6,
    acMineDropMax: 10,
  },
]

// ── Buildings ───────────────────────────────────────────────────────────────
// High-angle buildings replace the old linear walls. Sizes below are the ROOF
// footprint; createBuilding adds 2 brick rows + 1 concrete row below it (the
// full bounding box is solid and mine-free). Seen from above, the roof dominates.

// Roof footprint bounds (tiles) — width and depth are rolled INDEPENDENTLY, so
// buildings come in varied rectangles/orientations (3×8, 8×4, 4×8 …), not just
// squares. 8 is the per-dimension cap and stays rare via ROOF_MAX_PER_LEVEL.
// (Drop ROOF_MIN to 2 if you also want extra-thin 2×N buildings.)
export const ROOF_MIN = 2
export const ROOF_MAX = 8

// Brick front-face height (tile rows). Foundation is always 1 row below it, so
// bounding box height = roofD + this + 1. Kept small on purpose — top-down view.
export const BUILDING_WALL_HEIGHT = 2

// A "big" building has a roof dimension ≥ this.
export const BIG_ROOF_MIN = 4

// Max roof dimension allowed per level (early levels stay modest).
// Index = level (0-based); levels beyond range repeat the last value.
export const ROOF_MAX_PER_LEVEL = [5, 6, 7, ROOF_MAX]

// Building count per level — random in range [min, max] inclusive.
// Index = level (0-based); levels beyond range repeat the last value.
export const BUILDING_COUNTS: Array<[number, number]> = [
  [2, 3],   // Level 1
  [3, 4],   // Level 2
  [4, 5],   // Level 3
  [5, 6],   // Level 4+
]

// Minimum empty-tile gap kept around every building (≥1 keeps a walkable lane
// between buildings and prevents corner-touch pockets).
export const BUILDING_GAP = 1

// ── Airplane — movement ───────────────────────────────────────────────────────

// Time for an airplane to cross the screen (ms)
export const AIRPLANE_CROSS_MS = 3000

// Flight-row band (0-indexed, inclusive): the plane flies somewhere in [MIN, MAX]
// and scatters its drops in a small band below that row. Kept off the very top/
// bottom edges to leave room for the future top/bottom fence (row 0 and the last
// rows). With ROWS = 18 this is 1..14.
export const AIRPLANE_ROW_MIN = 1
export const AIRPLANE_ROW_MAX = 14

// ── Audio ─────────────────────────────────────────────────────────────────────

// Master volume (0.0 – 1.0)
export const MASTER_VOLUME = 0.2

// Debounce for proximity warning sound (ms) — prevents chattering during fast movement
export const WARN_DEBOUNCE_MS = 180

// ── Walk animation ────────────────────────────────────────────────────────────

// Duration of one step between cells (ms) — smooth position tween.
// Tile reveal (mine / gem / ground) happens after the tween completes.
export const WALK_DURATION_MS = 220

// Duration of one walk-cycle frame (ms). 2 frames × 60ms = 120ms per full cycle.
export const WALK_FRAME_MS = 60

// ── Explosion ─────────────────────────────────────────────────────────────────

// Total flash effect duration on explosion (ms)
export const EXPLOSION_FLASH_MS = 600

// ── Text blinking ─────────────────────────────────────────────────────────────

// Blink interval (ms) — PRESS ANY KEY, AIRCRAFT!, etc.
export const BLINK_INTERVAL_MS = 500

// Aircraft WARNING blink interval in the status bar (ms)
export const AIRCRAFT_WARN_BLINK_MS = 250

// ── Level complete ────────────────────────────────────────────────────────────

// Time to display "LEVEL COMPLETE" overlay before transitioning (ms)
export const LEVEL_COMPLETE_DELAY_MS = 2500

// ── Collectibles (Gems) ───────────────────────────────────────────────────────

// Number of gems placed on the field each level
export default 12

// Base gem collection bonus (before combo multiplier)
export const GEM_SCORE = 1000

// Collecting this many RED gems converts them into +1 life (and frees their
// backpack slots). The first real gem "function" — see GEM_KINDS in game.ts.
export const RED_GEMS_PER_LIFE = 2

// Collecting this many CYAN gems permanently reveals one still-live mine for the
// rest of the level (and frees the slots). The mine can be anywhere unwalked —
// often behind you — so it's a deceptive, not strictly useful, reward.
export const CYAN_GEMS_PER_REVEAL = 3

// GOLD gem special: a juicy score bonus on pickup, on TOP of the flat GEM_SCORE
// every gem grants. Gold is rare (1/level), so it stays special. Tunable.
export const GOLD_SCORE_BONUS = 5000

// ── Timer ─────────────────────────────────────────────────────────────────────

// Per-level countdown budget. Resets to this at the start of every level (leftover
// time is NOT carried over). Pressures the back-and-forth re-sampling ("cheese")
// that would otherwise let a patient player triangulate the whole field risk-free.
// Tunable — adjust after playtest.
export const TIMER_BASE_MS = 600_000      // 10:00 starting budget per level

// Time granted per gem collected, by colour. Rarer gems give more (cyan is the
// most common → 0). Tunable per kind; a missing kind grants 0. Full-clear total
// at these values: cyan 6×0 + green 2×5s + red 3×10s + gold 1×30s = +70s/level.
export const GEM_TIME_BONUS_MS: Record<string, number> = {
  cyan: 0,
  green: 5_000,
  red: 10_000,
  gold: 30_000,
}

// At or below this, the HUD clock turns red and blinks.
export const TIMER_LOW_MS = 60_000        // 1:00 warning threshold

// ── Combo system ──────────────────────────────────────────────────────────────

// How long (ms) a combo remains active without stepping on a new cell
export const COMBO_DURATION_MS = 2500

// Maximum combo multiplier (2.0 = double score)
export const COMBO_MAX_MULTIPLIER = 2.0

// ── Mine types ────────────────────────────────────────────────────────────────

// From which level (0-indexed) cluster mines appear (yellow, reveal surroundings)
export const CLUSTER_MINE_LEVEL = 1  // from level 2

// Fraction of mines that are cluster mines (0.15 = 15%)
export const CLUSTER_MINE_RATIO = 0.15

// From which level (0-indexed) beacon mines appear (cyan, warn from 2 cells away)
export const BEACON_MINE_LEVEL = 2   // from level 3

// Fraction of mines that are beacon mines (0.12 = 12%)
export const BEACON_MINE_RATIO = 0.12

// ── Airplane — approach ───────────────────────────────────────────────────────

// How many ms before airplane spawn the distant engine sound starts
export const AIRPLANE_APPROACH_MS = 5000

// ── Day/night cycle ───────────────────────────────────────────────────────────

// Steps ON NEW CELLS until phase change.
// Walking revisited paths does NOT reset the counter — intentional.
// Respawn restarts the day (new DAY_STEPS counter, isNight=false).
export const DAY_STEPS = 15   // steps in daylight before night falls
export const NIGHT_STEPS = 10 // steps at night before dawn

// ── Controls (help-screen source) ─────────────────────────────────────────────
//
// A flat list of the game's controls, used to render the pause/help screen so the
// help text lives in ONE place. It deliberately does NOT drive key matching — the
// listeners in input.ts / main.ts match keys directly (matching every key through
// this list would add indirection for no real gain at this size). The only cost:
// if you rename a key, update both the listener and the `keys` label here.
//
// `keys`  — short display label (ROM-font safe ASCII).
// `scope` — 'ingame' shows during play (pause screen), 'title' on the title only,
//           'always' both.
export interface ControlSpec {
  id: string
  keys: string
  scope: 'ingame' | 'title' | 'always'
}

export const CONTROLS: ControlSpec[] = [
  { id: 'move', keys: 'ARROWS', scope: 'ingame' },
  { id: 'flag', keys: 'F', scope: 'ingame' },
  { id: 'pause', keys: 'P', scope: 'ingame' },
  { id: 'save', keys: 'SHIFT+S', scope: 'ingame' },
  { id: 'reveal', keys: 'D', scope: 'ingame' },
  { id: 'fps', keys: 'O', scope: 'always' },
  { id: 'volume', keys: '+/-', scope: 'always' },
  { id: 'start', keys: 'SPACE', scope: 'title' },
  { id: 'random', keys: 'R', scope: 'title' },
]
