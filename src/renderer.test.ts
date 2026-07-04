import { describe, it, expect } from 'vitest'
import { hiddenAtNight } from './renderer.ts'
import { C } from './constants.ts'
import { makeTileGround, makeTileMine, makeTileGem, makeTileVisited, makeTileFence, TILE_EXPLODED } from './sprites.ts'

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
