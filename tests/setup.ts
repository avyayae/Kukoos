import '@testing-library/jest-dom/vitest'
// In-memory IndexedDB for data tests (spec 004). Tests use unique DB names to stay isolated.
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom has no matchMedia. Tests can flip reduced motion with setReducedMotion(true).
let reducedMotion = false

export function setReducedMotion(value: boolean) {
  reducedMotion = value
}

// Node-environment tests (e.g. tests/lint) have no DOM to mock or clean up.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })),
  })

  afterEach(() => {
    cleanup()
    reducedMotion = false
  })
}
