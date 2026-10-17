import { getWorld, type MapNode, type MissionTarget, SKILLS, type WorldId, WORLDS } from '@/domain'

export const BOSS_EMOJI: Record<WorldId, string> = {
  jungle: '🐒',
  savanna: '🦁',
  ocean: '🐢',
  moon: '🛰️',
  mars: '☄️',
}

export const WORLD_EMOJI: Record<WorldId, string> = {
  jungle: '🌴',
  savanna: '🦁',
  ocean: '🐠',
  moon: '🌙',
  mars: '🔴',
}

const skillTitle = (id: string) => SKILLS.find((s) => s.id === id)?.title ?? id

/** What a mission is called, everywhere (button, sheet, speech). */
export function missionName(target: MissionTarget): string {
  if (target.type === 'review') return 'Review'
  if (target.type === 'boss') return `Boss challenge: ${getWorld(target.worldId).title}`
  return skillTitle(target.skillId)
}

export function targetOf(node: MapNode): MissionTarget {
  return node.kind === 'boss'
    ? { type: 'boss', worldId: node.worldId }
    : { type: 'skill', skillId: node.skill.id }
}

export function routeFor(target: MissionTarget): string {
  if (target.type === 'review') return '/lesson/review'
  if (target.type === 'boss') return `/lesson/boss/${target.worldId}`
  return `/lesson/${target.skillId}`
}

const STATE_TEXT = {
  locked: 'locked',
  available: 'ready to play',
  current: 'play next',
  crowned: 'mastered',
} as const

/** Screen-reader label for a node, e.g. "Mission 2, Add with carrying, mastered". */
export function nodeLabel(node: MapNode): string {
  if (node.kind === 'boss') {
    const state = node.state === 'crowned' ? 'beaten' : STATE_TEXT[node.state]
    return `Boss challenge, ${getWorld(node.worldId).title}, ${state}`
  }
  return `Mission ${node.skill.order}, ${node.skill.title}, ${STATE_TEXT[node.state]}`
}

/** What Kukoos says about a node when it's tapped. */
export function nodeSpeech(node: MapNode): string {
  const name = missionName(targetOf(node))
  if (node.state === 'locked')
    return `${name}. Not yet! Finish ${node.blockedBy ?? 'the mission before'} first.`
  if (node.state === 'crowned') return `${name}. You mastered this one!`
  return name
}

/** Worlds whose first mission is open (or already done). */
export function openWorlds(nodes: readonly MapNode[]): WorldId[] {
  return WORLDS.filter((w) =>
    nodes.some((n) => n.worldId === w.id && n.kind === 'skill' && n.state !== 'locked'),
  ).map((w) => w.id)
}
