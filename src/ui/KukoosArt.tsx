interface KukoosArtProps {
  /** Rendered width/height in px. */
  size?: number
  /** The space helmet (Moon and Mars worlds, spec 009 AC4). */
  helmet?: boolean
  className?: string
}

/**
 * Kukoos, drawn in layers so each part can move (spec 009): wings flap, eyelids blink,
 * the lower beak talks, the whole bird hops. Moods are CSS on the parent `.kukoos[data-mood]`
 * (src/ui/kukoos.css). Round, chubby, sunset orange with purple wings: never owl-like, never green.
 */
export function KukoosArt({ size = 160, helmet = false, className }: KukoosArtProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={helmet ? 'Kukoos the bird in a space helmet' : 'Kukoos the bird'}
      className={['kk', className].filter(Boolean).join(' ')}
    >
      <g className="kk__all">
        <path
          className="kk__crest"
          d="M92 38c-6-18 4-30 14-30-2 10 4 14 10 10 0 12-8 22-24 20z"
          fill="var(--mq-kukoos-crest)"
        />
        <g className="kk__feet">
          <rect x="76" y="168" width="14" height="18" rx="7" fill="var(--mq-kukoos-beak)" />
          <rect x="110" y="168" width="14" height="18" rx="7" fill="var(--mq-kukoos-beak)" />
        </g>
        <g className="kk__wing kk__wing--l">
          <ellipse
            cx="34"
            cy="118"
            rx="18"
            ry="32"
            transform="rotate(18 34 118)"
            fill="var(--mq-kukoos-wing)"
          />
        </g>
        <g className="kk__wing kk__wing--r">
          <ellipse
            cx="166"
            cy="118"
            rx="18"
            ry="32"
            transform="rotate(-18 166 118)"
            fill="var(--mq-kukoos-wing)"
          />
        </g>
        <ellipse cx="100" cy="108" rx="70" ry="68" fill="var(--mq-kukoos-body)" />
        <ellipse
          cx="100"
          cy="124"
          rx="64"
          ry="48"
          fill="var(--mq-kukoos-body-shade)"
          opacity="0.35"
        />
        <ellipse cx="100" cy="132" rx="42" ry="38" fill="var(--mq-kukoos-belly)" />

        <g className="kk__eyes">
          <circle cx="76" cy="90" r="20" fill="var(--mq-kukoos-eye)" />
          <circle cx="124" cy="90" r="20" fill="var(--mq-kukoos-eye)" />
          <g className="kk__pupils">
            <circle cx="80" cy="93" r="10" fill="var(--mq-kukoos-pupil)" />
            <circle cx="120" cy="93" r="10" fill="var(--mq-kukoos-pupil)" />
            <circle cx="84" cy="88" r="3.5" fill="var(--mq-kukoos-eye)" />
            <circle cx="124" cy="88" r="3.5" fill="var(--mq-kukoos-eye)" />
          </g>
          {/* eyelids: closed for a blink, and while asleep */}
          <ellipse
            className="kk__lid"
            cx="76"
            cy="90"
            rx="21"
            ry="21"
            fill="var(--mq-kukoos-body)"
          />
          <ellipse
            className="kk__lid"
            cx="124"
            cy="90"
            rx="21"
            ry="21"
            fill="var(--mq-kukoos-body)"
          />
          <g className="kk__sleepy" fill="none" stroke="var(--mq-kukoos-pupil)" strokeWidth="4">
            <path d="M62 94q14 10 28 0" strokeLinecap="round" />
            <path d="M110 94q14 10 28 0" strokeLinecap="round" />
          </g>
        </g>

        <ellipse cx="56" cy="116" rx="9" ry="6" fill="var(--mq-kukoos-cheek)" opacity="0.8" />
        <ellipse cx="144" cy="116" rx="9" ry="6" fill="var(--mq-kukoos-cheek)" opacity="0.8" />

        <path className="kk__jaw" d="M92 116h16l-8 10z" fill="var(--mq-sun-lip)" />
        <path className="kk__beak" d="M88 108h24l-12 12z" fill="var(--mq-kukoos-beak)" />

        {helmet && (
          <g className="kk__helmet" data-testid="kukoos-helmet">
            <circle
              cx="100"
              cy="104"
              r="92"
              fill="var(--mq-sky-tint)"
              fillOpacity="0.22"
              stroke="var(--mq-sky)"
              strokeWidth="6"
            />
            <path
              d="M48 56q22-30 60-34"
              fill="none"
              stroke="var(--mq-on-strong)"
              strokeOpacity="0.7"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </g>
        )}
      </g>
    </svg>
  )
}
