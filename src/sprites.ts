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

// ─── Building parts (8×8) — composed by createBuilding into a high-angle box ────
// Seen from above: a big textured grey ROOF dominates; only a thin 2-row brick
// front face + a 1-row white concrete foundation are visible below it. Mines
// never sit on any of these (they're solid, non-ground).

// Roof — WHITE dithered on BLACK = authentic ZX "grey" (no grey hex exists).
// Three weathering shades, scattered per-cell (roofVariant) so the roof reads
// as a mottled surface instead of a sterile flat fill.
export const BUILDING_ROOF_MID = new Uint8Array([
  0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55, 0xAA, 0x55,  // 50% grey
])
export const BUILDING_ROOF_LIGHT = new Uint8Array([
  0xDD, 0x77, 0xDD, 0x77, 0xDD, 0x77, 0xDD, 0x77,  // denser → lighter patch
])
export const BUILDING_ROOF_DARK = new Uint8Array([
  0x88, 0x22, 0x88, 0x22, 0x88, 0x22, 0x88, 0x22,  // sparser → darker patch
])

// Eave — the roof's bottom lip: grey on top, a black overhang shadow below.
// Sells the height step from roof down to the front wall.
export const BUILDING_EAVE = new Uint8Array([
  0xAA, // #.#.#.#.
  0x55, // .#.#.#.#
  0xAA, // #.#.#.#.
  0x55, // .#.#.#.#
  0xAA, // #.#.#.#.
  0x55, // .#.#.#.#
  0x00, // ........  overhang shadow
  0x00, // ........
])

// Brick — clean running-bond bricks (3px courses, staggered joints), tiles
// vertically for the 2-row face. Bright B_RED front; dark RED at the box edges.
export const BUILDING_BRICK = new Uint8Array([
  0x00, // ........  mortar
  0xFE, // #######.  brick course (joint at right)
  0xFE, // #######.
  0xFE, // #######.
  0x00, // ........  mortar
  0xEF, // ###.####  brick course (joint staggered)
  0xEF, // ###.####
  0xEF, // ###.####
])

// Window — 2×2 lit yellow panes set into the brick (paper = brick red)
export const BUILDING_WINDOW = new Uint8Array([
  0x00, // ........
  0x00, // ........
  0x66, // .##..##.  upper panes
  0x66, // .##..##.
  0x00, // ........  glazing bar
  0x66, // .##..##.  lower panes
  0x66, // .##..##.
  0x00, // ........
])

// Foundation — bright white concrete footing (distinct from the grey roof)
export const BUILDING_CONCRETE = new Uint8Array([
  0x77, // .###.###
  0xFF, // ########
  0xEE, // ###.###.
  0xFF, // ########
  0x77, // .###.###
  0xFF, // ########
  0xEE, // ###.###.
  0xFF, // ########
])

