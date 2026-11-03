import { expect, type Page, test } from '@playwright/test'
import { pickCourses } from './fixtures'

// Spec 017 AC11: a chess-only kid plays Kukoos: Play, Sleepy Kukoos, moves, take back, hint,
// end game, start again, reload mid-game and keep playing. A seeded Scholar's mate wins
// "Your first game" and crowns it on the castle.

const sq = (page: Page, s: string) => page.getByTestId(`sq-${s}`)
const turn = (page: Page) => page.getByTestId('game-turn')

async function onboardChessOnly(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: "Let's go!" }).click()
  await pickCourses(page, ['Chess'])
  await page.getByRole('button', { name: 'Comet' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: "That's me!" }).click()
  await expect(page.getByTestId('castle')).toBeVisible()
}

/** The kid's move; Sleepy Kukoos's whisper (if any) gets "Play on"; then Kukoos replies. */
async function kidMove(page: Page, from: string, to: string, { reply = true } = {}) {
  await sq(page, from).click()
  await sq(page, to).click()
  const whisper = page.getByRole('button', { name: 'Play on' })
  if (await whisper.isVisible().catch(() => false)) await whisper.click()
  if (reply) await expect(turn(page)).toHaveText('Your turn', { timeout: 10_000 })
}

test('play Sleepy Kukoos: take back, hint, end game, resume after a reload', async ({ page }) => {
  await onboardChessOnly(page)
  await page.getByTestId('play-kukoos').click()
  await expect(page.getByTestId('game-setup')).toBeVisible()
  await page.getByTestId('level-1').click()
  await page.getByTestId('start-game').click()
  await expect(turn(page)).toHaveText('Your turn')

  await kidMove(page, 'e2', 'e4')
  await page.getByRole('button', { name: /Take back/ }).click()
  await expect(sq(page, 'e2')).toHaveAccessibleName(/white pawn/i)

  await page.getByRole('button', { name: /Hint/ }).click()
  await expect(page.locator('.sq--hint')).toHaveCount(2, { timeout: 10_000 })

  await kidMove(page, 'd2', 'd4')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Keep playing your game?' })).toBeVisible()
  await page.getByTestId('resume').click()
  await expect(sq(page, 'd4')).toHaveAccessibleName(/white pawn/i)
  await expect(turn(page)).toHaveText('Your turn')

  await page.getByRole('button', { name: 'End game' }).click()
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByTestId('game-over')).toHaveAttribute('data-result', 'ended')
  await page.getByTestId('play-again').click()
  await expect(turn(page)).toHaveText('Your turn')
})

test('a seeded Scholar’s mate wins "Your first game" and crowns it', async ({ page }) => {
  await onboardChessOnly(page)
  await expect(page.getByTestId('node-chess-game')).toHaveAccessibleName('Your first game, open')
  // The same game as the node, with a fixed seed so Sleepy Kukoos's replies are known.
  await page.goto('/chess/play?level=1&color=w&seed=0')
  await expect(turn(page)).toHaveText('Your turn')
  await kidMove(page, 'e2', 'e4')
  await kidMove(page, 'f1', 'c4')
  await kidMove(page, 'd1', 'h5')
  await kidMove(page, 'h5', 'f7', { reply: false })

  const over = page.getByTestId('game-over')
  await expect(over).toHaveAttribute('data-result', 'win', { timeout: 10_000 })
  await expect(over).toContainText('You won your first game!')
  await page.getByTestId('back-to-castle').click()
  await expect(page.getByTestId('node-chess-game')).toHaveAccessibleName('Your first game, crowned')
})
