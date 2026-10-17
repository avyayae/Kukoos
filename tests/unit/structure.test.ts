// @vitest-environment node
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../..', import.meta.url))

// specs/03-architecture.md §3 — spec 001 AC11
const requiredFolders = [
  'src/app',
  'src/domain',
  'src/data',
  'src/features',
  'src/question-kinds',
  'src/visuals',
  'src/ui',
  'src/audio',
  'src/assets',
  'content',
  'tools',
  'specs',
  'tests/unit',
  'tests/e2e',
]

describe('project structure', () => {
  it.each(requiredFolders)('%s exists', (folder) => {
    expect(existsSync(`${root}/${folder}`)).toBe(true)
  })
})
