import { KEY_REPEAT_DELAY, KEY_REPEAT_INTERVAL } from './config.ts'
import { initInput as _initInput } from 'zx-kit'

export { tickMovement, consumeFlag, consumeDebug, consumePause, consumeAnyKey, isHeld } from 'zx-kit'
export type { Direction } from 'zx-kit'

export function initInput(): void {
  _initInput(KEY_REPEAT_DELAY, KEY_REPEAT_INTERVAL)
}
