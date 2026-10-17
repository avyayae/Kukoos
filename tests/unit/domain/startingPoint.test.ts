import { describe, expect, it } from 'vitest'
import { DAY_MS, newMastery } from '@/domain/engine/mastery'
import { applyStartingPoint, preMastered, prereqClosure } from '@/domain/engine/startingPoint'

const JUNGLE = [
  'add.within20',
  'sub.within20',
  'add.within100.noregroup',
  'sub.within100.noregroup',
]

describe('prereqClosure', () => {
  it('collects transitive prerequisites only', () => {
    expect([...prereqClosure('pv.tradeTens')].sort()).toEqual([...JUNGLE].sort())
    expect(prereqClosure('add.within20').size).toBe(0)
    expect(prereqClosure('nope').size).toBe(0)
  })

  it('includes earlier worlds for later starting points', () => {
    const closure = prereqClosure('add.3digit.noregroup')
    for (const id of [...JUNGLE, 'pv.tradeTens', 'addsub.within100.mixed', 'pv.tradeHundreds']) {
      expect(closure.has(id), id).toBe(true)
    }
    expect(closure.has('add.3digit.noregroup')).toBe(false)
  })
})

describe('starting point (AC8)', () => {
  it('pre-masters prerequisites: 0.9, crowned, box 3, review in 4 days', () => {
    const changes = applyStartingPoint({}, 'pv.tradeTens', 1000)
    expect(Object.keys(changes).sort()).toEqual([...JUNGLE].sort())
    expect(changes['add.within20']).toMatchObject({
      mastery: 0.9,
      crowned: true,
      preMastered: true,
      srsBox: 3,
      nextReviewAt: 1000 + 4 * DAY_MS,
    })
  })

  it('never lowers progress and leaves crowned skills alone', () => {
    const earned = {
      ...newMastery(),
      mastery: 0.97,
      crowned: true,
      srsBox: 5 as const,
      attempts: 40,
    }
    const partial = { ...newMastery(), mastery: 0.95, attempts: 8 }
    const changes = applyStartingPoint(
      { 'add.within20': earned, 'sub.within20': partial },
      'pv.tradeTens',
      0,
    )
    expect(changes['add.within20']).toBeUndefined()
    expect(changes['sub.within20']).toMatchObject({ mastery: 0.95, crowned: true, attempts: 8 })
  })

  it('applying twice is a no-op', () => {
    const first = applyStartingPoint({}, 'pv.tradeTens', 0)
    expect(applyStartingPoint(first, 'pv.tradeTens', 999)).toEqual({})
    const m = preMastered(undefined, 0)
    expect(preMastered(m, 5)).toBe(m)
  })
})
