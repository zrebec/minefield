// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { writeSave, readSaveLatest } from 'zx-kit'
import { saveProfile, setStateGetter } from './save.ts'
import { createGame, cellKey } from './game.ts'
import { makeTileMine, makeTileGround, makeTileVisited } from './sprites.ts'

function cellVariant(col: number, row: number): 'a' | 'b' {
  return (col + row) % 2 === 0 ? 'a' : 'b'
}

// jsdom provides localStorage (the zx-kit save backend).
beforeEach(() => localStorage.clear())

describe('save round-trip', () => {
  it('persists airplanePassIndex (regression: reload used to reset it to 0)', () => {
    // Save a run that is several airplane passes in.
    const saved = createGame(2, 0, 'pass-seed')
    saved.airplanePassIndex = 3
    setStateGetter(() => saved)
    expect(writeSave(saveProfile, 'auto').ok).toBe(true)

    // Reload into a fresh state (passIndex starts at 0) and deserialize.
    const loaded = createGame(2, 0, 'pass-seed')
    expect(loaded.airplanePassIndex).toBe(0)
    setStateGetter(() => loaded)
    expect(readSaveLatest(saveProfile).ok).toBe(true)

    // Before the fix this stayed 0 → the airplane sequence restarted on reload.
    expect(loaded.airplanePassIndex).toBe(3)
  })

  it('round-trips the exit row and core counters', () => {
    const saved = createGame(1, 1234, 'rt-seed-A')
    saved.airplanePassIndex = 5
    setStateGetter(() => saved)
    writeSave(saveProfile, 'auto')

    // Load into a state built from a DIFFERENT seed, so the restored values must
    // come from the save (not coincidentally match a same-seed field).
    const loaded = createGame(1, 0, 'rt-seed-B')
    setStateGetter(() => loaded)
    readSaveLatest(saveProfile)

    expect(loaded.exitRow).toBe(saved.exitRow)
    expect(loaded.startRow).toBe(saved.startRow)
    expect(loaded.airplanePassIndex).toBe(5)
    expect(loaded.score).toBe(1234)
  })

  // Flags are a pure visual overlay (state.flags, never in tiles) but persist
  // through the per-cell chars ('f'/'m'/'c'/'b', gem digits 5-8, 'v') — a fully
  // independent code path from the map-generation tests above. Regression
  // coverage: these chars once reconstructed a tile with id 'flag', which
  // silently defused the mine — after load, a flagged mine must still be a
  // real, exploding mine AND the overlay flag must be back.
  it('a flagged mine survives save→load as a real mine, not defused — and keeps its flag', () => {
    const saved = createGame(0, 0, 'flag-rt-seed')
    const variant = cellVariant(5, 5)
    saved.map.setTile(5, 5, makeTileMine('normal', variant, saved.terrain))
    saved.flags.add(cellKey(5, 5))
    setStateGetter(() => saved)
    writeSave(saveProfile, 'auto')

    const loaded = createGame(0, 0, 'flag-rt-seed')
    setStateGetter(() => loaded)
    readSaveLatest(saveProfile)

    const tile = loaded.map.getTile(5, 5)
    expect(tile?.id).toBe('mine')
    expect(loaded.flags.has(cellKey(5, 5))).toBe(true)
  })

  it('a flagged ground cell survives save→load with id "ground" and its flag', () => {
    const saved = createGame(0, 0, 'flag-rt-seed-2')
    const variant = cellVariant(5, 5)
    saved.map.setTile(5, 5, makeTileGround(variant, saved.terrain))
    saved.flags.add(cellKey(5, 5))
    setStateGetter(() => saved)
    writeSave(saveProfile, 'auto')

    const loaded = createGame(0, 0, 'flag-rt-seed-2')
    setStateGetter(() => loaded)
    readSaveLatest(saveProfile)

    const tile = loaded.map.getTile(5, 5)
    expect(tile?.id).toBe('ground')
    expect(loaded.flags.has(cellKey(5, 5))).toBe(true)
  })

  it('a flag on the VISITED trail survives save→load (the new "v" cell code)', () => {
    const saved = createGame(0, 0, 'flag-rt-seed-3')
    const variant = cellVariant(5, 5)
    saved.map.setTile(5, 5, makeTileVisited(variant, saved.terrain))
    saved.flags.add(cellKey(5, 5))
    setStateGetter(() => saved)
    writeSave(saveProfile, 'auto')

    const loaded = createGame(0, 0, 'flag-rt-seed-3')
    setStateGetter(() => loaded)
    readSaveLatest(saveProfile)

    const tile = loaded.map.getTile(5, 5)
    expect(tile?.id).toBe('visited')
    expect(loaded.flags.has(cellKey(5, 5))).toBe(true)
  })

  it('an UNFLAGGED cell never gains a flag through a save round-trip', () => {
    const saved = createGame(0, 0, 'flag-rt-seed-4')
    setStateGetter(() => saved)
    writeSave(saveProfile, 'auto')

    const loaded = createGame(0, 0, 'flag-rt-seed-4')
    setStateGetter(() => loaded)
    readSaveLatest(saveProfile)

    expect(loaded.flags.size).toBe(0)
  })

  it('persists revealsUsed (regression: reload used to reset the debug-reveal budget, letting save-scumming bypass RANDOM_REVEAL_LIMIT)', () => {
    const saved = createGame(0, 0)   // undefined seed → random mode
    saved.revealsUsed = 1            // spent the one allowed reveal
    setStateGetter(() => saved)
    writeSave(saveProfile, 'auto')

    const loaded = createGame(0, 0)
    expect(loaded.revealsUsed).toBe(0)   // fresh state, budget not yet spent
    setStateGetter(() => loaded)
    readSaveLatest(saveProfile)

    // Before the fix this stayed 0 → reload silently refilled the budget.
    expect(loaded.revealsUsed).toBe(1)
  })

  it('clears the combo on load (regression: comboCount survived a reload while comboTimer was zeroed, so the auto-expiry check — which only runs when comboTimer > 0 — never fired, and the stale multiplier applied to the next step)', () => {
    const saved = createGame(0, 0, 'combo-seed')
    saved.comboCount = 7
    saved.comboTimer = 1200   // mid-streak, well before natural expiry
    setStateGetter(() => saved)
    writeSave(saveProfile, 'auto')

    const loaded = createGame(0, 0, 'combo-seed')
    setStateGetter(() => loaded)
    readSaveLatest(saveProfile)

    expect(loaded.comboCount).toBe(0)
    expect(loaded.comboTimer).toBe(0)
  })
})
