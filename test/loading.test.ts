import { describe, it, expect } from 'vitest'
import { parseSCR } from 'zx-kit'
import { MINEFIELD_LOADING_SCR } from '../src/assets/minefield-loading.ts'
import { PROMPT_ROW } from '../src/loading.ts'
import { C, COLS } from '../src/constants.ts'
import * as en from '../src/strings.ts'
import * as sk from '../src/strings.sk.ts'

const SCR_BYTES = 6912
const CELL = 8

describe('the loading screen asset', () => {
  it('is a native 6912-byte screen dump, inlined rather than fetched', () => {
    // A .scr spends three bits on INK and three on PAPER, so it cannot express a
    // colour outside the 16 or a cell with three of them — the guarantee a PNG
    // cannot give. Inlining is the other half: the previous generation of this
    // pattern gated a scene on an <img> load, and a missing file left the player
    // on black that never accepted a key. A module cannot half-arrive.
    expect(MINEFIELD_LOADING_SCR.length).toBe(SCR_BYTES)
  })

  it('parses into a 256x192 bitmap with a 32x24 attribute grid', () => {
    const screen = parseSCR(MINEFIELD_LOADING_SCR)
    expect(screen.bitmap.width).toBe(256)
    expect(screen.bitmap.height).toBe(192)
    expect(screen.attrs.cols).toBe(32)
    expect(screen.attrs.rows).toBe(24)
  })

  it('uses no FLASH, so the still picture is the whole picture', () => {
    // Worth pinning: if a future screen does use FLASH, this fails and whoever
    // replaces the art has to decide what the blinking prompt does about it.
    const screen = parseSCR(MINEFIELD_LOADING_SCR)
    expect(screen.flash.some(Boolean)).toBe(false)
  })
})

describe('where the prompt sits', () => {
  // The claim in loading.ts is that cell row 4 is empty, and this is the check
  // that keeps it true. Replace the picture with one that has a searchlight
  // across the sky and this fails rather than quietly painting over it.
  const promptCols = (text: string): [number, number] => {
    const start = Math.floor((COLS - text.length) / 2)
    return [start, start + text.length - 1]
  }

  // "Lit" has to mean *visible*, not "bit set". A set bit selects the cell's INK,
  // and this picture is full of cells whose bits are all 1 while INK and PAPER are
  // both black — solid black either way. Counting bits called row 4 completely
  // full; counting resolved colours calls it two pixels, which is what the eye
  // sees. Resolve through the attributes, the way the renderer does.
  const litPixelsInCells = (row: number, from: number, to: number): number => {
    const { bitmap, attrs } = parseSCR(MINEFIELD_LOADING_SCR)
    const bytesPerRow = bitmap.width / 8
    let lit = 0
    for (let cx = from; cx <= to; cx++) {
      const cell = row * attrs.cols + cx
      const ink = attrs.inks[cell]
      const paper = attrs.papers?.[cell]
      for (let y = 0; y < CELL; y++) {
        const byte = bitmap.data[(row * CELL + y) * bytesPerRow + cx]
        for (let bit = 0; bit < 8; bit++) {
          const colour = byte & (1 << (7 - bit)) ? ink : paper
          if (colour !== undefined && colour !== C.BLACK) lit++
        }
      }
    }
    return lit
  }

  it('covers only black in both locales', () => {
    for (const text of [en.STR_LOADING_PROMPT, sk.STR_LOADING_PROMPT]) {
      const [from, to] = promptCols(text)
      expect(litPixelsInCells(PROMPT_ROW, from, to)).toBe(0)
    }
  })

  it('leaves the falling mines in columns 24-25 alone', () => {
    // They are the only thing lit on this row, and they are the reason the row
    // is not simply "empty" — the prompt has to be narrow enough to miss them.
    expect(litPixelsInCells(PROMPT_ROW, 24, 25)).toBeGreaterThan(0)
    for (const text of [en.STR_LOADING_PROMPT, sk.STR_LOADING_PROMPT]) {
      expect(promptCols(text)[1]).toBeLessThan(24)
    }
  })
})

describe('the prompt text', () => {
  it('fits the row and stays in the ROM font in both locales', () => {
    // getCharRow returns an empty row outside ASCII 32-127, so a diacritic draws
    // as a blank cell rather than a wrong glyph. Drawn text stays ASCII; the
    // spoken string below does not have to.
    for (const text of [en.STR_LOADING_PROMPT, sk.STR_LOADING_PROMPT]) {
      expect(text.length).toBeLessThanOrEqual(COLS)
      expect(text).toMatch(/^[\x20-\x7E]+$/)
    }
  })

  it('names Enter in both locales, because that is what the key does', () => {
    expect(en.STR_LOADING_PROMPT).toContain('ENTER')
    expect(sk.STR_LOADING_PROMPT).toContain('ENTER')
  })

  it('has a spoken counterpart, since this screen is silent by design', () => {
    // The one announcement in the game that must work before audio exists: the
    // screen reader is not subject to the browser's gesture rule, the
    // AudioContext is. Without it a blind player meets a picture and silence.
    for (const line of [en.STR_A11Y_LOADING, sk.STR_A11Y_LOADING]) {
      expect(line.length).toBeGreaterThan(0)
      expect(line.toLowerCase()).toContain('enter')
    }
  })
})
