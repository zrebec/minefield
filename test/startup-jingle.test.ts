import { describe, it, expect, vi, beforeEach } from 'vitest'

// The intro jingle used to keep playing over the first few steps: playPattern
// hands the whole melody to the Web Audio timeline in one go, so nothing owned
// it any more. zx-kit 0.41 added stopBeep(); this file proves we call it in
// exactly one place and no more.
//
// The second half matters more than the first. stopBeep() silences EVERY beeper
// voice, so cutting on every footstep would also chop the sonar sweeps, exit
// beacons and mine warnings that are meant to layer — the cues the game is
// played by. These tests pin that down.
//
// Own file because vi.mock is per-file and hoisted (same reason as
// earcon-audio-smoke.test.ts). State is shared through vi.hoisted.
const h = vi.hoisted(() => ({ stopBeep: vi.fn() }))

vi.mock('zx-kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zx-kit')>()
  return { ...actual, stopBeep: h.stopBeep }
})

import { playStartupJingle, stopStartupJingle, playFootstep } from '../src/audio.ts'

beforeEach(() => {
  h.stopBeep.mockClear()
})

describe('startup jingle — cut short by the first footstep', () => {
  it('does not throw before initAudio (silent-guard contract)', () => {
    expect(() => playStartupJingle()).not.toThrow()
    expect(() => stopStartupJingle()).not.toThrow()
  })

  it('the first footstep after the jingle silences the beeper', () => {
    playStartupJingle()
    h.stopBeep.mockClear()
    playFootstep('grass')
    expect(h.stopBeep).toHaveBeenCalledTimes(1)
  })

  it('later footsteps leave the beeper alone — layered cues must survive', () => {
    playStartupJingle()
    playFootstep('grass')      // this one cuts the jingle
    h.stopBeep.mockClear()
    playFootstep('snow')
    playFootstep('dust')
    expect(h.stopBeep).not.toHaveBeenCalled()
  })

  it('a footstep with no jingle pending never touches the beeper', () => {
    stopStartupJingle()        // make sure nothing is pending
    h.stopBeep.mockClear()
    playFootstep('grass')
    expect(h.stopBeep).not.toHaveBeenCalled()
  })

  it('stopStartupJingle is idempotent — only the first call cuts', () => {
    playStartupJingle()
    h.stopBeep.mockClear()
    stopStartupJingle()
    stopStartupJingle()
    stopStartupJingle()
    expect(h.stopBeep).toHaveBeenCalledTimes(1)
  })
})
