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
export {
  bandFor,
  composeLesson,
  composeReview,
  dueSkills,
  kindsForMastery,
  LESSON_LENGTH,
  startDifficulty,
  type ComposedLesson,
  type PlannedQuestion,
  type Progress,
  type QuestionRole,
} from './engine/lessonComposer'
export {
  applyLesson,
  isDue,
  MASTERY_RULES,
  newMastery,
  SRS_INTERVAL_DAYS,
  DAY_MS,
  type SkillMastery,
  type SrsBox,
} from './engine/mastery'
export { applyStartingPoint, prereqClosure } from './engine/startingPoint'
export {
  BOSS_LENGTH,
  BOSS_PASS_ACCURACY,
  bossPassed,
  bossUnlocked,
  composeBoss,
  isUnlocked,
  mapNodes,
  nextMission,
  worldCleared,
  worldComplete,
  type JourneyInput,
  type MapNode,
  type MissionTarget,
  type NodeState,
} from './engine/journey'
export {
  firstTryAccuracy,
  lessonMinutes,
  lessonProgress,
  lessonReducer,
  MAX_REQUEUES,
  startLesson,
  type LessonEvent,
  type LessonMode,
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
