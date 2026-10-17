import { KukoosDb } from '@/data/db'

let counter = 0

/** A fresh, isolated database for one test. */
export function freshDb(): KukoosDb {
  counter += 1
  return new KukoosDb(`kukoos-test-${counter}-${Date.now()}`)
}
