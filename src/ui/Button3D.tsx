import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

export type Button3DVariant = 'primary' | 'secondary' | 'sky' | 'success' | 'danger-soft' | 'ghost'
export type Button3DSize = 'md' | 'lg' | 'xl'

export interface Button3DProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Button3DVariant
  /** md = 48px (parent zone), lg = 56px (kid default), xl = 64px (CHECK / CONTINUE). */
  size?: Button3DSize
  /** Full-width button (lesson CHECK / CONTINUE). */
  block?: boolean
  loading?: boolean
  icon?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

/**
 * Chunky pressable button with a bottom "lip" (see mathquest-ui skill → components.md).
 * Styling lives in src/ui/index.css (.btn3d); this component only picks classes.
 */
export function Button3D({
  variant = 'primary',
  size = 'lg',
  block = false,
  loading = false,
  icon,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: Button3DProps) {
  const classes = [
    'btn3d',
    `btn3d--${variant}`,
    `btn3d--${size}`,
    block && 'btn3d--block',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="btn3d__spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}
