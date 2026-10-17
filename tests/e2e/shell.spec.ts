import { expect, test, type Page } from '@playwright/test'

// Spec 001 acceptance criteria. Token values mirror src/ui/tokens.css.
const PRIMARY_LIGHT = 'rgb(124, 77, 255)' // --mq-primary
const PRIMARY_DARK = 'rgb(155, 123, 255)' // --mq-primary (dark)
const BG_LIGHT = 'rgb(246, 243, 255)' // --mq-bg
const BG_DARK = 'rgb(20, 17, 48)' // --mq-bg (dark)

const startButton = (page: Page) => page.getByRole('button', { name: 'Start' })

async function waitForServiceWorkerControl(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (navigator.serviceWorker.controller) return
    await new Promise<void>((resolve) =>
      navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }),
    )
  })
}

test.describe('app shell', () => {
  test('AC1: shows title in Baloo 2, Kukoos and a Start button', async ({ page }) => {
    await page.goto('/')
    const title = page.getByRole('heading', { level: 1, name: 'Kukoos Math Quest' })
    await expect(title).toBeVisible()
    await expect(page.getByRole('img', { name: 'Kukoos the bird' })).toBeVisible()
    await expect(startButton(page)).toBeVisible()

    const baloLoaded = await page.evaluate(async () => {
      await document.fonts.ready
      return document.fonts.check('800 48px "Baloo 2"')
    })
    expect(baloLoaded).toBe(true)
    await expect(title).toHaveCSS('font-family', /Baloo 2/)
  })

  test('DoD: loads and interacts without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning')
        errors.push(`${msg.type()}: ${msg.text()}`)
    })
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))

    await page.goto('/')
    await expect(startButton(page)).toBeVisible()
    await startButton(page).click()
    await page.evaluate(() => document.fonts.ready)
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('layout: no horizontal scroll and kid-size tap target', async ({ page }) => {
    await page.goto('/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    const box = await startButton(page).boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(56)
  })

  test('AC8: token colors in light and dark themes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await expect(startButton(page)).toHaveCSS('background-color', PRIMARY_LIGHT)
    await expect(page.locator('body')).toHaveCSS('background-color', BG_LIGHT)

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(startButton(page)).toHaveCSS('background-color', PRIMARY_DARK)
    await expect(page.locator('body')).toHaveCSS('background-color', BG_DARK)
  })

  test('AC9: pressing moves the button onto its lip, except with reduced motion', async ({
    page,
  }) => {
    await page.goto('/')
    const button = startButton(page)
    const box = await button.boundingBox()
    if (!box) throw new Error('Start button not laid out')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await expect(button).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 6)') // xl lip = 6px
    await page.mouse.up()

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.mouse.down()
    await page.waitForTimeout(150)
    await expect(button).toHaveCSS('transform', 'none')
    await page.mouse.up()
  })

  test('AC7: makes no third-party network requests', async ({ page, baseURL }) => {
    const foreign: string[] = []
    page.on('request', (req) => {
      const url = req.url()
      if (!url.startsWith('data:') && !url.startsWith(baseURL ?? '')) foreign.push(url)
    })
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    await page.waitForLoadState('networkidle')
    expect(foreign).toEqual([])
  })
})

test.describe('PWA', () => {
  test('AC5: serves an installable manifest and registers a service worker', async ({
    page,
    request,
  }) => {
    const res = await request.get('/manifest.webmanifest')
    expect(res.ok()).toBe(true)
    const manifest = await res.json()
    expect(manifest).toMatchObject({
      name: 'Kukoos Math Quest',
      short_name: 'Kukoos',
      display: 'standalone',
      start_url: '/',
      theme_color: '#7c4dff',
      background_color: '#f6f3ff',
    })
    const icons = manifest.icons as { sizes: string; purpose?: string }[]
    expect(icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
    expect(icons.some((i) => i.purpose === 'maskable')).toBe(true)

    await page.goto('/')
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      'href',
      /manifest\.webmanifest/,
    )
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
    expect(scope).toMatch(/\/$/)
  })

  test('AC6: the shell loads offline after the first visit', async ({ page, context }) => {
    await page.goto('/')
    await waitForServiceWorkerControl(page)

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Kukoos Math Quest' })).toBeVisible()
    await expect(startButton(page)).toBeVisible()
    await context.setOffline(false)
  })
})
