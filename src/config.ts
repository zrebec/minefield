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

// ── Story intro ───────────────────────────────────────────────────────────────

// Bump whenever the intro content changes — forces it to re-show even for players
// who already saw the old one (a versioned "what's new" gate).
export const INTRO_VERSION = 1

// How long a "seen" mark stays valid before the intro re-shows on the next mode
// start (days). **1 = daily** while we keep iterating pre-1.0; set to ~30 (monthly)
// at v1.0. Replaying with `I` from the title is always available regardless.
export const INTRO_REVALIDATE_DAYS = 1

// Typewriter speed for the story cards (ms per revealed character).
export const MS_PER_CHAR = 120

// How long a fully-typed card holds before auto-advancing (ms), if the player
// presses nothing. Clock starts when typing finishes, not when the card appears.
// Any keypress skips instantly (the "ANY KEY = SKIP" hint), so this only paces
// an idle reader. See stepStory in intro.ts.
export const CARD_HOLD_MS = 4200

// ── Title screen ──────────────────────────────────────────────────────────────

// How long each attract-mode page (controls/goal vs high scores) stays up
// before flipping to the other (ms), on the persistent title screen (distinct
// from the story-card intro above — this is main.ts's `introPage` cycle inside
// renderIntro). Was 3s (felt like flickering); 10s gives it time to actually
// read.
export const INTRO_PAGE_MS = 10_000

// ── Input ─────────────────────────────────────────────────────────────────────

// Delay before a held key starts auto-repeating (ms). Long on purpose — a held
// arrow shouldn't auto-step until clearly intentional (avoids D-pad double-taps).
export const KEY_REPEAT_DELAY = 1200

// Movement rate while a key is held (ms). Matches WALK_DURATION_MS so a held key
// queues exactly one step per walk animation.
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

// Debug mine-reveal (`D` key) budget per level. `D` reveals every mine, so the
// scored daily gets 0 (leaking the solution would be cheating); unscored
// random/practice gets a small allowance. `null` = unlimited (0 stays "none",
// never overloaded to mean infinite).
export const DAILY_REVEAL_LIMIT: number | null = 0
export const RANDOM_REVEAL_LIMIT: number | null = 1

// Max field-rebuild attempts (the solvability guard rebuilds from a derived seed
// if a field seals its own exit). With MINE_DENSITY calibrated below the
// percolation knee, retries are rare again; if every attempt still fails, the
// deterministic carve repair (game.ts carveSafePath) guarantees solvability.
export const MAX_FIELD_ATTEMPTS = 64

// Clearing this many crossings (1-based level) wins the run: the war ends, the Strip
// is cleared, the two countries reunite. A constant → the same finish line for
// everyone, so the daily stays comparable. Tune freely by ear. Keep it >= 1 (0 behaves
// like 1 — level 1 still plays, then the war ends on crossing it).
export const WIN_LEVEL = 10

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

// Mine budget per level as a fraction of MINE-ELIGIBLE cells — the cells that can
// actually host a mine after buildings and the entry/exit safe zones (solution A,
// docs/generation-density.md). The count follows the board that exists, so more
// buildings no longer silently harden the field. Calibrated 2026-07-03 (400
// boards/level): L1–L2 match the old fixed counts and their feel (≈50 / ≈80
// mines, raw-solvable 99.5% / 87.5%); L3 ≈74 (77.8%), L4+ ≈61–63 (61.5–71.5%) —
// all safely past the ≥50% generation-health criterion, guarded in game.test.ts.
export const MINE_DENSITY = [0.105, 0.19, 0.19, 0.18]

