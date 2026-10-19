// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ResolvedConfig } from 'vite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { spaFallback } from '../../../vite.config'

let root: string
let outDir: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'kukoos-404-'))
  outDir = join(root, 'dist')
  mkdirSync(outDir)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

/** Runs the plugin's build hooks as Vite would, against the temporary out dir. */
function runBuildHooks() {
  const plugin = spaFallback()
  expect(plugin.apply).toBe('build')
  ;(plugin.configResolved as (c: ResolvedConfig) => void)({
    root,
    build: { outDir: 'dist' },
  } as ResolvedConfig)
  ;(plugin.closeBundle as () => void)()
}

describe('404.html for GitHub Pages deep links (spec 012 AC2)', () => {
  it('copies index.html to 404.html after the build', () => {
    const html = '<!doctype html><div id="root"></div>'
    writeFileSync(join(outDir, 'index.html'), html)
    runBuildHooks()
    expect(readFileSync(join(outDir, '404.html'), 'utf8')).toBe(html)
  })

  it('does nothing when there is no index.html', () => {
    runBuildHooks()
    expect(existsSync(join(outDir, '404.html'))).toBe(false)
  })
})
