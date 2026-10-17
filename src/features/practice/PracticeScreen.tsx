import { Link } from 'react-router'
import { skillsInWorld, WORLDS } from '@/domain'
import { Kukoos } from '@/ui'

const WORLD_EMOJI = { jungle: '🐒', savanna: '🦁', ocean: '🐠', moon: '🌙', mars: '🔴' } as const

/**
 * Temporary mission picker (spec 005 AC1): every skill grouped by world in path order.
 * Replaced by the world map in F07.
 */
export function PracticeScreen() {
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
              {skillsInWorld(world.id).map((skill) => (
                <li key={skill.id}>
                  <Link to={`/lesson/${skill.id}`} className="skill-card">
                    <span className="skill-card__order num">{skill.order}</span>
                    <span className="skill-card__title">{skill.title}</span>
                    {skill.focus && (
                      <span className="skill-card__focus" aria-label="Focus skill">
                        ⭐
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
