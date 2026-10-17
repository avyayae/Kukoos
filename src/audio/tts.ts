/**
 * Text-to-speech via the Web Speech API (offline on most devices, no cost).
 * Every function fails silently: speech is a helper, never a requirement (spec 005 AC9).
 */

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  )
}

/** Prefer a US-English voice; fall back to any English voice, then the default. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === 'en-US' && v.localService) ??
    voices.find((v) => v.lang === 'en-US') ??
    voices.find((v) => v.lang.startsWith('en'))
  )
}

export interface SpeakOptions {
  /** 0.1–10; slightly slow by default for young listeners. */
  rate?: number
}

/** Speaks `text`, interrupting anything already being said. */
export function speak(text: string, { rate = 0.9 }: SpeakOptions = {}): void {
  if (!isSpeechSupported() || text.trim() === '') return
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = new window.SpeechSynthesisUtterance(text)
    utterance.rate = rate
    utterance.lang = 'en-US'
    const voice = pickVoice()
    if (voice) utterance.voice = voice
    synth.speak(utterance)
  } catch {
    // Some browsers throw before a user gesture; staying quiet is fine.
  }
}

export function cancelSpeech(): void {
  if (!isSpeechSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // ignore
  }
}
