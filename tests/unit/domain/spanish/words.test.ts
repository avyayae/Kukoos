// @vitest-environment node
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SPANISH_SKILLS } from '@/domain/spanish/curriculum'
import {
  pictureKey,
  SPANISH_WORDS,
  type SpanishWord,
  shown,
  type WordPicture,
} from '@/domain/spanish/words'

const REVIEW = fileURLToPath(
  new URL('../../../../specs/features/019-spanish-words/words.review.md', import.meta.url),
)

const all = Object.values(SPANISH_WORDS).flat()

function picture(p: WordPicture): string {
  if ('emoji' in p) return p.emoji
  if ('swatch' in p) return `colour swatch ${p.swatch}`
  return `${p.number} (numeral, or ${p.number} dots)`
}

/** The table a grown-up reviews in the PR (spec 019 decision 1). */
function reviewTable(): string {
  const lines = [
    '# Spanish words for review (spec 019)',
    '',
    'Every word Kukoos teaches, generated from `src/domain/spanish/words.ts`. A grown-up',
    'checks each row (Spanish, meaning, picture) before release (constitution §3.4).',
    'Regenerate with `UPDATE_REVIEW=1 npx vitest run tests/unit/domain/spanish/words.test.ts`.',
    '',
    `**${all.length} words in ${SPANISH_SKILLS.length} skills.**`,
  ]
  for (const skill of SPANISH_SKILLS) {
    lines.push('', `## \`${skill.id}\`: ${skill.title}`, '', '| Spanish | English | Picture |')
    lines.push('|---|---|---|')
    for (const w of SPANISH_WORDS[skill.id] ?? []) {
      const said = w.say ? ` (said “${w.say}”)` : ''
      lines.push(`| ${shown(w)}${said} | ${w.en} | ${picture(w.picture)} |`)
    }
  }
  return `${lines.join('\n')}\n`
}

describe('Spanish word data (spec 019 AC2)', () => {
  it('has words for exactly the curriculum skills, at least 4 each', () => {
    expect(Object.keys(SPANISH_WORDS).sort()).toEqual(SPANISH_SKILLS.map((s) => s.id).sort())
    for (const s of SPANISH_SKILLS) expect(SPANISH_WORDS[s.id]?.length).toBeGreaterThanOrEqual(4)
  })

  it('ids are unique across the course', () => {
    const ids = all.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/)
  })

  it('every noun has an article that agrees in number', () => {
    const nouns = all.filter((w): w is SpanishWord & { article: string } => !!w.article)
    expect(nouns.length).toBeGreaterThan(40)
    for (const w of nouns) {
      const plural = w.article === 'los' || w.article === 'las'
      expect(w.es.endsWith('s'), `${shown(w)}`).toBe(plural)
    }
  })

  it('pictures are non-empty and unique within a skill', () => {
    for (const [skill, words] of Object.entries(SPANISH_WORDS)) {
      const keys = words.map((w) => pictureKey(w.picture))
      expect(new Set(keys).size, skill).toBe(keys.length)
      for (const w of words) {
        if ('emoji' in w.picture) expect(w.picture.emoji.trim()).not.toBe('')
        if ('swatch' in w.picture) expect(w.picture.swatch).toMatch(/^#[0-9a-f]{6}$/)
      }
    }
  })

  it('numbers skills hold numbers in order, and only they do', () => {
    for (const [skill, words] of Object.entries(SPANISH_WORDS)) {
      const numbers = words.flatMap((w) => ('number' in w.picture ? [w.picture.number] : []))
      if (skill.startsWith('es.numbers')) {
        expect(numbers).toHaveLength(words.length)
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
      } else expect(numbers).toEqual([])
    }
  })

  it('the review table matches the data', () => {
    const table = reviewTable()
    if (process.env.UPDATE_REVIEW === '1') writeFileSync(REVIEW, table)
    expect(readFileSync(REVIEW, 'utf8').replace(/\r\n/g, '\n')).toBe(table)
  })
})
