import { expect, type Page, test } from '@playwright/test'
import { composeReview, DAY_MS, newMastery, type Progress, startLesson } from '../../src/domain'
import { finishRewards, lessonReady, passGate, playThrough } from './helpers'

// Spec 006 AC11 (on the spec 007 map): starting point → crowns; a new skill starts with
// blocks; due reviews show on the bottom bar and play as a Review mission.
const JUNGLE = [
  'Add within 20',
  'Subtract within 20',
  'Add 2-digit numbers',
  'Subtract 2-digit numbers',
]

async function setStartingPoint(page: Page) {
  await page.goto('/grown-ups')
  await passGate(page)
  await page.getByRole('combobox', { name: 'Start at' }).selectOption('pv.tradeTens')
  await page.getByRole('button', { name: 'Set starting point' }).click()
  await page.getByRole('button', { name: 'Yes, mark as known' }).click()
  await expect(page.getByRole('status')).toContainText('4 missions are marked as known')
}

test('starting point crowns earlier missions and new skills start with blocks', async ({
  page,
}) => {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text())
  })
  await setStartingPoint(page)
  await page.goto('/')
  for (const [i, title] of JUNGLE.entries()) {
    await expect(
      page.getByRole('button', { name: `Mission ${i + 1}, ${title}, mastered` }),
    ).toBeVisible()
  }
  await expect(page.getByRole('button', { name: 'Review, nothing due' })).toBeVisible()
  await expect(page.getByTestId('play-next')).toHaveAccessibleName(
    'Play next: Trade a ten for ones',
  )

  await page.getByTestId('play-next').click()
  await lessonReady(page)
  await expect(page.getByTestId('blocks')).toBeVisible()
  expect(problems).toEqual([])
})

test('due reviews appear in the bottom bar and play as a Review mission', async ({ page }) => {
  await setStartingPoint(page)
  const later = Date.now() + 5 * DAY_MS
  await page.goto(`/?now=${later}&seed=1`)
  // 4 due reviews ≥ 3, so Review is also the Play-next step.
  await expect(page.getByTestId('play-next')).toHaveAccessibleName('Play next: Review')
  await page.getByRole('button', { name: 'Review, 4 due' }).click()
  await expect(page).toHaveURL(/\/lesson\/review\?/)

  // Mirror the Review plan in-test: due order only depends on review dates (equal here) and seed.
  const due = { ...newMastery(), mastery: 0.9, crowned: true, srsBox: 3 as const, nextReviewAt: 1 }
  const progress: Progress = {
    'add.within20': due,
    'sub.within20': due,
    'add.within100.noregroup': due,
    'sub.within100.noregroup': due,
  }
  const plan = composeReview(progress, later, 1)
  expect(plan).toHaveLength(10)
  await playThrough(
    page,
    startLesson({ skillId: plan[0]?.skillId ?? '', seed: 1, at: 0, plan, mode: 'review' }),
  )

  // Reviews passed: the next review moves out, so nothing is due any more.
  await finishRewards(page)
  await expect(page).toHaveURL(/\/\?/)
  await expect(page.getByRole('button', { name: 'Review, nothing due' })).toBeVisible()
})
