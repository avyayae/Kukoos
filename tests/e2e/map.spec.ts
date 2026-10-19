import { expect, finishOnboarding, type Page, test } from './fixtures'
import { startLesson } from '../../src/domain'
import { finishRewards, passGate, playThrough } from './helpers'

// Spec 007 AC11–AC12: the journey map as home, one next step, gate, and kid-size controls.

async function expectKidSized(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(0)
  for (const name of ['Map', 'Grown-ups']) {
    const box = await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button', { name })
      .boundingBox()
    expect(box?.height, name).toBeGreaterThanOrEqual(64)
  }
  const play = await page.getByTestId('play-next').boundingBox()
  expect(play?.height).toBeGreaterThanOrEqual(64)
  const node = await page.getByTestId('node-add.within20').boundingBox()
  expect(node?.height).toBeGreaterThanOrEqual(56)
}

test('a fresh kid lands on the map with one obvious next step', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hi, Explorer!' })).toBeVisible()
  await expect(page.getByTestId('play-next')).toHaveAccessibleName('Play next: Add within 20')
  await expect(
    page.getByRole('button', { name: 'Mission 1, Add within 20, play next' }),
  ).toBeVisible()
  await expect(page.locator('.map-node--current')).toHaveCount(1)
  await expectKidSized(page)

  // Locked missions explain what comes first.
  await page.getByTestId('node-sub.within20').click()
  await expect(page.getByRole('dialog')).toContainText('Not yet! Finish Add within 20 first.')
  await page.getByRole('button', { name: 'Back to map' }).click()
  expect(problems).toEqual([])
})

test('the grown-up PIN turns away a wrong PIN', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Grown-ups' }).click()
  await expect(page.getByRole('heading', { name: 'Grown-ups only' })).toBeVisible()
  await passGate(page) // first visit: creates the PIN
  await page.getByRole('button', { name: /Lock/ }).click()
  await passGate(page, { wrong: true })
  await expect(page.getByRole('status').first()).toContainText("That's not it")
  await passGate(page)
  await expect(page.getByRole('heading', { name: 'Grown-ups', exact: true })).toBeVisible()
})

test('starting point → Play next → finish → back on the map', async ({ page }) => {
  await page.goto('/grown-ups')
  await passGate(page)
  await page.getByRole('combobox', { name: 'Start at' }).selectOption('pv.tradeTens')
  await page.getByRole('button', { name: 'Set starting point' }).click()
  await page.getByRole('button', { name: 'Yes, mark as known' }).click()
  await page.getByRole('link', { name: 'Back to map' }).click()

  await page.goto('/?seed=5')
  await expect(page.getByTestId('play-next')).toHaveAccessibleName(
    'Play next: Trade a ten for ones',
  )
  // Savanna opened since the first visit recorded the jungle: its unlock moment shows once.
  const moment = page.getByTestId('world-unlock')
  if (await moment.isVisible()) await moment.click()
  await page.getByTestId('play-next').click()
  await expect(page).toHaveURL(/\/lesson\/pv\.tradeTens\?seed=5$/)
  await playThrough(page, startLesson({ skillId: 'pv.tradeTens', seed: 5, at: 0 }))
  await finishRewards(page)
  await expect(page.getByTestId('journey')).toBeVisible()
})

test('map fits a small phone without overlap', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 360, height: 740 } })
  await finishOnboarding(page)
  await expect(page.getByTestId('play-next')).toBeVisible()
  await expectKidSized(page)
  // The Play button and bar sit above the page bottom, not past it.
  const dock = await page.locator('.map-dock').boundingBox()
  expect((dock?.y ?? 0) + (dock?.height ?? 0)).toBeLessThanOrEqual(741)
  await page.close()
})
