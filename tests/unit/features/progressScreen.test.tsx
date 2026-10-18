import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { AttemptRow } from '@/data/rows'
import { localDate } from '@/domain'
import { testStore } from '../withData'
import { renderGrownUp } from './nav'

async function seed(db: ReturnType<typeof testStore>['db'], profileId: string) {
  const now = Date.now()
  const attempt = (i: number, over: Partial<AttemptRow>): AttemptRow => ({
    id: `A${i}`,
    profileId,
    lessonId: 'L1',
    skillId: 'sub.within100.regroup',
    questionId: `q${i}`,
    kind: 'column',
    difficulty: 2,
    firstTry: true,
    solved: true,
    attempts: 1,
    misconceptions: [],
    at: now - i * 1000,
    updatedAt: now,
    version: 1,
    ...over,
  })
  await db.attempts.bulkPut([
    attempt(1, { firstTry: false, attempts: 2, misconceptions: ['sub.smallerFromLarger'] }),
    attempt(2, { firstTry: false, attempts: 2, misconceptions: ['sub.smallerFromLarger'] }),
    attempt(3, { firstTry: false, attempts: 2, misconceptions: ['add.forgotCarry'] }),
    attempt(4, {}),
  ])
  await db.lessons.put({
    id: 'L1',
    profileId,
    skillId: 'sub.within100.regroup',
    mode: 'skill',
    seed: 1,
    startedAt: now - 60_000,
    endedAt: now,
    completed: true,
    questionCount: 4,
    firstTryCorrect: 1,
    bestCombo: 1,
    durationMs: 60_000,
    updatedAt: now,
    version: 1,
  })
  await db.dailyActivity.put({
    id: `${profileId}:${localDate(now)}`,
    profileId,
    date: localDate(now),
    lessonSeconds: 8 * 60,
    totalSeconds: 12 * 60,
    bonusMinutes: 0,
    goalMet: false,
    updatedAt: now,
    version: 1,
  })
}

describe('progress dashboard (spec 011 AC7)', () => {
  it('shows minutes, accuracy, mistakes with tips, needs-practice and mastery', async () => {
    const { db, repos } = testStore()
    const kid = await repos.profiles.ensureCurrent()
    await seed(db, kid?.id ?? '')
    await renderGrownUp('/grown-ups', repos)
    await userEvent.click(await screen.findByRole('link', { name: /See Explorer's progress/ }))

    const summary = await screen.findByRole('region', { name: 'Summary' })
    expect(within(summary).getByText('Missions done').previousSibling).toHaveTextContent('1')
    expect(within(summary).getByText('Minutes (14 days)').previousSibling).toHaveTextContent('12')
    expect(within(summary).getByText('First try (14 days)').previousSibling).toHaveTextContent(
      '25%',
    )

    const mistakes = screen.getByRole('region', { name: 'Mistakes to practise' })
    expect(within(mistakes).getByTestId('mistake-sub.smallerFromLarger')).toHaveTextContent(
      'Smaller from larger: 2 this week',
    )
    expect(within(mistakes).getByTestId('mistake-sub.smallerFromLarger')).toHaveTextContent(
      'Try together:',
    )
    expect(within(mistakes).getAllByRole('listitem')[0]).toHaveAttribute(
      'data-testid',
      'mistake-sub.smallerFromLarger',
    )

    expect(screen.getByRole('region', { name: 'Needs practice' })).toHaveTextContent(
      'Subtract with borrowing — 25% first try lately',
    )
    const chart = screen.getByRole('table', { name: 'Minutes per day, last 14 days' })
    expect(within(chart).getAllByRole('row')).toHaveLength(15)
    expect(screen.getByRole('region', { name: 'Mastery' })).toHaveTextContent('not started')
  })

  it('a kid with no play yet gets a friendly empty state', async () => {
    const { repos } = testStore()
    await renderGrownUp('/grown-ups/progress', repos)
    expect(await screen.findByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument()
  })

  it('reset progress clears the dashboard but keeps the kid (AC8)', async () => {
    const { db, repos } = testStore()
    const kid = await repos.profiles.ensureCurrent()
    await seed(db, kid?.id ?? '')
    await renderGrownUp('/grown-ups', repos)
    const row = await screen.findByTestId('profile-Explorer')
    await userEvent.click(within(row).getByRole('button', { name: 'Reset progress…' }))
    const dialog = screen.getByRole('dialog', { name: 'Reset progress' })
    await userEvent.type(within(dialog).getByRole('textbox'), 'Explorer')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset Explorer' }))
    await waitFor(async () => expect(await db.attempts.count()).toBe(0))
    expect(await repos.profiles.list()).toHaveLength(1)
  })
})
