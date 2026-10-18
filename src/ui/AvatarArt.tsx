import { type Avatar, avatarName } from '@/domain'
import { AVATAR_HAIR as HAIR, AVATAR_OUTFIT as OUTFIT, AVATAR_SKIN as SKIN } from './avatarPalette'

const INK = 'var(--mq-av-hair-black)'
const HEAD = { cx: 100, cy: 96, r: 42 }

/** Circles around the top of the head for curly hair (back layer bigger, front layer smaller). */
function curls(radius: number, r: number, from: number, to: number, step: number) {
  const out: { x: number; y: number; r: number }[] = []
  for (let a = from; a <= to; a += step) {
    const rad = (a * Math.PI) / 180
    out.push({ x: HEAD.cx + radius * Math.cos(rad), y: HEAD.cy - 4 + radius * Math.sin(rad), r })
  }
  return out
}
const CURLS_BACK = curls(44, 16, 150, 390, 20)
const CURLS_FRONT = curls(36, 12, 200, 340, 20)

function HairBack({ avatar, color }: { avatar: Avatar; color: string }) {
  switch (avatar.hairStyle) {
    case 'bob':
      return (
        <path d="M54 100C52 60 74 44 100 44s48 16 46 56l2 36q0 8-8 8H60q-8 0-8-8z" fill={color} />
      )
    case 'long':
      return (
        <path d="M52 100C50 58 74 42 100 42s50 16 48 58l6 80q-26 10-54 10t-54-10z" fill={color} />
      )
    case 'ponytail':
      return (
        <g>
          <ellipse cx="148" cy="92" rx="14" ry="32" transform="rotate(18 148 92)" fill={color} />
          <circle cx="140" cy="64" r="6" fill="var(--mq-secondary)" />
        </g>
      )
    case 'buns':
      return (
        <g fill={color}>
          <circle cx="64" cy="56" r="17" />
          <circle cx="136" cy="56" r="17" />
        </g>
      )
    case 'curly':
      return (
        <g fill={color}>
          {CURLS_BACK.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={c.r} />
          ))}
        </g>
      )
    case 'short':
      return null
  }
}

function HairFront({ avatar, color }: { avatar: Avatar; color: string }) {
  switch (avatar.hairStyle) {
    case 'short':
      return (
        <path
          d="M58 92C56 62 76 48 100 48s44 14 42 44c-8-12-22-20-38-18-12 2-24-4-34 4-6 4-10 10-12 14z"
          fill={color}
        />
      )
    case 'bob':
    case 'long':
      return (
        <path
          d="M57 96c-1-32 19-46 43-46s44 14 43 46c-11-14-25-20-43-18-18-2-32 4-43 18z"
          fill={color}
        />
      )
    case 'ponytail':
    case 'buns':
      return (
        <path
          d="M58 90c0-28 20-40 42-40s42 12 42 40c-12-16-26-22-42-22s-30 6-42 22z"
          fill={color}
        />
      )
    case 'curly':
      return (
        <g fill={color}>
          {CURLS_FRONT.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={c.r} />
          ))}
        </g>
      )
  }
}

function Eyes({ eyes }: { eyes: Avatar['eyes'] }) {
  if (eyes === 'smiley') {
    return (
      <g fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round">
        <path d="M77 102q7-8 14 0" />
        <path d="M109 102q7-8 14 0" />
      </g>
    )
  }
  const r = eyes === 'sparkly' ? 8 : 6
  return (
    <g>
      {[84, 116].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="100" rx={r} ry={eyes === 'sparkly' ? 8 : 8} fill={INK} />
          <circle cx={x + 2} cy="97" r={eyes === 'sparkly' ? 3 : 2} fill="var(--mq-on-strong)" />
          {eyes === 'sparkly' && <circle cx={x - 3} cy="103" r="1.5" fill="var(--mq-on-strong)" />}
        </g>
      ))}
    </g>
  )
}

