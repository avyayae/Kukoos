import { skillsInWorld } from '../curriculum/skillGraph'
import { SKILLS } from '../curriculum/skills'
import { WORLDS } from '../curriculum/worlds'
import type { Difficulty, QuestionKind, Skill, SkillId, WorldId } from '../types'
import { dueSkills, kindsForMastery, type PlannedQuestion, type Progress } from './lessonComposer'

/**
 * The journey from the jungle to Mars (spec 007): what's unlocked, which worlds are
 * cleared, and the one mission the kid should play next.
 */
export const BOSS_PASS_ACCURACY = 0.8
export const BOSS_LENGTH = 10
const REVIEWS_BEFORE_NEW_WORK = 3

export type MissionTarget =
  { type: 'skill'; skillId: SkillId } | { type: 'review' } | { type: 'boss'; worldId: WorldId }

export interface JourneyInput {
  progress: Progress
  /** Worlds whose boss challenge was passed. */
  bossesBeaten: ReadonlySet<WorldId>
  now: number
}

const crowned = (p: Progress, id: SkillId) => !!p[id]?.crowned

/** Every skill crowned. */
export function worldComplete(worldId: WorldId, progress: Progress): boolean {
  return skillsInWorld(worldId).every((s) => crowned(progress, s.id))
}

/** Cleared = boss beaten, or the whole world was pre-mastered by a starting point. */
export function worldCleared(worldId: WorldId, input: JourneyInput): boolean {
  if (input.bossesBeaten.has(worldId)) return true
  return skillsInWorld(worldId).every(
    (s) => crowned(input.progress, s.id) && !!input.progress[s.id]?.preMastered,
  )
}

function previousWorld(worldId: WorldId): WorldId | undefined {
  const order = WORLDS.find((w) => w.id === worldId)?.order ?? 1
  return WORLDS.find((w) => w.order === order - 1)?.id
}

/** All prereqs crowned; a world's first mission also needs the previous world cleared. */
export function isUnlocked(skill: Skill, input: JourneyInput): boolean {
  if (!skill.prereqs.every((p) => crowned(input.progress, p))) return false
  const prev = previousWorld(skill.worldId)
  if (skill.order === 1 && prev) return worldCleared(prev, input)
  return true
}

export function bossUnlocked(worldId: WorldId, input: JourneyInput): boolean {
  return worldComplete(worldId, input.progress)
}

/** The single "play next" mission (spec 007 rules). */
export function nextMission(input: JourneyInput): MissionTarget {
  const due = dueSkills(input.progress, input.now)
  if (due.length >= REVIEWS_BEFORE_NEW_WORK) return { type: 'review' }
  for (const w of WORLDS) {
    for (const s of skillsInWorld(w.id)) {
      if (isUnlocked(s, input) && !crowned(input.progress, s.id)) {
        return { type: 'skill', skillId: s.id }
      }
    }
    if (bossUnlocked(w.id, input) && !worldCleared(w.id, input)) {
      return { type: 'boss', worldId: w.id }
    }
  }
  if (due.length > 0) return { type: 'review' }
  return { type: 'skill', skillId: (SKILLS.at(-1) as Skill).id }
}

export type NodeState = 'locked' | 'available' | 'current' | 'crowned'

export type MapNode =
  | {
      kind: 'skill'
      skill: Skill
      worldId: WorldId
      state: NodeState
      mastery: number
      /** First mission to finish before this one (for "Not yet!"). */
      blockedBy: string | null
    }
  | { kind: 'boss'; worldId: WorldId; state: NodeState; blockedBy: string | null }

/** Ordered map nodes (jungle first), each world ending with its boss. */
export function mapNodes(input: JourneyInput): MapNode[] {
  const next = nextMission(input)
  const nodes: MapNode[] = []
  for (const w of WORLDS) {
    for (const s of skillsInWorld(w.id)) {
      const isCrowned = crowned(input.progress, s.id)
      const unlocked = isUnlocked(s, input)
      const current = next.type === 'skill' && next.skillId === s.id && !isCrowned
      const firstMissing = s.prereqs.find((p) => !crowned(input.progress, p))
      const prev = previousWorld(w.id)
      const blockedBy = unlocked
        ? null
        : firstMissing
          ? (SKILLS.find((x) => x.id === firstMissing)?.title ?? null)
          : prev
            ? `the ${WORLDS.find((x) => x.id === prev)?.title} boss`
            : null
      nodes.push({
        kind: 'skill',
        skill: s,
        worldId: w.id,
        state: isCrowned ? 'crowned' : current ? 'current' : unlocked ? 'available' : 'locked',
        mastery: input.progress[s.id]?.mastery ?? 0,
        blockedBy,
      })
    }
    const cleared = worldCleared(w.id, input)
    const open = bossUnlocked(w.id, input)
    const isCurrent = next.type === 'boss' && next.worldId === w.id
    const firstUncrowned = skillsInWorld(w.id).find((s) => !crowned(input.progress, s.id))
    nodes.push({
      kind: 'boss',
      worldId: w.id,
      state: cleared ? 'crowned' : isCurrent ? 'current' : open ? 'available' : 'locked',
      blockedBy: open ? null : (firstUncrowned?.title ?? null),
    })
  }
  return nodes
}

/**
 * A world's boss challenge: 10 questions round-robin over its skills, solid-band kinds,
 * difficulty 3 then 4 (spec 007 AC2).
 */
export function composeBoss(worldId: WorldId, seed: number): PlannedQuestion[] {
  const skills = skillsInWorld(worldId)
  if (skills.length === 0) return []
  return Array.from({ length: BOSS_LENGTH }, (_, i) => {
    const skill = skills[i % skills.length] as Skill
    const kinds = kindsForMastery(skill, 1)
    const kind = (kinds[Math.floor(i / skills.length) % kinds.length]?.kind ??
      skill.kinds[0]) as QuestionKind
    return {
      skillId: skill.id,
      kind,
      guided: false,
      seed: seed * 1000 + i,
      role: 'boss' as const,
      fixedDifficulty: (i < BOSS_LENGTH / 2 ? 3 : 4) as Difficulty,
      isRequeue: false,
    }
  })
}

/** Did a boss lesson pass? (first-try accuracy ≥ 80%) */
export function bossPassed(firstTryCorrect: number, questionCount: number): boolean {
  return questionCount > 0 && firstTryCorrect / questionCount >= BOSS_PASS_ACCURACY
}
