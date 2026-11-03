import { useProfiles, useRepos } from '@/data'
import { availableCourses, type CourseId, courseNow, profileCourses } from '@/domain'

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
  // Chess is live for everyone since F16 (decision 2026-10-20).
  const available = availableCourses({ chess: true })
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
