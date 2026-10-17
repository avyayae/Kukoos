import { useState } from 'react'
import { useCurrentProfile, useRepos } from '@/data'
import { prereqClosure, skillsInWorld, type SkillId, WORLDS } from '@/domain'
import { Button3D, ConfirmSheet } from '@/ui'

interface StartingPointSectionProps {
  onDone: (message: string) => void
}

/**
 * Lets a grown-up choose where the kid starts (spec 006 AC10): every mission before it is
 * marked as already known (crowned, then reviewed now and then). Never removes progress.
 */
export function StartingPointSection({ onDone }: StartingPointSectionProps) {
  const repos = useRepos()
  const profile = useCurrentProfile()
  const [skillId, setSkillId] = useState<SkillId>('')
  const [confirming, setConfirming] = useState(false)
  const known = skillId ? prereqClosure(skillId).size : 0

  const apply = async () => {
    setConfirming(false)
    if (!profile || !skillId) return
    const changed = await repos.progress.applyStartingPoint(profile.id, skillId)
    onDone(
      changed === 0
        ? 'Those missions were already known. Nothing changed.'
        : `Done! ${changed} ${changed === 1 ? 'mission is' : 'missions are'} marked as known 👑`,
    )
  }

  return (
    <section className="grownup__card" aria-label="Starting point">
      <h2>Starting point</h2>
      <p>Pick the first mission to work on. Missions before it count as already known.</p>
      <label className="grownup__field">
        <span>Start at</span>
        <select
          className="grownup__select"
          value={skillId}
          onChange={(e) => setSkillId(e.target.value)}
        >
          <option value="">Choose a mission…</option>
          {WORLDS.map((w) => (
            <optgroup key={w.id} label={w.title}>
              {skillsInWorld(w.id).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <Button3D
        variant="primary"
        size="md"
        disabled={!skillId || known === 0 || !profile}
        onClick={() => setConfirming(true)}
      >
        {skillId && known === 0 ? 'This is the very first mission' : 'Set starting point'}
      </Button3D>
      <ConfirmSheet
        open={confirming}
        title={`Mark ${known} earlier ${known === 1 ? 'mission' : 'missions'} as already known?`}
        confirmLabel="Yes, mark as known"
        cancelLabel="Not now"
        onConfirm={() => void apply()}
        onCancel={() => setConfirming(false)}
      />
    </section>
  )
}
