import { expect, type Page, test } from '@playwright/test'
import {
  type ChessLessonState,
  chessLessonReducer,
  startChessLesson,
} from '../../src/domain/chess/lesson'
import { nextAnswer } from '../../src/domain/chess/puzzles/solve'
import { pickCourses } from './fixtures'
import { finishRewards } from './helpers'

// Spec 016 AC10: a chess-only kid learns on Chess Castle: skip-ahead checks crown skills
// and open the next one, a whole lesson ends in the celebration, mistakes get hints.

const sq = (page: Page, s: string) => page.getByTestId(`sq-${s}`)

async function onboardChessOnly(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: "Let's go!" }).click()
  await pickCourses(page, ['Chess'])
  await page.getByRole('button', { name: 'Comet' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: "That's me!" }).click()
  await expect(page.getByTestId('castle')).toBeVisible()
}

/** Plays the mirrored lesson through the UI, one right answer at a time. */
async function playMirror(page: Page, start: ChessLessonState) {
  let s = start
  while (s.phase !== 'complete') {
    while (s.phase === 'answering') {
      const a = nextAnswer(s.run)
      if (!a) throw new Error(`no answer for ${s.puzzle.id}`)
      if (a.mode === 'tap') {
        await sq(page, a.square).click()
        s = chessLessonReducer(s, { type: 'tap', square: a.square, at: 0 })
      } else if (a.mode === 'choice') {
        await page
          .getByRole('group', { name: 'Answers' })
          .getByRole('button', { name: a.value })
          .click()
        s = chessLessonReducer(s, { type: 'choice', value: a.value, at: 0 })
      } else {
        await sq(page, a.move.from).click()
        await sq(page, a.move.to).click()
        const picker = page.getByRole('dialog', { name: 'Choose a new piece!' })
        const promotes = await picker.isVisible()
        if (promotes) await picker.getByRole('button', { name: 'Queen' }).click()
        const input = promotes ? { ...a.move, promotion: 'q' as const } : a.move
        s = chessLessonReducer(s, { type: 'move', input, at: 0 })
      }
    }
    await expect(page.getByTestId('feedback')).toBeVisible()
    await page.getByTestId('feedback').getByRole('button', { name: 'Continue' }).click()
    s = chessLessonReducer(s, { type: 'continue', at: 0 })
  }
}

test('skip-ahead crowns The board and The rook; a full bishop lesson; a knight hint', async ({
  page,
}) => {
  await onboardChessOnly(page)

  // 1. The board: "Already know this?" → three right → crowned. (Play next opens it; a
  // fixed seed lets the test mirror the same puzzles.)
  await expect(page.getByRole('button', { name: 'Play next: The board' })).toBeVisible()
  await page.goto('/chess/lesson/chess.board?seed=11')
  await expect(page.getByRole('heading', { name: 'Already know this?' })).toBeVisible()
  await page.getByRole('button', { name: 'Show Kukoos!' }).click()
  await playMirror(
    page,
    startChessLesson({ skillId: 'chess.board', seed: 11, at: 0, skipCheck: true }),
  )
  await expect(page.getByRole('heading', { name: 'You know this already!' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByTestId('node-chess.board')).toHaveAccessibleName(
    'Mission 1, The board, crowned',
  )

  // 2. The rook: the same, and The bishop opens.
  await page.goto('/chess/lesson/chess.rook?seed=12')
  await page.getByRole('button', { name: 'Show Kukoos!' }).click()
  await playMirror(
    page,
    startChessLesson({ skillId: 'chess.rook', seed: 12, at: 0, skipCheck: true }),
  )
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByTestId('node-chess.rook')).toHaveAccessibleName(
    'Mission 2, The rook, crowned',
  )
  await expect(page.getByTestId('node-chess.bishop')).toHaveAccessibleName(
    'Mission 3, The bishop, start here',
  )

  // 3. A whole bishop lesson ends in the celebration.
  await page.goto('/chess/lesson/chess.bishop?seed=13&learn')
  await playMirror(page, startChessLesson({ skillId: 'chess.bishop', seed: 13, at: 0 }))
  await expect(page.getByRole('heading', { name: 'Mission complete!' })).toBeVisible()
  await finishRewards(page)
  await expect(page.getByTestId('castle')).toBeVisible()

  // 4. A knight moved like a bishop gets the L-shape hint.
  await page.goto('/chess/lesson/chess.knight?seed=2&learn')
  const knight = page.getByRole('button', { name: /White knight/ })
  const from = (await knight.getAttribute('data-square')) ?? 'a1'
  const file = 'abcdefgh'.indexOf(from[0] ?? 'a')
  const rank = Number(from[1])
  const diag = `${'abcdefgh'[file < 7 ? file + 1 : file - 1]}${rank < 8 ? rank + 1 : rank - 1}`
  await knight.click()
  await sq(page, diag).click()
  await expect(page.getByText('The knight jumps in an L shape.')).toBeVisible()
})
