import { useSyncExternalStore } from 'react'
import { availableVoices, isSpeaking, isSpeechSupported, subscribeSpeaking } from '@/audio/tts'
import { rankVoices } from '@/audio/voices'

/** True while an utterance is playing (Kukoos moves its beak, spec 009 AC3). */
export function useSpeaking(): boolean {
  return useSyncExternalStore(subscribeSpeaking, isSpeaking, () => false)
}

let cached: SpeechSynthesisVoice[] = []
let cachedKey = ''
function snapshot(): SpeechSynthesisVoice[] {
  const ranked = rankVoices(availableVoices())
  const key = ranked.map((v) => v.voiceURI).join('|')
  if (key !== cachedKey) {
    cachedKey = key
    cached = ranked
  }
  return cached
}
function subscribeVoices(listener: () => void): () => void {
  if (!isSpeechSupported()) return () => undefined
  const synth = window.speechSynthesis
  synth.addEventListener?.('voiceschanged', listener)
  return () => synth.removeEventListener?.('voiceschanged', listener)
}

/** English voices on this device, friendliest first; updates when the browser loads them. */
export function useVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(subscribeVoices, snapshot, () => [])
}
