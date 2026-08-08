import { describe, it, expect } from 'vitest'
import * as en from '../src/strings.ts'
import * as sk from '../src/strings.sk.ts'
import { CONTROLS, GEM_TIME_BONUS_MS } from '../src/config.ts'
import { GEM_KINDS } from '../src/game.ts'

// Guards the CONTROLS / gems single source against i18n drift: add a control or a
// gem kind and forget its wording, and one of these fails instead of rendering blank.
describe('controls / i18n consistency', () => {
  it('every control id has a description in both languages', () => {
    for (const c of CONTROLS) {
      expect(en.CONTROL_DESC[c.id], `EN desc for ${c.id}`).toBeTruthy()
      expect(sk.CONTROL_DESC[c.id], `SK desc for ${c.id}`).toBeTruthy()
    }
  })

  it('every gem kind has a label + special wording (both languages) and a numeric time bonus', () => {
    for (const k of GEM_KINDS) {
      expect(en.GEM_LABEL[k.id], `EN label for ${k.id}`).toBeTruthy()
      expect(sk.GEM_LABEL[k.id], `SK label for ${k.id}`).toBeTruthy()
      expect(en.GEM_SPECIAL[k.id], `EN special for ${k.id}`).toBeTruthy()
      expect(sk.GEM_SPECIAL[k.id], `SK special for ${k.id}`).toBeTruthy()
      expect(typeof GEM_TIME_BONUS_MS[k.id], `time bonus for ${k.id}`).toBe('number')
    }
  })

  it('pause page titles count matches across languages', () => {
    expect(en.STR_PAUSE_TITLES.length).toBe(sk.STR_PAUSE_TITLES.length)
  })

  it('accessibility strings exist and are non-empty in both languages', () => {
    for (const pack of [en, sk]) {
      expect(pack.STR_A11Y_LEGEND.length).toBeGreaterThan(40)   // a real explanatory paragraph
      expect(pack.STR_A11Y_LEGEND_HINT).toMatch(/\bH\b/)        // start hint points at the H replay key
      expect(pack.STR_A11Y_GAMEOVER).toBeTruthy()
      expect(pack.STR_A11Y_WIN).toBeTruthy()
    }
  })

  it('victory epilogue strings are ASCII (ROM font) and fit 32 cells in both languages', () => {
    for (const pack of [en, sk]) {
      for (const s of [pack.STR_WIN_TITLE, pack.STR_WIN_LINE1, pack.STR_WIN_LINE2]) {
        expect(s.length, s).toBeGreaterThan(0)
        expect(s.length, s).toBeLessThanOrEqual(32)
        // eslint-disable-next-line no-control-regex
        expect(/^[\x20-\x7E]*$/.test(s), s).toBe(true)
      }
    }
  })

  it('orientation strings (Item C) exist and are non-empty in both languages', () => {
    for (const pack of [en, sk]) {
      for (const w of [pack.STR_A11Y_RIGHT, pack.STR_A11Y_LEFT, pack.STR_A11Y_UP, pack.STR_A11Y_DOWN, pack.STR_A11Y_HERE]) {
        expect(w).toBeTruthy()
      }
      expect(pack.STR_A11Y_EXIT('2 right')).toContain('2 right')
      expect(pack.STR_A11Y_GEM_NEAREST('cyan', '2 right', 3)).toBeTruthy()
      expect(pack.STR_A11Y_GEM_NONE).toBeTruthy()
      // Pickup line must carry the remaining count — it's what keeps consecutive
      // pickups distinct for the status() dedupe (owner playtest 2026-07-15).
      expect(pack.STR_A11Y_GEM_GOT(pack.STR_A11Y_GEM_COLOUR.red, 7)).toContain('7')
      for (const k of ['red', 'cyan', 'gold', 'green']) expect(pack.STR_A11Y_GEM_COLOUR[k]).toBeTruthy()
      expect(pack.STR_A11Y_ORIENT('2 right', 5)).toBeTruthy()
      expect(pack.STR_A11Y_PLANE_APPROACHING).toBeTruthy()
      expect(pack.STR_A11Y_PLANE_RESEEDED(2)).toBeTruthy()
      expect(pack.STR_A11Y_PLANE_PASSED).toBeTruthy()
    }
  })

  it('title-menu mirror strings exist and advertise every title/a11y key (both languages)', () => {
    for (const pack of [en, sk]) {
      const all = pack.STR_A11Y_MENU_LINES.join(' ')
      // Every key the title screen (or the in-game a11y layer) listens to must be
      // named in the browsable menu — this is how a blind player learns them.
      for (const key of ['S', 'R', 'I', 'L', 'H', 'E', 'G', 'F', 'P']) {
        expect(all, `menu advertises ${key}`).toMatch(new RegExp(`\\b${key}\\b`))
      }
      expect(pack.STR_A11Y_TITLE).toBeTruthy()
      expect(pack.STR_A11Y_PAUSE).toBeTruthy()   // both packs speak a pause line
      expect(pack.STR_A11Y_MENU_SCORES).toBeTruthy()
      expect(pack.STR_A11Y_MENU_NO_SCORES).toBeTruthy()
      const row = pack.STR_A11Y_MENU_SCORE_ROW(1, 'ABC', 12500, 3, '2026-07-12')
      for (const part of ['1', 'ABC', '12500', '3', '2026-07-12']) expect(row).toContain(part)
      // Legacy dateless entries must still read as a sentence, not "undefined".
      expect(pack.STR_A11Y_MENU_SCORE_ROW(2, 'XYZ', 900, 1)).not.toContain('undefined')
    }
    expect(en.STR_A11Y_MENU_LINES.length).toBe(sk.STR_A11Y_MENU_LINES.length)
  })
})

