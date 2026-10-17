import { createBrowserRouter, RouterProvider } from 'react-router'
import { DataProvider } from '@/data'
import { GrownUpGateProvider } from '@/features/grownups/GrownUpGate'
import { ReadAloudProvider } from '@/ui'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <DataProvider>
      <ReadAloudProvider>
        <GrownUpGateProvider>
          <RouterProvider router={router} />
        </GrownUpGateProvider>
      </ReadAloudProvider>
    </DataProvider>
  )
}
