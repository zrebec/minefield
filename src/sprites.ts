import { mirrorSprite } from 'zx-kit'
import type { Tile, SpectrumColor } from 'zx-kit'
import { C } from './constants.ts'
export { mirrorSprite }
export type { Tile }

export type TerrainType = 'grass' | 'snow' | 'dust'

// Ink colours for checkerboard variants a/b per terrain
const TERRAIN_INK: Record<TerrainType, [SpectrumColor, SpectrumColor]> = {
  grass: [C.B_GREEN,  C.GREEN ],
  snow:  [C.B_WHITE,  C.WHITE ],
  dust:  [C.B_YELLOW, C.YELLOW],
}

// Visited-path ink per terrain — chosen for maximum contrast on that background
const TERRAIN_VISITED_INK: Record<TerrainType, SpectrumColor> = {
  grass: C.B_YELLOW,
  snow:  C.B_CYAN,
  dust:  C.B_WHITE,
}

// All sprites: 8×8 pixels, each byte = one row, bit7 = leftmost pixel

// Player walk frames — A: legs apart, B: legs together
// RIGHT / LEFT (side view, symmetric — LEFT is mirrored at module init)
export const PLAYER_RIGHT_A = new Uint8Array([
  0x18, // ...##...  head
  0x3C, // ..####..
  0x18, // ...##...  neck
  0x7E, // .######.  arms
  0x18, // ...##...  torso
  0x3C, // ..####..  hips
  0x24, // ..#..#..  legs apart
  0x66, // .##..##.  boots
])
export const PLAYER_RIGHT_B = new Uint8Array([
  0x18, // ...##...  head
  0x3C, // ..####..
  0x18, // ...##...  neck
  0x7E, // .######.  arms
  0x18, // ...##...  torso
  0x3C, // ..####..  hips
  0x18, // ...##...  legs together
  0x3C, // ..####..  boots
])
export const PLAYER_LEFT_A = mirrorSprite(PLAYER_RIGHT_A)
export const PLAYER_LEFT_B = mirrorSprite(PLAYER_RIGHT_B)

// UP: back of head (no face)
export const PLAYER_UP_A = new Uint8Array([
  0x3C, // ..####..  back of head
  0x7E, // .######.
  0x18, // ...##...  neck
  0x7E, // .######.  arms
  0x18, // ...##...  back
  0x3C, // ..####..  hips
  0x24, // ..#..#..  legs apart
  0x66, // .##..##.  boots
])
export const PLAYER_UP_B = new Uint8Array([
  0x3C, 0x7E, 0x18, 0x7E, 0x18, 0x3C,
  0x18, // ...##...  legs together
  0x3C, // ..####..  boots
])

// DOWN: front face (dot eyes visible)
export const PLAYER_DOWN_A = new Uint8Array([
  0x3C, // ..####..  head
  0x7E, // .######.
  0x42, // .#....#.  eyes
  0x7E, // .######.  arms
  0x18, // ...##...  torso
  0x3C, // ..####..  hips
  0x24, // ..#..#..  legs apart
  0x66, // .##..##.  boots
])
export const PLAYER_DOWN_B = new Uint8Array([
  0x3C, 0x7E, 0x42, 0x7E, 0x18, 0x3C,
  0x18, // ...##...  legs together
  0x3C, // ..####..  boots
])

// Mine — circular body with spikes
export const MINE = new Uint8Array([
  0x00, // ........
  0x54, // .#.#.#..  spikes
  0x38, // ..###...  top arc
  0xFE, // #######.  body
  0xFE, // #######.
  0x38, // ..###...  bottom arc
  0x54, // .#.#.#..  spikes
  0x00, // ........
])

// Explosion frame 1 — burst
export const EXPLOSION_1 = new Uint8Array([
  0x42, // .#....#.
  0xA5, // #.#..#.#
  0x5A, // .#.##.#.
  0x3C, // ..####..
  0x3C, // ..####..
  0x5A, // .#.##.#.
  0xA5, // #.#..#.#
  0x42, // .#....#.
])

