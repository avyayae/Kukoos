/// <reference lib="webworker" />
import { answer, type BotRequest } from './botProtocol'

// Kukoos thinks here (spec 017 AC4), so the board and animations stay smooth.
const scope = self as unknown as DedicatedWorkerGlobalScope

scope.onmessage = (e: MessageEvent<BotRequest & { id: number }>) => {
  const { id, ...req } = e.data
  scope.postMessage({ id, move: answer(req) })
}
