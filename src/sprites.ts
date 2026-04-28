import { mirrorSprite } from 'zx-kit'
export { mirrorSprite }

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

// Airplane — simple silhouette facing right
export const AIRPLANE = new Uint8Array([
  0x00, // ........
  0x04, // .....#..  tail fin
  0x06, // .....##.
  0xFF, // ########  fuselage
  0xFF, // ########
  0x1E, // ...####.  wing
  0x04, // .....#..
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

