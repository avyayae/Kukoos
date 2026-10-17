import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureSfx, isSfxKey, playSfx, resetSfxForTests, SOUNDS, unlockAudio } from '@/audio/sfx'
import { EFFECT_SOUNDS } from '@/domain'
import { sfxFor } from '@/features/lesson-player/sounds'

let oscillators = 0
let resumed = 0
class FakeContext {
  state = 'suspended'
  currentTime = 0
  destination = {}
  createOscillator() {
    oscillators++
    return {
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }
  }
  resume() {
    resumed++
    return Promise.resolve()
  }
}

let visibility: DocumentVisibilityState = 'visible'
beforeEach(() => {
  oscillators = 0
  resumed = 0
  visibility = 'visible'
  resetSfxForTests()
  configureSfx({ on: true, volume: 0.8 })
  window.__kukoosSfx = []
  Object.defineProperty(window, 'AudioContext', { configurable: true, value: FakeContext })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
})
afterEach(() => {
  Reflect.deleteProperty(window, 'AudioContext')
})

describe('sfx engine (AC5)', () => {
  it('plays every note of a sound once and logs it in dev', () => {
    playSfx('complete')
    expect(oscillators).toBe(SOUNDS.complete.length)
    expect(window.__kukoosSfx).toEqual(['complete'])
  })

  it('is silent when sound is off, volume is 0 or the page is hidden', () => {
    configureSfx({ on: false, volume: 0.8 })
    playSfx('correct')
    configureSfx({ on: true, volume: 0 })
    playSfx('correct')
    configureSfx({ on: true, volume: 0.8 })
    visibility = 'hidden'
    playSfx('correct')
    expect(oscillators).toBe(0)
    expect(window.__kukoosSfx).toEqual([])
  })

  it('never throws without Web Audio, and unlocks a suspended context', () => {
    unlockAudio()
    expect(resumed).toBe(1)
    Reflect.deleteProperty(window, 'AudioContext')
    resetSfxForTests()
    expect(() => playSfx('tap')).not.toThrow()
    expect(() => unlockAudio()).not.toThrow()
  })

  it('sounds are gentle: short, quiet, nothing harsh', () => {
    for (const [key, notes] of Object.entries(SOUNDS)) {
      for (const note of notes) {
        expect(note.g ?? 0.4, key).toBeLessThanOrEqual(0.5)
        expect(note.t + note.d, key).toBeLessThanOrEqual(3)
        expect(note.w ?? 'sine', key).not.toBe('sawtooth')
        expect(note.w ?? 'sine', key).not.toBe('square')
      }
    }
  })
})

describe('sound pairing (AC6)', () => {
  it('every reward effect has a sound', () => {
    for (const sound of Object.values(EFFECT_SOUNDS)) expect(isSfxKey(sound), sound).toBe(true)
    expect(isSfxKey('toString')).toBe(false)
  })

  it('lesson feedback: correct, combo milestones, not yet, complete', () => {
    expect(sfxFor('correct', 1)).toBe('correct')
    expect(sfxFor('correct', 3)).toBe('combo')
    expect(sfxFor('correct', 4)).toBe('correct')
    expect(sfxFor('correct', 10)).toBe('combo')
    expect(sfxFor('notYet', 0)).toBe('notYet')
    expect(sfxFor('solution', 0)).toBe('notYet')
    expect(sfxFor('complete', 0)).toBe('complete')
    expect(sfxFor('answering', 0)).toBeNull()
  })
})
