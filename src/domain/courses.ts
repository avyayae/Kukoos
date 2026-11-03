/**
 * Courses (specs 013, 018): what a kid is here to learn. Math is timed (goal, streak, daily
 * limit); chess and Spanish are open play, each with only an optional grown-up limit.
 */
export type CourseId = 'math' | 'chess' | 'spanish'

export interface Course {
  id: CourseId
  /** Kid-facing name, also spoken. */
  name: string
  icon: string
  /** The name in the course's own language, shown under it ("Español"). */
  nameLocal?: string
  /** Timed courses fill the daily goal and streak and count toward the daily limit. */
  timed: boolean
}

const MATH: Course = { id: 'math', name: 'Math', icon: '🔢', timed: true }
const CHESS: Course = { id: 'chess', name: 'Chess', icon: '♞', timed: false }

const SPANISH: Course = {
  id: 'spanish',
  name: 'Spanish',
  nameLocal: 'Español',
  icon: '💬',
  timed: false,
}

export const COURSES: readonly Course[] = [MATH, CHESS, SPANISH]

/** Profiles saved before courses existed are math players. */
export const DEFAULT_COURSES: readonly CourseId[] = ['math']

export function getCourse(id: CourseId): Course {
  return COURSES.find((c) => c.id === id) ?? MATH
}

/** The courses this build offers (a course stays hidden until it ships). */
export function availableCourses(flags: { chess: boolean; spanish: boolean }): CourseId[] {
  return COURSES.filter((c) => (c.id === 'math' ? true : flags[c.id])).map((c) => c.id)
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

/** Grown-up limit options for an open-play course (chess, Spanish), in minutes; `null` = off. */
export const CHESS_LIMIT_OPTIONS = [15, 20, 30, 45, 60] as const

export interface ChessBudget {
  /** Seconds of chess left today; `null` when there's no chess limit. */
  remainingSeconds: number | null
  /** The optional chess limit is reached: chess rests until tomorrow. */
  locked: boolean
}

/** An open-play course's budget (chess, Spanish): only its own optional limit can lock it. */
export function openPlayBudget(seconds: number, limitMin: number | null | undefined): ChessBudget {
  if (limitMin === null || limitMin === undefined) return { remainingSeconds: null, locked: false }
  const remainingSeconds = Math.max(0, limitMin * 60 - Math.max(0, seconds))
  return { remainingSeconds, locked: remainingSeconds === 0 }
}

export const chessBudget = openPlayBudget
