import { readFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'
import { playPerfectLesson } from './helpers'

// Spec 004 AC11: progress survives reloads and a backup → wipe → restore round trip.
const SKILL = 'add.within20'
const card = (page: Page) => page.getByRole('link', { name: /Add within 20/ })

async function wipeLocalData(page: Page) {
  // Dexie closes its connection on 'versionchange', so the delete isn't blocked.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase('kukoos')
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      }),
  )
}

test('a finished lesson is still there after a reload', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text())
  })
  await page.goto('/practice')
  await expect(card(page)).toContainText('New!')

  await playPerfectLesson(page, SKILL, 7)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/practice$/)
  await expect(card(page)).toContainText('⭐ 100%')

  await page.reload()
  await expect(card(page)).toContainText('⭐ 100%')
  expect(problems).toEqual([])
})

test('backup → wipe → restore brings progress back', async ({ page }, testInfo) => {
  await playPerfectLesson(page, SKILL, 7)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(card(page)).toContainText('⭐ 100%')

  // Download a backup.
  await page.getByRole('link', { name: /For grown-ups/ }).click()
  await expect(page.getByTestId('counts')).toContainText('1 lesson and 10 answers')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download backup' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^kukoos-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const path = testInfo.outputPath('backup.json')
  await download.saveAs(path)
  const backup = JSON.parse(await readFile(path, 'utf8'))
  expect(backup.tables.lessons).toHaveLength(1)

  // Lose everything (like a browser clearing site data).
  await wipeLocalData(page)
  await page.goto('/practice')
  await expect(card(page)).toContainText('New!')

  // Restore.
  await page.goto('/grown-ups')
  await page.getByTestId('backup-file').setInputFiles(path)
  await page.getByRole('button', { name: 'Replace' }).click()
  await expect(page.getByRole('status')).toContainText('Restored! 1 lesson is back.')
  await page.goto('/practice')
  await expect(card(page)).toContainText('⭐ 100%')
})
