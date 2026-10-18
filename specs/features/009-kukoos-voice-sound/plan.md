# Plan — Feature 009 Kukoos, Sound & Voice

## Approach
- **Device audio settings (data):**
  - The `global` settings row gains `readAloud?`, `soundOn?`, `volume?`, `voiceURI?` and `speechRate?`.
  - A new `device.audio()` / `device.setAudio()` repo section; the null store keeps them in memory.
  - `src/app/AudioProvider.tsx` loads them, provides `ReadAloudContext` and a new `AudioPrefsContext` (`src/ui/audioPrefs.ts`), and pushes them into the speech and sfx modules.
- **Speech (`src/audio/tts.ts`, `src/audio/voices.ts`):**
  - `rankVoices(voices)` is pure and unit-tested.
  - `configureSpeech({ voiceURI, rate })`.
  - A speaking store (`onstart` → true, `onend`/`onerror`/`cancel` → false) read via `useSpeaking()` (`useSyncExternalStore`).
  - `useVoices()` listens to `voiceschanged`.
- **Sfx (`src/audio/sfx.ts`):**
  - A lazy `AudioContext` that unlocks on the first pointer or key input.
  - Sounds are data: note lists (frequency, start, duration, wave, gain) plus a short envelope.
  - `playSfx(key)`: no-op when sound is off, the page is hidden or Web Audio is missing.
  - In dev and e2e builds every play is logged to `window.__kukoosSfx` (for the e2e spy).
- **Kukoos (`src/ui/KukoosArt.tsx` + `src/ui/kukoos.css`):**
  - One layered SVG: wings, eyelids, upper/lower beak, crest, feet and an optional helmet.
  - Mood animations target the parts via `[data-mood]` (`transform-box: fill-box`); blink is a separate idle loop, and talking moves the lower beak.
  - `<Kukoos mood size beat talks helmet>` keeps its API; `KukoosPlaceholder` becomes the static art.
  - Reduced motion → no animation, static mood poses.
- **Pairing:**
  - **LessonScreen:** correct, not yet, combo (3/5/10) and mission complete.
  - **Moments:** reward moments use `EFFECT_SOUNDS`; the XP count-up uses `xp`.
  - **Other screens:** world unlock plays `unlock` and Kukoos `fly`; Goodnight plays `lullaby` and Kukoos `sleep`.
  - **Taps:** Button3D and keypad keys play `tap`.
  - **Helmet:** shown in Moon/Mars lessons and on the map when the current node is in space.
- **Lines (`content/lines.en.json`):** a bank of praise per world, not-yet, encourage, combo and complete lines. `pickFresh(list, seed, previous)` never repeats the previous line. `tests/unit/content/lines.test.ts` validates it in CI: word limits, banned words, no digits, uniqueness and coverage.

## Files
```
src/audio/{tts,voices,sfx}.ts
src/app/AudioProvider.tsx, src/ui/audioPrefs.ts
src/data/{rows,device}.ts + repositories (device section)
src/ui/{KukoosArt,Kukoos,KukoosPlaceholder}.tsx, src/ui/kukoos.css
src/features/grownups/SoundVoiceSection.tsx
src/features/lesson-player/{LessonScreen,LessonComplete,copy}.ts(x), features/rewards/*, features/map/*
content/lines.en.json
tests/unit/audio/{voices,sfx,tts}.test.ts, tests/unit/ui/kukoos.test.tsx, tests/unit/content/lines.test.ts,
tests/unit/features/soundVoice.test.tsx, tests/e2e/sound.spec.ts
```

## Test plan
| AC | Test |
|---|---|
| AC1–AC4 | Kukoos component tests (mood attribute, helmet, talking from the speaking store, reduced motion) and lesson/goodnight mood checks |
| AC5–AC6 | sfx unit tests with a fake AudioContext; LessonScreen + moment tests spy on `playSfx` |
| AC7 | `rankVoices` table test with real voice names |
| AC8, AC10 | data test + SoundVoiceSection component test |
| AC9 | `lines.test.ts` |
| AC11 | `sound.spec.ts` using `window.__kukoosSfx` |

## Deviations (recorded during implementation)
- **Rate constants** live in `src/audio/prefs.ts`, so data code and test mocks don't depend on the speech module.
- **Settings load:** a change made before the saved settings finish loading wins over them (`AudioProvider`), so a quick tap is never undone.
- **"Never repeat" by construction:** praise and combo lines rotate by `lessonSeed + questionIndex` (consecutive questions always get different lines) instead of remembering the last line.
- **Combo banner:** milestone combos (3/5/10) show a combo line ("You're on fire!") with the combo sound.
- **Moods:** the worked-solution phase now shows `think` (it was `encourage`). `fly` is used in the world-unlock card.
- **Read-aloud** is on the Grown-ups card too, and the Grown-ups card notes that Edge and iPad have the best voices.
- **Line bank** moved out of `hints.en.json` into `content/lines.en.json`; `hints.en.json` now holds only messages.
- **E2E:** `sound.spec.ts` reads `window.__kukoosSfx` (dev/e2e builds only) and waits for the IndexedDB save before reloading.

## Risks
- **Autoplay:** browsers block audio until a user gesture. We resume the context on the first input, so the first sound may be silent; that's acceptable.
- **iOS Safari** only lists voices after `voiceschanged`. The picker shows "Device default" until they arrive.
- **Too many sounds:** taps are very quiet, and nothing plays while the tab is hidden.
