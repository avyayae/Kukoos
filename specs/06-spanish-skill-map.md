# Curriculum Skill Map — Spanish (first words)

**Status:** Approved (2026-11-03)

For a **total beginner** (about 5–10) hearing Spanish for the first time. The Spanish is **Latin American**. v1 is **listening first, with pictures**: the kid hears a word and taps what it means, and never has to read Spanish. Each **skill** is a small group of words. Skills are grouped into island **areas** (map regions) and unlock in order through mastery (constitution §2.1), with a skip-ahead check for kids who already know some words.

**Standard (constitution §2.5, to be amended):** every skill maps to an **ACTFL Novice Low** can-do statement. Example: "I can greet someone and say goodbye", "I can name some colours and animals".

**Correctness (§3.4):** the word lists are **hand-written data, reviewed by a grown-up** before release, in `src/domain/spanish/words.ts`. AI may help draft a list, but a person checks every word, and tests check the structure (see below). The right answer to a question is always the word's own picture, picked by code.

**Story arc:** Kukoos sails to **Hola Island**. It starts at the Harbor (hello, please, thank you), visits the Market (colours, numbers, food), and ends on the Jungle Trail (animals, family, my body), where its new friends throw a **fiesta**.

**Concrete → abstract (§2.4):** picture + sound → picture + sound + the written word → words in tiny phrases (Phase 2).

## Words
- Each word has an `id`, its Spanish (`es`), its English meaning (`en`), a picture, and an **article** for nouns (`el perro`, `la manzana`).
- Nouns are always **heard and shown with their article**, so the right habit starts early, but v1 never **tests** gender.
- **Pictures:** emoji in v1 (offline, free, every device has them). Colours are drawn as swatches and numbers as dot groups, both by code. Words without a clear emoji are left out of v1.
- **Audio:** the device's best Latin American Spanish voice (es-MX, es-US or es-419 first, then any `es` voice). Instructions stay in English ("Tap the one you hear!"). Only the Spanish word is spoken in Spanish.

## Question kinds
| Kind | The kid… | Correct when |
|---|---|---|
| `listen` | hears a word (🔊 to replay) and taps its picture, out of 3 (4 at difficulty 3) | the tapped picture is the word's |
| `see` | sees a picture and taps the Spanish word, out of 3. Each word tile speaks itself when tapped. | the tapped tile is the word |
| `match` | joins 3–4 words (heard and shown) to their pictures | every pair is right |
| `count` | hears a number and taps the group with that many dots (numbers skills only) | the dot count matches |
| `say` | hears Kukoos say the word, says it out loud, then taps **"I said it!"** | always. It's practice, not a test: it isn't scored or counted toward mastery, and it uses no microphone (decision 2026-11-03) |

Distractors come from the same skill first, then from earlier skills, never a word with the same picture.

## Area 1 — Harbor ⚓ (hello and me)
| Skill ID | Words (examples) | ACTFL can-do |
|---|---|---|
| `es.hello` | hola, adiós, buenos días, buenas noches | I can greet and say goodbye |
| `es.manners` | por favor, gracias, de nada, sí, no | I can use polite words |
| `es.feelings` | feliz, triste, cansado/cansada, enojado/enojada | I can say how I feel (with pictures) |
| `es.colors1` | rojo, azul, amarillo, verde | I can name some colours |
| `es.colors2` | negro, blanco, rosado, morado, anaranjado, café | I can name more colours |
| `es.numbers1` | uno … cinco | I can count to 5 |

Reward: the Harbor flag ⚓ sticker.

## Area 2 — Market 🧺 (numbers and food)
| Skill ID | Words (examples) | ACTFL can-do |
|---|---|---|
| `es.numbers2` | seis … diez | I can count to 10 |
| `es.numbers3` | once … veinte | I can count to 20 |
| `es.fruit` | la manzana, el plátano, la naranja, la fresa, las uvas, la sandía | I can name some fruit |
| `es.food` | el pan, el queso, la leche, el agua, el huevo, el arroz | I can name some food and drinks |
| `es.snacks` | el helado, la galleta, el pastel, el jugo | I can name treats I like |
| `es.market` | grande, pequeño, mucho, poco (with pictures) | I can describe things with simple words |

Reward: the Market basket 🧺 sticker.

## Area 3 — Jungle Trail 🌴 (animals, family, me)
| Skill ID | Words (examples) | ACTFL can-do |
|---|---|---|
| `es.pets` | el perro, el gato, el pez, el pájaro, el conejo | I can name pets |
| `es.farm` | la vaca, el caballo, el cerdo, la gallina, la oveja | I can name farm animals |
| `es.wild` | el león, el mono, el elefante, la jirafa, la tortuga, la serpiente | I can name wild animals |
| `es.family` | la mamá, el papá, el hermano, la hermana, el abuelo, la abuela, el bebé | I can name my family |
| `es.body` | la cabeza, la mano, el pie, los ojos, la boca, la nariz | I can name parts of my body |
| `es.home` | la casa, la cama, la mesa, la silla, la puerta, el libro | I can name things at home |

Reward: the Fiesta piñata 🪅 sticker, and the island is complete.

## Mastery and skip-ahead
- **8 questions per lesson** (the same as math and chess). A `say` question may appear once in a lesson but isn't one of the 8 scored questions.
- Mastery, crowns and spaced review reuse the shared model (`skillId` = `es.*`).
- **Skip-ahead:** "Already know these words?" offers 3 `listen` questions at difficulty 3. All 3 right crowns the skill.

## Tests on the data
- Ids are unique, every word belongs to a skill, and each skill has at least 4 words.
- Every noun has an article that agrees with it (`el`/`la`/`los`/`las`). Each word has a non-empty picture, and no two words in a skill share a picture.
- Every skill listed here exists in code (and the reverse).
- For every question kind × skill × seed, the right answer is among the choices exactly once.

## Phase 2 (not in v1)
- Tiny phrases with word tiles: "Me gusta el helado", "Tengo un perro", "Es rojo".
- Reading and spelling, and the Spanish alphabet.
- Speech checking with a microphone (it needs an offline, private recogniser first).
- Recorded native-speaker audio if device voices sound poor.
