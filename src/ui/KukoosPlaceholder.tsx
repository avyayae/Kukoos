import { KukoosArt } from './KukoosArt'

interface KukoosPlaceholderProps {
  /** Rendered width/height in px. */
  size?: number
  className?: string
}

/** Kukoos without any mood animation (static uses, e.g. the app icon and empty states). */
export function KukoosPlaceholder({ size = 160, className }: KukoosPlaceholderProps) {
  return <KukoosArt size={size} {...(className ? { className } : {})} />
}
