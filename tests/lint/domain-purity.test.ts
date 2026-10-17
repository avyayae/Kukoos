// @vitest-environment node
import { ESLint } from 'eslint'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const cwd = fileURLToPath(new URL('../..', import.meta.url))
const eslint = new ESLint({ cwd })

async function ruleIdsFor(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath })
  return (result?.messages ?? []).map((m) => m.ruleId)
}

// Constitution §3.2 / §3.3, spec 001 AC3
describe('domain purity lint rules', () => {
  it('rejects React imports and Math.random inside src/domain', async () => {
    const code = "import React from 'react'\nexport const x = Math.random() + (React ? 1 : 0)\n"
    const ids = await ruleIdsFor(code, 'src/domain/__fixture__.ts')
    expect(ids).toContain('no-restricted-imports')
    expect(ids).toContain('no-restricted-properties')
  })

  it.each([
    "import Dexie from 'dexie'\nexport default Dexie\n",
    "import { Button3D } from '@/ui/Button3D'\nexport default Button3D\n",
    "import * as db from '@/data/db'\nexport default db\n",
  ])('rejects UI/storage imports inside src/domain: %s', async (code) => {
    expect(await ruleIdsFor(code, 'src/domain/__fixture__.ts')).toContain('no-restricted-imports')
  })

  it('rejects DOM and I/O globals inside src/domain', async () => {
    const code = 'export const w = window.innerWidth + localStorage.length\n'
    const ids = await ruleIdsFor(code, 'src/domain/__fixture__.ts')
    expect(ids.filter((id) => id === 'no-restricted-globals')).toHaveLength(2)
  })

  it('allows the same code outside src/domain', async () => {
    const code = 'export const x = Math.random() + window.innerWidth\n'
    expect(await ruleIdsFor(code, 'src/features/__fixture__.ts')).toEqual([])
  })

  it('accepts pure domain code', async () => {
    const code = "import { createRng } from './rng'\nexport const n = createRng(1).int(1, 6)\n"
    expect(await ruleIdsFor(code, 'src/domain/__fixture__.ts')).toEqual([])
  })
})
