import { KEY_REPEAT_DELAY, KEY_REPEAT_INTERVAL } from './config.ts'
import { initInput as _initInput, resetInput as _resetInput } from 'zx-kit'

export { tickMovement, consumeFlag, consumeDebug, consumePause, consumeAnyKey, isHeld } from 'zx-kit'
export type { Direction } from 'zx-kit'

let pendingVolUp = false
let pendingVolDown = false
let pendingManualSave = false

export function initInput(): void {
  _initInput(KEY_REPEAT_DELAY, KEY_REPEAT_INTERVAL)
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.repeat) return
    if (e.key === '+' || e.key === '=') pendingVolUp = true
    if (e.key === '-' || e.key === '_') pendingVolDown = true
    if (e.shiftKey && (e.key === 'S' || e.key === 's')) pendingManualSave = true
  })
}

export function consumeVolUp(): boolean { const v = pendingVolUp; pendingVolUp = false; return v }
export function consumeVolDown(): boolean { const v = pendingVolDown; pendingVolDown = false; return v }
export function consumeManualSave(): boolean { const v = pendingManualSave; pendingManualSave = false; return v }

export function resetInput(): void {
  _resetInput()
  pendingVolUp = false
  pendingVolDown = false
  pendingManualSave = false
}
