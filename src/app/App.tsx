import { createBrowserRouter, RouterProvider } from 'react-router'
import { DataProvider } from '@/data'
import { GrownUpGateProvider } from '@/features/grownups/GrownUpGate'
import { AudioProvider } from './AudioProvider'
import { routes } from './routes'
import { TimeProvider } from './TimeProvider'

const router = createBrowserRouter(routes)

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
