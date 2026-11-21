
import { Routes, Route } from 'react-router'

import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Ordenes from './pages/Ordenes'
import NuevaOrden from './pages/NuevaOrden'
import DetalleOrden from './pages/DetalleOrden'
import Clientes from './pages/Clientes'
import Historial from './pages/Historial'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="ordenes" element={<Ordenes />} />
        <Route path="ordenes/nueva" element={<NuevaOrden />} />
        <Route path="ordenes/:id" element={<DetalleOrden />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="historial" element={<Historial />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
