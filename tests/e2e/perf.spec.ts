import { expect, test } from '@playwright/test'

// Spec 012 AC6 (constitution §3.7): the first visit transfers less than 2 MB.
const BUDGET = 2 * 1024 * 1024

test.use({ serviceWorkers: 'block' })

test('the first visit stays under 2 MB', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one measurement is enough')
  let bytes = 0
  const sizes: { url: string; size: number }[] = []
  page.on('response', async (res) => {
    try {
      const size = (await res.body()).length
      bytes += size
      sizes.push({ url: res.url(), size })
    } catch {
      // Redirects and aborted requests have no body.
    }
  })
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.getByTestId('onboarding')).toBeVisible()
  await page.waitForLoadState('networkidle')
  const top = sizes
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .map((s) => `${Math.round(s.size / 1024)} KB ${s.url}`)
  expect(bytes, `first visit ${Math.round(bytes / 1024)} KB\n${top.join('\n')}`).toBeLessThan(
    BUDGET,
  )
})
