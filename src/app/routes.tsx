import { Navigate, type RouteObject } from 'react-router'
import { RequireGrownUp } from '@/features/grownups/GrownUpGate'
import { GrownUpsScreen } from '@/features/grownups/GrownUpsScreen'
import { MissionsList } from '@/features/grownups/MissionsList'
import { LessonRoute } from '@/features/lesson-player/LessonRoute'
import { MapScreen } from '@/features/map/MapScreen'
import { TrophyRoom } from '@/features/rewards/TrophyRoom'

export const routes: RouteObject[] = [
  { path: '/', element: <MapScreen /> },
  { path: '/lesson/boss/:worldId', element: <LessonRoute /> },
  { path: '/lesson/:skillId', element: <LessonRoute /> },
  { path: '/trophies', element: <TrophyRoom /> },
  {
    path: '/grown-ups',
    element: (
      <RequireGrownUp>
        <GrownUpsScreen />
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
