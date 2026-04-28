import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

const MEDIOS_PAGO = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'debito',        label: 'Débito' },
  { value: 'credito',       label: 'Crédito' },
  { value: 'mercadopago',   label: 'MercadoPago' },
  { value: 'transferencia', label: 'Transferencia' }
]
const BILLETES = [1000, 2000, 5000, 10000, 20000]

function fmt(n) {
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}
function parseNum(v) {
  const n = Number(String(v).replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

// ─── Cobro Modal ──────────────────────────────────────────────────────────────
function CobroModal({ total, unidades, onConfirmar, onClose }) {
  const [pagos, setPagos] = useState([{ tipo: 'efectivo', monto: '' }])

  const pagosSum  = pagos.reduce((s, p) => s + parseNum(p.monto), 0)
  const efSum     = pagos.filter(p => p.tipo === 'efectivo').reduce((s, p) => s + parseNum(p.monto), 0)
  const vuelto    = Math.max(0, efSum - total)
  const pendiente = Math.max(0, total - pagosSum)
  const isValido  = total > 0 && pagosSum >= total

  const toggle = (tipo) =>
    setPagos(prev =>
      prev.some(p => p.tipo === tipo)
        ? prev.filter(p => p.tipo !== tipo)
        : [...prev, { tipo, monto: '' }]
    )

  const setMonto = (tipo, valor) =>
    setPagos(prev => prev.map(p => p.tipo === tipo ? { ...p, monto: valor } : p))

  const addBillete = (valor) =>
    setPagos(prev => {
      const ef = prev.find(p => p.tipo === 'efectivo')
      if (!ef) return [...prev, { tipo: 'efectivo', monto: String(valor) }]
      return prev.map(p => p.tipo === 'efectivo' ? { ...p, monto: String(parseNum(p.monto) + valor) } : p)
    })

  const setExacto = () =>
    setPagos(prev =>
      prev.some(p => p.tipo === 'efectivo')
        ? prev.map(p => p.tipo === 'efectivo' ? { ...p, monto: String(total) } : p)
        : [...prev, { tipo: 'efectivo', monto: String(total) }]
    )

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const tieneEfectivo = pagos.some(p => p.tipo === 'efectivo')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-[440px] rounded-3xl bg-[#242938] border border-[#313545] shadow-2xl flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="bg-[#1e2437] rounded-t-3xl px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-white font-bold text-xl">Cobrar</h2>
            <p className="text-slate-400 text-sm">{unidades} {unidades === 1 ? 'producto' : 'productos'}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Total</p>
            <p className="text-emerald-400 font-bold text-3xl">{fmt(total)}</p>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">

          {/* Medios de pago */}
          <div>
            <p className="text-slate-500 text-[11px] uppercase tracking-wider mb-3">Medios de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {MEDIOS_PAGO.map(mp => {
                const activo = pagos.some(p => p.tipo === mp.value)
                return (
                  <button
                    key={mp.value}
                    onClick={() => toggle(mp.value)}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                      activo
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                        : 'bg-[#1e2437] text-slate-300 hover:bg-[#2a3147]'
                    }`}
                  >
                    {mp.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Inputs por método */}
          {pagos.length > 0 && (
            <div className="space-y-2">
              {pagos.map(pago => {
                const mp = MEDIOS_PAGO.find(m => m.value === pago.tipo)
                return (
                  <div key={pago.tipo} className="flex items-center gap-3 rounded-2xl bg-[#1e2437] px-4 py-3">
                    <span className="min-w-[110px] text-slate-200 text-sm font-medium">{mp?.label}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={pago.monto}
                      onChange={e => setMonto(pago.tipo, e.target.value)}
                      className="flex-1 rounded-xl bg-[#151926] border border-slate-700/60 px-3 py-2 text-right text-white text-sm focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Billetes rápidos */}
          {tieneEfectivo && (
            <div>
              <p className="text-slate-500 text-[11px] uppercase tracking-wider mb-3">Billetes rápidos</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={setExacto}
                  className="col-span-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 py-2.5 text-sm font-semibold hover:bg-emerald-500/20 transition"
                >
                  Exacto — {fmt(total)}
                </button>
                {BILLETES.map(v => (
                  <button
                    key={v}
                    onClick={() => addBillete(v)}
                    className="rounded-2xl bg-[#1e2437] text-slate-100 py-2.5 text-sm font-semibold hover:bg-[#2a3147] transition"
                  >
                    {fmt(v)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resumen cobro */}
          <div className="rounded-2xl bg-[#1e2437] p-4 space-y-2.5">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Pagado</span>
              <span className="font-medium text-slate-200">{fmt(pagosSum)}</span>
            </div>
            {vuelto > 0 && (
              <div className="flex justify-between">
                <span className="text-emerald-400 font-semibold text-base">Vuelto</span>
                <span className="text-emerald-400 font-bold text-xl">{fmt(vuelto)}</span>
              </div>
            )}
            {pendiente > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-rose-400">Falta cubrir</span>
                <span className="text-rose-400 font-semibold">{fmt(pendiente)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 space-y-2 shrink-0">
          <button
            onClick={() => onConfirmar({ pagos, vuelto })}
            disabled={!isValido}
            className="w-full rounded-3xl bg-emerald-500 py-4 text-base font-bold text-white hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Confirmar cobro
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-3xl bg-[#1e2437] py-3 text-sm font-semibold text-slate-300 hover:bg-[#2a3147] transition"
          >
            Volver al ticket
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Ticket Modal ─────────────────────────────────────────────────────────────
function TicketModal({ venta, onImprimir, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-sm rounded-3xl bg-[#242938] border border-[#313545] shadow-2xl p-7 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-white font-bold text-xl mb-1">Venta registrada</h2>
        <p className="text-3xl font-bold text-emerald-400 mb-1">{fmt(venta.total)}</p>
        {venta.vuelto > 0 && (
          <p className="text-slate-400 text-sm mb-5">
            Vuelto: <span className="text-emerald-300 font-semibold">{fmt(venta.vuelto)}</span>
          </p>
        )}
        {!venta.vuelto && <div className="mb-5" />}
        <p className="text-slate-400 text-sm mb-6">¿Deseas imprimir el ticket?</p>
        <div className="space-y-2">
          <button
            onClick={onImprimir}
            className="w-full rounded-3xl bg-[#1e2437] border border-[#313545] py-3 text-sm font-semibold text-slate-200 hover:bg-[#2a3147] transition"
          >
            Imprimir ticket
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-3xl bg-emerald-500 py-3 text-sm font-bold text-white hover:bg-emerald-400 transition"
          >
            Continuar sin imprimir
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Print Ticket (solo visible al imprimir) ──────────────────────────────────
function PrintTicket({ venta }) {
  if (!venta) return null
  return (
    <div className="print-ticket">
      <div style={{ fontFamily: 'monospace', fontSize: 12, width: 280, margin: '0 auto', padding: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <strong style={{ fontSize: 14 }}>Mi Kiosco</strong>
          <br />
          {new Date().toLocaleString('es-AR')}
          <br />
          <span>{'─'.repeat(34)}</span>
        </div>
        {venta.items.map((item, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ flex: 1, overflow: 'hidden' }}>{item.nombre}</span>
              <span style={{ whiteSpace: 'nowrap' }}>
                {item.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div style={{ color: '#666', fontSize: 11 }}>
              {item.cantidad} x ${item.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        ))}
        <div>{'─'.repeat(34)}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: 8, fontSize: 14 }}>
          <span>TOTAL</span>
          <span>${venta.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
        </div>
        {venta.vuelto > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span>Vuelto</span>
            <span>${venta.vuelto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: 14, color: '#888' }}>
          ¡Gracias por su compra!
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Venta() {
  const navigate = useNavigate()
  const [cajaAbierta, setCajaAbierta] = useState(null)
  const [busqueda, setBusqueda]       = useState('')
  const [resultados, setResultados]   = useState([])
  const [carrito, setCarrito]         = useState([])
  const [ajusteTipo, setAjusteTipo]   = useState('descuento')
  const [ajusteValor, setAjusteValor] = useState('')
  const [ajusteModo, setAjusteModo]   = useState('monto')
  const [showCobro, setShowCobro]     = useState(false)
  const [showTicket, setShowTicket]   = useState(false)
  const [ventaData, setVentaData]     = useState(null)
  const [procesando, setProcesando]   = useState(false)
  const [mensaje, setMensaje]         = useState(null)
  const inputRef = useRef(null)

  const totalRaw = useMemo(
    () => carrito.reduce((s, i) => s + i.precio * i.cantidad, 0),
    [carrito]
  )

  const ajusteNum = parseNum(ajusteValor)
  const ajusteMonto = useMemo(() => {
    const base = ajusteModo === '%' ? (totalRaw * ajusteNum / 100) : ajusteNum
    return ajusteTipo === 'descuento' ? -base : base
  }, [ajusteModo, ajusteNum, ajusteTipo, totalRaw])

  const total    = Math.max(0, totalRaw + ajusteMonto)
  const unidades = carrito.reduce((s, i) => s + i.cantidad, 0)

  useEffect(() => {
    window.api.caja.estado().then(s => setCajaAbierta(Boolean(s)))
  }, [])

  useEffect(() => {
    if (cajaAbierta) inputRef.current?.focus()
  }, [cajaAbierta])

  const buscar = useCallback(async (texto) => {
    setBusqueda(texto)
    if (texto.trim().length < 2) { setResultados([]); return }
    const res = await window.api.productos.listar({ busqueda: texto, estado: 'activo' })
    setResultados(res)
  }, [])

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const idx = prev.findIndex(i => i.producto_id === producto.id)
      if (idx >= 0) {
        const c = [...prev]
        c[idx] = { ...c[idx], cantidad: c[idx].cantidad + 1 }
        return c
      }
      return [...prev, {
        producto_id: producto.id,
        codigo: producto.codigo_barras,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: 1
      }]
    })
    setBusqueda('')
    setResultados([])
    inputRef.current?.focus()
  }

  const actualizarCantidad = (idx, cantidad) => {
    if (cantidad < 1) return eliminarItem(idx)
    setCarrito(prev => {
      const c = [...prev]
      c[idx] = { ...c[idx], cantidad }
      return c
    })
  }

  const eliminarItem = (idx) => setCarrito(prev => prev.filter((_, i) => i !== idx))

  const limpiar = () => {
    setCarrito([])
    setBusqueda('')
    setResultados([])
    setAjusteTipo('descuento')
    setAjusteValor('')
    setAjusteModo('monto')
    inputRef.current?.focus()
  }

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' && busqueda.trim()) {
      const exacto = await window.api.productos.buscarCodigo(busqueda)
      if (exacto) { agregarAlCarrito(exacto); return }
      if (resultados.length === 1) agregarAlCarrito(resultados[0])
    }
    if (e.key === 'Escape') { setBusqueda(''); setResultados([]) }
  }

  const confirmarCobro = async ({ pagos, vuelto }) => {
    setProcesando(true)
    try {
      const medio_pago = pagos.length === 1 ? pagos[0].tipo : 'mixto'
      await window.api.ventas.crear({
        items: carrito,
        total,
        descuento: ajusteMonto,
        medio_pago,
        medio_pago_detalle: JSON.stringify(pagos)
      })
      setVentaData({ total, vuelto, items: [...carrito] })
      setShowCobro(false)
      setShowTicket(true)
    } catch (e) {
      setShowCobro(false)
      setMensaje({ tipo: 'error', texto: e.message })
      setTimeout(() => setMensaje(null), 5000)
    } finally {
      setProcesando(false)
    }
  }

  const handleImprimir = () => {
    setShowTicket(false)
    window.print()
    limpiar()
  }

  const handleSinImprimir = () => {
    setShowTicket(false)
    limpiar()
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (cajaAbierta === null) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1a1f2e]">
        <p className="text-slate-400 text-sm">Verificando caja...</p>
      </div>
    )
  }

  // ─── Caja cerrada ─────────────────────────────────────────────────────────
  if (!cajaAbierta) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1a1f2e]">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#2d3348]">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Caja cerrada</h2>
          <p className="text-sm text-slate-400 mb-6 max-w-xs">
            Para registrar ventas primero tenés que abrir la caja.
          </p>
          <button
            onClick={() => navigate('/caja')}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-400"
          >
            Ir a Caja
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // ─── PdV principal ────────────────────────────────────────────────────────
  return (
    <>
      {/* Ticket de impresión (oculto en pantalla, visible solo al imprimir) */}
      <PrintTicket venta={ventaData} />

      {/* Modal de cobro */}
      {showCobro && (
        <CobroModal
          total={total}
          unidades={unidades}
          onConfirmar={confirmarCobro}
          onClose={() => setShowCobro(false)}
        />
      )}

      {/* Modal de confirmación de ticket */}
      {showTicket && ventaData && (
        <TicketModal
          venta={ventaData}
          onImprimir={handleImprimir}
          onClose={handleSinImprimir}
        />
      )}

      <div className="flex h-full bg-[#1a1f2e]">

        {/* ── Panel izquierdo: ticket ── */}
        <div className="flex-1 flex flex-col p-5 gap-4 overflow-hidden min-w-0">

          {/* Banner de mensaje */}
          {mensaje && (
            <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${
              mensaje.tipo === 'ok'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}>
              {mensaje.texto}
            </div>
          )}

          {/* Buscador */}
          <div className="rounded-3xl bg-[#242938] border border-[#313545] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h1 className="text-lg font-semibold text-white">Punto de Venta</h1>
                <p className="text-xs text-slate-400">Código de barras o descripción — Enter para agregar</p>
              </div>
              <span className="rounded-2xl bg-emerald-500/20 px-3 py-1.5 text-emerald-200 text-xs font-semibold">PdV</span>
            </div>
            <div className="relative">
              <input
                ref={inputRef}
                value={busqueda}
                onChange={e => buscar(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setResultados([]), 150)}
                placeholder="Escanear o buscar producto..."
                className="w-full rounded-2xl bg-[#1e2437] border border-[#313545] px-4 py-3 text-base text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 pr-10"
              />
              {busqueda && (
                <button
                  onClick={() => { setBusqueda(''); setResultados([]); inputRef.current?.focus() }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>

            {resultados.length > 0 && (
              <div className="mt-2 rounded-3xl border border-[#313545] bg-[#151926] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden">
                {resultados.map(p => (
                  <button
                    key={p.id}
                    onMouseDown={() => agregarAlCarrito(p)}
                    className="w-full px-4 py-3 text-left hover:bg-[#1f263b] border-b border-[#262f44] last:border-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{p.nombre}</div>
                        <div className="text-xs text-slate-500">
                          {p.codigo_barras || 'Sin código'} · Stock: {p.stock}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-emerald-400 shrink-0">{fmt(p.precio)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grilla de ítems */}
          <div className="flex-1 rounded-3xl bg-[#242938] border border-[#313545] overflow-auto">
            {carrito.length === 0 ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 text-slate-500">
                <svg className="w-12 h-12 opacity-25" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                <span className="text-sm">Agregá productos para comenzar la venta</span>
              </div>
            ) : (
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead className="sticky top-0 bg-[#242938] z-10">
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3 border-b border-[#313545]">#</th>
                    <th className="px-4 py-3 border-b border-[#313545]">Código</th>
                    <th className="px-4 py-3 border-b border-[#313545]">Descripción</th>
                    <th className="px-4 py-3 border-b border-[#313545] text-center">Cantidad</th>
                    <th className="px-4 py-3 border-b border-[#313545] text-right">P. Unit.</th>
                    <th className="px-4 py-3 border-b border-[#313545] text-right">Importe</th>
                    <th className="px-2 py-3 border-b border-[#313545]" />
                  </tr>
                </thead>
                <tbody>
                  {carrito.map((item, idx) => (
                    <tr key={idx} className="border-b border-[#2d3448]/60 hover:bg-[#1e2437]/50">
                      <td className="px-4 py-3 text-slate-500 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{item.codigo || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-100 max-w-[200px] truncate">{item.nombre}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => actualizarCantidad(idx, item.cantidad - 1)}
                            className="w-7 h-7 rounded-xl bg-[#1e2437] text-slate-300 hover:bg-[#2a3147] text-base leading-none"
                          >−</button>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={e => actualizarCantidad(idx, Number(e.target.value))}
                            className="w-14 rounded-xl bg-[#1e2437] border border-slate-700/50 px-2 py-1 text-center text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50"
                          />
                          <button
                            onClick={() => actualizarCantidad(idx, item.cantidad + 1)}
                            className="w-7 h-7 rounded-xl bg-[#1e2437] text-slate-300 hover:bg-[#2a3147] text-base leading-none"
                          >+</button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{fmt(item.precio)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-white">{fmt(item.precio * item.cantidad)}</td>
                      <td className="px-2 py-3 text-right">
                        <button
                          onClick={() => eliminarItem(idx)}
                          className="rounded-xl px-2 py-1 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Panel derecho: resumen + cobro ── */}
        <div className="w-[320px] shrink-0 flex flex-col gap-4 overflow-y-auto p-5 bg-[#151926] border-l border-[#252c3f]">

          {/* Resumen */}
          <div className="rounded-3xl border border-[#313545] bg-[#242938] p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-300 font-semibold">Resumen</span>
              <span className="text-xs text-slate-500">{unidades} unidades</span>
            </div>

            <div className="space-y-3">
              {/* Subtotal */}
              <div className="flex justify-between text-sm text-slate-400">
                <span>Subtotal</span>
                <span className="text-slate-200">{fmt(totalRaw)}</span>
              </div>

              {/* Descuento / Recargo */}
              <div className="rounded-2xl bg-[#1e2437] p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAjusteTipo('descuento')}
                    className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                      ajusteTipo === 'descuento' ? 'bg-emerald-500 text-white' : 'bg-[#252c3f] text-slate-400 hover:text-slate-200'
                    }`}
                  >Desc.</button>
                  <button
                    onClick={() => setAjusteTipo('recargo')}
                    className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                      ajusteTipo === 'recargo' ? 'bg-rose-500 text-white' : 'bg-[#252c3f] text-slate-400 hover:text-slate-200'
                    }`}
                  >Rec.</button>
                  <div className="ml-auto flex gap-1">
                    <button
                      onClick={() => setAjusteModo('monto')}
                      className={`rounded-lg px-2 py-0.5 text-xs font-mono font-bold transition ${
                        ajusteModo === 'monto' ? 'bg-slate-600 text-white' : 'bg-[#252c3f] text-slate-500'
                      }`}
                    >$</button>
                    <button
                      onClick={() => setAjusteModo('%')}
                      className={`rounded-lg px-2 py-0.5 text-xs font-mono font-bold transition ${
                        ajusteModo === '%' ? 'bg-slate-600 text-white' : 'bg-[#252c3f] text-slate-500'
                      }`}
                    >%</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={ajusteValor}
                    onChange={e => setAjusteValor(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder={ajusteModo === '%' ? '0 %' : '0,00'}
                    className="flex-1 rounded-xl bg-[#151926] border border-slate-700/50 px-3 py-1.5 text-right text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50"
                  />
                  {ajusteNum > 0 && (
                    <span className={`text-xs font-semibold shrink-0 ${ajusteTipo === 'descuento' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ajusteTipo === 'descuento' ? '−' : '+'}{fmt(Math.abs(ajusteMonto))}
                    </span>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-[#313545] pt-3 flex items-end justify-between">
                <p className="text-slate-400 text-sm">Total</p>
                <p className="text-4xl font-bold text-white leading-none">{fmt(total)}</p>
              </div>
            </div>
          </div>

          {/* Botón principal Cobrar */}
          <button
            onClick={() => { if (carrito.length > 0 && total > 0) setShowCobro(true) }}
            disabled={carrito.length === 0 || total <= 0 || procesando}
            className="w-full rounded-3xl bg-emerald-500 py-5 text-lg font-bold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {procesando ? 'Procesando...' : carrito.length > 0 && total > 0 ? `Cobrar ${fmt(total)}` : 'Cobrar'}
          </button>

          {/* Cancelar */}
          {carrito.length > 0 && (
            <button
              onClick={limpiar}
              className="w-full rounded-3xl bg-[#242938] border border-[#313545] py-3 text-sm font-semibold text-slate-300 hover:bg-[#2a3147] transition"
            >
              Cancelar venta
            </button>
          )}
        </div>
      </div>
    </>
  )
}