function Hat({ hat, outfit }: { hat: Avatar['hat']; outfit: string }) {
  switch (hat) {
    case 'beanie':
      return (
        <g>
          <path d="M56 86c0-34 20-46 44-46s44 12 44 46z" fill="var(--mq-secondary)" />
          <rect x="52" y="78" width="96" height="16" rx="8" fill="var(--mq-secondary-lip)" />
          <circle cx="100" cy="38" r="10" fill="var(--mq-on-strong)" />
        </g>
      )
    case 'safari':
      return (
        <g>
          <ellipse cx="100" cy="72" rx="64" ry="12" fill="var(--mq-av-khaki-dark)" />
          <path d="M66 72c0-26 16-36 34-36s34 10 34 36z" fill="var(--mq-av-khaki)" />
          <rect x="66" y="62" width="68" height="8" fill="var(--mq-av-khaki-dark)" />
        </g>
      )
    case 'bunny':
      return (
        <g>
          {[
            { x: 82, rot: -10 },
            { x: 118, rot: 10 },
          ].map((e) => (
            <g key={e.x} transform={`rotate(${e.rot} ${e.x} 40)`}>
              <ellipse
                cx={e.x}
                cy="26"
                rx="10"
                ry="26"
                fill="var(--mq-on-strong)"
                stroke="var(--mq-border)"
                strokeWidth="2"
              />
              <ellipse cx={e.x} cy="28" rx="5" ry="17" fill="var(--mq-kukoos-cheek)" />
            </g>
          ))}
          <path
            d="M60 72c6-18 22-26 40-26s34 8 40 26"
            fill="none"
            stroke={outfit}
            strokeWidth="6"
            strokeLinecap="round"
          />
        </g>
      )
    case 'crown':
      return (
        <g>
          <path
            d="M66 64l6-28 14 16 14-22 14 22 14-16 6 28z"
            fill="var(--mq-sun)"
            stroke="var(--mq-sun-lip)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="100" cy="54" r="4" fill="var(--mq-danger)" />
          <circle cx="80" cy="57" r="3" fill="var(--mq-sky)" />
          <circle cx="120" cy="57" r="3" fill="var(--mq-sky)" />
        </g>
      )
    case 'helmet':
    case 'none':
      return null
  }
}

interface AvatarArtProps {
  avatar: Avatar
  size?: number
  className?: string
  /** Decorative copies (e.g. next to a name that's already read) can hide from screen readers. */
  decorative?: boolean
}

/**
 * The kid's explorer (spec 010): an original layered SVG, drawn back to front:
 * cape/jetpack/back hair → shoulders → neck → head → hair → face → glasses → hat → helmet.
 */
export function AvatarArt({ avatar, size = 120, className, decorative = false }: AvatarArtProps) {
  const skin = SKIN[avatar.skin]
  const hair = HAIR[avatar.hairColor]
  const outfit = OUTFIT[avatar.outfit]
  const label = avatarName(avatar)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={['avatar-art', className].filter(Boolean).join(' ')}
      data-testid="avatar-art"
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
    >
      {avatar.extra === 'cape' && <path d="M24 200l28-50h96l28 50z" fill="var(--mq-primary-lip)" />}
      {avatar.extra === 'jetpack' && (
        <g fill="var(--mq-av-metal)" stroke="var(--mq-border)" strokeWidth="2">
          <rect x="40" y="116" width="22" height="60" rx="11" />
          <rect x="138" y="116" width="22" height="60" rx="11" />
        </g>
      )}
      <HairBack avatar={avatar} color={hair} />

      <path d="M34 200c0-34 26-50 66-50s66 16 66 50z" fill={outfit} />
      <path d="M34 200c0-34 26-50 66-50s66 16 66 50z" fill={INK} opacity="0.08" />
      <rect x="88" y="128" width="24" height="26" rx="8" fill={skin} />
      <path d="M84 150q16 14 32 0" fill={skin} />

      <circle cx="58" cy="100" r="9" fill={skin} />
      <circle cx="142" cy="100" r="9" fill={skin} />
      <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={skin} />
      <HairFront avatar={avatar} color={hair} />

      <Eyes eyes={avatar.eyes} />
      <ellipse cx="72" cy="114" rx="7" ry="4" fill="var(--mq-kukoos-cheek)" opacity="0.55" />
      <ellipse cx="128" cy="114" rx="7" ry="4" fill="var(--mq-kukoos-cheek)" opacity="0.55" />
      <path d="M90 118q10 10 20 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />

      {avatar.extra === 'glasses' && (
        <g fill="var(--mq-on-strong)" fillOpacity="0.15" stroke={INK} strokeWidth="3">
          <circle cx="84" cy="100" r="12" />
          <circle cx="116" cy="100" r="12" />
          <path d="M96 100h8" fill="none" />
        </g>
      )}
      {avatar.extra === 'bowtie' && (
        <g fill="var(--mq-sun)" stroke="var(--mq-sun-lip)" strokeWidth="2" strokeLinejoin="round">
          <path d="M100 156l-16-8v16z" />
          <path d="M100 156l16-8v16z" />
          <circle cx="100" cy="156" r="4" />
        </g>
      )}
      {avatar.extra === 'cape' && (
        <path
          d="M100 150l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"
          fill="var(--mq-sun)"
          stroke="var(--mq-sun-lip)"
          strokeWidth="1.5"
        />
      )}

      <Hat hat={avatar.hat} outfit={outfit} />
      {avatar.hat === 'helmet' && (
        <g data-testid="avatar-helmet">
          <rect x="56" y="156" width="88" height="14" rx="7" fill="var(--mq-sky-lip)" />
          <circle
            cx="100"
            cy="100"
            r="68"
            fill="var(--mq-sky-tint)"
            fillOpacity="0.2"
            stroke="var(--mq-sky)"
            strokeWidth="6"
          />
          <path
            d="M52 70q12-26 40-34"
            fill="none"
            stroke="var(--mq-on-strong)"
            strokeOpacity="0.7"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  )
}
