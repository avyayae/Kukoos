import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadAloudProvider, useReadAloud, useSpeakOnTap } from '@/ui'

let spoken: string[] = []
beforeEach(() => {
  spoken = []
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      speak: (u: { text: string }) => spoken.push(u.text),
      cancel: vi.fn(),
      getVoices: () => [],
    },
    configurable: true,
  })
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    value: class {
      text: string
      constructor(t: string) {
        this.text = t
      }
    },
    configurable: true,
  })
})
afterEach(() => {
  Reflect.deleteProperty(window, 'speechSynthesis')
  Reflect.deleteProperty(window, 'SpeechSynthesisUtterance')
})

function Probe() {
  const say = useSpeakOnTap()
  const { readAloud, setReadAloud } = useReadAloud()
  return (
    <>
      <button type="button" onClick={() => say('Add within 20')}>
        node
      </button>
      <button type="button" onClick={() => setReadAloud(!readAloud)}>
        toggle
      </button>
    </>
  )
}

describe('tap-to-hear (AC6)', () => {
  it('speaks labels while read-aloud is on, and stays quiet when off', async () => {
    render(
      <ReadAloudProvider>
        <Probe />
      </ReadAloudProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'node' }))
    expect(spoken).toEqual(['Add within 20'])
    await userEvent.click(screen.getByRole('button', { name: 'toggle' }))
    await userEvent.click(screen.getByRole('button', { name: 'node' }))
    expect(spoken).toEqual(['Add within 20'])
  })

  it('needs the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<Probe />)).toThrow(/ReadAloudProvider/)
  })
})
