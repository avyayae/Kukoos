/** Speaking speed: slightly slow by default for young listeners. */
export const DEFAULT_RATE = 0.9
export const RATE_RANGE = { min: 0.8, max: 1.1 } as const

/** Per-device sound and voice settings (spec 009), saved on the `global` settings row. */
export interface AudioPrefs {
  /** Read prompts aloud and speak tapped labels. */
  readAloud: boolean
  soundOn: boolean
  /** 0–1. */
  volume: number
  /** The grown-ups' chosen voice; `null` = the best-ranked voice on this device. */
  voiceURI: string | null
  /** The Spanish voice (spec 018); `null` = the best-ranked Spanish voice on this device. */
  spanishVoiceURI: string | null
  speechRate: number
}

export const DEFAULT_AUDIO: AudioPrefs = {
  readAloud: true,
  soundOn: true,
  volume: 0.8,
  voiceURI: null,
  spanishVoiceURI: null,
  speechRate: DEFAULT_RATE,
}
