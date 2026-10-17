---
name: motion-design
description: Kukoos animation playbook. Use whenever adding or changing ANY motion, transition, celebration, mascot animation, map/scroll effect, confetti, Lottie or Rive asset, or sound paired with motion in the Kukoos app — and when reviewing UI for "does this feel alive / is this too much". Works together with the mathquest-ui skill (tokens, kid-UX rules); load both for UI work.
---

# Kukoos motion design

Motion in a kids' learning game has three jobs, in this order: **explain what changed**, **reward effort**, and **make the world feel alive**. If an animation does none of these, cut it.

## Principles
1. **Motion answers the kid.** Most motion should respond to a tap, an answer or a milestone. Idle motion is reserved for **one** thing per screen that says "tap me next" (e.g. the current map node or the Play button).
2. **One orchestrated moment per screen.** A lesson ends with one celebration sequence, a map opens with one scroll-to-current glide, and a world unlock gets one cutscene. Never scatter fade-ins on every element.
3. **Physical, bouncy, short.** Use springs for things the kid touches, and short ease-outs for things that appear. Everyday feedback is ≤ 250ms. Only celebrations exceed 600ms, and the kid can always tap to skip them.
4. **Celebrate in sequence, never in parallel** (mathquest-ui rule 12). Queue reward effects (XP → crystals → streak → badge → level-up → chest), one at a time.
5. **Reduced motion is a first-class design**, not "animations off". Replace movement with ≤ 150ms opacity fades, keep static celebration art (a burst illustration, a still Kukoos pose), and keep sounds.
6. **Performance is part of the design.** Animate only `transform` and `opacity`, at 60fps on a mid-range tablet. Pause anything off-screen.

## Building blocks (use these, don't invent new timings)
| Need | Use | Values |
|---|---|---|
| Press feedback | CSS `.btn3d` / `.tile` `:active` | `--mq-dur-press` (80ms), translateY(lip) |
| Something appears | CSS keyframe or Motion `tweens.slideUp` | 250ms `--mq-ease-out` |
| Pop (check, unlock, badge) | Motion `springs.pop` | stiffness 500, damping 22 |
| Playful (node bounce, blocks fanning out) | Motion `springs.bounce` | stiffness 300, damping 12 |
| Settle (progress, count-up, scroll glide) | Motion `springs.gentle` | stiffness 200, damping 26 |
| "Not yet" | `mq-shake` keyframe | 6px × 2, 450ms |
| Staggered groups | `animation-delay: i × 30ms` | cap the total stagger at 300ms |
Presets live in `src/ui/motion.ts`; keyframes in `src/ui/components.css`. Add new presets there and document them here.

## Patterns
- **Current-node beacon (map):** a soft scale pulse (1 → 1.06 → 1) every 2.4s, plus a "Start here!" bubble that bobs 4px. Only the current node does this.
- **Scroll-to-current:** on map open, glide (smooth scroll) so the current node sits at about 40% of the viewport height. With reduced motion, jump instantly.
- **World transitions:** backgrounds are continuous gradient bands; silhouettes (leaves, waves, craters) parallax at most 0.3× the scroll speed, and parallax is off with reduced motion.
- **Unlock moment:** the node pops from locked to available (`springs.pop`), a ring sparkle draws (stroke-dashoffset 400ms), and `unlock.mp3` plays. It plays **once**; remember it was shown.
- **Count-up numbers:** XP and score count up with `springs.gentle` over ≤ 800ms; the final value is announced via `aria-live`.
- **Confetti:** `canvas-confetti`, ≤ 120 particles, brand palette only, about 1.2s. With reduced motion, use a static burst SVG.
- **Lottie (dotLottie):** only for celebration set-pieces (chest opening, fireworks, rocket launch). Lazy-load per scene, under 150 KB each, with autoplay once. With reduced motion, show the last frame.
- **Rive (Kukoos):** one state machine `kukoos` with a number input `mood` (idle/happy/cheer/think/encourage/sleep) and triggers `fly` and `wave`. Blink idles randomly (3–6s). Keep a static SVG fallback per mood for reduced motion, loading and failure.

## Sound pairing
Every celebratory motion has a sound; everyday taps get a quiet tick or nothing. Sounds never carry information that the visuals don't. The full table is in the mathquest-ui SKILL ("Motion & sound pairing").

## Review checklist (add to UI PRs)
- [ ] Each animation explains a change, rewards effort, or marks the single "tap me" thing
- [ ] At most one idle animation on screen
- [ ] Uses presets/tokens only, with no ad-hoc durations or easings
- [ ] Celebrations queue, can be skipped with a tap, and last under 2.5s in total
- [ ] Reduced motion: no transforms, fades ≤ 150ms, static art in place of confetti/Lottie/Rive (verified with Playwright `emulateMedia({ reducedMotion: 'reduce' })`)
- [ ] Only transform/opacity animate, and off-screen loops pause (IntersectionObserver)
- [ ] Screenshots are taken with `animations: 'disabled'` so visual checks are stable
