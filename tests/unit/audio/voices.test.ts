import { describe, expect, it } from 'vitest'
import {
  isSpanish,
  rankSpanishVoices,
  rankVoices,
  voiceLabel,
  type VoiceLike,
} from '@/audio/voices'

const v = (name: string, lang = 'en-US', localService = true): VoiceLike => ({
  name,
  lang,
  voiceURI: name,
  localService,
})

// Real voice names from Edge (Windows), Chrome, Safari/iPad and Android.
const DEVICE_VOICES = [
  v('Microsoft David - English (United States)'),
  v('Microsoft Aria Online (Natural) - English (United States)', 'en-US', false),
  v('Google US English', 'en-US', false),
  v('Google UK English Female', 'en-GB', false),
  v('Samantha'),
  v('Samantha (Enhanced)'),
  v('Zarvox'),
  v('Bad News'),
  v('Microsoft Heera - English (India)', 'en-IN'),
  v('Google Deutsch', 'de-DE', false),
  v('English United States', 'en_US'),
]

describe('rankVoices (AC7)', () => {
  it('US natural/enhanced voices first, then US, then other English, novelty last', () => {
    expect(rankVoices(DEVICE_VOICES).map((x) => x.name)).toEqual([
      'Samantha (Enhanced)',
      'Google US English',
      'Microsoft Aria Online (Natural) - English (United States)',
      'English United States',
      'Microsoft David - English (United States)',
      'Samantha',
      'Google UK English Female',
      'Microsoft Heera - English (India)',
      'Bad News',
      'Zarvox',
    ])
  })

  it('drops non-English voices and is deterministic', () => {
    const ranked = rankVoices(DEVICE_VOICES)
    expect(ranked.some((x) => x.lang.startsWith('de'))).toBe(false)
    expect(rankVoices([...DEVICE_VOICES].reverse())).toEqual(ranked)
    expect(rankVoices([])).toEqual([])
  })

  it('makes short readable labels', () => {
    expect(voiceLabel(v('Microsoft Aria Online (Natural) - English (United States)'))).toBe(
      'Aria (natural)',
    )
    expect(voiceLabel(v('Google UK English Female', 'en-GB'))).toBe(
      'UK English Female (natural) · en-GB',
    )
    expect(voiceLabel(v('Samantha'))).toBe('Samantha')
  })
})

// Spec 018 AC3: real Spanish voice names from Edge, Chrome, Safari/iPad and Android.
describe('Spanish voices (spec 018 AC3)', () => {
  const SPANISH = [
    v('Microsoft Helena - Spanish (Spain)', 'es-ES'),
    v('Microsoft Dalia Online (Natural) - Spanish (Mexico)', 'es-MX', false),
    v('Google español', 'es-ES', false),
    v('Google español de Estados Unidos', 'es-US', false),
    v('Paulina', 'es-MX'),
    v('Mónica', 'es-ES'),
    v('Microsoft Aria Online (Natural) - English (United States)', 'en-US', false),
  ]

  it('Latin American first, natural before plain, Spain last; English is dropped', () => {
    expect(rankSpanishVoices(SPANISH).map((x) => x.name)).toEqual([
      'Microsoft Dalia Online (Natural) - Spanish (Mexico)',
      'Google español de Estados Unidos',
      'Paulina',
      'Google español',
      'Microsoft Helena - Spanish (Spain)',
      'Mónica',
    ])
  })

  it('picks es-MX over es-ES, falls back to es-ES, and is empty without Spanish', () => {
    expect(rankSpanishVoices([v('a', 'en-US'), v('b', 'es-ES'), v('c', 'es-MX')])[0]?.name).toBe(
      'c',
    )
    expect(rankSpanishVoices([v('b', 'es_ES')])[0]?.name).toBe('b')
    expect(rankSpanishVoices([v('a', 'en-US')])).toEqual([])
    expect(isSpanish(v('x', 'ES-419'))).toBe(true)
  })

  it('labels show the accent', () => {
    expect(voiceLabel(v('Microsoft Dalia Online (Natural) - Spanish (Mexico)', 'es-MX'))).toBe(
      'Dalia (natural) · es-MX',
    )
  })
})