export interface LevelConfig {
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

// ── Airplane ──────────────────────────────────────────────────────────────────

// Time for an airplane to cross the screen (ms).
export const AIRPLANE_CROSS_MS = 3000

// Lead time before spawn that the distant engine sound starts (ms).
export const AIRPLANE_APPROACH_MS = 5000

// Delay after the plane passes mid-screen before it releases its mines (ms).
export const AIRPLANE_DROP_DELAY_MS = 1000

// Flight-row band (0-indexed, inclusive): the plane flies somewhere in [MIN, MAX]
// and scatters drops in a small band below. Kept off the top/bottom edges. With
// ROWS = 18 this is 1..14.
export const AIRPLANE_ROW_MIN = 1
export const AIRPLANE_ROW_MAX = 14

// ── Audio ─────────────────────────────────────────────────────────────────────

// Master volume (0.0 – 1.0)
export const MASTER_VOLUME = 0.2

// Debounce for proximity warning sound (ms) — prevents chattering during fast movement
export const WARN_DEBOUNCE_MS = 180

// ── Sonar sweep (D) & exit beacon ─────────────────────────────────────────────
// The D key ALWAYS plays a sonar sweep of nearby mines — unlimited, for every
// player (the AUDIO twin of the budgeted visual reveal; a11y.md §5). Encoding:
// pan = east/west, pitch = north/south (higher = north), volume = distance.
// Anti-cheese is TIME, not a counter: the sweep sounds while the run clock ticks.
// All numbers here are ear-tuning knobs — defaults are a starting point.

// Scan reach in cells (Chebyshev — a square window around the player).
export const SCAN_RADIUS = 5

// One sweep ping: beep length and the silent gap after it (ms).
export const SCAN_BEEP_MS = 40
export const SCAN_GAP_MS = 80

// Hard cap on pings per sweep — nearest mines win, the rest are dropped. Keeps
// the sweep ≤ ~2 s even in a dense field (16 × 120 ms ≈ 1.9 s).
export const SCAN_MAX_BEEPS = 16

// Pitch = north/south: freq = BASE + (−dRow) · ROW_STEP. A mine on the player's
// row plays BASE; each row north adds ROW_STEP Hz, each row south subtracts it.
// With SCAN_RADIUS 5 this spans 165–715 Hz — audible on both ends.
export const SCAN_FREQ_BASE = 440
export const SCAN_FREQ_ROW_STEP = 55

// Volume = distance: linear from NEAR (adjacent mine) to FAR (edge of radius).
export const SCAN_VOL_NEAR = 0.5
export const SCAN_VOL_FAR = 0.12

// "All clear" — a single centred low blip when no mine is in range. The key must
// always audibly respond; silence would be ambiguous (did the scan even run?).
export const SCAN_ALLCLEAR_FREQ = 140
export const SCAN_ALLCLEAR_MS = 120

// Exit beacon (the E key only — NOT auto-played at run start). A single sustained
// tone with two independent channels (tuned by ear 2026-07-21, a11y.md §5):
//   VOLUME = horizontal distance to the exit column — far = near-silent, ≤ NEAR
//     cells = max. A "hot/cold" cue: it swells as you close on the exit column.
//   PITCH  = north/south — higher when the exit is north of you, lower when
//     south. SAME convention as the sonar sweep (one "up = higher" rule to learn).
// No panning: the exit is always on the east edge (col COLS-1), so stereo would
// carry nothing (revisit an off-centre exit long after v1.0). The spoken bearing
// carries the exact numbers; the tone is the feel.

// Length of the single tone (ms).
export const BEACON_TONE_MS = 200

// Pitch = north/south: freq = BASE + (−dRow) · ROW_STEP, clamped ≥ MIN. dRow is
// exitRow − playerRow, so exit-north (dRow < 0) raises the pitch. Over the full
// board (dRow −17..+17) this spans MIN..~750 Hz.
export const BEACON_FREQ_BASE = 440
export const BEACON_FREQ_ROW_STEP = 18
export const BEACON_FREQ_MIN = 90

// Volume = horizontal distance to the exit column. At/below NEAR the tone sits at
// VOL_MAX; from there it fades geometrically (perceptually even per cell) to
// VOL_MIN at/beyond FAR — a whisper, never truly silent. FAR = COLS-1 = the
// distance from the entry, so the very start is the quietest the beacon ever is.
export const BEACON_NEAR_DIST = 3
export const BEACON_FAR_DIST = 31
export const BEACON_VOL_MAX = 0.5
export const BEACON_VOL_MIN = 0.03

// On the exit's EXACT row (dRow = 0) the beacon becomes a DOUBLE beep instead of
// the single sustained tone — a categorical "you're level with the exit, go
// straight east" marker. A continuous pitch alone can't say WHICH pitch is centre
// (absolute pitch is rare), so the zero-crossing needs its own distinct earcon.
// Each beep's length + the silent gap between the two (ms). Volume still = distance.
export const BEACON_ALIGN_BEEP_MS = 80
export const BEACON_ALIGN_GAP_MS = 70

// Deliberately NO SCAN_COOLDOWN — time on the live clock is the cost. If
// playtests show scan-spam cheese, add a single cooldown constant here.

// Deliberately NO SCAN_COOLDOWN — time on the live clock is the cost. If
// playtests show scan-spam cheese, add a single cooldown constant here.

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

// Newly airdropped mines flash white for this long (ms), toggling on/off every
// DROP_FLASH_BLINK_MS so the player sees where the plane just seeded.
export const DROP_FLASH_MS = 500
export const DROP_FLASH_BLINK_MS = 100

// ── Save ──────────────────────────────────────────────────────────────────────

// Minimum gap between throttled autosaves (ms) — e.g. the autosave after each
// airplane flyover coalesces if flyovers come faster than this.
export const AUTOSAVE_THROTTLE_MS = 5000

// Envelope-signature secret (FNV-1a, deterrent-grade — ships in the bundle); signs run saves AND the hiscore table.
export const SAVE_SECRET = 'minefield:the-strip:v1'

// ── High scores ───────────────────────────────────────────────────────────────

// Rows kept on the local leaderboard, best first.
export const HISCORE_MAX_ENTRIES = 5

// ── Level complete ────────────────────────────────────────────────────────────

// Time to display "LEVEL COMPLETE" overlay before transitioning (ms)
export const LEVEL_COMPLETE_DELAY_MS = 2500

// ── Collectibles (Gems) ───────────────────────────────────────────────────────

// Number of gems placed on the field each level.
export const GEM_COUNT = 12

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

// Collecting this many GREEN gems summons the friendly (white) recon plane: it
// crosses one seeded row and permanently reveals every mine currently in it
// (snapshot — mines airdropped into that row LATER stay hidden). A level seeds
// exactly 2 greens (GEM_KINDS 12·20/50/10/20), so at 2 the reward fires about
// once per full-cleared level; the backpack carries leftovers across levels.
export const GREEN_GEMS_PER_PLANE = 2

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
  { id: 'flagDir', keys: 'SHIFT+ARROWS', scope: 'ingame' },
  { id: 'pause', keys: 'P', scope: 'ingame' },
  { id: 'save', keys: 'SHIFT+S', scope: 'ingame' },
  { id: 'reveal', keys: 'D', scope: 'ingame' },
  { id: 'fps', keys: 'O', scope: 'always' },
  { id: 'volume', keys: '+/-', scope: 'always' },
  { id: 'start', keys: 'SPACE', scope: 'title' },
  { id: 'random', keys: 'R', scope: 'title' },
]

// ── Per-level lookup ──────────────────────────────────────────────────────────

// The one canonical way to read any per-level array above (LEVEL_CONFIGS,
// SCORE_MULTIPLIERS, ROOF_MAX_PER_LEVEL, BUILDING_COUNTS): index by level,
// clamping past the end to the last entry ("levels beyond range repeat the last
// value"). Keeps that clamp in ONE place instead of every call site re-deriving
// `arr[Math.min(level, arr.length - 1)]`.
export function atLevel<T>(perLevel: readonly T[], level: number): T {
  return perLevel[Math.min(level, perLevel.length - 1)]
}
