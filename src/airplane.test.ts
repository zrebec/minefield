import { describe, it, expect } from 'vitest'
import { createTileMap, createRng, type TileMap } from 'zx-kit'
import { spawnFriendlyPlane, updateFriendlyPlane } from './airplane.ts'
import { createGame, type GameState, type MineType } from './game.ts'
import { AIRPLANE_ROW_MIN, AIRPLANE_ROW_MAX, AIRPLANE_CROSS_MS } from './config.ts'
import { COLS, ROWS, CANVAS_W } from './constants.ts'
import { makeTileGround, makeTileMine } from './sprites.ts'

// ── Helpers ─────────────────────────────────────────────────────────────────

function cellVariant(col: number, row: number): 'a' | 'b' {
  return (col + row) % 2 === 0 ? 'a' : 'b'
}

function emptyMap(): TileMap {
  const map = createTileMap(COLS, ROWS)
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++)
      map.setTile(col, row, makeTileGround(cellVariant(col, row), 'grass'))
  return map
}

function setMine(map: TileMap, col: number, row: number, type: MineType = 'normal'): void {
  map.setTile(col, row, makeTileMine(type, cellVariant(col, row), 'grass'))
}

// Reproduce the seeded spawn draw in the SAME order spawnFriendlyPlane uses
// (chance for direction, then range for the row) so a test can predict them.
function predict(seed: string, index = 0): { goRight: boolean; row: number } {
  const rng = createRng(`${seed}:friendly${index}`)
  const goRight = rng.chance(0.5)
  const row = rng.range(AIRPLANE_ROW_MIN, AIRPLANE_ROW_MAX + 1)
  return { goRight, row }
}

// A game on a known seed with a blank, mine-free field we can populate by hand.
function freshGame(seed = 'friendly-test'): GameState {
  const state = createGame(0, 0, seed)
  state.map = emptyMap()
  state.revealedMines = []
  state.friendlyPlane = null
  state.friendlyPassIndex = 0
  return state
}

// ── Seeding / determinism ─────────────────────────────────────────────────────

describe('spawnFriendlyPlane — seeding', () => {
  it('row and direction are purely seeded (identical for the same seed + index)', () => {
    const a = freshGame('daily-42')
    const b = freshGame('daily-42')
    expect(spawnFriendlyPlane(a)).toBe(true)
    expect(spawnFriendlyPlane(b)).toBe(true)
    expect(a.friendlyPlane!.row).toBe(b.friendlyPlane!.row)
    expect(a.friendlyPlane!.dir).toBe(b.friendlyPlane!.dir)
  })

  it('matches the predicted seeded draw', () => {
    const state = freshGame('daily-7')
    const { goRight, row } = predict('daily-7', 0)
    spawnFriendlyPlane(state)
    expect(state.friendlyPlane!.row).toBe(row)
    expect(state.friendlyPlane!.dir).toBe(goRight ? 1 : -1)
  })

  it('advances the pass index so the next flight uses a fresh stream', () => {
    const state = freshGame()
    spawnFriendlyPlane(state)
    expect(state.friendlyPassIndex).toBe(1)
    state.friendlyPlane = null            // simulate the first plane having left
    spawnFriendlyPlane(state)
    expect(state.friendlyPassIndex).toBe(2)
  })

  it('an unseeded (random) run still spawns without throwing', () => {
    const state = freshGame()
    state.dropSeedBase = null
    expect(() => spawnFriendlyPlane(state)).not.toThrow()
    expect(state.friendlyPlane).not.toBeNull()
  })
})

// ── Reveal snapshot ─────────────────────────────────────────────────────────

describe('spawnFriendlyPlane — reveal snapshot', () => {
  it('reveals every live mine currently in the flown row', () => {
    const state = freshGame('daily-7')
    const { row } = predict('daily-7', 0)
    setMine(state.map, 2, row)
    setMine(state.map, 5, row)
    setMine(state.map, 9, row)
    setMine(state.map, 4, row === 3 ? 4 : 3)   // a mine in a DIFFERENT row — must be ignored

    spawnFriendlyPlane(state)

    const inRow = state.revealedMines.filter((m) => m.row === row).map((m) => m.col).sort((x, y) => x - y)
    expect(inRow).toEqual([2, 5, 9])
    expect(state.revealedMines.every((m) => m.row === row)).toBe(true)  // the off-row mine was not revealed
    expect(state.friendlyPlane!.reveals.map((m) => m.col).sort((x, y) => x - y)).toEqual([2, 5, 9])
  })

  it('is a snapshot — mines added to the row AFTER the flyover stay hidden', () => {
    const state = freshGame('daily-7')
    const { row } = predict('daily-7', 0)
    setMine(state.map, 2, row)
    spawnFriendlyPlane(state)
    const before = state.revealedMines.length

    setMine(state.map, 8, row)   // a later airdrop into the same row
    expect(state.revealedMines.length).toBe(before)
    expect(state.revealedMines.some((m) => m.col === 8 && m.row === row)).toBe(false)
  })

  it('does not double-add a mine already revealed (e.g. by the cyan reward)', () => {
    const state = freshGame('daily-7')
    const { row } = predict('daily-7', 0)
    setMine(state.map, 3, row)
    state.revealedMines.push({ col: 3, row })   // pretend cyan already exposed it
    spawnFriendlyPlane(state)
    expect(state.revealedMines.filter((m) => m.col === 3 && m.row === row).length).toBe(1)
  })
})

// ── One-at-a-time guard ─────────────────────────────────────────────────────

describe('spawnFriendlyPlane — single flight', () => {
  it('refuses a second plane while one is airborne, without burning the seed index', () => {
    const state = freshGame()
    expect(spawnFriendlyPlane(state)).toBe(true)
    expect(spawnFriendlyPlane(state)).toBe(false)
    expect(state.friendlyPassIndex).toBe(1)   // the blocked call must not advance the stream
  })
})

// ── Flight / despawn ─────────────────────────────────────────────────────────

describe('updateFriendlyPlane', () => {
  it('moves in its heading and despawns once fully offscreen', () => {
    const state = freshGame()
    spawnFriendlyPlane(state)
    const startX = state.friendlyPlane!.x
    updateFriendlyPlane(state, 16)
    // it advanced (sign depends on the seeded direction, but it must have moved)
    expect(Math.abs(startX)).toBeLessThan(CANVAS_W + 32)  // sanity: started near an edge
    // one full crossing carries it off the far edge → cleared
    updateFriendlyPlane(state, AIRPLANE_CROSS_MS)
    expect(state.friendlyPlane).toBeNull()
  })

  it('is a no-op when no friendly plane is in the air', () => {
    const state = freshGame()
    expect(() => updateFriendlyPlane(state, 16)).not.toThrow()
    expect(state.friendlyPlane).toBeNull()
  })
})
