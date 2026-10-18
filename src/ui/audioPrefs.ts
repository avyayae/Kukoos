import { createContext, useContext } from 'react'
import { type AudioPrefs, DEFAULT_AUDIO } from '@/audio/prefs'

export interface AudioPrefsValue {
  prefs: AudioPrefs
  /** Updates and saves the device's sound and voice settings (spec 009). */
  setPrefs(patch: Partial<AudioPrefs>): void
}

export const AudioPrefsContext = createContext<AudioPrefsValue>({
  prefs: DEFAULT_AUDIO,
  setPrefs: () => undefined,
})

export function useAudioPrefs(): AudioPrefsValue {
  return useContext(AudioPrefsContext)
}
