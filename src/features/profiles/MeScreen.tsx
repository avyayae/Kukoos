import { Link, useNavigate } from 'react-router'
import { useActivity } from '@/app/time'
import { useProfiles, useRepos, useWallet } from '@/data'
import { avatarName, DEFAULT_AVATAR, parseAvatar } from '@/domain'
import { Button3D, useSpeakOnTap } from '@/ui'
import { AvatarArt } from '@/ui/AvatarArt'
import { AvatarBuilder } from './AvatarBuilder'
import { useUnlocks } from './useUnlocks'

/** /me (spec 010 AC8): my explorer, name and level, with "Change my look" and "Switch player". */
export function MeScreen() {
  useActivity('map')
  const { profile, profiles } = useProfiles()
  const wallet = useWallet()
  const navigate = useNavigate()
  const say = useSpeakOnTap()
  if (!profile) return null
  const avatar = profile.avatar ? parseAvatar(profile.avatar) : DEFAULT_AVATAR
  const level = wallet?.wallet.level ?? 1

  return (
    <main className="screen me" data-testid="me-screen">
      <header className="me__header">
        <Link to="/" className="btn3d btn3d--ghost btn3d--lg icon-btn" aria-label="Back to map">
          ←
        </Link>
      </header>
      <button
        type="button"
        className="me__hero"
        onClick={() => say(`${profile.nickname}. Level ${level}. ${avatarName(avatar)}.`)}
      >
        <AvatarArt avatar={avatar} size={200} />
        <span className="me__name">{profile.nickname}</span>
        <span className="me__level num">⭐ Level {level}</span>
      </button>
      <div className="me__actions">
        <Button3D variant="primary" size="xl" block onClick={() => navigate('/me/look')}>
          Change my look
        </Button3D>
        {profiles.length > 1 && (
          <Button3D variant="ghost" size="lg" block onClick={() => navigate('/who')}>
            Switch player
          </Button3D>
        )}
      </div>
    </main>
  )
}

/** /me/look: the builder for an existing explorer. */
export function ChangeLookScreen() {
  useActivity('map')
  const repos = useRepos()
  const { profile, refresh } = useProfiles()
  const unlocks = useUnlocks()
  const navigate = useNavigate()
  if (!profile) return null
  return (
    <main className="screen onboarding onboarding--look" data-testid="change-look">
      <header className="me__header">
        <Link to="/me" className="btn3d btn3d--ghost btn3d--lg icon-btn" aria-label="Back">
          ←
        </Link>
        <h1 className="onboarding__title">Change my look</h1>
      </header>
      <AvatarBuilder
        initial={profile.avatar ? parseAvatar(profile.avatar) : DEFAULT_AVATAR}
        unlocks={unlocks}
        saveLabel="Looking great!"
        onSave={async (avatar) => {
          await repos.profiles.update(profile.id, { avatar })
          await refresh()
          navigate('/me')
        }}
      />
    </main>
  )
}
