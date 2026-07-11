// @vitest-environment jsdom
//
// Accessibility contract of index.html (the v1.0 promise's ground floor).
// These tests parse the real index.html from disk, so a refactor that drops an
// ARIA attribute, renames the game, or hides the live regions the wrong way
// fails CI before it reaches a screen-reader user. See AGENTS.md → Permanent
// Accessibility Invariants.
import { describe, it, expect, beforeEach } from 'vitest'
// Vite's ?raw import gives us the page source as a string — works in vitest's
// transform pipeline and typechecks via the vite/client reference in env.d.ts,
// with no need for node fs types in a browser-game tsconfig.
import html from '../index.html?raw'
import { STR_TITLE } from './strings.ts'
import { getLocale, L } from './lang.ts'
import { announce, status, setLegend, describeStep, describeExit, describeGems, describeOrientation } from './a11y.ts'
import { createGame, type GameState } from './game.ts'
import { makeTileGround, makeTileMine, makeTileGem } from './sprites.ts'
import { COLS, ROWS } from './constants.ts'

const doc = new DOMParser().parseFromString(html, 'text/html')

describe('game title', () => {
  it('the document <title> names the game THE STRIP (ZX Spectrum Edition)', () => {
    expect(doc.title).toBe('THE STRIP — ZX Spectrum Edition')
  })

  it('the document <title> matches the in-game title (STR_TITLE) — one name everywhere', () => {
    // STR_TITLE is letter-spaced for the ZX screen ('T H E   S T R I P'), so
    // compare with whitespace stripped: the NAME must match, not the kerning.
    const squash = (s: string): string => s.replace(/\s+/g, '')
    expect(squash(doc.title)).toContain(squash(STR_TITLE))
  })

  it('the meta description exists and names the game', () => {
    const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''
    expect(desc).toContain('THE STRIP')
    expect(desc.length).toBeGreaterThan(40)
  })
})

describe('language consistency', () => {
  it("index.html ships lang=\"en\" — the game's default locale", () => {
    expect(doc.documentElement.getAttribute('lang')).toBe('en')
  })

  it("the static lang attribute agrees with lang.ts's default (nothing persisted)", () => {
    // In a fresh environment (empty localStorage, LANGUAGE_CODE default) the
    // runtime locale is 'en'; the shipped attribute must match so the page
    // never claims a different language than the strings it renders.
    expect(getLocale()).toBe(doc.documentElement.getAttribute('lang'))
  })
})

describe('.sr-only (screen-reader-only) class', () => {
  const styleText = Array.from(doc.querySelectorAll('style')).map((s) => s.textContent).join('\n')
  const srOnlyRule = /\.sr-only\s*\{([^}]*)\}/.exec(styleText)?.[1] ?? ''

  it('defines a .sr-only rule in the inline stylesheet', () => {
    expect(srOnlyRule).not.toBe('')
  })

  it('hides visually WITHOUT silencing screen readers (no display:none / visibility:hidden)', () => {
    expect(srOnlyRule).not.toMatch(/display\s*:\s*none/)
    expect(srOnlyRule).not.toMatch(/visibility\s*:\s*hidden/)
    // The visually-hidden pattern: off-flow, clipped to nothing.
    expect(srOnlyRule).toMatch(/position\s*:\s*absolute/)
    expect(srOnlyRule).toMatch(/overflow\s*:\s*hidden/)
  })

  it('both live regions carry the .sr-only class', () => {
    for (const id of ['sr-announcer', 'sr-status']) {
      expect(doc.getElementById(id)?.classList.contains('sr-only'), id).toBe(true)
    }
  })
})

describe('ARIA attributes', () => {
  it('the canvas is labelled for assistive tech (role="img" + non-empty aria-label)', () => {
    const canvas = doc.getElementById('game')
    expect(canvas).not.toBeNull()
    expect(canvas!.getAttribute('role')).toBe('img')
    expect((canvas!.getAttribute('aria-label') ?? '').length).toBeGreaterThan(10)
  })

  it('#sr-announcer is the urgent channel: role="status", aria-live="assertive", aria-atomic="true"', () => {
    const el = doc.getElementById('sr-announcer')
    expect(el).not.toBeNull()
    expect(el!.getAttribute('role')).toBe('status')
    expect(el!.getAttribute('aria-live')).toBe('assertive')
    expect(el!.getAttribute('aria-atomic')).toBe('true')
  })

  it('#sr-status is the calm channel: role="status", aria-live="polite"', () => {
    const el = doc.getElementById('sr-status')
    expect(el).not.toBeNull()
    expect(el!.getAttribute('role')).toBe('status')
    expect(el!.getAttribute('aria-live')).toBe('polite')
  })

  it('a <noscript> fallback exists for browsers without JS', () => {
    expect(doc.querySelector('noscript')?.textContent ?? '').toContain('THE STRIP')
  })

  it('#sr-legend exists as a navigable .sr-only audio guide', () => {
    const el = doc.getElementById('sr-legend')
    expect(el).not.toBeNull()
    expect(el!.classList.contains('sr-only')).toBe(true)
  })
})

// ── a11y.ts module — live-region writes + shared formatter ────────────────────

