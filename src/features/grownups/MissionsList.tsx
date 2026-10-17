import type { CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { clockNow } from '@/app/clock'
import { useBestScores, useProgress } from '@/data'
import { dueSkills, skillsInWorld, WORLDS } from '@/domain'

const WORLD_EMOJI = { jungle: '🐒', savanna: '🦁', ocean: '🐠', moon: '🌙', mars: '🔴' } as const

/**
 * All missions, open-access (grown-ups only since spec 007): every skill grouped by world in
 * path order, with best score, crowns, mastery rings and the Review mission.
 */
export function MissionsList() {
  const [params] = useSearchParams()
  const best = useBestScores()
  const loaded = useProgress()
  const progress = loaded?.progress ?? {}
  const due = loaded ? dueSkills(progress, clockNow(params)) : []
  // Keep test-clock params (dev/e2e) when opening the Review mission.
  const search = params.toString() ? `?${params.toString()}` : ''

  return (
    <main className="screen practice">
      <div className="practice__inner">
        <header className="flex items-center gap-3">
          <Link to="/grown-ups" className="btn3d btn3d--ghost btn3d--lg icon-btn" aria-label="Back">
            ←
          </Link>
          <h1 className="grownup__title">All missions</h1>
        </header>

        {due.length > 0 && (
          <Link to={`/lesson/review${search}`} className="review-card" data-testid="review-card">
            <span className="review-card__icon" aria-hidden="true">
              🔁
            </span>
            <span className="review-card__text">
              <span className="review-card__title">Review</span>
              <span className="review-card__sub">
                {due.length} {due.length === 1 ? 'skill' : 'skills'} to practise again
              </span>
            </span>
            <span className="review-card__go" aria-hidden="true">
              ›
            </span>
          </Link>
        )}

        {WORLDS.map((world) => (
          <section
            key={world.id}
            className={`world world--${world.id}`}
            aria-labelledby={`w-${world.id}`}
          >
            <h2 id={`w-${world.id}`} className="world__title">
              <span aria-hidden="true">{WORLD_EMOJI[world.id]}</span> {world.title}
            </h2>
            <ul className="world__skills">
              {skillsInWorld(world.id).map((skill) => {
                const score = best[skill.id]
                const m = progress[skill.id]
                const crowned = !!m?.crowned
                const ring = { '--p': Math.round((m?.mastery ?? 0) * 100) } as CSSProperties
                return (
                  <li key={skill.id}>
                    <Link to={`/lesson/${skill.id}`} className="skill-card">
                      <span
                        className={`skill-card__ring${crowned ? ' skill-card__ring--crowned' : ''}`}
                        style={ring}
                      >
                        <span className="skill-card__order num">
                          {crowned ? (
                            <span role="img" aria-label="Mastered">
                              👑
                            </span>
                          ) : (
                            skill.order
                          )}
                        </span>
                      </span>
                      <span className="skill-card__title">{skill.title}</span>
                      {skill.focus && (
                        <span className="skill-card__focus" aria-label="Focus skill">
                          🎯
                        </span>
                      )}
                      {score !== undefined ? (
                        <span className="skill-card__score num" aria-label={`Best ${score}%`}>
                          ⭐ {score}%
                        </span>
                      ) : crowned ? null : (
                        <span className="skill-card__new">New!</span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
