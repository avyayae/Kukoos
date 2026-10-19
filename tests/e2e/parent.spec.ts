import { expect, type Page, test } from './fixtures'
import {
  correctResponse,
  type LessonState,
  lessonReducer,
  type Question,
  simulateBugs,
  startLesson,
  wrongResponse,
} from '../../src/domain'
import { answer, finishRewards, passGate, TEST_PIN } from './helpers'

// Spec 011 AC9: the grown-ups PIN, forgot-PIN recovery, and the progress dashboard.

const pad = (page: Page) => page.getByRole('group', { name: 'Number pad' })
async function typeDigits(page: Page, digits: string) {
  for (const d of digits) await pad(page).getByRole('button', { name: d, exact: true }).click()
}

/** A seeded subtraction lesson with one smaller-from-larger slip on the first column question. */
async function playWithOneSlip(page: Page) {
  const skill = 'sub.within100.regroup'
  await page.goto(`/lesson/${skill}?seed=42`)
  let mirror: LessonState = startLesson({ skillId: skill, seed: 42, at: 0 })
  let slipped = false
  while (mirror.phase !== 'complete') {
    const q = mirror.question
    if (!slipped && q.kind === 'column') {
      slipped = true
      const m = q.arithmetic as NonNullable<Question['arithmetic']>
      const wrong = wrongResponse(
        q,
        simulateBugs(m.a, m.b, m.op)['sub.smallerFromLarger'] as number,
      )
      await answer(page, q, wrong)
      await page.getByRole('button', { name: 'Check' }).click()
      await page.getByTestId('feedback').getByRole('button', { name: 'Try again' }).click()
      mirror = lessonReducer(lessonReducer(mirror, { type: 'answer', response: wrong, at: 0 }), {
        type: 'retry',
      })
    }
    const r = correctResponse(q)
    await answer(page, q, r)
    await page.getByRole('button', { name: 'Check' }).click()
    await page.getByTestId('feedback').getByRole('button', { name: 'Continue' }).click()
    mirror = lessonReducer(lessonReducer(mirror, { type: 'answer', response: r, at: 0 }), {
      type: 'continue',
      at: 0,
    })
  }
  await finishRewards(page)
}

test('the PIN: set once, refused when wrong, recovered with a grown-up question', async ({
  page,
}) => {
  await page.goto('/grown-ups')
  await expect(page.getByRole('heading', { name: 'Create a grown-up PIN' })).toBeVisible()
  await passGate(page)
  await expect(page.getByRole('heading', { name: 'Grown-ups', exact: true })).toBeVisible()

  // A reload locks it again; a wrong PIN is refused.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Enter the grown-up PIN' })).toBeVisible()
  await typeDigits(page, '1111')
  await expect(page.getByText("That's not it. Try again.")).toBeVisible()

  // Forgot PIN? → answer the grown-up question → choose a new PIN.
  await page.getByRole('button', { name: 'Forgot PIN?' }).click()
  const question = (await page.getByText(/What is \d+ × \d+\?/).textContent()) ?? ''
  const [, a, b] = /(\d+) × (\d+)/.exec(question) ?? []
  await typeDigits(page, String(Number(a) * Number(b)))
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByRole('heading', { name: 'Create a grown-up PIN' })).toBeVisible()
  await typeDigits(page, '1357')
  await typeDigits(page, '1357')
  await expect(page.getByRole('heading', { name: 'Grown-ups', exact: true })).toBeVisible()
  expect(TEST_PIN).not.toBe('1357')
})

test('the dashboard shows minutes, the mission and the smaller-from-larger slip', async ({
  page,
}) => {
  await playWithOneSlip(page)
  await page.goto('/grown-ups')
  await passGate(page)
  await page.getByRole('link', { name: /See Explorer's progress/ }).click()

  const summary = page.getByRole('region', { name: 'Summary' })
  await expect(summary).toContainText('Missions done')
  await expect(page.getByTestId('mistake-sub.smallerFromLarger')).toContainText(
    'Smaller from larger: 1 this week',
  )
  await expect(page.getByRole('region', { name: 'Mastery' })).toContainText(
    'Subtract with borrowing',
  )
  await expect(page.getByRole('region', { name: 'Recent badges' })).toContainText('First Flight')
})
