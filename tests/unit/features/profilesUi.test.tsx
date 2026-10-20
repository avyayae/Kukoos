import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { speak } from '@/audio/tts'
import { DEFAULT_AVATAR } from '@/domain'
import { AvatarBuilder } from '@/features/profiles/AvatarBuilder'
import { cleanNickname } from '@/features/profiles/copy'
import { testStore, withData } from '../withData'
import { renderAt, renderGrownUp } from './nav'

vi.mock('@/audio/tts', async (orig) => ({
  ...(await orig<typeof import('@/audio/tts')>()),
  speak: vi.fn(),
}))

const fresh = { level: 1, badges: new Set<string>(), bossesBeaten: 0 }

describe('avatar builder (AC3)', () => {
  it('tiles update the preview; locked items say how to earn them; Save returns the look', async () => {
    const onSave = vi.fn()
    render(
      withData(
        <AvatarBuilder
          initial={DEFAULT_AVATAR}
          unlocks={fresh}
          saveLabel="That's me!"
          onSave={onSave}
        />,
      ),
    )
    const preview = () => screen.getAllByRole('img')[0] as HTMLElement
    expect(preview()).toHaveAccessibleName('Explorer with curly hair')

    await userEvent.click(screen.getByRole('tab', { name: 'Hat' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Space helmet' }))
    expect(preview()).toHaveAccessibleName('Explorer with curly hair and a space helmet')
    expect(screen.getByRole('radio', { name: 'Space helmet' })).toBeChecked()

    await userEvent.click(screen.getByRole('radio', { name: 'Crown, locked' }))
    expect(screen.getByRole('status')).toHaveTextContent('Crown: not yet. Earn it: Get to level 5.')
    expect(speak).toHaveBeenLastCalledWith('Crown: not yet. Earn it: Get to level 5.')
    expect(preview()).toHaveAccessibleName('Explorer with curly hair and a space helmet')

    await userEvent.click(screen.getByRole('button', { name: "That's me!" }))
    expect(onSave).toHaveBeenCalledWith({ ...DEFAULT_AVATAR, hat: 'helmet' })
  })

  it('"Surprise me!" picks a new unlocked look', async () => {
    const onSave = vi.fn()
    render(
      withData(
        <AvatarBuilder
          initial={DEFAULT_AVATAR}
          unlocks={fresh}
          saveLabel="Save"
          onSave={onSave}
          seed={() => 12345}
        />,
      ),
    )
    await userEvent.click(screen.getByRole('button', { name: /Surprise me/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const look = onSave.mock.calls[0]?.[0]
    expect(look).not.toEqual(DEFAULT_AVATAR)
    expect(look.hat).not.toBe('crown')
  })

  it('nicknames are 1–12 letters', () => {
    expect(cleanNickname('  Riya  ')).toBe('Riya')
    expect(cleanNickname('Mary Jane')).toBe('Mary Jane')
    expect(cleanNickname('')).toBeNull()
    expect(cleanNickname('R2D2')).toBeNull()
    expect(cleanNickname('Abcdefghijklm')).toBeNull()
  })
})

describe('first run (AC4)', () => {
  it('welcome → name → explorer → map, saved on the profile', async () => {
    const { repos } = testStore({ onboarded: false })
    renderAt('/', repos)
    expect(await screen.findByTestId('onboarding')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: "Let's go!" }))
    // What do you want to learn? (spec 013)
    await userEvent.click(screen.getByRole('button', { name: 'Math' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    const input = screen.getByRole('textbox', { name: 'Your explorer name' })
    await userEvent.clear(input)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Comet' }))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Extra' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Glasses' }))
    await userEvent.click(screen.getByRole('button', { name: "That's me!" }))

    expect(await screen.findByRole('heading', { name: 'Hi, Comet!' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Me, Comet' })).toBeInTheDocument()
    const [kid] = await repos.profiles.list()
    expect(kid).toMatchObject({
      nickname: 'Comet',
      avatar: { ...DEFAULT_AVATAR, extra: 'glasses' },
    })
  })
})

describe('profiles (AC6–AC8)', () => {
  it('with two kids, "Who\'s playing?" comes first and switches everything', async () => {
    const { repos } = testStore()
    const first = await repos.profiles.ensureCurrent()
    const maya = await repos.profiles.create({ nickname: 'Maya', grade: 3 })
    await repos.profiles.update(maya?.id ?? '', { avatar: { ...DEFAULT_AVATAR, hat: 'beanie' } })
    await repos.rewards.wallet(first?.id ?? '')

    const router = renderAt('/', repos)
    expect(await screen.findByRole('heading', { name: "Who's playing?" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: "I'm Maya" }))
    expect(await screen.findByRole('heading', { name: 'Hi, Maya!' })).toBeInTheDocument()
    expect((await repos.profiles.ensureCurrent())?.nickname).toBe('Maya')

    await userEvent.click(screen.getByRole('button', { name: 'Me, Maya' }))
    expect(router.state.location.pathname).toBe('/me')
    const me = await screen.findByTestId('me-screen')
    expect(within(me).getByText('Maya')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Switch player' }))
    expect(router.state.location.pathname).toBe('/who')
  })

  it('"Change my look" saves the new look and returns to Me', async () => {
    const { repos } = testStore()
    const router = renderAt('/me', repos)
    await userEvent.click(await screen.findByRole('button', { name: 'Change my look' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Hat' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Safari hat' }))
    await userEvent.click(screen.getByRole('button', { name: 'Looking great!' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/me'))
    expect((await repos.profiles.list())[0]?.avatar).toMatchObject({ hat: 'safari' })
  })

  it('grown-ups add, rename and remove kids (typed confirmation)', async () => {
    const { repos } = testStore()
    await repos.profiles.ensureCurrent()
    await renderGrownUp('/grown-ups', repos)
    const card = await screen.findByRole('region', { name: 'Profiles' })
    await userEvent.type(within(card).getByRole('textbox', { name: "New kid's nickname" }), 'Leo')
    await userEvent.click(within(card).getByRole('button', { name: 'Add kid' }))
    await waitFor(async () => expect(await repos.profiles.list()).toHaveLength(2))

    const leo = await screen.findByTestId('profile-Leo')
    const nick = within(leo).getByRole('textbox', { name: 'Nickname' })
    await userEvent.clear(nick)
    await userEvent.type(nick, 'Leon')
    await userEvent.click(within(leo).getByRole('button', { name: 'Save' }))
    await waitFor(async () =>
      expect((await repos.profiles.list()).map((p) => p.nickname)).toContain('Leon'),
    )

    await userEvent.click(
      within(await screen.findByTestId('profile-Leon')).getByRole('button', { name: 'Remove…' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Remove profile' })
    const remove = within(dialog).getByRole('button', { name: 'Remove Leon' })
    expect(remove).toBeDisabled()
    await userEvent.type(within(dialog).getByRole('textbox'), 'Leon')
    await userEvent.click(remove)
    await waitFor(async () => expect(await repos.profiles.list()).toHaveLength(1))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Removed Leon'))
  })
})
