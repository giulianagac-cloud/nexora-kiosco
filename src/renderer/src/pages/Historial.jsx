import { useState, useEffect, useMemo } from 'react'

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  return `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

function formatFecha(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

// ─── config de medios de pago ─────────────────────────────────────────────────
const MEDIOS = [
  { value: 'efectivo',      label: 'Efectivo',     textCls: 'text-emerald-400', badgeCls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  { value: 'debito',        label: 'Débito',        textCls: 'text-blue-400',    badgeCls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  { value: 'credito',       label: 'Crédito',       textCls: 'text-violet-400',  badgeCls: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  { value: 'mercadopago',   label: 'MercadoPago',   textCls: 'text-sky-400',     badgeCls: 'bg-sky-500/15 text-sky-400 border-sky-500/20' },
  { value: 'transferencia', label: 'Transferencia', textCls: 'text-amber-400',   badgeCls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  { value: 'mixto',         label: 'Mixto',         textCls: 'text-slate-300',   badgeCls: 'bg-slate-500/15 text-slate-300 border-slate-500/20' },
]
const MEDIOS_PRINCIPALES = MEDIOS.filter(m => m.value !== 'mixto')

function medioConfig(tipo) {
  return MEDIOS.find(m => m.value === tipo) ?? { label: tipo, textCls: 'text-slate-300', badgeCls: 'bg-slate-500/15 text-slate-300 border-slate-500/20' }
}

// ─── Breakdown de pagos (desde lista de ventas) ───────────────────────────────
function calcBreakdown(ventas) {
  const b = {}
  for (const v of ventas.filter(v => !v.anulada)) {
    if (v.medio_pago === 'mixto' && v.medio_pago_detalle) {
      try {
        const pagos = JSON.parse(v.medio_pago_detalle)
        const totalPagado = pagos.reduce((s, p) => s + Number(p.monto || 0), 0)
        for (const p of pagos) {
          if (!b[p.tipo]) b[p.tipo] = 0
          b[p.tipo] += totalPagado > 0 ? v.total * (Number(p.monto) / totalPagado) : 0
        }
      } catch {
        if (!b[v.medio_pago]) b[v.medio_pago] = 0
        b[v.medio_pago] += v.total
      }
    } else {
      if (!b[v.medio_pago]) b[v.medio_pago] = 0
      b[v.medio_pago] += v.total
    }
  }
  return b
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function Historial() {
  const [ventas, setVentas]         = useState([])
  const [resumen, setResumen]       = useState(null)
  const [detalle, setDetalle]       = useState(null)
  const [fechaDesde, setFechaDesde] = useState(hoy)
  const [fechaHasta, setFechaHasta] = useState(hoy)
  const [cargando, setCargando]     = useState(false)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    try {
      const [vs, res] = await Promise.all([
        window.api.ventas.listar({
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
          limite: 500,
          incluir_anuladas: true
        }),
        window.api.ventas.resumenPeriodo({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta })
      ])
      setVentas(vs)
      setResumen(res)
    } finally {
      setCargando(false)
    }
  }

  const verDetalle = async (venta) => {
    const data = await window.api.ventas.detalle(venta.id)
    setDetalle(data)
  }

  const anular = async (id) => {
    if (!confirm('¿Anular esta venta? El stock de los productos será repuesto.')) return
    await window.api.ventas.anular(id)
    await cargar()
    setDetalle(null)
  }

  const breakdown     = useMemo(() => calcBreakdown(ventas), [ventas])
  const totalBreakdown = Object.values(breakdown).reduce((s, v) => s + v, 0)

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#1a1f2e]">

      {/* ── Header + filtros ── */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Historial de ventas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Consultá, filtrá y gestioná las ventas registradas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-sm text-slate-400">Desde</span>
          <input
            type="date"
            value={fechaDesde}
            onChange={e => setFechaDesde(e.target.value)}
            className="rounded-xl bg-[#242938] border border-[#313545] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50"
          />
          <span className="text-sm text-slate-400">Hasta</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={e => setFechaHasta(e.target.value)}
            className="rounded-xl bg-[#242938] border border-[#313545] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50"
          />
          <button
            onClick={cargar}
            disabled={cargando}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 shadow-lg shadow-emerald-900/20"
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
            Buscar
          </button>
        </div>
      </div>

      {/* ── Resumen del período ── */}
      {resumen && (
        <div className="px-6 pb-4 grid grid-cols-4 gap-3 shrink-0">
          <div className="rounded-2xl bg-[#242938] border border-[#313545] px-4 py-3">
            <p className="text-xs text-slate-400">Ventas activas</p>
            <p className="text-2xl font-bold text-white mt-1">{resumen.total_ventas}</p>
          </div>
          <div className="rounded-2xl bg-[#242938] border border-[#313545] px-4 py-3">
            <p className="text-xs text-slate-400">Total vendido</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">{fmt(resumen.monto_total)}</p>
          </div>
          <div className="rounded-2xl bg-[#242938] border border-[#313545] px-4 py-3">
            <p className="text-xs text-slate-400">Anuladas</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{resumen.total_anuladas}</p>
          </div>
          <div className="rounded-2xl bg-[#242938] border border-[#313545] px-4 py-3">
            <p className="text-xs text-slate-400">Ganancia estimada</p>
            <p className="text-2xl font-bold text-amber-400 mt-1 tabular-nums">{fmt(resumen.ganancia_estimada)}</p>
          </div>
        </div>
      )}

      {/* ── Tabla de ventas ── */}
      <div className="flex-1 mx-6 rounded-xl border border-[#313545] bg-[#242938] overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#1e2334]">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">Fecha / Hora</th>
                <th className="px-4 py-3 font-medium"># Trans.</th>
                <th className="px-4 py-3 font-medium">Cajero</th>
                <th className="px-4 py-3 font-medium text-center">Ítems</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Medio de pago</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3348]/50">
              {ventas.map(v => (
                <tr
                  key={v.id}
                  className={`transition-colors hover:bg-[#1e2437]/60 ${v.anulada ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3 text-slate-300 text-xs tabular-nums">{formatFecha(v.fecha)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    #{String(v.id).padStart(5, '0')}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">Operador</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-md bg-slate-700/60 text-slate-300 text-xs font-medium">
                      {v.cantidad_items}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${v.anulada ? 'text-slate-500 line-through' : 'text-emerald-400'}`}>
                    {fmt(v.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${medioConfig(v.medio_pago).badgeCls}`}>
                      {medioConfig(v.medio_pago).label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {v.anulada ? (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Anulada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Activa
                      </span>
                    )}
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
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <svg className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No hay ventas en el período seleccionado</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Totales por medio de pago ── */}
      <div className="mx-6 my-4 rounded-xl border border-[#313545] bg-[#242938] px-5 py-4 shrink-0">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Totales por medio de pago — período seleccionado
        </p>
        <div className="flex items-end gap-6">
          {MEDIOS_PRINCIPALES.map(m => {
            const monto = breakdown[m.value] ?? 0
            return (
              <div key={m.value} className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-1 truncate">{m.label}</p>
                <p className={`font-semibold text-sm tabular-nums ${monto > 0 ? m.textCls : 'text-slate-700'}`}>
                  {monto > 0 ? fmt(monto) : '—'}
                </p>
              </div>
            )
          })}
          <div className="shrink-0 border-l border-[#313545] pl-6">
            <p className="text-xs text-slate-400 mb-1">TOTAL GENERAL</p>
            <p className="font-bold text-lg text-white tabular-nums">{fmt(totalBreakdown)}</p>
          </div>
        </div>
      </div>

      {/* ── Modal detalle ── */}
      {detalle && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#313545] bg-[#1e2334] shadow-2xl flex flex-col max-h-[88vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#313545] shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-white">
                    Venta #{String(detalle.id).padStart(5, '0')}
                  </h2>
                  {detalle.anulada ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-medium">
                      ANULADA
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{formatFecha(detalle.fecha)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${medioConfig(detalle.medio_pago).badgeCls}`}>
                  {medioConfig(detalle.medio_pago).label}
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
                    <th className="pb-2.5 font-medium">Producto</th>
                    <th className="pb-2.5 font-medium w-32">Código</th>
                    <th className="pb-2.5 font-medium text-center w-16">Cant.</th>
                    <th className="pb-2.5 font-medium text-right w-28">P. Unit.</th>
                    <th className="pb-2.5 font-medium text-right w-28">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3348]/40">
                  {detalle.items?.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5 text-slate-200 pr-4">{item.nombre_producto}</td>
                      <td className="py-2.5 text-slate-500 text-xs font-mono">{item.codigo_barras ?? '—'}</td>
                      <td className="py-2.5 text-center text-slate-400">{item.cantidad}</td>
                      <td className="py-2.5 text-right text-slate-400 tabular-nums">{fmt(item.precio_unitario)}</td>
                      <td className="py-2.5 text-right font-medium text-slate-100 tabular-nums">{fmt(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#313545] shrink-0 space-y-4">
              {/* Totales */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    {fmt(detalle.items?.reduce((s, i) => s + i.subtotal, 0) ?? 0)}
                  </span>
                </div>
                {detalle.descuento !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{detalle.descuento < 0 ? 'Descuento' : 'Recargo'}</span>
                    <span className={`tabular-nums ${detalle.descuento < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {detalle.descuento < 0 ? '−' : '+'}{fmt(Math.abs(detalle.descuento))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-[#313545]">
                  <span className="text-slate-300 font-medium">Total</span>
                  <span className="text-2xl font-bold text-emerald-400 tabular-nums">{fmt(detalle.total)}</span>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => setDetalle(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#2a2f42] hover:bg-[#323850] border border-[#2d3348] text-slate-200 text-sm font-medium transition"
                >
                  Cerrar
                </button>
                {!detalle.anulada && (
                  <button
                    onClick={() => anular(detalle.id)}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-700/40 text-rose-400 text-sm font-medium transition"
                  >
                    Anular venta
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
