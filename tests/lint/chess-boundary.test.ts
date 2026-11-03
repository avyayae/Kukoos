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

const USES_CHESS_JS = "import { Chess } from 'chess.js'\nexport const c = new Chess()\n"

// Spec 014 AC1: only src/domain/chess may import chess.js; it stays pure there too.
describe('chess.js boundary', { timeout: 30_000 }, () => {
  it.each([
    'src/features/chess/__fixture__.ts',
    'src/app/__fixture__.ts',
    'src/data/__fixture__.ts',
    'src/domain/__fixture__.ts',
  ])('rejects chess.js in %s', async (file) => {
    expect(await ruleIdsFor(USES_CHESS_JS, file)).toContain('no-restricted-imports')
  })

  it('allows chess.js inside src/domain/chess', async () => {
    expect(await ruleIdsFor(USES_CHESS_JS, 'src/domain/chess/__fixture__.ts')).toEqual([])
  })

  it('keeps src/domain/chess pure', async () => {
    const code = "import React from 'react'\nexport const x = Math.random() + (React ? 1 : 0)\n"
    const ids = await ruleIdsFor(code, 'src/domain/chess/__fixture__.ts')
    expect(ids).toContain('no-restricted-imports')
    expect(ids).toContain('no-restricted-properties')
  })
})
