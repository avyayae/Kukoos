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

/**
 * From "Mission complete!": taps CONTINUE on the summary, then on each reward moment
 * (chest, badge, level, goal, streak; spec 008), until the lesson screen is gone.
 */
export async function finishRewards(page: Page) {
  const summary = page.getByRole('heading', { name: 'Mission complete!' })
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(summary).toBeHidden()
  const moment = page.getByTestId('reward-moment')
  for (let step = 1; await moment.isVisible(); step++) {
    const current = page.locator(`[data-testid="reward-moment"][data-step="${step}"]`)
    await current.getByRole('button', { name: 'Continue' }).click()
    await expect(current).toHaveCount(0)
  }
  await expect(summary).toBeHidden()
  await expect(moment).toBeHidden()
}

/** Plays a whole seeded lesson on a brand-new skill with correct answers. */
export async function playPerfectLesson(page: Page, skillId: string, seed: number) {
  await page.goto(`/lesson/${skillId}?seed=${seed}`)
  await playThrough(page, startLesson({ skillId, seed, at: 0 }))
}

/** The PIN every e2e grown-up uses. */
export const TEST_PIN = '2468'

async function typePin(page: Page, pin: string) {
  const pad = page.getByRole('group', { name: 'Number pad' })
  for (const d of pin) await pad.getByRole('button', { name: d, exact: true }).click()
}

/**
 * Gets past the grown-ups lock (spec 011): creates the test PIN on first use, otherwise
 * enters it. `wrong` enters a wrong PIN instead.
 */
export async function passGate(page: Page, { wrong = false } = {}) {
  const heading = page.getByRole('heading', {
    name: /Create a grown-up PIN|Enter the grown-up PIN/,
  })
  await expect(heading).toBeVisible()
  if ((await heading.textContent())?.startsWith('Create')) {
    await typePin(page, TEST_PIN)
    await expect(page.getByRole('heading', { name: 'Type the PIN again' })).toBeVisible()
    await typePin(page, TEST_PIN)
  } else {
    await typePin(page, wrong ? '1111' : TEST_PIN)
  }
  if (!wrong) await expect(page.getByRole('heading', { name: 'Grown-ups only' })).toBeHidden()
}

/**
 * Sets today's active time for the current kid straight in IndexedDB (instead of waiting
 * real minutes), then reloads so the app picks it up.
 */
export async function seedToday(page: Page, totalSeconds: number, lessonSeconds = 0) {
  await page.goto('/')
  await expect(page.getByTestId('journey')).toBeVisible()
  await page.evaluate(
    ({ totalSeconds, lessonSeconds }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('kukoos')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(['settings', 'dailyActivity'], 'readwrite')
          const get = tx.objectStore('settings').get('global')
          get.onsuccess = () => {
            const profileId = (get.result as { currentProfileId: string }).currentProfileId
            const d = new Date()
            const pad = (n: number) => String(n).padStart(2, '0')
            const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
            tx.objectStore('dailyActivity').put({
              id: `${profileId}:${date}`,
              profileId,
              date,
              lessonSeconds,
              totalSeconds,
              bonusMinutes: 0,
              goalMet: false,
              updatedAt: Date.now(),
              version: 1,
            })
          }
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
    { totalSeconds, lessonSeconds },
  )
  await page.reload()
}

/**
 * After a starting point opens a new world, the map may celebrate it first (spec 007 AC10).
 * Tap the celebration away if it shows up.
 */
export async function dismissWorldUnlock(page: Page) {
  await page
    .getByTestId('world-unlock')
    .click({ timeout: 2000 })
    .catch(() => undefined)
}
