import { KEY_REPEAT_DELAY, KEY_REPEAT_INTERVAL } from './config.ts'
import { initInput as _initInput, resetInput as _resetInput, consumeDebug as _consumeDebug } from 'zx-kit'

export { tickMovement, consumeFlag, consumePause, consumeAnyKey, isHeld } from 'zx-kit'
export type { Direction } from 'zx-kit'

let pendingVolUp = false
let pendingVolDown = false
let pendingManualSave = false
let pendingDebug = false
let pendingRandomMap = false

export function initInput(): void {
  _initInput(KEY_REPEAT_DELAY, KEY_REPEAT_INTERVAL)
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.repeat) return
    if (e.key === '+' || e.key === '=') pendingVolUp = true
    if (e.key === '-' || e.key === '_') pendingVolDown = true
    if (e.shiftKey && (e.key === 'S' || e.key === 's')) pendingManualSave = true
    // D = debug toggle (game-local; zx-kit's Ctrl+Shift+B and gamepad Y still work)
    if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) pendingDebug = true
    // R = reroll the field with a random (non-daily) seed — dev + replayability
    if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey && !e.altKey) pendingRandomMap = true
  })
}

export function consumeVolUp(): boolean { const v = pendingVolUp; pendingVolUp = false; return v }
export function consumeVolDown(): boolean { const v = pendingVolDown; pendingVolDown = false; return v }
export function consumeManualSave(): boolean { const v = pendingManualSave; pendingManualSave = false; return v }

// Debug toggle: game-local D OR zx-kit's Ctrl+Shift+B / gamepad Y (consume both so neither leaks).
export function consumeDebug(): boolean {
  const zx = _consumeDebug()
  const local = pendingDebug; pendingDebug = false
  return zx || local
}

export function consumeRandomMap(): boolean { const v = pendingRandomMap; pendingRandomMap = false; return v }

export function resetInput(): void {
  _resetInput()
  pendingVolUp = false
  pendingVolDown = false
  pendingManualSave = false
  pendingDebug = false
  pendingRandomMap = false
}
