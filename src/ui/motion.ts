import type { Transition } from 'motion/react'

/**
 * Motion presets (mathquest-ui skill → "Motion & sound pairing").
 * Components pick a preset by name instead of inventing their own timings.
 * Under prefers-reduced-motion, use `reducedFade` and avoid transforms
 * (motion's `useReducedMotion()` tells you which one applies).
 */
export const springs = {
  /** Quick pop for check marks, unlocks, badges. */
  pop: { type: 'spring', stiffness: 500, damping: 22 },
  /** Playful overshoot for map nodes, streak flame, block trades. */
  bounce: { type: 'spring', stiffness: 300, damping: 12 },
  /** Calm settle for progress bars and XP count-ups. */
  gentle: { type: 'spring', stiffness: 200, damping: 26 },
} as const satisfies Record<string, Transition>

export const tweens = {
  press: { duration: 0.08, ease: [0.2, 0.8, 0.2, 1] },
  slideUp: { duration: 0.25, ease: [0.2, 0.8, 0.2, 1] },
  reducedFade: { duration: 0.15, ease: 'linear' },
} as const satisfies Record<string, Transition>

/** Horizontal "not yet" shake: 6px, twice. */
export const shakeKeyframes = { x: [0, -6, 6, -6, 6, 0] }

export type SpringName = keyof typeof springs
