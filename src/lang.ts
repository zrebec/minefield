/**
 * lang.ts — locale switcher for Minefield.
 *
 * Reads `LANGUAGE_CODE` from config.ts and exports `L` — the active
 * string pack. All visible-text consumers (renderer.ts) import `L`
 * from here and read `L.STR_TITLE`, `L.STR_GAME_OVER` etc.
 *
 * To add a new translation:
 *   1. Copy strings.ts → strings.<code>.ts and translate every value.
 *   2. Add the import + entry to the `locales` map below.
 *   3. Widen LANGUAGE_CODE's type in config.ts to include the new code.
 *   4. Set LANGUAGE_CODE in config.ts to the new code to test.
 *
 * The default (English) lives in strings.ts and doesn't need an entry
 * in `locales` — null / 'en' / unknown codes fall back to it.
 */

import { pickLocale } from 'zx-kit'
import { LANGUAGE_CODE } from './config.ts'
import * as en from './strings.ts'
import * as sk from './strings.sk.ts'

// Cast widens the locale string literal types so 'KONIEC HRY' in sk is
// compatible with the 'GAME  OVER' literal that TypeScript infers for en.
// Trade-off: no compile-time check that sk has every key — missing
// translations show up visually as undefined text.
export const L = pickLocale(en, { sk: sk as unknown as typeof en }, LANGUAGE_CODE)
