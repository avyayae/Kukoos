# Screen anatomy & voice

## Lesson screen (phone 360px; on tablet the column centers at max 640px)
```
┌──────────────────────────────┐
│ ✕  ███████████░░░░░░  🔥3     │  slim TopBar: exit, ProgressBar, combo
│                              │
│  🐦 "Let's trade a ten!" 🔊   │  Kukoos (sm) + bubble + speak button
│                              │
│        ┌─┬─┬─┐               │
│        │ │1│ │  ← borrow box │
│        │ │3│6│               │  Question area (ColumnGrid / blocks / tiles)
│      − │ │2│8│               │  centered, never scrolls
│        ├─┴─┴─┤               │
│        │ │ │ │               │
│        └─────┘               │
│   [1][2][3]                  │
│   [4][5][6]   Keypad         │
│   [7][8][9]                  │
│   [⌫][0]                     │
│ ┌──────────────────────────┐ │
│ │          CHECK           │ │  Button3D xl, bottom-anchored, disabled until answered
│ └──────────────────────────┘ │
└──────────────────────────────┘
```
Tablet landscape: the question on the left 60% and the keypad on the right 40%, with CHECK still bottom full-width.

## World map (home)
```
┌──────────────────────────────┐
│ (🙂)            🔥5  💎120  ◔ │  TopBar: avatar, streak, crystals, goal ring (minutes)
│ ┌──────────────────────────┐ │
│ │ 🦁 SAVANNA CARRY CAMP     │ │  World banner (world color, sticky while in world)
│ │ Unit 2 · Borrowing        │ │
│ └──────────────────────────┘ │
│            ( 👑 )            │
│      ( 👑 )                  │  zig-zag MapNodes on a dashed path
│            ( ◔ ) ← START     │
│                  ( 🔒 )      │
│            ( 🦁 BOSS )       │
│   ~~~ ocean world below ~~~  │
└──────────────────────────────┘
```
The map scrolls vertically and auto-scrolls to the current node on open. World backgrounds change by section (jungle → savanna → ocean → space night sky with stars).

## Lesson complete
Full screen: Kukoos `cheer` (lg) + confetti → title "Mission complete!" → three stat cards side by side (⚡ XP, 🎯 accuracy %, ⏱ minutes) → crystals earned → (if perfect) a treasure chest to tap open → CONTINUE (xl). Effects play in sequence via the CelebrationOrchestrator.

## Daily limit reached
Dimmed night scene with a moon rising and Kukoos `sleep`. "Great job today! Kukoos needs a nap. See you tomorrow!" The only action is a small "Parent" link (PIN) to grant +10 min. No buttons that look like "play more".

## Parent zone
Calmer adult UI: Nunito 600 body at 16px, 48px targets, ghost/primary buttons, and cards with headings. Sections: Overview (minutes chart over 14 days, streak, accuracy), Skills (heatmap grid per world), Misconceptions (top 3 with example problems), Settings, Data (export/import/reset). Charts use the brand palette and follow the `dataviz` skill.

## Voice & copy (Kukoos)
- Short, warm, energetic. 2nd-person. Emoji are fine in bubbles (1 maximum).
- **Praise (rotate, never repeat back-to-back):** "Awesome!", "You did it!", "Math superstar!", "Kukoos is so proud!", "Out of this world!", "Roar-some!" (savanna), "Fin-tastic!" (ocean), "Stellar!" (space).
- **Not yet:** "Almost!", "So close!", "Let's look together.", "Good try! Let's trade a ten."
- **Hints:** a question first, then the step: "Can we take 8 from 6?" → "Let's trade 1 ten for 10 ones!"
- **Never:** "Wrong", "Incorrect", "Fail", "Oops, you messed up", "Hurry".
- Numbers are read naturally by TTS: "thirty-six minus twenty-eight". Provide a `speech` string separate from the display text.
