import { expect, type Page, test } from '@playwright/test'
import { pickCourses } from './fixtures'

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
