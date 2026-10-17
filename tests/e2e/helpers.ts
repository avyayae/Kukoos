import { expect, type Page } from '@playwright/test'
import {
  correctResponse,
  type LessonState,
  lessonReducer,
  type Question,
  type Response,
  startLesson,
} from '../../src/domain'

const SIGN = { '<': 'less than', '=': 'equal to', '>': 'greater than' } as const

/** Waits until a lesson question is on screen (the app renders once IndexedDB has opened). */
export async function lessonReady(page: Page) {
  await expect(page.getByRole('button', { name: 'Check' })).toBeVisible()
}

/** Enters a response through the real UI (keyboard digits, tiles). */
export async function answer(page: Page, q: Question, r: Response) {
  await lessonReady(page)
  // Tap the on-screen keypad (how kids play). Physical-keyboard play has its own test.
  const tap = async (digits: string) => {
    for (const d of digits) {
      await page
        .getByRole('group', { name: 'Number pad' })
        .getByRole('button', { name: d, exact: true })
        .click()
    }
  }
  switch (r.kind) {
    case 'number':
      await tap(String(r.value))
      return
    case 'columnDigits':
      // Column cells fill right to left: enter the ones digit first.
      await tap(r.digits.filter((d) => d !== null).join(''))
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

/** Answers every question of start (mirrored in-test) correctly, up to "Mission complete!". */
export async function playThrough(page: Page, start: LessonState) {
  let mirror = start
  while (mirror.phase !== 'complete') {
    const r = correctResponse(mirror.question)
    await answer(page, mirror.question, r)
    await page.getByRole('button', { name: 'Check' }).click()
    await page.getByTestId('feedback').getByRole('button', { name: 'Continue' }).click()
    mirror = lessonReducer(mirror, { type: 'answer', response: r, at: 0 })
    mirror = lessonReducer(mirror, { type: 'continue', at: 0 })
  }
  await expect(page.getByRole('heading', { name: 'Mission complete!' })).toBeVisible()
}

/** Plays a whole seeded lesson on a brand-new skill with correct answers. */
export async function playPerfectLesson(page: Page, skillId: string, seed: number) {
  await page.goto(`/lesson/${skillId}?seed=${seed}`)
  await playThrough(page, startLesson({ skillId, seed, at: 0 }))
}
