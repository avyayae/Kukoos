import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { cancelSpeech } from '@/audio/tts'
import type { CoursesValue } from '@/app/courses'
import type { ProfileRow } from '@/data'
import { parseAvatar } from '@/domain'
import { useReadAloud, useSpeakOnTap } from '@/ui'
import { AvatarArt } from '@/ui/AvatarArt'
import { CourseSwitcher } from './CourseSwitcher'

interface HomeHeaderProps {
  profile: ProfileRow | null | undefined
  /** Shown instead of the avatar before the kid has made one. */
  fallback: ReactNode
  /** What tapping "Hi, …!" says. */
  hello: string
  courses: CoursesValue
  stats: ReactNode
}

/** The header of every course home (specs 007, 010, 013): me, hello, read aloud, courses, stats. */
export function HomeHeader({ profile, fallback, hello, courses, stats }: HomeHeaderProps) {
  const navigate = useNavigate()
  const say = useSpeakOnTap()
  const { readAloud, setReadAloud } = useReadAloud()
  const nickname = profile?.nickname ?? 'Explorer'
  return (
    <header className="map-header">
      {profile?.avatar ? (
        <button
          type="button"
          className="map-header__me"
          aria-label={`Me, ${nickname}`}
          onClick={() => {
            say(nickname)
            navigate('/me')
          }}
        >
          <AvatarArt avatar={parseAvatar(profile.avatar)} size={48} decorative />
        </button>
      ) : (
        fallback
      )}
      <button type="button" className="map-header__hello" onClick={() => say(hello)}>
        <h1 className="map-header__title">Hi, {nickname}!</h1>
      </button>
      <button
        type="button"
        className="btn3d btn3d--ghost btn3d--lg icon-btn"
        aria-label={readAloud ? 'Turn off reading aloud' : 'Turn on reading aloud'}
        aria-pressed={readAloud}
        onClick={() => {
          if (readAloud) cancelSpeech()
          setReadAloud(!readAloud)
        }}
      >
        {readAloud ? '🔊' : '🔇'}
      </button>
      <CourseSwitcher courses={courses} />
      {stats}
    </header>
  )
}
