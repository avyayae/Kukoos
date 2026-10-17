import { type ReactNode, useState } from 'react'
import { ReadAloudContext } from './readAloud'

/** App-wide read-aloud setting (on by default for young readers). */
export function ReadAloudProvider({
  initial = true,
  children,
}: {
  initial?: boolean
  children: ReactNode
}) {
  const [readAloud, setReadAloud] = useState(initial)
  return <ReadAloudContext value={{ readAloud, setReadAloud }}>{children}</ReadAloudContext>
}
