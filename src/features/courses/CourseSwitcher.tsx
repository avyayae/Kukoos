import { useNavigate } from 'react-router'
import { type CoursesValue, SWITCHED } from '@/app/courses'
import { getCourse } from '@/domain'
import { useSpeakOnTap } from '@/ui'

/**
 * Math | Chess (spec 013 AC6): one tap switches home. Shown only to kids with 2 courses.
 * The chip's accessible name is the course name; the current one is checked.
 */
export function CourseSwitcher({ courses }: { courses: CoursesValue }) {
  const navigate = useNavigate()
  const say = useSpeakOnTap()
  if (courses.mine.length < 2) return null
  return (
    <div className="course-switch" role="radiogroup" aria-label="Courses">
      {courses.mine.map((id) => {
        const course = getCourse(id)
        const on = id === courses.current
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            className={`course-switch__chip${on ? ' course-switch__chip--on' : ''}`}
            data-testid={`course-${id}`}
            onClick={() => {
              say(course.name)
              if (on) return
              void courses.choose(id).then(() => navigate('/', { replace: true, state: SWITCHED }))
            }}
          >
            <span className="course-switch__icon" aria-hidden="true">
              {course.icon}
            </span>
            <span>{course.name}</span>
          </button>
        )
      })}
    </div>
  )
}
