import { Link } from 'react-router'
import { useBestScores } from '@/data'
import { skillsInWorld, WORLDS } from '@/domain'
import { Kukoos } from '@/ui'

const WORLD_EMOJI = { jungle: '🐒', savanna: '🦁', ocean: '🐠', moon: '🌙', mars: '🔴' } as const

/**
 * Temporary mission picker (spec 005 AC1): every skill grouped by world in path order,
 * with the best saved score (spec 004 AC6). Replaced by the world map in F07.
 */
export function PracticeScreen() {
  const best = useBestScores()
  return (
    <main className="screen practice">
      <div className="practice__inner">
        <header className="flex items-center gap-3">
          <Link to="/" className="btn3d btn3d--ghost btn3d--lg icon-btn" aria-label="Back home">
            ←
          </Link>
          <Kukoos mood="idle" size={56}>
            Pick a mission!
          </Kukoos>
        </header>
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
                return (
                  <li key={skill.id}>
                    <Link to={`/lesson/${skill.id}`} className="skill-card">
                      <span className="skill-card__order num">{skill.order}</span>
                      <span className="skill-card__title">{skill.title}</span>
                      {skill.focus && (
                        <span className="skill-card__focus" aria-label="Focus skill">
                          🎯
                        </span>
                      )}
                      {score === undefined ? (
                        <span className="skill-card__new">New!</span>
                      ) : (
                        <span className="skill-card__score num" aria-label={`Best ${score}%`}>
                          ⭐ {score}%
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        <footer className="practice__footer">
          <Link to="/backup" className="practice__grownups">
            For grown-ups: back up progress
          </Link>
        </footer>
      </div>
    </main>
  )
}
