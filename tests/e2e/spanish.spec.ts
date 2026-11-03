import { expect, type Page, test } from '@playwright/test'
import {
  spanishLessonReducer,
  type SpanishLessonState,
  startSpanishLesson,
} from '../../src/domain/spanish/lesson'
import { pickCourses } from './fixtures'
import { finishRewards } from './helpers'

// Spec 018 AC8: a new kid picks Spanish only and hears "¡Hola!" in a Spanish voice; a
// Math + Spanish kid switches between the two. (e2e builds offer Spanish: VITE_SPANISH=1.)

/** Records every utterance (text and language) instead of speaking it. */
async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const said: { text: string; lang: string }[] = []
    Object.assign(window, { __said: said })
    const synth = window.speechSynthesis
    synth.speak = (u: SpeechSynthesisUtterance) => {
      said.push({ text: u.text, lang: u.lang })
    }
  })
}

const said = (page: Page) =>
  page.evaluate(() => (window as unknown as { __said: { text: string; lang: string }[] }).__said)

async function onboard(page: Page, courses: ('Math' | 'Chess' | 'Spanish')[]) {
  await page.goto('/')
  await page.getByRole('button', { name: "Let's go!" }).click()
  await pickCourses(page, courses)
  await page.getByRole('button', { name: 'Comet' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: "That's me!" }).click()
}

test('a Spanish-only kid meets Kukoos on the Spanish home, in Spanish', async ({ page }) => {
  await recordSpeech(page)
  await page.goto('/')
  await page.getByRole('button', { name: "Let's go!" }).click()
  await expect(page.getByTestId('course-card-spanish')).toContainText('Español')
  await pickCourses(page, ['Spanish'])
  await page.getByRole('button', { name: 'Comet' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: "That's me!" }).click()
  await expect(page.getByTestId('spanish-home')).toBeVisible()
  await expect(page.getByTestId('journey')).toHaveCount(0)
  await page.getByTestId('spanish-hello').click()
  await expect
    .poll(async () => (await said(page)).filter((s) => s.text === '¡Hola!').map((s) => s.lang))
    .toContainEqual(expect.stringMatching(/^es/))
  // The rest of the line stays English.
  const english = (await said(page)).find((s) => s.text.includes('Hola Island'))
  expect(english?.lang).toMatch(/^en/)
})

test('a Math + Spanish kid switches between the two', async ({ page }) => {
  await onboard(page, ['Math', 'Spanish'])
  await expect(page.getByTestId('journey')).toBeVisible()
  await page.getByRole('radio', { name: 'Spanish' }).click()
  await expect(page.getByTestId('spanish-home')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('spanish-home')).toBeVisible()
  await page.getByRole('radio', { name: 'Math' }).click()
  await expect(page.getByTestId('journey')).toBeVisible()
})

// Spec 018 AC7: the Spanish home is its own chunk, fetched when a Spanish kid opens it.
test('the Spanish home loads on demand', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one measurement is enough')
  const spanishScripts: string[] = []
  page.on('response', async (res) => {
    if (!res.url().endsWith('.js')) return
    const body = await res.text().catch(() => '')
    if (body.includes('spanish-hello')) spanishScripts.push(res.url())
  })
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  expect(spanishScripts).toEqual([])
  await page.getByRole('button', { name: "Let's go!" }).click()
  await pickCourses(page, ['Spanish'])
  await page.getByRole('button', { name: 'Comet' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: "That's me!" }).click()
  await expect(page.getByTestId('spanish-home')).toBeVisible()
  await expect.poll(() => spanishScripts.length).toBeGreaterThan(0)
})

// Spec 019 AC11: a fresh Spanish-only kid plays the first lesson, skips ahead on the second,
// and a wrong pick is recorded. The test runs the same seeded lesson to know each answer.
const at = 0
function solved(s: SpanishLessonState): SpanishLessonState {
  const q = s.question
  if (q.kind === 'say') return spanishLessonReducer(s, { type: 'said' })
  if (q.kind === 'match') {
    return q.choices.reduce(
      (acc, c) => spanishLessonReducer(acc, { type: 'pair', wordId: c.id, pictureId: c.id, at }),
      s,
    )
  }
  return spanishLessonReducer(s, { type: 'choice', wordId: q.answer.id, at })
}

