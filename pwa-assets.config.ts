import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates favicon + PWA icons from public/kukoos.svg: `npm run icons`.
// Background matches --mq-bg so the maskable/apple icons sit on the app's lavender.
const background = '#f6f3ff'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ['public/kukoos.svg'],
})
