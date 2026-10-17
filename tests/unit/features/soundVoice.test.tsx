import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_AUDIO } from '@/audio/prefs'
import { createDexieRepositories, createNullRepositories } from '@/data'
import { SoundVoiceSection } from '@/features/grownups/SoundVoiceSection'
import { useReadAloud } from '@/ui'
import { freshDb } from '../data/testDb'
import { withData } from '../withData'

const spoken: { text: string; voice?: { voiceURI: string } | null; rate: number }[] = []
const VOICES = [
  {
    name: 'Microsoft David - English (United States)',
    lang: 'en-US',
    voiceURI: 'david',
    localService: true,
  },
  {
    name: 'Microsoft Aria Online (Natural) - English (United States)',
    lang: 'en-US',
    voiceURI: 'aria',
    localService: false,
  },
]

beforeEach(() => {
  spoken.length = 0
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speak: (u: (typeof spoken)[number]) => spoken.push(u),
      cancel: vi.fn(),
      getVoices: () => VOICES,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    value: class {
      text: string
      voice: unknown = null
      rate = 1
      lang = ''
      constructor(t: string) {
        this.text = t
      }
    },
  })
})
afterEach(() => {
  Reflect.deleteProperty(window, 'speechSynthesis')
  Reflect.deleteProperty(window, 'SpeechSynthesisUtterance')
})

function ReadAloudProbe() {
  const { readAloud } = useReadAloud()
  return <p data-testid="read-aloud">{String(readAloud)}</p>
}

describe('sound & voice settings (AC8, AC10)', () => {
  it('lists the best voice first, tests it, and saves choices for this device', async () => {
    const db = freshDb()
    const repos = createDexieRepositories(db)
    render(withData(<SoundVoiceSection />, repos))
    const select = screen.getByRole('combobox', { name: 'Voice' })
    expect(select).toHaveDisplayValue('Best on this device: Aria (natural)')

    await userEvent.click(screen.getByRole('button', { name: 'Test voice' }))
    expect(spoken.at(-1)?.voice?.voiceURI).toBe('aria')

    await userEvent.selectOptions(select, 'david')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Sound effects' }))
    await waitFor(async () =>
      expect(await repos.device.audio()).toMatchObject({ voiceURI: 'david', soundOn: false }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Test voice' }))
    expect(spoken.at(-1)?.voice?.voiceURI).toBe('david')
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeDisabled()
  })

  it('read-aloud is saved and comes back after a reload', async () => {
    const db = freshDb()
    const first = render(
      withData(
        <>
          <SoundVoiceSection />
          <ReadAloudProbe />
        </>,
        createDexieRepositories(db),
      ),
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Read questions aloud' }))
    expect(screen.getByTestId('read-aloud')).toHaveTextContent('false')
    first.unmount()

    render(withData(<ReadAloudProbe />, createDexieRepositories(db)))
    await waitFor(() => expect(screen.getByTestId('read-aloud')).toHaveTextContent('false'))
  })

  it('defaults, and the null store keeps settings in memory', async () => {
    const repos = createNullRepositories()
    expect(await repos.device.audio()).toEqual(DEFAULT_AUDIO)
    await repos.device.setAudio({ ...DEFAULT_AUDIO, volume: 0.3 })
    expect((await repos.device.audio()).volume).toBe(0.3)
  })
})
