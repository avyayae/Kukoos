import { expect, type Page, test } from '@playwright/test'
import {
  correctResponse,
  type LessonState,
  lessonReducer,
  type Question,
  type Response,
  simulateBugs,
  startLesson,
  wrongResponse,
} from '../../src/domain'

// Spec 005 AC12–AC14: a full seeded lesson on phone, tablet and desktop.
const SKILL = 'sub.within100.regroup'
const SEED = 42
const SIGN = { '<': 'less than', '=': 'equal to', '>': 'greater than' } as const

async function answer(page: Page, q: Question, r: Response) {
  switch (r.kind) {
    case 'number':
      await page.keyboard.type(String(r.value))
      return
    case 'columnDigits':
      // Column cells fill right to left: type the ones digit first.
      await page.keyboard.type(r.digits.filter((d) => d !== null).join(''))
      return
    case 'choice': {
      if (q.payload.kind !== 'mcq') throw new Error('choice for non-mcq')
      await page
        .getByRole('radio', { name: String(q.payload.choices[r.index]), exact: true })
        .click()
      return
    }
    case 'boolean':
      await page.getByRole('radio', { name: r.value ? 'True' : 'False' }).click()
      return
    case 'comparison':
      await page.getByRole('radio', { name: SIGN[r.value] }).click()
  }
}

async function expectFitsScreen(page: Page) {
  const overflow = await page.evaluate(() => {
    const lesson = document.querySelector('.lesson') as HTMLElement
    return {
      x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      y: lesson.scrollHeight - lesson.clientHeight,
    }
  })
  expect(overflow.x, 'horizontal scroll').toBeLessThanOrEqual(0)
  expect(overflow.y, 'lesson content taller than the screen').toBeLessThanOrEqual(1)
}

test('plays a full seeded lesson, with one targeted hint, to Mission complete (AC14)', async ({
  page,
}) => {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`)
  })
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))

  await page.goto(`/lesson/${SKILL}?seed=${SEED}`)
  let mirror: LessonState = startLesson({ skillId: SKILL, seed: SEED, at: 0 })
  let missedOnPurpose = false

  while (mirror.phase !== 'complete') {
    const q = mirror.question
    await expect(page.getByRole('button', { name: 'Check' })).toBeDisabled()
    await expectFitsScreen(page)

    // Question 3 is the first guided column: make the classic smaller-from-larger mistake.
    if (!missedOnPurpose && q.kind === 'column') {
      missedOnPurpose = true
      const m = q.arithmetic as NonNullable<Question['arithmetic']>
      const bug = simulateBugs(m.a, m.b, m.op)['sub.smallerFromLarger'] as number
      const wrong = wrongResponse(q, bug)
      await answer(page, q, wrong)
      await page.getByRole('button', { name: 'Check' }).click()
      const banner = page.getByTestId('feedback')
      await expect(banner).toContainText(/Can we take \d from \d\? Trade a ten first!/)
      await expect(page.locator('body')).not.toContainText(/wrong|incorrect|fail/i)
      mirror = lessonReducer(mirror, { type: 'answer', response: wrong, at: 0 })
      await banner.getByRole('button', { name: 'Try again' }).click()
      mirror = lessonReducer(mirror, { type: 'retry' })
    }

    const r = correctResponse(q)
    await answer(page, q, r)
    await page.getByRole('button', { name: 'Check' }).click()
    await expect(page.getByTestId('feedback')).toHaveClass(/banner--correct/)
    await page.getByTestId('feedback').getByRole('button', { name: 'Continue' }).click()
    mirror = lessonReducer(mirror, { type: 'answer', response: r, at: 0 })
    mirror = lessonReducer(mirror, { type: 'continue', at: 0 })
  }

  await expect(page.getByRole('heading', { name: 'Mission complete!' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Lesson results' })).toContainText('90%')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/practice$/)
  expect(problems).toEqual([])
})

test('kid controls are big enough and keyboard play works (AC12)', async ({ page }) => {
  await page.goto(`/lesson/${SKILL}?seed=${SEED}`)
  const q = startLesson({ skillId: SKILL, seed: SEED, at: 0 }).question
  for (const name of ['1', '0', 'Delete', 'Leave lesson']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox()
    expect(box?.height, name).toBeGreaterThanOrEqual(56)
  }
  // Physical keys + Enter (handled on keyup, so one press doesn't skip the feedback).
  await page.keyboard.type(String(q.answer.value))
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('feedback')).toHaveClass(/banner--correct/)
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('feedback')).toHaveCount(0)
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10')
})

test('reduced motion: block trades swap instantly, banners only fade (AC13)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/lesson/${SKILL}?seed=${SEED}`)
  await page.getByTestId('place-tens').click()
  await expect(page.getByTestId('place-ones').locator('.block--new')).toHaveCount(0)
  const q = startLesson({ skillId: SKILL, seed: SEED, at: 0 }).question
  await page.keyboard.type(String(q.answer.value))
  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByTestId('feedback')).toHaveCSS('animation-name', 'mq-fade')
})

