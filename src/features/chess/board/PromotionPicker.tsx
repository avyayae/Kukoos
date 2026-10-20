import { useEffect, useRef } from 'react'
import { type Color, PIECE_NAMES, type PromotionPiece } from '@/domain/chess'
import { useSpeakOnTap } from '@/ui'
import { PieceArt } from './PieceArt'

const CHOICES: readonly PromotionPiece[] = ['q', 'r', 'b', 'n']

/** A pawn reached the end (spec 015 AC5): pick its new piece, queen first. */
export function PromotionPicker({
  color,
  onPick,
  onCancel,
}: {
  color: Color
  onPick: (piece: PromotionPiece) => void
  onCancel: () => void
}) {
  const say = useSpeakOnTap()
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => first.current?.focus(), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div className="promo" role="dialog" aria-modal="true" aria-labelledby="promo-title">
      <h2 id="promo-title" className="promo__title">
        Choose a new piece!
      </h2>
      <div className="promo__choices">
        {CHOICES.map((piece, i) => {
          const name = PIECE_NAMES[piece]
          return (
            <button
              key={piece}
              ref={i === 0 ? first : undefined}
              type="button"
              className="tile promo__choice"
              onClick={() => {
                say(name)
                onPick(piece)
              }}
            >
              <PieceArt type={piece} color={color} />
              <span className="promo__name">{name[0]?.toUpperCase() + name.slice(1)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
