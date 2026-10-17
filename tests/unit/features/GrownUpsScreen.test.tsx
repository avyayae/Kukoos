import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKUP_ERRORS, createNullRepositories, type Repositories } from '@/data'
import { correctResponse, lessonReducer, startLesson } from '@/domain'
import { GrownUpsScreen } from '@/features/grownups/GrownUpsScreen'
import { backupFileName } from '@/features/grownups/download'
import { testStore, withData } from '../withData'

async function seed(repos: Repositories) {
  const profile = await repos.profiles.ensureCurrent()
  let s = startLesson({ skillId: 'add.within20', seed: 1, at: 0 })
  while (s.phase !== 'complete') {
    s = lessonReducer(s, { type: 'answer', response: correctResponse(s.question), at: 1 })
    s = lessonReducer(s, { type: 'continue', at: 2 })
  }
  await repos.lessons.save(s, { lessonId: 'L1', profileId: profile?.id ?? '' })
}

const renderScreen = (repos: Repositories) =>
  render(
    withData(
      <MemoryRouter>
        <GrownUpsScreen now={() => Date.UTC(2026, 9, 17, 12)} />
      </MemoryRouter>,
      repos,
    ),
  )

let created: Blob[] = []
let clicked: string[] = []
beforeEach(() => {
  created = []
  clicked = []
  URL.createObjectURL = vi.fn((b: Blob) => {
    created.push(b)
    return 'blob:test'
  })
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this.download)
  })
})
afterEach(() => vi.restoreAllMocks())

describe('GrownUpsScreen: backup', () => {
  it('shows storage status and what is saved (AC9)', async () => {
    const { repos } = testStore()
    await seed(repos)
    renderScreen(repos)
    expect(await screen.findByTestId('counts')).toHaveTextContent('1 lesson and 10 answers saved')
    expect(screen.getByTestId('persistence')).toHaveTextContent('may clear this, so back up')
  })

  it('downloads a dated JSON backup (AC7)', async () => {
    const { repos } = testStore()
    await seed(repos)
    renderScreen(repos)
    await userEvent.click(screen.getByRole('button', { name: 'Download backup' }))
    await waitFor(() => expect(clicked).toEqual([backupFileName(Date.UTC(2026, 9, 17, 12))]))
    expect(clicked[0]).toMatch(/^kukoos-backup-\d{4}-\d{2}-\d{2}\.json$/)
    const file = JSON.parse(await (created[0] as Blob).text())
    expect(file).toMatchObject({ app: 'kukoos', schemaVersion: 1 })
    expect(file.tables.lessons).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Backup downloaded')
  })

  it('restores a backup after confirming (AC7)', async () => {
    const source = testStore()
    await seed(source.repos)
    const json = JSON.stringify(await source.repos.backup.export())

    const target = testStore()
    renderScreen(target.repos)
    await userEvent.upload(
      screen.getByTestId('backup-file'),
      new File([json], 'b.json', { type: 'application/json' }),
    )
    expect(await screen.findByRole('dialog', { name: /Replace progress/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Replace' }))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Restored! 1 lesson is back.'),
    )
    expect(await target.db.lessons.count()).toBe(1)
    await waitFor(() => expect(screen.getByTestId('counts')).toHaveTextContent('1 lesson and'))
  })

  it('keeps current progress when the grown-up cancels', async () => {
    const source = testStore()
    await seed(source.repos)
    const json = JSON.stringify(await source.repos.backup.export())
    const target = testStore()
    renderScreen(target.repos)
    await userEvent.upload(screen.getByTestId('backup-file'), new File([json], 'b.json'))
    await userEvent.click(await screen.findByRole('button', { name: 'Keep current progress' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await target.db.lessons.count()).toBe(0)
  })

  it('explains an invalid file and changes nothing (AC8)', async () => {
    const { db, repos } = testStore()
    renderScreen(repos)
    await userEvent.upload(screen.getByTestId('backup-file'), new File(['{oops'], 'b.json'))
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(BACKUP_ERRORS.notBackup),
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await db.lessons.count()).toBe(0)
  })

  it('explains when this browser cannot save (AC10)', () => {
    renderScreen(createNullRepositories())
    expect(screen.getByText(/can't be saved in this browser/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download backup' })).toBeNull()
  })
})
