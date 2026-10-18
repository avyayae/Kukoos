# Feature 009 — Kukoos Comes Alive: Mascot, Sound & Voice

**Status:** Done (PR #8, merged 2026-10-18)  ·  **Constitution check:** §1.2 no shame (soft "not yet" sound, never a buzzer), §1.4 can play without reading (a better voice, Kukoos "talks"), §1.5 privacy (no cloud voice, no network at runtime), §3.4 AI never decides answers (build-time praise lines only, validated by a script), §3.6 offline always works, §3.7 reduced motion

## Why
F05–F08 gave her the learning loop and the rewards, but Kukoos is still a static picture, the app is silent apart from a robotic browser voice, and celebrations have no sound. Product spec §5.3 and the mathquest-ui motion/sound table promise a mascot that **reacts** (cheers, encourages, sleeps), sounds that pair with every feedback moment, and a friendlier voice. This is the "it's delightful" milestone (roadmap week 3).

## User stories
- As a kid, I want Kukoos to hop when I'm right, pat me on the back when I'm not yet right, and fall asleep at goodnight, so it feels like a friend.
- As a kid, I want happy sounds when I get things right and win rewards, so success feels exciting.
- As a kid, I want the voice to sound friendly, not robotic, and I want Kukoos to look like it's talking when it speaks.
- As a parent, I want to pick the nicest voice on our device, set its speed, and turn sounds off, so it suits her and our home.

## Scope (recommended choices; see Decisions needed)
1. **Animated Kukoos (SVG + CSS, no Rive):** one layered SVG (body, belly, wings, crest, eyes with eyelids, beak, feet) driven by mood classes. Moods: `idle` (blink every few seconds plus a gentle bob), `happy` (hop), `cheer` (flap plus a spin), `think` (head tilt plus eyes up), `encourage` (wing pat), `sleep` (eyes closed, slow breathing, zzz), `fly` (wings flap, lift off). **Talking:** the beak opens and closes while speech plays. **Space helmet** once her current mission is on the Moon or Mars. Reduced motion: a static pose per mood (sleep keeps its closed eyes), and no beak flapping.
2. **Sound effects (synthesized, no audio files):** a tiny Web Audio engine (`src/audio/sfx.ts`) makes each sound from tones, so there's nothing to license or download and it works offline. Sounds: tap, correct (ding), not-yet (soft boop), combo, mission complete (fanfare), unlock, XP tick, chest, badge, level up, goal, streak, freeze, goodnight lullaby. Every `RewardEffect` already carries a `sound` key (F08). Sounds are quiet by default, never harsh, and silent while the tab is hidden.
3. **Better voice (on-device):** the app ranks the device's English voices (names with *Natural / Neural / Enhanced / Premium / Google* first), so Edge's natural voices and iPad's enhanced Siri voices win automatically. Grown-ups gets a **voice picker** with a "Test voice" button and a **speed** setting.
4. **Kukoos lines:** praise, encouragement and reward lines grow from a few to a bank of ~150 short, varied, world-themed lines (`content/lines.en.json`). They're AI-written **at build time**, then checked by a script: ≤ 8 words for praise, reading level, banned words ("wrong", "fail", …), and no numbers (numbers always come from code). Lines rotate with the seeded picker, so she rarely hears the same one twice in a row.
5. **Settings that stick:** read-aloud on/off, sound on/off, volume, voice and speed are saved per device. Today read-aloud resets on reload.

## Acceptance criteria
- **AC1 (moods):** Given each mood, when Kukoos renders, then it has that mood's class and pose. Given reduced motion, then no animation runs and the pose is static.
- **AC2 (lesson reactions):** correct → `happy` (`cheer` at combo ≥ 3), not yet → `encourage`, worked solution → `think`, mission complete → `cheer`, Goodnight → `sleep`, world unlock → `fly`.
- **AC3 (talking):** Given read-aloud is on, while an utterance plays (between `onstart` and `onend`/`onerror`), then Kukoos's beak animates. It stops when speech ends or is cancelled.
- **AC4 (helmet):** Given the current mission is in the Moon or Mars world, then Kukoos wears the space helmet on the map and in lessons.
- **AC5 (sfx engine):** `playSfx(key)` plays the named sound once. It's a no-op when sound is off, the page is hidden, or Web Audio is missing, and it never throws. The audio context unlocks on the first tap (browser autoplay rules).
- **AC6 (sfx pairing):** correct, not yet, combo, mission complete, each reward moment (its `sound` key), the unlock moment and Goodnight each play their sound exactly once. Keypad and buttons play a quiet tap.
- **AC7 (voice ranking):** given a list of voices, `rankVoices` puts en-US natural/neural/enhanced voices first, then other en-US voices, then other English voices. It's deterministic and unit-tested with real voice-name samples (Edge, Chrome, Safari/iPad, Android).
- **AC8 (voice settings):** Grown-ups → Sound & voice shows the ranked voices, "Test voice" says a sample line, and speed is 0.8–1.1. When chosen, all speech uses that voice and speed, and it persists across reloads. A saved voice that's no longer available falls back to the top-ranked one.
- **AC9 (line bank):** `content/lines.en.json` passes the validation script in CI (word count, banned words, no digits, unique lines, every world and moment covered). Picking is seeded and never repeats the previous line.
- **AC10 (persistence):** read-aloud, sound on/off and volume persist per device across reloads (global settings row).
- **AC11 (E2E):** a lesson plays with sound on (an sfx spy records `correct` and `complete`). With sound off, nothing plays. The voice picker persists a choice. Kukoos shows `cheer` on Mission complete and `sleep` on Goodnight.

## UX notes
- **Kukoos** keeps the current silhouette and colors (orange body, purple wings and crest; no green, nothing owl-like). Its animations are transform-only, so they run at 60 fps on a mid-range tablet. One idle blink every 3–6s; the bob runs only on the map's current node and the lesson's Kukoos.
- **Sound** volumes: tap ≈ 0.15, feedback ≈ 0.4, fanfare ≈ 0.5. The not-yet boop is a low, soft two-note sound, never a buzzer. The goodnight lullaby is 3 seconds and never loops.
- **Grown-ups → "Sound & voice" card:** sound on/off, volume slider, voice dropdown (shown as "Aria (natural)"), speed slider, "Test voice".
- **The map header** speaker toggle stays as is (read-aloud). A 🔔 sound toggle isn't added for kids; that lives in Grown-ups.

## Out of scope
- Rive (could replace the SVG later behind the same `<Kukoos mood>` API).
- Recorded voice clips and cloud text-to-speech (no network at runtime, privacy §1.5).
- Background music. Avatar costumes on Kukoos (F10 shop).

## Decisions (parent, 2026-10-17)
- **Mascot:** SVG + CSS animation in code (no Rive for now).
- **Voice:** the best on-device voice, auto-ranked, plus a voice picker, test button and speed in Grown-ups.
- **Sounds:** synthesized in code with Web Audio (no audio files).
