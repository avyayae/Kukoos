/** Kid-facing chess course lines (specs 013, 016), all spoken when read-aloud is on. */
export const CHESS_COPY = {
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

/** Games against Kukoos (spec 017). Gentle words only: never "game over" or "you lose". */
export const PLAY_COPY = {
  play: 'Play Kukoos',
  setupTitle: 'Who do you want to play?',
  colorTitle: 'Your pieces',
  white: 'White',
  whiteNote: 'moves first',
  black: 'Black',
  surprise: 'Surprise me',
  start: 'Play!',
  resumeTitle: 'Keep playing your game?',
  resumeBody: 'Your game is waiting for you.',
  resume: 'Keep playing',
  newGame: 'New game',
  yourTurn: 'Your turn',
  thinking: 'Kukoos is thinking…',
  inCheck: 'Check! Protect your king.',
  takeBack: 'Take back',
  hint: 'Hint',
  endGame: 'End game',
  confirmEnd: 'Stop this game?',
  keepPlaying: 'Keep playing',
  stop: 'Stop',
  whisperPlayOn: 'Play on',
  whisperTakeBack: 'Take it back',
  wonTitle: 'You won! 🎉',
  firstWin: 'You won your first game! Chess Castle is complete!',
  lostTitle: 'Good game!',
  drawTitle: 'It’s a draw!',
  endedTitle: 'Game stopped',
  endedBody: 'You can play again any time.',
  rematch: 'Rematch',
  easier: 'Easier Kukoos',
  playAgain: 'Play again',
  backToCastle: 'Back to the castle',
  savedForTomorrow: 'Your game is saved!',
}

/** Why a draw happened, in one line (the F16 "draws" lesson words). */
export const DRAW_LINES: Record<string, string> = {
  stalemate: 'Stalemate: no safe moves, but no check.',
  insufficient: 'Only the kings are left, so nobody can win.',
  threefold: 'The same position came back three times.',
  'fifty-move': 'Fifty moves with no capture and no pawn move.',
}
