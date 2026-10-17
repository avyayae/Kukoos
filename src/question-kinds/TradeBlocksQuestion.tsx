import { useCallback, useState } from 'react'
import { t } from '@/features/lesson-player/copy'
import { Keypad } from '@/ui'
import { BaseTenBlocks } from '@/visuals/BaseTenBlocks'
import { apply, initialBlocks, type Place, type Tool, TOOLS } from '@/visuals/blocksScratch'
import { DisplayView } from '@/visuals/DisplayView'
import { slotState } from './feedbackStyles'
import type { RendererProps } from './types'
import { useTypedNumber } from './useTypedNumber'

const TOOL_LABEL: Record<Tool, string> = {
  break: '✂ Break',
  takeAway: '✋ Take away',
  bundle: '🧺 Bundle',
}

const blocksOfNumber = (n: number) => ({
  hundreds: Math.floor(n / 100),
  tens: Math.floor(n / 10) % 10,
  ones: n % 10,
})

/** Blocks scratchpad + keypad. Trades/removals help the kid; the typed number is graded (AC8). */
export function TradeBlocksQuestion({
  question,
  locked,
  feedback,
  onChange,
  onBubble,
}: RendererProps) {
  const payload = question.payload.kind === 'tradeBlocks' ? question.payload : null
  const m = question.arithmetic
  const addend = payload?.task === 'add' && m ? blocksOfNumber(m.b) : undefined
  const [blocks, setBlocks] = useState(() =>
    initialBlocks(payload?.start ?? { hundreds: 0, tens: 0, ones: 0 }, addend),
  )
  const tools = TOOLS[payload?.task ?? 'trade']
  const [tool, setTool] = useState<Tool>(tools[0] as Tool)
  const onValue = useCallback(
    (value: number | null) => onChange(value === null ? null : { kind: 'number', value }),
    [onChange],
  )
  const { text, push, pop } = useTypedNumber(onValue)
  if (!payload) return null

  const answer = question.answer.value as number
  const showHundreds =
    blocks.hundreds > 0 || answer >= 100 || (m ? Math.max(m.a, m.b) >= 100 : false)
  const shown = feedback === 'solution' ? String(answer) : text

  const onTap = (place: Place) => {
    const result = apply(blocks, tool, place)
    if (result.ok) {
      setBlocks(result.state)
      onBubble(null)
    } else {
      onBubble(t(`blocks:${result.tip}`))
    }
  }

  return (
    <div className="qa qa--split">
      <div className="qa__main qa__main--stack">
        <DisplayView display={payload.display} value={shown} state={slotState(feedback)} />
        {tools.length > 1 && (
          <div className="chips" role="group" aria-label="Block tools">
            {tools.map((x) => (
              <button
                key={x}
                type="button"
                className={`btn3d btn3d--md ${x === tool ? 'btn3d--primary' : 'btn3d--ghost'}`}
                aria-pressed={x === tool}
                disabled={locked}
                onClick={() => setTool(x)}
              >
                {TOOL_LABEL[x]}
              </button>
            ))}
          </div>
        )}
        <BaseTenBlocks
          state={blocks}
          tool={tool}
          showHundreds={showHundreds}
          locked={locked}
          onTap={onTap}
        />
      </div>
      <div className="qa__input">
        <Keypad onDigit={push} onBackspace={pop} disabled={locked} />
      </div>
    </div>
  )
}
