// Accessibility bridge — mirrors the beeper into text for screen readers, and
// builds the shared sentence that both the ARIA live region (now) and a future
// TTS voice (later) speak. One formatter, two output channels — see describeStep.
//
// The live-region *elements* live in index.html (#sr-announcer assertive,
// #sr-status polite, #sr-legend static). This module only writes into them, and
// guards every DOM touch so the pure-logic tests run headless.

import { L } from './lang.ts'
import { type GameState, type Compass, countAdjacentMines, countBeaconSignals, dominantMineDir } from './game.ts'

function el(id: string): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.getElementById(id)
}

// Screen readers do NOT re-read a live region whose text is byte-identical to
// last time. After a step the danger sentence is often unchanged ("still 2 mines
// adjacent") yet the player DID act and must hear it again — so we toggle an
// invisible trailing marker to force every announcement through.
let announceToggle = false

/** Urgent, interrupting — mine warnings, danger, death. Writes #sr-announcer. */
export function announce(text: string): void {
  const node = el('sr-announcer')
  if (!node) return
  announceToggle = !announceToggle
  node.textContent = announceToggle ? text : text + ' '  // NBSP is not trimmed → distinct text
}

// Polite, queued — score, level, mode, menu. Deduped: identical consecutive
// status lines aren't worth re-speaking (unlike danger, they're not per-step).
let lastStatus = ''

/** Non-urgent, queued behind speech in progress. Writes #sr-status. */
export function status(text: string): void {
  const node = el('sr-status')
  if (!node || text === lastStatus) return
  lastStatus = text
  node.textContent = text
}

/** Fills the static, navigable audio legend (#sr-legend). Call on init and on
 *  every locale change so the explanation always matches the spoken language. */
export function setLegend(text: string): void {
  const node = el('sr-legend')
  if (node) node.textContent = text
}

/**
 * The one sentence describing the player's current cell — read by the ARIA
 * region today, by TTS tomorrow. Deliberately mirrors exactly what the HUD and
 * the beeper convey, so no channel says more than another:
 *   - immediate adjacent count (↔ detector meter, ↔ warning beep),
 *   - beacon presence (↔ cyan lamp),
 *   - dominant mine direction (↔ dim arrow, ↔ audio compass cue).
 * Same signal everywhere = channel parity (AGENTS.md accessibility invariant).
 */
export function describeStep(state: GameState): string {
  const adjacent = countAdjacentMines(state.map, state.playerCol, state.playerRow)
  const beacon = countBeaconSignals(state.map, state.playerCol, state.playerRow)
  const dir: Compass | null = dominantMineDir(state.map, state.playerCol, state.playerRow)

  const parts: string[] = []
  if (adjacent === 0 && beacon === 0) parts.push(L.STR_A11Y_SAFE)
  else {
    if (adjacent > 0) parts.push(L.STR_A11Y_ADJ(adjacent))   // skip "0 mines" on a beacon-only cell
    if (beacon > 0) parts.push(L.STR_A11Y_BEACON)
  }
  if (dir) parts.push(L.STR_A11Y_MORE(L.STR_A11Y_DIR(dir)))
  return parts.join(' ')
}
