import { formatMessage, type Message, type WorldId } from '@/domain'
import hints from '../../../content/hints.en.json'
import lines from '../../../content/lines.en.json'

const messages: Readonly<Record<string, string>> = hints.messages
const lists: Readonly<Record<string, readonly string[]>> = lines.lists

/** Kukoos's copy for a message key (falls back to the generic hint, never shows a raw key). */
export function t(key: string, params: Message['params'] = {}): string {
  const template = messages[key] ?? messages['hint:default'] ?? ''
  return formatMessage(template, params)
}

export function say(message: Message): string {
  return t(message.key, message.params)
}

/**
 * A seeded pick from a line bank (spec 009 AC9). Consecutive seeds give consecutive lines,
 * so passing `lessonSeed + questionIndex` never repeats the previous line.
 */
export function pick(listKey: string, seed: number): string {
  const list = lists[listKey] ?? []
  const n = Math.max(1, list.length)
  return list[((seed % n) + n) % n] ?? ''
}

export function praiseFor(worldId: WorldId, seed: number): string {
  return pick(`praise:${worldId}`, seed)
}

export function hasMessage(key: string): boolean {
  return key in messages
}
