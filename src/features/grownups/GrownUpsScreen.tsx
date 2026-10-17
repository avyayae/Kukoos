import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { NO_STORAGE_MESSAGE, type TableName, useRepos, validateBackup } from '@/data'
import { Button3D, ConfirmSheet } from '@/ui'
import { backupFileName, downloadJson } from './download'
import { StartingPointSection } from './StartingPointSection'

type Status = { tone: 'ok' | 'error'; text: string } | null

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * Grown-ups screen: starting point (spec 006 AC10), download / restore a backup and see
 * whether the browser promised to keep the data (spec 004). Moves into the Parent zone in F11.
 */
export function GrownUpsScreen({ now = Date.now }: { now?: () => number }) {
  const repos = useRepos()
  const [counts, setCounts] = useState<Record<TableName, number> | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [status, setStatus] = useState<Status>(null)
  const [pending, setPending] = useState<unknown>(null)
  const [refresh, setRefresh] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    void Promise.all([repos.backup.counts(), repos.storage.isPersisted()]).then(([c, p]) => {
      if (!alive) return
      setCounts(c)
      setPersisted(p)
    })
    return () => {
      alive = false
    }
  }, [repos, refresh])

  const onExport = async () => {
    const file = await repos.backup.export()
    downloadJson(backupFileName(now()), file)
    setStatus({ tone: 'ok', text: 'Backup downloaded. Keep the file somewhere safe!' })
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    const text = await file.text()
    const checked = validateBackup(text)
    if (!checked.ok) {
      setStatus({ tone: 'error', text: checked.error })
      return
    }
    setPending(checked.file)
  }

  const onConfirmImport = async () => {
    const file = pending
    setPending(null)
    const result = await repos.backup.import(file)
    const n = result.ok ? result.counts.lessons : 0
    setStatus(
      result.ok
        ? { tone: 'ok', text: `Restored! ${n} ${n === 1 ? 'lesson is' : 'lessons are'} back.` }
        : { tone: 'error', text: result.error },
    )
    setRefresh((r) => r + 1)
  }

  return (
    <main className="screen grownup">
      <div className="grownup__inner">
        <header className="flex items-center gap-3">
          <Link to="/" className="btn3d btn3d--ghost btn3d--md icon-btn" aria-label="Back to map">
            ←
          </Link>
          <h1 className="grownup__title">Grown-ups</h1>
        </header>

        {!repos.available ? (
          <section className="grownup__card">
            <p>
              <strong>{NO_STORAGE_MESSAGE}</strong> Lessons still work, but nothing is kept after
              the page closes (for example in a private window).
            </p>
          </section>
        ) : (
          <>
            <StartingPointSection onDone={(text) => setStatus({ tone: 'ok', text })} />

            <section className="grownup__card" aria-label="All missions">
              <h2>All missions</h2>
              <p>Open any mission directly, including locked ones.</p>
              <Link to="/grown-ups/missions" className="btn3d btn3d--ghost btn3d--md">
                Show all missions
              </Link>
            </section>

            <section className="grownup__card" aria-label="Storage status">
              <p data-testid="persistence">
                {persisted
                  ? 'Saved for keeps ✓ The browser promised to keep this progress.'
                  : 'The browser may clear this, so back up!'}
              </p>
              {counts && (
                <p data-testid="counts">
                  {plural(counts.lessons, 'lesson')} and {plural(counts.attempts, 'answer')} saved
                  on this device.
                </p>
              )}
            </section>

            <section className="grownup__card" aria-label="Backup">
              <h2>Download a backup</h2>
              <p>Saves all progress to a file you can restore later or on another device.</p>
              <Button3D variant="primary" size="md" onClick={onExport}>
                Download backup
              </Button3D>
            </section>

            <section className="grownup__card" aria-label="Restore">
              <h2>Restore from a file</h2>
              <p>This replaces the progress on this device with the backup.</p>
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label="Backup file"
                data-testid="backup-file"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
              <Button3D variant="ghost" size="md" onClick={() => fileInput.current?.click()}>
                Choose backup file
              </Button3D>
            </section>
          </>
        )}

        <p
          role="status"
          aria-live="polite"
          className={status ? `grownup__status grownup__status--${status.tone}` : 'sr-only'}
        >
          {status?.text}
        </p>
      </div>

      <ConfirmSheet
        open={pending !== null}
        title="Replace progress on this device with the backup?"
        confirmLabel="Replace"
        cancelLabel="Keep current progress"
        onConfirm={() => void onConfirmImport()}
        onCancel={() => setPending(null)}
      />
    </main>
  )
}
