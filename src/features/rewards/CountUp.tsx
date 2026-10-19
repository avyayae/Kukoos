import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion'

export const COUNT_UP_MS = 900

/** Counts from 0 to `value` with an ease-out (motion-design `gentle`); static with reduced motion. */
export function CountUp({ value, prefix = '' }: { value: number; prefix?: string }) {
  const reduced = usePrefersReducedMotion()
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (reduced) return
    let frame = 0
    const start = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / COUNT_UP_MS)
      setShown(Math.round(value * (1 - (1 - p) ** 3)))
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, reduced])

  // Screen readers get the final value; only the visible digits animate.
  return (
    <span className="num">
      <span className="sr-only" data-testid="count-final">
        {prefix}
        {value}
      </span>
      <span aria-hidden="true">
        {prefix}
        {reduced ? value : shown}
      </span>
    </span>
  )
}
