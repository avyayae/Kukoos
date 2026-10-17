interface KukoosPlaceholderProps {
  /** Rendered width/height in px. */
  size?: number
  className?: string
}

/**
 * Static placeholder for the Kukoos mascot until the Rive version lands (F09).
 * Round, chubby, sunset-orange body, purple wings and crest; colors come from tokens.
 */
export function KukoosPlaceholder({ size = 160, className }: KukoosPlaceholderProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Kukoos the bird"
      className={className}
    >
      {/* crest */}
      <path
        d="M92 38c-6-18 4-30 14-30-2 10 4 14 10 10 0 12-8 22-24 20z"
        fill="var(--mq-kukoos-crest)"
      />
      {/* feet */}
      <rect x="76" y="168" width="14" height="18" rx="7" fill="var(--mq-kukoos-beak)" />
      <rect x="110" y="168" width="14" height="18" rx="7" fill="var(--mq-kukoos-beak)" />
      {/* body */}
      <ellipse cx="100" cy="108" rx="70" ry="68" fill="var(--mq-kukoos-body)" />
      <ellipse
        cx="100"
        cy="122"
        rx="70"
        ry="54"
        fill="var(--mq-kukoos-body-shade)"
        opacity="0.35"
      />
      {/* belly */}
      <ellipse cx="100" cy="132" rx="42" ry="38" fill="var(--mq-kukoos-belly)" />
      {/* wings */}
      <ellipse
        cx="34"
        cy="118"
        rx="18"
        ry="32"
        transform="rotate(18 34 118)"
        fill="var(--mq-kukoos-wing)"
      />
      <ellipse
        cx="166"
        cy="118"
        rx="18"
        ry="32"
        transform="rotate(-18 166 118)"
        fill="var(--mq-kukoos-wing)"
      />
      {/* eyes */}
      <circle cx="76" cy="90" r="20" fill="var(--mq-kukoos-eye)" />
      <circle cx="124" cy="90" r="20" fill="var(--mq-kukoos-eye)" />
      <circle cx="80" cy="93" r="10" fill="var(--mq-kukoos-pupil)" />
      <circle cx="120" cy="93" r="10" fill="var(--mq-kukoos-pupil)" />
      <circle cx="84" cy="88" r="3.5" fill="var(--mq-kukoos-eye)" />
      <circle cx="124" cy="88" r="3.5" fill="var(--mq-kukoos-eye)" />
      {/* cheeks */}
      <ellipse cx="56" cy="116" rx="9" ry="6" fill="var(--mq-kukoos-cheek)" opacity="0.8" />
      <ellipse cx="144" cy="116" rx="9" ry="6" fill="var(--mq-kukoos-cheek)" opacity="0.8" />
      {/* beak */}
      <path d="M88 110h24l-12 16z" fill="var(--mq-kukoos-beak)" />
    </svg>
  )
}
