import type { SkillId } from '../types'

/**
 * The Spanish first words (spec 019, `specs/06-spanish-skill-map.md`). Latin American Spanish.
 * Hand-written data, reviewed word by word by a grown-up (`words.review.md`, constitution
 * §3.4). Tests check its structure; the right answer is always picked by code.
 */
export type Article = 'el' | 'la' | 'los' | 'las'

/** What the kid sees for a word: an emoji, a colour swatch, or a number (numeral or dots). */
export type WordPicture = { emoji: string } | { swatch: string } | { number: number }

export interface SpanishWord {
  /** Unique across the course, used in mix-up keys (`es.mixup:perro~gato`). */
  id: string
  /** The Spanish, without the article. */
  es: string
  /** Nouns are always heard and shown with their article (never tested in v1). */
  article?: Article
  /** The English meaning (for grown-ups and the review table). */
  en: string
  picture: WordPicture
  /** Spoken form, when it differs from the shown one ("cansado / cansada"). */
  say?: string
}

const e = (id: string, es: string, en: string, emoji: string, article?: Article): SpanishWord =>
  article ? { id, es, article, en, picture: { emoji } } : { id, es, en, picture: { emoji } }
const colour = (id: string, es: string, en: string, swatch: string): SpanishWord => ({
  id,
  es,
  en,
  picture: { swatch },
})
const num = (n: number, es: string): SpanishWord => ({
  // Ids are plain ASCII: dieciséis → dieciseis.
  id: es.normalize('NFD').replace(/[̀-ͯ]/g, ''),
  es,
  en: String(n),
  picture: { number: n },
})
/** Feelings that change with who feels them: shown and spoken in both forms. */
const both = (id: string, he: string, she: string, en: string, emoji: string): SpanishWord => ({
  id,
  es: `${he} / ${she}`,
  en,
  picture: { emoji },
  say: `${he}, ${she}`,
})

