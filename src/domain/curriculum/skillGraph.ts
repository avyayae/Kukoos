import type { Skill, SkillId, World, WorldId } from '../types'
import { SKILLS } from './skills'
import { WORLDS } from './worlds'

const byId = new Map(SKILLS.map((s) => [s.id, s]))

export function getSkill(id: SkillId): Skill {
  const skill = byId.get(id)
  if (!skill) throw new Error(`Unknown skill: ${id}`)
  return skill
}

/** Skills of a world in path order. */
export function skillsInWorld(worldId: WorldId, skills: readonly Skill[] = SKILLS): Skill[] {
  return skills.filter((s) => s.worldId === worldId).sort((x, y) => x.order - y.order)
}

/** Skills whose prereqs are all mastered (includes skills with no prereqs and already-mastered ones). */
export function unlockedSkills(
  mastered: ReadonlySet<SkillId>,
  skills: readonly Skill[] = SKILLS,
): Skill[] {
  return skills.filter((s) => s.prereqs.every((p) => mastered.has(p)))
}

/**
 * Structural checks on curriculum data. Returns human-readable problems; empty = valid.
 * Spec 003 AC1.
 */
export function validateCurriculum(
  skills: readonly Skill[] = SKILLS,
  worlds: readonly World[] = WORLDS,
): string[] {
  const problems: string[] = []
  const ids = new Set<SkillId>()
  const worldOrder = new Map(worlds.map((w) => [w.id, w.order]))
  const skillMap = new Map(skills.map((s) => [s.id, s]))

  for (const s of skills) {
    if (ids.has(s.id)) problems.push(`duplicate skill id ${s.id}`)
    ids.add(s.id)
    if (!worldOrder.has(s.worldId)) problems.push(`${s.id}: unknown world ${s.worldId}`)
    if (s.ccss.length === 0) problems.push(`${s.id}: no CCSS code`)
    if (s.kinds.length === 0) problems.push(`${s.id}: no question kinds`)
    for (const p of s.prereqs) {
      if (!skillMap.has(p)) problems.push(`${s.id}: unknown prereq ${p}`)
    }
    if (s.spec.type === 'column') {
      const needsThree = /carryTens|carryBoth|borrowHundreds|borrowBoth|acrossZero/.test(
        s.spec.pattern,
      )
      if (needsThree && s.spec.digits !== 3) {
        problems.push(`${s.id}: pattern ${s.spec.pattern} needs 3 digits`)
      }
      if (!s.spec.pattern.startsWith(s.spec.op === '+' ? 'add.' : 'sub.')) {
        problems.push(`${s.id}: pattern ${s.spec.pattern} doesn't match op ${s.spec.op}`)
      }
    }
  }

  // A world's first skill may only depend on the previous world.
  for (const w of worlds) {
    const first = skillsInWorld(w.id, skills)[0]
    if (!first) {
      problems.push(`world ${w.id} has no skills`)
      continue
    }
    for (const p of first.prereqs) {
      const prereqWorld = skillMap.get(p)?.worldId
      if (prereqWorld && worldOrder.get(prereqWorld) !== w.order - 1) {
        problems.push(
          `${first.id}: first skill of ${w.id} depends on ${p} outside the previous world`,
        )
      }
    }
  }

  // Prereqs must never point to a later world, and the graph must be acyclic.
  for (const s of skills) {
    for (const p of s.prereqs) {
      const pw = skillMap.get(p)?.worldId
      if (pw && (worldOrder.get(pw) ?? 0) > (worldOrder.get(s.worldId) ?? 0)) {
        problems.push(`${s.id}: prereq ${p} is in a later world`)
      }
    }
  }
  const visiting = new Set<SkillId>()
  const done = new Set<SkillId>()
  const visit = (id: SkillId, path: SkillId[]) => {
    if (done.has(id)) return
    if (visiting.has(id)) {
      problems.push(`cycle: ${[...path, id].join(' → ')}`)
      return
    }
    visiting.add(id)
    for (const p of skillMap.get(id)?.prereqs ?? []) visit(p, [...path, id])
    visiting.delete(id)
    done.add(id)
  }
  for (const s of skills) visit(s.id, [])

  return problems
}
