import type { World, WorldId } from '../types'

/** MVP worlds: Kukoos flies from Earth's animal habitats into space. */
export const WORLDS: readonly World[] = [
  { id: 'jungle', order: 1, title: 'Jungle Warm-up', theme: 'animals', reward: 'Momo the monkey' },
  {
    id: 'savanna',
    order: 2,
    title: 'Savanna Carry Camp',
    theme: 'animals',
    reward: 'Leo the lion',
  },
  {
    id: 'ocean',
    order: 3,
    title: 'Ocean Place-Value Reef',
    theme: 'animals',
    reward: 'Shelly the sea turtle',
  },
  { id: 'moon', order: 4, title: 'Moon Base Addition', theme: 'space', reward: 'Moon sticker' },
  {
    id: 'mars',
    order: 5,
    title: 'Mars Subtraction Crater',
    theme: 'space',
    reward: 'Mars sticker',
  },
]

export function getWorld(id: WorldId): World {
  const world = WORLDS.find((w) => w.id === id)
  if (!world) throw new Error(`Unknown world: ${id}`)
  return world
}

/** Moon and Mars: Kukoos wears the space helmet there (spec 009). */
export function isSpaceWorld(id: WorldId): boolean {
  return getWorld(id).theme === 'space'
}
