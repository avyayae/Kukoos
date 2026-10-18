import type { Avatar } from '@/domain'

/** Avatar colors as token references (spec 010). */
export const AVATAR_SKIN: Record<Avatar['skin'], string> = {
  s1: 'var(--mq-av-skin-1)',
  s2: 'var(--mq-av-skin-2)',
  s3: 'var(--mq-av-skin-3)',
  s4: 'var(--mq-av-skin-4)',
  s5: 'var(--mq-av-skin-5)',
  s6: 'var(--mq-av-skin-6)',
}
export const AVATAR_HAIR: Record<Avatar['hairColor'], string> = {
  black: 'var(--mq-av-hair-black)',
  brown: 'var(--mq-av-hair-brown)',
  auburn: 'var(--mq-av-hair-auburn)',
  blonde: 'var(--mq-av-hair-blonde)',
  ginger: 'var(--mq-av-hair-ginger)',
  purple: 'var(--mq-av-hair-purple)',
}
export const AVATAR_OUTFIT: Record<Avatar['outfit'], string> = {
  purple: 'var(--mq-primary)',
  orange: 'var(--mq-secondary)',
  sky: 'var(--mq-sky)',
  green: 'var(--mq-success)',
  cyan: 'var(--mq-gem)',
  coral: 'var(--mq-danger)',
}
