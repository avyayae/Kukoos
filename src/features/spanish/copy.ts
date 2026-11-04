/** Kid-facing Spanish course lines (specs 018, 019). English for instructions; Spanish only for words. */
export const SPANISH_COPY = {
  hello: '¡Hola!',
  welcome: (name: string) => `Hi ${name}! Welcome to Hola Island.`,
  building: 'Welcome to Hola Island! Let’s learn Spanish words.',
  restingTitle: 'Great job today!',
  resting: 'Hola Island is resting until tomorrow. ¡Hasta mañana!',
  restingSpanish: '¡Hasta mañana!',
  noSpeech: 'Ask a grown-up to turn on a Spanish voice.',
  needsVoice: 'Ask a grown-up to add a Spanish voice for the best sound.',
  fiestaLocked: '¡Fiesta! opens when you crown the whole Jungle Trail.',
  fiestaTitle: '¡Fiesta!',
  fiestaBody: 'You finished Hola Island! All your new friends are having a party.',
  fiestaNotYet: 'The fiesta starts when the Jungle Trail is crowned.',
  notYet: 'Not yet!',
  solutionTitle: 'Here it is',
  offerTitle: 'Already know these words?',
  offerBody: 'Show Kukoos three tricky ones, and skip ahead!',
  offerCheck: 'Show Kukoos!',
  offerLearn: 'Teach me',
  passedTitle: 'You know these already!',
  passedBody: 'Kukoos gave you a crown. On to the next one!',
  failedTitle: 'Let’s learn them together!',
  failedBody: 'Listen, look, and have fun.',
  nothingToReview: 'Nothing to review right now. Great job!',
  hearIt: 'Hear it',
  hearAgain: 'Hear it again',
  saidIt: 'I said it!',
  sayPraise: 'Great saying!',
  lockedNode: (title: string) => `${title}. Not yet! Get a crown in the one before first.`,
}

/** Spanish praise, spoken in Spanish with the word ("¡Muy bien! El perro."). */
export const SPANISH_PRAISE: readonly string[] = [
  '¡Muy bien!',
  '¡Excelente!',
  '¡Bravo!',
  '¡Genial!',
  '¡Sí!',
]

export const praise = (n: number) => SPANISH_PRAISE[n % SPANISH_PRAISE.length] ?? '¡Muy bien!'
