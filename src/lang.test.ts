// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { L, getLocale, setLocale, cycleLocale } from './lang.ts'
import * as en from './strings.ts'
import * as sk from './strings.sk.ts'

// jsdom provides localStorage. lang.ts is a singleton module (imported once
// for this whole file) so its *initial* resolution — read here before any
// test mutates anything — reflects an empty store + LANGUAGE_CODE's default
// (null) from config.ts. Later tests drive state explicitly via setLocale/
// cycleLocale, so they don't depend on that initial snapshot.
beforeEach(() => localStorage.clear())

describe('initial locale', () => {
  it("defaults to 'en' when nothing is persisted and LANGUAGE_CODE is null", () => {
    expect(getLocale()).toBe('en')
    expect(L.STR_STORY_TITLES[0]).toBe(en.STR_STORY_TITLES[0])
  })
})

describe('setLocale', () => {
  it("swaps L's content to the Slovak pack and updates getLocale()", () => {
    setLocale('sk')
    expect(getLocale()).toBe('sk')
    expect(L.STR_STORY_TITLES[0]).toBe(sk.STR_STORY_TITLES[0])
    expect(L.STR_STORY_TITLES[0]).not.toBe(en.STR_STORY_TITLES[0])
  })

  it('normalises the code case-insensitively', () => {
    setLocale('SK')
    expect(getLocale()).toBe('sk')
    expect(L.STR_STORY_TITLES[0]).toBe(sk.STR_STORY_TITLES[0])
  })

  it("falls back to English content for 'en' or an unrecognised code", () => {
    setLocale('sk')
    setLocale('en')
    expect(getLocale()).toBe('en')
    expect(L.STR_STORY_TITLES[0]).toBe(en.STR_STORY_TITLES[0])

    setLocale('sk')
    setLocale('xx')
    expect(getLocale()).toBe('en')
    expect(L.STR_STORY_TITLES[0]).toBe(en.STR_STORY_TITLES[0])
  })

  it('persists the choice to localStorage under minefield_language', () => {
    setLocale('sk')
    expect(localStorage.getItem('minefield_language')).toBe('sk')

    setLocale('en')
    expect(localStorage.getItem('minefield_language')).toBe('en')
  })

  it("keeps L's object reference stable across calls (consumers hold a live reference)", () => {
    const ref = L
    setLocale('sk')
    expect(L).toBe(ref)
    setLocale('en')
    expect(L).toBe(ref)
  })
})

describe('cycleLocale', () => {
  it('toggles en -> sk -> en', () => {
    setLocale('en')
    cycleLocale()
    expect(getLocale()).toBe('sk')
    expect(L.STR_STORY_TITLES[0]).toBe(sk.STR_STORY_TITLES[0])
    cycleLocale()
    expect(getLocale()).toBe('en')
    expect(L.STR_STORY_TITLES[0]).toBe(en.STR_STORY_TITLES[0])
  })
})
