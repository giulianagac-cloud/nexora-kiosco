import { useState, useEffect } from 'react'

const fmt = (n) =>
  `$ ${Number(n ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const COND_IVA = [
  ['monotributo', 'Monotributista'],
  ['responsable_inscripto', 'Responsable Inscripto'],
  ['exento', 'Exento'],
  ['consumidor_final', 'Consumidor Final'],
]

const FORM_VACIO = {
  razon_social: '', nombre_comercial: '', cuit: '',
  telefono: '', celular: '', email: '',
  calle: '', numero: '', localidad: '',
  contacto: '', ingresos_brutos: '',
  condicion_iva: 'monotributo', web: '', observaciones: '',
}

// ── Modal Proveedor ────────────────────────────────────────────────────────────
function ModalProveedor({ item, onGuardar, onCerrar }) {
  const [form, setForm] = useState(item ? { ...FORM_VACIO, ...item } : { ...FORM_VACIO })
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await onGuardar(form)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const inp = 'w-full rounded-xl bg-[#161b2a] border border-[#2d3348] px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition'
  const lbl = 'block text-xs font-medium text-slate-400 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-[#313545] bg-[#1e2334] shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#313545] shrink-0">
          <h2 className="font-semibold text-white">{item ? 'Modificar proveedor' : 'Nuevo proveedor'}</h2>
          <button onClick={onCerrar} className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-[#2d3348] transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-950/50 border border-rose-800/50 px-3 py-2.5 text-sm text-rose-400">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Razón Social *</label>
              <input value={form.razon_social} onChange={set('razon_social')} required className={inp} placeholder="Distribuidora Ejemplo S.A." />
            </div>
            <div>
              <label className={lbl}>Nombre Comercial</label>
              <input value={form.nombre_comercial} onChange={set('nombre_comercial')} className={inp} placeholder="Ejemplo Distribución" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>CUIT</label>
              <input value={form.cuit} onChange={set('cuit')} className={inp} placeholder="30-12345678-9" />
            </div>
            <div>
              <label className={lbl}>Condición IVA</label>
              <select value={form.condicion_iva} onChange={set('condicion_iva')} className={inp}>
                {COND_IVA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Teléfono</label>
              <input value={form.telefono} onChange={set('telefono')} className={inp} placeholder="11 1234-5678" />
            </div>
            <div>
              <label className={lbl}>Celular</label>
              <input value={form.celular} onChange={set('celular')} className={inp} placeholder="11 9876-5432" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Email</label>
              <input type="email" value={form.email} onChange={set('email')} className={inp} placeholder="proveedor@ejemplo.com" />
            </div>
            <div>
              <label className={lbl}>Página Web</label>
              <input value={form.web} onChange={set('web')} className={inp} placeholder="www.ejemplo.com" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Calle</label>
              <input value={form.calle} onChange={set('calle')} className={inp} placeholder="Av. Corrientes" />
            </div>
            <div>
              <label className={lbl}>Número</label>
              <input value={form.numero} onChange={set('numero')} className={inp} placeholder="1234" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Localidad</label>
              <input value={form.localidad} onChange={set('localidad')} className={inp} placeholder="Buenos Aires" />
            </div>
            <div>
              <label className={lbl}>Persona de Contacto</label>
              <input value={form.contacto} onChange={set('contacto')} className={inp} placeholder="Juan Pérez" />
            </div>
          </div>

          <div>
            <label className={lbl}>Ingresos Brutos</label>
            <input value={form.ingresos_brutos} onChange={set('ingresos_brutos')} className={inp} placeholder="Nro. de inscripción o convenio multilateral" />
          </div>

          <div>
            <label className={lbl}>Observaciones</label>
            <textarea value={form.observaciones} onChange={set('observaciones')} rows={3} className={inp} placeholder="Notas adicionales..." />
          </div>
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#313545] shrink-0">
          <button type="button" onClick={onCerrar}
            className="rounded-xl bg-[#2a2f42] border border-[#2d3348] px-4 py-2 text-sm text-slate-200 hover:bg-[#323850] transition">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={guardando}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Cuenta Corriente ─────────────────────────────────────────────────────
function ModalCC({ proveedor, onCerrar }) {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saldo, setSaldo] = useState(proveedor.saldo ?? 0)
  const [form, setForm] = useState({ tipo: 'credito', monto: '', descripcion: '' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const data = await window.api.proveedores.movimientos(proveedor.id)
      setMovimientos(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleAgregar(e) {
    e.preventDefault()
    if (!form.monto || Number(form.monto) <= 0) { setError('Ingrese un monto válido'); return }
    setGuardando(true)
    setError('')
    try {
      const res = await window.api.proveedores.agregarMovimiento({
        proveedor_id: proveedor.id,
        tipo: form.tipo,
        monto: Number(form.monto),
        descripcion: form.descripcion || null,
      })
      setSaldo(res.saldo)
      setForm({ tipo: 'credito', monto: '', descripcion: '' })
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  // Running balance calculated client-side
  let balance = 0
  const filas = movimientos.map(m => {
    balance += m.tipo === 'credito' ? m.monto : -m.monto
    return { ...m, saldo_acumulado: balance }
  })

  const totalCreditos = movimientos.filter(m => m.tipo === 'credito').reduce((s, m) => s + m.monto, 0)
  const totalDebitos  = movimientos.filter(m => m.tipo === 'debito').reduce((s, m) => s + m.monto, 0)

  const inp = 'w-full rounded-xl bg-[#161b2a] border border-[#2d3348] px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition'
  const lbl = 'block text-xs font-medium text-slate-400 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-[#313545] bg-[#1e2334] shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#313545] shrink-0">
          <div>
            <h2 className="font-semibold text-white">Cuenta Corriente</h2>
            <p className="text-xs text-slate-400 mt-0.5">{proveedor.razon_social}</p>
          </div>
          <button onClick={onCerrar} className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-[#2d3348] transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#242938] border border-[#313545] rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">Total Compras</p>
              <p className="text-lg font-bold text-slate-100">{fmt(totalCreditos)}</p>
            </div>
            <div className="bg-[#242938] border border-[#313545] rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">Total Pagos</p>
              <p className="text-lg font-bold text-slate-100">{fmt(totalDebitos)}</p>
            </div>
            <div className={`rounded-xl p-4 border ${saldo > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
              <p className={`text-xs mb-1 ${saldo > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>Saldo a pagar</p>
              <p className={`text-lg font-bold ${saldo > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{fmt(saldo)}</p>
            </div>
          </div>

          {/* Tabla movimientos */}
          <div className="bg-[#242938] rounded-xl border border-[#313545] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#313545]">
              <p className="text-sm font-medium text-white">Historial de movimientos</p>
            </div>
            {loading ? (
              <p className="text-slate-400 text-sm p-4">Cargando...</p>
            ) : filas.length === 0 ? (
              <p className="text-slate-500 text-sm p-4 text-center">Sin movimientos registrados</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#313545]">
                    <th className="text-left text-slate-400 font-medium px-4 py-2.5">Fecha</th>
                    <th className="text-left text-slate-400 font-medium px-4 py-2.5">Descripción</th>
                    <th className="text-right text-slate-400 font-medium px-4 py-2.5">Compra</th>
                    <th className="text-right text-slate-400 font-medium px-4 py-2.5">Pago</th>
                    <th className="text-right text-slate-400 font-medium px-4 py-2.5">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#313545]">
                  {filas.map(m => (
                    <tr key={m.id} className="hover:bg-[#1e2437] transition-colors">
                      <td className="px-4 py-2.5 text-slate-300 text-xs">{m.fecha.slice(0, 16).replace('T', ' ')}</td>
                      <td className="px-4 py-2.5 text-slate-300">{m.descripcion ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right text-slate-300">
                        {m.tipo === 'credito' ? fmt(m.monto) : ''}
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-400">
                        {m.tipo === 'debito' ? fmt(m.monto) : ''}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-medium ${m.saldo_acumulado > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {fmt(m.saldo_acumulado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Nuevo movimiento */}
          <div className="bg-[#242938] border border-[#313545] rounded-xl p-4">
            <p className="text-sm font-medium text-white mb-3">Registrar movimiento</p>
            {error && <p className="text-rose-400 text-sm mb-3">{error}</p>}
            <form onSubmit={handleAgregar} className="grid grid-cols-4 gap-3 items-end">
              <div>
                <label className={lbl}>Tipo</label>
                <div className="flex gap-2">
                  {[['credito', 'Compra'], ['debito', 'Pago']].map(([v, l]) => (
                    <button key={v} type="button"
                      onClick={() => setForm(f => ({ ...f, tipo: v }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition border ${
                        form.tipo === v
                          ? v === 'credito'
                            ? 'bg-rose-600/20 border-rose-500 text-rose-400'
                            : 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                          : 'bg-[#161b2a] border-[#2d3348] text-slate-400 hover:border-slate-500'
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl}>Monto</label>
                <input type="number" min="0.01" step="0.01"
                  value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  className={inp} placeholder="0.00" />
              </div>
              <div>
                <label className={lbl}>Descripción</label>
                <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  className={inp} placeholder="Factura N° 001-00123" />
              </div>
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50">
                {guardando ? '...' : 'Registrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null)       // null | 'nuevo' | 'editar'
  const [selected, setSelected] = useState(null)
  const [modalCC, setModalCC] = useState(null)   // proveedor object
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(null)

  useEffect(() => { cargar() }, [busqueda])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 3000)
    return () => clearTimeout(t)
  }, [flash])

  async function cargar() {
    setLoading(true)
    try {
      const data = await window.api.proveedores.listar({ busqueda: busqueda || undefined })
      setProveedores(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGuardar(datos) {
    if (selected) {
      await window.api.proveedores.actualizar({ id: selected.id, ...datos })
      setFlash({ tipo: 'ok', texto: 'Proveedor actualizado' })
    } else {
      await window.api.proveedores.crear(datos)
      setFlash({ tipo: 'ok', texto: 'Proveedor creado' })
    }
    setModal(null)
    setSelected(null)
    await cargar()
  }

  async function handleEliminar(p) {
    if (!confirm(`¿Eliminar el proveedor "${p.razon_social}"? Esta acción no se puede deshacer.`)) return
    try {
      await window.api.proveedores.eliminar(p.id)
      setFlash({ tipo: 'ok', texto: 'Proveedor eliminado' })
      await cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  const condIvaLabel = (v) => COND_IVA.find(([k]) => k === v)?.[1] ?? v

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Flash */}
      {flash && (
        <div className={`fixed top-4 right-4 z-50 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl flex items-center gap-2
          ${flash.tipo === 'ok'
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'}`}>
          {flash.texto}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Proveedores</h1>
          <p className="text-slate-400 text-sm mt-0.5">{proveedores.length} proveedor(es) activo(s)</p>
        </div>
        <button
          onClick={() => { setSelected(null); setModal('nuevo') }}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo proveedor
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#242938] border border-[#313545] text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500 transition"
          placeholder="Buscar por razón social o CUIT..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <p className="text-slate-400 text-sm">Cargando...</p>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="bg-[#242938] rounded-xl border border-[#313545] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#313545]">
                  {['Nro.', 'Razón Social', 'Nombre Comercial', 'CUIT', 'Teléfono', 'Email', 'Condición IVA', 'Saldo', 'Acciones'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#313545]">
                {proveedores.map((p, i) => (
                  <tr key={p.id} className="hover:bg-[#1e2437] transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-white font-medium">{p.razon_social}</td>
                    <td className="px-4 py-3 text-slate-300">{p.nombre_comercial ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono text-xs">{p.cuit ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{p.telefono ?? p.celular ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{p.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{condIvaLabel(p.condicion_iva)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${(p.saldo ?? 0) > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {fmt(p.saldo)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => { setSelected(p); setModal('editar') }}
                          className="text-slate-400 hover:text-white text-xs transition-colors">
                          Modificar
                        </button>
                        <button
                          onClick={() => setModalCC(p)}
                          className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
                          Cta. Cte.
                        </button>
                        <button
                          onClick={() => handleEliminar(p)}
                          className="text-rose-400 hover:text-rose-300 text-xs transition-colors">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {proveedores.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      {busqueda ? 'Sin resultados para la búsqueda' : 'No hay proveedores cargados'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      {(modal === 'nuevo' || modal === 'editar') && (
        <ModalProveedor
          item={modal === 'editar' ? selected : null}
          onGuardar={handleGuardar}
          onCerrar={() => { setModal(null); setSelected(null) }}
        />
      )}
      {modalCC && (
        <ModalCC
          proveedor={modalCC}
          onCerrar={() => setModalCC(null)}
        />
      )}
    </div>
  )
}
