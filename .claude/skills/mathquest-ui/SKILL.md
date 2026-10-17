---
name: mathquest-ui
description: MathQuest design system and kid-UX rules. Use whenever designing, building, restyling or reviewing ANY MathQuest UI (screens, components, the world map, the lesson player, feedback banners, celebrations, animations, the Kukoos mascot, the parent zone), or when choosing colors, fonts, spacing, motion or sounds. Load it before writing any .tsx/.css in src/ui, src/features, src/question-kinds or src/visuals.
---

# MathQuest UI skill

MathQuest is a math adventure for a 7–9-year-old. The look is **Duolingo-inspired but entirely original**: flat vector art, rounded shapes, bright saturated colors, chunky "pressable" 3D buttons, bold rounded type and bouncy feedback. The theme is **Kukoos** (an original bird mascot) flying from Earth's animal habitats into space.

> Copy the *feel*, never the assets. No owl, no Duolingo green as the brand color, no Feather font, no copied illustrations.

## Reference files (read as needed)
- `references/tokens.css`: **the only source of colors, type, radii, spacing and motion values.** It's copied to `src/ui/tokens.css`. Never hard-code hex values in components.
- `references/components.md`: specs for every shared component (anatomy, variants, states, sizes, a11y). Read it before creating or changing a component.
- `references/screens.md`: layout anatomy of the key screens (lesson, world map, lesson complete, parent zone) and copywriting voice.

## Workflow for any UI task
1. **Read the feature spec's UX notes** (`specs/features/NNN-*/spec.md`) and the constitution §1 (child-first rules).
2. **Reuse before creating.** Check `references/components.md` and `src/ui/`. If something needs a new component, add it to `components.md` first.
3. **Sketch before coding.** Write an ASCII wireframe for phone (360px) and tablet (768px+), plus a **states table** (default, pressed, disabled, selected, correct, incorrect, loading, empty) in the plan or PR description.
4. **Build with tokens only.** Use Tailwind utilities mapped to tokens (`bg-primary`, `text-ink`, `rounded-btn`, `shadow-lip-primary`). Any arbitrary value like `[#7C4DFF]` or `[13px]` is a bug.
5. **Pair motion with sound and speech.** Every meaningful feedback moment has motion, a sound effect and, where relevant, a TTS line and a Kukoos mood. Use the presets in `src/ui/motion.ts`.
6. **Verify** using the checklist below, including a Playwright screenshot at 360, 768 and 1280px for new screens.

## Hard rules (kid UX)
1. **Tap targets ≥ 56×56px** for kid-facing controls (48px minimum in the parent zone). At least 12px between adjacent targets.
2. **One primary action per screen.** In lessons it's the bottom-anchored full-width **CHECK / CONTINUE** button, always in the same place.
3. **Never rely on reading alone.** Every prompt has a 🔊 speak button and auto-reads when TTS is on. Icons go with words. Prompts are ≤ 8 words where possible.
4. **Never rely on color alone.** Correct = green + ✓ icon + "ding". Not-yet = coral + ↺ icon + soft "boop". Colorblind-safe.
5. **No scrolling inside a lesson question.** Each question fits the viewport (use `100dvh`, respect safe-area insets).
6. **No time-pressure visuals** in learning mode: no countdowns, no red timers.
7. **Gentle language.** Never say "wrong", "incorrect", "fail" or "game over". Say "Almost!", "Let's try together", "Not yet".
8. **Big numbers.** Math digits use `--text-math` (Baloo 2, tabular numerals). Body text is never below 18px for kid screens.
9. **Use the on-screen keypad.** The OS keyboard never opens in lessons (`inputMode="none"` + the custom Keypad).
10. **Reduced motion:** with `prefers-reduced-motion`, replace movement with ≤150ms opacity fades. Confetti becomes a static burst illustration and Kukoos shows its static SVG.
11. **Contrast:** WCAG AA. White text only on `primary`, `success-strong` and `danger-strong`. Use `ink` text on orange, yellow, sky and cyan.
12. **Celebrate in sequence.** Reward effects queue through the CelebrationOrchestrator. Never fire two celebrations at once.

## Visual language at a glance
| Element | Rule |
|---|---|
| Brand colors | Cosmic purple (primary, matches Kukoos), sunset orange (secondary/energy), sky blue (info/space), star cyan (gems), flame orange (streak) |
| Feedback colors | Success green (correct only; never the brand), soft coral (not-yet) |
| Buttons | Solid fill + darker bottom "lip" (4px; 6px for xl). On press: translateY(lip) and the lip collapses. Uppercase bold label, letter-spacing 0.04em |
| Cards/tiles | White surface, 2px `border` stroke plus a 4px bottom lip in the border color. Selected = primary-tint fill + primary stroke + primary lip |
| Corners | Buttons 16px, cards/tiles 20px, sheets 28px top, pills fully rounded |
| Type | Display/numbers: **Baloo 2** 700–800. UI/body: **Nunito** 700–800 (bold-heavy like Duolingo) |
| Illustration | Flat shapes, no outlines (or thin same-hue darker outlines), 2–3 tones per object, soft circular highlights. No gradients except space backgrounds |
| Space worlds | Deep night background, sparse twinkling stars (CSS), planets as flat circles with ring bands |
| Animal worlds | Warm daylight backgrounds, rounded foliage and wave shapes |
| Icons | Rounded, filled, 2-tone. Lucide is fine for parent-zone UI. Custom SVG for kid UI |

## Motion & sound pairing
| Moment | Motion preset | Sound | Kukoos | TTS |
|---|---|---|---|---|
| Button press | `press` (80ms) | `tap.mp3` (quiet) | — | — |
| Answer correct | banner `slideUp` + check `pop` | `correct.mp3` | `happy` | short praise from `content/praise.json` |
| Combo 3/5/10 | flame `bounce` + "+combo" | `combo.mp3` | `cheer` | "You're on fire!" |
| Not yet | tile `shake` (6px, 2×) + banner | `notyet.mp3` (soft) | `encourage` | hint line |
| Lesson complete | confetti + XP count-up (`gentle`) | `fanfare.mp3` | `cheer` + fly | "Mission complete!" |
| Node unlock | node `pop` + glow ring | `unlock.mp3` | `happy` | — |
| Limit reached | dim + moon rise | `lullaby.mp3` | `sleep` | "Great job today! See you tomorrow!" |

## Review checklist (paste into the PR)
- [ ] Only tokens used (search the diff for `#`, `px]`, `rgb(`)
- [ ] Tap targets ≥ 56px, one primary action, CHECK bottom-anchored
- [ ] Works at 360 / 768 / 1280 with no horizontal or in-question scroll
- [ ] 🔊 speak button present; prompt understandable without reading
- [ ] Correct/not-yet use icon + color + sound
- [ ] Reduced-motion verified (`emulateMedia({ reducedMotion: 'reduce' })`)
- [ ] Contrast AA in light **and** dark (space) themes
- [ ] Gentle copy (no "wrong"/"fail"); ≤ 8 words where possible
- [ ] Focus-visible ring on every interactive element; ARIA live region announces feedback
