import { useState } from 'react'
import { playSfx } from '@/audio/sfx'
import {
  type Avatar,
  type AvatarCategory,
  AVATAR_OPTIONS,
  howToEarn,
  itemUnlocked,
  randomAvatar,
  type UnlockState,
} from '@/domain'
import { Button3D, useSpeakOnTap } from '@/ui'
import { AvatarArt } from '@/ui/AvatarArt'
import { AVATAR_HAIR, AVATAR_OUTFIT, AVATAR_SKIN } from '@/ui/avatarPalette'
import { CATEGORY_TABS, OPTION_NAMES } from './copy'

/** Color categories show a swatch; the rest show the avatar wearing that option. */
const SWATCHES: Partial<Record<AvatarCategory, Record<string, string>>> = {
  skin: AVATAR_SKIN,
  hairColor: AVATAR_HAIR,
  outfit: AVATAR_OUTFIT,
}

interface AvatarBuilderProps {
  initial: Avatar
  unlocks: UnlockState
  saveLabel: string
  onSave: (avatar: Avatar) => void
  /** Seed for "Surprise me!" (injectable for tests). */
  seed?: () => number
}

/**
 * "Make your explorer!" (spec 010 AC3): a live preview, big category tabs and a grid of
 * picture tiles. Every tile speaks its name; locked items say how to earn them.
 */
export function AvatarBuilder({
  initial,
  unlocks,
  saveLabel,
  onSave,
  seed = () => Date.now(),
}: AvatarBuilderProps) {
  const [avatar, setAvatar] = useState<Avatar>(initial)
  const [category, setCategory] = useState<AvatarCategory>('skin')
  const [hint, setHint] = useState<string | null>(null)
  const [beat, setBeat] = useState(0)
  const say = useSpeakOnTap()

  const choose = (value: string) => {
    const name = (OPTION_NAMES[category] as Record<string, string>)[value] ?? value
    if (!itemUnlocked(category, value, unlocks)) {
      const text = `${name}: not yet. Earn it: ${howToEarn(category, value) ?? ''}`
      setHint(text)
      say(text)
      return
    }
    setHint(null)
    setAvatar({ ...avatar, [category]: value })
    setBeat((b) => b + 1)
    say(name)
  }

  const swatch = SWATCHES[category]
  const tab = CATEGORY_TABS.find((t) => t.category === category)

  return (
    <div className="builder">
      <div className="builder__preview" key={beat}>
        <AvatarArt avatar={avatar} size={168} />
      </div>

      <div className="builder__tabs" role="tablist" aria-label="Choose a part">
        {CATEGORY_TABS.map((t) => (
          <button
            key={t.category}
            type="button"
            role="tab"
            aria-selected={t.category === category}
            aria-label={t.label}
            className="builder__tab"
            onClick={() => {
              setCategory(t.category)
              setHint(null)
              say(t.label)
            }}
          >
            <span aria-hidden="true">{t.icon}</span>
          </button>
        ))}
      </div>

      <div className="builder__grid" role="radiogroup" aria-label={tab?.label ?? category}>
        {AVATAR_OPTIONS[category].map((value) => {
          const locked = !itemUnlocked(category, value, unlocks)
          const name = (OPTION_NAMES[category] as Record<string, string>)[value] ?? value
          const selected = avatar[category] === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={locked || undefined}
              aria-label={locked ? `${name}, locked` : name}
              className={`builder__tile${locked ? ' builder__tile--locked' : ''}`}
              data-testid={`option-${category}-${value}`}
              onClick={() => choose(value)}
            >
              {swatch ? (
                <span className="builder__swatch" style={{ background: swatch[value] }} />
              ) : (
                <AvatarArt avatar={{ ...avatar, [category]: value }} size={72} decorative />
              )}
              {locked && (
                <span className="builder__lock" aria-hidden="true">
                  🔒
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="builder__hint" role="status" aria-live="polite">
        {hint}
      </p>

      <div className="builder__actions">
        <Button3D
          variant="ghost"
          size="lg"
          onClick={() => {
            setAvatar(randomAvatar(seed(), unlocks))
            setBeat((b) => b + 1)
            say('Surprise!')
          }}
        >
          🎲 Surprise me!
        </Button3D>
        <Button3D
          variant="primary"
          size="xl"
          block
          onClick={() => {
            playSfx('badge')
            onSave(avatar)
          }}
        >
          {saveLabel}
        </Button3D>
      </div>
    </div>
  )
}
