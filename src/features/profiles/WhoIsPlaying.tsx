import { useEffect, useEffectEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { speak } from '@/audio/tts'
import { useProfiles } from '@/data'
import { parseAvatar } from '@/domain'
import { KukoosPlaceholder, useReadAloud } from '@/ui'
import { AvatarArt } from '@/ui/AvatarArt'

/** "Who's playing?" (spec 010 AC6): big avatar cards; one tap switches the whole app. */
export function WhoIsPlaying() {
  const { profiles, pick } = useProfiles()
  const navigate = useNavigate()
  const { readAloud } = useReadAloud()
  const announce = useEffectEvent(() => {
    if (readAloud) speak("Who's playing?")
  })
  useEffect(() => announce(), [])

  return (
    <main className="screen picker" data-testid="who-is-playing">
      <h1 className="picker__title">Who&apos;s playing?</h1>
      <ul className="picker__grid">
        {profiles.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="picker__card"
              aria-label={`I'm ${p.nickname}`}
              onClick={() => {
                if (readAloud) speak(`Hi ${p.nickname}!`)
                void pick(p.id).then(() => navigate('/'))
              }}
            >
              {p.avatar ? (
                <AvatarArt avatar={parseAvatar(p.avatar)} size={112} decorative />
              ) : (
                <KukoosPlaceholder size={112} />
              )}
              <span className="picker__name">{p.nickname}</span>
            </button>
          </li>
        ))}
      </ul>
      <Link to="/grown-ups" className="picker__grownups">
        🔒 Grown-ups
      </Link>
    </main>
  )
}
