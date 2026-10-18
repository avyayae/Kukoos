import { expect, type Page, test } from '@playwright/test'
import { passGate, playPerfectLesson, seedToday } from './helpers'

// Spec 009 AC11: sounds pair with feedback, sound settings persist, Kukoos reacts.
// Dev/e2e builds log every sound played to window.__kukoosSfx (no speakers needed).
const played = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { __kukoosSfx?: string[] }).__kukoosSfx ?? [])

/** The device's saved sound settings, read straight from IndexedDB. */
function savedAudio(page: Page) {
  return page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const open = indexedDB.open('kukoos')
        open.onsuccess = () => {
          const db = open.result
          const get = db.transaction('settings').objectStore('settings').get('global')
          get.onsuccess = () => {
            const row = get.result as { soundOn?: boolean; readAloud?: boolean } | undefined
            db.close()
            resolve({ soundOn: row?.soundOn, readAloud: row?.readAloud })
          }
        }
      }),
  )
}

test('a lesson plays its sounds and Kukoos cheers at the end', async ({ page }) => {
  await playPerfectLesson(page, 'add.within20', 7)
  const sounds = await played(page)
  expect(sounds.filter((s) => s === 'correct' || s === 'combo')).toHaveLength(10)
  expect(sounds).toContain('complete')
  expect(sounds).toContain('tap')
  expect(sounds).not.toContain('notYet')
  await expect(page.getByTestId('kukoos').first()).toHaveAttribute('data-mood', 'cheer')
})

test('with sound off (saved in Grown-ups), a lesson is silent', async ({ page }) => {
  await page.goto('/grown-ups')
  await passGate(page)
  await page.getByRole('checkbox', { name: 'Sound effects' }).uncheck()
  await page.getByRole('checkbox', { name: 'Read questions aloud' }).uncheck()
  // Wait until the device settings are saved before reloading.
  await expect.poll(() => savedAudio(page)).toEqual({ soundOn: false, readAloud: false })
  await page.reload()
  await passGate(page)
  await expect(page.getByRole('checkbox', { name: 'Sound effects' })).not.toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Read questions aloud' })).not.toBeChecked()

  await playPerfectLesson(page, 'add.within20', 7)
  const sounds = await played(page)
  expect(sounds).not.toContain('correct')
  expect(sounds).not.toContain('complete')
})

test('Kukoos sleeps on the Goodnight screen', async ({ page }) => {
  await seedToday(page, 60 * 60)
  await expect(page.getByTestId('goodnight')).toBeVisible()
  await expect(page.getByTestId('kukoos')).toHaveAttribute('data-mood', 'sleep')
  expect(await played(page)).toContain('lullaby')
})
