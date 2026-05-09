import { useState, useEffect, useRef } from 'react'

const fmt = (n) =>
  `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const CLS_INPUT =
  'w-full bg-[#161b2a] border border-[#2d3348] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition'
const CLS_LABEL = 'block text-xs font-medium text-slate-400 mb-1.5'

const ITEM_VACIO = { codigo_barras: '', nombre: '', precio_costo: '', cantidad: 1 }

export default function Compras() {
  const [vista, setVista] = useState('lista') // 'lista' | 'nueva'
  const [compras, setCompras] = useState([])
  const [items, setItems] = useState([])
  const [codigo, setCodigo] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [flashId, setFlashId] = useState(null)       // id del item recién agregado
  const [modalNuevo, setModalNuevo] = useState(null) // { codigo_barras } | null
  const [formNuevo, setFormNuevo] = useState(ITEM_VACIO)
  const [confirmando, setConfirmando] = useState(false)
  const [detalleModal, setDetalleModal] = useState(null) // compra completa para ver
  const [errorMsg, setErrorMsg] = useState('')

  const inputRef = useRef(null)
  const nombreRef = useRef(null)

  useEffect(() => { cargarCompras() }, [])

  useEffect(() => {
    if (vista === 'nueva') {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [vista])

  useEffect(() => {
    if (modalNuevo) setTimeout(() => nombreRef.current?.focus(), 50)
  }, [modalNuevo])

  async function cargarCompras() {
    const data = await window.api.compras.listar()
    setCompras(data)
  }

  // ── escaneo ────────────────────────────────────────────────────────────────
  async function handleScan(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    // Leer el valor del DOM para evitar desfase con el estado React (crucial para scanners)
    const cod = e.currentTarget.value.trim()
    if (!cod) return
    setCodigo('')
    setBuscando(true)
    setErrorMsg('')
    try {
      const producto = await window.api.compras.buscarCodigo(cod)
      if (producto) {
        agregarProductoExistente(producto)
      } else {
        setFormNuevo({ ...ITEM_VACIO, codigo_barras: cod })
        setModalNuevo({ codigo_barras: cod })
      }
    } catch (err) {
      setErrorMsg(err.message ?? 'Error al buscar el producto')
    } finally {
      setBuscando(false)
      inputRef.current?.focus()
    }
  }

  function agregarProductoExistente(producto) {
    setItems(prev => {
      const idx = prev.findIndex(i => i.producto_id === producto.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 }
        flash(next[idx]._key)
        return next
      }
      const key = Date.now()
      flash(key)
      return [...prev, {
        _key: key,
        producto_id: producto.id,
        esNuevo: false,
        codigo_barras: producto.codigo_barras ?? '',
        nombre: producto.nombre,
        precio_costo: producto.precio_costo ?? 0,
        cantidad: 1,
      }]
    })
  }

  function flash(key) {
    setFlashId(key)
    setTimeout(() => setFlashId(null), 800)
  }

  // ── nuevo producto (no encontrado) ─────────────────────────────────────────
  function agregarNuevo() {
    const nombre = formNuevo.nombre.trim()
    const costo = parseFloat(formNuevo.precio_costo) || 0
    const cantidad = parseInt(formNuevo.cantidad) || 1
    if (!nombre) return
    const key = Date.now()
    setItems(prev => {
      const existente = prev.find(i => i.codigo_barras && i.codigo_barras === formNuevo.codigo_barras)
      if (existente) {
        flash(existente._key)
        return prev.map(i =>
          i._key === existente._key ? { ...i, cantidad: i.cantidad + cantidad } : i
        )
      }
      flash(key)
      return [...prev, {
        _key: key,
        producto_id: null,
        esNuevo: true,
        codigo_barras: formNuevo.codigo_barras,
        nombre,
        precio_costo: costo,
        cantidad,
      }]
    })
    setModalNuevo(null)
    setFormNuevo(ITEM_VACIO)
    inputRef.current?.focus()
  }

  // ── manipulación de items ─────────────────────────────────────────────────
  function setCantidad(key, val) {
    const n = Math.max(1, parseInt(val) || 1)
    setItems(prev => prev.map(i => i._key === key ? { ...i, cantidad: n } : i))
  }

  function setPrecio(key, val) {
    setItems(prev => prev.map(i => i._key === key ? { ...i, precio_costo: parseFloat(val) || 0 } : i))
  }

  function quitarItem(key) {
    setItems(prev => prev.filter(i => i._key !== key))
  }

  const total = items.reduce((s, i) => s + i.precio_costo * i.cantidad, 0)

  // ── anular compra ─────────────────────────────────────────────────────────
  async function anularCompra(id) {
    if (!confirm('¿Anular esta compra?\nSe revertirá el stock de todos los productos.')) return
    try {
      await window.api.compras.anular(id)
      await cargarCompras()
      if (detalleModal?.id === id) setDetalleModal(prev => ({ ...prev, anulada: 1 }))
    } catch (e) {
      alert(e.message)
    }
  }

  // ── confirmar compra ──────────────────────────────────────────────────────
  async function confirmarCompra() {
    if (!items.length) return
    setConfirmando(true)
    setErrorMsg('')
    try {
      await window.api.compras.crear({ items, proveedor_id: null, observaciones: null })
      setItems([])
      setVista('lista')
      await cargarCompras()
    } catch (e) {
      setErrorMsg(e.message)
    } finally {
      setConfirmando(false)
    }
  }

  // ── ver detalle ───────────────────────────────────────────────────────────
  async function verDetalle(id) {
    const data = await window.api.compras.detalle(id)
    setDetalleModal(data)
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#1a1f2e]">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Compras</h1>
          {vista === 'lista' && (
            <p className="text-sm text-slate-400 mt-0.5">
              {compras.length} {compras.length === 1 ? 'compra registrada' : 'compras registradas'}
            </p>
          )}
          {vista === 'nueva' && (
            <p className="text-sm text-slate-400 mt-0.5">
              {items.length === 0 ? 'Escanee el código de barras para agregar productos' : `${items.length} ${items.length === 1 ? 'producto' : 'productos'} en esta compra`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {vista === 'lista' ? (
            <button
              onClick={() => { setItems([]); setVista('nueva') }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition shadow-lg shadow-emerald-900/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nueva Compra
            </button>
          ) : (
            <>
              <button
                onClick={() => { setVista('lista'); setItems([]) }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2a2f42] hover:bg-[#323850] border border-[#2d3348] text-slate-300 text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCompra}
                disabled={!items.length || confirmando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/30"
              >
                {confirmando ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {confirmando ? 'Confirmando...' : `Confirmar compra · ${fmt(total)}`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── VISTA: NUEVA COMPRA ── */}
      {vista === 'nueva' && (
        <div className="flex-1 flex flex-col min-h-0 px-6 pb-6 gap-4">

          {/* Buscador de código */}
          <div className="relative shrink-0">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 11C7 8.239 9.239 6 12 6s5 2.239 5 5-2.239 5-5 5H7V11zM7 11H4M20 11h-3" />
              <rect x="2" y="8" width="5" height="6" rx="1" />
            </svg>
            <input
              ref={inputRef}
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              onKeyDown={handleScan}
              placeholder="Escanear código de barras o tipear y presionar Enter…"
              className="w-full bg-[#242938] border-2 border-[#2d3348] focus:border-emerald-500 rounded-xl pl-11 pr-4 py-3 text-base text-slate-100 placeholder-slate-600 outline-none font-mono transition"
              disabled={buscando}
            />
            {buscando && (
              <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
          </div>

          {errorMsg && (
            <div className="shrink-0 flex items-center gap-2 rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errorMsg}
            </div>
          )}

          {/* Tabla de items */}
          <div className="flex-1 rounded-xl border border-[#2d3348] bg-[#242938] flex flex-col overflow-hidden min-h-0">
            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-600">
                <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm">Aún no hay productos en esta compra</p>
              </div>
            ) : (
              <div className="overflow-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#1e2334] z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-36">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Descripción</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider w-32">Cantidad</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider w-36">P. Costo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider w-32">Subtotal</th>
                      <th className="px-3 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d3348]/50">
                    {items.map(item => (
                      <tr
                        key={item._key}
                        className={`transition-colors ${flashId === item._key ? 'bg-emerald-900/20' : 'hover:bg-[#252b40]'}`}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                          {item.codigo_barras || <span className="text-slate-700">—</span>}
                          {item.esNuevo && (
                            <span className="ml-1.5 text-[10px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded font-semibold">NUEVO</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-100 font-medium">{item.nombre}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setCantidad(item._key, item.cantidad - 1)}
                              className="w-6 h-6 rounded bg-[#2a2f42] hover:bg-[#323850] text-slate-300 flex items-center justify-center text-sm font-bold transition"
                            >−</button>
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={e => setCantidad(item._key, e.target.value)}
                              className="w-12 text-center bg-[#161b2a] border border-[#2d3348] rounded px-1 py-0.5 text-sm text-slate-100 outline-none focus:border-emerald-500"
                            />
                            <button
                              onClick={() => setCantidad(item._key, item.cantidad + 1)}
                              className="w-6 h-6 rounded bg-[#2a2f42] hover:bg-[#323850] text-slate-300 flex items-center justify-center text-sm font-bold transition"
                            >+</button>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="relative flex justify-end">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.precio_costo}
                              onChange={e => setPrecio(item._key, e.target.value)}
                              className="w-28 text-right bg-[#161b2a] border border-[#2d3348] rounded px-2 py-0.5 pl-5 text-sm text-slate-100 outline-none focus:border-emerald-500"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-400 tabular-nums">
                          {fmt(item.precio_costo * item.cantidad)}
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => quitarItem(item._key)}
                            className="w-7 h-7 rounded hover:bg-rose-900/30 text-slate-600 hover:text-rose-400 flex items-center justify-center transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total row */}
            {items.length > 0 && (
              <div className="shrink-0 border-t border-[#2d3348] px-4 py-3 flex items-center justify-between bg-[#1e2334]">
                <span className="text-sm text-slate-400">
                  {items.reduce((s, i) => s + i.cantidad, 0)} unidades · {items.length} {items.length === 1 ? 'artículo' : 'artículos'}
                </span>
                <div className="text-right">
                  <span className="text-xs text-slate-500 mr-2">Total compra</span>
                  <span className="text-xl font-bold text-emerald-400 tabular-nums">{fmt(total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VISTA: LISTA ── */}
      {vista === 'lista' && (
        <div className="flex-1 mx-6 mb-6 rounded-xl border border-[#2d3348] bg-[#242938] flex flex-col overflow-hidden min-h-0">
          {compras.length === 0 ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-600">
              <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-sm">No hay compras registradas</p>
              <button
                onClick={() => setVista('nueva')}
                className="mt-1 text-sm text-emerald-500 hover:text-emerald-400 transition"
              >
                Registrar primera compra →
              </button>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#1e2334] z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-12">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-44">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Proveedor</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider w-24">Items</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider w-36">Total</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3348]/50">
                  {compras.map((c, i) => (
                    <tr key={c.id} className={`${i % 2 !== 0 ? 'bg-[#1f2437]' : ''} ${c.anulada ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">{c.id}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs tabular-nums">{c.fecha}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {c.proveedor_nombre ?? <span className="text-slate-600">Sin proveedor</span>}
                        {c.observaciones && (
                          <span className="ml-2 text-xs text-slate-500 italic">{c.observaciones}</span>
                        )}
                        {c.anulada ? (
                          <span className="ml-2 text-[10px] bg-rose-900/30 text-rose-400 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">Anulada</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 rounded text-xs font-medium bg-slate-700/60 text-slate-300">
                          {c.cantidad_items}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${c.anulada ? 'text-slate-500 line-through' : 'text-emerald-400'}`}>
                        {fmt(c.total)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => verDetalle(c.id)}
                            className="text-xs text-slate-400 hover:text-slate-200 transition px-2 py-1 rounded hover:bg-[#2d3348]"
                          >
                            Ver
                          </button>
                          {!c.anulada && (
                            <button
                              onClick={() => anularCompra(c.id)}
                              className="text-xs text-rose-500 hover:text-rose-400 transition px-2 py-1 rounded hover:bg-rose-900/20"
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: producto no encontrado ── */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2d3348] bg-[#1e2334] shadow-2xl">
            <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-[#2d3348]">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 shrink-0">
                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-white text-sm">Producto no encontrado</h2>
                {modalNuevo.codigo_barras && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{modalNuevo.codigo_barras}</p>
                )}
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={CLS_LABEL}>Descripción *</label>
                <input
                  ref={nombreRef}
                  value={formNuevo.nombre}
                  onChange={e => setFormNuevo(f => ({ ...f, nombre: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && agregarNuevo()}
                  placeholder="Nombre del producto"
                  className={CLS_INPUT}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={CLS_LABEL}>Precio costo</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formNuevo.precio_costo}
                      onChange={e => setFormNuevo(f => ({ ...f, precio_costo: e.target.value }))}
                      placeholder="0.00"
                      className={`${CLS_INPUT} pl-7`}
                    />
                  </div>
                </div>
                <div>
                  <label className={CLS_LABEL}>Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={formNuevo.cantidad}
                    onChange={e => setFormNuevo(f => ({ ...f, cantidad: e.target.value }))}
                    className={CLS_INPUT}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-600">
                El producto se creará en la base de datos al confirmar la compra.
              </p>
            </div>

            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={() => { setModalNuevo(null); inputRef.current?.focus() }}
                className="flex-1 py-2 rounded-lg bg-[#2a2f42] hover:bg-[#323850] border border-[#2d3348] text-slate-200 text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={agregarNuevo}
                disabled={!formNuevo.nombre.trim()}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: detalle compra ── */}
      {detalleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-[#2d3348] bg-[#1e2334] shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d3348] shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-white">Compra #{detalleModal.id}</h2>
                  {detalleModal.anulada ? (
                    <span className="text-[10px] bg-rose-900/30 text-rose-400 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">Anulada</span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{detalleModal.fecha}</p>
              </div>
              <div className="flex items-center gap-2">
                {!detalleModal.anulada && (
                  <button
                    onClick={() => anularCompra(detalleModal.id)}
                    className="text-xs text-rose-500 hover:text-rose-400 transition px-3 py-1.5 rounded-lg hover:bg-rose-900/20 border border-rose-800/40"
                  >
                    Anular compra
                  </button>
                )}
                <button
                  onClick={() => setDetalleModal(null)}
                  className="text-slate-500 hover:text-slate-300 transition p-1 rounded-lg hover:bg-[#2d3348]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#161b2a]">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">Producto</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-slate-400 w-20">Cant.</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-400 w-28">P. Costo</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-400 w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3348]/40">
                  {detalleModal.items?.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 text-slate-200">{item.nombre_producto}</td>
                      <td className="px-4 py-2.5 text-center text-slate-400">{item.cantidad}</td>
                      <td className="px-4 py-2.5 text-right text-slate-400 tabular-nums">{fmt(item.precio_costo_unitario)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-400 tabular-nums">{fmt(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-[#2d3348] flex items-center justify-between shrink-0">
              <span className="text-sm text-slate-500">
                {detalleModal.proveedor_nombre ?? 'Sin proveedor'}
              </span>
              <span className="text-lg font-bold text-emerald-400 tabular-nums">
                Total {fmt(detalleModal.total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
