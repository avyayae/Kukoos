import type { Question, Response } from '@/domain'

/** How the current question should look after CHECK. */
export type FeedbackState = 'none' | 'correct' | 'incorrect' | 'solution'

/**
 * Contract every question renderer implements. Renderers own their input UI (keypad,
 * tiles, column grid, blocks) and report the current answer; the lesson screen owns
 * CHECK, feedback and flow.
 */
export interface RendererProps {
  question: Question
  /** Column questions: walk through one column at a time. */
  guided: boolean
  /** True while a feedback banner is showing. */
  locked: boolean
  feedback: FeedbackState
  /** Earlier wrong answers to this question (choice tiles get disabled). */
  wrongResponses: readonly Response[]
  /** The current complete answer, or null while incomplete. */
  onChange: (response: Response | null) => void
  /** Lets a renderer put text in Kukoos's bubble (guided steps, block tips). */
  onBubble: (text: string | null) => void
}

/** Max digits a kid can type: every MVP answer is ≤ 999. */
export const MAX_ANSWER_DIGITS = 3
