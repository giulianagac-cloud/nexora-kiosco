import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from '@/components/Layout/Sidebar'
import Venta from '@/pages/Venta'
import Articulos from '@/pages/Articulos'
import Historial from '@/pages/Historial'
import Caja from '@/pages/Caja'
import Configuracion from '@/pages/Configuracion'
import Clientes from '@/pages/Clientes'
import Login from '@/pages/Login'

export default function App() {
  const [usuario, setUsuario] = useState(null)

  if (!usuario) {
    return <Login onLogin={setUsuario} />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar usuario={usuario} onLogout={() => setUsuario(null)} />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/venta" replace />} />
          <Route path="/venta" element={<Venta />} />
          <Route path="/articulos" element={<Articulos />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/configuracion" element={<Configuracion />} />
          <Route path="/clientes" element={<Clientes />} />
        </Routes>
      </main>
    </div>
  )
}
