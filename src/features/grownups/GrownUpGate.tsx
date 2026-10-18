import { type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useRepos } from '@/data'
import { Button3D, Keypad } from '@/ui'
import {
  GrownUpGateContext,
  makeRecoveryQuestion,
  MAX_PIN_TRIES,
  PIN_COOLDOWN_MS,
  PIN_LENGTH,
  useGrownUpGate,
} from './gate'

export function GrownUpGateProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  return (
    <GrownUpGateContext
      value={{ unlocked, unlock: () => setUnlocked(true), lock: () => setUnlocked(false) }}
    >
      {children}
    </GrownUpGateContext>
  )
}

type Mode = 'loading' | 'create' | 'confirm' | 'enter' | 'forgot'

const TITLES: Record<Exclude<Mode, 'loading'>, string> = {
  create: 'Create a grown-up PIN',
  confirm: 'Type the PIN again',
  enter: 'Enter the grown-up PIN',
  forgot: 'Forgot the PIN?',
}

function PinDots({ filled }: { filled: number }) {
  return (
    <div className="pin-dots" role="img" aria-label={`${filled} of ${PIN_LENGTH} digits entered`}>
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        <span key={i} className={`pin-dot${i < filled ? ' pin-dot--on' : ''}`} />
      ))}
    </div>
  )
}

/**
 * The grown-ups lock (spec 011 AC2–AC4): create a 4-digit PIN the first time, then enter
 * it on a big pad. 5 wrong tries pause entry for 30 seconds. "Forgot PIN?" asks a
 * 2-digit × 2-digit question and then sets a new PIN; progress is never touched.
 */
function PinGateScreen({ now = Date.now }: { now?: () => number }) {
  const repos = useRepos()
  const { unlock } = useGrownUpGate()
  const [mode, setMode] = useState<Mode>('loading')
  const [digits, setDigits] = useState('')
  const [first, setFirst] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [tries, setTries] = useState(0)
  const [pausedUntil, setPausedUntil] = useState(0)
  const [clock, setClock] = useState(now)
  const [question, setQuestion] = useState(() => makeRecoveryQuestion())

  useEffect(() => {
    let alive = true
    void repos.device.hasPin().then((has) => {
      if (alive) setMode(has ? 'enter' : 'create')
    })
    return () => {
      alive = false
    }
  }, [repos])

  const paused = clock < pausedUntil
  useEffect(() => {
    if (!paused) return
    const id = window.setInterval(() => setClock(now()), 1000)
    return () => window.clearInterval(id)
  }, [paused, now])

  const submitPin = async (pin: string) => {
    setDigits('')
    if (mode === 'create') {
      setFirst(pin)
      setMessage(null)
      setMode('confirm')
      return
    }
    if (mode === 'confirm') {
      if (pin !== first) {
        setFirst('')
        setMessage("Those PINs didn't match. Let's start again.")
        setMode('create')
        return
      }
      await repos.device.setPin(pin)
      unlock()
      return
    }
    if (await repos.device.checkPin(pin)) {
      unlock()
      return
    }
    const next = tries + 1
    if (next >= MAX_PIN_TRIES) {
      setTries(0)
      setPausedUntil(now() + PIN_COOLDOWN_MS)
      setClock(now())
      setMessage(null)
    } else {
      setTries(next)
      setMessage("That's not it. Try again.")
    }
  }

  const onDigit = (d: number) => {
    if (paused) return
    const limit = mode === 'forgot' ? 4 : PIN_LENGTH
    const value = (digits + String(d)).slice(0, limit)
    setDigits(value)
    if (mode !== 'forgot' && value.length === PIN_LENGTH) void submitPin(value)
  }

  const checkRecovery = () => {
    if (Number(digits) === question.answer) {
      setMessage('Right! Now choose a new PIN.')
      setDigits('')
      setMode('create')
    } else {
      setMessage('Not quite. Here is a new one.')
      setDigits('')
      setQuestion(makeRecoveryQuestion())
    }
  }

  if (mode === 'loading') return null
  const secondsLeft = Math.ceil((pausedUntil - clock) / 1000)

  return (
    <main className="screen grownup">
      <div className="grownup__inner">
        <header className="flex items-center gap-3">
          <Link to="/" className="btn3d btn3d--ghost btn3d--md icon-btn" aria-label="Back to map">
            ←
          </Link>
          <h1 className="grownup__title">Grown-ups only</h1>
        </header>
        <section className="grownup__card pin-card" aria-label="Grown-up check">
          <h2>{TITLES[mode]}</h2>
          {mode === 'create' && (
            <p>Pick 4 digits that only grown-ups know. You&apos;ll need it to open settings.</p>
          )}
          {mode === 'forgot' ? (
            <>
              <p className="pin-question num">
                What is {question.a} × {question.b}?
              </p>
              <output className="pin-answer num" aria-label="Your answer">
                {digits || '?'}
              </output>
            </>
          ) : (
            <PinDots filled={digits.length} />
          )}
          <p className="pin-message" role="status" aria-live="polite">
            {paused ? `Too many tries. Wait ${secondsLeft} seconds.` : message}
          </p>
          <Keypad
            onDigit={onDigit}
            onBackspace={() => setDigits((v) => v.slice(0, -1))}
            disabled={paused}
          />
          {mode === 'forgot' && (
            <Button3D
              variant="primary"
              size="md"
              block
              disabled={digits.length === 0}
              onClick={checkRecovery}
            >
              Check
            </Button3D>
          )}
          {mode === 'enter' && (
            <button
              type="button"
              className="pin-link"
              onClick={() => {
                setMode('forgot')
                setDigits('')
                setMessage(null)
              }}
            >
              Forgot PIN?
            </button>
          )}
        </section>
      </div>
    </main>
  )
}

/** Shows the PIN gate until a grown-up has unlocked it this visit. */
export function RequireGrownUp({ children }: { children: ReactNode }) {
  const { unlocked } = useGrownUpGate()
  return unlocked ? children : <PinGateScreen />
}