export const SPANISH_WORDS: Readonly<Record<SkillId, readonly SpanishWord[]>> = {
  // ---------------------------------------------------------------- Harbor
  'es.hello': [
    e('hola', 'hola', 'hello', '🙋'),
    e('adios', 'adiós', 'goodbye', '👋'),
    e('buenos-dias', 'buenos días', 'good morning', '🌅'),
    e('buenas-noches', 'buenas noches', 'good night', '🌙'),
  ],
  'es.manners': [
    e('por-favor', 'por favor', 'please', '🙏'),
    e('gracias', 'gracias', 'thank you', '💝'),
    e('de-nada', 'de nada', 'you’re welcome', '😊'),
    e('si', 'sí', 'yes', '👍'),
    e('no', 'no', 'no', '👎'),
  ],
  'es.feelings': [
    e('feliz', 'feliz', 'happy', '😀'),
    e('triste', 'triste', 'sad', '😢'),
    both('cansado', 'cansado', 'cansada', 'tired', '😴'),
    both('enojado', 'enojado', 'enojada', 'angry', '😠'),
    both('asustado', 'asustado', 'asustada', 'scared', '😨'),
  ],
  'es.colors1': [
    colour('rojo', 'rojo', 'red', '#e53935'),
    colour('azul', 'azul', 'blue', '#1e88e5'),
    colour('amarillo', 'amarillo', 'yellow', '#fdd835'),
    colour('verde', 'verde', 'green', '#43a047'),
  ],
  'es.colors2': [
    colour('negro', 'negro', 'black', '#212121'),
    colour('blanco', 'blanco', 'white', '#ffffff'),
    colour('rosado', 'rosado', 'pink', '#f48fb1'),
    colour('morado', 'morado', 'purple', '#8e24aa'),
    colour('anaranjado', 'anaranjado', 'orange', '#fb8c00'),
    colour('cafe', 'café', 'brown', '#795548'),
  ],
  'es.numbers1': [num(1, 'uno'), num(2, 'dos'), num(3, 'tres'), num(4, 'cuatro'), num(5, 'cinco')],
  // ---------------------------------------------------------------- Market
  'es.numbers2': [
    num(6, 'seis'),
    num(7, 'siete'),
    num(8, 'ocho'),
    num(9, 'nueve'),
    num(10, 'diez'),
  ],
  'es.numbers3': [
    num(11, 'once'),
    num(12, 'doce'),
    num(13, 'trece'),
    num(14, 'catorce'),
    num(15, 'quince'),
    num(16, 'dieciséis'),
    num(17, 'diecisiete'),
    num(18, 'dieciocho'),
    num(19, 'diecinueve'),
    num(20, 'veinte'),
  ],
  'es.fruit': [
    e('manzana', 'manzana', 'apple', '🍎', 'la'),
    e('platano', 'plátano', 'banana', '🍌', 'el'),
    e('naranja', 'naranja', 'orange (fruit)', '🍊', 'la'),
    e('fresa', 'fresa', 'strawberry', '🍓', 'la'),
    e('uvas', 'uvas', 'grapes', '🍇', 'las'),
    e('sandia', 'sandía', 'watermelon', '🍉', 'la'),
  ],
  'es.food': [
    e('pan', 'pan', 'bread', '🍞', 'el'),
    e('queso', 'queso', 'cheese', '🧀', 'el'),
    e('leche', 'leche', 'milk', '🥛', 'la'),
    // "agua" is feminine but takes "el" (stressed a-): el agua.
    e('agua', 'agua', 'water', '💧', 'el'),
    e('huevo', 'huevo', 'egg', '🥚', 'el'),
    e('arroz', 'arroz', 'rice', '🍚', 'el'),
  ],
  'es.snacks': [
    e('helado', 'helado', 'ice cream', '🍦', 'el'),
    e('galleta', 'galleta', 'cookie', '🍪', 'la'),
    e('pastel', 'pastel', 'cake', '🎂', 'el'),
    e('jugo', 'jugo', 'juice', '🧃', 'el'),
  ],
  'es.market': [
    e('grande', 'grande', 'big', '🌳'),
    e('pequeno', 'pequeño', 'small', '🌱'),
    e('mucho', 'mucho', 'a lot', '🍎🍎🍎🍎'),
    e('poco', 'poco', 'a little', '🍎'),
  ],
  // ---------------------------------------------------------------- Jungle Trail
  'es.pets': [
    e('perro', 'perro', 'dog', '🐶', 'el'),
    e('gato', 'gato', 'cat', '🐱', 'el'),
    e('pez', 'pez', 'fish', '🐟', 'el'),
    e('pajaro', 'pájaro', 'bird', '🐦', 'el'),
    e('conejo', 'conejo', 'rabbit', '🐰', 'el'),
  ],
  'es.farm': [
    e('vaca', 'vaca', 'cow', '🐮', 'la'),
    e('caballo', 'caballo', 'horse', '🐴', 'el'),
    e('cerdo', 'cerdo', 'pig', '🐷', 'el'),
    e('gallina', 'gallina', 'hen', '🐔', 'la'),
    e('oveja', 'oveja', 'sheep', '🐑', 'la'),
  ],
  'es.wild': [
    e('leon', 'león', 'lion', '🦁', 'el'),
    e('mono', 'mono', 'monkey', '🐵', 'el'),
    e('elefante', 'elefante', 'elephant', '🐘', 'el'),
    e('jirafa', 'jirafa', 'giraffe', '🦒', 'la'),
    e('tortuga', 'tortuga', 'turtle', '🐢', 'la'),
    e('serpiente', 'serpiente', 'snake', '🐍', 'la'),
  ],
  'es.family': [
    e('mama', 'mamá', 'mom', '👩', 'la'),
    e('papa', 'papá', 'dad', '👨', 'el'),
    e('hermano', 'hermano', 'brother', '👦', 'el'),
    e('hermana', 'hermana', 'sister', '👧', 'la'),
    e('abuelo', 'abuelo', 'grandpa', '👴', 'el'),
    e('abuela', 'abuela', 'grandma', '👵', 'la'),
    e('bebe', 'bebé', 'baby', '👶', 'el'),
  ],
  'es.body': [
    e('mano', 'mano', 'hand', '✋', 'la'),
    e('pie', 'pie', 'foot', '🦶', 'el'),
    e('ojos', 'ojos', 'eyes', '👀', 'los'),
    e('boca', 'boca', 'mouth', '👄', 'la'),
    e('nariz', 'nariz', 'nose', '👃', 'la'),
    e('oreja', 'oreja', 'ear', '👂', 'la'),
  ],
  'es.home': [
    e('casa', 'casa', 'house', '🏠', 'la'),
    e('cama', 'cama', 'bed', '🛏️', 'la'),
    e('silla', 'silla', 'chair', '🪑', 'la'),
    e('puerta', 'puerta', 'door', '🚪', 'la'),
    e('ventana', 'ventana', 'window', '🪟', 'la'),
    e('libro', 'libro', 'book', '📖', 'el'),
  ],
}

/** "el perro": how a word is shown (nouns always with their article). */
export const shown = (w: SpanishWord) => (w.article ? `${w.article} ${w.es}` : w.es)

/** How a word is spoken in Spanish. */
export const spoken = (w: SpanishWord) => w.say ?? shown(w)

/** A key for "the same picture" (no two choices may look alike). */
export function pictureKey(p: WordPicture): string {
  if ('emoji' in p) return `emoji:${p.emoji}`
  if ('swatch' in p) return `swatch:${p.swatch.toLowerCase()}`
  return `number:${p.number}`
}

export const wordsOf = (skillId: SkillId): readonly SpanishWord[] => SPANISH_WORDS[skillId] ?? []

const byId = new Map(Object.values(SPANISH_WORDS).flatMap((ws) => ws.map((w) => [w.id, w])))
export const getWord = (id: string): SpanishWord | undefined => byId.get(id)
