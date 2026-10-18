import { expect, test } from '@playwright/test'
import { finishRewards, passGate, playPerfectLesson } from './helpers'

// Spec 010 AC9: a new kid makes an explorer; a second kid gets their own progress.

test('a fresh device: meet Kukoos, pick a name, build an explorer, see it on the map', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('button', { name: "Let's go!" }).click()
  await page.getByRole('button', { name: 'Nova' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('tab', { name: 'Hat' }).click()
  await page.getByRole('radio', { name: 'Space helmet' }).click()
  await page.getByRole('button', { name: "That's me!" }).click()

  await expect(page.getByRole('heading', { name: 'Hi, Nova!' })).toBeVisible()
  const me = page.getByRole('button', { name: 'Me, Nova' })
  await expect(me).toBeVisible()
  await page.reload()
  await me.click()
  await expect(page.getByRole('img', { name: /space helmet/ })).toBeVisible()
})

test('two kids: "Who\'s playing?" and separate crystals', async ({ page }) => {
  // Kid 1 onboards and earns crystals.
  await page.goto('/')
  await page.getByRole('button', { name: "Let's go!" }).click()
  await page.getByRole('button', { name: 'Comet' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: "That's me!" }).click()
  await playPerfectLesson(page, 'add.within20', 7)
  await finishRewards(page)
  await expect(page.getByTestId('stat-gems')).toHaveAccessibleName('20 star crystals')

  // A grown-up adds kid 2.
  await page.goto('/grown-ups')
  await passGate(page)
  const card = page.getByRole('region', { name: 'Profiles' })
  await card.getByRole('textbox', { name: "New kid's nickname" }).fill('Pixel')
  await card.getByRole('button', { name: 'Add kid' }).click()
  await expect(page.getByTestId('profile-Pixel')).toBeVisible()

  // Next visit asks who's playing.
  await page.goto('/')
  await expect(page.getByRole('heading', { name: "Who's playing?" })).toBeVisible()
  await page.getByRole('button', { name: "I'm Pixel" }).click()
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('button', { name: "Let's go!" }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: "That's me!" }).click()
  await expect(page.getByRole('heading', { name: 'Hi, Pixel!' })).toBeVisible()
  await expect(page.getByTestId('stat-gems')).toHaveAccessibleName('0 star crystals')

  // Switch back: Comet's crystals are still there.
  await page.getByRole('button', { name: 'Me, Pixel' }).click()
  await page.getByRole('button', { name: 'Switch player' }).click()
  await page.getByRole('button', { name: "I'm Comet" }).click()
  await expect(page.getByRole('heading', { name: 'Hi, Comet!' })).toBeVisible()
  await expect(page.getByTestId('stat-gems')).toHaveAccessibleName('20 star crystals')
})
