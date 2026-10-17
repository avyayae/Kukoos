import { createBrowserRouter, RouterProvider } from 'react-router'
import { DataProvider } from '@/data'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <DataProvider>
      <RouterProvider router={router} />
    </DataProvider>
  )
}
