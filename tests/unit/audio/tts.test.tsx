import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelSpeech, isSpeechSupported, speak } from '@/audio/tts'
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

function installSpeech(voices: { lang: string; localService: boolean }[] = []) {
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