async function answerRight(page: Page, s: SpanishLessonState) {
  const q = s.question
  await expect(page.getByTestId('spanish-lesson')).toHaveAttribute('data-kind', q.kind)
  if (q.kind === 'say') return page.getByTestId('said-it').click()
  if (q.kind === 'match') {
    for (const c of q.choices) {
      await page.getByTestId(`word-${c.id}`).click()
      await page.getByTestId(`picture-${c.id}`).click()
    }
    return
  }
  const tile = page.getByTestId(`choice-${q.answer.id}`)
  await tile.click()
  if (q.kind === 'see') await tile.click()
}

async function playAll(page: Page, start: SpanishLessonState) {
  let s = start
  while (s.phase !== 'complete') {
    await answerRight(page, s)
    await page.getByTestId('feedback').getByRole('button', { name: 'Continue' }).click()
    s = spanishLessonReducer(solved(s), { type: 'continue', at })
  }
}

test('a Spanish kid plays the first lesson to the celebration', async ({ page }) => {
  await onboard(page, ['Spanish'])
  await expect(page.getByTestId('spanish-path')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play next: Hello!' })).toBeVisible()
  // Play next opens it; a fixed seed lets the test mirror the same questions.
  await page.goto('/spanish/lesson/es.hello?seed=5&learn')
  await playAll(page, startSpanishLesson({ skillId: 'es.hello', seed: 5, at }))
  await expect(page.getByRole('heading', { name: 'Mission complete!' })).toBeVisible()
  await finishRewards(page)
  await expect(page.getByTestId('spanish-home')).toBeVisible()
})

test('the skip-ahead check crowns Kind words, and a wrong pick is saved', async ({ page }) => {
  await onboard(page, ['Spanish'])
  // The profile is saved once the home shows.
  await expect(page.getByTestId('spanish-home')).toBeVisible()
  await page.goto('/spanish/lesson/es.manners?seed=9')
  await page.getByRole('button', { name: 'Show Kukoos!' }).click()
  await playAll(page, startSpanishLesson({ skillId: 'es.manners', seed: 9, at, skipCheck: true }))
  await expect(page.getByRole('heading', { name: 'You know these already!' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  // Crowned, even out of order (Hello is still the next one on the path).
  await expect(page.getByTestId('node-es.manners')).toHaveAccessibleName(/crowned/)
  await expect(page.getByTestId('node-es.hello')).toHaveAccessibleName(/start here/)

  // A deliberate wrong pick in Feelings, then leave: the attempt keeps the mix-up.
  await page.goto('/spanish/lesson/es.feelings?seed=3&learn')
  const s = startSpanishLesson({ skillId: 'es.feelings', seed: 3, at })
  const wrong = s.question.choices.find((c) => c.id !== s.question.answer.id)
  if (!wrong) throw new Error('needs a distractor')
  await page.getByTestId(`choice-${wrong.id}`).click()
  await expect(page.getByTestId('feedback')).toContainText('Not yet!')
  await page.getByRole('button', { name: 'Try again' }).click()
  await page.getByTestId(`choice-${s.question.answer.id}`).click()
  await page.getByTestId('feedback').getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Leave lesson' }).click()
  await page.getByRole('button', { name: 'Leave', exact: true }).click()
  await expect(page.getByTestId('spanish-home')).toBeVisible()
  const keys = await page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const open = indexedDB.open('kukoos')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const req = open.result.transaction('attempts').objectStore('attempts').getAll()
          req.onsuccess = () =>
            resolve((req.result as { misconceptions: string[] }[]).flatMap((a) => a.misconceptions))
        }
      }),
  )
  expect(keys).toContain(`es.mixup:${s.question.answer.id}~${wrong.id}`)
})
