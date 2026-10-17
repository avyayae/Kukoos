// Pure domain core: curriculum, generators, engines and gamification rules.
// No React, storage, DOM or Math.random here (enforced by ESLint, see eslint.config.js).
export * from './rng'
export * from './types'
export { numberToWords, equationToText, equationToSpeech } from './speech'
export { WORLDS, getWorld } from './curriculum/worlds'
export { SKILLS } from './curriculum/skills'
export {
  getSkill,
  skillsInWorld,
  unlockedSkills,
  validateCurriculum,
} from './curriculum/skillGraph'
export { solveColumns, resultOf } from './arithmetic/solveColumns'
export { regroupPattern } from './arithmetic/regroupPattern'
export {
  detectMisconception,
  MISCONCEPTION_PRIORITY,
  simulateBugs,
} from './arithmetic/misconceptions'
export { generateQuestion } from './generators/registry'
export { correctResponse, wrongResponse } from './generators/responses'
export { lessonPlan, LESSON_LENGTH, type PlannedKind } from './engine/lessonPlan'
export {
  firstTryAccuracy,
  lessonMinutes,
  lessonProgress,
  lessonReducer,
  MAX_REQUEUES,
  startLesson,
  type LessonEvent,
  type LessonPhase,
  type LessonState,
  type QuestionResult,
} from './engine/lessonSession'
export {
  formatMessage,
  guidedSteps,
  hintFor,
  solutionFor,
  type Message,
  type MessageParams,
} from './engine/hintText'
export { check } from './generators/check'
