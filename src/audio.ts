import { MASTER_VOLUME, WARN_DEBOUNCE_MS } from './config.ts'

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let airplaneOsc: OscillatorNode | null = null
let airplaneLfo: OscillatorNode | null = null
let airplaneGain: GainNode | null = null
let approachOsc: OscillatorNode | null = null
let approachGain: GainNode | null = null
let lastWarnTime = 0

export function initAudio(): void {
  if (ctx) return
  ctx = new AudioContext()
  masterGain = ctx.createGain()
  masterGain.gain.value = MASTER_VOLUME
  masterGain.connect(ctx.destination)
}

export function resumeAudio(): void {
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

function ensureCtx(): AudioContext {
  if (!ctx || !masterGain) throw new Error('audio not init')
  return ctx
}

function beep(freq: number, durationMs: number, startTime: number): void {
  const ac = ensureCtx()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(0.8, startTime + 0.005)
  gain.gain.setValueAtTime(0.8, startTime + durationMs / 1000 - 0.005)
  gain.gain.linearRampToValueAtTime(0, startTime + durationMs / 1000)
  osc.connect(gain)
  gain.connect(masterGain!)
  osc.start(startTime)
  osc.stop(startTime + durationMs / 1000 + 0.01)
}

export function playWarning(mineCount: number): void {
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
  if (!ctx) return
  const ac = ctx
  const now = ac.currentTime
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.9, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
  gain.connect(masterGain!)
  const osc = ac.createOscillator()
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
  if (!ctx) return
  const now = ctx.currentTime
  const notes = [262, 330, 392, 523]
  notes.forEach((f, i) => beep(f, 120, now + i * 0.15))
}

export function playGameOver(): void {
  if (!ctx) return
  const now = ctx.currentTime
  const notes = [262, 247, 233, 220, 208]
  notes.forEach((f, i) => beep(f, 220, now + i * 0.27))
}

export function startApproachSound(): void {
  if (!ctx || approachOsc || airplaneOsc) return
  const ac = ctx
  const now = ac.currentTime
  approachGain = ac.createGain()
  approachGain.gain.value = 0.04
  approachGain.connect(masterGain!)
  approachOsc = ac.createOscillator()
  approachOsc.type = 'square'
  approachOsc.frequency.value = 1300
  approachOsc.connect(approachGain)
  approachOsc.start(now)
}

export function stopApproachSound(): void {
  if (!ctx || !approachOsc) return
  const now = ctx.currentTime
  approachGain?.gain.linearRampToValueAtTime(0, now + 0.2)
  approachOsc.stop(now + 0.25)
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
  if (!ctx) return
  beep(85, 28, ctx.currentTime)
}

export function playGemCollect(comboCount: number): void {
  if (!ctx) return
  const now = ctx.currentTime
  const freq = Math.min(880 + (comboCount - 1) * 110, 1760)
  beep(freq, 60, now)
  if (comboCount >= 2) beep(Math.min(freq * 1.25, 2200), 60, now + 0.09)
}

export function startAirplane(): void {
  stopApproachSound()
  if (!ctx || airplaneOsc) return
  const ac = ctx
  const now = ac.currentTime
  airplaneGain = ac.createGain()
  airplaneGain.gain.setValueAtTime(0, now)
  airplaneGain.gain.linearRampToValueAtTime(0.4, now + 0.3)
  airplaneGain.connect(masterGain!)
  airplaneOsc = ac.createOscillator()
  airplaneOsc.type = 'square'
  airplaneOsc.frequency.value = 1300
  airplaneLfo = ac.createOscillator()
  airplaneLfo.type = 'square'
  airplaneLfo.frequency.value = 12
  const lfoGain = ac.createGain()
  lfoGain.gain.value = 80
  airplaneLfo.connect(lfoGain)
  lfoGain.connect(airplaneOsc.frequency)
  airplaneOsc.connect(airplaneGain)
  airplaneLfo.start(now)
  airplaneOsc.start(now)
}

export function stopAmbientSounds(): void {
  stopApproachSound()
  if (!ctx || !airplaneGain || !airplaneOsc || !airplaneLfo) return
  const now = ctx.currentTime
  airplaneGain.gain.linearRampToValueAtTime(0, now + 0.3)
  airplaneOsc.stop(now + 0.35)
  airplaneLfo.stop(now + 0.35)
  airplaneOsc = null
  airplaneLfo = null
  airplaneGain = null
}

export function playIntroBeep(): void {
  if (!ctx) return
  beep(440, 50, ctx.currentTime)
}
