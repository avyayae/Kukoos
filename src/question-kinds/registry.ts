import type { ComponentType } from 'react'
import type { QuestionKind } from '@/domain'
import { CompareQuestion, McqQuestion, TrueFalseQuestion } from './ChoiceQuestions'
import { ColumnQuestion } from './ColumnQuestion'
import { NumericQuestion } from './NumericQuestion'
import { TradeBlocksQuestion } from './TradeBlocksQuestion'
import type { RendererProps } from './types'

/** Every question kind has a renderer — the compiler enforces completeness. */
export const RENDERERS: Record<QuestionKind, ComponentType<RendererProps>> = {
  numeric: NumericQuestion,
  mcq: McqQuestion,
  trueFalse: TrueFalseQuestion,
  compare: CompareQuestion,
  column: ColumnQuestion,
  tradeBlocks: TradeBlocksQuestion,
}
