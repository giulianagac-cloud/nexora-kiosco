import { useState, useEffect, useCallback } from 'react'

const CONDICION_IVA_LABEL = {
  consumidor_final:      'Consumidor Final',
  monotributo:           'Monotributo',
  responsable_inscripto: 'Resp. Inscripto',
}

const PROVINCIAS = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
]

function nombreCompleto(c) {
  if (c.tipo_cuenta === 'empresa') return c.nombre
  return [c.apellido, c.nombre].filter(Boolean).join(', ')
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Clientes() {
  const [clientes, setClientes]   = useState([])
  const [busqueda, setBusqueda]   = useState('')
  const [loading, setLoading]     = useState(true)
  const [modalForm, setModalForm] = useState(false)
  const [modalCC, setModalCC]     = useState(false)
  const [selected, setSelected]   = useState(null)
  const [error, setError]         = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      setClientes(await window.api.clientes.listar({ busqueda }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [busqueda])

  useEffect(() => { cargar() }, [cargar])

  function abrirNuevo()   { setSelected(null); setModalForm(true) }
  function abrirEditar(c) { setSelected(c);    setModalForm(true) }
  function abrirCC(c)     { setSelected(c);    setModalCC(true)   }
  function cerrarForm()   { setModalForm(false); setSelected(null) }
  function cerrarCC()     { setModalCC(false);   setSelected(null) }

  async function handleGuardar(datos) {
    if (selected) {
      await window.api.clientes.actualizar({ id: selected.id, ...datos })
    } else {
      await window.api.clientes.crear(datos)
    }
    cerrarForm()
    cargar()
  }

  async function handleEliminar(c) {
    if (!confirm(`¿Eliminar a ${nombreCompleto(c)}?`)) return
    try {
      await window.api.clientes.eliminar(c.id)
      cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1f2e]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#313545]">
        <div>
          <h1 className="text-lg font-semibold text-white">Clientes</h1>
          <p className="text-xs text-slate-400 mt-0.5">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={abrirNuevo} className="btn btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo cliente
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-[#313545]">
        <input
          className="input w-full max-w-sm"
          placeholder="Buscar por nombre, apellido o documento..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-3 bg-rose-500/15 border border-rose-500/30 text-rose-400 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <p className="text-slate-400 text-sm">Cargando...</p>
        ) : (
          <div className="bg-[#242938] rounded-xl border border-[#313545] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#313545]">
                  <th className="text-left text-slate-400 font-medium px-4 py-3 w-16">Nro.</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Nombre / Razón Social</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Teléfono</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Email</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Condición IVA</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Estado</th>
                  <th className="text-right text-slate-400 font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#313545]">
                {clientes.map(c => (
                  <tr key={c.id} className="hover:bg-[#1e2437] transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">{c.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{nombreCompleto(c)}</p>
                      {c.nro_documento && (
                        <p className="text-slate-500 text-xs">{c.tipo_documento} {c.nro_documento}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.telefono || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{c.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-slate-300 text-xs">
                        {CONDICION_IVA_LABEL[c.condicion_iva] ?? c.condicion_iva}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.cc_habilitada ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                          Cta. Cte.
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        {c.cc_habilitada && (
                          <button
                            onClick={() => abrirCC(c)}
                            className="text-emerald-400 hover:text-emerald-300 text-xs transition-colors"
                          >
                            Cta. Cte.
                          </button>
                        )}
                        <button
                          onClick={() => abrirEditar(c)}
                          className="text-slate-400 hover:text-white text-xs transition-colors"
                        >
                          Modificar
                        </button>
                        <button
                          onClick={() => handleEliminar(c)}
                          className="text-rose-400 hover:text-rose-300 text-xs transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {clientes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500 text-sm">
                      No se encontraron clientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalForm && (
        <ModalCliente
          cliente={selected}
          onGuardar={handleGuardar}
          onCerrar={cerrarForm}
        />
      )}

      {modalCC && selected && (
        <ModalCuentaCorriente
          cliente={selected}
          onCerrar={() => { cerrarCC(); cargar() }}
        />
      )}
    </div>
  )
}

// ─── Modal alta/edición ───────────────────────────────────────────────────────

const FORM_EMPTY = {
  tipo_cuenta:    'individuo',
  nombre:         '',
  apellido:       '',
  tipo_documento: 'DNI',
  nro_documento:  '',
  telefono:       '',
  email:          '',
  calle:          '',
  numero:         '',
  localidad:      '',
  provincia:      '',
  condicion_iva:  'consumidor_final',
  observaciones:  '',
  cc_habilitada:  false,
  cc_tipo:        'ilimitada',
  cc_limite:      '',
}

function ModalCliente({ cliente, onGuardar, onCerrar }) {
  const [tab, setTab]   = useState('datos')
  const [form, setForm] = useState(
    cliente
      ? {
          ...FORM_EMPTY,
          ...cliente,
          cc_habilitada: !!cliente.cc_habilitada,
          cc_limite:     cliente.cc_limite || '',
        }
      : FORM_EMPTY
  )
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    set(name, type === 'checkbox' ? checked : value)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    setError('')
    try {
      await onGuardar({
        ...form,
        cc_habilitada: form.cc_habilitada ? 1 : 0,
        cc_limite:     parseFloat(form.cc_limite) || 0,
      })
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const esEmpresa = form.tipo_cuenta === 'empresa'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e2437] border border-[#313545] rounded-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#313545]">
          <h2 className="text-base font-semibold text-white">
            {cliente ? 'Modificar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#313545]">
          {['datos', 'cuenta_corriente'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {t === 'datos' ? 'Datos' : 'Cuenta Corriente'}
            </button>
          ))}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <p className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            {tab === 'datos' && (
              <>
                {/* Tipo de cuenta */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Tipo de cuenta</label>
                  <div className="flex gap-2">
                    {['individuo', 'empresa'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => set('tipo_cuenta', t)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          form.tipo_cuenta === t
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-[#313545] text-slate-400 hover:text-white'
                        }`}
                      >
                        {t === 'individuo' ? 'Individuo' : 'Empresa'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nombre / Apellido */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={esEmpresa ? 'col-span-2' : ''}>
                    <label className="block text-xs text-slate-400 mb-1">
                      {esEmpresa ? 'Razón Social *' : 'Nombre *'}
                    </label>
                    <input
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      className="input w-full"
                      required
                    />
                  </div>
                  {!esEmpresa && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Apellido</label>
                      <input
                        name="apellido"
                        value={form.apellido}
                        onChange={handleChange}
                        className="input w-full"
                      />
                    </div>
                  )}
                </div>

                {/* Documento */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tipo documento</label>
                    <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} className="input w-full">
                      <option value="DNI">DNI</option>
                      <option value="CUIT">CUIT</option>
                      <option value="CUIL">CUIL</option>
                      <option value="Pasaporte">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nro. documento</label>
                    <input
                      name="nro_documento"
                      value={form.nro_documento}
                      onChange={handleChange}
                      className="input w-full"
                      placeholder="20-12345678-9"
                    />
                  </div>
                </div>

                {/* Contacto */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Teléfono</label>
                    <input name="telefono" value={form.telefono} onChange={handleChange} className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Email</label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} className="input w-full" />
                  </div>
                </div>

                {/* Domicilio */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Calle</label>
                    <input name="calle" value={form.calle} onChange={handleChange} className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Número</label>
                    <input name="numero" value={form.numero} onChange={handleChange} className="input w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Localidad</label>
                    <input name="localidad" value={form.localidad} onChange={handleChange} className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Provincia</label>
                    <select name="provincia" value={form.provincia} onChange={handleChange} className="input w-full">
                      <option value="">Seleccionar...</option>
                      {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                {/* Condición IVA */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Condición IVA</label>
                  <select name="condicion_iva" value={form.condicion_iva} onChange={handleChange} className="input w-full">
                    <option value="consumidor_final">Consumidor Final</option>
                    <option value="monotributo">Monotributo</option>
                    <option value="responsable_inscripto">Responsable Inscripto</option>
                  </select>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Observaciones</label>
                  <textarea
                    name="observaciones"
                    value={form.observaciones}
                    onChange={handleChange}
                    className="input w-full"
                    rows={3}
                  />
                </div>
              </>
            )}

            {tab === 'cuenta_corriente' && (
              <div className="space-y-5">
                {/* Toggle habilitada */}
                <div className="flex items-center justify-between p-4 bg-[#161b2a] rounded-xl border border-[#313545]">
                  <div>
                    <p className="text-white text-sm font-medium">Cuenta corriente</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Permite registrar ventas y pagos en cuenta
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set('cc_habilitada', !form.cc_habilitada)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      form.cc_habilitada ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      form.cc_habilitada ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {form.cc_habilitada && (
                  <>
                    {/* Tipo */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Tipo de cuenta corriente</label>
                      <div className="flex gap-2">
                        {['ilimitada', 'limitada'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => set('cc_tipo', t)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                              form.cc_tipo === t
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-[#313545] text-slate-400 hover:text-white'
                            }`}
                          >
                            {t === 'ilimitada' ? 'Ilimitada' : 'Limitada'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {form.cc_tipo === 'limitada' && (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Monto límite ($)</label>
                        <input
                          name="cc_limite"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.cc_limite}
                          onChange={handleChange}
                          className="input w-full max-w-xs"
                          placeholder="0.00"
                        />
                      </div>
                    )}

                    {cliente && (
                      <div className="p-4 bg-[#161b2a] rounded-xl border border-[#313545]">
                        <p className="text-xs text-slate-400 mb-1">Saldo actual</p>
                        <p className={`text-2xl font-bold ${
                          (cliente.cc_saldo ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          $ {fmt(cliente.cc_saldo)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {(cliente.cc_saldo ?? 0) > 0 ? 'Saldo a favor del negocio' : 'Sin deuda'}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#313545]">
            <button type="button" onClick={onCerrar} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal Cuenta Corriente ───────────────────────────────────────────────────

function ModalCuentaCorriente({ cliente: clienteInicial, onCerrar }) {
  const [cliente, setCliente]         = useState(clienteInicial)
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading]         = useState(true)
  const [form, setForm]               = useState({ tipo: 'debito', monto: '', descripcion: '' })
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    const [c, movs] = await Promise.all([
      window.api.clientes.get(clienteInicial.id),
      window.api.clientes.movimientos(clienteInicial.id),
    ])
    setCliente(c)
    setMovimientos(movs)
    setLoading(false)
  }, [clienteInicial.id])

  useEffect(() => { cargar() }, [cargar])

  async function handleAgregar(e) {
    e.preventDefault()
    const monto = parseFloat(form.monto)
    if (!monto || monto <= 0) { setError('Ingresá un monto válido'); return }
    setSaving(true)
    setError('')
    try {
      await window.api.clientes.agregarMovimiento({
        cliente_id:  clienteInicial.id,
        tipo:        form.tipo,
        monto,
        descripcion: form.descripcion || null,
      })
      setForm({ tipo: 'debito', monto: '', descripcion: '' })
      await cargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Saldo acumulado por fila
  let saldoAcum = 0
  const filas = movimientos.map(m => {
    saldoAcum += m.tipo === 'debito' ? m.monto : -m.monto
    return { ...m, saldoAcum }
  })

  const totalDebitos  = movimientos.filter(m => m.tipo === 'debito').reduce((s, m) => s + m.monto, 0)
  const totalCreditos = movimientos.filter(m => m.tipo === 'credito').reduce((s, m) => s + m.monto, 0)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e2437] border border-[#313545] rounded-xl w-full max-w-3xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#313545]">
          <div>
            <h2 className="text-base font-semibold text-white">{nombreCompleto(cliente)}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Cuenta Corriente</p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-white transition-colors mt-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Resumen de saldo */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-[#313545]">
          <div className="bg-[#161b2a] rounded-xl p-3 border border-[#313545]">
            <p className="text-xs text-slate-400 mb-1">Total débitos</p>
            <p className="text-lg font-bold text-rose-400">$ {fmt(totalDebitos)}</p>
          </div>
          <div className="bg-[#161b2a] rounded-xl p-3 border border-[#313545]">
            <p className="text-xs text-slate-400 mb-1">Total créditos</p>
            <p className="text-lg font-bold text-emerald-400">$ {fmt(totalCreditos)}</p>
          </div>
          <div className={`rounded-xl p-3 border ${
            (cliente.cc_saldo ?? 0) > 0
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}>
            <p className="text-xs text-slate-400 mb-1">Saldo actual</p>
            <p className={`text-lg font-bold ${
              (cliente.cc_saldo ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              $ {fmt(cliente.cc_saldo)}
            </p>
            {cliente.cc_tipo === 'limitada' && (
              <p className="text-xs text-slate-500 mt-0.5">Límite: $ {fmt(cliente.cc_limite)}</p>
            )}
          </div>
        </div>

        {/* Agregar movimiento */}
        <form onSubmit={handleAgregar} className="px-6 py-3 border-b border-[#313545]">
          <p className="text-xs text-slate-400 mb-2">Registrar movimiento</p>
          {error && <p className="text-rose-400 text-xs mb-2">{error}</p>}
          <div className="flex gap-2 items-end">
            <div>
              <div className="flex rounded-lg overflow-hidden border border-[#313545]">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tipo: 'debito' }))}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.tipo === 'debito' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Débito
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tipo: 'credito' }))}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.tipo === 'credito' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Crédito
                </button>
              </div>
            </div>
            <div className="flex-1">
              <input
                className="input w-full"
                placeholder="Descripción"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
            <div className="w-36">
              <input
                className="input w-full"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Monto"
                value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                required
              />
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary whitespace-nowrap">
              {saving ? '...' : 'Registrar'}
            </button>
          </div>
        </form>

        {/* Movimientos */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <p className="text-slate-400 text-sm">Cargando movimientos...</p>
          ) : filas.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Sin movimientos registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#313545]">
                  <th className="text-left text-slate-400 font-medium pb-2">Fecha</th>
                  <th className="text-left text-slate-400 font-medium pb-2">Descripción</th>
                  <th className="text-right text-slate-400 font-medium pb-2">Débito</th>
                  <th className="text-right text-slate-400 font-medium pb-2">Crédito</th>
                  <th className="text-right text-slate-400 font-medium pb-2">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#313545]">
                {filas.map(m => (
                  <tr key={m.id} className="hover:bg-[#161b2a] transition-colors">
                    <td className="py-2.5 pr-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(m.fecha).toLocaleString('es-AR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-300">{m.descripcion || '—'}</td>
                    <td className="py-2.5 pr-4 text-right text-rose-400">
                      {m.tipo === 'debito' ? `$ ${fmt(m.monto)}` : ''}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-emerald-400">
                      {m.tipo === 'credito' ? `$ ${fmt(m.monto)}` : ''}
                    </td>
                    <td className={`py-2.5 text-right font-medium ${
                      m.saldoAcum > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      $ {fmt(m.saldoAcum)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
