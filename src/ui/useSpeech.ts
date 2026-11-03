import { useSyncExternalStore } from 'react'
import { availableVoices, isSpeaking, isSpeechSupported, subscribeSpeaking } from '@/audio/tts'
import { rankSpanishVoices, rankVoices } from '@/audio/voices'

/** True while an utterance is playing (Kukoos moves its beak, spec 009 AC3). */
export function useSpeaking(): boolean {
  return useSyncExternalStore(subscribeSpeaking, isSpeaking, () => false)
}

/** A stable snapshot per ranking, so React only re-renders when the list really changes. */
function snapshotOf(rank: (voices: SpeechSynthesisVoice[]) => SpeechSynthesisVoice[]) {
  let cached: SpeechSynthesisVoice[] = []
  let cachedKey = ''
  return () => {
    const ranked = rank(availableVoices())
    const key = ranked.map((v) => v.voiceURI).join('|')
    if (key !== cachedKey) {
      cachedKey = key
      cached = ranked
    }
    return cached
  }
}
const snapshot = snapshotOf(rankVoices)
const spanishSnapshot = snapshotOf(rankSpanishVoices)
function subscribeVoices(listener: () => void): () => void {
  // Older Safari has no addEventListener on speechSynthesis: then voices just don't refresh.
  const synth = isSpeechSupported() ? window.speechSynthesis : undefined
  if (typeof synth?.addEventListener !== 'function') return () => undefined
  synth.addEventListener('voiceschanged', listener)
  return () => synth.removeEventListener('voiceschanged', listener)
}

/** English voices on this device, friendliest first; updates when the browser loads them. */
export function useVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribeVoices, snapshot, () => [])
}

/** Spanish voices on this device, Latin American first (spec 018); updates like `useVoices`. */
export function useSpanishVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribeVoices, spanishSnapshot, () => [])
}
