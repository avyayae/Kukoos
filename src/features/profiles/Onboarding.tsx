import { useEffect, useEffectEvent, useState } from 'react'
import { speak } from '@/audio/tts'
import { useProfiles, useRepos } from '@/data'
import { DEFAULT_AVATAR, parseAvatar } from '@/domain'
import { Button3D, Kukoos, useReadAloud } from '@/ui'
import { AvatarBuilder } from './AvatarBuilder'
import { cleanNickname, NAME_IDEAS } from './copy'
import { useUnlocks } from './useUnlocks'

type Step = 'welcome' | 'name' | 'look'

const WELCOME = "Hi! I'm Kukoos. Let's fly from the jungle all the way to Mars!"

/**
 * First run (spec 010 AC4): Kukoos says hi, the kid picks a nickname, then builds an
 * explorer. Shown for any kid whose avatar is still empty.
 */
export function Onboarding() {
  const repos = useRepos()
  const { profile, refresh } = useProfiles()
  const unlocks = useUnlocks()
  const { readAloud } = useReadAloud()
  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState(profile?.nickname ?? '')
  const nickname = cleanNickname(name)

  const announce = useEffectEvent((text: string) => {
    if (readAloud) speak(text)
  })
  useEffect(() => {
    if (step === 'welcome') announce(WELCOME)
    if (step === 'name') announce('What should Kukoos call you?')
    if (step === 'look') announce('Make your explorer!')
  }, [step])

  if (!profile) return null

  if (step === 'welcome') {
    return (
      <main className="screen onboarding" data-testid="onboarding">
        <Kukoos mood="cheer" size={168} talks>
          <span>{WELCOME}</span>
        </Kukoos>
        <div className="onboarding__action">
          <Button3D variant="primary" size="xl" block onClick={() => setStep('name')}>
            Let&apos;s go!
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
          })
          await refresh()
        }}
      />
    </main>
  )
}
