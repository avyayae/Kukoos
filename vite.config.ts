import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Manifest colors mirror tokens: --mq-primary (theme) and --mq-bg (background).
const THEME_COLOR = '#7c4dff'
const BACKGROUND_COLOR = '#f6f3ff'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
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
        start_url: '/',
        scope: '/',
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
    },
  },
})
