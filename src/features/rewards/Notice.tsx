import { useEffect, useEffectEvent, useState } from 'react'
import { speak } from '@/audio/tts'
import { useReadAloud } from '@/ui'

export const NOTICE_MS = 4000

/** A short, non-blocking banner at the top that speaks once and hides itself. */
export function Notice({ emoji, text, testId }: { emoji: string; text: string; testId: string }) {
  const { readAloud } = useReadAloud()
  const [hidden, setHidden] = useState(false)
  const announce = useEffectEvent(() => {
    if (readAloud) speak(text)
  })
  useEffect(() => {
    announce()
    const id = window.setTimeout(() => setHidden(true), NOTICE_MS)
    return () => window.clearTimeout(id)
  }, [])
  if (hidden) return null
  return (
    <div className="notice" role="status" data-testid={testId}>
      <span aria-hidden="true">{emoji}</span> {text}
    </div>
  )
}
