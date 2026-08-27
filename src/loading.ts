/**
 * loading.ts — the loading screen, and the gesture that turns the sound on.
 *
 * A ZX game began with a full-screen picture while the tape loaded, and the
 * picture had no music: what you heard was the tape itself. We load instantly and
 * do not need the wait — but we *do* need the keypress, for a reason the original
 * never had. A browser will not start an AudioContext until the page has had a
 * real user gesture, so a title screen that comes up on its own can never be sure
 * it is allowed to make a sound. Put a picture in front of it that asks for one
 * key, and everything after that point may assume audio exists.
 *
 * That is the whole design: **the loading screen is where the sound is switched
 * on, and it is silent by construction.** The menu behind it is free to carry
 * music from its first frame.
 *
 * The picture is a native 6912-byte `.scr` inlined into the bundle by
 * `scripts/screen-import.mjs`, not a PNG fetched at runtime — a PNG can hold a
 * colour the machine could not display, and a fetch can fail and leave the player
 * looking at black with no way forward. A module cannot half-arrive.
 */

import { drawBitmapAttrs, drawTextCentered, parseSCR } from 'zx-kit'
import { MINEFIELD_LOADING_SCR } from './assets/minefield-loading.ts'
import { C, CANVAS_H, CANVAS_W, CELL, COLS } from './constants.ts'
import { L } from './lang.ts'

/** Decoded once at import — the de-interleave is not per-frame work. */
const SCREEN = parseSCR(MINEFIELD_LOADING_SCR)

/**
 * Cell row 4 — the emptiest band in the picture, and not by eye.
 *
 * Measured over the 768 cells: row 4 holds **two lit pixels in the whole row**,
 * both in cells 24–25 (the mines falling from the plane). A centred `PRESS ENTER`
 * covers cells 10–20, so it lands on black and hides nothing. Rows 0–2 hold the
 * aircraft, 8–10 the wire, 11–19 the courier and the detector arc, and 20–23 the
 * ground — every one of them is somebody's picture.
 */
export const PROMPT_ROW = 4

/**
 * Slow enough to read as an invitation rather than an alarm. Minefield already
 * blinks at `BLINK_INTERVAL_MS` for in-game state; the prompt shares that blinker
 * so nothing on screen beats against anything else.
 */
/** Where the loading screen hands off once the key arrives. */
export type LoadingReturn = 'intro' | 'ingame'

export interface BootState {
  /** Always `'loading'`. The type is the point — see {@link bootState}. */
  readonly phase: 'loading'
  readonly then: LoadingReturn
}

/**
 * The one place that decides what the game does on a cold load.
 *
 * It exists because the first version of this screen did not show at all. The
 * phase variable was *initialised* to `'loading'`, which looked like the boot
 * decision and was not: the tail of `main()` overwrites it unconditionally —
 * resume into the save, or `enterTitle()`. The initialiser never survived boot.
 *
 * So the decision is a function now, its return type says `'loading'` and
 * nothing else, and a test pins both branches. Any future path that wants to
 * skip the screen has to come through here, where it is visible.
 *
 * **A resume needs the screen more than a cold load does, not less.** It goes
 * straight into gameplay, and until some key is pressed the AudioContext is
 * locked — so the sonar, the mine warning and the exit beacon are all silent in
 * a game that is played by ear. `readSaveLatest` still runs at boot (it mutates
 * the state in place); only the handover waits for the key.
 */
export function bootState(hasSave: boolean): BootState {
  return { phase: 'loading', then: hasSave ? 'ingame' : 'intro' }
}

export function renderLoading(ctx: CanvasRenderingContext2D, blink: boolean): void {
  ctx.fillStyle = C.BLACK
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  drawBitmapAttrs(ctx, SCREEN.bitmap, SCREEN.attrs, 0, 0)
  if (blink) {
    drawTextCentered(ctx, L.STR_LOADING_PROMPT, PROMPT_ROW * CELL, COLS, C.B_WHITE, C.BLACK)
  }
}
