// Pure domain core: curriculum, generators, engines and gamification rules.
// No React, storage, DOM or Math.random here (enforced by ESLint, see eslint.config.js).
export * from './rng'
export * from './types'
export { numberToWords, equationToText, equationToSpeech } from './speech'
export { WORLDS, getWorld, isSpaceWorld } from './curriculum/worlds'
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
export { addDays, daysBetween, localDate, type LocalDate } from './gamification/dates'
export {
  AVATAR_CATEGORIES,
  AVATAR_OPTIONS,
  avatarName,
  DEFAULT_AVATAR,
  EARNED_ITEMS,
  howToEarn,
  itemUnlocked,
  parseAvatar,
  randomAvatar,
  type Avatar,
  type AvatarCategory,
  type UnlockState,
} from './avatar'
export {
  GEM_RULES,
  isPerfect,
  LEVEL_STEP,
  lessonGems,
  lessonXp,
  levelFor,
  XP_RULES,
  xpForLevel,
  type LessonSummary,
} from './gamification/xp'
export {
  BONUS_MIN,
  DEFAULT_GOAL_MIN,
  DEFAULT_LIMIT_MIN,
  DEFAULT_TIME_SETTINGS,
  EMPTY_DAY,
  GOAL_OPTIONS,
  LIMIT_OPTIONS,
  timeBudget,
  WARN_SECONDS,
  type DayTime,
  type TimeBudget,
  type TimeSettings,
} from './gamification/timeBudget'
export {
  meetGoal,
  NEW_WALLET,
  rollStreak,
  STREAK_RULES,
  type GoalOutcome,
  type StreakRoll,
  type Wallet,
} from './gamification/streak'
export {
  BADGES,
  getBadge,
  newBadges,
  type BadgeDef,
  type BadgeRule,
  type BadgeStats,
} from './gamification/badges'
export {
  EFFECT_SOUNDS,
  lessonRewards,
  type LessonRewards,
  type LessonRewardsInput,
  type RewardEffect,
  type RewardEffectType,
} from './gamification/rewards'
export {
  parentReport,
  REPORT_DAYS,
  STRUGGLE_PCT,
  type DayReport,
  type MistakeCount,
  type ParentReport,
  type ParentReportInput,
  type PracticeItem,
  type ReportAttempt,
  type ReportBadge,
  type ReportDay,
  type ReportLesson,
  type SkillReport,
} from './report'
