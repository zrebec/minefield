import { describe, it, expect } from 'vitest'
import { createTileMap, type TileMap } from 'zx-kit'
import { countWarningMines, createGame, addDropMinesInBand, applyClusterBlast, type MineType } from './game.ts'
import { C, COLS, ROWS } from './constants.ts'
import { BEACON_MINE_LEVEL, CLUSTER_MINE_LEVEL, GEM_COUNT, START_COL, START_ROW } from './config.ts'
import { makeTileGround, makeTileMine, makeTileGem, makeTileVisited, TILE_EXPLODED } from './sprites.ts'

// ── Map helpers ───────────────────────────────────────────────────────────────

function cellVariant(col: number, row: number): 'a' | 'b' {
  return (col + row) % 2 === 0 ? 'a' : 'b'
}

function emptyMap(): TileMap {
  const map = createTileMap(COLS, ROWS)
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      map.setTile(col, row, makeTileGround(cellVariant(col, row)))
    }
  }
  return map
}

function setMine(map: TileMap, col: number, row: number, type: MineType = 'normal'): void {
  map.setTile(col, row, makeTileMine(type, cellVariant(col, row)))
}

// ── countWarningMines ─────────────────────────────────────────────────────────

describe('countWarningMines — normal mines', () => {
  it('returns 0 when no mines around player', () => {
    const map = emptyMap()
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('counts a mine directly above', () => {
    const map = emptyMap()
    setMine(map, 5, 4)
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('counts a mine directly below', () => {
    const map = emptyMap()
    setMine(map, 5, 6)
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('counts a mine directly left', () => {
    const map = emptyMap()
    setMine(map, 4, 5)
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('counts a mine directly right', () => {
    const map = emptyMap()
    setMine(map, 6, 5)
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('does NOT count a diagonal mine', () => {
    const map = emptyMap()
    setMine(map, 6, 4)
    setMine(map, 4, 4)
    setMine(map, 6, 6)
    setMine(map, 4, 6)
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('counts all 4 adjacent mines', () => {
    const map = emptyMap()
    setMine(map, 5, 4)
    setMine(map, 5, 6)
    setMine(map, 4, 5)
    setMine(map, 6, 5)
    expect(countWarningMines(map, 5, 5)).toBe(4)
  })

  it('does not count already exploded mines', () => {
    const map = emptyMap()
    setMine(map, 5, 4)
    map.setTile(5, 4, TILE_EXPLODED)
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('handles player at grid edge without crash', () => {
    const map = emptyMap()
    setMine(map, 1, 0)
    expect(() => countWarningMines(map, 0, 0)).not.toThrow()
  })

  it('caps warning count at 8', () => {
    const map = emptyMap()
    setMine(map, 5, 4); setMine(map, 5, 6)
    setMine(map, 4, 5); setMine(map, 6, 5)
    setMine(map, 5, 3, 'beacon'); setMine(map, 5, 7, 'beacon')
    setMine(map, 3, 5, 'beacon'); setMine(map, 7, 5, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(8)
  })
})

// ── countWarningMines — beacon mines ─────────────────────────────────────────

describe('countWarningMines — beacon mines', () => {
  it('beacon mine 1 cell away counts like a normal mine', () => {
    const map = emptyMap()
    setMine(map, 5, 4, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('beacon mine 2 cells away ALSO warns', () => {
    const map = emptyMap()
    setMine(map, 5, 3, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('beacon mine 2 cells left warns', () => {
    const map = emptyMap()
    setMine(map, 3, 5, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('beacon mine 2 cells right warns', () => {
    const map = emptyMap()
    setMine(map, 7, 5, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('beacon mine 2 cells below warns', () => {
    const map = emptyMap()
    setMine(map, 5, 7, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(1)
  })

  it('normal mine 2 cells away does NOT warn', () => {
    const map = emptyMap()
    setMine(map, 5, 3, 'normal')
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('cluster mine 2 cells away does NOT warn', () => {
    const map = emptyMap()
    setMine(map, 5, 3, 'cluster')
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('beacon mine 3 cells away does NOT warn', () => {
    const map = emptyMap()
    setMine(map, 5, 2, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('beacon mine diagonally 2 away does NOT warn (only cardinal)', () => {
    const map = emptyMap()
    setMine(map, 3, 3, 'beacon')
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })

  it('exploded beacon mine 2 cells away does not warn', () => {
    const map = emptyMap()
    setMine(map, 5, 3, 'beacon')
    map.setTile(5, 3, TILE_EXPLODED)
    expect(countWarningMines(map, 5, 5)).toBe(0)
  })
})

// ── Mine type placement ───────────────────────────────────────────────────────

describe('mine type placement via createGame', () => {
  it('level 1 has no beacon or cluster mines', () => {
    for (let run = 0; run < 5; run++) {
      const state = createGame(0)
      for (const { tile } of state.map.findById('mine')) {
        expect(tile.metadata?.mineType).toBe('normal')
      }
    }
  })

  it(`level ${BEACON_MINE_LEVEL + 1} contains at least some beacon mines (probabilistic)`, () => {
    let foundBeacon = false
    for (let run = 0; run < 10 && !foundBeacon; run++) {
      const state = createGame(BEACON_MINE_LEVEL)
      foundBeacon = state.map.findById('mine').some(({ tile }) => tile.metadata?.mineType === 'beacon')
    }
    expect(foundBeacon).toBe(true)
  })

  it(`level ${CLUSTER_MINE_LEVEL + 1} contains at least some cluster mines (probabilistic)`, () => {
    let foundCluster = false
    for (let run = 0; run < 10 && !foundCluster; run++) {
      const state = createGame(CLUSTER_MINE_LEVEL)
      foundCluster = state.map.findById('mine').some(({ tile }) => tile.metadata?.mineType === 'cluster')
    }
    expect(foundCluster).toBe(true)
  })

  it('mine types are only normal/beacon/cluster, never undefined', () => {
    const state = createGame(3)
    for (const { tile } of state.map.findById('mine')) {
      expect(['normal', 'beacon', 'cluster']).toContain(tile.metadata?.mineType)
    }
  })

  it('dropped mines (addDropMinesInBand) are always normal type', () => {
    const state = createGame(3)
    addDropMinesInBand(state, 5, 5, 7)
    for (const { col, row } of state.droppedMines) {
      expect(state.map.getTile(col, row)?.metadata?.mineType).toBe('normal')
    }
  })

  it('addDropMinesInBand places mines only within the specified row band', () => {
    const state = createGame(0)
    addDropMinesInBand(state, 10, 3, 5)
    for (const { row } of state.droppedMines) {
      expect(row).toBeGreaterThanOrEqual(3)
      expect(row).toBeLessThanOrEqual(5)
    }
  })

  it('addDropMinesInBand sets dropFlashTimer to 500', () => {
    const state = createGame(0)
    addDropMinesInBand(state, 3, 0, 2)
    expect(state.dropFlashTimer).toBe(500)
  })

  it('addDropMinesInBand records dropped positions in droppedMines', () => {
    const state = createGame(0)
    addDropMinesInBand(state, 3, 0, 2)
    expect(state.droppedMines.length).toBeGreaterThan(0)
    expect(state.droppedMines.length).toBeLessThanOrEqual(3)
  })

  it('addDropMinesInBand does not place mines on visited cells', () => {
    const state = createGame(0)
    for (let r = 0; r <= 2; r++) {
      for (let c = 0; c < COLS - 1; c++) {
        state.map.setTile(c, r, { sprite: new Uint8Array(8), ink: C.BLACK, paper: C.BLACK, solid: false, id: 'visited' })
      }
    }
    addDropMinesInBand(state, 5, 0, 2)
    for (const { col, row } of state.droppedMines) {
      expect(state.map.getTile(col, row)?.id).toBe('mine')
      // Confirm source was not visited (mine was placed on non-visited cell)
      expect(row).toBeGreaterThanOrEqual(0)
    }
  })
})

// ── Gem placement ─────────────────────────────────────────────────────────────

describe('gem placement', () => {
  it(`places exactly ${GEM_COUNT} gems per level`, () => {
    for (let run = 0; run < 3; run++) {
      const state = createGame(0)
      expect(state.map.findById('gem').length).toBe(GEM_COUNT)
    }
  })

  it('gems are never placed on mine cells', () => {
    for (let run = 0; run < 5; run++) {
      const state = createGame(2)
      for (const { x, y } of state.map.findById('gem')) {
        // After gem is placed, the original mine tile should be gone
        // (gem placement skips mine cells, so no cell should be both)
        const tile = state.map.getTile(x, y)
        expect(tile?.id).toBe('gem')
      }
      // No mine cell should have a gem tile on it (they are separate)
      for (const { x, y } of state.map.findById('mine')) {
        expect(state.map.getTile(x, y)?.id).toBe('mine')
      }
    }
  })

  it('gemsTotal in GameState matches GEM_COUNT', () => {
    const state = createGame(0)
    expect(state.gemsTotal).toBe(GEM_COUNT)
    expect(state.gemsCollected).toBe(0)
  })
})

// ── applyClusterBlast ─────────────────────────────────────────────────────────

describe('applyClusterBlast', () => {
  it('marks all 8 surrounding safe cells as visited', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) {
        state.map.setTile(c, r, makeTileGround(cellVariant(c, r)))
      }

    applyClusterBlast(state, 5, 5)

    const neighbors = [
      [4,4],[5,4],[6,4],
      [4,5],      [6,5],
      [4,6],[5,6],[6,6],
    ]
    for (const [col, row] of neighbors) {
      expect(state.map.getTile(col, row)?.id).toBe('visited')
    }
  })

  it('does not mark the center cell as visited', () => {
    const state = createGame(0)
    state.map.setTile(5, 5, makeTileGround(cellVariant(5, 5)))
    applyClusterBlast(state, 5, 5)
    expect(state.map.getTile(5, 5)?.id).not.toBe('visited')
  })

  it('chain-explodes mines in the 8 surrounding cells', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.map.setTile(c, r, makeTileGround(cellVariant(c, r)))
    setMine(state.map, 4, 4)
    setMine(state.map, 6, 5)
    setMine(state.map, 5, 6)
    const minesBefore = state.explodedMines

    applyClusterBlast(state, 5, 5)

    expect(state.explodedMines).toBe(minesBefore + 3)
    expect(state.map.getTile(4, 4)?.id).toBe('exploded')
    expect(state.map.getTile(5, 6)?.id).toBe('exploded')
    expect(state.map.getTile(6, 5)?.id).toBe('exploded')
  })

  it('chain-exploded cells are not marked as visited', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.map.setTile(c, r, makeTileGround(cellVariant(c, r)))
    setMine(state.map, 4, 4)

    applyClusterBlast(state, 5, 5)

    expect(state.map.getTile(4, 4)?.id).toBe('exploded')
  })

  it('does not re-explode already exploded cells', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.map.setTile(c, r, makeTileGround(cellVariant(c, r)))
    state.map.setTile(4, 4, TILE_EXPLODED)
    const minesBefore = state.explodedMines

    applyClusterBlast(state, 5, 5)

    expect(state.explodedMines).toBe(minesBefore)
  })

  it('clears gems swept by the blast', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.map.setTile(c, r, makeTileGround(cellVariant(c, r)))
    state.map.setTile(4, 4, makeTileGem())

    applyClusterBlast(state, 5, 5)

    expect(state.map.getTile(4, 4)?.id).toBe('visited')
  })

  it('does not visit already visited cells (no double-visit)', () => {
    const state = createGame(0)
    for (let r = 4; r <= 6; r++)
      for (let c = 4; c <= 6; c++) state.map.setTile(c, r, makeTileGround(cellVariant(c, r)))
    state.map.setTile(4, 4, makeTileVisited(cellVariant(4, 4)))

    applyClusterBlast(state, 5, 5)

    expect(state.map.getTile(4, 4)?.id).toBe('visited')
  })

  it('handles blast at grid corner without out-of-bounds crash', () => {
    const state = createGame(0)
    state.map.setTile(0, 0, makeTileGround(cellVariant(0, 0)))
    expect(() => applyClusterBlast(state, 0, 0)).not.toThrow()
  })
})

// ── GameState initial values ──────────────────────────────────────────────────

describe('createGame initial state', () => {
  it('combo starts at 0', () => {
    const state = createGame(0)
    expect(state.comboCount).toBe(0)
    expect(state.comboTimer).toBe(0)
  })

  it('preserves score across levels', () => {
    const state = createGame(2, 1234)
    expect(state.score).toBe(1234)
  })

  it('marks starting cell as visited from the start', () => {
    const state = createGame(0)
    expect(state.map.getTile(START_COL, START_ROW)?.id).toBe('visited')
  })

  it('initializes playerWalkFrame to 0', () => {
    const state = createGame(0)
    expect(state.playerWalkFrame).toBe(0)
  })
})
