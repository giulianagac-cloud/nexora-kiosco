import { useState, useEffect } from 'react'

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  `$${Number(n ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function fmtHora(str) {
  if (!str) return '—'
  return new Date(str).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function fmtFechaCompleta(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const CLS_INPUT =
  'w-full bg-[#161b2a] border border-[#2d3348] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition'
const CLS_LABEL = 'block text-xs font-medium text-slate-400 mb-1.5'

const SALDO_VACIO = { total_ventas: 0, ventas_efectivo: 0, total_ingresos: 0, total_egresos: 0 }

// ── component ─────────────────────────────────────────────────────────────────
export default function Caja({ usuario }) {
  const esAdmin = usuario?.rol === 'admin'
  const [sesion, setSesion] = useState(null)
  const [movimientos, setMovimientos] = useState([])   // ASC from IPC
  const [saldoDatos, setSaldoDatos] = useState(SALDO_VACIO)
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [saldoInicial, setSaldoInicial] = useState('')
  const [showMovModal, setShowMovModal] = useState(false)
  const [movForm, setMovForm] = useState({ tipo: 'ingreso', monto: '', descripcion: '' })
  const [showCierreModal, setShowCierreModal] = useState(false)
  const [montoContado, setMontoContado] = useState('')
  const [montoRetirar, setMontoRetirar] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const [s, hist] = await Promise.all([
      window.api.caja.estado(),
      window.api.caja.historial(),
    ])
    setSesion(s)
    setHistorial(hist)
    if (s) {
      const [movs, sd] = await Promise.all([
        window.api.caja.movimientos(s.id),
        window.api.caja.saldoSesion(s.id),
      ])
      setMovimientos(movs)
      setSaldoDatos(sd)
    } else {
      setMovimientos([])
      setSaldoDatos(SALDO_VACIO)
    }
    setCargando(false)
  }

  // ── derived: movements with running balance (display newest-first) ─────────
  const movimientosConBalance = (() => {
    if (!sesion) return []
    let bal = sesion.saldo_inicial
    const rows = [{
      id: '__apertura',
      fecha: sesion.fecha_apertura,
      descripcion: 'Apertura de caja',
      tipo: 'apertura',
      monto: sesion.saldo_inicial,
      balance: bal,
    }]
    for (const m of movimientos) {
      bal += m.tipo === 'ingreso' ? m.monto : -m.monto
      rows.push({ ...m, balance: bal })
    }
    return [...rows].reverse() // newest first
  })()

  const saldoActual = sesion
    ? sesion.saldo_inicial + saldoDatos.ventas_efectivo + saldoDatos.total_ingresos - saldoDatos.total_egresos
    : 0

  // ── actions ───────────────────────────────────────────────────────────────
  async function abrirCaja() {
    setProcesando(true)
    try {
      const s = await window.api.caja.abrir(Number(saldoInicial) || 0)
      setSesion(s)
      setMovimientos([])
      setSaldoDatos(SALDO_VACIO)
      setSaldoInicial('')
      setHistorial(await window.api.caja.historial())
    } finally {
      setProcesando(false)
    }
  }

  function cerrarCaja() {
    setMontoContado('')
    setMontoRetirar('')
    setShowCierreModal(true)
  }

  async function confirmarCierre() {
    const contado = Number(montoContado)
    setProcesando(true)
    try {
      await window.api.caja.cerrar(sesion.id, contado)
      setShowCierreModal(false)
      await cargar()
    } finally {
      setProcesando(false)
    }
  }

  function handleMontoContadoChange(val) {
    setMontoContado(val)
    setMontoRetirar(val)
  }

  async function registrarMovimiento() {
    const monto = Number(movForm.monto)
    if (!monto || monto <= 0) return
    setProcesando(true)
    try {
      await window.api.caja.movimiento({
        sesion_id: sesion.id,
        tipo: movForm.tipo,
        monto,
        descripcion: movForm.descripcion.trim() || (movForm.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'),
      })
      const [movs, sd] = await Promise.all([
        window.api.caja.movimientos(sesion.id),
        window.api.caja.saldoSesion(sesion.id),
      ])
      setMovimientos(movs)
      setSaldoDatos(sd)
      setShowMovModal(false)
      setMovForm({ tipo: 'ingreso', monto: '', descripcion: '' })
    } finally {
      setProcesando(false)
    }
  }

  function abrirModalMovimiento(tipo) {
    setMovForm({ tipo, monto: '', descripcion: '' })
    setShowMovModal(true)
  }

  async function anularMovimiento(movId) {
    if (!confirm('¿Anular este movimiento? Se registrará el movimiento inverso automáticamente.')) return
    setProcesando(true)
    try {
      await window.api.caja.anularMovimiento(movId)
      const [movs, sd] = await Promise.all([
        window.api.caja.movimientos(sesion.id),
        window.api.caja.saldoSesion(sesion.id),
      ])
      setMovimientos(movs)
      setSaldoDatos(sd)
    } catch (err) {
      alert(err.message ?? 'Error al anular el movimiento')
    } finally {
      setProcesando(false)
    }
  }

  // ── loading ───────────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1a1f2e]">
        <p className="text-slate-500 text-sm">Cargando...</p>
      </div>
    )
  }

  // ── CAJA CERRADA ──────────────────────────────────────────────────────────
  if (!sesion) {
    return (
      <div className="flex h-full bg-[#1a1f2e] overflow-auto">
        <div className="m-auto py-10 w-full max-w-sm px-4">

          {/* Apertura card */}
          <div className="rounded-2xl border border-[#2d3348] bg-[#242938] p-8 shadow-2xl">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2d3348]">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
            </div>
            <h2 className="mb-1 text-center text-xl font-bold text-white">Caja cerrada</h2>
            <p className="mb-6 text-center text-sm text-slate-400">
              Ingresá el monto inicial en efectivo para abrir la caja del día.
            </p>
            <div className="mb-5">
              <label className={CLS_LABEL}>Monto inicial</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && abrirCaja()}
                  placeholder="0.00"
                  autoFocus
                  className={`${CLS_INPUT} pl-7`}
                />
              </div>
            </div>
            <button
              onClick={abrirCaja}
              disabled={procesando}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 shadow-lg shadow-emerald-900/30"
            >
              {procesando ? 'Abriendo...' : 'Abrir caja'}
            </button>
          </div>

          {/* Historial de sesiones anteriores */}
          {historial.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Sesiones anteriores
              </h3>
              <div className="rounded-xl border border-[#2d3348] bg-[#242938] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#1e2334]">
                    <tr>
                      {['#', 'Apertura', 'Cierre', 'Saldo final'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d3348]/50">
                    {historial.slice(0, 6).map((s, i) => (
                      <tr key={s.id} className={i % 2 !== 0 ? 'bg-[#1f2437]' : ''}>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-600">#{s.id}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{fmtFechaCompleta(s.fecha_apertura)}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{fmtFechaCompleta(s.fecha_cierre)}</td>
                        <td className="px-4 py-2.5 text-xs text-right font-semibold text-slate-300">
                          {s.saldo_final != null ? fmt(s.saldo_final) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── CAJA ABIERTA ──────────────────────────────────────────────────────────
  const sesionesAnteriores = historial.filter((s) => s.id !== sesion.id)

  return (
    <div className="h-full overflow-auto bg-[#1a1f2e]">
      <div className="px-6 py-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Caja</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-slate-400">
                Sesión{' '}
                <span className="text-slate-300 font-medium">#{sesion.id}</span>
                {' · '}
                Abierta desde{' '}
                <span className="text-slate-300 font-medium">{fmtFechaCompleta(sesion.fecha_apertura)}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => abrirModalMovimiento('ingreso')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-700/40 text-emerald-400 text-sm font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Ingreso
            </button>
            <button
              onClick={() => abrirModalMovimiento('egreso')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600/15 hover:bg-red-600/25 border border-red-700/40 text-red-400 text-sm font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
              Egreso
            </button>
            <button
              onClick={cerrarCaja}
              disabled={procesando}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2a2f42] hover:bg-[#323850] border border-[#2d3348] text-slate-300 text-sm font-medium transition disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Cerrar caja
            </button>
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Saldo inicial',     value: sesion.saldo_inicial,          cls: 'text-slate-200' },
            { label: 'Ventas efectivo',   value: saldoDatos.ventas_efectivo,    cls: 'text-blue-400'  },
            { label: 'Ingresos',          value: saldoDatos.total_ingresos,     cls: 'text-emerald-400' },
            { label: 'Egresos',           value: saldoDatos.total_egresos,      cls: 'text-red-400'   },
          ].map(({ label, value, cls }) => (
            <div key={label} className="rounded-xl border border-[#2d3348] bg-[#242938] p-4">
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">{label}</p>
              <p className={`text-lg font-bold tabular-nums ${cls}`}>{fmt(value)}</p>
            </div>
          ))}
          {/* Saldo actual — highlighted */}
          <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 p-4">
            <p className="text-[11px] font-medium text-emerald-500 uppercase tracking-wider mb-2">Saldo actual</p>
            <p className={`text-2xl font-bold tabular-nums ${saldoActual < 0 ? 'text-red-400' : 'text-emerald-300'}`}>
              {fmt(saldoActual)}
            </p>
          </div>
        </div>

        {/* ── Movements table ── */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Movimientos de la sesión</h2>
          <div className="rounded-xl border border-[#2d3348] bg-[#242938] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1e2334]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-24">Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Concepto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider w-32">Ingreso</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider w-32">Egreso</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider w-36">Saldo</th>
                  {esAdmin && <th className="px-4 py-3 w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3348]/50">
                {movimientosConBalance.map((m, i) => {
                  const esAnulacion = m.descripcion?.startsWith('Anulación:')
                  const puedeAnular = m.tipo !== 'apertura' && !m.anulado && !esAnulacion
                  return (
                    <tr key={m.id} className={`${i % 2 !== 0 ? 'bg-[#1f2437]' : ''} ${m.anulado ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-xs text-slate-500 tabular-nums font-mono">
                        {fmtHora(m.fecha)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        <span className="inline-flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${
                            m.tipo === 'apertura' ? 'bg-slate-500' :
                            esAnulacion          ? 'bg-amber-400'  :
                            m.tipo === 'ingreso' ? 'bg-emerald-400' : 'bg-red-400'
                          }`} />
                          <span className={m.anulado ? 'line-through text-slate-500' : ''}>
                            {m.descripcion || (m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso')}
                          </span>
                          {m.anulado && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">Anulado</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {m.tipo === 'ingreso' || m.tipo === 'apertura' ? (
                          <span className={`font-medium ${m.anulado ? 'text-slate-600' : 'text-emerald-400'}`}>{fmt(m.monto)}</span>
                        ) : (
                          <span className="text-slate-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {m.tipo === 'egreso' ? (
                          <span className={`font-medium ${m.anulado ? 'text-slate-600' : 'text-red-400'}`}>{fmt(m.monto)}</span>
                        ) : (
                          <span className="text-slate-700">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        <span className={m.balance < 0 ? 'text-red-400' : 'text-slate-200'}>
                          {fmt(m.balance)}
                        </span>
                      </td>
                      {esAdmin && (
                        <td className="px-2 py-3 text-right">
                          {puedeAnular && (
                            <button
                              onClick={() => anularMovimiento(m.id)}
                              disabled={procesando}
                              title="Anular movimiento"
                              className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition disabled:opacity-30"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {movimientosConBalance.length === 0 && (
              <div className="py-12 text-center text-slate-600 text-sm">
                Sin movimientos manuales registrados
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            El saldo de la columna refleja movimientos manuales desde la apertura. Las ventas en efectivo se suman al saldo actual.
          </p>
        </div>

        {/* ── Historial de sesiones anteriores ── */}
        {sesionesAnteriores.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Sesiones anteriores</h2>
            <div className="rounded-xl border border-[#2d3348] bg-[#242938] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#1e2334]">
                  <tr>
                    {['#', 'Apertura', 'Cierre', 'Ventas', 'Facturado', 'Saldo final'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3348]/50">
                  {sesionesAnteriores.map((s, i) => (
                    <tr key={s.id} className={i % 2 !== 0 ? 'bg-[#1f2437]' : ''}>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">#{s.id}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">{fmtFechaCompleta(s.fecha_apertura)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">{fmtFechaCompleta(s.fecha_cierre)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="bg-slate-700/50 text-slate-300 text-xs px-2 py-0.5 rounded tabular-nums">
                          {s.total_ventas}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 tabular-nums">{fmt(s.monto_ventas)}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-slate-200 tabular-nums">
                        {s.saldo_final != null ? fmt(s.saldo_final) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal cierre de turno ── */}
      {showCierreModal && (() => {
        const contadoNum = Number(montoContado) || 0
        const diferencia = contadoNum - saldoActual
        const sobrante = diferencia > 0
        const faltante = diferencia < 0
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#2d3348] shadow-2xl" style={{ backgroundColor: '#1e2334' }}>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d3348]">
                <div>
                  <h2 className="font-semibold text-white">Resumen de cierre</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Sesión #{sesion.id}</p>
                </div>
                <button
                  onClick={() => setShowCierreModal(false)}
                  className="text-slate-500 hover:text-slate-300 transition p-1 rounded-lg hover:bg-[#2d3348]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">

                {/* Desglose */}
                <div className="rounded-xl border border-[#2d3348] bg-[#161b2a] overflow-hidden">
                  {[
                    { label: 'Saldo inicial',           value: sesion.saldo_inicial,         sign: null,  cls: 'text-slate-300' },
                    { label: 'Ventas en efectivo',       value: saldoDatos.ventas_efectivo,   sign: '+',   cls: 'text-blue-400'  },
                    { label: 'Ingresos manuales',        value: saldoDatos.total_ingresos,    sign: '+',   cls: 'text-emerald-400' },
                    { label: 'Egresos del turno',        value: saldoDatos.total_egresos,     sign: '−',   cls: 'text-rose-400'  },
                  ].map(({ label, value, sign, cls }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5 border-b border-[#2d3348]/60 last:border-0">
                      <span className="text-sm text-slate-400">{label}</span>
                      <span className={`text-sm font-medium tabular-nums ${cls}`}>
                        {sign && <span className="mr-1 text-slate-500">{sign}</span>}{fmt(value)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-3 bg-[#1a2035] border-t border-[#2d3348]">
                    <span className="text-sm font-semibold text-slate-200">Total esperado en caja</span>
                    <span className="text-base font-bold tabular-nums text-emerald-300">{fmt(saldoActual)}</span>
                  </div>
                </div>

                {/* Monto contado */}
                <div>
                  <label className={CLS_LABEL}>Monto contado físicamente</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={montoContado}
                      onChange={(e) => handleMontoContadoChange(e.target.value)}
                      placeholder="0.00"
                      autoFocus
                      className={`${CLS_INPUT} pl-7`}
                    />
                  </div>
                </div>

                {/* Diferencia */}
                {montoContado !== '' && (
                  <div className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                    diferencia === 0
                      ? 'bg-emerald-900/20 border-emerald-700/40'
                      : sobrante
                        ? 'bg-blue-900/20 border-blue-700/40'
                        : 'bg-rose-900/20 border-rose-700/40'
                  }`}>
                    <span className="text-sm font-medium text-slate-300">
                      {diferencia === 0 ? 'Sin diferencia' : sobrante ? 'Sobrante' : 'Faltante'}
                    </span>
                    <span className={`text-base font-bold tabular-nums ${
                      diferencia === 0 ? 'text-emerald-400' : sobrante ? 'text-blue-400' : 'text-rose-400'
                    }`}>
                      {diferencia === 0 ? '—' : `${sobrante ? '+' : '−'}${fmt(Math.abs(diferencia))}`}
                    </span>
                  </div>
                )}

                {/* Monto a retirar */}
                <div>
                  <label className={CLS_LABEL}>Monto a retirar</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={montoRetirar}
                      onChange={(e) => setMontoRetirar(e.target.value)}
                      placeholder="0.00"
                      className={`${CLS_INPUT} pl-7`}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">
                    Monto que se extrae físicamente del cajón al cerrar el turno.
                  </p>
                </div>

              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-[#2d3348]">
                <button
                  onClick={() => setShowCierreModal(false)}
                  className="flex-1 py-2 rounded-lg bg-[#2a2f42] hover:bg-[#323850] border border-[#2d3348] text-slate-200 text-sm font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarCierre}
                  disabled={procesando || montoContado === ''}
                  className="flex-1 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-900/30"
                >
                  {procesando ? 'Cerrando...' : 'Confirmar cierre'}
                </button>
              </div>

            </div>
          </div>
        )
      })()}

      {/* ── Modal movimiento ── */}
      {showMovModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-sm rounded-2xl border border-[#2d3348] shadow-2xl"
            style={{ backgroundColor: '#1e2334' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d3348]">
              <h2 className="font-semibold text-white">Registrar movimiento</h2>
              <button
                onClick={() => setShowMovModal(false)}
                className="text-slate-500 hover:text-slate-300 transition p-1 rounded-lg hover:bg-[#2d3348]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Tipo toggle */}
              <div>
                <label className={CLS_LABEL}>Tipo</label>
                <div className="flex gap-2">
                  {[
                    { v: 'ingreso', label: 'Ingreso', activeClass: 'bg-emerald-600/20 border-emerald-500 text-emerald-400' },
                    { v: 'egreso',  label: 'Egreso',  activeClass: 'bg-red-600/20 border-red-500 text-red-400' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setMovForm((f) => ({ ...f, tipo: opt.v }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition border ${
                        movForm.tipo === opt.v
                          ? opt.activeClass
                          : 'bg-[#161b2a] border-[#2d3348] text-slate-400 hover:border-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Concepto */}
              <div>
                <label className={CLS_LABEL}>Concepto</label>
                <input
                  value={movForm.descripcion}
                  onChange={(e) => setMovForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Retiro, Pago proveedor, Fondo cambio..."
                  className={CLS_INPUT}
                  autoFocus
                />
              </div>

              {/* Monto */}
              <div>
                <label className={CLS_LABEL}>Monto</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={movForm.monto}
                    onChange={(e) => setMovForm((f) => ({ ...f, monto: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && registrarMovimiento()}
                    placeholder="0.00"
                    className={`${CLS_INPUT} pl-7`}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-[#2d3348]">
              <button
                onClick={() => setShowMovModal(false)}
                className="flex-1 py-2 rounded-lg bg-[#2a2f42] hover:bg-[#323850] border border-[#2d3348] text-slate-200 text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={registrarMovimiento}
                disabled={procesando || !movForm.monto || Number(movForm.monto) <= 0}
                className={`flex-1 py-2 rounded-lg text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  movForm.tipo === 'ingreso'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30'
                    : 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/30'
                }`}
              >
                {procesando ? 'Registrando...' : `Registrar ${movForm.tipo}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
