import { createBrowserRouter, RouterProvider } from 'react-router'
import { DataProvider } from '@/data'
import { GrownUpGateProvider } from '@/features/grownups/GrownUpGate'
import { ReadAloudProvider } from '@/ui'
import { routes } from './routes'
import { TimeProvider } from './TimeProvider'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <DataProvider>
      <ReadAloudProvider>
        <GrownUpGateProvider>
          <TimeProvider>
            <RouterProvider router={router} />
          </TimeProvider>
        </GrownUpGateProvider>
      </ReadAloudProvider>
    </DataProvider>
  )
}
