/** The parts of `SpeechSynthesisVoice` we use (plain objects in tests). */
export interface VoiceLike {
  name: string
  lang: string
  voiceURI: string
  localService: boolean
}

const NATURAL = /natural|neural|enhanced|premium|google/i
/** macOS/iOS novelty voices: fun for adults, confusing for a 7-year-old. */
const NOVELTY =
  /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley)\b/i

const isEnglish = (v: VoiceLike) => v.lang.toLowerCase().replace('_', '-').startsWith('en')
const isUS = (v: VoiceLike) => v.lang.toLowerCase().replace('_', '-') === 'en-us'

export function isNatural(v: VoiceLike): boolean {
  return NATURAL.test(v.name)
}

function score(v: VoiceLike): number {
  return (
    (isUS(v) ? 100 : 50) +
    (isNatural(v) ? 40 : 0) +
    (v.localService ? 5 : 0) -
    (NOVELTY.test(v.name) ? 200 : 0)
  )
}

/**
 * English voices, friendliest first (spec 009 AC7): US natural/neural/enhanced voices, then
 * other US voices, then other English voices; novelty voices last. Deterministic.
 */
export function rankVoices<V extends VoiceLike>(voices: readonly V[]): V[] {
  return voices
    .filter(isEnglish)
    .map((v) => ({ v, s: score(v) }))
    .sort((a, b) => b.s - a.s || a.v.name.localeCompare(b.v.name))
    .map(({ v }) => v)
}

const langOf = (v: VoiceLike) => v.lang.toLowerCase().replace('_', '-')
export const isSpanish = (v: VoiceLike) => langOf(v).startsWith('es')

/** Latin American Spanish first (spec 018): Mexico, the US, "Latin America", then the rest. */
function spanishRegion(v: VoiceLike): number {
  const lang = langOf(v)
  if (lang === 'es-mx') return 100
  if (lang === 'es-us') return 95
  if (lang === 'es-419') return 90
  if (lang === 'es-es') return 50
  return 70
}

function spanishScore(v: VoiceLike): number {
  return (
    spanishRegion(v) +
    (isNatural(v) ? 40 : 0) +
    (v.localService ? 5 : 0) -
    (NOVELTY.test(v.name) ? 200 : 0)
  )
}

/**
 * Spanish voices, best first (spec 018 AC3): Latin American before Spain, natural/neural
 * before plain, on-device before network, novelty voices last. Deterministic.
 */
export function rankSpanishVoices<V extends VoiceLike>(voices: readonly V[]): V[] {
  return voices
    .filter(isSpanish)
    .map((v) => ({ v, s: spanishScore(v) }))
    .sort((a, b) => b.s - a.s || a.v.name.localeCompare(b.v.name))
    .map(({ v }) => v)
}

/** A short, readable name for the picker: "Microsoft Aria Online (Natural) - English (United States)" → "Aria (natural)". */
export function voiceLabel(v: VoiceLike): string {
  const base = v.name
    .replace(/^(Microsoft|Google|Apple)\s+/i, '')
    .replace(/\s+Online\b/i, '')
    .replace(/\s*[-–(].*$/, '')
    .trim()
  const accent = isUS(v) ? '' : ` · ${v.lang}`
  return `${base || v.name}${isNatural(v) ? ' (natural)' : ''}${accent}`
}
