import { createBrowserRouter, RouterProvider } from 'react-router'
import { DataProvider } from '@/data'
import { GrownUpGateProvider } from '@/features/grownups/GrownUpGate'
import { AudioProvider } from './AudioProvider'
import { routes } from './routes'
import { TimeProvider } from './TimeProvider'

// The app may live under a sub-path, e.g. /Kukoos/ on GitHub Pages (spec 012 AC1).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'
const router = createBrowserRouter(routes, { basename })

export default function App() {
  return (
    <DataProvider>
      <AudioProvider>
        <GrownUpGateProvider>
          <TimeProvider>
            <RouterProvider router={router} />
          </TimeProvider>
        </GrownUpGateProvider>
      </AudioProvider>
    </DataProvider>
  )
}
