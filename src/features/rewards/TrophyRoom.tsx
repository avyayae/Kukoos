import { Link, useSearchParams } from 'react-router'
import { useActivity } from '@/app/time'
import { useBadges } from '@/data'
import { BADGES } from '@/domain'
import { useSpeakOnTap } from '@/ui'

/** The trophy room (spec 008): earned badges in color, the rest as soft "not yet" stickers. */
export function TrophyRoom() {
  useActivity('map')
  const badges = useBadges()
  const say = useSpeakOnTap()
  const [params] = useSearchParams()
  const earned = new Set((badges ?? []).map((b) => b.badgeId))
  const back = params.toString() ? `/?${params.toString()}` : '/'

  return (
    <main className="screen trophies">
      <header className="trophies__header">
        <Link to={back} className="btn3d btn3d--ghost btn3d--lg icon-btn" aria-label="Back to map">
          ←
        </Link>
        <button
          type="button"
          className="trophies__title-btn"
          onClick={() => say(`Your trophies. You have ${earned.size} badges.`)}
        >
          <h1 className="trophies__title">Trophies</h1>
        </button>
      </header>
      {badges && (
        <ul className="trophies__grid" aria-label="Badges">
          {BADGES.map((b) => {
            const has = earned.has(b.id)
            return (
              <li key={b.id}>
                <button
                  type="button"
                  className={`sticker${has ? ' sticker--earned' : ''}`}
                  data-testid={`badge-${b.id}`}
                  data-earned={has}
                  aria-label={has ? `${b.name}. You earned it!` : `${b.name}. Not yet. ${b.howTo}`}
                  onClick={() => say(has ? `${b.name}! You earned it!` : `Not yet. ${b.howTo}`)}
                >
                  <span className="sticker__emoji" aria-hidden="true">
                    {b.emoji}
                  </span>
                  <span className="sticker__name">{b.name}</span>
                  {!has && <span className="sticker__hint">Not yet</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
