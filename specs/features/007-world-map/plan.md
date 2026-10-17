# Plan — Feature 007 World Map & Kid Navigation

## Approach
- **Domain (pure):** `src/domain/engine/journey.ts` holds `isUnlocked`, `worldStatus`, `nextMission`, `mapNodes` (an ordered node list with state), and `composeBoss`. `LessonMode` gains `'boss'`. `startLesson` accepts `worldId` for boss lessons.
- **Data:** `LessonRow.worldId?`; `lessons.clearedWorlds(profileId)`; per-profile `settings` row gains `seenWorlds: WorldId[]` (for the one-time unlock moment). `useJourney()` hook = progress + cleared worlds + due count + next mission.
- **UI:**
  - `features/map/MapScreen.tsx`: header, `JourneyCanvas` (bands, silhouettes, path, nodes), `PlayNextButton`, `MissionSheet`, `BottomBar`.
  - `features/grownups/GrownUpGate.tsx` and a route guard.
  - `ui/useSpeakOnTap.ts` and `ui/ReadAloudContext.tsx` (the read-aloud setting moves out of LessonScreen).
- **Rendering the map:** plain DOM + CSS (no canvas), with nodes absolutely positioned on a column whose height = nodes × 120px + world gaps. The path is one inline SVG `<path>` built from the node centers. Bands are a single tall background built from stacked linear-gradients (token colors). Silhouettes are a few inline SVG shapes per world, using `aria-hidden`.
- **Motion** (motion-design skill): scroll-to-current via `scrollIntoView({ block: 'center', behavior })`; beacon CSS animation on the current node only; unlock moment = node `springs.pop` + band highlight + a CSS rocket (transform-only) between Ocean and Moon. Reduced motion → instant and static.

## Files
```
src/domain/engine/journey.ts            unlock / cleared / next mission / map nodes / composeBoss
src/domain/engine/lessonSession.ts      mode 'boss', worldId on state
src/data/rows.ts, mappers.ts            LessonRow.worldId; settings.seenWorlds
src/data/repositories/*                 clearedWorlds, seenWorlds get/mark
src/data/hooks.ts                       useJourney()
src/ui/ReadAloudContext.tsx, useSpeakOnTap.ts
src/features/map/{MapScreen,JourneyCanvas,MapNode,PlayNextButton,MissionSheet,BottomBar,worldArt}.tsx
src/features/grownups/{GrownUpGate,MissionsList}.tsx  (MissionsList = old PracticeScreen)
src/features/lesson-player/LessonRoute.tsx  /lesson/boss/:worldId, exits to /
src/app/routes.tsx                      / = map, /practice → /, /grown-ups guarded, /grown-ups/missions
src/ui/tokens.css (+ skill mirror)      map band tokens
tests/unit/domain/journey.test.ts, tests/unit/features/map*.test.tsx, gate.test.tsx
tests/e2e/map.spec.ts (+ update existing specs' entry points)
```

## Test plan
| AC | Test |
|---|---|
| AC1–AC2 | `journey.test.ts` (rule tables, determinism, kinds supported) |
| AC3 | data test: boss save → clearedWorlds; journey unlocks the next world |
| AC4–AC7 | `MapScreen` component tests with seeded stores and mocked TTS |
| AC8–AC9 | gate + routes tests |
| AC10 | component test: shown once, persisted, reduced motion static |
| AC11–AC12 | `map.spec.ts` on 3 devices + the overlap guard + screenshots (light/dark, phone/tablet) |

## Risks
- **Existing e2e entry points** use `/practice` and Start. Update them to the map and the gate.
- **Boss gating** could block a kid who struggles: the boss is retryable any time, and the lesson composer still offers reviews. If she fails, Kukoos encourages ("Let's practice and try again!").
- **Map height on phones:** about 28 nodes × 120px ≈ 3.4k px of scroll, which is fine. It auto-scrolls to the current node.
