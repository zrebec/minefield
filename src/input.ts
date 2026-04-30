import { KEY_REPEAT_DELAY, KEY_REPEAT_INTERVAL } from './config.ts'
import { initInput as _initInput, resetInput as _resetInput } from 'zx-kit'

export { tickMovement, consumeFlag, consumeDebug, consumePause, consumeAnyKey, isHeld } from 'zx-kit'
export type { Direction } from 'zx-kit'

let pendingVolUp = false
let pendingVolDown = false

export function initInput(): void {
  _initInput(KEY_REPEAT_DELAY, KEY_REPEAT_INTERVAL)
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.repeat) return
    if (e.key === '+' || e.key === '=') pendingVolUp = true
    if (e.key === '-' || e.key === '_') pendingVolDown = true
  })
}

export function consumeVolUp(): boolean { const v = pendingVolUp; pendingVolUp = false; return v }
export function consumeVolDown(): boolean { const v = pendingVolDown; pendingVolDown = false; return v }

export function resetInput(): void {
  _resetInput()
  pendingVolUp = false
  pendingVolDown = false
}
