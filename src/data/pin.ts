import type { KukoosDb } from './db'
import { writeRows } from './write'

/**
 * The grown-ups PIN (spec 011 AC1): only a salted SHA-256 hash is stored, on the device's
 * `global` settings row. The PIN itself is never saved or exported.
 */
const GLOBAL = 'global'
const DEVICE = 'device'

const hex = (bytes: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  return hex(await crypto.subtle.digest('SHA-256', data))
}

export const isValidPin = (pin: string) => /^\d{4}$/.test(pin)

export async function hasPin(db: KukoosDb): Promise<boolean> {
  return Boolean((await db.settings.get(GLOBAL))?.pinHash)
}

export async function setPin(db: KukoosDb, pin: string, at: number): Promise<void> {
  if (!isValidPin(pin)) throw new Error('A PIN is 4 digits')
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)))
  const pinHash = await hashPin(pin, salt)
  await db.transaction('rw', [db.settings, db.outbox], async () => {
    const global = await db.settings.get(GLOBAL)
    await writeRows(
      db,
      'settings',
      [{ ...global, id: GLOBAL, profileId: DEVICE, pinHash, pinSalt: salt }],
      at,
    )
  })
}

export async function checkPin(db: KukoosDb, pin: string): Promise<boolean> {
  const global = await db.settings.get(GLOBAL)
  if (!global?.pinHash || !global.pinSalt) return false
  return (await hashPin(pin, global.pinSalt)) === global.pinHash
}
