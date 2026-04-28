import { useState, useEffect } from 'react'

function formatPrecio(n) {
  return `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

function formatFecha(str) {
  return new Date(str).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

const ETIQUETA_PAGO = {
  efectivo:      'Efectivo',
  debito:        'Débito',
  credito:       'Crédito',
  mercadopago:   'MercadoPago',
  transferencia: 'Transf.',
  mixto:         'Mixto'
}

const COLOR_PAGO = {
  efectivo:      'bg-emerald-500/15 text-emerald-400',
  debito:        'bg-blue-500/15 text-blue-400',
  credito:       'bg-violet-500/15 text-violet-400',
  mercadopago:   'bg-sky-500/15 text-sky-400',
  transferencia: 'bg-amber-500/15 text-amber-400',
  mixto:         'bg-slate-500/15 text-slate-300'
}

export default function Historial() {
  const [ventas, setVentas]       = useState([])
  const [resumen, setResumen]     = useState(null)
  const [detalle, setDetalle]     = useState(null)
  const [fechaDesde, setFechaDesde] = useState(hoy)
  const [fechaHasta, setFechaHasta] = useState(hoy)
  const [cargando, setCargando]   = useState(false)

  useEffect(() => { cargar() }, [])

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
    <div className="flex flex-col h-full bg-[#1a1f2e] p-5 gap-4">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Historial de ventas</h1>
        <p className="text-sm text-slate-400 mt-0.5">Consultá y gestioná las ventas registradas</p>
      </div>

      {/* Tarjetas resumen */}
      {resumen && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Ventas hoy',    value: resumen.total_ventas ?? 0,               esNum: false },
            { label: 'Total del día', value: formatPrecio(resumen.monto_total ?? 0),  esNum: false },
            { label: 'Efectivo',      value: formatPrecio(resumen.efectivo ?? 0),     esNum: false },
            { label: 'Electrónico',   value: formatPrecio(resumen.electronico ?? 0),  esNum: false }
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-[#242938] border border-[#313545] px-4 py-3">
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className="text-xl font-bold text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">Desde</span>
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="rounded-xl bg-[#242938] border border-[#313545] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 w-40"
        />
        <span className="text-sm text-slate-400">Hasta</span>
        <input
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="rounded-xl bg-[#242938] border border-[#313545] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50 w-40"
        />
        <button
          onClick={cargar}
          disabled={cargando}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {cargando ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
          )}
          {cargando ? 'Buscando...' : 'Buscar'}
        </button>
        {ventas.length > 0 && (
          <span className="text-xs text-slate-500 ml-1">{ventas.length} resultado{ventas.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 rounded-xl border border-[#313545] bg-[#242938] overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#1e2334]">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium text-center">Ítems</th>
                <th className="px-4 py-3 font-medium">Medio de pago</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3348]/50">
              {ventas.map((v) => (
                <tr key={v.id} className="hover:bg-[#1e2437]/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">#{v.id}</td>
                  <td className="px-4 py-3 text-slate-300">{formatFecha(v.fecha)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-md bg-slate-700/60 text-slate-300 text-xs font-medium">
                      {v.cantidad_items}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${COLOR_PAGO[v.medio_pago] ?? 'bg-slate-500/15 text-slate-300'}`}>
                      {ETIQUETA_PAGO[v.medio_pago] ?? v.medio_pago}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-400 tabular-nums">
                    {formatPrecio(v.total)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => verDetalle(v)}
                      className="text-xs text-slate-400 hover:text-emerald-400 font-medium transition"
                    >
                      Ver →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {ventas.length === 0 && !cargando && (
            <div className="text-center py-16 text-slate-500 text-sm">
              No hay ventas en el período seleccionado
            </div>
          )}
        </div>
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#313545] bg-[#1e2334] shadow-2xl flex flex-col max-h-[85vh]">

            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#313545] shrink-0">
              <div>
                <h2 className="font-semibold text-white">Venta #{detalle.id}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{formatFecha(detalle.fecha)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${COLOR_PAGO[detalle.medio_pago] ?? 'bg-slate-500/15 text-slate-300'}`}>
                  {ETIQUETA_PAGO[detalle.medio_pago] ?? detalle.medio_pago}
                </span>
                <button
                  onClick={() => setDetalle(null)}
                  className="text-slate-500 hover:text-slate-300 transition p-1 rounded-lg hover:bg-[#2d3348]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wider border-b border-[#313545]">
                    <th className="pb-2 font-medium">Producto</th>
                    <th className="pb-2 font-medium text-center">Cant.</th>
                    <th className="pb-2 font-medium text-right">P. Unit.</th>
                    <th className="pb-2 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3348]/50">
                  {detalle.items?.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2 text-slate-200">{item.nombre_producto}</td>
                      <td className="py-2 text-center text-slate-400">{item.cantidad}</td>
                      <td className="py-2 text-right text-slate-400 tabular-nums">{formatPrecio(item.precio_unitario)}</td>
                      <td className="py-2 text-right font-medium text-slate-200 tabular-nums">{formatPrecio(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer modal */}
            <div className="px-6 py-4 border-t border-[#313545] shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400 text-sm">Total</span>
                <span className="text-2xl font-bold text-emerald-400 tabular-nums">{formatPrecio(detalle.total)}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDetalle(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#2a2f42] hover:bg-[#323850] border border-[#2d3348] text-slate-200 text-sm font-medium transition"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => anular(detalle.id)}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-700/40 text-rose-400 text-sm font-medium transition"
                >
                  Anular venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
