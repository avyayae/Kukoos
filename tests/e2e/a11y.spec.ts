import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from './fixtures'
import { finishRewards, passGate, playPerfectLesson, seedToday } from './helpers'

// Spec 012 AC5: no serious or critical WCAG 2 A/AA violations on the key screens.
/** One layout is enough for these checks. */
const desktopOnly = () => test.skip(test.info().project.name !== 'desktop', 'desktop only')

async function expectAccessible(page: Page, screen: string) {
  // Let entrance animations settle so colours are measured at rest.
  await page.waitForTimeout(800)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const bad = results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
  expect(bad, `${screen}\n${bad.join('\n')}`).toEqual([])
}

test('map, lesson, lesson complete, trophies and the explorer builder', async ({ page }) => {
  desktopOnly()
  await page.goto('/')
  await expectAccessible(page, 'map')

  await page.goto('/lesson/add.within20?seed=7')
  await expect(page.getByRole('button', { name: 'Check' })).toBeVisible()
  await expectAccessible(page, 'lesson')

  await playPerfectLesson(page, 'add.within20', 7)
  await expectAccessible(page, 'lesson complete')
  await finishRewards(page)

  await page.goto('/trophies')
  await expectAccessible(page, 'trophies')

  await page.goto('/me/look')
  await expect(page.getByTestId('change-look')).toBeVisible()
  await expectAccessible(page, 'builder')
})

test('PIN gate, progress dashboard and goodnight', async ({ page }) => {
  desktopOnly()
  await playPerfectLesson(page, 'add.within20', 7)
  await finishRewards(page)
  await page.goto('/grown-ups')
  await expectAccessible(page, 'PIN gate')
  await passGate(page)
  await expectAccessible(page, 'grown-ups')
  await page.goto('/grown-ups/progress')
  await passGate(page)
  await expect(page.getByRole('region', { name: 'Summary' })).toBeVisible()
  await expectAccessible(page, 'progress dashboard')

  await seedToday(page, 60 * 60)
  await expect(page.getByTestId('goodnight')).toBeVisible()
  await expectAccessible(page, 'goodnight')
})
