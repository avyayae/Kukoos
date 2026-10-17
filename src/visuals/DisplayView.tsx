import type { Display, Equation, Slot } from '@/domain'
import { OP_SYMBOL } from '@/domain/speech'

export type SlotState = 'default' | 'correct' | 'incorrect'

interface SlotProps {
  /** What the kid has typed into the unknown box ('' = empty). */
  value: string
  state: SlotState
}

/** The box the kid fills in. Shows the typed value, or the answer when revealed. */
export function AnswerSlot({ value, state }: SlotProps) {
  const empty = value === ''
  return (
    <span
      className={`answer-slot answer-slot--${state}${empty ? ' answer-slot--empty' : ''}`}
      data-testid="answer-slot"
      aria-label={empty ? 'Your answer, empty' : `Your answer, ${value}`}
    >
      {empty ? '?' : value}
    </span>
  )
}

function Num({ slot, value, state }: { slot: Slot } & SlotProps) {
  return slot === null ? <AnswerSlot value={value} state={state} /> : <span>{slot}</span>
}

function EquationView({ equation, value, state }: { equation: Equation } & SlotProps) {
  return (
    <p className="display num" data-testid="display">
      {equation.terms.map((term, i) => (
        <span key={i} className="display__part">
          {i > 0 && <span className="display__op">{OP_SYMBOL[equation.ops[i - 1] ?? '+']}</span>}
          <Num slot={term} value={value} state={state} />
        </span>
      ))}
      <span className="display__op">=</span>
      <Num slot={equation.result} value={value} state={state} />
    </p>
  )
}

type Units = Extract<Display, { type: 'units' }>

function UnitsView({ units, value, state }: { units: Units } & SlotProps) {
  const part = (slot: Slot | undefined, name: string) =>
    slot === undefined ? null : (
      <span className="units__part">
        <Num slot={slot} value={value} state={state} />
        <span className="units__name">{name}</span>
      </span>
    )
  const parts = (
    <span className="units__parts">
      {part(units.hundreds, 'hundreds')}
      {part(units.tens, 'tens')}
      {part(units.ones, 'ones')}
    </span>
  )
  return (
    <div className="display display--units num" data-testid="display">
      {units.total === null ? (
        <>
          {parts}
          <span className="display__op">=</span>
          <AnswerSlot value={value} state={state} />
        </>
      ) : (
        <>
          <span>{units.total}</span>
          <span className="display__op">=</span>
          {parts}
        </>
      )}
    </div>
  )
}

interface DisplayViewProps {
  display: Display
  /** The kid's typed answer ('' when empty). */
  value: string
  state?: SlotState
}

/** Renders any F003 `Display` with the kid's answer in the unknown slot. */
export function DisplayView({ display, value, state = 'default' }: DisplayViewProps) {
  if (display.type === 'equation') {
    return <EquationView equation={display.equation} value={value} state={state} />
  }
  if (display.type === 'units') return <UnitsView units={display} value={value} state={state} />
  return (
    <div className="display display--digit" data-testid="display">
      <p className="num display__big">{display.number}</p>
      <AnswerSlot value={value} state={state} />
    </div>
  )
}
