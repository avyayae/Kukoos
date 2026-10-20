import type { Color, PieceType } from '@/domain/chess'

/**
 * Original chess pieces (spec 015): classic silhouettes, so skills carry over to a real
 * board, with two dot eyes and a small smile in the Kukoos style. Decorative: the square
 * carries the accessible name. Colours come from the --mq-piece-* tokens.
 */
export function PieceArt({ type, color }: { type: PieceType; color: Color }) {
  return (
    <svg
      viewBox="0 0 45 45"
      className={`piece piece--${color}`}
      data-piece={`${color}${type}`}
      aria-hidden="true"
      focusable="false"
    >
      <g className="piece__body">
        {BODIES[type]}
        <rect x="10" y="35" width="25" height="5.5" rx="2.5" />
      </g>
      <g className="piece__face">{FACES[type]}</g>
    </svg>
  )
}

/** Eyes at (x ± 2, y) and a smile just below. */
function face(x: number, y: number) {
  return (
    <>
      <circle cx={x - 2.2} cy={y} r="1.25" />
      <circle cx={x + 2.2} cy={y} r="1.25" />
      <path
        d={`M${x - 2} ${y + 2.6} Q${x} ${y + 4.2} ${x + 2} ${y + 2.6}`}
        className="piece__smile"
      />
    </>
  )
}

const BODIES: Record<PieceType, React.ReactNode> = {
  p: (
    <>
      <path d="M14.5 36 C14.5 29 18 25 19.5 21 H25.5 C27 25 30.5 29 30.5 36 Z" />
      <circle cx="22.5" cy="14.5" r="6.5" />
    </>
  ),
  r: (
    <>
      <path d="M11.5 7.5 H16 V11 H19.5 V7.5 H25.5 V11 H29 V7.5 H33.5 V16 H11.5 Z" />
      <path d="M14 16 H31 L32.5 36 H12.5 Z" />
    </>
  ),
  b: (
    <>
      <circle cx="22.5" cy="5.5" r="2.4" />
      <path d="M22.5 8 C28.5 12.5 31 18 28.5 24 H16.5 C14 18 16.5 12.5 22.5 8 Z" />
      <path d="M17 24 H28 C28.5 29 30.5 32.5 31.5 36 H13.5 C14.5 32.5 16.5 29 17 24 Z" />
    </>
  ),
  n: (
    <path d="M31 36 H13.5 C13.5 30 16.5 27 20 24 C16.5 24.5 12.5 24.5 10.5 21.5 C9.5 18.5 14 13.5 17.5 11.5 L18.5 5.5 L22 9.5 C28.5 9.5 33.5 16 32.8 25.5 C32.5 29.5 31.5 33 31 36 Z" />
  ),
  q: (
    <>
      <path d="M14 36 C15 29.5 16 24.5 16 20 L11.5 11 L18 15.5 L22.5 7.5 L27 15.5 L33.5 11 L29 20 C29 24.5 30 29.5 31 36 Z" />
      <circle cx="11.5" cy="10.5" r="2" />
      <circle cx="22.5" cy="6.5" r="2" />
      <circle cx="33.5" cy="10.5" r="2" />
    </>
  ),
  k: (
    <>
      <path d="M21.25 2.5 H23.75 V5.5 H26.5 V8 H23.75 V12 H21.25 V8 H18.5 V5.5 H21.25 Z" />
      <path d="M14.5 36 C15.5 30 15.5 25 14.5 20 C14 14.5 31 14.5 30.5 20 C29.5 25 29.5 30 30.5 36 Z" />
    </>
  ),
}

const FACES: Record<PieceType, React.ReactNode> = {
  p: face(22.5, 13.5),
  r: face(22.5, 23),
  b: face(22.5, 17),
  // The knight looks left: one eye, and a smile near the muzzle.
  n: (
    <>
      <circle cx="19.5" cy="15" r="1.4" />
      <path d="M12.2 19.8 Q13.8 21.2 15.6 20.4" className="piece__smile" />
    </>
  ),
  q: face(22.5, 24),
  k: face(22.5, 24),
}
