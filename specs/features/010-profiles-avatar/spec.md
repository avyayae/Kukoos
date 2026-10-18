# Feature 010 — Profiles & Avatar Builder

**Status:** Approved (2026-10-18)  ·  **Constitution check:** §1.4 can play without reading (picture-first picker and builder, tap-to-hear), §1.5 privacy (nickname only, no real names, ages or photos needed; nothing leaves the device), §3.5 local-first (all data already keyed by `profileId`), §1.3 no dark patterns (no paid or locked-behind-purchase items)

## Why
Today there is one hidden profile called "Explorer". Product spec §5 promises that the kid **builds an avatar** and sees it in the top bar, and that a sibling or friend can have **their own profile** on the same device. An avatar she designed herself makes the app feel like *hers*. It's also where future rewards (the v1.1 shop with gems) will be worn.

## User stories
- As a kid, I want to make my own explorer character and change it whenever I like, so the app feels like mine.
- As a kid, I want to tap my picture to say "it's me playing", so my stars and streak stay mine.
- As a parent, I want to add a profile for a sibling or friend, and rename or remove profiles, so progress never gets mixed up.

## Scope
1. **First run ("Hi, I'm Kukoos!"):** on a fresh device, a short 3-step welcome instead of the silent "Explorer":
   1. Name: a big nickname field with suggestions (no real name needed).
   2. Build your explorer (the avatar builder).
   3. Kukoos says hello and points at Play.

   The grown-up sets the grade and starting point later in Grown-ups (as today). Existing installs keep their progress: the current profile goes through the builder once (name prefilled "Explorer").
2. **Avatar builder (original layered SVG kid character, no third-party art):** pick **skin tone** (6), **hair style** (short, curly, bob, long, ponytail, two buns), **hair color** (6, incl. a fun purple), **eyes** (round, smiley, sparkly), **outfit color** (6), a **hat** (none, space helmet, safari hat, beanie, bunny ears, crown), and an **extra** (none, glasses, bow tie, star cape, jetpack).
   - Every choice is a big picture tile with a spoken name.
   - A live preview sits on top, and a 🎲 "Surprise me!" button picks a random combination.
   - Saved as `profile.avatar` (`{ skin, hairStyle, hairColor, eyes, outfit, hat, extra }`).
3. **Earned items (no shop yet):** a few items unlock with real progress, not purchases: crown at level 5, star cape with the Astronaut badge (7-day streak), jetpack after clearing a world boss. Locked tiles show a soft lock and "Earn it by …" (spoken). The gem shop stays v1.1.
4. **Avatar everywhere:** the map header shows her avatar (replacing the small Kukoos there), the Goodnight screen shows avatar plus Kukoos, and the trophy room shows the avatar on top.
5. **Profiles:**
   - **Me screen (`/me`):** opened by tapping the avatar. It shows the avatar, name, level and "Change my look".
   - **"Who's playing?" picker:** shown on launch when there are 2 or more profiles. Big avatar cards plus names; tapping one switches everything (map, stars, streak, minutes) to that kid.
   - **Grown-ups → Profiles:** add (max 4), rename, set grade, and delete. Delete asks for confirmation, removes only that kid's rows, and needs typing the nickname.
6. **Daily time stays per profile** (already true), and the picker never resets a lock: switching kids can't dodge a sibling's limit, because each kid has their own limit.

## Acceptance criteria
- **AC1 (avatar model):** `Avatar` is validated (unknown parts fall back to defaults), `randomAvatar(seed)` only picks unlocked items, and `itemUnlocked(item, progress)` follows the earned rules (level / badge / boss). Pure, unit-tested.
- **AC2 (render):** `<AvatarArt avatar size>` renders every combination of hair style × hat × extra without errors. It has an accessible name ("Explorer with curly hair and a space helmet") and uses only tokens and avatar palette colors.
- **AC3 (builder):** each category is a radio group of picture tiles (≥ 56px). Choosing updates the preview immediately, and Save writes `profile.avatar`. Locked items can't be chosen, and say how to earn them when tapped.
- **AC4 (first run):** a fresh device shows Welcome → Name → Builder → Map. The name is required (1–12 chars, letters/spaces), with suggestions offered. An existing profile with `avatar: null` sees the builder once with its current name.
- **AC5 (current profile app-wide):** a `ProfileProvider` holds the current profile. Switching re-loads progress, wallet, badges, daily time and journey for the new kid without a page reload.
- **AC6 (picker):** with ≥ 2 profiles, launch shows "Who's playing?". Choosing sets `currentProfileId` and goes to the map. With 1 profile, the picker is skipped.
- **AC7 (manage):** in Grown-ups, add (≤ 4), rename, grade and delete work. Delete removes that profile's rows from every table (and adds outbox deletes), keeps other kids' data, and never deletes the last profile.
- **AC8 (header & me):** the map header shows the avatar (tap → `/me`). `/me` shows the avatar, name, level and "Change my look", and goes back to the map.
- **AC9 (E2E):** a fresh device onboards (name + avatar) → map header shows the avatar. Adding a second profile in Grown-ups → the picker appears after reload → switching shows separate crystals. A reload keeps the chosen look.

## UX notes
- **Builder layout:** preview on top (large, on a soft spotlight), category tabs as big icons (🙂 skin, 💇 hair, 👀 eyes, 👕 outfit, 🎩 hat, ✨ extra), and a grid of tiles below. Save stays bottom-anchored.
- **Sound and motion:** choosing a tile pops the preview (`pop`) with the `tap` sound. Save plays `badge` and Kukoos cheers. With reduced motion, the preview cross-fades instead.
- **Copy:** "Make your explorer!", "Surprise me!", "Looking great!". Locked tiles say "Earn it: get to level 5".
- **Picker:** up to 4 big cards in a 2×2 grid, with a small "Grown-ups" link at the bottom (to add a kid).

## Out of scope
- The gem shop and spending crystals (v1.1), and Kukoos wearing items.
- The parent PIN and dashboard (F11). Profile management uses the existing math gate.
- Photos, real names, birthdays and cloud accounts.

## Decisions (parent, 2026-10-18)
- **Avatar style:** kid characters (skin tone, hair style and color, eyes, outfit, hat, extra).
- **Earned items:** crown (level 5), star cape (Astronaut badge), jetpack (a world boss). Everything else is free; no gem shop yet.
- **Profiles:** up to 4 kids with the "Who's playing?" picker.
