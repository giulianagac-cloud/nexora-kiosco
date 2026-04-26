import { useState, useEffect } from 'react'

function formatPrecio(n) {
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

function formatFecha(str) {
  return new Date(str).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const ETIQUETA_PAGO = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  mercadopago: 'MercadoPago',
  transferencia: 'Transf.'
}

export default function Historial() {
  const [ventas, setVentas] = useState([])
  const [resumen, setResumen] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [fechaDesde, setFechaDesde] = useState(hoy())
  const [fechaHasta, setFechaHasta] = useState(hoy())
  const [cargando, setCargando] = useState(false)

  function hoy() {
    return new Date().toISOString().slice(0, 10)
  }

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setCargando(true)
    const [vs, res] = await Promise.all([
      window.api.ventas.listar({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta, limite: 200 }),
      window.api.ventas.resumenHoy()
    ])
    setVentas(vs)
    setResumen(res)
    setCargando(false)
  }

  const verDetalle = async (venta) => {
    const data = await window.api.ventas.detalle(venta.id)
    setDetalle(data)
  }

  const anular = async (id) => {
    if (!confirm('¿Anular esta venta? El stock será repuesto.')) return
    await window.api.ventas.anular(id)
    await cargar()
    setDetalle(null)
  }

  return (
    <div className="p-5 h-full flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-900">Historial de ventas</h1>

      {/* Resumen hoy */}
      {resumen && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Ventas hoy', value: resumen.total_ventas },
            { label: 'Total del día', value: formatPrecio(resumen.monto_total ?? 0) },
            { label: 'Efectivo', value: formatPrecio(resumen.efectivo ?? 0) },
            { label: 'Electrónico', value: formatPrecio(resumen.electronico ?? 0) }
          ].map((s) => (
            <div key={s.label} className="card px-4 py-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Desde</label>
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="input w-40"
        />
        <label className="text-sm text-gray-600">Hasta</label>
        <input
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="input w-40"
        />
        <button onClick={cargar} disabled={cargando} className="btn-primary">
          {cargando ? 'Cargando...' : 'Buscar'}
        </button>
      </div>

      {/* Tabla */}
      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 sticky top-0 bg-white">
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Medio de pago</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">#{v.id}</td>
                <td className="px-4 py-2.5 text-gray-600">{formatFecha(v.fecha)}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className="badge bg-gray-100 text-gray-700">{v.cantidad_items}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="badge bg-blue-100 text-blue-700">
                    {ETIQUETA_PAGO[v.medio_pago] ?? v.medio_pago}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-semibold">{formatPrecio(v.total)}</td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => verDetalle(v)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ventas.length === 0 && !cargando && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No hay ventas en el período seleccionado
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">Venta #{detalle.id}</h2>
              <button onClick={() => setDetalle(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-4">
              <div className="text-sm text-gray-600 mb-4 flex gap-4">
                <span>{formatFecha(detalle.fecha)}</span>
                <span className="badge bg-blue-100 text-blue-700">
                  {ETIQUETA_PAGO[detalle.medio_pago]}
                </span>
              </div>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2">Producto</th>
                    <th className="pb-2 text-center">Cant.</th>
                    <th className="pb-2 text-right">Precio</th>
                    <th className="pb-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.items?.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5">{item.nombre_producto}</td>
                      <td className="py-1.5 text-center">{item.cantidad}</td>
                      <td className="py-1.5 text-right">{formatPrecio(item.precio_unitario)}</td>
                      <td className="py-1.5 text-right font-medium">{formatPrecio(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between font-bold text-base border-t pt-3">
                <span>Total</span>
                <span>{formatPrecio(detalle.total)}</span>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={() => setDetalle(null)} className="btn-secondary flex-1">Cerrar</button>
              <button
                onClick={() => anular(detalle.id)}
                className="btn-danger flex-1"
              >
                Anular venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
