import { createContext, useContext } from 'react'
import { speak } from '@/audio/tts'

export interface ReadAloud {
  /** Read prompts aloud and speak tapped labels (kept in memory until F11 settings). */
  readAloud: boolean
  setReadAloud: (on: boolean) => void
}

export const ReadAloudContext = createContext<ReadAloud | null>(null)

export function useReadAloud(): ReadAloud {
  const ctx = useContext(ReadAloudContext)
  if (!ctx) throw new Error('useReadAloud must be used inside <ReadAloudProvider>')
  return ctx
}

/**
 * Tap-to-hear (spec 007 AC6): returns a function that speaks a label when read-aloud is
 * on. Each call interrupts the previous one, so taps never stack up.
 */
export function useSpeakOnTap(): (text: string) => void {
  const { readAloud } = useReadAloud()
  return (text: string) => {
    if (readAloud) speak(text)
  }
}
