import { useState, useEffect } from 'react'

function formatPrecio(n) {
  return `$${Number(n ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

function formatFecha(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function Caja() {
  const [sesion, setSesion] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalApertura, setModalApertura] = useState(false)
  const [modalMovimiento, setModalMovimiento] = useState(null)
  const [saldoInicial, setSaldoInicial] = useState('')
  const [movForm, setMovForm] = useState({ tipo: 'ingreso', monto: '', descripcion: '' })
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setCargando(true)
    const [s, h] = await Promise.all([
      window.api.caja.estado(),
      window.api.caja.historial()
    ])
    setSesion(s)
    setHistorial(h)
    if (s) {
      const movs = await window.api.caja.movimientos(s.id)
      setMovimientos(movs)
    }
    setCargando(false)
  }

  const abrirCaja = async () => {
    setProcesando(true)
    try {
      const s = await window.api.caja.abrir(Number(saldoInicial) || 0)
      setSesion(s)
      setMovimientos([])
      setModalApertura(false)
      setSaldoInicial('')
    } finally {
      setProcesando(false)
    }
  }

  const cerrarCaja = async () => {
    if (!confirm('¿Cerrar la caja del día? Esta acción es definitiva.')) return
    setProcesando(true)
    try {
      await window.api.caja.cerrar(sesion.id)
      await cargar()
    } finally {
      setProcesando(false)
    }
  }

  const registrarMovimiento = async () => {
    if (!movForm.monto || isNaN(Number(movForm.monto))) return
    setProcesando(true)
    try {
      await window.api.caja.movimiento({
        sesion_id: sesion.id,
        tipo: movForm.tipo,
        monto: Number(movForm.monto),
        descripcion: movForm.descripcion
      })
      const movs = await window.api.caja.movimientos(sesion.id)
      setMovimientos(movs)
      setModalMovimiento(null)
      setMovForm({ tipo: 'ingreso', monto: '', descripcion: '' })
    } finally {
      setProcesando(false)
    }
  }

  if (cargando) {
    return <div className="flex items-center justify-center h-full text-gray-400">Cargando...</div>
  }

  return (
    <div className="p-5 h-full flex flex-col gap-4 overflow-auto">
      <h1 className="text-xl font-bold text-gray-900">Caja</h1>

      {/* Estado actual */}
      {sesion ? (
        <div className="card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-semibold text-green-700">Caja abierta</span>
              </div>
              <p className="text-sm text-gray-500">Apertura: {formatFecha(sesion.fecha_apertura)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalMovimiento(true)} className="btn-secondary text-sm">
                + Movimiento
              </button>
              <button onClick={cerrarCaja} disabled={procesando} className="btn-danger text-sm">
                Cerrar caja
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div>
              <p className="text-xs text-gray-500">Saldo inicial</p>
              <p className="text-lg font-bold">{formatPrecio(sesion.saldo_inicial)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Movimientos</p>
              <p className="text-lg font-bold">{movimientos.length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sesión #</p>
              <p className="text-lg font-bold">{sesion.id}</p>
            </div>
          </div>

          {/* Movimientos del día */}
          {movimientos.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Movimientos</h3>
              <div className="space-y-1">
                {movimientos.map((m) => (
                  <div key={m.id} className="flex justify-between items-center text-sm py-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`badge ${
                          m.tipo === 'ingreso'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {m.tipo}
                      </span>
                      <span className="text-gray-600">{m.descripcion || '—'}</span>
                    </div>
                    <span className={`font-semibold ${m.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.tipo === 'ingreso' ? '+' : '-'}{formatPrecio(m.monto)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">La caja está cerrada. Abrí la caja para comenzar a vender.</p>
          <button onClick={() => setModalApertura(true)} className="btn-primary">
            Abrir caja
          </button>
        </div>
      )}

      {/* Historial de sesiones */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Historial de sesiones</h2>
        <div className="card overflow-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Apertura</th>
                <th className="px-4 py-3 font-medium">Cierre</th>
                <th className="px-4 py-3 font-medium text-center">Ventas</th>
                <th className="px-4 py-3 font-medium text-right">Facturado</th>
                <th className="px-4 py-3 font-medium text-right">Saldo final</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">#{s.id}</td>
                  <td className="px-4 py-2.5 text-gray-600">{formatFecha(s.fecha_apertura)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{formatFecha(s.fecha_cierre)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="badge bg-gray-100 text-gray-700">{s.total_ventas}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatPrecio(s.monto_ventas)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">
                    {s.saldo_final != null ? formatPrecio(s.saldo_final) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`badge ${
                        s.estado === 'abierta'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {historial.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">Sin historial</div>
          )}
        </div>
      </div>

      {/* Modal apertura */}
      {modalApertura && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-80">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold">Abrir caja</h2>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saldo inicial (efectivo en caja)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                placeholder="0.00"
                className="input"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && abrirCaja()}
              />
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={() => setModalApertura(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={abrirCaja} disabled={procesando} className="btn-primary flex-1">
                Abrir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal movimiento */}
      {modalMovimiento && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-80">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold">Registrar movimiento</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <div className="flex gap-2">
                  {['ingreso', 'egreso'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setMovForm((f) => ({ ...f, tipo: t }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        movForm.tipo === t
                          ? t === 'ingreso'
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-red-600 text-white border-red-600'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Monto</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={movForm.monto}
                  onChange={(e) => setMovForm((f) => ({ ...f, monto: e.target.value }))}
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  value={movForm.descripcion}
                  onChange={(e) => setMovForm((f) => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Retiro de efectivo"
                  className="input"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={() => setModalMovimiento(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={registrarMovimiento} disabled={procesando} className="btn-primary flex-1">
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
