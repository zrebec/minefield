// Technické konštanty — rozlíšenie, grid, paleta. Pre herné nastavenia pozri config.ts

export const SCALE = 4
export const CELL = 8
export const COLS = 32
export const ROWS = 22
export const STATUS_ROWS = 2
export const CANVAS_W = COLS * CELL
export const CANVAS_H = (ROWS + STATUS_ROWS) * CELL  // 192

// ZX Spectrum palette — VÝHRADNE tieto hodnoty, žiadne iné hex kódy
export const C = {
  BLACK:     '#000000',
  BLUE:      '#0000CD',
  RED:       '#CD0000',
  MAGENTA:   '#CD00CD',
  GREEN:     '#00CD00',
  CYAN:      '#00CDCD',
  YELLOW:    '#CDCD00',
  WHITE:     '#CDCDCD',
  B_BLACK:   '#000000',
  B_BLUE:    '#0000FF',
  B_RED:     '#FF0000',
  B_MAGENTA: '#FF00FF',
  B_GREEN:   '#00FF00',
  B_CYAN:    '#00FFFF',
  B_YELLOW:  '#FFFF00',
  B_WHITE:   '#FFFFFF',
} as const

export type SpectrumColor = typeof C[keyof typeof C]
