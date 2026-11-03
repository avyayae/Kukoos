import { type CourseId, getCourse } from '@/domain'
import { useSpeakOnTap } from '@/ui'

interface CourseCardsProps {
  /** The courses to offer, in order. */
  courses: readonly CourseId[]
  selected: readonly CourseId[]
  onToggle: (id: CourseId) => void
}

/**
 * Big picture cards to pick what to learn (spec 013 AC5, AC7). Each is a toggle that speaks
 * its name; more than one can be on.
 */
export function CourseCards({ courses, selected, onToggle }: CourseCardsProps) {
  const say = useSpeakOnTap()
  return (
    <div className="course-cards" role="group" aria-label="Courses to learn">
      {courses.map((id) => {
        const course = getCourse(id)
        const on = selected.includes(id)
        return (
          <button
            key={id}
            type="button"
            className={`tile course-card${on ? ' tile--selected' : ''}`}
            aria-pressed={on}
            data-testid={`course-card-${id}`}
            onClick={() => {
              say(course.name)
              onToggle(id)
            }}
          >
            <span className="course-card__icon" aria-hidden="true">
              {course.icon}
            </span>
            <span>{course.name}</span>
            {on && (
              <span className="course-card__tick" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
