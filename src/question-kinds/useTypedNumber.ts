import { useCallback, useState } from 'react'
import { MAX_ANSWER_DIGITS } from './types'

/** Digits typed on the keypad, left to right (normal number entry). */
export function useTypedNumber(onValue: (value: number | null) => void) {
  const [text, setText] = useState('')

  const update = useCallback(
    (next: string) => {
      setText(next)
      onValue(next === '' ? null : Number(next))
    },
    [onValue],
  )

  const push = useCallback(
    (digit: number) => {
      if (text.length >= MAX_ANSWER_DIGITS) return
      update(text === '0' ? String(digit) : text + String(digit))
    },
    [text, update],
  )

  const pop = useCallback(() => update(text.slice(0, -1)), [text, update])

  return { text, push, pop }
}
