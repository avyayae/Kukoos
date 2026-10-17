import { useEffect, useRef } from 'react'

/**
 * Focuses an element when it mounts (or when `key` changes), so keyboard and
 * screen-reader users land on the primary action of a banner or sheet.
 */
export function useAutoFocus<T extends HTMLElement>(key?: unknown) {
  const ref = useRef<T>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [key])
  return ref
}
