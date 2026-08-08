import { describe, it, expect } from 'vitest'
import { hiddenAtNight } from '../src/renderer.ts'
import { C } from '../src/constants.ts'
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
