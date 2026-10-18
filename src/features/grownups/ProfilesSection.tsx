import { useState } from 'react'
import { MAX_PROFILES, type ProfileRow, useProfiles, useRepos } from '@/data'
import { cleanNickname } from '@/features/profiles/copy'
import { Button3D } from '@/ui'

/**
 * Grown-ups → Profiles (spec 010 AC7): add a kid (max 4), rename, set grade, delete.
 * Deleting needs the nickname typed in, and removes only that kid's data.
 */
export function ProfilesSection({ onDone }: { onDone: (message: string) => void }) {
  const repos = useRepos()
  const { profiles, refresh } = useProfiles()
  const [name, setName] = useState('')
  const [grade, setGrade] = useState<2 | 3>(2)
  const [deleting, setDeleting] = useState<ProfileRow | null>(null)
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

  const remove = async () => {
    if (!deleting) return
    const ok = await repos.profiles.remove(deleting.id)
    const who = deleting.nickname
    setDeleting(null)
    setConfirmText('')
    await refresh()
    onDone(ok ? `Removed ${who} and their progress.` : 'The last profile can’t be removed.')
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
            onDelete={() => setDeleting(p)}
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

      {deleting && (
        <div className="sheet-backdrop">
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Remove profile">
            <h2>Remove {deleting.nickname}?</h2>
            <p>
              This deletes {deleting.nickname}&apos;s stars, streak, badges and missions on this
              device. Download a backup first if you might want them back.
            </p>
            <label className="grownup__field">
              <span>Type {deleting.nickname} to confirm</span>
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
              disabled={confirmText.trim() !== deleting.nickname}
              onClick={() => void remove()}
            >
              Remove {deleting.nickname}
            </Button3D>
            <Button3D
              variant="ghost"
              size="md"
              block
              onClick={() => {
                setDeleting(null)
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
}: {
  profile: ProfileRow
  canDelete: boolean
  onSaved: (message: string) => Promise<void>
  onDelete: () => void
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
        {canDelete && (
          <Button3D variant="ghost" size="md" onClick={onDelete}>
            Remove…
          </Button3D>
        )}
      </div>
    </li>
  )
}
