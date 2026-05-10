import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from '@/components/Layout/Sidebar'
import Venta from '@/pages/Venta'
import Articulos from '@/pages/Articulos'
import Historial from '@/pages/Historial'
import Caja from '@/pages/Caja'
import Configuracion from '@/pages/Configuracion'
import Clientes from '@/pages/Clientes'
import Proveedores from '@/pages/Proveedores'
import Listados from '@/pages/Listados'
import Informes from '@/pages/Informes'
import Compras from '@/pages/Compras'
import Login from '@/pages/Login'

function RequireAdmin({ usuario, children }) {
  if (usuario?.rol !== 'admin') return <Navigate to="/venta" replace />
  return children
}

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
          <Route path="/caja" element={<Caja usuario={usuario} />} />
          <Route path="/articulos" element={<Articulos />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/proveedores" element={<Proveedores />} />
          <Route path="/listados" element={<Listados />} />
          <Route path="/informes" element={<RequireAdmin usuario={usuario}><Informes /></RequireAdmin>} />
          <Route path="/configuracion" element={<RequireAdmin usuario={usuario}><Configuracion /></RequireAdmin>} />
        </Routes>
      </main>
    </div>
  )
}
