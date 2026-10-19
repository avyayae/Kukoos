import { Link, useSearchParams } from 'react-router'
import { useActivity } from '@/app/time'
import { useBadges, useProfiles } from '@/data'
import { BADGES, parseAvatar } from '@/domain'
import { useSpeakOnTap } from '@/ui'
import { AvatarArt } from '@/ui/AvatarArt'

/** The trophy room (spec 008): earned badges in color, the rest as soft "not yet" stickers. */
export function TrophyRoom() {
  useActivity('map')
  const badges = useBadges()
  const { profile } = useProfiles()
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
      {profile?.avatar && (
        <div className="trophies__me">
          <AvatarArt avatar={parseAvatar(profile.avatar)} size={96} decorative />
          <span>{profile.nickname}</span>
        </div>
      )}
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
                  onClick={() => say(has ? `${b.name}! You earned it!` : `Not yet. ${b.howTo}`)}
                >
                  {/* The name comes from the visible text plus a hidden hint (WCAG 2.5.3). */}
                  <span className="sticker__emoji" aria-hidden="true">
                    {b.emoji}
                  </span>
                  <span className="sticker__name">{b.name}</span>
                  {has ? (
                    <span className="sr-only">. You earned it!</span>
                  ) : (
                    <>
                      <span className="sr-only">. </span>
                      <span className="sticker__hint">Not yet</span>
                      <span className="sr-only">. {b.howTo}</span>
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
