import { useState } from 'react'
import { MAX_PROFILES, type ProfileRow, useProfiles, useRepos } from '@/data'
import { cleanNickname } from '@/features/profiles/copy'
import { Button3D } from '@/ui'

/**
 * Grown-ups → Profiles (spec 010 AC7, spec 011 AC8): add a kid (max 4), rename, set grade,
 * reset progress, delete. Reset and delete need the nickname typed in and touch only that kid.
 */
type Action = 'remove' | 'reset'

const COPY: Record<Action, { dialog: string; verb: string; body: (name: string) => string }> = {
  remove: {
    dialog: 'Remove profile',
    verb: 'Remove',
    body: (n) =>
      `This deletes ${n}'s stars, streak, badges and missions on this device. Download a backup first if you might want them back.`,
  },
  reset: {
    dialog: 'Reset progress',
    verb: 'Reset',
    body: (n) =>
      `This clears ${n}'s missions, stars, streak, badges and minutes, so they start the journey again. Their name, explorer and settings stay.`,
  },
}

export function ProfilesSection({ onDone }: { onDone: (message: string) => void }) {
  const repos = useRepos()
  const { profiles, refresh } = useProfiles()
  const [name, setName] = useState('')
  const [grade, setGrade] = useState<2 | 3>(2)
  const [confirming, setConfirming] = useState<{ profile: ProfileRow; action: Action } | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const full = profiles.length >= MAX_PROFILES
  const nickname = cleanNickname(name)

  const add = async () => {
    if (!nickname) return
    const created = await repos.profiles.create({ nickname, grade })
    setName('')
    await refresh()
    onDone(
      created
        ? `Added ${nickname}. They'll make their explorer when they play.`
        : 'This device is full.',
    )
  }

  const confirm = async () => {
    if (!confirming) return
    const { profile, action } = confirming
    const ok =
      action === 'remove'
        ? await repos.profiles.remove(profile.id)
        : await repos.profiles.reset(profile.id)
    setConfirming(null)
    setConfirmText('')
    await refresh()
    if (action === 'reset') {
      onDone(
        ok ? `Reset ${profile.nickname}'s progress. Their explorer stays.` : 'Nothing to reset.',
      )
    } else {
      onDone(
        ok
          ? `Removed ${profile.nickname} and their progress.`
          : 'The last profile can’t be removed.',
      )
    }
  }

  return (
    <section className="grownup__card" aria-label="Profiles">
      <h2>Profiles</h2>
      <ul className="profiles">
        {profiles.map((p) => (
          <ProfileRowEditor
            key={`${p.id}:${p.version}`}
            profile={p}
            canDelete={profiles.length > 1}
            onSaved={async (text) => {
              await refresh()
              onDone(text)
            }}
            onDelete={() => setConfirming({ profile: p, action: 'remove' })}
            onReset={() => setConfirming({ profile: p, action: 'reset' })}
          />
        ))}
      </ul>

      {!full && (
        <div className="profiles__add">
          <label className="grownup__field">
            <span>New kid&apos;s nickname</span>
            <input
              className="grownup__select"
              value={name}
              maxLength={12}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="grownup__field">
            <span>Grade</span>
            <select
              className="grownup__select"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value) as 2 | 3)}
            >
              <option value={2}>Grade 2</option>
              <option value={3}>Grade 3</option>
            </select>
          </label>
          <Button3D variant="primary" size="md" disabled={!nickname} onClick={() => void add()}>
            Add kid
          </Button3D>
        </div>
      )}
      {full && <p>This device has {MAX_PROFILES} kids, the most it can hold.</p>}

      {confirming && (
        <div className="sheet-backdrop">
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={COPY[confirming.action].dialog}
          >
            <h2>
              {COPY[confirming.action].verb} {confirming.profile.nickname}
              {confirming.action === 'reset' ? "'s progress" : ''}?
            </h2>
            <p>{COPY[confirming.action].body(confirming.profile.nickname)}</p>
            <label className="grownup__field">
              <span>Type {confirming.profile.nickname} to confirm</span>
              <input
                className="grownup__select"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </label>
            <Button3D
              variant="danger-soft"
              size="md"
              block
              disabled={confirmText.trim() !== confirming.profile.nickname}
              onClick={() => void confirm()}
            >
              {COPY[confirming.action].verb} {confirming.profile.nickname}
            </Button3D>
            <Button3D
              variant="ghost"
              size="md"
              block
              onClick={() => {
                setConfirming(null)
                setConfirmText('')
              }}
            >
              Keep
            </Button3D>
          </div>
        </div>
      )}
    </section>
  )
}

function ProfileRowEditor({
  profile,
  canDelete,
  onSaved,
  onDelete,
  onReset,
}: {
  profile: ProfileRow
  canDelete: boolean
  onSaved: (message: string) => Promise<void>
  onDelete: () => void
  onReset: () => void
}) {
  const repos = useRepos()
  const [name, setName] = useState(profile.nickname)
  const [grade, setGrade] = useState(profile.grade)
  const nickname = cleanNickname(name)
  const changed = nickname !== profile.nickname || grade !== profile.grade

  return (
    <li className="profiles__row" data-testid={`profile-${profile.nickname}`}>
      <label className="grownup__field">
        <span>Nickname</span>
        <input
          className="grownup__select"
          value={name}
          maxLength={12}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="grownup__field">
        <span>Grade</span>
        <select
          className="grownup__select"
          value={grade}
          onChange={(e) => setGrade(Number(e.target.value) as 2 | 3)}
        >
          <option value={2}>Grade 2</option>
          <option value={3}>Grade 3</option>
        </select>
      </label>
      <div className="profiles__buttons">
        <Button3D
          variant="primary"
          size="md"
          disabled={!nickname || !changed}
          onClick={() =>
            void repos.profiles
              .update(profile.id, { nickname: nickname ?? profile.nickname, grade })
              .then(() => onSaved(`Saved ${nickname ?? profile.nickname}.`))
          }
        >
          Save
        </Button3D>
        <Button3D variant="ghost" size="md" onClick={onReset}>
          Reset progress…
        </Button3D>
        {canDelete && (
          <Button3D variant="ghost" size="md" onClick={onDelete}>
            Remove…
          </Button3D>
        )}
      </div>
    </li>
  )
}
