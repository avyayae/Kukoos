/** Kid-facing chess course lines (specs 013, 016), all spoken when read-aloud is on. */
export const CHESS_COPY = {
  building: 'Chess Castle is being built! Come back soon.',
  tryBoard: 'Try the board',
  restingTitle: 'Great playing today!',
  resting: 'The chess pieces are resting until tomorrow.',
  notYet: 'Not yet!',
  solutionTitle: 'Here’s how',
  offerTitle: 'Already know this?',
  offerBody: 'Show Kukoos three tricky ones, and skip ahead!',
  offerCheck: 'Show Kukoos!',
  offerLearn: 'Teach me',
  passedTitle: 'You know this already!',
  passedBody: 'Kukoos gave you a crown. On to the next one!',
  failedTitle: 'Let’s learn it together!',
  failedBody: 'Practice makes perfect.',
  comingSoon: 'Coming soon: play a whole game against Kukoos!',
  nothingToReview: 'Nothing to review right now. Great job!',
}

/** Praise after a right answer, rotated so it's never the same twice in a row. */
export const CHESS_PRAISE: readonly string[] = [
  'Great move!',
  'Brilliant!',
  'You’ve got it!',
  'Super chess!',
  'Kukoos is impressed!',
  'Spot on!',
]

export const praise = (n: number) => CHESS_PRAISE[n % CHESS_PRAISE.length] ?? 'Great move!'
