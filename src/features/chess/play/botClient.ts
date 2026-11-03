import type { MoveInput } from '@/domain/chess'
import type { BotRequest } from './botProtocol'

/** Kukoos never answers instantly: a short "thinking" pause feels friendlier (spec 017). */
export const THINK_MS = 600

export interface BotClient {
  ask(req: BotRequest): Promise<MoveInput | null>
  dispose(): void
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/**
 * Asks Kukoos in a Web Worker. Without workers (unit tests, very old browsers) the same
 * code runs on the main thread. Each answer waits at least `minMs`.
 */
export function createBotClient(minMs = THINK_MS): BotClient {
  let worker: Worker | null = null
  let nextId = 0
  const pending = new Map<number, (move: MoveInput | null) => void>()

  const viaWorker = (req: BotRequest) =>
    new Promise<MoveInput | null>((resolve) => {
      if (!worker) {
        worker = new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = (e: MessageEvent<{ id: number; move: MoveInput | null }>) => {
          pending.get(e.data.id)?.(e.data.move)
          pending.delete(e.data.id)
        }
      }
      const id = nextId++
      pending.set(id, resolve)
      worker.postMessage({ id, ...req })
    })

  const inline = async (req: BotRequest) => {
    await wait(0)
    const { answer } = await import('./botProtocol')
    return answer(req)
  }

  return {
    async ask(req) {
      const work = typeof Worker === 'undefined' ? inline(req) : viaWorker(req)
      const [move] = await Promise.all([work, wait(minMs)])
      return move
    },
    dispose() {
      worker?.terminate()
      worker = null
      pending.clear()
    },
  }
}
