import { lazy, Suspense } from 'react'
import { Link } from 'react-router'
import type { CoursesValue } from '@/app/courses'
import { useActivity } from '@/app/time'
import { CourseSwitcher } from '@/features/courses/CourseSwitcher'
import { Kukoos } from '@/ui'
import { SPANISH_COPY } from './copy'

// Spanish loads only when it's opened (spec 018 AC7, constitution §3.7).
const SpanishHome = lazy(() => import('./SpanishHome'))

/** The Spanish course home, loaded on demand. */
export function SpanishHomeGate({ courses }: { courses: CoursesValue }) {
  return (
    <Suspense fallback={null}>
      <SpanishHome courses={courses} />
    </Suspense>
  )
}

/** The optional Spanish limit is reached (spec 018 AC6): a calm rest, no timer, no guilt. */
export function SpanishRest({ courses }: { courses: CoursesValue }) {
  useActivity(null)
  return (
    <main className="screen goodnight" data-testid="spanish-rest">
      <div className="goodnight__sky" aria-hidden="true" />
      <div className="goodnight__kukoos">
        <Kukoos mood="sleep" size={140} />
      </div>
      <h1 className="goodnight__title">{SPANISH_COPY.restingTitle}</h1>
      <p className="goodnight__body">{SPANISH_COPY.resting}</p>
      <CourseSwitcher courses={courses} />
      <Link to="/grown-ups" className="goodnight__grownups">
        🔒 Grown-ups
      </Link>
    </main>
  )
}
