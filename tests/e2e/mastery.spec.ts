import { expect, type Page, test } from '@playwright/test'
import { composeReview, DAY_MS, newMastery, type Progress, startLesson } from '../../src/domain'
import { lessonReady, playThrough } from './helpers'

// Spec 006 AC11: starting point → crowns; new skill starts with blocks; due reviews play.
const JUNGLE = [
  'Add within 20',
  'Subtract within 20',
  'Add 2-digit numbers',
  'Subtract 2-digit numbers',
]
const crown = (page: Page, title: string) =>
  page.getByRole('link', { name: new RegExp(title) }).getByRole('img', { name: 'Mastered' })

async function setStartingPoint(page: Page) {
  await page.goto('/grown-ups')
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
  await page.goto('/practice')
  for (const title of JUNGLE) await expect(crown(page, title), title).toBeVisible()
  await expect(page.getByRole('link', { name: /Trade a ten for ones/ })).toContainText('New!')
  // Nothing is due yet (pre-mastered reviews are 4 days out).
  await expect(page.getByTestId('review-card')).toHaveCount(0)

  await page.getByRole('link', { name: /Subtract with borrowing/ }).click()
  await lessonReady(page)
  await expect(page.getByTestId('blocks')).toBeVisible()
  expect(problems).toEqual([])
})

test('due reviews appear on the picker and play as a Review mission', async ({ page }) => {
  await setStartingPoint(page)
  const later = Date.now() + 5 * DAY_MS
  await page.goto(`/practice?now=${later}&seed=1`)
  const review = page.getByTestId('review-card')
  await expect(review).toContainText('4 skills to practise again')
  await review.click()
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

  // Reviews passed: the next review moves out, so the card disappears.
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.goto(`/practice?now=${later}`)
  await expect(page.getByRole('link', { name: /Add within 20/ })).toBeVisible()
  await expect(page.getByTestId('review-card')).toHaveCount(0)
})
