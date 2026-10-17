import { SKILLS } from '../curriculum/skills'
import type { Skill, SkillId } from '../types'
import { DAY_MS, newMastery, SRS_INTERVAL_DAYS, type SkillMastery } from './mastery'

/** Every skill `skillId` depends on, directly or indirectly (not including itself). */
export function prereqClosure(skillId: SkillId, skills: readonly Skill[] = SKILLS): Set<SkillId> {
  const byId = new Map(skills.map((s) => [s.id, s]))
  const seen = new Set<SkillId>()
  const stack = [...(byId.get(skillId)?.prereqs ?? [])]
  while (stack.length > 0) {
    const id = stack.pop() as SkillId
    if (seen.has(id)) continue
    seen.add(id)
    stack.push(...(byId.get(id)?.prereqs ?? []))
  }
  return seen
}

/** Pre-mastered: crowned at 0.9, box 3, next review in 4 days (spec 006 "Starting point"). */
export function preMastered(prev: SkillMastery | undefined, at: number): SkillMastery {
  const base = prev ?? newMastery()
  // Never lower real progress; a skill that is already crowned stays exactly as it is.
  if (base.crowned) return base
  return {
    ...base,
    mastery: Math.max(base.mastery, 0.9),
    crowned: true,
    preMastered: true,
    srsBox: 3,
    nextReviewAt: at + SRS_INTERVAL_DAYS[3] * DAY_MS,
  }
}

/**
 * The progress changes for choosing `startSkillId` as the starting point: its prerequisites
 * become pre-mastered. Only changed skills are returned, so applying twice is a no-op.
 */
export function applyStartingPoint(
  progress: Readonly<Partial<Record<SkillId, SkillMastery>>>,
  startSkillId: SkillId,
  at: number,
  skills: readonly Skill[] = SKILLS,
): Partial<Record<SkillId, SkillMastery>> {
  const changes: Partial<Record<SkillId, SkillMastery>> = {}
  for (const id of prereqClosure(startSkillId, skills)) {
    const prev = progress[id]
    const next = preMastered(prev, at)
    if (next !== prev) changes[id] = next
  }
  return changes
}
