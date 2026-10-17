import { readFile } from 'node:fs/promises'
import { expect, type Page, test } from '@playwright/test'
import { passGate, playPerfectLesson } from './helpers'

// Spec 004 AC11: progress survives reloads and a backup → wipe → restore round trip.
// Since spec 007 the score list lives under Grown-ups → All missions.
const SKILL = 'add.within20'
const card = (page: Page) => page.getByRole('link', { name: /Add within 20/ })

async function openMissions(page: Page) {
  await page.goto('/grown-ups/missions')
  await passGate(page)
  await expect(page.getByRole('heading', { name: 'All missions' })).toBeVisible()
}

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
  await openMissions(page)
  await expect(card(page)).toContainText('New!')

  await playPerfectLesson(page, SKILL, 7)
  await page.getByRole('button', { name: 'Continue' }).click()
  // Back on the map (lesson query params are carried over)
  await expect(page).toHaveURL(/\/(\?.*)?$/)

  await page.reload()
  await openMissions(page)
  await expect(card(page)).toContainText('⭐ 100%')
  expect(problems).toEqual([])
})

test('backup → wipe → restore brings progress back', async ({ page }, testInfo) => {
  await playPerfectLesson(page, SKILL, 7)
  await page.getByRole('button', { name: 'Continue' }).click()

  // Download a backup.
  await page.goto('/grown-ups')
  await passGate(page)
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
  await openMissions(page)
  await expect(card(page)).toContainText('New!')

  // Restore.
  await page.goto('/grown-ups')
  await passGate(page)
  await page.getByTestId('backup-file').setInputFiles(path)
  await page.getByRole('button', { name: 'Replace' }).click()
  await expect(page.getByRole('status')).toContainText('Restored! 1 lesson is back.')
  await openMissions(page)
  await expect(card(page)).toContainText('⭐ 100%')
})
