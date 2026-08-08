import { describe, it, expect } from 'vitest'
import { hiddenAtNight, runStatRows, runStatLines, STATS_COL, GAMEOVER_STATS_TOP, GAMEOVER_PRESS_ROW, WIN_STATS_TOP, WIN_PRESS_ROW } from '../src/renderer.ts'
import { createGame, type GameState } from '../src/game.ts'
import { WIN_LEVEL, GEM_COUNT } from '../src/config.ts'
import * as en from '../src/strings.ts'
import { C, COLS, ROWS } from '../src/constants.ts'
import { makeTileGround, makeTileMine, makeTileGem, makeTileVisited, makeTileFence, TILE_EXPLODED, GRAVE_CROSS, EXPLOSION_1, EXPLOSION_2 } from '../src/sprites.ts'

// The contract behind renderFrame's night overlay: what may the night hide?
// Flags are deliberately ABSENT from this predicate — they live in state.flags
// (a pure overlay outside the map) and drawFlags paints them AFTER the night
// sweep, so a flag can never be blacked out by construction. The flag-at-night
// behaviour itself is pinned in player.test.ts ("a flag placed at night…").
// REGRESSION history (2026-07-04): when flags still lived inside tiles, the
// night sweeps painted them black — the overlay model ended that bug class.
describe('hiddenAtNight', () => {
  it('hides unvisited terrain: ground and undetonated mines', () => {
    expect(hiddenAtNight(makeTileGround('a', 'grass'))).toBe(true)
    expect(hiddenAtNight(makeTileMine('normal', 'a', 'grass'))).toBe(true)
    expect(hiddenAtNight(makeTileMine('beacon', 'b', 'snow'))).toBe(true)
    expect(hiddenAtNight(makeTileMine('cluster', 'b', 'dust'))).toBe(true)
  })

  it('never hides the player-facing landmarks: gems, visited trail, explosions, fence', () => {
    expect(hiddenAtNight(makeTileGem('cyan', C.CYAN))).toBe(false)
    expect(hiddenAtNight(makeTileVisited('a', 'grass'))).toBe(false)
    expect(hiddenAtNight(TILE_EXPLODED)).toBe(false)
    expect(hiddenAtNight(makeTileFence())).toBe(false)
  })
})

// The crater's look is a promise to the player: a blast is transient, the grave
// marker it leaves is permanent, and the two must never share a sprite (the
// EXPLOSION frames stay the animation's, drawn over the player by renderFrame).
describe('TILE_EXPLODED — grave marker, not a blast frame', () => {
  it('uses the hand-drawn grave cross, never an explosion frame', () => {
    expect(TILE_EXPLODED.sprite).toBe(GRAVE_CROSS)
    expect(TILE_EXPLODED.sprite).not.toBe(EXPLOSION_1)
    expect(TILE_EXPLODED.sprite).not.toBe(EXPLOSION_2)
    expect(GRAVE_CROSS).toHaveLength(8)   // 8×8, one byte per row
  })

  it('is grey and walkable — a memorial, not a live danger', () => {
    expect(TILE_EXPLODED.ink).toBe(C.WHITE)
    expect(TILE_EXPLODED.solid).toBe(false)
  })
})

// ── End-of-run statistics: layout ─────────────────────────────────────────────

// The stat block is drawn text on a fixed 32×18 playfield, so it has exactly two
// ways to break, and neither is visible in a unit test that only checks values:
// a long line runs off the right edge, and a tall block runs under the HUD. Both
// are pinned here so ADDING A STAT fails a test instead of silently overflowing.
describe('run statistics — screen layout', () => {
  // A worst-case run: four-digit steps (a full 10-level crossing is easily 1000+),
  // a long clock and 100% percentages — the widest each value can realistically get.
  function maxedState(): GameState {
    const state = createGame(0)
    state.level = WIN_LEVEL - 1
    Object.assign(state.stats, {
      elapsedMs: 5999_000,   // '99:59'
      steps: 9999, backtrackSteps: 9999, flagsPlaced: 999, flagsOnMines: 999,
      deaths: 99, gems: 120, bestCombo: 999,
    })
    return state
  }

  it('never draws past the right edge, even with the widest values', () => {
    for (const line of runStatLines(maxedState())) {
      // Drawn at column STATS_COL, so the line plus its offset must fit COLS.
      expect(STATS_COL + line.length).toBeLessThanOrEqual(COLS)
    }
  })

  it('keeps every line the same width, so the values stay in one column', () => {
    const widths = new Set(runStatLines(maxedState()).map((l) => l.length))
    expect(widths.size).toBe(1)
  })

  // Vertical fit, both screens: the block starts at *_STATS_TOP and the blinking
  // prompt sits below it — everything has to stay inside the 18-row playfield or
  // it draws over the HUD strip.
  it('fits between the header and the prompt on the game-over screen', () => {
    const rows = runStatLines(maxedState()).length
    expect(GAMEOVER_STATS_TOP + rows).toBeLessThanOrEqual(GAMEOVER_PRESS_ROW)
    expect(GAMEOVER_PRESS_ROW).toBeLessThan(ROWS)
  })

  it('fits on the win screen too (the tighter of the two — it has an epilogue)', () => {
    const rows = runStatLines(maxedState()).length
    expect(WIN_STATS_TOP + rows).toBeLessThanOrEqual(WIN_PRESS_ROW)
    expect(WIN_PRESS_ROW).toBeLessThan(ROWS)
  })
})

describe('run statistics — values', () => {
  // RISK: BACKTRACK and ON MINES are percentages of counters that are ZERO on a run
  // that ended before the player moved or flagged anything (a timeout on the very
  // first screen). Without the guard the summary would read 'NaN%'.
  it('reads 0% instead of NaN% when nothing was stepped on or flagged', () => {
    const rows = runStatRows(createGame(0))
    const values = rows.map((r) => r.value).join(' ')
    expect(values).not.toContain('NaN')
    expect(rows.find((r) => r.label === en.STAT_LABEL.backtrack)?.value).toBe('0 (0%)')
    expect(rows.find((r) => r.label === en.STAT_LABEL.onMines)?.value).toBe('0 (0%)')
  })

  it('reports every stat with a label and a value', () => {
    const rows = runStatRows(createGame(0))
    expect(rows.length).toBe(Object.keys(en.STAT_LABEL).length)
    for (const r of rows) {
      expect(r.label.length).toBeGreaterThan(0)
      expect(r.value.length).toBeGreaterThan(0)
    }
  })

  // GEMS is measured against the levels actually PLAYED, not the full 10-level run:
  // dying on level 2 with 20 of 24 gems is a good run, and '20/120' would call it a
  // bad one.
  it('measures gems against the levels actually played', () => {
    const state = createGame(0)
    state.level = 1            // on level 2 → two levels' worth of gems were reachable
    state.stats.gems = 20
    const gems = runStatRows(state).find((r) => r.label === en.STAT_LABEL.gems)
    expect(gems?.value).toBe(`20/${GEM_COUNT * 2}`)
  })
})