/**
 * Visual-overlap guard: nothing in the question area may sit under Kukoos's row or the
 * keypad, and the keypad must stay above CHECK. (A page-scroll check alone missed this,
 * because the question area clips instead of scrolling.)
 */
async function expectNoOverlap(page: Page, label: string) {
  const r = await page.evaluate(() => {
    const rect = (el: Element | null) => el?.getBoundingClientRect() ?? null
    const main = [...document.querySelectorAll('.qa__main > *')].map((e) =>
      e.getBoundingClientRect(),
    )
    return {
      kukoosBottom: rect(document.querySelector('.lesson__kukoos'))?.bottom ?? 0,
      mainTop: Math.min(...main.map((m) => m.top)),
      mainBottom: Math.max(...main.map((m) => m.bottom)),
      mainRight: Math.max(...main.map((m) => m.right)),
      // Keypad questions have .qa__input; choice questions have answer tiles instead.
      input: rect(document.querySelector('.qa__input') ?? document.querySelector('.tiles')),
      checkTop: rect(document.querySelector('.lesson__check'))?.top ?? Infinity,
    }
  })
  expect(r.mainTop, `${label}: question under Kukoos`).toBeGreaterThanOrEqual(r.kukoosBottom - 1)
  const input = r.input
  if (!input) throw new Error('no input area')
  const stacked = input.left < r.mainRight - 1
  if (stacked)
    expect(r.mainBottom, `${label}: keypad covers question`).toBeLessThanOrEqual(input.top + 1)
  expect(input.bottom, `${label}: keypad under CHECK`).toBeLessThanOrEqual(r.checkTop + 1)
}

for (const size of [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
]) {
  test(`no overlap on a ${size.width}×${size.height} phone (AC12)`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: size })
    for (const url of [
      `/lesson/${SKILL}?seed=${SEED}`, // trade blocks
      '/lesson/addsub.3digit.mixed?seed=5', // guided 3-digit column
      '/lesson/sub.3digit.acrossZero?seed=9', // 3-digit trade blocks with hundreds
      '/lesson/pv.hundredsTensOnes?seed=8', // numeric place value
      '/lesson/pv.compare3digit?seed=1', // compare tiles
    ]) {
      await page.goto(url)
      await expectNoOverlap(page, url)
    }
    await page.close()
  })
}

test('picker → lesson → leave → picker', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page).toHaveURL(/\/practice$/)
  await page.getByRole('link', { name: /Borrow across zero/ }).click()
  await expect(page).toHaveURL(/\/lesson\/sub\.3digit\.acrossZero$/)
  await page.getByRole('button', { name: 'Leave lesson' }).click()
  await page.getByRole('button', { name: 'Leave', exact: true }).click()
  await expect(page).toHaveURL(/\/practice$/)
})
