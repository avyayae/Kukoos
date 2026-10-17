# Product Spec — MathQuest

## 1. Problem & vision
A 2nd grader wants to learn math, but worksheets are boring and most apps are full of ads, paywalls or shallow "tap anything" games.
**Vision:** a Duolingo-style math adventure. Short lessons, a lovable mascot, and celebrations that make a kid *ask* to practice, built on a real Grade 2–3 Common Core skill progression.

## 2. Users
| Persona | Needs |
|---|---|
| **Kid (7–9 yrs, Grade 2→3)**, primary | Fun, quick wins, visible progress, gentle help when stuck, minimal reading |
| **Parent**, secondary | See what the kid knows or struggles with, set daily goals and time limits, back up progress |
| **Sibling/friend**, occasional | Their own profile on the same device |

**Our first player:** loves **space and animals**. Already comfortable adding and subtracting within 100 without regrouping. **Focus area:** regrouping (carrying and borrowing), from 2-digit (`36 − 28`) up to 3-digit (`403 − 178`).

## 3. Goals & success metrics (personal-scale)
- Kid plays voluntarily ≥ 5 days/week for 4 weeks (streak data).
- ≥ 80% average first-try accuracy inside lessons (adaptive difficulty is working).
- Measurable mastery growth: ≥ 10 skills mastered in the first month.
- Parent can answer "what is my kid weak at?" in under 30 seconds from the dashboard.

## 4. Non-goals (MVP)
- Accounts, login, cloud sync, multi-device (Phase 2).
- India/CBSE curriculum, other languages (later; the architecture keeps a `region` setting).
- Multiplayer, leaderboards against strangers, chat.
- Runtime LLM calls (Phase 2; MVP uses AI only at build time for content).

## 5. Core experience (MVP)
### 5.1 First run
1. Parent sets up: creates a 4-digit parent PIN, enters the kid's nickname and grade (2 or 3), and sets the **daily goal and daily limit in minutes**.
2. Parent picks a **starting point** on the skill map (default: Jungle Warm-up). All skills before it are marked *pre-mastered*: crowned, but still put into spaced review, so known skills come back as quick, confidence-building reviews.
3. Kid builds an avatar and meets **Kukoos**, who explains the mission: fly from Earth's animal lands up to the planets.
4. *(A placement quiz is deferred to Phase 2; the parent-picked start replaces it.)*

### 5.2 Home = World map
- A vertical, scrolling, Duolingo-style **path of nodes** through themed worlds. The story: **Kukoos's journey from Earth to space**. The first worlds are animal habitats (jungle, savanna, ocean); then Kukoos launches into space (Moon, Mars, and beyond in Phase 2). Clearing a world **rescues an animal friend** or **discovers a planet**, which is added to a collectible sticker album.
- Node states: locked 🔒 → available (bouncing) → in progress (progress ring) → mastered (gold crown).
- Each world ends in a **Boss challenge** (a mixed review of the world; passing unlocks the next world plus a cutscene).
- Top bar: streak flame 🔥, gems 💎, daily goal ring, avatar (opens the profile/shop).

### 5.3 Lesson (the core loop, 3–5 minutes)
- 10 questions: ~70% current skill, ~20% due reviews, ~10% stretch.
- Progress bar at the top. A combo counter appears at 3+ correct in a row ("You're on fire!").
- **Correct:** chime, mascot cheers, green check banner, short TTS praise ("Awesome!", "Math wizard!").
- **Wrong:** soft sound, Kukoos encourages ("Almost! Let's look together"), a visual hint (blocks/number line), retry. On a second miss, a worked example is shown and the question comes back later in the lesson.
- **Misconception-aware feedback:** the checker recognizes common regrouping bugs and gives a targeted hint instead of a generic one:
  | Bug | Example | Targeted hint |
  |---|---|---|
  | Smaller-from-larger | 36 − 28 → 12 (did 8 − 6) | "Can we take 8 from 6? Let's trade a ten for 10 ones!" |
  | Forgot the carry | 47 + 38 → 75 | "7 + 8 = 15. Where does the extra ten go?" |
  | Borrowed but didn't reduce | 52 − 28 → 34 | "We traded a ten, so how many tens are left?" |
  | Borrow across zero | 403 − 178 → 235 (the 0 became 10, not 9) | "No tens to trade! Let's open a hundred first." |
  | Off by one | answer ± 1 | "So close! Count once more." |
  Misconceptions are logged per profile and shown in the Parent zone.
- **End of lesson:** confetti, XP count-up, gems earned, accuracy, a treasure chest on perfect lessons, daily goal progress, streak update.

### 5.4 Rewards & motivation
- **XP:** per lesson (base 10, +5 perfect, +combo bonus). Drives levels.
- **Gems ("star crystals"):** earned from lessons, chests and badges. Spent in the **avatar shop**: animal costumes, space helmets, jetpacks, pet companions (fox cub, baby penguin), and map themes. Kukoos can wear items too.
- **Streak:** a day counts when the **daily goal minutes** are met. **Streak freeze** is earned every 7 days (hold max 2). Milestone celebrations at 3/7/14/30/50/100 days, shown as a rocket climbing higher.
- **Badges:** milestone achievements, themed (e.g., "Carry Captain", "Borrow Boss", "Zero Hero" for borrowing across zero, "Astronaut" for a 7-day streak, "Animal Rescuer" for clearing a world, "100 Correct"), shown in a trophy room.

