import { expect, test } from './fixtures'
import { startLesson } from '../../src/domain'
import { finishRewards, passGate, playPerfectLesson, playThrough, seedToday } from './helpers'

// Spec 008 AC13: rewards show up and persist; the daily limit ends the day gently.

test('a finished mission earns XP and crystals that stay after a reload', async ({ page }) => {
  await playPerfectLesson(page, 'add.within20', 7)
  const earned = page.getByTestId('earned')
  await expect(earned.getByTestId('count-final').first()).toHaveText(/^\+\d+$/)
  await expect(earned).toContainText('XP')
  await expect(earned).toContainText('crystals')

  // Summary → treasure chest → First Flight badge → map.
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByTestId('reward-moment')).toHaveAttribute('data-effect', 'chestOpened')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'New badge: First Flight!' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByTestId('journey')).toBeVisible()
  await expect(page.getByTestId('stat-gems')).toHaveAccessibleName('20 star crystals')
  await page.reload()
  await expect(page.getByTestId('stat-gems')).toHaveAccessibleName('20 star crystals')

  await page.getByRole('button', { name: 'Trophies' }).click()
  await expect(page.getByTestId('badge-first-flight')).toHaveAttribute('data-earned', 'true')
})

test('2 minutes before the limit, a gentle heads-up shows', async ({ page }) => {
  await seedToday(page, 60 * 60 - 122)
  await expect(page.getByTestId('heads-up')).toContainText(
    '2 more minutes of space travel today!',
    {
      timeout: 10_000,
    },
  )
})

test('the limit lets the mission finish, then Goodnight; +10 minutes opens play', async ({
  page,
}) => {
  await seedToday(page, 60 * 60 - 2)
  await page.goto('/lesson/add.within20?seed=7')
  await playThrough(page, startLesson({ skillId: 'add.within20', seed: 7, at: 0 }))
  await finishRewards(page)

  await expect(page.getByTestId('goodnight')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Great job today!' })).toBeVisible()
  // New missions wait for tomorrow.
  await page.goto('/lesson/add.within20?seed=8')
  await expect(page.getByTestId('goodnight')).toBeVisible()

  await page.getByRole('link', { name: /Grown-ups/ }).click()
  await passGate(page)
  await page.getByRole('button', { name: '+10 minutes today' }).click()
  await expect(page.getByRole('status')).toContainText('Added 10 minutes for today.')
  await page.getByRole('link', { name: 'Back to map' }).click()
  await expect(page.getByTestId('journey')).toBeVisible()
  await expect(page.getByTestId('goodnight')).toBeHidden()
})
