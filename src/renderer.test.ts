import { describe, it, expect } from 'vitest'
import { hiddenAtNight } from './renderer.ts'
import { C } from './constants.ts'
import { makeTileGround, makeTileMine, makeTileGem, makeTileVisited, makeTileFence, flagTile, TILE_EXPLODED } from './sprites.ts'

// The contract behind renderFrame's night overlay: what may the night hide?
// REGRESSION (2026-07-04): 0.47.0 turned flags into a pure metadata overlay
// (the tile keeps its true id — correct), which silently put flagged tiles back
// into the overlay's findById('ground'/'mine') sweeps: existing flags vanished
// at night and a freshly placed one looked like the key did nothing. These
// tests pin the rule so no future sweep can black out a flag again.
describe('hiddenAtNight', () => {
  it('hides unvisited, unflagged terrain: ground and undetonated mines', () => {
    expect(hiddenAtNight(makeTileGround('a', 'grass'))).toBe(true)
    expect(hiddenAtNight(makeTileMine('normal', 'a', 'grass'))).toBe(true)
    expect(hiddenAtNight(makeTileMine('beacon', 'b', 'snow'))).toBe(true)
  })

  it('REGRESSION: a FLAGGED ground or mine stays visible at night', () => {
    expect(hiddenAtNight(flagTile(makeTileGround('a', 'grass')))).toBe(false)
    expect(hiddenAtNight(flagTile(makeTileMine('normal', 'a', 'dust')))).toBe(false)
    expect(hiddenAtNight(flagTile(makeTileMine('cluster', 'b', 'snow')))).toBe(false)
  })

  it('never hides the player-facing landmarks: gems, visited trail, explosions, fence', () => {
    expect(hiddenAtNight(makeTileGem('cyan', C.CYAN))).toBe(false)
    expect(hiddenAtNight(makeTileVisited('a', 'grass'))).toBe(false)
    expect(hiddenAtNight(TILE_EXPLODED)).toBe(false)
    expect(hiddenAtNight(makeTileFence())).toBe(false)
  })
})
