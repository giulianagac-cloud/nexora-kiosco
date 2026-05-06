import { useState } from 'react'

const LISTADOS = [
  {
    key: 'minorista',
    titulo: 'Lista de Precios — Minorista',
    descripcion: 'Precios de venta minorista de todos los artículos activos, ordenados por rubro.',
    accion: () => window.api.listados.listaPrecios('minorista'),
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    )
  },
  {
    key: 'mayorista',
    titulo: 'Lista de Precios — Mayorista',
    descripcion: 'Precios de venta mayorista de todos los artículos activos, ordenados por rubro.',
    accion: () => window.api.listados.listaPrecios('mayorista'),
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    )
  },
  {
    key: 'reposicion',
    titulo: 'Listado de Reposición',
    descripcion: 'Artículos con stock actual igual o inferior al stock mínimo configurado.',
    accion: () => window.api.listados.reposicion(),
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  },
  {
    key: 'stock_valorizado',
    titulo: 'Stock Valorizado',
    descripcion: 'Valor total del inventario al precio de costo, agrupado por rubro.',
    accion: () => window.api.listados.stockValorizado(),
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
]

export default function Listados() {
  const [loading, setLoading] = useState({})
  const [flash, setFlash] = useState(null)

  function showFlash(tipo, texto) {
    setFlash({ tipo, texto })
    setTimeout(() => setFlash(null), 4000)
  }

  async function exportar(item) {
    setLoading(l => ({ ...l, [item.key]: true }))
    try {
      const res = await item.accion()
      if (res) showFlash('ok', `"${item.titulo}" exportado correctamente`)
    } catch (e) {
      showFlash('error', e.message)
    } finally {
      setLoading(l => ({ ...l, [item.key]: false }))
    }
  }

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
        <h1 className="text-xl font-semibold text-white">Listados</h1>
        <p className="text-slate-400 text-sm mt-0.5">Exportá inventario y precios a Excel con un clic</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4">
        {LISTADOS.map(item => (
          <div key={item.key} className="bg-[#242938] border border-[#313545] rounded-2xl p-6 flex items-start gap-5">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-semibold text-sm">{item.titulo}</h2>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">{item.descripcion}</p>
              <button
                onClick={() => exportar(item)}
                disabled={loading[item.key]}
                className="mt-4 flex items-center gap-2 rounded-xl bg-[#1e2437] border border-[#313545] hover:border-emerald-500/50 hover:bg-[#1a2040] px-4 py-2 text-sm text-slate-200 hover:text-white transition disabled:opacity-50">
                {loading[item.key] ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
