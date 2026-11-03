// @vitest-environment node
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const barrel = readFileSync(
  fileURLToPath(new URL('../../../../src/domain/index.ts', import.meta.url)),
  'utf8',
)

// Spec 014 AC8: chess loads on demand, so the shared domain barrel never pulls it in.
describe('chess stays out of the first load', () => {
  it('the @/domain barrel does not re-export chess', () => {
    expect(barrel).not.toMatch(/from '\.\/chess/)
    expect(barrel).not.toMatch(/chess\.js/)
  })
})
