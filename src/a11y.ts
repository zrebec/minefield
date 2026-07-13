// Accessibility bridge — writes the game's spoken state into the ARIA live
// regions (index.html) so the player's own screen reader reads it. Danger is
// NOT spoken here: the warning beep + visual detector already carry it with
// channel parity, so this module speaks only orientation (exit/gems), the
// legend, and shell/status lines. The screen reader talks — the game never TTSes.
//
// The live-region *elements* live in index.html (#sr-announcer assertive,
// #sr-status polite, #sr-legend static). This module only writes into them, and
// guards every DOM touch so the pure-logic tests run headless.

import { L } from './lang.ts'
import { COLS } from './constants.ts'
import { type GameState } from './game.ts'

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

// ── Orientation (Item C) — exit + gems as a relative bearing ──────────────────
// A blind player can't see the field a sighted one scouts (exit hole, gems). These
// on-demand announcements close that gap. Mines are NOT here — they stay hidden for
// everyone (parity, not an assist), so nothing below leaks the puzzle. All derived
// from deterministic state, so the daily reads identically for all.

// "22 right, 3 up" from a player→target delta (screen axes: +col = right, +row =
// down). Drops a zero component; both zero → "here". The building block shared by
// all three formatters, matching how the compass-free bearing reads aloud.
function relPhrase(dCol: number, dRow: number): string {
  const parts: string[] = []
  if (dCol !== 0) parts.push(`${Math.abs(dCol)} ${dCol > 0 ? L.STR_A11Y_RIGHT : L.STR_A11Y_LEFT}`)
  if (dRow !== 0) parts.push(`${Math.abs(dRow)} ${dRow > 0 ? L.STR_A11Y_DOWN : L.STR_A11Y_UP}`)
  return parts.length === 0 ? L.STR_A11Y_HERE : parts.join(', ')
}

// Delta from the player to the exit hole — the single gap in the right fence
// (column COLS-1, row state.exitRow). Shared by describeExit + describeOrientation.
function exitBearing(state: GameState): string {
  return relPhrase(COLS - 1 - state.playerCol, state.exitRow - state.playerRow)
}

/** Where the exit is, relative to the player — the `E` key. */
export function describeExit(state: GameState): string {
  return L.STR_A11Y_EXIT(exitBearing(state))
}

// Spoken colour word for a gem kind (red/cyan/gold/green), localised.
function gemColour(kind: string): string {
  return L.STR_A11Y_GEM_COLOUR[kind] ?? kind
}

/** Confirm a gem pickup by colour — spoken (polite) the moment it's collected.
 *  Parity: a sighted player sees the gem's colour and which backpack slot ticked. */
export function announceGemPickup(kind: string): void {
  status(L.STR_A11Y_GEM_GOT(gemColour(kind)))
}

/** Nearest uncollected gem (fewest steps) + its colour + how many remain — the `G`
 *  key. Collected gems leave the map (become 'visited'), so findById('gem') is
 *  exactly what's left. */
export function describeGems(state: GameState): string {
  const gems = state.map.findById('gem')
  if (gems.length === 0) return L.STR_A11Y_GEM_NONE
  const dist = (g: { x: number; y: number }) =>
    Math.abs(g.x - state.playerCol) + Math.abs(g.y - state.playerRow)
  const nearest = gems.reduce((a, b) => (dist(b) < dist(a) ? b : a))
  const kind = (state.map.getTile(nearest.x, nearest.y)?.metadata?.gemKind as string) ?? 'cyan'
  return L.STR_A11Y_GEM_NEAREST(gemColour(kind), relPhrase(nearest.x - state.playerCol, nearest.y - state.playerRow), gems.length)
}

/** Start-of-run summary: exit bearing + gem count. Folded into the mode status
 *  line in main.ts so the polite region speaks one coherent sentence. */
export function describeOrientation(state: GameState): string {
  return L.STR_A11Y_ORIENT(exitBearing(state), state.map.findById('gem').length)
}
