import { expect, type Page, test } from './fixtures'

// Spec 015 AC3, AC8, AC10: the free board by taps and drags, hints, a quick mate.

const sq = (page: Page, name: string) => page.getByTestId(`sq-${name}`)

async function tapMove(page: Page, from: string, to: string) {
  await sq(page, from).click()
  await sq(page, to).click()
}

async function dragMove(page: Page, from: string, to: string) {
  const a = await sq(page, from).boundingBox()
  const b = await sq(page, to).boundingBox()
  if (!a || !b) throw new Error('square not on screen')
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/chess/board')
  await expect(page.getByTestId('free-board')).toBeVisible()
})

test('taps, a gentle hint, and Scholar’s mate', async ({ page }) => {
  await tapMove(page, 'e2', 'e4')
  await expect(page.getByTestId('turn')).toHaveText('Black to move')
  await tapMove(page, 'e7', 'e5')

  // The bishop can't go straight: it says why, and nothing moves.
  await tapMove(page, 'f1', 'f3')
  await expect(page.getByRole('status')).toHaveText('The bishop moves diagonally.')
  await expect(sq(page, 'f1')).toHaveAccessibleName('f1, White bishop, selected')

  // Still selected: try again straight away.
  await sq(page, 'c4').click()
  await tapMove(page, 'b8', 'c6')
  await tapMove(page, 'd1', 'h5')
  await tapMove(page, 'g8', 'f6')
  await tapMove(page, 'h5', 'f7')
  await expect(page.getByTestId('game-over')).toHaveText('Checkmate! White wins.')
  await expect(sq(page, 'e8')).toHaveAccessibleName('e8, Black king, in check')

  await page.getByRole('button', { name: 'New game' }).click()
  await expect(sq(page, 'f7')).toHaveAccessibleName('f7, Black pawn')
})

test('drag to move; a wrong drop snaps back with the reason', async ({ page }) => {
  await dragMove(page, 'g1', 'f3')
  await expect(sq(page, 'f3')).toHaveAccessibleName('f3, White knight')
  await expect(page.getByTestId('turn')).toHaveText('Black to move')

  await dragMove(page, 'b8', 'b6')
  await expect(page.getByRole('status')).toHaveText('The knight jumps in an L shape.')
  await expect(sq(page, 'b8')).toHaveAccessibleName(/Black knight/)
})

test('fits a phone and glides, or fades with reduced motion', async ({ page }) => {
  const box = await page.getByRole('grid').boundingBox()
  const viewport = page.viewportSize()
  expect(box && viewport && box.width <= viewport.width).toBe(true)
  expect((box?.width ?? 0) / 8).toBeGreaterThanOrEqual(40)

  await tapMove(page, 'e2', 'e4')
  const glide = page.locator('[data-testid="sq-e4"] .sq__piece')
  await expect(glide).toHaveCSS('animation-name', 'mq-piece-glide')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await tapMove(page, 'e7', 'e5')
  await expect(page.locator('[data-testid="sq-e5"] .sq__piece')).toHaveCSS(
    'animation-name',
    'mq-fade',
  )
})