// Explosion frame 2 — expanding
export const EXPLOSION_2 = new Uint8Array([
  0x81, // #......#
  0x42, // .#....#.
  0x24, // ..#..#..
  0x18, // ...##...
  0x18, // ...##...
  0x24, // ..#..#..
  0x42, // .#....#.
  0x81, // #......#
])

// Airplane — simple silhouette
export const AIRPLANE_RIGHT = new Uint8Array([
  0x00, // ........
  0x04, // .....#..  tail fin
  0x06, // .....##.
  0xFF, // ########  fuselage
  0xFF, // ########
  0x1E, // ...####.  wing
  0x04, // .....#..
  0x00, // ........
])
export const AIRPLANE_LEFT = mirrorSprite(AIRPLANE_RIGHT)

// Heart — life indicator
export const HEART = new Uint8Array([
  0x00, // ........
  0x66, // .##..##.  two bumps
  0xFE, // #######.
  0xFE, // #######.
  0x7C, // .#####..
  0x38, // ..###...
  0x10, // ...#....  tip
  0x00, // ........
])

// Flag — pole with flag on top
export const FLAG = new Uint8Array([
  0x40, // .#......  pole top
  0x70, // .###....  flag
  0x40, // .#......
  0x40, // .#......
  0x40, // .#......
  0x40, // .#......
  0x7E, // .######.  base
  0x00, // ........
])

// Ground texture A (checkerboard variant 1)
export const GROUND_A = new Uint8Array([
  0x55, // .#.#.#.#
  0x00, // ........
  0x55, // .#.#.#.#
  0x00, // ........
  0x55, // .#.#.#.#
  0x00, // ........
  0x55, // .#.#.#.#
  0x00, // ........
])

// Ground texture B (checkerboard variant 2, offset)
export const GROUND_B = new Uint8Array([
  0xAA, // #.#.#.#.
  0x00, // ........
  0xAA, // #.#.#.#.
  0x00, // ........
  0xAA, // #.#.#.#.
  0x00, // ........
  0xAA, // #.#.#.#.
  0x00, // ........
])

// ─── Building parts (8×8) — composed by createBuilding into a pseudo-3D box ─────
// A building is a solid block of these tiles: grey roof on top, brick front +
// darker side walls, a door and a foundation row. Mines never sit on them.

// Roof — 50% dither of WHITE on BLACK reads as authentic ZX "grey" (no grey hex exists)
export const BUILDING_ROOF = new Uint8Array([
  0xAA, // #.#.#.#.
  0x55, // .#.#.#.#
  0xAA, // #.#.#.#.
  0x55, // .#.#.#.#
  0xAA, // #.#.#.#.
  0x55, // .#.#.#.#
  0xAA, // #.#.#.#.
  0x55, // .#.#.#.#
])

// Roof right edge / eave — grey dither with a lit right fascia → the roof overhang
export const BUILDING_EAVE = new Uint8Array([
  0xAB, // #.#.#.##
  0x57, // .#.#.###
  0xAB, // #.#.#.##
  0x57, // .#.#.###
  0xAB, // #.#.#.##
  0x57, // .#.#.###
  0xAB, // #.#.#.##
  0x57, // .#.#.###
])

// Brick wall — running-bond bricks split by black mortar; tiles vertically.
// Used for the bright front face (B_RED) and the shaded side face (RED).
export const BUILDING_BRICK = new Uint8Array([
  0x00, // ........  mortar
  0xFE, // #######.  brick course (joint at right)
  0xFE, // #######.
  0x00, // ........  mortar
  0xEF, // ###.####  brick course (joint staggered)
  0xEF, // ###.####
  0x00, // ........  mortar
  0xFE, // #######.
])

// Door — arched opening in the front wall (cosmetic; the tile is still solid)
export const BUILDING_DOOR = new Uint8Array([
  0x00, // ........
  0x3C, // ..####..  arch
  0x66, // .##..##.
  0x66, // .##..##.
  0x66, // .##..##.
  0x66, // .##..##.
  0x66, // .##..##.
  0x66, // .##..##.
])

