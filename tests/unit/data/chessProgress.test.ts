import { describe, expect, it } from 'vitest'
import { createDexieRepositories } from '@/data/repositories/dexie'
import { parentReport } from '@/domain'
import { type ChessLessonState, chessLessonReducer, startChessLesson } from '@/domain/chess/lesson'
import { chessUnlocked } from '@/domain/chess/curriculum'
import { nextAnswer } from '@/domain/chess/puzzles/solve'
import type { Square } from '@/domain/chess'
import { freshDb } from './testDb'

const at = () => Date.UTC(2026, 9, 20, 16)

function playLesson(skillId: string, seed: number, illegalOnFirst = false): ChessLessonState {
  let s = startChessLesson({ skillId, seed, at: at() })
  if (illegalOnFirst) {
    s = chessLessonReducer(s, {
      type: 'illegal',
      reason: 'not-how-it-moves',
      from: s.puzzle.marks.focus as Square,
      at: at(),
    })
  }
  while (s.phase !== 'complete') {
    while (s.phase === 'answering') {
      const a = nextAnswer(s.run)
      if (!a) throw new Error('no answer')
      s =
        a.mode === 'tap'
          ? chessLessonReducer(s, { type: 'tap', square: a.square, at: at() })
          : a.mode === 'choice'
            ? chessLessonReducer(s, { type: 'choice', value: a.value, at: at() })
            : chessLessonReducer(s, { type: 'move', input: a.move, at: at() })
    }
    s = chessLessonReducer(s, { type: 'continue', at: at() })
  }
  return s
}

describe('chess lessons save like math lessons (spec 016 AC5, AC8)', () => {
  it('saves the lesson, chess answers with mistake keys, chess mastery and shared rewards', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db, at)
    const profileId = (await repos.profiles.ensureCurrent())?.id ?? ''
    const effects = await repos.lessons.save(playLesson('chess.knight', 4, true), {
      lessonId: 'C1',
      profileId,
    })
    expect(effects.some((e) => e.type === 'xpGained')).toBe(true)

    const attempts = await db.attempts.toArray()
    expect(attempts).toHaveLength(8)
    // Rows are keyed by random ids, so find the one answer with a recorded mistake.
    const withMistakes = attempts.filter((x) => x.misconceptions.length > 0)
    expect(withMistakes).toHaveLength(1)
    expect(withMistakes[0]).toMatchObject({
      skillId: 'chess.knight',
      misconceptions: ['chess.not-how-it-moves:n'],
    })
    expect(attempts.every((a) => a.kind.startsWith('chess.'))).toBe(true)

    const progress = await repos.progress.forProfile(profileId)
    expect(progress['chess.knight']?.attempts).toBe(8)
    expect(Object.keys(progress).every((id) => id.startsWith('chess.'))).toBe(true)
    expect((await repos.rewards.wallet(profileId)).wallet.xpTotal).toBeGreaterThan(0)

    // The grown-ups report stays math-only and doesn't trip over chess rows.
    const report = parentReport(await repos.reports.forProfile(profileId))
    expect(report.totals.answers).toBe(0)
    expect(report.misconceptions).toEqual([])
  })

  it('"Already know this?" passed: the skill is crowned and the next one opens (AC6)', async () => {
    const repos = createDexieRepositories(freshDb(), at)
    const profileId = (await repos.profiles.ensureCurrent())?.id ?? ''
    expect(await repos.progress.markMastered(profileId, 'chess.board')).toBe(true)
    expect(await repos.progress.markMastered(profileId, 'chess.board')).toBe(false)
    const progress = await repos.progress.forProfile(profileId)
    expect(progress['chess.board']).toMatchObject({ crowned: true, preMastered: true })
    expect(chessUnlocked(progress)).toEqual(['chess.board', 'chess.rook'])
  })
})
