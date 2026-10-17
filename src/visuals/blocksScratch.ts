import type { Blocks } from '@/domain'
import { placeWord } from '@/domain/speech'

/** Base-ten blocks scratchpad (spec 005 AC8). Scratch only — the typed answer is graded. */
export type Place = 'hundreds' | 'tens' | 'ones'
export type Tool = 'break' | 'takeAway' | 'bundle'
export type BlocksTask = 'add' | 'subtract' | 'trade'
export type BlocksTip = 'nothingToTrade' | 'onesCantBreak' | 'needTenToBundle'

export interface BlocksState extends Blocks {
  removed: Blocks
  /** The most recent action that created blocks, for the pop-in animation. */
  fresh: { place: Place; count: number; nonce: number } | null
}

export const TOOLS: Record<BlocksTask, readonly Tool[]> = {
  trade: ['break'],
  subtract: ['break', 'takeAway'],
  add: ['bundle'],
}

const NONE: Blocks = { hundreds: 0, tens: 0, ones: 0 }

/** Adding shows both numbers' blocks together; the kid then bundles tens. */
export function initialBlocks(start: Blocks, addend?: Blocks): BlocksState {
  const plus = addend ?? NONE
  return {
    hundreds: start.hundreds + plus.hundreds,
    tens: start.tens + plus.tens,
    ones: start.ones + plus.ones,
    removed: NONE,
    fresh: null,
  }
}

export function available(s: BlocksState, place: Place): number {
  return s[place] - s.removed[place]
}

export type BlocksResult = { ok: true; state: BlocksState } | { ok: false; tip: BlocksTip }

const SMALLER: Record<Place, Place | null> = { hundreds: 'tens', tens: 'ones', ones: null }
const BIGGER: Record<Place, Place | null> = { ones: 'tens', tens: 'hundreds', hundreds: null }

export function apply(s: BlocksState, tool: Tool, place: Place): BlocksResult {
  const nonce = (s.fresh?.nonce ?? 0) + 1
  if (tool === 'break') {
    const smaller = SMALLER[place]
    if (!smaller) return { ok: false, tip: 'onesCantBreak' }
    if (available(s, place) < 1) return { ok: false, tip: 'nothingToTrade' }
    return {
      ok: true,
      state: {
        ...s,
        [place]: s[place] - 1,
        [smaller]: s[smaller] + 10,
        fresh: { place: smaller, count: 10, nonce },
      },
    }
  }
  if (tool === 'takeAway') {
    if (available(s, place) < 1) return { ok: false, tip: 'nothingToTrade' }
    return {
      ok: true,
      state: { ...s, removed: { ...s.removed, [place]: s.removed[place] + 1 }, fresh: null },
    }
  }
  const bigger = BIGGER[place]
  if (!bigger || available(s, place) < 10) return { ok: false, tip: 'needTenToBundle' }
  return {
    ok: true,
    state: {
      ...s,
      [place]: s[place] - 10,
      [bigger]: s[bigger] + 1,
      fresh: { place: bigger, count: 1, nonce },
    },
  }
}

/** "2 tens 16 ones" — what's left on the mat. */
export function blocksLabel(s: BlocksState, showHundreds: boolean): string {
  const places: Place[] = showHundreds ? ['hundreds', 'tens', 'ones'] : ['tens', 'ones']
  return places.map((p) => countLabel(s, p)).join(' ')
}

/** "1 ten", "16 ones". */
export function countLabel(s: BlocksState, place: Place): string {
  const n = available(s, place)
  return `${n} ${placeWord(place, n)}`
}
