export type BotLevel = 1 | 2 | 3 | 4

export interface BotLevelDef {
  level: BotLevel
  name: string
  /** Kukoos's mood on the setup card. */
  emoji: string
  /** One line for the setup card, read aloud. */
  description: string
  depth: number
  quiesce: boolean
  /** Chance of a slip: a weaker (but still plausible) move instead of the best. */
  slip: number
  /** A slip picks among moves within this many centipawns of the best; `null` = any move. */
  slipMargin: number | null
  /** Never slips past a mate it has found (levels 3–4, spec 017 AC3). */
  takesMates: boolean
  nodeBudget: number
}

/** The four friendly Kukoos (spec 017). */
export const BOT_LEVELS: Record<BotLevel, BotLevelDef> = {
  1: {
    level: 1,
    name: 'Sleepy Kukoos',
    emoji: '😴',
    description: 'Just learning, like you!',
    depth: 1,
    quiesce: false,
    slip: 0.5,
    slipMargin: null,
    takesMates: false,
    nodeBudget: 5_000,
  },
  2: {
    level: 2,
    name: 'Playful Kukoos',
    emoji: '🙂',
    description: 'Likes to grab pieces.',
    depth: 1,
    quiesce: true,
    slip: 0.1,
    slipMargin: 150,
    takesMates: false,
    nodeBudget: 20_000,
  },
  3: {
    level: 3,
    name: 'Clever Kukoos',
    emoji: '🤓',
    description: 'Thinks a move ahead.',
    depth: 2,
    quiesce: true,
    slip: 0.1,
    slipMargin: 60,
    takesMates: true,
    nodeBudget: 60_000,
  },
  4: {
    level: 4,
    name: 'Wise Kukoos',
    emoji: '🦉',
    description: 'A real challenge!',
    depth: 3,
    quiesce: true,
    slip: 0.03,
    slipMargin: 30,
    takesMates: true,
    nodeBudget: 150_000,
  },
}

export const LEVELS: readonly BotLevel[] = [1, 2, 3, 4]

export const isBotLevel = (n: unknown): n is BotLevel => n === 1 || n === 2 || n === 3 || n === 4
