import { useState } from 'react'

const hoy = () => new Date().toISOString().slice(0, 10)
const primerDiaMes = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const INFORMES = [
  {
    key: 'ventas_fecha',
    titulo: 'Ventas por Fecha',
    descripcion: 'Total de ventas agrupado por día en el período seleccionado.',
    accion: (params) => window.api.informes.ventasFecha(params),
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    key: 'ventas_detalle',
    titulo: 'Ventas con Detalle',
    descripcion: 'Detalle ítem por ítem incluyendo costo, IVA y margen de ganancia calculado.',
    accion: (params) => window.api.informes.ventasDetalle(params),
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" />
      </svg>
    )
  },
  {
    key: 'ventas_rubros',
    titulo: 'Ventas por Rubro',
    descripcion: 'Unidades vendidas y totales agrupados por categoría de producto.',
    accion: (params) => window.api.informes.ventasRubros(params),
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    )
  },
  {
    key: 'ventas_articulos',
    titulo: 'Ventas por Artículo',
    descripcion: 'Ranking de artículos más vendidos con costo total y margen de ganancia.',
    accion: (params) => window.api.informes.ventasArticulos(params),
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  {
    key: 'ventas_medios_pago',
    titulo: 'Ventas por Medio de Pago',
    descripcion: 'Totales desglosados por efectivo, débito, crédito, MercadoPago y transferencia.',
    accion: (params) => window.api.informes.ventasMediosPago(params),
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )
  },
]

export default function Informes() {
  const [fechaDesde, setFechaDesde] = useState(primerDiaMes())
  const [fechaHasta, setFechaHasta] = useState(hoy())
  const [loading, setLoading] = useState({})
  const [flash, setFlash] = useState(null)

  function showFlash(tipo, texto) {
    setFlash({ tipo, texto })
    setTimeout(() => setFlash(null), 4000)
  }

  async function exportar(item) {
    if (!fechaDesde || !fechaHasta) { showFlash('error', 'Seleccioná las fechas del período'); return }
    if (fechaDesde > fechaHasta) { showFlash('error', 'La fecha desde no puede ser posterior a la fecha hasta'); return }
    setLoading(l => ({ ...l, [item.key]: true }))
    try {
      const res = await item.accion({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta })
      if (res) showFlash('ok', `"${item.titulo}" exportado correctamente`)
    } catch (e) {
      showFlash('error', e.message)
    } finally {
      setLoading(l => ({ ...l, [item.key]: false }))
    }
  }

  const inp = 'rounded-xl bg-[#242938] border border-[#313545] px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 transition'
  const lbl = 'block text-xs font-medium text-slate-400 mb-1.5'

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      {/* Flash */}
      {flash && (
        <div className={`fixed top-4 right-4 z-50 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl flex items-center gap-2
          ${flash.tipo === 'ok'
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'}`}>
          {flash.tipo === 'ok'
            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" /></svg>}
          {flash.texto}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Informes</h1>
        <p className="text-slate-400 text-sm mt-0.5">Seleccioná el período y exportá el informe en Excel</p>
      </div>

      {/* Filtro período */}
      <div className="bg-[#242938] border border-[#313545] rounded-2xl p-5 flex items-end gap-6">
        <div>
          <label className={lbl}>Fecha desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Fecha hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className={inp} />
        </div>
        <div className="flex gap-2">
          {[
            {
              label: 'Este mes',
              accion: () => { setFechaDesde(primerDiaMes()); setFechaHasta(hoy()) }
            },
            {
              label: 'Hoy',
              accion: () => { setFechaDesde(hoy()); setFechaHasta(hoy()) }
            },
          ].map(({ label, accion }) => (
            <button key={label} onClick={accion}
              className="rounded-xl bg-[#1e2437] border border-[#313545] hover:border-emerald-500/40 px-3 py-2 text-xs text-slate-300 hover:text-white transition">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4 overflow-y-auto pb-2">
        {INFORMES.map(item => (
          <div key={item.key} className="bg-[#242938] border border-[#313545] rounded-2xl p-6 flex items-start gap-5">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-sm">{item.titulo}</h2>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">{item.descripcion}</p>
              <button
                onClick={() => exportar(item)}
                disabled={loading[item.key]}
                className="mt-4 flex items-center gap-2 rounded-xl bg-[#1e2437] border border-[#313545] hover:border-blue-500/50 hover:bg-[#1a2040] px-4 py-2 text-sm text-slate-200 hover:text-white transition disabled:opacity-50">
                {loading[item.key] ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exportar Excel
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