// The story intro is typed char-by-char with the ZX ROM font (ASCII only) and
// left-aligned, so every line must be ASCII and fit the 256 px (32-cell) canvas.
// The card count must match across locales or main.ts walks off the end of one.
describe('story intro cards', () => {
  it('has the same number of cards in both languages', () => {
    expect(en.STR_STORY_CARDS.length).toBe(sk.STR_STORY_CARDS.length)
    expect(en.STR_STORY_CARDS.length).toBeGreaterThan(0)
  })

  it('every line is ASCII (the ROM font has no em-dash/diacritics) and ≤ 30 chars', () => {
    for (const pack of [en, sk]) {
      for (const card of pack.STR_STORY_CARDS) {
        for (const line of card) {
          expect(line.length, line).toBeLessThanOrEqual(30)
          // eslint-disable-next-line no-control-regex
          expect(/^[\x20-\x7E]*$/.test(line), line).toBe(true)
        }
      }
    }
  })

  it('has a skip hint in both languages', () => {
    expect(en.STR_STORY_SKIP_HINT).toBeTruthy()
    expect(sk.STR_STORY_SKIP_HINT).toBeTruthy()
  })

  it('has one chapter title per card in both languages (ASCII, fits the heading)', () => {
    for (const pack of [en, sk]) {
      expect(pack.STR_STORY_TITLES.length).toBe(pack.STR_STORY_CARDS.length)
      for (const title of pack.STR_STORY_TITLES) {
        expect(title.length, title).toBeLessThanOrEqual(20)   // "  N/5  TITLE  " must fit 32 cells
        // eslint-disable-next-line no-control-regex
        expect(/^[\x20-\x7E]*$/.test(title), title).toBe(true)
      }
    }
  })
})

// ── End-of-run statistics labels ──────────────────────────────────────────────

// These labels are DRAWN with the ROM font on a 32-column screen, so they carry
// two hard constraints that no TypeScript check can catch: the lang.ts pack cast
// hides a missing key (it shows up as `undefined` on screen), and the SK pack is
// the one that tends to break both rules — Slovak words are longer and want
// diacritics the font simply does not have.
describe('run-statistics labels', () => {
  it('exists in both languages for every stat', () => {
    for (const id of Object.keys(en.STAT_LABEL)) {
      expect(en.STAT_LABEL[id], `EN label for ${id}`).toBeTruthy()
      expect(sk.STAT_LABEL[id], `SK label for ${id}`).toBeTruthy()
    }
    // No extra SK keys either — a stat the renderer never asks for is dead weight
    // that hides a typo in the id.
    expect(Object.keys(sk.STAT_LABEL).sort()).toEqual(Object.keys(en.STAT_LABEL).sort())
  })

  it('is ASCII and ≤ 10 chars, so the value column stays on screen', () => {
    for (const pack of [en, sk]) {
      for (const [id, label] of Object.entries(pack.STAT_LABEL)) {
        // eslint-disable-next-line no-control-regex
        expect(/^[\x20-\x7E]+$/.test(label), `${id} = "${label}" must be ASCII (the ROM font has no diacritics)`).toBe(true)
        expect(label.length, `${id} = "${label}" must fit the 12-column label field`).toBeLessThanOrEqual(10)
      }
    }
  })
})

// One mm:ss formatter for the whole game: the HUD countdown and the end-of-run
// TIME stat must never drift into different shapes. The SK pack RE-EXPORTS it
// rather than copying it — and it has to, because lang.ts casts the pack without
// checking keys, so a missing formatClock would only blow up at runtime, in
// Slovak, on the game-over screen.
describe('formatClock — the single mm:ss formatter', () => {
  it('is exposed by every language pack', () => {
    for (const pack of [en, sk]) {
      expect(typeof pack.formatClock).toBe('function')
    }
  })

  it('formats minutes and zero-padded seconds', () => {
    expect(en.formatClock(0)).toBe('0:00')
    expect(en.formatClock(65_000)).toBe('1:05')
    expect(en.formatClock(600_000)).toBe('10:00')
  })

  // Minutes are unbounded on purpose: an hour-long run must widen the string, not
  // wrap into an hours field the stat layout was never measured for.
  it('lets minutes run past 60 rather than growing an hours field', () => {
    expect(en.formatClock(3_600_000)).toBe('60:00')
    expect(en.formatClock(4_505_000)).toBe('75:05')
  })

  it('is the formatter the HUD countdown actually uses (both packs)', () => {
    for (const pack of [en, sk]) {
      expect(pack.STR_TIME(125_000).endsWith(pack.formatClock(125_000))).toBe(true)
    }
  })
})
