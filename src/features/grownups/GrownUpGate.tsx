import { type ReactNode, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button3D } from '@/ui'
import { GrownUpGateContext, makeGateQuestion, useGrownUpGate } from './gate'

export function GrownUpGateProvider({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false)
  return (
    <GrownUpGateContext value={{ unlocked, unlock: () => setUnlocked(true) }}>
      {children}
    </GrownUpGateContext>
  )
}

/**
 * Grown-up check (spec 007 AC8): a multiplication question with 4 choices. Right → the
 * grown-ups area for this visit; wrong → back to the map. A PIN replaces this in F11.
 */
function GateQuestionScreen() {
  const { unlock } = useGrownUpGate()
  const navigate = useNavigate()
  const [q] = useState(() => makeGateQuestion())
  return (
    <main className="screen grownup">
      <div className="grownup__inner">
        <header className="flex items-center gap-3">
          <Link to="/" className="btn3d btn3d--ghost btn3d--md icon-btn" aria-label="Back to map">
            ←
          </Link>
          <h1 className="grownup__title">Grown-ups only</h1>
        </header>
        <section className="grownup__card" aria-label="Grown-up check">
          <h2>
            What is {q.a} × {q.b}?
          </h2>
          <p>Answer to open settings and backups.</p>
          <div className="gate-choices">
            {q.choices.map((c) => (
              <Button3D
                key={c}
                variant="ghost"
                size="md"
                onClick={() => (c === q.answer ? unlock() : navigate('/'))}
              >
                {c}
              </Button3D>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

/** Shows the gate until a grown-up has answered it this visit. */
export function RequireGrownUp({ children }: { children: ReactNode }) {
  const { unlocked } = useGrownUpGate()
  return unlocked ? children : <GateQuestionScreen />
}
