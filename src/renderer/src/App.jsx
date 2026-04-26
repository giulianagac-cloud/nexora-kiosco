import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from '@/components/Layout/Sidebar'
import Venta from '@/pages/Venta'
import Productos from '@/pages/Productos'
import Historial from '@/pages/Historial'
import Caja from '@/pages/Caja'

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/venta" replace />} />
          <Route path="/venta" element={<Venta />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/caja" element={<Caja />} />
        </Routes>
      </main>
    </div>
  )
}
