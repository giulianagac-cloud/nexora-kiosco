import { useState, useEffect } from 'react'

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const calcPrecio = (costo, iva, utilidad) => {
  const c = parseFloat(costo) || 0
  const v = parseFloat(iva) || 0
  const u = parseFloat(utilidad) || 0
  if (c <= 0) return 0
  return +(c * (1 + v / 100) * (1 + u / 100)).toFixed(2)
}

// ── shared class strings ──────────────────────────────────────────────────────
const CLS_INPUT =
  'w-full bg-[#161b2a] border border-[#2d3348] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition'
const CLS_LABEL = 'block text-xs font-medium text-slate-400 mb-1.5'
const CLS_BTN_GHOST =
  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2a2f42] hover:bg-[#323850] border border-[#2d3348] text-slate-200 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed'

// ── form default ──────────────────────────────────────────────────────────────
const FORM_VACIO = {
  nombre: '',
  codigo_barras: '',
  categoria_id: '',
  unidad_venta: 'UN',
  en_oferta: false,
  precio_costo: '',
  iva: '21',
  utilidad_minorista: '',
  precio: '0',
  utilidad_mayorista: '',
  precio_mayorista: '0',
  control_stock: true,
  stock: '0',
  stock_minimo: '0',
  stock_maximo: '0',
}

// ── component ─────────────────────────────────────────────────────────────────
export default function Articulos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [modal, setModal] = useState(null) // null | { modo: 'crear'|'editar', id? }
  const [tab, setTab] = useState('general')
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [importando, setImportando] = useState(false)
  const [resultImport, setResultImport] = useState(null)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    const [prods, cats] = await Promise.all([
      window.api.productos.listar(),
      window.api.categorias.listar(),
    ])
    setProductos(prods)
    setCategorias(cats)
  }

  // ── derived ────────────────────────────────────────────────────────────────
  const productosFiltrados = productos.filter((p) => {
    const q = busqueda.toLowerCase()
    return !q || p.nombre.toLowerCase().includes(q) || (p.codigo_barras ?? '').includes(q)
  })

  const selectedItem = productos.find((p) => p.id === selectedId) ?? null

  // ── form field updater with price recalc ───────────────────────────────────
  function setField(name, value) {
    setForm((f) => {
      const next = { ...f, [name]: value }
      if (['precio_costo', 'iva', 'utilidad_minorista'].includes(name)) {
        next.precio = String(
          calcPrecio(
            name === 'precio_costo' ? value : f.precio_costo,
            name === 'iva' ? value : f.iva,
            name === 'utilidad_minorista' ? value : f.utilidad_minorista,
          ),
        )
      }
      if (['precio_costo', 'iva', 'utilidad_mayorista'].includes(name)) {
        next.precio_mayorista = String(
          calcPrecio(
            name === 'precio_costo' ? value : f.precio_costo,
            name === 'iva' ? value : f.iva,
            name === 'utilidad_mayorista' ? value : f.utilidad_mayorista,
          ),
        )
      }
      return next
    })
  }

  // ── actions ────────────────────────────────────────────────────────────────
  function abrirCrear() {
    setForm(FORM_VACIO)
    setTab('general')
    setError('')
    setModal({ modo: 'crear' })
  }

  function abrirEditar() {
    if (!selectedItem) return
    const p = selectedItem
    setForm({
      nombre: p.nombre,
      codigo_barras: p.codigo_barras ?? '',
      categoria_id: p.categoria_id ? String(p.categoria_id) : '',
      unidad_venta: p.unidad_venta ?? 'UN',
      en_oferta: Boolean(p.en_oferta),
      precio_costo: p.precio_costo > 0 ? String(p.precio_costo) : '',
      iva: String(p.iva ?? 21),
      utilidad_minorista: p.utilidad_minorista > 0 ? String(p.utilidad_minorista) : '',
      precio: String(p.precio ?? 0),
      utilidad_mayorista: p.utilidad_mayorista > 0 ? String(p.utilidad_mayorista) : '',
      precio_mayorista: String(p.precio_mayorista ?? 0),
      control_stock: Boolean(p.control_stock ?? true),
      stock: String(p.stock ?? 0),
      stock_minimo: String(p.stock_minimo ?? 0),
      stock_maximo: String(p.stock_maximo ?? 0),
    })
    setTab('general')
    setError('')
    setModal({ modo: 'editar', id: p.id })
  }

  function cerrarModal() {
    setModal(null)
    setError('')
  }

  async function guardar() {
    if (!form.nombre.trim()) {
      setError('La descripción es obligatoria')
      setTab('general')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const datos = {
        nombre: form.nombre.trim(),
        codigo_barras: form.codigo_barras.trim() || null,
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
        unidad_venta: form.unidad_venta,
        en_oferta: form.en_oferta ? 1 : 0,
        precio_costo: parseFloat(form.precio_costo) || 0,
        iva: parseFloat(form.iva) || 21,
        utilidad_minorista: parseFloat(form.utilidad_minorista) || 0,
        precio: parseFloat(form.precio) || 0,
        utilidad_mayorista: parseFloat(form.utilidad_mayorista) || 0,
        precio_mayorista: parseFloat(form.precio_mayorista) || 0,
        control_stock: form.control_stock ? 1 : 0,
        stock: parseInt(form.stock) || 0,
        stock_minimo: parseInt(form.stock_minimo) || 0,
        stock_maximo: parseInt(form.stock_maximo) || 0,
        estado: 'activo',
      }
      if (modal.modo === 'crear') {
        await window.api.productos.crear(datos)
      } else {
        await window.api.productos.actualizar({ id: modal.id, ...datos })
      }
      await cargarDatos()
      cerrarModal()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function importarExcel() {
    setImportando(true)
    try {
      const resultado = await window.api.importar.excel()
      if (resultado) {
        setResultImport(resultado)
        await cargarDatos()
      }
    } catch (e) {
      setResultImport({ error: e.message })
    } finally {
      setImportando(false)
    }
  }

  async function toggleDiscontinuar() {
    if (!selectedItem) return
    if (selectedItem.estado === 'discontinuado') {
      await window.api.productos.reactivar(selectedItem.id)
    } else {
      if (!confirm(`¿Discontinuar "${selectedItem.nombre}"?\nNo podrá venderse hasta reactivarlo.`)) return
      await window.api.productos.discontinuar(selectedItem.id)
    }
    await cargarDatos()
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#1a1f2e]">

      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Artículos</h1>
          <p className="text-sm text-slate-400 mt-0.5">{productos.length} artículos registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={importarExcel}
            disabled={importando}
            className={CLS_BTN_GHOST}
          >
            {importando ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            {importando ? 'Importando...' : 'Importar Excel'}
          </button>
          <button onClick={abrirEditar} disabled={!selectedId} className={CLS_BTN_GHOST}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modificar
          </button>
          <button
            onClick={toggleDiscontinuar}
            disabled={!selectedId}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2a2f42] hover:bg-[#323850] border border-[#2d3348] text-amber-400 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d={
                selectedItem?.estado === 'discontinuado'
                  ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                  : 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'
              } />
            </svg>
            {selectedItem?.estado === 'discontinuado' ? 'Reactivar' : 'Discontinuar'}
          </button>
          <button
            onClick={abrirCrear}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition shadow-lg shadow-emerald-900/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo artículo
          </button>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="px-6 pb-4">
        <div className="relative max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código o descripción..."
            className="w-full bg-[#242938] border border-[#2d3348] rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 mx-6 mb-6 rounded-xl border border-[#2d3348] overflow-hidden bg-[#242938] flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#1e2334]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-36">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Descripción</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-32">Rubro</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider w-32">Precio venta</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider w-20">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-32">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3348]/50">
              {productosFiltrados.map((p, i) => {
                const isSelected = p.id === selectedId
                const lowStock = p.control_stock && p.stock <= p.stock_minimo && p.stock_minimo > 0
                const rowBg = isSelected
                  ? 'bg-emerald-900/[0.15] border-l-2 border-l-emerald-500'
                  : i % 2 !== 0
                  ? 'bg-[#1f2437] hover:bg-[#252b40]'
                  : 'hover:bg-[#252b40]'
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(isSelected ? null : p.id)}
                    className={`cursor-pointer transition-colors ${rowBg}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 tabular-nums">
                      {p.codigo_barras ?? <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-100">
                      <span>{p.nombre}</span>
                      {p.en_oferta ? (
                        <span className="ml-2 text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-semibold tracking-wide">OFERTA</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {p.categoria_nombre ?? <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-400 tabular-nums">
                      {fmt(p.precio)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.control_stock ? (
                        <span className={`inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded text-xs font-medium tabular-nums ${
                          lowStock ? 'bg-red-900/40 text-red-400' : 'bg-slate-700/60 text-slate-300'
                        }`}>
                          {p.stock}
                        </span>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                        p.estado === 'discontinuado'
                          ? 'bg-amber-900/25 text-amber-400'
                          : 'bg-emerald-900/25 text-emerald-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          p.estado === 'discontinuado' ? 'bg-amber-400' : 'bg-emerald-400'
                        }`} />
                        {p.estado === 'discontinuado' ? 'Discontinuado' : 'Activo'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {productosFiltrados.length === 0 && (
            <div className="py-20 text-center">
              <div className="text-slate-600 text-sm">
                {busqueda ? 'Sin resultados para la búsqueda' : 'No hay artículos registrados'}
              </div>
              {!busqueda && (
                <button onClick={abrirCrear} className="mt-3 text-sm text-emerald-500 hover:text-emerald-400 transition">
                  Crear el primer artículo →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal resultado importación ── */}
      {resultImport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2d3348] bg-[#1e2334] shadow-2xl p-6">
            {resultImport.error ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15 shrink-0">
                    <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    </svg>
                  </div>
                  <h2 className="text-white font-semibold text-lg">Error en la importación</h2>
                </div>
                <p className="text-rose-300 text-sm mb-5">{resultImport.error}</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 shrink-0">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-white font-semibold text-lg">Importación completada</h2>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">{resultImport.insertados}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Nuevos</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-400">{resultImport.actualizados}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Actualizados</p>
                  </div>
                  <div className="rounded-xl bg-slate-500/10 border border-slate-500/20 p-3 text-center">
                    <p className="text-2xl font-bold text-slate-400">{resultImport.omitidos}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Omitidos</p>
                  </div>
                </div>

                {resultImport.errores?.length > 0 && (
                  <div className="mb-4 rounded-xl border border-rose-800/40 bg-rose-950/30 p-3">
                    <p className="text-xs font-semibold text-rose-400 mb-2">
                      {resultImport.errores.length} fila{resultImport.errores.length > 1 ? 's' : ''} con error
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {resultImport.errores.map((e, i) => (
                        <div key={i} className="text-xs text-rose-300">
                          Fila {e.fila}: {e.motivo}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => setResultImport(null)}
              className="w-full py-2.5 rounded-xl bg-[#2a2f42] hover:bg-[#323850] border border-[#2d3348] text-slate-200 text-sm font-medium transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal artículo ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-2xl rounded-2xl border border-[#2d3348] shadow-2xl flex flex-col"
            style={{ backgroundColor: '#1e2334', maxHeight: '90vh' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d3348] shrink-0">
              <h2 className="font-semibold text-white">
                {modal.modo === 'crear' ? 'Nuevo artículo' : 'Modificar artículo'}
              </h2>
              <button onClick={cerrarModal} className="text-slate-500 hover:text-slate-300 transition p-1 rounded-lg hover:bg-[#2d3348]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 shrink-0 border-b border-[#2d3348]">
              {[
                { id: 'general', label: 'General' },
                { id: 'precios', label: 'Precios' },
                { id: 'stock', label: 'Stock' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition ${
                    tab === t.id
                      ? 'text-emerald-400 border-emerald-500'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2.5 text-sm text-red-400">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              {/* ─── Tab: General ─── */}
              {tab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className={CLS_LABEL}>Descripción *</label>
                    <input
                      value={form.nombre}
                      onChange={(e) => setField('nombre', e.target.value)}
                      placeholder="Nombre del artículo"
                      autoFocus
                      className={CLS_INPUT}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={CLS_LABEL}>Código de barras</label>
                      <input
                        value={form.codigo_barras}
                        onChange={(e) => setField('codigo_barras', e.target.value)}
                        placeholder="EAN / código interno"
                        className={`${CLS_INPUT} font-mono`}
                      />
                    </div>
                    <div>
                      <label className={CLS_LABEL}>Rubro</label>
                      <select
                        value={form.categoria_id}
                        onChange={(e) => setField('categoria_id', e.target.value)}
                        className={CLS_INPUT}
                      >
                        <option value="">Sin rubro</option>
                        {categorias.map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={CLS_LABEL}>Unidad de venta</label>
                      <div className="flex gap-2">
                        {['UN', 'KG'].map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setField('unidad_venta', u)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${
                              form.unidad_venta === u
                                ? 'bg-emerald-600/15 border-emerald-500 text-emerald-400'
                                : 'bg-[#161b2a] border-[#2d3348] text-slate-400 hover:border-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {u === 'UN' ? 'Unidad' : 'Kilo'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-end pb-1">
                      <label
                        className="flex items-center gap-3 cursor-pointer select-none"
                        onClick={() => setField('en_oferta', !form.en_oferta)}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                          form.en_oferta ? 'bg-emerald-500 border-emerald-500' : 'border-[#2d3348] bg-[#161b2a]'
                        }`}>
                          {form.en_oferta && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm text-slate-300">Artículo en oferta</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Tab: Precios ─── */}
              {tab === 'precios' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={CLS_LABEL}>Precio costo</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.precio_costo}
                          onChange={(e) => setField('precio_costo', e.target.value)}
                          placeholder="0.00"
                          className={`${CLS_INPUT} pl-7`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={CLS_LABEL}>IVA</label>
                      <div className="flex gap-1.5">
                        {[{ v: '21', l: '21%' }, { v: '10.5', l: '10,5%' }, { v: '0', l: '0%' }].map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => setField('iva', opt.v)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${
                              form.iva === opt.v
                                ? 'bg-emerald-600/15 border-emerald-500 text-emerald-400'
                                : 'bg-[#161b2a] border-[#2d3348] text-slate-400 hover:border-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Minorista */}
                  <div className="rounded-xl border border-[#2d3348] bg-[#161b2a] p-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                      Lista Minorista
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={CLS_LABEL}>% Utilidad</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={form.utilidad_minorista}
                            onChange={(e) => setField('utilidad_minorista', e.target.value)}
                            placeholder="0"
                            className={`${CLS_INPUT} pr-7`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">%</span>
                        </div>
                      </div>
                      <div>
                        <label className={CLS_LABEL}>Precio venta</label>
                        <div className="h-[38px] px-3 rounded-lg border border-[#2d3348] bg-[#242938] flex items-center">
                          <span className="text-emerald-400 font-bold text-base tabular-nums">{fmt(form.precio)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mayorista */}
                  <div className="rounded-xl border border-[#2d3348] bg-[#161b2a] p-4">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                      Lista Mayorista
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={CLS_LABEL}>% Utilidad</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={form.utilidad_mayorista}
                            onChange={(e) => setField('utilidad_mayorista', e.target.value)}
                            placeholder="0"
                            className={`${CLS_INPUT} pr-7`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">%</span>
                        </div>
                      </div>
                      <div>
                        <label className={CLS_LABEL}>Precio venta</label>
                        <div className="h-[38px] px-3 rounded-lg border border-[#2d3348] bg-[#242938] flex items-center">
                          <span className="text-emerald-400 font-bold text-base tabular-nums">{fmt(form.precio_mayorista)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600">
                    Fórmula: Precio venta = Costo × (1 + IVA%) × (1 + Utilidad%)
                  </p>
                </div>
              )}

              {/* ─── Tab: Stock ─── */}
              {tab === 'stock' && (
                <div className="space-y-5">
                  <div>
                    <label
                      className="flex items-center gap-3 cursor-pointer select-none"
                      onClick={() => setField('control_stock', !form.control_stock)}
                    >
                      <div className={`w-11 h-6 rounded-full relative transition-colors ${
                        form.control_stock ? 'bg-emerald-600' : 'bg-[#2d3348]'
                      }`}>
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          form.control_stock ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-200">Controlar stock</span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {form.control_stock
                            ? 'Se descuenta stock automáticamente al vender'
                            : 'Stock no controlado para este artículo'}
                        </p>
                      </div>
                    </label>
                  </div>

                  {form.control_stock && (
                    <div className="grid grid-cols-3 gap-4 pt-1">
                      <div>
                        <label className={CLS_LABEL}>Stock actual</label>
                        <input
                          type="number"
                          min="0"
                          value={form.stock}
                          onChange={(e) => setField('stock', e.target.value)}
                          className={CLS_INPUT}
                        />
                      </div>
                      <div>
                        <label className={CLS_LABEL}>Stock mínimo</label>
                        <input
                          type="number"
                          min="0"
                          value={form.stock_minimo}
                          onChange={(e) => setField('stock_minimo', e.target.value)}
                          className={CLS_INPUT}
                        />
                        <p className="text-[11px] text-slate-600 mt-1">Alerta de reposición</p>
                      </div>
                      <div>
                        <label className={CLS_LABEL}>Stock máximo</label>
                        <input
                          type="number"
                          min="0"
                          value={form.stock_maximo}
                          onChange={(e) => setField('stock_maximo', e.target.value)}
                          className={CLS_INPUT}
                        />
                        <p className="text-[11px] text-slate-600 mt-1">Límite de inventario</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-[#2d3348] shrink-0">
              <button
                onClick={cerrarModal}
                className="flex-1 py-2 rounded-lg bg-[#2a2f42] hover:bg-[#323850] border border-[#2d3348] text-slate-200 text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/30"
              >
                {guardando ? 'Guardando...' : modal.modo === 'crear' ? 'Crear artículo' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
