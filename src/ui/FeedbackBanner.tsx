import type { ReactNode } from 'react'
import { Button3D } from './Button3D'
import { useAutoFocus } from './useAutoFocus'

export type BannerVariant = 'correct' | 'notYet' | 'solution'

interface FeedbackBannerProps {
  variant: BannerVariant
  title: string
  body?: string
  actionLabel: string
  onAction: () => void
  secondary?: { label: string; onClick: () => void }
  children?: ReactNode
}

const ICON: Record<BannerVariant, string> = { correct: '✓', notYet: '↺', solution: '💡' }

/** Bottom sheet that slides over the CHECK area after an answer. */
export function FeedbackBanner({
  variant,
  title,
  body,
  actionLabel,
  onAction,
  secondary,
  children,
}: FeedbackBannerProps) {
  const actionRef = useAutoFocus<HTMLButtonElement>(`${variant}:${title}`)
  return (
    <section className={`banner banner--${variant}`} aria-label={title} data-testid="feedback">
      <div className="banner__inner">
        <h2 className="banner__title">
          <span className="banner__icon" aria-hidden="true">
            {ICON[variant]}
          </span>
          {title}
        </h2>
        {body && <p className="banner__body">{body}</p>}
        {children}
        {secondary && (
          <Button3D variant="ghost" size="lg" onClick={secondary.onClick}>
            {secondary.label}
          </Button3D>
        )}
        <Button3D
          ref={actionRef}
          variant={variant === 'correct' ? 'success' : 'danger-soft'}
          size="xl"
          block
          onClick={onAction}
        >
          {actionLabel}
        </Button3D>
      </div>
    </section>
  )
}
