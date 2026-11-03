import { useProfiles, useRepos } from '@/data'
import { availableCourses, type CourseId, courseNow, profileCourses } from '@/domain'

/**
 * Spanish ships in F20; until then only builds with `VITE_SPANISH=1` (dev, e2e) offer it.
 * Read at call time so tests can stub it.
 */
export function spanishAvailable(): boolean {
  return import.meta.env.VITE_SPANISH === '1'
}

/** Router state that tells home to cross-fade (spec 013 UX: switching courses). */
export const SWITCHED = { switched: true }

export interface CoursesValue {
  /** Courses this build offers. */
  available: CourseId[]
  /** The current kid's courses (never empty). */
  mine: CourseId[]
  /** The course shown at home. */
  current: CourseId
  /** Switches home to this course and remembers it. */
  choose(id: CourseId): Promise<void>
  /** Sets the kid's courses (kids do this themselves, no PIN: spec 013). */
  setMine(ids: CourseId[]): Promise<void>
}

/** The current kid's courses (spec 013). */
export function useCourses(): CoursesValue {
  const repos = useRepos()
  const { profile, refresh } = useProfiles()
  // Chess is live for everyone since F16 (decision 2026-10-20); Spanish ships in F20.
  const available = availableCourses({ chess: true, spanish: spanishAvailable() })
  const mine = profileCourses(profile?.courses, available)
  const current = courseNow(mine, profile?.currentCourse)
  return {
    available,
    mine,
    current,
    choose: async (id) => {
      if (!profile || id === current) return
      await repos.profiles.update(profile.id, { currentCourse: id })
      await refresh()
    },
    setMine: async (ids) => {
      if (!profile || ids.length === 0) return
      await repos.profiles.update(profile.id, {
        courses: ids,
        currentCourse: courseNow(ids, current),
      })
      await refresh()
    },
  }
}
