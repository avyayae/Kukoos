import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { generateQuestion, type Question, SKILLS } from '@/domain'
import { TradeBlocksQuestion } from '@/question-kinds/TradeBlocksQuestion'
import { RENDERERS } from '@/question-kinds/registry'
import { apply, blocksLabel, initialBlocks } from '@/visuals/blocksScratch'
import { setReducedMotion } from '../../setup'
import { lastResponse, renderQuestion } from './helpers'

const tradeQ = (n: number): Question => ({
  id: `trade:${n}`,
  skillId: 'pv.tradeTens',
  difficulty: 2,
  kind: 'tradeBlocks',
  seed: 0,
  prompt: { text: '', speech: '' },
  payload: {
    kind: 'tradeBlocks',
    display: { type: 'units', tens: Math.floor(n / 10) - 1, ones: null, total: n },
    start: { hundreds: 0, tens: Math.floor(n / 10), ones: n % 10 },
    task: 'trade',
  },
  answer: { type: 'number', value: (n % 10) + 10 },
  hints: [],
})

describe('blocks scratch model', () => {
  it('breaks, takes away and bundles', () => {
    let s = initialBlocks({ hundreds: 0, tens: 3, ones: 6 })
    const broken = apply(s, 'break', 'tens')
    if (!broken.ok) throw new Error('expected ok')
    s = broken.state
    expect(blocksLabel(s, false)).toBe('2 tens 16 ones')
    const taken = apply(s, 'takeAway', 'ones')
    if (!taken.ok) throw new Error('expected ok')
    expect(blocksLabel(taken.state, false)).toBe('2 tens 15 ones')
    const bundled = apply(taken.state, 'bundle', 'ones')
    if (!bundled.ok) throw new Error('expected ok')
    expect(blocksLabel(bundled.state, true)).toBe('0 hundreds 3 tens 5 ones')
  })

  it('gives kid-friendly tips instead of failing silently', () => {
    const s = initialBlocks({ hundreds: 0, tens: 0, ones: 4 })
    expect(apply(s, 'break', 'ones')).toEqual({ ok: false, tip: 'onesCantBreak' })
    expect(apply(s, 'break', 'tens')).toEqual({ ok: false, tip: 'nothingToTrade' })
    expect(apply(s, 'takeAway', 'tens')).toEqual({ ok: false, tip: 'nothingToTrade' })
    expect(apply(s, 'bundle', 'ones')).toEqual({ ok: false, tip: 'needTenToBundle' })
    expect(apply(s, 'bundle', 'hundreds')).toEqual({ ok: false, tip: 'needTenToBundle' })
  })

  it('adding starts with both numbers on the mat', () => {
    const s = initialBlocks({ hundreds: 0, tens: 4, ones: 7 }, { hundreds: 0, tens: 3, ones: 8 })
    expect(blocksLabel(s, false)).toBe('7 tens 15 ones')
  })
})

describe('TradeBlocksQuestion (AC8)', () => {
  it('tapping the tens breaks a rod into 10 cubes and updates the count', async () => {
    renderQuestion(TradeBlocksQuestion, tradeQ(36))
    expect(screen.getByTestId('place-tens')).toHaveTextContent('3 tens')
    await userEvent.click(screen.getByTestId('place-tens'))
    expect(screen.getByTestId('place-tens')).toHaveTextContent('2 tens')
    expect(screen.getByTestId('place-ones')).toHaveTextContent('16 ones')
    expect(screen.getByTestId('place-ones').querySelectorAll('.block--new')).toHaveLength(10)
  })

  it('swaps instantly with reduced motion', async () => {
    setReducedMotion(true)
    renderQuestion(TradeBlocksQuestion, tradeQ(36))
    await userEvent.click(screen.getByTestId('place-tens'))
    expect(screen.getByTestId('place-ones')).toHaveTextContent('16 ones')
    expect(screen.getByTestId('place-ones').querySelectorAll('.block--new')).toHaveLength(0)
  })

  it('puts a tip in the bubble when a tap cannot work', async () => {
    const { onBubble } = renderQuestion(TradeBlocksQuestion, tradeQ(36))
    await userEvent.click(screen.getByTestId('place-ones'))
    expect(onBubble).toHaveBeenLastCalledWith("Ones can't break. Tap a ten!")
  })

  it('grades only the typed answer', async () => {
    const { onChange } = renderQuestion(TradeBlocksQuestion, tradeQ(36))
    await userEvent.click(screen.getByRole('button', { name: '1' }))
    await userEvent.click(screen.getByRole('button', { name: '6' }))
    expect(lastResponse(onChange)).toEqual({ kind: 'number', value: 16 })
  })

  it('subtraction offers Break and Take away tools', async () => {
    const q = generateQuestion('sub.within100.regroup', {
      difficulty: 2,
      kind: 'tradeBlocks',
      seed: 3,
    })
    renderQuestion(TradeBlocksQuestion, q)
    const takeAway = screen.getByRole('button', { name: '✋ Take away' })
    await userEvent.click(takeAway)
    expect(takeAway).toHaveAttribute('aria-pressed', 'true')
    const before = screen.getByTestId('place-ones').textContent
    await userEvent.click(screen.getByTestId('place-ones'))
    expect(screen.getByTestId('place-ones').textContent).not.toBe(before)
    expect(screen.getByTestId('place-ones').querySelectorAll('.block--removed')).toHaveLength(1)
  })
})

describe('renderer registry', () => {
  it('renders every kind of every skill without crashing', () => {
    for (const skill of SKILLS) {
      for (const kind of skill.kinds) {
        const q = generateQuestion(skill.id, { difficulty: 3, kind, seed: 11 })
        const { unmount } = renderQuestion(RENDERERS[kind], q)
        unmount()
      }
    }
  })
})
