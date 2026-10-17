import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRepositories, createNullRepositories, DataProvider, useRepos } from '@/data'
import { createDexieRepositories } from '@/data/repositories/dexie'
import { freshDb } from './testDb'

function stubStorage(persist: boolean, persisted: boolean) {
  const storage = { persist: vi.fn(async () => persist), persisted: vi.fn(async () => persisted) }
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
  return storage
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'storage')
})

describe('requestPersistence (AC9)', () => {
  it('asks the browser once per device and remembers it', async () => {
    const storage = stubStorage(true, true)
    const repos = createDexieRepositories(freshDb())
    expect(await repos.storage.requestPersistence()).toBe(true)
    expect(await repos.storage.requestPersistence()).toBe(true)
    expect(storage.persist).toHaveBeenCalledOnce()
    expect(await repos.storage.isPersisted()).toBe(true)
  })

  it('copes with browsers that refuse or lack the API', async () => {
    const storage = stubStorage(false, false)
    storage.persist.mockRejectedValueOnce(new Error('nope'))
    const repos = createDexieRepositories(freshDb())
    expect(await repos.storage.requestPersistence()).toBe(false)
    Reflect.deleteProperty(navigator, 'storage')
    expect(await repos.storage.isPersisted()).toBeNull()
    expect(await createDexieRepositories(freshDb()).storage.requestPersistence()).toBe(false)
  })

  it('reports null when persisted() throws', async () => {
    const storage = stubStorage(true, true)
    storage.persisted.mockRejectedValueOnce(new Error('nope'))
    expect(await createDexieRepositories(freshDb()).storage.isPersisted()).toBeNull()
  })
})

describe('no storage (AC10)', () => {
  it('null repositories never throw and save nothing', async () => {
    const repos = createNullRepositories(() => 0)
    expect(repos.available).toBe(false)
    expect(await repos.profiles.ensureCurrent()).toBeNull()
    await expect(
      repos.lessons.save({} as never, { lessonId: 'x', profileId: 'y' }),
    ).resolves.toBeUndefined()
    expect(await repos.lessons.bestFirstTryBySkill('y')).toEqual({})
    expect((await repos.backup.export()).tables.lessons).toEqual([])
    expect(await repos.backup.import({})).toMatchObject({ ok: false })
    expect((await repos.backup.counts()).lessons).toBe(0)
    expect(await repos.storage.requestPersistence()).toBe(false)
    expect(await repos.storage.isPersisted()).toBeNull()
  })

  it('createRepositories falls back when IndexedDB is missing', async () => {
    const original = globalThis.indexedDB
    Reflect.deleteProperty(globalThis, 'indexedDB')
    try {
      expect((await createRepositories('x')).available).toBe(false)
    } finally {
      Object.defineProperty(globalThis, 'indexedDB', { value: original, configurable: true })
    }
    expect((await createRepositories(`ok-${Date.now()}`)).available).toBe(true)
  })
})

describe('DataProvider', () => {
  function Probe() {
    const repos = useRepos()
    return <p>{repos.available ? 'storage on' : 'storage off'}</p>
  }

  it('provides injected repositories', () => {
    render(
      <DataProvider repos={createNullRepositories()}>
        <Probe />
      </DataProvider>,
    )
    expect(screen.getByText('storage off')).toBeInTheDocument()
  })

  it('opens IndexedDB itself when nothing is injected', async () => {
    render(
      <DataProvider>
        <Probe />
      </DataProvider>,
    )
    await waitFor(() => expect(screen.getByText('storage on')).toBeInTheDocument())
  })

  it('useRepos outside the provider is a programming error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<Probe />)).toThrow(/DataProvider/)
  })
})
