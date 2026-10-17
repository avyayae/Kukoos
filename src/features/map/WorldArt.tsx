import type { WorldId } from '@/domain'

/**
 * Flat silhouettes that make each band feel like a place (mathquest-ui illustration rules:
 * flat shapes, darker shade of the band, no outlines). Purely decorative.
 */
export function WorldArt({ worldId }: { worldId: WorldId }) {
  switch (worldId) {
    case 'jungle':
      return (
        <svg className="world-art world-art--left" viewBox="0 0 120 160" aria-hidden="true">
          <path
            d="M20 160 C 18 110, 30 70, 40 40"
            stroke="var(--mq-map-jungle-deep)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M40 40 C 10 30, 0 50, 0 60 C 20 50, 30 48, 40 40Z M40 40 C 70 20, 95 35, 100 48 C 75 42, 60 40, 40 40Z M40 40 C 45 10, 70 0, 82 6 C 62 16, 52 26, 40 40Z"
            fill="var(--mq-map-jungle-deep)"
          />
        </svg>
      )
    case 'savanna':
      return (
        <svg className="world-art world-art--right" viewBox="0 0 160 120" aria-hidden="true">
          <path
            d="M80 120 V 60"
            stroke="var(--mq-map-savanna-deep)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <ellipse cx="80" cy="52" rx="70" ry="18" fill="var(--mq-map-savanna-deep)" />
          <path
            d="M0 120 q 10 -30 20 0 q 10 -24 20 0 q 10 -30 20 0Z"
            fill="var(--mq-map-savanna-deep)"
          />
        </svg>
      )
    case 'ocean':
      return (
        <svg
          className="world-art world-art--wide"
          viewBox="0 0 360 40"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 20 Q 30 0 60 20 T 120 20 T 180 20 T 240 20 T 300 20 T 360 20 V 40 H 0Z"
            fill="var(--mq-map-ocean-deep)"
          />
        </svg>
      )
    case 'moon':
      return (
        <svg className="world-art world-art--right" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="44" fill="var(--mq-surface-2)" opacity="0.9" />
          <circle cx="44" cy="48" r="9" fill="var(--mq-map-twilight-deep)" opacity="0.35" />
          <circle cx="72" cy="74" r="12" fill="var(--mq-map-twilight-deep)" opacity="0.35" />
          <circle cx="76" cy="40" r="5" fill="var(--mq-map-twilight-deep)" opacity="0.35" />
        </svg>
      )
    case 'mars':
      return (
        <svg className="world-art world-art--left" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="40" fill="var(--mq-danger)" />
          <ellipse cx="48" cy="52" rx="10" ry="6" fill="var(--mq-danger-lip)" />
          <ellipse cx="72" cy="72" rx="12" ry="7" fill="var(--mq-danger-lip)" />
        </svg>
      )
  }
}
