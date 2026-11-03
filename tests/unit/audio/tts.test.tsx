import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelSpeech,
  configureSpeech,
  isSpeechSupported,
  spanishVoice,
  speak,
  speakParts,
} from '@/audio/tts'
import { SpeakButton } from '@/ui/SpeakButton'

class FakeUtterance {
  rate = 1
  lang = ''
  voice: unknown = null
  text: string
  constructor(text: string) {
    this.text = text
  }
}

function installSpeech(
  voices: { lang: string; localService: boolean; name?: string; voiceURI?: string }[] = [],
) {
  const synth = { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => voices) }
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: FakeUtterance,
    configurable: true,
  })
  return synth
}

function removeSpeech() {
  Reflect.deleteProperty(window, 'speechSynthesis')
  Reflect.deleteProperty(window, 'SpeechSynthesisUtterance')
}

describe('tts (AC9)', () => {
  beforeEach(removeSpeech)
  afterEach(removeSpeech)

  it('speaks with a US-English voice, cancelling anything in progress', () => {
    const synth = installSpeech([
      { lang: 'fr-FR', localService: true },
      { lang: 'en-US', localService: true },
    ])
    speak('What is thirty-six minus twenty-eight?')
    expect(synth.cancel).toHaveBeenCalled()
    const utterance = synth.speak.mock.calls[0]?.[0] as FakeUtterance
    expect(utterance.text).toBe('What is thirty-six minus twenty-eight?')
    expect(utterance.lang).toBe('en-US')
    expect(utterance.rate).toBe(0.9)
    expect(utterance.voice).toEqual({ lang: 'en-US', localService: true })
  })

  it('does nothing for empty text', () => {
    const synth = installSpeech()
    speak('   ')
    expect(synth.speak).not.toHaveBeenCalled()
  })

  it('is silent and safe where speech is unsupported or throws', () => {
    expect(isSpeechSupported()).toBe(false)
    expect(() => speak('hello')).not.toThrow()
    expect(() => cancelSpeech()).not.toThrow()

    const synth = installSpeech()
    synth.speak.mockImplementation(() => {
      throw new Error('not allowed')
    })
    synth.cancel.mockImplementationOnce(() => undefined)
    expect(() => speak('hello')).not.toThrow()
    synth.cancel.mockImplementation(() => {
      throw new Error('nope')
    })
    expect(() => cancelSpeech()).not.toThrow()
  })

  it('SpeakButton speaks its text, and hides without speech support', async () => {
    const { unmount } = render(<SpeakButton text="Hi" />)
    expect(screen.queryByRole('button')).toBeNull()
    unmount()

    const synth = installSpeech()
    render(<SpeakButton text="Hello Kukoos" />)
    await userEvent.click(screen.getByRole('button', { name: 'Read it to me' }))
    expect((synth.speak.mock.calls[0]?.[0] as FakeUtterance).text).toBe('Hello Kukoos')
  })
})

describe('speech per language (spec 018 AC3, AC4)', () => {
  beforeEach(() => {
    removeSpeech()
    configureSpeech({ voiceURI: null, spanishVoiceURI: null, rate: 0.9 })
  })
  afterEach(removeSpeech)

  const voices = [
    { name: 'Aria', voiceURI: 'aria', lang: 'en-US', localService: true },
    { name: 'Helena', voiceURI: 'helena', lang: 'es-ES', localService: true },
    { name: 'Paulina', voiceURI: 'paulina', lang: 'es-MX', localService: true },
  ]

  it('Spanish words use the best Spanish voice (Latin American first)', () => {
    const synth = installSpeech(voices)
    expect(spanishVoice()).toMatchObject({ voiceURI: 'paulina' })
    speak('el perro', { lang: 'es' })
    const u = synth.speak.mock.calls[0]?.[0] as FakeUtterance
    expect(u.lang).toBe('es-MX')
    expect(u.voice).toMatchObject({ voiceURI: 'paulina' })
    // English stays English.
    speak('Tap the dog')
    expect((synth.speak.mock.calls[1]?.[0] as FakeUtterance).voice).toMatchObject({
      voiceURI: 'aria',
    })
  })

  it('the grown-ups’ Spanish voice wins while the device has it', () => {
    installSpeech(voices)
    configureSpeech({ voiceURI: null, spanishVoiceURI: 'helena', rate: 0.9 })
    expect(spanishVoice()).toMatchObject({ voiceURI: 'helena' })
    configureSpeech({ voiceURI: null, spanishVoiceURI: 'gone', rate: 0.9 })
    expect(spanishVoice()).toMatchObject({ voiceURI: 'paulina' })
  })

  it('without a Spanish voice: none is picked, but the language is still Spanish', () => {
    const synth = installSpeech([voices[0] as (typeof voices)[number]])
    expect(spanishVoice()).toBeNull()
    speak('hola', { lang: 'es' })
    const u = synth.speak.mock.calls[0]?.[0] as FakeUtterance
    expect(u.lang).toBe('es-MX')
    expect(u.voice).toBeNull()
  })

  it('a mixed line is queued in order, each part in its own voice', () => {
    const synth = installSpeech(voices)
    speakParts(['Tap the one you hear:', { es: 'el perro' }, ''])
    expect(synth.cancel).toHaveBeenCalledTimes(1)
    const said = synth.speak.mock.calls.map((c) => c[0] as FakeUtterance)
    expect(said.map((u) => [u.text, u.lang])).toEqual([
      ['Tap the one you hear:', 'en-US'],
      ['el perro', 'es-MX'],
    ])
    cancelSpeech()
    expect(synth.cancel).toHaveBeenCalledTimes(2)
  })
})
