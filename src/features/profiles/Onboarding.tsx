import { useEffect, useEffectEvent, useState } from 'react'
import { speak } from '@/audio/tts'
import { useCourses } from '@/app/courses'
import { useProfiles, useRepos } from '@/data'
import { type CourseId, DEFAULT_AVATAR, parseAvatar } from '@/domain'
import { CourseCards } from '@/features/courses/CourseCards'
import { Button3D, Kukoos, useReadAloud } from '@/ui'
import { AvatarBuilder } from './AvatarBuilder'
import { cleanNickname, NAME_IDEAS } from './copy'
import { useUnlocks } from './useUnlocks'

type Step = 'welcome' | 'courses' | 'name' | 'look'

const WELCOME = "Hi! I'm Kukoos. Let's fly from the jungle all the way to Mars!"
/** With more than one course, the welcome isn't about math (spec 013 AC5). */
const WELCOME_COURSES = "Hi! I'm Kukoos. Let's learn and play together!"
const PICK = 'What do you want to learn?'

/**
 * First run (spec 010 AC4): Kukoos says hi, the kid picks a nickname, then builds an
 * explorer. Shown for any kid whose avatar is still empty. When the build offers more than
 * one course, the kid first picks what to learn (spec 013 AC5).
 */
export function Onboarding() {
  const repos = useRepos()
  const { profile, refresh } = useProfiles()
  const unlocks = useUnlocks()
  const { readAloud } = useReadAloud()
  const { available } = useCourses()
  const choosing = available.length > 1
  const welcome = choosing ? WELCOME_COURSES : WELCOME
  const [step, setStep] = useState<Step>('welcome')
  const [picked, setPicked] = useState<CourseId[]>([])
  const [name, setName] = useState(profile?.nickname ?? '')
  const nickname = cleanNickname(name)

  const announce = useEffectEvent((text: string) => {
    if (readAloud) speak(text)
  })
  useEffect(() => {
    if (step === 'welcome') announce(welcome)
    if (step === 'courses') announce(PICK)
    if (step === 'name') announce('What should Kukoos call you?')
    if (step === 'look') announce('Make your explorer!')
  }, [step, welcome])

  if (!profile) return null

  if (step === 'welcome') {
    return (
      <main className="screen onboarding" data-testid="onboarding">
        <Kukoos mood="cheer" size={168} talks>
          <span>{welcome}</span>
        </Kukoos>
        <div className="onboarding__action">
          <Button3D
            variant="primary"
            size="xl"
            block
            onClick={() => setStep(choosing ? 'courses' : 'name')}
          >
            Let&apos;s go!
          </Button3D>
        </div>
      </main>
    )
  }

  if (step === 'courses') {
    return (
      <main className="screen onboarding" data-testid="onboarding">
        <Kukoos mood="happy" size={96} talks>
          <span>{PICK}</span>
        </Kukoos>
        <CourseCards
          courses={available}
          selected={picked}
          onToggle={(id) =>
            setPicked((p) =>
              p.includes(id)
                ? p.filter((c) => c !== id)
                : available.filter((c) => c === id || p.includes(c)),
            )
          }
        />
        <div className="onboarding__action">
          <Button3D
            variant="primary"
            size="xl"
            block
            disabled={picked.length === 0}
            onClick={() => setStep('name')}
          >
            Next
          </Button3D>
        </div>
      </main>
    )
  }

  if (step === 'name') {
    return (
      <main className="screen onboarding" data-testid="onboarding">
        <Kukoos mood="happy" size={96} talks>
          <span>What should Kukoos call you?</span>
        </Kukoos>
        <label className="onboarding__name">
          <span className="sr-only">Your explorer name</span>
          <input
            type="text"
            value={name}
            maxLength={12}
            autoComplete="off"
            placeholder="Your name"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="onboarding__ideas" aria-label="Name ideas">
          {NAME_IDEAS.map((idea) => (
            <button key={idea} type="button" className="pill" onClick={() => setName(idea)}>
              {idea}
            </button>
          ))}
        </div>
        <div className="onboarding__action">
          <Button3D
            variant="primary"
            size="xl"
            block
            disabled={!nickname}
            onClick={() => setStep('look')}
          >
            Next
          </Button3D>
        </div>
      </main>
    )
  }

  return (
    <main className="screen onboarding onboarding--look" data-testid="onboarding">
      <h1 className="onboarding__title">Make your explorer!</h1>
      <AvatarBuilder
        initial={profile.avatar ? parseAvatar(profile.avatar) : DEFAULT_AVATAR}
        unlocks={unlocks}
        saveLabel="That's me!"
        onSave={async (avatar) => {
          await repos.profiles.update(profile.id, {
            nickname: nickname ?? profile.nickname,
            avatar,
            ...(choosing && picked[0] ? { courses: picked, currentCourse: picked[0] } : {}),
          })
          await refresh()
        }}
      />
    </main>
  )
}
