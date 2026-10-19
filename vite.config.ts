import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// Manifest colors mirror tokens: --mq-primary (theme) and --mq-bg (background).
const THEME_COLOR = '#7c4dff'
const BACKGROUND_COLOR = '#f6f3ff'

/**
 * Where the app lives (spec 012 AC1). GitHub Pages serves it at /Kukoos/, so the deploy
 * workflow sets BASE_PATH=/Kukoos/. Local dev, tests and previews use /.
 */
const BASE = process.env.BASE_PATH ?? '/'

/**
 * GitHub Pages has no SPA rewrites: a refresh on /Kukoos/grown-ups would 404. Serving
 * index.html as 404.html lets the app's router take over (spec 012 AC2).
 */
export function spaFallback(): Plugin {
  let outDir = 'dist'
  return {
    name: 'kukoos-spa-404',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const index = resolve(outDir, 'index.html')
      if (existsSync(index)) copyFileSync(index, resolve(outDir, '404.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    spaFallback(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'kukoos.svg'],
      manifest: {
        name: 'Kukoos Math Quest',
        short_name: 'Kukoos',
        description: 'Fly with Kukoos from Earth to space while mastering 2nd–3rd grade math.',
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        display: 'standalone',
        orientation: 'any',
        start_url: BASE,
        scope: BASE,
        lang: 'en-US',
        categories: ['education', 'kids', 'games'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Everything a kid needs is precached, so play works fully offline (Constitution §3.6).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,riv,mp3,json}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      // The SW is only exercised via `npm run preview` (e2e), so dev never serves stale builds.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/{unit,lint}/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts'],
      reporter: ['text-summary', 'html'],
      thresholds: {
        // Spec 003 AC12: the arithmetic engine is fully covered.
        'src/domain/arithmetic/**': { lines: 100, functions: 100, statements: 100 },
      },
    },
  },
})
