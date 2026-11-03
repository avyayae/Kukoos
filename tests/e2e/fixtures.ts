import { test as base, expect, type Page } from '@playwright/test'

/** "What do you want to learn?" (spec 013; e2e builds offer chess). */
export async function pickCourses(page: Page, courses: readonly ('Math' | 'Chess')[] = ['Math']) {
  await expect(page.getByText('What do you want to learn?')).toBeVisible()
  for (const c of courses) await page.getByRole('button', { name: c, exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
}

/**
 * Completes the first-run welcome (specs 010, 013) with the defaults: math only, name
 * "Explorer", default look.
 */
export async function finishOnboarding(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.getByRole('button', { name: "Let's go!" }).click()
  await pickCourses(page)
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: "That's me!" }).click()
  await expect(page.getByTestId('journey')).toBeVisible()
  // The first map visit silently records which worlds are open (spec 007 AC10); wait for it,
  // so later world-unlock moments show up the same way every run.
  await expect.poll(() => seenWorldsSaved(page)).toBe(true)
}

/** True once the first map visit has saved which worlds are open. */
export function seenWorldsSaved(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('kukoos')
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('settings')
          const all = tx.objectStore('settings').getAll()
          all.onsuccess = () => {
            const rows = all.result as { seenWorlds?: string[] }[]
            db.close()
            resolve(rows.some((r) => (r.seenWorlds?.length ?? 0) > 0))
          }
        }
        open.onerror = () => resolve(false)
      }),
  )
}

/**
 * The default test: every spec starts with a kid who has already met Kukoos and made an
 * explorer, so it can go straight to the map. `profiles.spec.ts` uses the plain test.
 */
export const test = base.extend<{ onboarded: undefined }>({
  onboarded: [
    async ({ page }, use) => {
      await finishOnboarding(page)
      await use(undefined)
    },
    { auto: true },
  ],
})

export { expect }
export type { Page }
