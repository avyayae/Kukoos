import type { RouteObject } from 'react-router'
import { LessonRoute } from '@/features/lesson-player/LessonRoute'
import { PracticeScreen } from '@/features/practice/PracticeScreen'
import { ShellScreen } from './ShellScreen'

export const routes: RouteObject[] = [
  { path: '/', element: <ShellScreen /> },
  { path: '/practice', element: <PracticeScreen /> },
  { path: '/lesson/:skillId', element: <LessonRoute /> },
  { path: '*', element: <ShellScreen /> },
]
