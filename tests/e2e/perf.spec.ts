import { expect, test } from '@playwright/test'

// Spec 012 AC6 (constitution §3.7): the first visit transfers less than 2 MB.
// Spec 015 AC9: chess (chess.js and the board) is not part of it; it loads on demand.
const BUDGET = 2 * 1024 * 1024
/** chess.js's start position: only chess code contains it. */
const CHESS_MARK = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'

test.use({ serviceWorkers: 'block' })

test('the first visit stays under 2 MB, without chess', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one measurement is enough')
  let bytes = 0
  const sizes: { url: string; size: number }[] = []
  const chessScripts: string[] = []
  page.on('response', async (res) => {
    try {
      const body = await res.body()
      bytes += body.length
      sizes.push({ url: res.url(), size: body.length })
      if (res.url().endsWith('.js') && body.toString('utf8').includes(CHESS_MARK)) {
        chessScripts.push(res.url())
      }
    } catch {
      // Redirects and aborted requests have no body.
    }
  })
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.waitForLoadState('networkidle')
  const top = sizes
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .map((s) => `${Math.round(s.size / 1024)} KB ${s.url}`)
  expect(bytes, `first visit ${Math.round(bytes / 1024)} KB\n${top.join('\n')}`).toBeLessThan(
    BUDGET,
  )
  expect(chessScripts, 'chess code in the first load').toEqual([])

  // Opening the free board fetches the chess chunk.
  await page.goto('/chess/board')
  await expect(page.getByTestId('free-board')).toBeVisible()
  await expect.poll(() => chessScripts.length).toBeGreaterThan(0)
})
