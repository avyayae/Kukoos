# Plan — Feature 010 Profiles & Avatar Builder

## Approach
- **Domain (`src/domain/avatar.ts`):** the `AVATAR_OPTIONS` part lists, the `Avatar` type, `DEFAULT_AVATAR`, `parseAvatar(raw)` (unknown fields fall back to defaults), `EARNED_ITEMS` rules (crown: level ≥ 5; star cape: `astronaut` badge; jetpack: ≥ 1 boss beaten), `itemUnlocked`, `howToEarn`, `randomAvatar(seed, unlocks)` (seeded RNG), and `avatarName(avatar)` for the accessible label.
- **Data:**
  - `profiles` gains `list()`, `create({ nickname, grade })`, `update(id, patch)`, `setCurrent(id)` and `remove(id)`.
  - `remove` deletes every row with that `profileId` from all sync tables plus its per-profile settings row, adds outbox `delete` entries, refuses to remove the last profile, and moves `currentProfileId` to another kid.
  - `ensureCurrent` is unchanged: a fresh device still gets "Explorer" with `avatar: null`, and onboarding starts because the avatar is null.
- **ProfileProvider (inside `DataProvider`):**
  - It holds `{ profile, profiles, switchTo, refresh, picked }`, and `useCurrentProfile()` reads it. So every hook keyed on `profile` (progress, wallet, badges, time, journey) reloads when the kid switches, without a page reload.
  - `picked` is per session: with ≥ 2 profiles the map shows the picker until one is chosen.
- **UI:**
  - `src/ui/AvatarArt.tsx`: one layered SVG (back hair/cape/jetpack → shoulders → neck → head → ears → hair → face → glasses → hats → helmet dome).
  - The skin and hair palettes are new tokens (`--mq-av-*`).
  - `features/profiles/`:
    - `AvatarBuilder`: preview, category tabs and tile grid, plus Surprise me and Save.
    - `Onboarding`: Welcome → Name → Builder.
    - `WhoIsPlaying` (the picker) and `MeScreen` (`/me` and `/me/look`).
  - `features/grownups/ProfilesSection`.
  - **Map header:** the avatar button replaces the small Kukoos.
  - **Goodnight:** avatar next to Kukoos.
  - **Trophy room:** avatar at the top.
- **Gate order on `/`:** picker (≥ 2 profiles and none picked this session) → onboarding (current avatar null) → Goodnight (locked) → map.

## Files
```
src/domain/avatar.ts (+ index exports)
src/data/{profiles.ts, ProfileProvider.tsx, profileContext.ts}, repositories/{types,dexie,null}.ts, hooks.ts
src/ui/AvatarArt.tsx, src/ui/avatar.css, tokens (+ skill mirror)
src/features/profiles/{AvatarBuilder,Onboarding,WhoIsPlaying,MeScreen}.tsx, copy.ts
src/features/grownups/ProfilesSection.tsx
src/features/map/MapScreen.tsx, rewards/{Goodnight,TrophyRoom}.tsx, app/routes.tsx
tests/unit/domain/avatar.test.ts, data/profiles.test.ts, ui/avatarArt.test.tsx, features/{builder,onboarding,profiles}.test.tsx
tests/e2e/profiles.spec.ts (+ helpers: finishOnboarding; existing specs onboard first)
```

## Test plan
| AC | Test |
|---|---|
| AC1 | `avatar.test.ts`: parse fallbacks, unlock rules, seeded random only picks unlocked items |
| AC2 | `avatarArt.test.tsx`: every hair × hat × extra renders; accessible name |
| AC3–AC4 | builder and onboarding component tests |
| AC5–AC7 | `profiles` data tests (create, update, remove isolation, last-profile guard) + provider switch test |
| AC8 | map header / `/me` component test |
| AC9 | `profiles.spec.ts` |

## Risks
- **Every existing e2e** starts on a fresh device, which now shows onboarding. Lessons opened by URL aren't gated (only `/` is), and a `finishOnboarding()` helper covers map tests.
- **Deleting a profile is destructive.** It needs the typed nickname, and a backup reminder sits next to it.
