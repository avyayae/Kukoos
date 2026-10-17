# Feature 007 — World Map & Kid Navigation

**Status:** Done (PR #6, merged 2026-10-17)  ·  **Constitution check:** §1.4 can play without reading (tap-to-hear everywhere, one obvious next step), §2.1 mastery-based progression (nodes unlock on crowns), §1.3 no dark patterns (no endless loop; map is calm), §3.7 accessible & reduced motion

## Why
A 7-year-old can't use a long text list of 23 missions: too much reading, too many choices, and no sense of "where am I?". F07 replaces it with the thing kids already understand from games: **a journey map**. Kukoos flies from the jungle up into space, and the kid always sees **one bright "play next" step**. Everything a kid can tap **speaks its name**, so reading is optional. The full mission list moves behind a grown-up gate.

## Design plan (frontend-design pass)
**Subject & audience:** a 2nd-grader's math adventure with a bird mascot traveling Earth → space. **Primary job:** "show me what to play next, and how far I've come."

**The one memorable thing:** the map **is** the journey. It's one continuous vertical world that starts in a green jungle at the bottom and rises through the savanna, the ocean and a twilight sky into a starry space scene at the top, with the Moon and Mars. Kukoos sits on the current node. Everything else (header, nav, mission sheet) stays quiet and disciplined.

**Color** (new tokens; the existing brand tokens are unchanged):
| Token | Hex | Use |
|---|---|---|
| `--mq-map-jungle` | `#bfe6a8` | jungle band (deeper than the picker tint so nodes pop) |
| `--mq-map-savanna` | `#ffd98f` | savanna band |
| `--mq-map-ocean` | `#8fd3f4` | ocean band |
| `--mq-map-twilight` | `#6c5bb8` | sky → space transition |
| `--mq-map-space` | `#141130` | Moon and Mars bands (already `--mq-world-space`) |
Bands blend with long vertical gradients rather than hard edges. Silhouettes (leaves, savanna grass, waves, craters) are flat shapes in the band's darker shade, with no outlines (mathquest-ui illustration rules).

**Type:** Baloo 2 for world names, set large on the map (they're landmarks, not labels). Nunito for everything else. Sentence case, no all-caps labels except the existing Button3D convention.

**Layout:** a single centered column. Nodes zigzag on a gentle S-curve (offsets −72 / 0 / +72px) joined by a thick dashed path. The world name floats at the start of each band. A fixed bottom bar, and a floating "Play" button above it.
```
┌──────────────────────────────┐
│ (Kukoos)  Hi Explorer!   🔊   │  slim header: greeting is tap-to-hear
│                              │
│   ★  ·  ★     MARS     ★     │  space band (stars), world name as landmark
│            ( 🔒 )            │
│     ( 🔒 )                   │
│ ~~~~~~~~ twilight ~~~~~~~~~  │
│   OCEAN REEF  ~ waves ~      │
│            ( 👑 )            │
│   ( ◔ )  ← Kukoos sits here  │  current node: ring = mastery, gentle pulse
│     "Start here!"            │
│            ( 👑 )            │
│ SAVANNA  ~ grass ~           │
│ ┌──────────────────────────┐ │
│ │   ▶  PLAY: Trade a ten    │ │  floating Play-next (always visible)
│ └──────────────────────────┘ │
├──────────────────────────────┤
│  🗺️ Map    🔁 Review(2)   🔒  │  bottom bar: big icons + spoken labels
└──────────────────────────────┘
```
**Mission sheet** (tap a node): a bottom sheet with a big Kukoos and the mission name read aloud, a mastery ring or 👑, a big PLAY button, and "Not yet!" for locked nodes, explaining which mission comes first.

**Principles:** (1) one obvious next step, (2) every kid control can be heard, (3) progress is a place you can see, (4) calm map, lively moments.

**Review against generic defaults:** a first draft used *identical rounded cards per world*. That's the SaaS-card kit, and it's still a list, so I replaced it with the continuous band world. A tracked uppercase eyebrow above each world name became the world name itself as a large landmark. Idle bouncing on every node became one beacon on the current node only (motion-design principle 1).

## User stories
- As a **kid**, I open the app and see where Kukoos is, with one big button to play the next mission.
- As a **kid**, when I tap anything (a node, a button, the bar) I **hear** what it is, so I don't need to read.
- As a **kid**, I can see locked missions ahead and crowns behind me, so I know how far I've come.
- As a **kid**, finishing a world opens the next one (and the jump to space feels special).
- As a **parent**, I can still open any mission and my settings, but only after a quick grown-up check.

## Scope
### Navigation model
| Route | Screen | Who |
|---|---|---|
| `/` | **Map** (home) | kid |
| `/lesson/:skillId`, `/lesson/review`, `/lesson/boss/:worldId` | Lesson | kid |
| `/grown-ups` | Grown-ups (behind the gate) | parent |
| `/grown-ups/missions` | All missions list (today's picker, open-access) | parent |
| `/practice` | redirects to `/` | — |

The old Start splash goes away: the app opens straight to the map, and a first-launch hello from Kukoos plays once.

### Rules (pure domain, `src/domain/engine/journey.ts`)
- **Unlocked** = all prereqs crowned (pre-mastered counts). The first skill is always unlocked.
- **Current mission** (`nextMission`):
  1. if ≥ 3 reviews are due → **Review**
  2. else the first unlocked, not-crowned skill in path order
  3. else, if a world's boss is ready and not yet beaten → that **boss**
  4. else **Review** if any are due
  5. else the last skill ("Free play")
- **Boss node** (end of each world): unlocked when all of that world's skills are crowned. It plays a **world challenge**: 10 questions across the world's skills at difficulty 3–4, built by `composeBoss`. Passing (≥ 80% first-try) marks the world **cleared**. Clearing a world is required to enter the next world's first node. This adds to the prereq rule, and pre-mastered worlds count as cleared.
- **World cleared** is derived from lessons with `mode: 'boss'` and `worldId` (new optional fields on `LessonRow`).

### Map screen
- Bands, silhouettes, world landmarks, a dashed path, and nodes: locked 🔒, available, current (beacon + "Start here!" + Kukoos perched), in progress (mastery ring), crowned 👑, and boss (big node, world icon).
- It opens by gliding to the current node, or jumps there with reduced motion.
- The **Play button** always shows the current mission: "Play: Trade a ten", "Play: Review", "Play: Boss — Savanna". Tapping it starts the lesson directly.
- **Tap a node** → the mission sheet (name read aloud). Locked → Kukoos says which mission comes first, and nothing plays.
- **World unlock moment** (motion-design): the first time a world opens, its band lights up, the first node pops, and between Ocean and Moon a **rocket launch** plays (CSS/SVG; Lottie later in F09). It shows once per profile.

### Bottom bar (kid)
- 🗺️ **Map** · 🔁 **Review** (badge with the due count, disabled with "Nothing to review" when none) · 🔒 **Grown-ups**.
- Each item is ≥ 64px tall, icon above label, and speaks its label when tapped. Trophies come in F08.

### Tap-to-hear
- A `useSpeakOnTap` helper. Kid buttons and nodes speak their label (via the existing TTS) on tap when "read aloud" is on, debounced so it never stacks. It's a global setting, with the toggle moving to the map header (🔊/🔇), kept in memory until F11.

### Grown-up gate
- Tapping 🔒 asks a **grown-up question**: a 2-digit × 1-digit multiplication (e.g. "13 × 4"), with four answer buttons. A right answer opens `/grown-ups` for this visit; a wrong one goes back to the map. No PIN yet (F11).

### Lesson changes
- Exit and "Continue" return to the map, which then glides to the (possibly new) current node.
- The old `/practice` picker becomes `/grown-ups/missions`.

## Acceptance criteria
- **AC1 — Journey rules:** `isUnlocked`, `worldCleared`, `nextMission` follow the rules above. A table test covers a fresh kid, a starting point at Savanna, a world with all skills crowned and the boss unbeaten, a boss beaten, 3+ reviews due, and everything crowned.
- **AC2 — Boss composer:** `composeBoss(worldId, progress, seed)` returns 10 questions using only that world's skills, difficulty 3–4, kinds each skill supports. Deterministic.
- **AC3 — Boss result:** a boss lesson saves with `mode: 'boss'` and `worldId`. ≥ 80% first-try marks the world cleared, and the next world's first node unlocks.
- **AC4 — Map renders the journey:** all 23 skill nodes + 5 boss nodes in path order, bottom (jungle) to top (Mars), with correct states from progress. Locked nodes don't start lessons.
- **AC5 — One next step:** the Play button label and destination match `nextMission`, and the current node has the beacon and "Start here!". Exactly one element idles (motion-design rule).
- **AC6 — Tap-to-hear:** tapping a node, a bottom-bar item, or the Play button speaks its label (mocked TTS). With read-aloud off, nothing speaks.
- **AC7 — Mission sheet:** tapping an available node opens a sheet with the name, mastery/crown and PLAY. PLAY starts that lesson. A locked node's sheet names the mission that comes first.
- **AC8 — Grown-up gate:** 🔒 shows a multiplication question with 4 choices. Right → `/grown-ups`. Wrong → back to the map. `/grown-ups` opened directly also shows the gate first. `/grown-ups/missions` lists all missions (open-access).
- **AC9 — Navigation:** `/` is the map; `/practice` redirects to `/`; lesson exit/complete return to `/`; Review in the bar opens `/lesson/review` (disabled when nothing is due).
- **AC10 — World unlock moment:** the first time a world becomes available it plays once (stored per profile, in the `settings` row for the profile), and never again after reload. With reduced motion it's a static highlight.
- **AC11 — Layout & a11y:** works at 360×740, 390×844, iPad and desktop. Nodes and bar items are ≥ 56/64px. Map nodes are buttons with labels like "Mission 2, Add with carrying, mastered". Keyboard: Tab through nodes, Enter opens the sheet. No console errors.
- **AC12 — E2E:** fresh kid: the map shows jungle node 1 as current and the Play button says it. Set the starting point (through the gate) and the current node moves to "Trade a ten" and the jungle shows crowns. Play from the Play button, finish, and land back on the map. The gate rejects a wrong answer.

## Out of scope
- XP, gems, streaks, trophies tab, stickers for cleared worlds (F08).
- A natural/recorded voice, Rive Kukoos, Lottie rocket and sound effects (F09; this feature uses the current TTS and CSS/SVG motion).
- PIN and parent dashboard (F11).

## Decisions (approved 2026-10-17)
1. **Bosses gate the next world** (≥ 80% first-try), retryable any time.
2. **Grown-up gate** is a multiplication question; a PIN comes in F11.
3. **No Start splash:** the app opens straight onto the map.
