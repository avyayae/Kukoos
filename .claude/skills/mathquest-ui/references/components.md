# Component specs

All components live in `src/ui/` (generic) or `src/visuals/` (math visuals). Each one has a test covering its states, and supports reduced motion.

## Button3D
- **Anatomy:** fill + bottom lip (`box-shadow: 0 var(--mq-lip) 0 <lip-color>`) + uppercase label + optional leading icon.
- **Variants:** `primary` (purple, white text), `secondary` (orange, ink text), `success` (green, white text, used for CONTINUE after a correct answer), `danger-soft` (coral, white text, used for CONTINUE after a not-yet), `ghost` (surface fill, border stroke + border lip, ink text), `sky` (ink text).
- **Sizes:** `md` 48px (parent zone), `lg` 56px (default kid), `xl` 64px with a 6px lip (CHECK/CONTINUE, full width).
- **States:** default; hover (desktop: brightness 1.05); **pressed** (`translateY(lip)`, lip shadow 0, `--mq-dur-press`); disabled (`disabled` fill + `disabled-ink`, no lip, `aria-disabled`); loading (spinner replaces the icon, keeps its width).
- **A11y:** a native `<button>`, focus ring `2px solid var(--mq-focus)` offset 3px.

## ChoiceTile (MCQ / compare / true-false)
- **Anatomy:** card (surface, 2px border, border lip, radius-card) with a large number/emoji/picture and an optional caption.
- **States:** default; pressed (lip collapses); **selected** (primary-tint fill, primary stroke + lip); **correct** (success-tint fill, success stroke, ✓ badge top-right); **incorrect** (danger-tint fill, danger stroke, ↺ badge, `shake` once).
- **Layout:** 2×2 grid on phone, 4×1 on tablet landscape. Min 96px tall.
- **A11y:** `role="radio"` inside a `role="radiogroup"`; arrow-key navigation.

## Keypad (numeric entry)
- 3×4 grid: 1–9, ⌫ backspace, 0, (optional) ✓. Keys are Button3D `ghost`, size ≥ 64px, digits in `--mq-font-display`.
- The answer slot above shows the typed digits in `--text-math`, with a blinking caret (static when motion is reduced).
- Max digits come from the question (e.g., 3). Extra presses do a tiny `shake` on the slot.
- Supports a physical keyboard (0–9, Backspace, Enter) on desktop.

## ColumnGrid ⭐ (vertical add/sub, the focus feature)
- **Anatomy:** right-aligned columns (H T O), with a small carry/borrow box above each column, operands, an operator, a thick rule, and answer cells.
- **Interaction:** tap an answer cell to focus it (the active column is highlighted with a primary-tint column band); enter digits with the Keypad. In borrow skills, tapping a top digit "opens" it: the digit is struck through, the new value appears above in secondary orange, and the neighbor gains a small "1" prefix (13), animated as a ten rod sliding over.
- **Guided mode:** Kukoos's bubble asks "Ones first! Can we take 8 from 6?" with Yes/No chips; the grid locks to the current column.
- **States per cell:** empty, focused, filled, correct (success ink), incorrect (danger ink + ↺).
- **Sizes:** digit cells ≥ 56px. Total width ≤ the viewport at 360px for 3 digits + operator.

## BaseTenBlocks ⭐ (concrete visual + trade interaction)
- Hundreds = 10×10 flat (sky), tens = 1×10 rod (secondary), ones = unit cube (sun). Flat SVG with a 1px darker same-hue grid line.
- **Trade animation:** tapping a rod splits it into 10 cubes that fan out (`bounce`, staggered 30ms) into the ones area. Tapping a flat splits it into 10 rods. With reduced motion, it does an instant swap plus a fade.
- **Remove (subtraction):** tap cubes or rods to cross them out (they fade to 30% with a ✕).
- The live count label (e.g., "2 tens 16 ones") sits under each place group.

## TenFrame
- A 2×5 grid; filled dots are sun-colored circles. Used for within-20 warm-up hints.

## ProgressBar (lesson)
- Height 16px, `track` background, primary fill, radius pill, with a white 4px highlight stripe at the top third (Duolingo-like gloss). Fill width animates with the `gentle` spring. Combo ≥ 3 tints it with streak orange.

## FeedbackBanner
- Bottom sheet that slides up over the CHECK button area (radius-sheet top).
- **Correct:** success-tint background, ✓ icon in a success circle, title in success-ink ("Awesome!"), CONTINUE (Button3D `success`, xl).
- **Not yet:** danger-tint background, ↺ icon, title in danger-ink ("Almost!"), hint text + "Show me" (opens the visual hint), TRY AGAIN (Button3D `danger-soft`, xl).
- Announced via `aria-live="polite"`.

## TopBar (home/map)
- Left: avatar (40px circle, tappable). Right: stat pills: 🔥 streak (streak color), 💎 crystals (gem), and the daily-goal ring (minutes, primary stroke on track). Each pill is ≥ 44px tall, with the number in display font.
- The lesson screen uses a slim variant: ✕ (exit with confirm), ProgressBar, combo flame.

## MapNode
- 72px circle with a 6px lip, an icon in the center, and a skill label under it (≤ 3 words).
- **States:** locked (disabled colors + 🔒); available (world accent color, `bounce` loop every 3s, a "START" speech bubble on the first available node); in-progress (progress ring around the node); crowned (sun fill + 👑, sparkle on first render); boss (96px, special icon such as lion, rover or meteor).
- The path zig-zags (offsets −60/0/+60px) along a dashed curved line (SVG path).

## Card / Sheet / Modal
- Card: surface, radius-card, 2px border + border lip, padding space-4/6.
- Sheet (mobile modals): from the bottom, radius-sheet top, drag handle, and the backdrop dims to 40% ink.
- Modals are rare in kid UI. Prefer full-screen moments (lesson complete, world unlocked).

## Kukoos (mascot)
- `<Kukoos mood="idle|happy|cheer|think|encourage|sleep" helmet={boolean} size="sm|md|lg" />`
- Rive state machine `kukoos` with a `mood` number input and a `fly` trigger; static SVG fallback per mood (reduced motion, Rive loading or failure).
- Speech bubble: surface card with a tail, max 2 lines, auto-hides after TTS ends + 1.5s.
- Design: round, chubby body; big eyes with highlights; sunset-orange body with purple wings and crest; small beak; no outlines. **Must not resemble an owl or use Duolingo green.**

## CelebrationOrchestrator
- A single queue that consumes `RewardEffect[]` and plays one effect at a time: XP count-up → crystals → streak flame → badge reveal → level-up → chest. Any tap skips to the end of the current effect.
- Confetti: `canvas-confetti`, ≤ 120 particles, brand palette (primary, secondary, sun, gem, sky).
