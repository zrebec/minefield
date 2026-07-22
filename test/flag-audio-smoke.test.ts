import { describe, it, expect, vi, beforeEach } from 'vitest'

// Smoke test for the flag earcons WITH a live audio context. The other audio
// tests only prove the play functions don't throw before initAudio (context =
// null → silent). Here we inject a minimal fake Web Audio graph via getAudioContext
// so we can assert the blip was actually SCHEDULED: an oscillator was created,
// started, and stopped, with the right pan/pitch. That is "the sound fired".
//
// This mock lives in its OWN file because vi.mock is per-file and hoisted — in
// audio.test.ts it would make getAudioContext non-null and break the silent-path
// tests there. State is shared through vi.hoisted (the factory runs before imports).
const h = vi.hoisted(() => {
  const oscillators: any[] = []
  const panners: any[] = []
  const fakeCtx = {
    currentTime: 0,
    createGain: () => ({ gain: { value: 0 }, connect: () => {} }),
    createStereoPanner: () => {
      const p: any = { pan: { value: NaN }, connect: () => {} }
      panners.push(p)
      return p
    },
    createOscillator: () => {
      const osc: any = { type: '', frequency: { value: 0 }, connect: () => {}, started: 0, stopped: 0 }
      osc.start = () => { osc.started++ }
      osc.stop = () => { osc.stopped++ }
      oscillators.push(osc)
      return osc
    },
  }
  return { oscillators, panners, fakeCtx }
})

vi.mock('zx-kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zx-kit')>()
  return { ...actual, getAudioContext: () => h.fakeCtx, getMasterGain: () => ({} as any) }
})

import { playFlagBlip, playFlagRemoveBlip } from '../src/audio.ts'
import { FLAG_FREQ_BASE, FLAG_FREQ_ROW_STEP, FLAG_PAN, FLAG_REMOVE_FREQ } from '../src/config.ts'

describe('flag earcon — smoke: the blip is actually scheduled (live audio context)', () => {
  beforeEach(() => { h.oscillators.length = 0; h.panners.length = 0 })

  it('PLACEMENT fired: one oscillator started + stopped, pan = east, pitch = base on the same row', () => {
    playFlagBlip(1, 0)                          // one cell east, same row
    expect(h.oscillators).toHaveLength(1)
    expect(h.oscillators[0].started).toBe(1)    // the sound really played, not just "didn't throw"
    expect(h.oscillators[0].stopped).toBe(1)
    expect(h.oscillators[0].type).toBe('square')
    expect(h.oscillators[0].frequency.value).toBe(FLAG_FREQ_BASE)
    expect(h.panners[0].pan.value).toBe(FLAG_PAN)                     // hard right
  })

  it('PLACEMENT above the player raises the pitch (north = higher)', () => {
    playFlagBlip(0, -1)                          // one cell north (up)
    expect(h.oscillators[0].frequency.value).toBe(FLAG_FREQ_BASE + FLAG_FREQ_ROW_STEP)
    expect(h.panners[0].pan.value).toBe(0)                           // up/down → centre
  })

  it('REMOVAL fired: one low centred tick started, no pan, fixed low pitch (position-free)', () => {
    playFlagRemoveBlip()
    expect(h.oscillators).toHaveLength(1)
    expect(h.oscillators[0].started).toBe(1)    // the take-back sound really played
    expect(h.oscillators[0].stopped).toBe(1)
    expect(h.oscillators[0].frequency.value).toBe(FLAG_REMOVE_FREQ)
    expect(h.panners[0].pan.value).toBe(0)                           // centred — carries no position
  })
})
