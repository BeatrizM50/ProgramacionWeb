
import { Routes, Route } from 'react-router'

import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Ordenes from './pages/Ordenes'
import DetalleOrden from './pages/DetalleOrden'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="ordenes" element={<Ordenes />} />
        <Route path="ordenes/:id" element={<DetalleOrden />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App