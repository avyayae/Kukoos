import type { SfxKey } from '@/audio/sfx'
import type { LessonPhase } from '@/domain'

/** Combo counts that get the bigger combo sound. */
const COMBO_SOUNDS = new Set([3, 5, 10])

export function sfxFor(phase: LessonPhase, combo: number): SfxKey | null {
  switch (phase) {
    case 'correct':
      return COMBO_SOUNDS.has(combo) ? 'combo' : 'correct'
    case 'notYet':
    case 'solution':
      return 'notYet'
    case 'complete':
      return 'complete'
    case 'answering':
      return null
  }
}
