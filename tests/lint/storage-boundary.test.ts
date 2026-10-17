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

const DEXIE = "import Dexie from 'dexie'\nexport default Dexie\n"
const HOOKS = "import { useLiveQuery } from 'dexie-react-hooks'\nexport default useLiveQuery\n"

// Spec 004 AC12: only src/data may talk to IndexedDB.
describe('storage boundary lint rule', { timeout: 30_000 }, () => {
  it.each(['src/features/x.ts', 'src/ui/x.ts', 'src/question-kinds/x.ts', 'src/app/x.ts'])(
    'rejects Dexie in %s',
    async (file) => {
      expect(await ruleIdsFor(DEXIE, file)).toContain('no-restricted-imports')
      expect(await ruleIdsFor(HOOKS, file)).toContain('no-restricted-imports')
    },
  )

  it('allows Dexie inside src/data', async () => {
    expect(await ruleIdsFor(DEXIE, 'src/data/x.ts')).toEqual([])
    expect(await ruleIdsFor(HOOKS, 'src/data/x.ts')).toEqual([])
  })

  it('still rejects Dexie in src/domain (domain purity)', async () => {
    expect(await ruleIdsFor(DEXIE, 'src/domain/x.ts')).toContain('no-restricted-imports')
  })
})
