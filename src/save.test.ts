// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { writeSave, readSaveLatest } from 'zx-kit'
import { saveProfile, setStateGetter } from './save.ts'
import { createGame } from './game.ts'
import { makeTileMine, makeTileGround, flagTile } from './sprites.ts'

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

  // Flagging is a pure visual overlay (metadata.flagged) — the per-cell save
  // encoding has its own separate characters for flagged variants (f/m/c/b/g),
  // so this exercises a fully independent code path from the map-generation
  // tests above. Regression coverage: previously these chars reconstructed a
  // tile with id 'flag' (makeTileFlag), which silently defused the mine —
  // after load, a flagged mine must still be a real, exploding mine.
  it('a flagged mine survives save→load as a real mine, not defused', () => {
    const saved = createGame(0, 0, 'flag-rt-seed')
    const variant = cellVariant(5, 5)
    saved.map.setTile(5, 5, flagTile(makeTileMine('normal', variant, saved.terrain)))
    setStateGetter(() => saved)
    writeSave(saveProfile, 'auto')

    const loaded = createGame(0, 0, 'flag-rt-seed')
    setStateGetter(() => loaded)
    readSaveLatest(saveProfile)

    const tile = loaded.map.getTile(5, 5)
    expect(tile?.id).toBe('mine')
    expect(tile?.metadata?.flagged).toBe(true)
  })

  it('a flagged ground cell survives save→load with id "ground"', () => {
    const saved = createGame(0, 0, 'flag-rt-seed-2')
    const variant = cellVariant(5, 5)
    saved.map.setTile(5, 5, flagTile(makeTileGround(variant, saved.terrain)))
    setStateGetter(() => saved)
    writeSave(saveProfile, 'auto')

    const loaded = createGame(0, 0, 'flag-rt-seed-2')
    setStateGetter(() => loaded)
    readSaveLatest(saveProfile)

    const tile = loaded.map.getTile(5, 5)
    expect(tile?.id).toBe('ground')
    expect(tile?.metadata?.flagged).toBe(true)
  })
})
