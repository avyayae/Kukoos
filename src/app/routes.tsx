import { Navigate, type RouteObject } from 'react-router'
import { FreeBoardRoute } from '@/features/chess/FreeBoardRoute'
import { RequireGrownUp } from '@/features/grownups/GrownUpGate'
import { GrownUpsScreen } from '@/features/grownups/GrownUpsScreen'
import { MissionsList } from '@/features/grownups/MissionsList'
import { ProgressScreen } from '@/features/grownups/ProgressScreen'
import { LessonRoute } from '@/features/lesson-player/LessonRoute'
import { MapScreen } from '@/features/map/MapScreen'
import { ChangeLookScreen, MeScreen } from '@/features/profiles/MeScreen'
import { WhoIsPlaying } from '@/features/profiles/WhoIsPlaying'
import { TrophyRoom } from '@/features/rewards/TrophyRoom'

export const routes: RouteObject[] = [
  { path: '/', element: <MapScreen /> },
  { path: '/lesson/boss/:worldId', element: <LessonRoute /> },
  { path: '/lesson/:skillId', element: <LessonRoute /> },
  { path: '/trophies', element: <TrophyRoom /> },
  { path: '/me', element: <MeScreen /> },
  { path: '/me/look', element: <ChangeLookScreen /> },
  { path: '/who', element: <WhoIsPlaying /> },
  { path: '/chess/board', element: <FreeBoardRoute /> },
  {
    path: '/grown-ups',
    element: (
      <RequireGrownUp>
        <GrownUpsScreen />
      </RequireGrownUp>
    ),
  },
  {
    path: '/grown-ups/progress',
    element: (
      <RequireGrownUp>
        <ProgressScreen />
      </RequireGrownUp>
    ),
  },
  {
    path: '/grown-ups/missions',
    element: (
      <RequireGrownUp>
        <MissionsList />
      </RequireGrownUp>
    ),
  },
  { path: '/practice', element: <Navigate to="/" replace /> },
  { path: '/backup', element: <Navigate to="/grown-ups" replace /> },
  { path: '*', element: <Navigate to="/" replace /> },
]
