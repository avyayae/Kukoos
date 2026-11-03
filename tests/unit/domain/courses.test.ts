import { describe, expect, it } from 'vitest'
import {
  availableCourses,
  chessBudget,
  COURSES,
  courseNow,
  getCourse,
  openPlayBudget,
  profileCourses,
  toggleCourse,
} from '@/domain'

describe('course model (spec 013 AC1)', () => {
  it('lists math (timed), chess and Spanish (open play)', () => {
    expect(COURSES.map((c) => [c.id, c.timed])).toEqual([
      ['math', true],
      ['chess', false],
      ['spanish', false],
    ])
    expect(getCourse('chess').name).toBe('Chess')
    // Spec 018 decision: 💬 "Español", no country flag.
    expect(getCourse('spanish')).toMatchObject({
      name: 'Spanish',
      nameLocal: 'Español',
      icon: '💬',
    })
  })

  it('offers each course only when the build has it (spec 018 AC1)', () => {
    expect(availableCourses({ chess: false, spanish: false })).toEqual(['math'])
    expect(availableCourses({ chess: true, spanish: false })).toEqual(['math', 'chess'])
    expect(availableCourses({ chess: true, spanish: true })).toEqual(['math', 'chess', 'spanish'])
  })

  it('a Spanish-only kid gets only Spanish (spec 018 AC1)', () => {
    const all = availableCourses({ chess: true, spanish: true })
    expect(profileCourses(['spanish'], all)).toEqual(['spanish'])
    expect(toggleCourse(['spanish'], 'math')).toEqual(['math', 'spanish'])
    // Without the gate, a Spanish-only kid still gets a course.
    expect(profileCourses(['spanish'], ['math', 'chess'])).toEqual(['math'])
  })

  it('profiles without courses are math players; never empty', () => {
    const both = availableCourses({ chess: true, spanish: false })
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

describe('optional open-play limits: chess (spec 013 AC3) and Spanish (spec 018 AC6)', () => {
  it('Spanish uses the same budget as chess', () => {
    expect(openPlayBudget(10 * 60, 10)).toEqual({ remainingSeconds: 0, locked: true })
    expect(openPlayBudget(10 * 60, null).locked).toBe(false)
  })

  it('is off by default', () => {
    expect(chessBudget(99_999, null)).toEqual({ remainingSeconds: null, locked: false })
    expect(chessBudget(99_999, undefined).locked).toBe(false)
  })

  it('rests once chess time reaches the limit', () => {
    expect(chessBudget(14 * 60, 15)).toEqual({ remainingSeconds: 60, locked: false })
    expect(chessBudget(15 * 60, 15)).toEqual({ remainingSeconds: 0, locked: true })
  })
})
