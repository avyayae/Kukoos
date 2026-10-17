import type { RouteObject } from 'react-router'
import { ShellScreen } from './ShellScreen'

export const routes: RouteObject[] = [
  { path: '/', element: <ShellScreen /> },
  { path: '*', element: <ShellScreen /> },
]
