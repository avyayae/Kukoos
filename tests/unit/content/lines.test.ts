import { describe, expect, it } from 'vitest'
import bank from '../../../content/lines.en.json'
import { WORLDS } from '@/domain'
import { pick, praiseFor } from '@/features/lesson-player/copy'

// Spec 009 AC9: the build-time line bank is checked in CI, like a linter for kid copy.
const lists: Record<string, string[]> = bank.lists
const BANNED =
  /\b(wrong|incorrect|fail(ed|ure)?|game over|hurry|bad|stupid|dumb|lose|lost|loser|easy)\b/i
const MAX_WORDS = 8

describe('Kukoos line bank (AC9)', () => {
  it('covers every world, not-yet and combo, with plenty of variety', () => {
    for (const w of WORLDS) expect(lists[`praise:${w.id}`]?.length, w.id).toBeGreaterThanOrEqual(15)
    expect(lists.notYet?.length).toBeGreaterThanOrEqual(10)
    expect(lists.combo?.length).toBeGreaterThanOrEqual(6)
  })

  it('every line is short, gentle, number-free and unique within its list', () => {
    for (const [key, list] of Object.entries(lists)) {
      expect(new Set(list).size, `${key} has duplicates`).toBe(list.length)
      for (const line of list) {
        expect(line.trim(), key).toBe(line)
        expect(line.split(/\s+/).length, line).toBeLessThanOrEqual(MAX_WORDS)
        expect(line, line).not.toMatch(BANNED)
        // Numbers always come from code (§3.4), never from copy.
        expect(line, line).not.toMatch(/\d/)
        expect(line, line).toMatch(/[!.?]$/)
      }
    }
  })

  it('consecutive questions never repeat the previous line', () => {
    for (const w of WORLDS) {
      for (let seed = 0; seed < 60; seed++) {
        expect(praiseFor(w.id, seed + 1)).not.toBe(praiseFor(w.id, seed))
      }
    }
    for (let seed = 0; seed < 30; seed++)
      expect(pick('combo', seed + 1)).not.toBe(pick('combo', seed))
  })
})
