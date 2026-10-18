import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AVATAR_OPTIONS, DEFAULT_AVATAR } from '@/domain'
import { AvatarArt } from '@/ui/AvatarArt'

describe('AvatarArt (AC2)', () => {
  it('renders every hair style × hat × extra with a spoken description', () => {
    for (const hairStyle of AVATAR_OPTIONS.hairStyle) {
      for (const hat of AVATAR_OPTIONS.hat) {
        for (const extra of AVATAR_OPTIONS.extra) {
          const { unmount } = render(
            <AvatarArt avatar={{ ...DEFAULT_AVATAR, hairStyle, hat, extra }} size={48} />,
          )
          const img = screen.getByRole('img')
          expect(img.getAttribute('aria-label')).toMatch(/^Explorer with /)
          // Only token colors: no raw hex in any fill or stroke.
          expect(img.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i)
          unmount()
        }
      }
    }
  })

  it('every skin, hair color, eye and outfit option renders', () => {
    for (const category of ['skin', 'hairColor', 'eyes', 'outfit'] as const) {
      for (const value of AVATAR_OPTIONS[category]) {
        const { unmount } = render(<AvatarArt avatar={{ ...DEFAULT_AVATAR, [category]: value }} />)
        expect(screen.getByTestId('avatar-art')).toBeInTheDocument()
        unmount()
      }
    }
  })

  it('decorative copies are hidden from screen readers; the helmet is drawn', () => {
    render(<AvatarArt avatar={{ ...DEFAULT_AVATAR, hat: 'helmet' }} decorative />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByTestId('avatar-helmet')).toBeInTheDocument()
  })
})