// Foundation — solid footing band grounding the building to the field
export const BUILDING_BASE = new Uint8Array([
  0xFF, // ########  foundation
  0xFF, // ########
  0xFF, // ########
  0x00, // ........
  0x00, // ........
  0x00, // ........
  0x00, // ........
  0x00, // ........
])

// Gem — diamond collectible
export const GEM = new Uint8Array([
  0x18, // ...##...
  0x3C, // ..####..
  0x7E, // .######.
  0xFF, // ########
  0xFF, // ########
  0x7E, // .######.
  0x3C, // ..####..
  0x18, // ...##...
])

// ─── Tile factories ───────────────────────────────────────────────────────────
// variant 'a' = (col+row)%2===0, 'b' = odd — encodes checkerboard parity

export type CellVariant = 'a' | 'b'

export function makeTileGround(variant: CellVariant, terrain: TerrainType): Tile {
  const [inkA, inkB] = TERRAIN_INK[terrain]
  return {
    sprite: variant === 'a' ? GROUND_A : GROUND_B,
    ink: variant === 'a' ? inkA : inkB,
    paper: C.BLACK,
    solid: false,
    id: 'ground',
    metadata: { variant, terrain },
  }
}

// Hidden mine — visually identical to ground, logical state encoded in id/metadata
export function makeTileMine(mineType: string, variant: CellVariant, terrain: TerrainType): Tile {
  const [inkA, inkB] = TERRAIN_INK[terrain]
  return {
    sprite: variant === 'a' ? GROUND_A : GROUND_B,
    ink: variant === 'a' ? inkA : inkB,
    paper: C.BLACK,
    solid: false,
    id: 'mine',
    metadata: { mineType, variant, terrain },
  }
}

export function makeTileGem(): Tile {
  return {
    sprite: GEM,
    ink: C.B_CYAN,
    paper: C.BLACK,
    solid: false,
    id: 'gem',
  }
}

export function makeTileVisited(variant: CellVariant, terrain: TerrainType): Tile {
  return {
    sprite: variant === 'a' ? GROUND_A : GROUND_B,
    ink: TERRAIN_VISITED_INK[terrain],
    paper: C.BLACK,
    solid: false,
    id: 'visited',
    metadata: { variant, terrain },
  }
}

// underneath: original tile id before flag was placed; needed to restore on unflag
export function makeTileFlag(
  underneath: string,
  mineType: string | undefined,
  variant: CellVariant | undefined,
): Tile {
  return {
    sprite: FLAG,
    ink: C.B_CYAN,
    paper: C.BLACK,
    solid: false,
    id: 'flag',
    metadata: { underneath, mineType, variant },
  }
}

export type BuildingPart = 'roof' | 'eave' | 'wall' | 'side' | 'door' | 'base'

const BUILDING_SPRITE: Record<BuildingPart, Uint8Array> = {
  roof: BUILDING_ROOF,
  eave: BUILDING_EAVE,
  wall: BUILDING_BRICK,
  side: BUILDING_BRICK,
  door: BUILDING_DOOR,
  base: BUILDING_BASE,
}

// Ink per part — grey roof (white dither), bright-red front vs dark-red side
// gives the cheap pseudo-3D shading; warm door; dark foundation.
const BUILDING_INK: Record<BuildingPart, SpectrumColor> = {
  roof: C.WHITE,
  eave: C.WHITE,
  wall: C.B_RED,
  side: C.RED,
  door: C.B_YELLOW,
  base: C.RED,
}

// A single building cell. The whole pseudo-3D box is built from these by
// createBuilding (buildings.ts). `solid: true` blocks movement AND — because
// mines/airplane drops only ever target `ground` — keeps every building cell
// permanently mine-free for free.
export function makeTileBuilding(part: BuildingPart): Tile {
  return {
    sprite: BUILDING_SPRITE[part],
    ink: BUILDING_INK[part],
    paper: C.BLACK,
    solid: true,
    id: 'building',
    metadata: { part },
  }
}

export const TILE_EXPLODED: Tile = {
  sprite: EXPLOSION_2,
  ink: C.B_YELLOW,
  paper: C.BLACK,
  solid: false,
  id: 'exploded',
}

