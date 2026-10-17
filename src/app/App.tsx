import { createBrowserRouter, RouterProvider } from 'react-router'
import { DataProvider } from '@/data'
import { ReadAloudProvider } from '@/ui'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <DataProvider>
      <ReadAloudProvider>
        <RouterProvider router={router} />
      </ReadAloudProvider>
    </DataProvider>
  )
}
