import { describe, expect, it } from 'vitest'
import { createDexieRepositories } from '@/data/repositories/dexie'
import { createNullRepositories } from '@/data/repositories/null'
import {
  composeBoss,
  correctResponse,
  isUnlocked,
  type LessonState,
  lessonReducer,
  SKILLS,
  startLesson,
  wrongResponse,
} from '@/domain'
import { freshDb } from './testDb'

function playBoss(missFirst: number): LessonState {
  const plan = composeBoss('jungle', 1)
  let s = startLesson({
    skillId: plan[0]?.skillId ?? '',
    seed: 1,
    at: 0,
    plan,
    mode: 'boss',
    worldId: 'jungle',
  })
  let i = 0
  while (s.phase !== 'complete') {
    if (i < missFirst) {
      s = lessonReducer(s, { type: 'answer', response: wrongResponse(s.question), at: 1 })
      s = lessonReducer(s, { type: 'retry' })
    }
    s = lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at: 1 })
    s = lessonReducer(s, { type: 'continue', at: 1 })
    i++
  }
  return s
}

describe('boss results (AC3)', () => {
  it('a passed boss clears the world and opens the next one', async () => {
    const repos = createDexieRepositories(freshDb())
    await repos.lessons.save(playBoss(2), { lessonId: 'B1', profileId: 'P1' })
    const beaten = await repos.journey.bossesBeaten('P1')
    expect([...beaten]).toEqual(['jungle'])
    const progress = Object.fromEntries(
      SKILLS.filter((s) => s.worldId === 'jungle').map((s) => [
        s.id,
        {
          mastery: 0.9,
          attempts: 20,
          sessionsSeen: 3,
          srsBox: 3 as const,
          nextReviewAt: 0,
          crowned: true,
          preMastered: false,
        },
      ]),
    )
    const tradeTens = SKILLS.find((s) => s.id === 'pv.tradeTens')
    expect(tradeTens && isUnlocked(tradeTens, { progress, bossesBeaten: beaten, now: 0 })).toBe(
      true,
    )
  })

  it('a boss below 80% does not clear the world, and bosses never count as best scores', async () => {
    const repos = createDexieRepositories(freshDb())
    await repos.lessons.save(playBoss(3), { lessonId: 'B1', profileId: 'P1' })
    expect((await repos.journey.bossesBeaten('P1')).size).toBe(0)
    expect(await repos.lessons.bestFirstTryBySkill('P1')).toEqual({})
  })
})

describe('seen worlds (AC10 data)', () => {
  it('remembers which unlock moments were shown, per profile', async () => {
    const repos = createDexieRepositories(freshDb())
    expect(await repos.journey.seenWorlds('P1')).toEqual([])
    await repos.journey.markWorldsSeen('P1', ['jungle'])
    await repos.journey.markWorldsSeen('P1', ['savanna', 'jungle'])
    await repos.journey.markWorldsSeen('P1', [])
    expect((await repos.journey.seenWorlds('P1')).sort()).toEqual(['jungle', 'savanna'])
    expect(await repos.journey.seenWorlds('P2')).toEqual([])
  })

  it('the null store has no journey', async () => {
    const repos = createNullRepositories()
    expect((await repos.journey.bossesBeaten('x')).size).toBe(0)
    expect(await repos.journey.seenWorlds('x')).toEqual([])
    await expect(repos.journey.markWorldsSeen('x', ['jungle'])).resolves.toBeUndefined()
  })
})
