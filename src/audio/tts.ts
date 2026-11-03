import { DEFAULT_RATE, RATE_RANGE } from './prefs'
import { rankSpanishVoices, rankVoices } from './voices'

/**
 * Text-to-speech via the Web Speech API (offline on most devices, no cost).
 * Every function fails silently: speech is a helper, never a requirement (spec 005 AC9).
 * The voice and speed come from the grown-ups' choice (spec 009), else the best voice.
 * Spanish words use a Spanish voice (spec 018); everything else is English.
 */

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  )
}

export type SpeechLang = 'en' | 'es'

const config: { voiceURI: string | null; spanishVoiceURI: string | null; rate: number } = {
  voiceURI: null,
  spanishVoiceURI: null,
  rate: DEFAULT_RATE,
}

/** Applies the saved voices and speed to all later speech. */
export function configureSpeech(next: {
  voiceURI: string | null
  spanishVoiceURI?: string | null
  rate: number
}): void {
  config.voiceURI = next.voiceURI
  config.spanishVoiceURI = next.spanishVoiceURI ?? null
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

/**
 * The Spanish voice (spec 018 AC3): the grown-ups' choice if this device still has it, else
 * the best-ranked one (Latin American first); `null` when the device has no Spanish voice.
 */
export function spanishVoice(): SpeechSynthesisVoice | null {
  const voices = availableVoices()
  const chosen = voices.find((v) => v.voiceURI === config.spanishVoiceURI)
  return chosen ?? rankSpanishVoices(voices)[0] ?? null
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
  /** The language to speak in (default English). */
  lang?: SpeechLang
}

/** A line in more than one language: English text, or `{ es }` for Spanish words. */
export type SpeechPart = string | { es: string }

function utteranceFor(text: string, options: SpeakOptions): SpeechSynthesisUtterance {
  const utterance = new window.SpeechSynthesisUtterance(text)
  utterance.rate = options.rate ?? config.rate
  const spanish = options.lang === 'es'
  // Without a Spanish voice the browser still gets the language, and does its best.
  utterance.lang = spanish ? 'es-MX' : 'en-US'
  const voice = options.voiceURI
    ? availableVoices().find((v) => v.voiceURI === options.voiceURI)
    : spanish
      ? spanishVoice()
      : pickVoice()
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }
  return utterance
}

/** Speaks `text`, interrupting anything already being said. */
export function speak(text: string, options: SpeakOptions = {}): void {
  if (!isSpeechSupported() || text.trim() === '') return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = utteranceFor(text, options)
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    synth.speak(utterance)
  } catch {
    // Some browsers throw before a user gesture; staying quiet is fine.
  }
}

/**
 * Speaks a mixed line (spec 018 AC4), e.g. ["Tap the one you hear:", { es: 'el perro' }]:
 * one utterance per part, in order, each in its own voice. Interrupts anything playing.
 */
export function speakParts(parts: readonly SpeechPart[], options: { rate?: number } = {}): void {
  const items = parts
    .map((p) =>
      typeof p === 'string'
        ? { text: p, lang: 'en' as const }
        : { text: p.es, lang: 'es' as const },
    )
    .filter((p) => p.text.trim() !== '')
  if (!isSpeechSupported() || items.length === 0) return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    items.forEach((item, i) => {
      const utterance = utteranceFor(item.text, { ...options, lang: item.lang })
      if (i === 0) utterance.onstart = () => setSpeaking(true)
      if (i === items.length - 1) utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      synth.speak(utterance)
    })
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
