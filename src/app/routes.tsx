import { Navigate, type RouteObject } from 'react-router'
import { GrownUpsScreen } from '@/features/grownups/GrownUpsScreen'
import { LessonRoute } from '@/features/lesson-player/LessonRoute'
import { PracticeScreen } from '@/features/practice/PracticeScreen'
import { ShellScreen } from './ShellScreen'

export const routes: RouteObject[] = [
  { path: '/', element: <ShellScreen /> },
  { path: '/practice', element: <PracticeScreen /> },
  { path: '/lesson/:skillId', element: <LessonRoute /> },
  { path: '/grown-ups', element: <GrownUpsScreen /> },
  { path: '/backup', element: <Navigate to="/grown-ups" replace /> },
  { path: '*', element: <ShellScreen /> },
]
