import type { SlotState } from '@/visuals/DisplayView'
import type { FeedbackState } from './types'

/** Answer-slot color for the current feedback (icon + color, never color alone). */
export function slotState(feedback: FeedbackState): SlotState {
  if (feedback === 'correct' || feedback === 'solution') return 'correct'
  return feedback === 'incorrect' ? 'incorrect' : 'default'
}
