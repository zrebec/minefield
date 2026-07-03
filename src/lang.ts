/**
 * lang.ts — locale switcher for Minefield.
 *
 * Reads `LANGUAGE_CODE` from config.ts as the *default* locale, but a
 * player's own runtime choice (persisted in localStorage) takes priority
 * once they've toggled it from the title screen. All visible-text
 * consumers (renderer.ts) import `L` from here and read `L.STR_TITLE`,
 * `L.STR_GAME_OVER` etc.
 *
 * `L` is a fresh mutable plain object (NOT the frozen ES-module namespace
 * object `import * as en` produces) so that `setLocale`/`cycleLocale` can
 * swap its contents in place via `Object.assign` while every consumer's
 * `import { L }` keeps the same object reference. That's what makes a
 * runtime language switch "just work" everywhere with zero changes to
 * consumer files — they read `L.STR_*` live on every render call.
 *
 * To add a new translation:
 *   1. Copy strings.ts → strings.<code>.ts and translate every value.
 *   2. Add the import + entry to the `LOCALES` map below.
 *   3. Add the code to `LOCALE_ORDER` (controls cycleLocale's order).
 *   4. Widen LANGUAGE_CODE's type in config.ts to include the new code.
 *   5. Set LANGUAGE_CODE in config.ts to the new code to test during dev.
 *
 * The default (English) lives in strings.ts and doesn't need an entry
 * in `LOCALES` — null / 'en' / unknown codes fall back to it.
 */

import { pickLocale } from 'zx-kit'
import { LANGUAGE_CODE } from './config.ts'
import * as en from './strings.ts'
import * as sk from './strings.sk.ts'

// Cast widens the locale string literal types so 'KONIEC HRY' in sk is
// compatible with the 'GAME  OVER' literal that TypeScript infers for en.
// Trade-off: no compile-time check that sk has every key — missing
// translations show up visually as undefined text.
type StringPack = typeof en

/** Known, non-default locales. English (`en`) is always the fallback default. */
const LOCALES: Record<string, StringPack> = { sk: sk as unknown as StringPack }

/** Fixed cycle order for `cycleLocale()`. Add a code here (after adding it above) to include it. */
const LOCALE_ORDER = ['en', 'sk'] as const

const LANGUAGE_STORAGE_KEY = 'minefield_language'

// ── Persistence (localStorage) ──────────────────────────────────────────────
// Mirrors the try/catch-degrades-harmlessly idiom used by intro.ts's
// readIntroSeen/markIntroSeen: storage-unavailable (private browsing, quota,
// disabled) just means the choice doesn't persist — never throws.

function readPersistedLocale(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY)
  } catch {
    return null
  }
}

function persistLocale(code: string): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
  } catch { /* storage unavailable → preference simply doesn't persist, harmless */ }
}

/** Normalises to a code we actually have a pack for, else 'en'. */
function resolveKnownCode(rawCode: string): string {
  const normalised = rawCode.toLowerCase()
  return LOCALES[normalised] ? normalised : 'en'
}

// Initial locale: a previously-persisted runtime choice wins; otherwise fall
// back to the existing dev-only LANGUAGE_CODE config constant (unchanged
// default behaviour for anyone who's never touched the runtime toggle).
let currentCode = resolveKnownCode(readPersistedLocale() ?? LANGUAGE_CODE ?? 'en')

/**
 * Mirrors the active locale onto `<html lang>` so assistive tech (screen
 * readers, the future TTS voice pick) pronounces the page in the game's
 * current language. Guarded so the pure-logic tests can run without a DOM.
 */
function applyDocumentLang(): void {
  if (typeof document !== 'undefined') document.documentElement.lang = currentCode
}

export const L: StringPack = { ...pickLocale(en, LOCALES, currentCode) }
applyDocumentLang()

/** Current locale code, lowercase (e.g. `'en'`, `'sk'`). */
export function getLocale(): string {
  return currentCode
}

/**
 * Switches the active locale at runtime. Unknown/unmatched codes (including
 * `'en'`) fall back to English. Mutates `L`'s properties in place — `L`'s
 * object identity never changes, so every existing `import { L }` consumer
 * picks up the new strings automatically. Persists the choice so it survives
 * a reload.
 */
export function setLocale(code: string): void {
  const resolved = resolveKnownCode(code)
  Object.assign(L, pickLocale(en, LOCALES, resolved))
  currentCode = resolved
  persistLocale(currentCode)
  applyDocumentLang()
}

/** Advances to the next locale in `LOCALE_ORDER` (wrapping around). */
export function cycleLocale(): void {
  const idx = LOCALE_ORDER.findIndex((code) => code === currentCode)
  const next = LOCALE_ORDER[(idx + 1) % LOCALE_ORDER.length]
  setLocale(next)
}
