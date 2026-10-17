import type { Question } from '@/domain'

/** The numbers worth picturing as blocks for SHOW ME (operands, or the number being studied). */
export function hintNumbers(q: Question): number[] {
  if (q.arithmetic) {
    const { a, b, unknown } = q.arithmetic
    return unknown === 'result' ? [a, b] : [unknown === 'a' ? b : a]
  }
  const p = q.payload
  if (p.kind === 'compare') return [p.left, p.right]
  if ('display' in p) {
    const d = p.display
    if (d.type === 'units' && d.total !== null) return [d.total]
    if (d.type === 'digitInPlace') return [d.number]
  }
  return []
}
