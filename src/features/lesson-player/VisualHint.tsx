import type { ColumnStep, Question } from '@/domain'
import { solveColumns } from '@/domain'
import { BaseTenBlocks } from '@/visuals/BaseTenBlocks'
import { blocksLabel, initialBlocks } from '@/visuals/blocksScratch'
import { hintNumbers } from './hintNumbers'

const PLACE = ['Ones', 'Tens', 'Hundreds'] as const

const blocksOf = (n: number) => ({
  hundreds: Math.floor(n / 100),
  tens: Math.floor(n / 10) % 10,
  ones: n % 10,
})

/** SHOW ME: the numbers as base-ten blocks — concrete, without giving the answer away. */
export function BlocksPicture({ q }: { q: Question }) {
  const numbers = hintNumbers(q)
  if (numbers.length === 0) return null
  return (
    <div className="flex flex-col gap-3" data-testid="visual-hint">
      {numbers.map((n, i) => {
        const state = initialBlocks(blocksOf(n))
        const showHundreds = n >= 100
        return (
          <figure key={i} className="flex flex-col gap-1">
            <figcaption className="text-kid-lg">
              <span className="num">{n}</span> is {blocksLabel(state, showHundreds)}
            </figcaption>
            <BaseTenBlocks
              state={state}
              tool="break"
              showHundreds={showHundreds}
              locked
              onTap={() => undefined}
            />
          </figure>
        )
      })}
    </div>
  )
}

function stepLine(s: ColumnStep, op: '+' | '-'): string {
  const place = PLACE[s.place] ?? PLACE[2]
  if (op === '+') {
    const carry = s.carryIn ? ' + 1' : ''
    const sum = s.top + s.bottom + s.carryIn
    return `${place}: ${s.top} + ${s.bottom}${carry} = ${sum}${s.carryOut ? ' → write ' + s.digit + ', carry 1' : ''}`
  }
  const traded = s.received ? ' (traded a ten)' : ''
  return `${place}: ${s.working} − ${s.bottom} = ${s.digit}${traded}`
}

/** Worked solution shown on the second miss (column method, ones first). */
export function WorkedSteps({ q }: { q: Question }) {
  const m = q.arithmetic
  if (!m || m.unknown !== 'result') return null
  const steps = solveColumns(m.a, m.b, m.op)
  return (
    <ol className="worked" data-testid="worked-steps">
      {steps.map((s) => (
        <li key={s.place} className="num">
          {stepLine(s, m.op)}
        </li>
      ))}
    </ol>
  )
}
