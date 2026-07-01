import { KEY_REPEAT_DELAY, KEY_REPEAT_INTERVAL } from './config.ts'
import { initInput as _initInput, resetInput as _resetInput, consumeDebug as _consumeDebug } from 'zx-kit'

export { tickMovement, consumeFlag, consumePause, consumeAnyKey, isHeld } from 'zx-kit'
export type { Direction } from 'zx-kit'
import type { Direction } from 'zx-kit'

let pendingManualSave = false
let pendingDebug = false
let pendingRandomMap = false
let pendingDirFlag: Direction | null = null

const SHIFT_ARROW_DIR: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
}

export function initInput(): void {
  _initInput(KEY_REPEAT_DELAY, KEY_REPEAT_INTERVAL)
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.repeat) return
    if (e.shiftKey && (e.key === 'S' || e.key === 's')) pendingManualSave = true
    // D = debug toggle (game-local; zx-kit's Ctrl+Shift+B and gamepad Y still work)
    if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) pendingDebug = true
    // R = reroll the field with a random (non-daily) seed — dev + replayability
    if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) pendingRandomMap = true
    // SHIFT+arrow = flag the adjacent cell in that absolute (screen) direction,
    // regardless of which way the player is currently facing — for triangulation
    // play, where the facing direction after walking around rarely matches the
    // side the mine turned out to be on. Movement itself is suppressed while
    // SHIFT is held (see main.ts's isHeld('Shift') guard around movePlayer) so
    // this doesn't also step the player in that direction.
    if (e.shiftKey && SHIFT_ARROW_DIR[e.key]) pendingDirFlag = SHIFT_ARROW_DIR[e.key]
  })
}

export function consumeManualSave(): boolean { const v = pendingManualSave; pendingManualSave = false; return v }

export function consumeDirFlag(): Direction | null { const v = pendingDirFlag; pendingDirFlag = null; return v }

// Debug toggle: game-local D OR zx-kit's Ctrl+Shift+B / gamepad Y (consume both so neither leaks).
export function consumeDebug(): boolean {
  const zx = _consumeDebug()
  const local = pendingDebug; pendingDebug = false
  return zx || local
}

export function consumeRandomMap(): boolean { const v = pendingRandomMap; pendingRandomMap = false; return v }

export function resetInput(): void {
  _resetInput()
  pendingManualSave = false
  pendingDebug = false
  pendingRandomMap = false
  pendingDirFlag = null
}
