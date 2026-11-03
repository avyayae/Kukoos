# Tasks — Feature 017 Chess Play: Games vs Kukoos

Branch: `feature/017-chess-play` (from `main`). Load `mathquest-ui` and `motion-design` for UI tasks. Run `npm run verify` before ticking.

- [ ] **T1 — Bot** (evaluate, search, levels with slips, `chooseMove` / `bestMove`). · *done when:* AC1–AC4 (domain) pass.
- [ ] **T2 — Game state, whisper and rewards** (`game.ts`, `whisper.ts`, `gameRewards`). · *done when:* AC5 (domain) and AC6 (rewards) pass.
- [ ] **T3 — Games data** (schema v2, `repos.games`, backup, remove/reset, null repo). · *done when:* AC7 passes and existing data tests stay green.
- [ ] **T4 — Bot worker and game screen** (route, setup, resume prompt, take back, hint, whisper, end game, thinking). · *done when:* AC5 (UI) and AC9 pass.
- [ ] **T5 — Game over, rewards and castle** (`RewardMoments`, end screens, next-level suggestion, Play chip, "Your first game" node and crown, limit pause). · *done when:* AC6 (UI) and AC8 pass.
- [ ] **T6 — E2E and wrap-up** (perf budget, deviations, verify, PR). · *done when:* AC10 and AC11 pass.
