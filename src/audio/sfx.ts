/**
 * Sound effects synthesized with Web Audio (spec 009): no files, nothing to license, works
 * offline. Every function fails silently; sound is a delight, never a requirement.
 */

interface Note {
  /** Frequency in Hz. */
  f: number
  /** Start and duration in seconds. */
  t: number
  d: number
  w?: OscillatorType
  /** Loudness 0–1 before the master volume. */
  g?: number
}

const n = (f: number, t: number, d: number, g = 0.4, w: OscillatorType = 'sine'): Note => ({
  f,
  t,
  d,
  g,
  w,
})

/** Gentle, bright, never harsh. "Not yet" is a soft low boop, never a buzzer (§1.2). */
export const SOUNDS = {
  tap: [n(660, 0, 0.05, 0.12)],
  correct: [n(1047, 0, 0.1), n(1319, 0.09, 0.22)],
  notYet: [n(330, 0, 0.14, 0.25), n(262, 0.12, 0.22, 0.25)],
  combo: [523, 659, 784, 1047].map((f, i) => n(f, i * 0.07, 0.12, 0.35, 'triangle')),
  complete: [
    n(523, 0, 0.16, 0.45, 'triangle'),
    n(659, 0.15, 0.16, 0.45, 'triangle'),
    n(784, 0.3, 0.16, 0.45, 'triangle'),
    n(1047, 0.45, 0.6, 0.5, 'triangle'),
  ],
  unlock: [n(784, 0, 0.12), n(1175, 0.1, 0.12), n(1568, 0.2, 0.35, 0.35)],
  xp: [n(880, 0, 0.06, 0.25), n(988, 0.07, 0.06, 0.25), n(1175, 0.14, 0.12, 0.3)],
  chest: [523, 784, 1047, 1568].map((f, i) => n(f, i * 0.06, 0.18, 0.35, 'triangle')),
  gems: [n(1319, 0, 0.08, 0.3), n(1568, 0.07, 0.08, 0.3), n(2093, 0.14, 0.25, 0.3)],
  badge: [659, 784, 988, 1319].map((f, i) => n(f, i * 0.09, 0.2, 0.4, 'triangle')),
  levelUp: [523, 659, 784, 1047, 1319].map((f, i) => n(f, i * 0.08, 0.22, 0.4, 'triangle')),
  goal: [n(784, 0, 0.12), n(988, 0.1, 0.12), n(1175, 0.2, 0.12), n(1568, 0.3, 0.4, 0.45)],
  streak: [
    n(392, 0, 0.18, 0.3, 'triangle'),
    n(523, 0.12, 0.18, 0.3, 'triangle'),
    n(659, 0.24, 0.35),
  ],
  freeze: [n(1568, 0, 0.15, 0.25), n(1319, 0.12, 0.15, 0.25), n(1175, 0.24, 0.3, 0.25)],
  lullaby: [
    n(523, 0, 0.5, 0.2),
    n(440, 0.55, 0.5, 0.2),
    n(392, 1.1, 0.5, 0.2),
    n(330, 1.65, 1.2, 0.2),
  ],
} satisfies Record<string, readonly Note[]>

export type SfxKey = keyof typeof SOUNDS

export function isSfxKey(key: string): key is SfxKey {
  return Object.hasOwn(SOUNDS, key)
}

const settings = { on: true, volume: 0.8 }

export function configureSfx(next: { on: boolean; volume: number }): void {
  settings.on = next.on
  settings.volume = Math.min(1, Math.max(0, next.volume))
}

/** Dev and e2e builds record what played, so tests can check sounds without speakers. */
const LOG = import.meta.env.DEV || import.meta.env.VITE_E2E === '1'
declare global {
  interface Window {
    __kukoosSfx?: SfxKey[]
    webkitAudioContext?: typeof AudioContext
  }
}

let ctx: AudioContext | null = null
function context(): AudioContext | null {
  if (ctx) return ctx
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? window.webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    return null
  }
  return ctx
}

/** Browsers start audio suspended until a user gesture: call on the first tap. */
export function unlockAudio(): void {
  const c = context()
  if (c?.state === 'suspended') void c.resume().catch(() => undefined)
}

/** Plays a sound once (spec 009 AC5): silent when sound is off or the page is hidden. */
export function playSfx(key: SfxKey): void {
  if (!settings.on || settings.volume === 0) return
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  if (LOG && typeof window !== 'undefined') (window.__kukoosSfx ??= []).push(key)
  const c = context()
  if (!c) return
  try {
    const start = c.currentTime + 0.01
    for (const note of SOUNDS[key]) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = note.w ?? 'sine'
      osc.frequency.value = note.f
      const peak = Math.max(0.0001, (note.g ?? 0.4) * settings.volume * 0.5)
      const t0 = start + note.t
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.d)
      osc.connect(gain)
      gain.connect(c.destination)
      osc.start(t0)
      osc.stop(t0 + note.d + 0.02)
    }
  } catch {
    // Audio is a delight, never a requirement.
  }
}

/** Test helper: forget the audio context (each test starts fresh). */
export function resetSfxForTests(): void {
  ctx = null
}
