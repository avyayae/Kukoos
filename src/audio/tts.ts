import { DEFAULT_RATE, RATE_RANGE } from './prefs'
import { rankVoices } from './voices'

/**
 * Text-to-speech via the Web Speech API (offline on most devices, no cost).
 * Every function fails silently: speech is a helper, never a requirement (spec 005 AC9).
 * The voice and speed come from the grown-ups' choice (spec 009), else the best voice.
 */

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  )
}

const config: { voiceURI: string | null; rate: number } = { voiceURI: null, rate: DEFAULT_RATE }

/** Applies the saved voice and speed to all later speech. */
export function configureSpeech(next: { voiceURI: string | null; rate: number }): void {
  config.voiceURI = next.voiceURI
  config.rate = Math.min(RATE_RANGE.max, Math.max(RATE_RANGE.min, next.rate))
}

export function availableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return []
  try {
    return window.speechSynthesis.getVoices()
  } catch {
    return []
  }
}

/** The chosen voice if this device still has it, else the top-ranked one (spec 009 AC8). */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = availableVoices()
  return voices.find((v) => v.voiceURI === config.voiceURI) ?? rankVoices(voices)[0]
}

// ---- speaking store (Kukoos's beak moves while this is true)
let speaking = false
const listeners = new Set<() => void>()
function setSpeaking(next: boolean) {
  if (speaking === next) return
  speaking = next
  for (const l of listeners) l()
}
export function subscribeSpeaking(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function isSpeaking(): boolean {
  return speaking
}

export interface SpeakOptions {
  /** Overrides the configured speed (0.1–10). */
  rate?: number
  /** Overrides the configured voice (the grown-ups' "Test voice"). */
  voiceURI?: string
}

/** Speaks `text`, interrupting anything already being said. */
export function speak(text: string, options: SpeakOptions = {}): void {
  if (!isSpeechSupported() || text.trim() === '') return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = new window.SpeechSynthesisUtterance(text)
    utterance.rate = options.rate ?? config.rate
    utterance.lang = 'en-US'
    const voice = options.voiceURI
      ? availableVoices().find((v) => v.voiceURI === options.voiceURI)
      : pickVoice()
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    }
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    synth.speak(utterance)
  } catch {
    // Some browsers throw before a user gesture; staying quiet is fine.
  }
}

export function cancelSpeech(): void {
  setSpeaking(false)
  if (!isSpeechSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // ignore
  }
}
