import { MASTER_VOLUME, WARN_DEBOUNCE_MS } from './config.ts'
import {
  initAudio as _initAudio,
  resumeAudio,
  beep,
  getAudioContext,
  getMasterGain,
  playPattern,
  type Note,
} from 'zx-kit'

export { resumeAudio }

let airplaneOsc: OscillatorNode | null = null
let airplaneLfo: OscillatorNode | null = null
let airplaneGain: GainNode | null = null
let approachOsc: OscillatorNode | null = null
let approachGain: GainNode | null = null
let lastWarnTime = 0

// One-shot horror sting — plays once on first user interaction
const STARTUP_JINGLE: Note[] = [
  // Ascending diminished 7th arpeggio — ominous rise
  { freq: 262, dur: 120 },  // C4
  { freq: 311, dur: 120 },  // Eb4
  { freq: 370, dur: 120 },  // F#4 — tritone from C
  { freq: 440, dur: 120 },  // A4
  { freq: 523, dur: 120 },  // C5
  { freq: 622, dur: 120 },  // Eb5
  { freq: 740, dur: 300 },  // F#5 — peak, held
  { freq: 0,   dur: 200 },  // silence — tension
  // Minor second trill — dissonant, unsettling
  { freq: 440, dur: 70 },
  { freq: 466, dur: 70 },
  { freq: 440, dur: 70 },
  { freq: 466, dur: 70 },
  { freq: 440, dur: 70 },
  { freq: 466, dur: 70 },
  { freq: 440, dur: 70 },
  { freq: 0,   dur: 250 },  // silence — hold tension
  // Final tritone stab — diabolus in musica
  { freq: 196, dur: 120 },  // G3
  { freq: 0,   dur: 60  },
  { freq: 131, dur: 120 },  // C3
  { freq: 0,   dur: 60  },
  { freq: 185, dur: 700 },  // F#3 — tritone from C, ominous end
]

export function playStartupJingle(): void {
  playPattern(STARTUP_JINGLE)
}

export function initAudio(): void {
  _initAudio(MASTER_VOLUME)
}

export function playWarning(mineCount: number): void {
  const ctx = getAudioContext()
  if (!ctx || mineCount === 0) return
  resumeAudio()
  const now = ctx.currentTime
  if (now - lastWarnTime < WARN_DEBOUNCE_MS / 1000) return
  lastWarnTime = now

  const configs: [number, number, number, number][] = [
    [880,  80,  1, 60],
    [740,  80,  2, 60],
    [587, 100,  3, 55],
    [440, 120,  4, 50],
    [330, 150,  5, 40],
    [220, 200,  6, 40],
    [110, 300,  3, 30],
    [110, 300,  4, 25],
  ]
  const [freq, dur, pips, gap] = configs[Math.min(mineCount, 8) - 1]
  for (let i = 0; i < pips; i++) {
    beep(freq, dur, now + i * (dur + gap) / 1000)
  }
}

export function playExplosion(): void {
  const ctx = getAudioContext()
  if (!ctx) return
  const now = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.9, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
  gain.connect(getMasterGain()!)
  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.setValueAtTime(400, now)
  for (let i = 0; i < 40; i++) {
    osc.frequency.setValueAtTime(50 + Math.random() * 500, now + i * 0.012)
  }
  osc.connect(gain)
  osc.start(now)
  osc.stop(now + 0.55)
}

export function playWin(): void {
  playPattern([
    { freq: 262, dur: 150 },
    { freq: 330, dur: 150 },
    { freq: 392, dur: 150 },
    { freq: 523, dur: 150 },
  ])
}

export function playGameOver(): void {
  playPattern([
    { freq: 262, dur: 270 },
    { freq: 247, dur: 270 },
    { freq: 233, dur: 270 },
    { freq: 220, dur: 270 },
    { freq: 208, dur: 270 },
  ])
}

export function startApproachSound(): void {
  const ctx = getAudioContext()
  if (!ctx || approachOsc || airplaneOsc) return
  const now = ctx.currentTime
  approachGain = ctx.createGain()
  approachGain.gain.value = 0.04
  approachGain.connect(getMasterGain()!)
  approachOsc = ctx.createOscillator()
  approachOsc.type = 'square'
  approachOsc.frequency.value = 1300
  approachOsc.connect(approachGain)
  approachOsc.start(now)
}

export function stopApproachSound(): void {
  const ctx = getAudioContext()
  const osc = approachOsc
  const gain = approachGain
  if (!ctx || !osc) return
  const now = ctx.currentTime
  gain?.gain.linearRampToValueAtTime(0, now + 0.2)
  osc.stop(now + 0.25)
  approachOsc = null
  approachGain = null
}

export function isApproachSoundActive(): boolean {
  return approachOsc !== null
}

export function isAmbientSoundActive(): boolean {
  return approachOsc !== null || airplaneOsc !== null
}

export function playFootstep(): void {
  playPattern([{ freq: 85, dur: 28 }])
}

export function playGemCollect(comboCount: number): void {
  const freq = Math.min(880 + (comboCount - 1) * 110, 1760)
  const notes: Note[] = [{ freq, dur: 60 }, { freq: 0, dur: 30 }]
  if (comboCount >= 2) notes.push({ freq: Math.min(freq * 1.25, 2200), dur: 60 })
  playPattern(notes)
}

export function startAirplane(): void {
  stopApproachSound()
  const ctx = getAudioContext()
  if (!ctx || airplaneOsc) return
  const now = ctx.currentTime

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(0.4, now + 0.3)
  gain.connect(getMasterGain()!)

  const osc = ctx.createOscillator()
  osc.type = 'square'
  osc.frequency.value = 1300

  const lfo = ctx.createOscillator()
  lfo.type = 'square'
  lfo.frequency.value = 12
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 80
  lfo.connect(lfoGain)
  lfoGain.connect(osc.frequency)
  osc.connect(gain)
  lfo.start(now)
  osc.start(now)

  airplaneGain = gain
  airplaneOsc = osc
  airplaneLfo = lfo
}

export function stopAmbientSounds(): void {
  stopApproachSound()
  const ctx = getAudioContext()
  if (!ctx || !airplaneGain || !airplaneOsc || !airplaneLfo) return
  const now = ctx.currentTime
  airplaneGain.gain.linearRampToValueAtTime(0, now + 0.3)
  airplaneOsc.stop(now + 0.35)
  airplaneLfo.stop(now + 0.35)
  airplaneOsc = null
  airplaneLfo = null
  airplaneGain = null
}

