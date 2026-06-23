// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { writeSave, readSaveLatest } from 'zx-kit'
import { saveProfile, setStateGetter } from './save.ts'
import { createGame } from './game.ts'

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
})