function cleanState(pcol = 8, prow = 8): GameState {
  const state = createGame(0, 0, 'a11y-seed')
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      state.map.setTile(c, r, makeTileGround((c + r) % 2 === 0 ? 'a' : 'b', 'grass'))
  state.playerCol = pcol
  state.playerRow = prow
  return state
}
const mine = (s: GameState, c: number, r: number): void =>
  void s.map.setTile(c, r, makeTileMine('normal', (c + r) % 2 === 0 ? 'a' : 'b', 'grass'))
const gem = (s: GameState, c: number, r: number): void =>
  void s.map.setTile(c, r, makeTileGem())   // cyan gem, id 'gem'

describe('a11y live regions', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="sr-announcer"></div><div id="sr-status"></div><div id="sr-legend"></div>'
  })

  it('announce writes the assertive region and forces a re-read of identical text', () => {
    announce('2 mines next to you.')
    const first = document.getElementById('sr-announcer')!.textContent!
    expect(first).toContain('2 mines next to you.')
    announce('2 mines next to you.')                       // same message, player stepped again
    const second = document.getElementById('sr-announcer')!.textContent!
    expect(second).toContain('2 mines next to you.')
    expect(second).not.toBe(first)                         // toggled marker → screen reader re-reads
  })

  it('status writes the polite region and dedupes identical consecutive lines', () => {
    status('Daily run started.')
    expect(document.getElementById('sr-status')!.textContent).toBe('Daily run started.')
    document.getElementById('sr-status')!.textContent = ''  // prove the next identical call is a no-op
    status('Daily run started.')
    expect(document.getElementById('sr-status')!.textContent).toBe('')
  })

  it('setLegend fills the static guide region', () => {
    setLegend(L.STR_A11Y_LEGEND)
    expect(document.getElementById('sr-legend')!.textContent).toBe(L.STR_A11Y_LEGEND)
  })

  it('the legend advertises its own replay key H in both languages (Item B discoverability)', async () => {
    // If H ever stops being the replay key, both spoken guides must change with it.
    const en = await import('./strings.ts')
    const sk = await import('./strings.sk.ts')
    expect(en.STR_A11Y_LEGEND).toMatch(/\bH\b/)
    expect(sk.STR_A11Y_LEGEND).toMatch(/\bH\b/)
  })

  it('every DOM write is guarded — no throw when the regions are absent', () => {
    document.body.innerHTML = ''
    expect(() => { announce('x'); status('y'); setLegend('z') }).not.toThrow()
  })
})

describe('describeStep — shared ARIA/TTS sentence (mirrors the HUD + beeper)', () => {
  it('reports a clear cell', () => {
    expect(describeStep(cleanState())).toBe(L.STR_A11Y_SAFE)
  })

  it('reports the adjacent count — the count only, never a direction (triangulation is the game)', () => {
    const s = cleanState()
    mine(s, 9, 8)                                  // one mine, east, dist-1
    expect(describeStep(s)).toContain(L.STR_A11Y_ADJ(1))
  })
})

// ── Orientation (Item C) — exit + gems as a relative bearing ──────────────────

describe('describeExit — bearing to the exit hole', () => {
  it('reads column distance + "right" when the exit is far to the player’s right', () => {
    const s = cleanState(9, 8)   // exit hole is column COLS-1 (=31)
    s.exitRow = 5
    const text = describeExit(s)
    expect(text).toContain(String(COLS - 1 - 9))   // 22 columns right
    expect(text).toContain(L.STR_A11Y_RIGHT)
    expect(text).toContain(L.STR_A11Y_UP)          // exitRow 5 is 3 rows up from row 8
  })

  it('drops the vertical component when the player is on the exit row (no up/down)', () => {
    const s = cleanState(9, 5)
    s.exitRow = 5                                   // same row → dRow 0
    const text = describeExit(s)
    expect(text).toContain(L.STR_A11Y_RIGHT)
    expect(text).not.toContain(L.STR_A11Y_UP)
    expect(text).not.toContain(L.STR_A11Y_DOWN)
  })
})

describe('describeGems — nearest gem + remaining count', () => {
  it('reports GEM_NONE on a field with no gems left', () => {
    expect(describeGems(cleanState())).toBe(L.STR_A11Y_GEM_NONE)
  })

  it('picks the nearer of two gems and reports the total remaining', () => {
    const s = cleanState(8, 8)
    gem(s, 10, 8)   // 2 right      → nearer
    gem(s, 8, 12)   // 4 down       → farther
    const text = describeGems(s)
    expect(text).toContain(L.STR_A11Y_RIGHT)        // the near gem's bearing
    expect(text).not.toContain(L.STR_A11Y_DOWN)     // not the far one's
    expect(text).toContain('2')                     // both "2 right" and "2 gems left"
  })

  it('says "here" for a gem on the player’s own cell (both components zero)', () => {
    const s = cleanState(8, 8)
    gem(s, 8, 8)
    expect(describeGems(s)).toContain(L.STR_A11Y_HERE)
  })
})

describe('describeOrientation — start-of-run summary', () => {
  it('names the exit direction and the gem count on the field', () => {
    const s = cleanState(9, 8)
    s.exitRow = 5
    gem(s, 12, 8)
    gem(s, 4, 4)
    const text = describeOrientation(s)
    expect(text).toContain(L.STR_A11Y_RIGHT)        // exit bearing
    expect(text).toContain('2')                     // 2 gems on the field
  })
})
