import { expect, type Page, test } from '@playwright/test'
import { pickCourses, seenWorldsSaved } from './fixtures'
import { seedToday } from './helpers'

// Spec 013 AC9: choosing courses, switching, chess as open play, and My courses.

/** A fresh device onboards a kid named Comet with these courses. */
async function onboard(page: Page, courses: readonly ('Math' | 'Chess')[]) {
  await page.goto('/')
  await expect(page.getByText("Hi! I'm Kukoos. Let's learn and play together!")).toBeVisible()
  await page.getByRole('button', { name: "Let's go!" }).click()
  await pickCourses(page, courses)
  await page.getByRole('button', { name: 'Comet' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: "That's me!" }).click()
  await expect(page.getByRole('heading', { name: 'Hi, Comet!' })).toBeVisible()
}

const switcher = (page: Page) => page.getByRole('radiogroup', { name: 'Courses' })

test('both courses: lands on math, switches to chess and back, and remembers', async ({ page }) => {
  await onboard(page, ['Math', 'Chess'])
  await expect(page.getByTestId('journey')).toBeVisible()
  await expect(page.getByTestId('stat-goal')).toBeVisible()
  await expect.poll(() => seenWorldsSaved(page)).toBe(true)

  await switcher(page).getByRole('radio', { name: 'Chess' }).click()
  await expect(page.getByTestId('chess-home')).toBeVisible()
  // Open play: no goal ring or streak in chess.
  await expect(page.getByTestId('stat-gems')).toBeVisible()
  await expect(page.getByTestId('stat-goal')).toHaveCount(0)

  await page.reload()
  await expect(page.getByTestId('chess-home')).toBeVisible()
  await expect(switcher(page).getByRole('radio', { name: 'Chess' })).toHaveAttribute(
    'aria-checked',
    'true',
  )

  await switcher(page).getByRole('radio', { name: 'Math' }).click()
  await expect(page.getByTestId('journey')).toBeVisible()
})

test('at the math limit, Goodnight offers chess, and chess opens', async ({ page }) => {
  await onboard(page, ['Math', 'Chess'])
  await expect.poll(() => seenWorldsSaved(page)).toBe(true)
  await seedToday(page, 60 * 60)
  await expect(page.getByTestId('goodnight')).toContainText('Math is sleeping. Want to play chess?')
  await page.getByRole('button', { name: 'Play chess' }).click()
  await expect(page.getByTestId('chess-home')).toBeVisible()
})

test('a chess-only kid never sees the math map, and can add math from Me', async ({ page }) => {
  await onboard(page, ['Chess'])
  await expect(page.getByTestId('chess-home')).toBeVisible()
  await expect(page.getByTestId('journey')).toHaveCount(0)
  await expect(switcher(page)).toHaveCount(0)

  await page.getByRole('button', { name: 'Me, Comet' }).click()
  await page.getByRole('button', { name: 'Math', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Math', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('link', { name: 'Back to map' }).click()
  await expect(page.getByTestId('chess-home')).toBeVisible()
  await expect(switcher(page).getByRole('radio', { name: 'Math' })).toBeVisible()
})
