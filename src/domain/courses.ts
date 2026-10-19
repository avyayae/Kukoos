/**
 * Courses (spec 013): what a kid is here to learn. Math is timed (goal, streak, daily limit);
 * chess is open play, with only an optional grown-up limit.
 */
export type CourseId = 'math' | 'chess'

export interface Course {
  id: CourseId
  /** Kid-facing name, also spoken. */
  name: string
  icon: string
  /** Timed courses fill the daily goal and streak and count toward the daily limit. */
  timed: boolean
}

const MATH: Course = { id: 'math', name: 'Math', icon: '🔢', timed: true }
const CHESS: Course = { id: 'chess', name: 'Chess', icon: '♞', timed: false }

export const COURSES: readonly Course[] = [MATH, CHESS]

/** Profiles saved before courses existed are math players. */
export const DEFAULT_COURSES: readonly CourseId[] = ['math']

export function getCourse(id: CourseId): Course {
  return COURSES.find((c) => c.id === id) ?? MATH
}

/** The courses this build offers (chess stays hidden until it ships). */
export function availableCourses(flags: { chess: boolean }): CourseId[] {
  return COURSES.filter((c) => c.id !== 'chess' || flags.chess).map((c) => c.id)
}

/**
 * A kid's courses that this build offers, in registry order. Never empty: if none of theirs
 * is available, they get the first available course.
 */
export function profileCourses(
  courses: readonly CourseId[] | undefined,
  available: readonly CourseId[],
): CourseId[] {
  const mine = courses ?? DEFAULT_COURSES
  const result = available.filter((id) => mine.includes(id))
  return result.length > 0 ? result : available.slice(0, 1)
}

/** The course shown now: the remembered one if the kid still has it, else their first. */
export function courseNow(mine: readonly CourseId[], current: CourseId | undefined): CourseId {
  return current && mine.includes(current) ? current : (mine[0] ?? 'math')
}

/** Adds or removes a course. The last one can't be removed. */
export function toggleCourse(mine: readonly CourseId[], id: CourseId): CourseId[] {
  if (mine.includes(id)) {
    return mine.length > 1 ? mine.filter((c) => c !== id) : [...mine]
  }
  return COURSES.map((c) => c.id).filter((c) => c === id || mine.includes(c))
}

/** Grown-up chess limit options in minutes; `null` = off (the default). */
export const CHESS_LIMIT_OPTIONS = [15, 20, 30, 45, 60] as const

export interface ChessBudget {
  /** Seconds of chess left today; `null` when there's no chess limit. */
  remainingSeconds: number | null
  /** The optional chess limit is reached: chess rests until tomorrow. */
  locked: boolean
}

export function chessBudget(
  chessSeconds: number,
  limitMin: number | null | undefined,
): ChessBudget {
  if (limitMin === null || limitMin === undefined) return { remainingSeconds: null, locked: false }
  const remainingSeconds = Math.max(0, limitMin * 60 - Math.max(0, chessSeconds))
  return { remainingSeconds, locked: remainingSeconds === 0 }
}
