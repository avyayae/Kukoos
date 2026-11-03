import type { CSSProperties } from 'react'
import type { WordPicture as Picture } from '@/domain/spanish/words'

/**
 * What a Spanish word looks like (spec 019): an emoji, a colour swatch, a numeral, or (for
 * `count`) dots in tens frames, all drawn by code.
 */
export function WordPicture({ picture, dots = false }: { picture: Picture; dots?: boolean }) {
  if ('emoji' in picture) {
    return (
      <span className="word-pic word-pic--emoji" aria-hidden="true">
        {picture.emoji}
      </span>
    )
  }
  if ('swatch' in picture) {
    // The colour is the content itself (reviewed data), not a design token.
    const style = { '--swatch': picture.swatch } as CSSProperties
    return <span className="word-pic word-pic--swatch" style={style} aria-hidden="true" />
  }
  if (!dots) {
    return (
      <span className="word-pic word-pic--number num" aria-hidden="true">
        {picture.number}
      </span>
    )
  }
  const frames = Math.ceil(picture.number / 10)
  return (
    <span className="word-pic word-pic--dots" aria-hidden="true">
      {Array.from({ length: frames }, (_, f) => (
        <span key={f} className="tens-frame">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={`tens-frame__cell${f * 10 + i < picture.number ? ' tens-frame__cell--on' : ''}`}
            />
          ))}
        </span>
      ))}
    </span>
  )
}