### 5.4a Time budget (minutes)
- **Daily goal** (parent-set: 5 / 10 / 15 / 20 min) is the target. A ring in the top bar fills up, and meeting it extends the streak and celebrates ("Mission complete!").
- **Daily limit** (parent-set: 15 / 20 / 30 / 45 min, or off) is the maximum. When it's reached, the current lesson finishes, then Kukoos says goodnight and new lessons lock until tomorrow. A parent PIN can grant +10 min.
- **Only active time counts:** time inside lessons; paused when the tab is hidden or after 60s with no input. The map and shop count against the limit but not toward the goal.
- At 2 minutes left, a gentle heads-up: "2 more minutes of space travel today!"
- **Levels:** profile level from total XP with a level-up fanfare.

### 5.5 Parent zone (behind a PIN plus a simple math gate)
- Per-profile dashboard: skill map heatmap (mastery per skill), accuracy and minutes per day (last 14 days), "needs practice" list, **top misconceptions** (e.g., "smaller-from-larger: 6 times this week"), recent badges.
- Settings: daily goal minutes, daily limit minutes, +10 min override, starting point, sound/music/TTS on/off, TTS speed, worlds enabled.
- Data: export/import a JSON backup, reset a profile, manage profiles.

## 6. Question kinds (MVP)
| Kind | Example | Input |
|---|---|---|
| `numeric` | 34 + 25 = ? | On-screen big keypad (no OS keyboard) |
| `column` ⭐ | Vertical `  403 / − 178` | Enter digits right-to-left. Carry/borrow boxes above each column; tapping a digit "breaks" it (cross out 4 → 3, ones become 13). Steps can be guided (Kukoos highlights the current column) or free |
| `tradeBlocks` ⭐ | Show 36 − 28 with base-ten blocks | Tap a ten rod to "trade" it into 10 ones (animated), then remove blocks |
| `mcq` | Which is 3 groups of 4? | 3–4 large picture/number tiles |
| `compare` | 452 ☐ 425 | Tap <, =, > |
| `array` | Rows × columns → total | Tap/visual + keypad |
| `baseTen` | Show 243 with blocks | Drag or tap hundreds/tens/ones |
| `trueFalse` | 7 + 8 = 16? | Two big buttons |

Phase 2 adds: number line, clock, coins, fraction bars, bar graphs, measurement, story word problems.

## 7. Key acceptance criteria (examples; each feature spec expands on these)
- **Given** a kid answers wrong, **when** feedback shows, **then** no score or hearts are deducted and a visual hint is offered.
- **Given** the daily goal is met before 11:59 pm local time, **when** the next day starts, **then** the streak = previous + 1.
- **Given** a missed day and a streak freeze held, **when** the app opens, **then** one freeze is consumed, the streak is preserved and a friendly message explains it.
- **Given** a skill's mastery ≥ 0.85 over ≥ 15 attempts across ≥ 2 sessions, **then** the node shows a crown and the next node unlocks.
- **Given** the daily goal is 10 min, **when** active lesson time reaches 10:00, **then** the goal ring completes with a celebration and today counts toward the streak.
- **Given** the daily limit is reached mid-lesson, **when** that lesson ends, **then** a "Great job today! Kukoos is going to sleep" screen appears and new lessons are locked until the next local day or a parent +10 min override.
- **Given** the app is in a background tab or idle for > 60s, **then** active time stops accumulating.
- **Given** the question 36 − 28 and the answer 12, **then** the "smaller-from-larger" hint is shown and the misconception is logged.
- **Given** the starting point is "Safari Carry Camp", **then** all Jungle Warm-up skills are crowned and appear only as spaced reviews.
- **Given** airplane mode, **when** the app is launched from the home screen, **then** all lessons are playable.

## 8. Look & feel (Duolingo-inspired, original assets)
- Flat vector art, rounded geometric shapes, bright saturated palette, generous whitespace.
- "Chunky" 3D buttons (solid bottom lip that compresses on press), rounded cards, thick progress bars.
- Rounded friendly font: **Nunito** or **Baloo 2** (Google Fonts).
- **Mascot: Kukoos**, an original, imaginary bird. Round, chubby, big expressive eyes, bright plumage, small wings that flap when excited. Gets a space helmet once the journey reaches space. Animated states: idle, happy, cheer (flaps and spins), thinking (head tilt), encourage (wing pat), sleep (end of daily limit), fly (world transitions). Built in **Rive** with a state machine. Its design must stay clearly distinct from Duolingo's owl: different silhouette and colors, no green.
- **Themes:** animals (jungle, savanna, ocean) for the early worlds, then space (Moon, Mars) for the 3-digit worlds. Animal friends appear in word problems and as collectible stickers.
- Bouncy micro-interactions (spring physics), with every animation disabled under reduced motion.
- **We copy the feel, never Duolingo's assets, characters or exact brand colors.**
