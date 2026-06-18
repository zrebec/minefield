// Game-specific grid constants — palette/colours re-exported from zx-kit
export { SCALE, CELL, C, type SpectrumColor } from 'zx-kit'

export const COLS = 32
export const ROWS = 21        // playfield rows (0..ROWS-1)
export const STATUS_ROWS = 3  // bottom HUD: top row reserved (empty for now) + 2 content rows
export const CANVAS_W = 256   // COLS * CELL
export const CANVAS_H = 192   // (ROWS + STATUS_ROWS) * CELL = 24 * 8
