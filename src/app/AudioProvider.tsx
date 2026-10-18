import { type ReactNode, useEffect, useRef, useState } from 'react'
import { type AudioPrefs, DEFAULT_AUDIO } from '@/audio/prefs'
import { configureSfx, unlockAudio } from '@/audio/sfx'
import { configureSpeech } from '@/audio/tts'
import { useRepos } from '@/data'
import { AudioPrefsContext } from '@/ui/audioPrefs'
import { ReadAloudContext } from '@/ui/readAloud'

/**
 * Sound and voice settings for this device (spec 009 AC10): loaded from storage, applied
 * to the speech and sfx modules, and saved on every change. Also provides read-aloud.
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const repos = useRepos()
  const [prefs, setPrefsState] = useState<AudioPrefs>(DEFAULT_AUDIO)
  // A change made before the saved settings load wins over them.
  const touched = useRef(false)

  useEffect(() => {
    let alive = true
    repos.device
      .audio()
      .then((p) => {
        if (alive && !touched.current) setPrefsState(p)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [repos])

  useEffect(() => {
    configureSpeech({ voiceURI: prefs.voiceURI, rate: prefs.speechRate })
    configureSfx({ on: prefs.soundOn, volume: prefs.volume })
  }, [prefs])

  // Browsers keep audio suspended until a user gesture.
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const setPrefs = (patch: Partial<AudioPrefs>) => {
    touched.current = true
    const next = { ...prefs, ...patch }
    setPrefsState(next)
    void repos.device.setAudio(next).catch(() => undefined)
  }

  return (
    <AudioPrefsContext value={{ prefs, setPrefs }}>
      <ReadAloudContext
        value={{ readAloud: prefs.readAloud, setReadAloud: (on) => setPrefs({ readAloud: on }) }}
      >
        {children}
      </ReadAloudContext>
    </AudioPrefsContext>
  )
}