// Chimney — capped stack on the roof (white on black halo, like the reference)
export const BUILDING_CHIMNEY = new Uint8Array([
  0x00, // ........
  0x7E, // .######.  cap
  0x7E, // .######.
  0x3C, // ..####..  stack
  0x3C, // ..####..
  0x3C, // ..####..
  0x3C, // ..####..
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

// Mine-detector meter LEDs (HUD only). Round to echo the circular mine sprite:
// a lit segment is a filled disc in its danger colour; an unlit one is a dim
// ring (blue on black) — together an 8-segment Geiger meter (count =
// countWarningMines, parity with the beep).
export const LED_ON = new Uint8Array([
  0x3C, // ..####..
  0x7E, // .######.
  0xFF, // ########
  0xFF, // ########
  0xFF, // ########
  0xFF, // ########
  0x7E, // .######.
  0x3C, // ..####..
])
export const LED_OFF = new Uint8Array([
  0x3C, // ..####..
  0x42, // .#....#.
  0x81, // #......#
  0x81, // #......#
  0x81, // #......#
  0x81, // #......#
  0x42, // .#....#.
  0x3C, // ..####..
])

// Directional density arrows (accessibility HUD) — solid triangles pointing
// N/S/E/W, drawn in a dim ink. The visual twin of the audio compass cue: they
// show which way the most mines lie (dominantMineDir). Kept small and weak.
export const ARROW_N = new Uint8Array([
  0x00, // ........
  0x18, // ...##...
  0x3C, // ..####..
  0x7E, // .######.
  0xFF, // ########
  0x18, // ...##...
  0x18, // ...##...
  0x00, // ........
])
export const ARROW_S = new Uint8Array([
  0x00, // ........
  0x18, // ...##...
  0x18, // ...##...
  0xFF, // ########
  0x7E, // .######.
  0x3C, // ..####..
  0x18, // ...##...
  0x00, // ........
])
export const ARROW_E = new Uint8Array([
  0x00, // ........
  0x10, // ...#....
  0x18, // ...##...
  0x1C, // ...###..
  0xFE, // #######.
  0x1C, // ...###..
  0x18, // ...##...
  0x10, // ...#....
])
export const ARROW_W = new Uint8Array([
  0x00, // ........
  0x08, // ....#...
  0x18, // ...##...
  0x38, // ..###...
  0x7F, // .#######
  0x38, // ..###...
  0x18, // ...##...
  0x08, // ....#...
])

// Perimeter fence — a chain-link mesh that tiles seamlessly (X diagonals).
// Placeholder art: owner is art director and may refine the look later.
const FENCE = new Uint8Array([
  0x81, // #......#
  0x42, // .#....#.
  0x24, // ..#..#..
  0x18, // ...##...
  0x18, // ...##...
  0x24, // ..#..#..
  0x42, // .#....#.
  0x81, // #......#
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

// Colour is the gem kind's ink (see GEM_KINDS in game.ts); kind is stored so the
// field tile, save and HUD inventory all agree. Defaults keep no-arg callers
// (tests, legacy saves) working as a plain cyan gem.
export function makeTileGem(kind = 'cyan', color: SpectrumColor = C.CYAN): Tile {
  return {
    sprite: GEM,
    ink: color,
    paper: C.BLACK,
    solid: false,
    id: 'gem',
    metadata: { gemKind: kind },
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

// NOTE: flags are NOT tiles. They live in GameState.flags (a pure overlay set,
// keyed by game.ts cellKey) and are drawn by the renderer's drawFlags on top of
// the map — so no tile rewrite can ever eat one. The FLAG sprite above is their
// only footprint in this file.

// 'brick' = bright front face, 'side' = the box's darker edge columns (same
// sprite, dimmer ink). 'roof' picks a weathering shade from the cell position.
export type BuildingPart = 'roof' | 'eave' | 'brick' | 'side' | 'window' | 'concrete' | 'chimney'

const BUILDING_SPRITE: Record<Exclude<BuildingPart, 'roof'>, Uint8Array> = {
  eave: BUILDING_EAVE,
  brick: BUILDING_BRICK,
  side: BUILDING_BRICK,
  window: BUILDING_WINDOW,
  concrete: BUILDING_CONCRETE,
  chimney: BUILDING_CHIMNEY,
}

const BUILDING_INK: Record<BuildingPart, SpectrumColor> = {
  roof: C.WHITE,      // grey (dithered)
  eave: C.WHITE,
  brick: C.B_RED,     // bright front
  side: C.RED,        // dark edge → 3D
  window: C.B_YELLOW, // lit panes
  concrete: C.WHITE,  // white footing
  chimney: C.WHITE,
}

// Window panes glow yellow over a brick-red frame; everything else is on black.
const BUILDING_PAPER: Partial<Record<BuildingPart, SpectrumColor>> = {
  window: C.B_RED,
}

// Deterministic per-cell roof shade — a pure function of position, so the same
// building location always weathers identically (and the field is seed-stable).
function roofVariant(col: number, row: number): Uint8Array {
  const h = ((col * 73856093) ^ (row * 19349663)) >>> 0
  const k = h % 8
  return k >= 7 ? BUILDING_ROOF_DARK : k >= 5 ? BUILDING_ROOF_LIGHT : BUILDING_ROOF_MID
}

// A single building cell. The whole high-angle box is built from these by
// createBuilding (buildings.ts). `solid: true` blocks movement AND — because
// mines/airplane drops only ever target `ground` — keeps every building cell
// permanently mine-free for free. `col`/`row` only matter for 'roof' shading.
export function makeTileBuilding(part: BuildingPart, col = 0, row = 0): Tile {
  return {
    sprite: part === 'roof' ? roofVariant(col, row) : BUILDING_SPRITE[part],
    ink: BUILDING_INK[part],
    paper: BUILDING_PAPER[part] ?? C.BLACK,
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

// Perimeter fence cell. Like a building, `solid: true` blocks movement and — since
// mines/airplane drops only target `ground` — stays mine-free for free. Distinct
// `id`/sprite so it reads as a fence (not a building), survives the night overlay
// (only ground/mine are blacked out), and is de-trapped by fixObstacleTraps. The
// perimeter is structural, so it is uniform (no terrain/variant).
export function makeTileFence(): Tile {
  return {
    sprite: FENCE,
    ink: C.WHITE,
    paper: C.BLACK,
    solid: true,
    id: 'fence',
  }
}

