import { describe, expect, it } from 'vitest'
import {
  availableCourses,
  chessBudget,
  COURSES,
  courseNow,
  getCourse,
  profileCourses,
  toggleCourse,
} from '@/domain'

describe('course model (spec 013 AC1)', () => {
  it('lists math (timed) and chess (open play)', () => {
    expect(COURSES.map((c) => [c.id, c.timed])).toEqual([
      ['math', true],
      ['chess', false],
    ])
    expect(getCourse('chess').name).toBe('Chess')
  })

  it('offers chess only when the build has it', () => {
    expect(availableCourses({ chess: false })).toEqual(['math'])
    expect(availableCourses({ chess: true })).toEqual(['math', 'chess'])
  })

  it('profiles without courses are math players; never empty', () => {
    const both = availableCourses({ chess: true })
    expect(profileCourses(undefined, both)).toEqual(['math'])
    expect(profileCourses(['chess', 'math'], both)).toEqual(['math', 'chess'])
    expect(profileCourses(['chess'], both)).toEqual(['chess'])
    // A chess-only kid on a build without chess still gets a course.
    expect(profileCourses(['chess'], ['math'])).toEqual(['math'])
  })

  it('remembers the current course while the kid still has it', () => {
    expect(courseNow(['math', 'chess'], 'chess')).toBe('chess')
    expect(courseNow(['math'], 'chess')).toBe('math')
    expect(courseNow(['chess'], undefined)).toBe('chess')
  })

  it('adds and removes courses, but never the last one', () => {
    expect(toggleCourse(['chess'], 'math')).toEqual(['math', 'chess'])
    expect(toggleCourse(['math', 'chess'], 'math')).toEqual(['chess'])
    expect(toggleCourse(['chess'], 'chess')).toEqual(['chess'])
  })
})

describe('optional chess limit (spec 013 AC3)', () => {
  it('is off by default', () => {
    expect(chessBudget(99_999, null)).toEqual({ remainingSeconds: null, locked: false })
    expect(chessBudget(99_999, undefined).locked).toBe(false)
  })

  it('rests once chess time reaches the limit', () => {
    expect(chessBudget(14 * 60, 15)).toEqual({ remainingSeconds: 60, locked: false })
    expect(chessBudget(15 * 60, 15)).toEqual({ remainingSeconds: 0, locked: true })
  })
})
