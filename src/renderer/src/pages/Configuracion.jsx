import { useState, useEffect } from 'react'

// ─── shared styles ────────────────────────────────────────────────────────────
const CLS_INPUT = 'w-full rounded-xl bg-[#161b2a] border border-[#2d3348] px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition'
const CLS_LABEL = 'block text-xs font-medium text-slate-400 mb-1.5'
const CLS_CARD  = 'rounded-2xl bg-[#242938] border border-[#313545] p-5'

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none
        ${checked ? 'bg-emerald-600' : 'bg-[#2d3348]'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform
        ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

// ─── Flash banner ─────────────────────────────────────────────────────────────
function Flash({ flash }) {
  if (!flash) return null
  return (
    <div className={`fixed top-4 right-4 z-50 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl flex items-center gap-2
      ${flash.tipo === 'ok'
        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'}`}
    >
      {flash.tipo === 'ok'
        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>}
      {flash.texto}
    </div>
  )
}

// ─── Tab: Negocio ─────────────────────────────────────────────────────────────
function TabNegocio({ config, onChange, onFlash }) {
  const [guardando, setGuardando] = useState(false)

  async function uploadLogo() {
    const b64 = await window.api.config.uploadLogo()
    if (b64) onChange('negocio_logo', b64)
  }

  async function guardar() {
    setGuardando(true)
    try {
      await window.api.config.setMany({
        negocio_razon_social:   config.negocio_razon_social   ?? '',
        negocio_nombre_comercial: config.negocio_nombre_comercial ?? '',
        negocio_cuit:           config.negocio_cuit           ?? '',
        negocio_condicion_iva:  config.negocio_condicion_iva  ?? 'monotributo',
        negocio_domicilio:      config.negocio_domicilio      ?? '',
        negocio_telefono:       config.negocio_telefono       ?? '',
        negocio_email:          config.negocio_email          ?? '',
        negocio_web:            config.negocio_web            ?? '',
        negocio_nombre:         config.negocio_nombre_comercial ?? 'Mi Kiosco',
      })
      onFlash('ok', 'Datos del negocio guardados')
    } catch (e) {
      onFlash('error', e.message)
    } finally {
      setGuardando(false)
    }
  }

  const f = (key) => config[key] ?? ''
  const set = (key) => (e) => onChange(key, e.target.value)

  return (
    <div className="grid grid-cols-[220px_1fr] gap-8">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-full aspect-square rounded-2xl bg-[#161b2a] border-2 border-dashed border-[#2d3348] flex flex-col items-center justify-center overflow-hidden">
          {f('negocio_logo') ? (
            <img src={f('negocio_logo')} alt="Logo" className="w-full h-full object-contain p-2" />
          ) : (
            <div className="text-center text-slate-600 px-4">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs">Sin logo</p>
            </div>
          )}
        </div>
        <button onClick={uploadLogo} className="w-full rounded-xl bg-[#2a2f42] border border-[#2d3348] py-2 text-sm text-slate-200 hover:bg-[#323850] transition">
          Subir logo
        </button>
        {f('negocio_logo') && (
          <button onClick={() => onChange('negocio_logo', '')} className="w-full rounded-xl py-2 text-xs text-slate-500 hover:text-rose-400 transition">
            Quitar logo
          </button>
        )}
        <p className="text-xs text-slate-600 text-center">PNG, JPG o WebP recomendado</p>
      </div>

      {/* Formulario */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={CLS_LABEL}>Razón Social</label>
            <input value={f('negocio_razon_social')} onChange={set('negocio_razon_social')} placeholder="Nombre legal" className={CLS_INPUT} />
          </div>
          <div>
            <label className={CLS_LABEL}>Nombre Comercial</label>
            <input value={f('negocio_nombre_comercial')} onChange={set('negocio_nombre_comercial')} placeholder="Mi Kiosco" className={CLS_INPUT} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={CLS_LABEL}>CUIT</label>
            <input value={f('negocio_cuit')} onChange={set('negocio_cuit')} placeholder="20-12345678-9" className={CLS_INPUT} />
          </div>
          <div>
            <label className={CLS_LABEL}>Condición frente al IVA</label>
            <select value={f('negocio_condicion_iva')} onChange={set('negocio_condicion_iva')} className={CLS_INPUT}>
              <option value="monotributo">Monotributista</option>
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="exento">Exento</option>
              <option value="consumidor_final">Consumidor Final</option>
            </select>
          </div>
        </div>
        <div>
          <label className={CLS_LABEL}>Domicilio</label>
          <input value={f('negocio_domicilio')} onChange={set('negocio_domicilio')} placeholder="Av. Corrientes 1234, CABA" className={CLS_INPUT} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={CLS_LABEL}>Teléfono</label>
            <input value={f('negocio_telefono')} onChange={set('negocio_telefono')} placeholder="11 1234-5678" className={CLS_INPUT} />
          </div>
          <div>
            <label className={CLS_LABEL}>Email</label>
            <input type="email" value={f('negocio_email')} onChange={set('negocio_email')} placeholder="info@mikiosco.com" className={CLS_INPUT} />
          </div>
          <div>
            <label className={CLS_LABEL}>Página web</label>
            <input value={f('negocio_web')} onChange={set('negocio_web')} placeholder="www.mikiosco.com" className={CLS_INPUT} />
          </div>
        </div>
        <div className="pt-2">
          <button
            onClick={guardar}
            disabled={guardando}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar datos del negocio'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal usuario ────────────────────────────────────────────────────────────
function ModalUsuario({ modo, usuario, onGuardar, onClose }) {
  const [form, setForm] = useState(
    modo === 'crear'
      ? { nombre: '', usuario: '', password: '', confirmar: '', rol: 'operador' }
      : modo === 'editar'
      ? { nombre: usuario.nombre, usuario: usuario.usuario, rol: usuario.rol }
      : { password: '', confirmar: '' }
  )
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleGuardar() {
    setError('')
    if ((modo === 'crear' || modo === 'password') && form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden'); return
    }
    setGuardando(true)
    try {
      await onGuardar(form)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const titulo = { crear: 'Nuevo usuario', editar: 'Modificar usuario', password: 'Cambiar contraseña' }[modo]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#313545] bg-[#1e2334] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#313545]">
          <h2 className="font-semibold text-white">{titulo}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-[#2d3348] transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-950/50 border border-rose-800/50 px-3 py-2.5 text-sm text-rose-400">{error}</div>
          )}
          {(modo === 'crear' || modo === 'editar') && (
            <>
              <div>
                <label className={CLS_LABEL}>Nombre completo</label>
                <input value={form.nombre} onChange={set('nombre')} placeholder="Juan Pérez" autoFocus className={CLS_INPUT} />
              </div>
              <div>
                <label className={CLS_LABEL}>Usuario</label>
                <input value={form.usuario} onChange={set('usuario')} placeholder="juanp" className={CLS_INPUT} />
              </div>
              <div>
                <label className={CLS_LABEL}>Rol</label>
                <div className="flex gap-2">
                  {['operador', 'admin'].map(r => (
                    <button key={r} type="button" onClick={() => setForm(f => ({ ...f, rol: r }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition border ${
                        form.rol === r
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                          : 'bg-[#161b2a] border-[#2d3348] text-slate-400 hover:border-slate-500'
                      }`}>
                      {r === 'admin' ? 'Administrador' : 'Operador'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {(modo === 'crear' || modo === 'password') && (
            <>
              <div>
                <label className={CLS_LABEL}>{modo === 'crear' ? 'Contraseña' : 'Nueva contraseña'}</label>
                <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" className={CLS_INPUT} />
              </div>
              <div>
                <label className={CLS_LABEL}>Confirmar contraseña</label>
                <input type="password" value={form.confirmar} onChange={set('confirmar')} placeholder="••••••••" className={CLS_INPUT} />
              </div>
            </>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-[#2a2f42] border border-[#2d3348] text-slate-200 text-sm font-medium hover:bg-[#323850] transition">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={guardando}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Usuarios ────────────────────────────────────────────────────────────
function TabUsuarios({ usuarios, onReload, onFlash }) {
  const [modal, setModal] = useState(null) // { modo, usuario? }

  async function handleGuardar(form) {
    if (modal.modo === 'crear') {
      await window.api.usuarios.crear(form)
      onFlash('ok', 'Usuario creado correctamente')
    } else if (modal.modo === 'editar') {
      await window.api.usuarios.actualizar({ id: modal.usuario.id, ...form })
      onFlash('ok', 'Usuario actualizado')
    } else if (modal.modo === 'password') {
      await window.api.usuarios.cambiarPassword({ id: modal.usuario.id, password: form.password })
      onFlash('ok', 'Contraseña actualizada')
    }
    onReload()
  }

  async function handleEliminar(u) {
    if (!confirm(`¿Eliminar al usuario "${u.nombre}"?`)) return
    try {
      await window.api.usuarios.eliminar(u.id)
      onFlash('ok', 'Usuario eliminado')
      onReload()
    } catch (e) {
      onFlash('error', e.message)
    }
  }

  async function handleToggle(u) {
    try {
      await window.api.usuarios.toggleActivo(u.id)
      onReload()
    } catch (e) {
      onFlash('error', e.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold">Usuarios del sistema</h3>
          <p className="text-xs text-slate-500 mt-0.5">{usuarios.length} usuarios registrados</p>
        </div>
        <button
          onClick={() => setModal({ modo: 'crear' })}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      <div className="rounded-xl border border-[#313545] bg-[#1e2334] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#181f30]">
            <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2d3348]/50">
            {usuarios.map(u => (
              <tr key={u.id} className="hover:bg-[#1e2437]/60 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-100">{u.nombre}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{u.usuario}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    u.rol === 'admin'
                      ? 'bg-violet-500/15 text-violet-400'
                      : 'bg-slate-500/15 text-slate-300'
                  }`}>
                    {u.rol === 'admin' ? 'Administrador' : 'Operador'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Toggle
                    checked={Boolean(u.activo)}
                    onChange={() => handleToggle(u)}
                    disabled={u.rol === 'admin'}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setModal({ modo: 'editar', usuario: u })}
                      className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-[#2d3348] hover:text-slate-200 transition"
                    >Editar</button>
                    <button
                      onClick={() => setModal({ modo: 'password', usuario: u })}
                      className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-[#2d3348] hover:text-slate-200 transition"
                    >Contraseña</button>
                    <button
                      onClick={() => handleEliminar(u)}
                      disabled={u.rol === 'admin'}
                      className="rounded-lg px-2.5 py-1.5 text-xs text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalUsuario
          modo={modal.modo}
          usuario={modal.usuario}
          onGuardar={handleGuardar}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ─── Tab: Listas de precios ───────────────────────────────────────────────────
function TabListasPrecios({ listas: listasIniciales, onReload, onFlash }) {
  const [listas, setListas] = useState(listasIniciales)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => setListas(listasIniciales), [listasIniciales])

  const update = (id, campo, valor) =>
    setListas(prev => prev.map(l => l.id === id ? { ...l, [campo]: valor } : l))

  async function guardarTodas() {
    setGuardando(true)
    try {
      await window.api.listasPrecio.guardarTodas(listas)
      onFlash('ok', 'Listas de precios guardadas')
      onReload()
    } catch (e) {
      onFlash('error', e.message)
    } finally {
      setGuardando(false)
    }
  }

  const esFija = (tipo) => tipo === 'minorista' || tipo === 'mayorista'

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h3 className="text-white font-semibold mb-1">Listas de precios</h3>
        <p className="text-xs text-slate-500">Hasta 10 listas. Minorista y Mayorista son fijas y siempre activas.</p>
      </div>
      <div className="space-y-2">
        {listas.map(lista => (
          <div key={lista.id} className="flex items-center gap-3 rounded-xl bg-[#1e2437] border border-[#2d3348] px-4 py-3">
            <div className="w-6 text-xs text-slate-600 font-mono text-center">{lista.orden}</div>
            <Toggle
              checked={Boolean(lista.activa)}
              onChange={(v) => update(lista.id, 'activa', v)}
              disabled={esFija(lista.tipo)}
            />
            <input
              value={lista.nombre}
              onChange={e => update(lista.id, 'nombre', e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-100 outline-none border-b border-transparent focus:border-emerald-500 py-0.5 placeholder-slate-600 transition"
              placeholder="Nombre de la lista"
            />
            {esFija(lista.tipo) && (
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">{lista.tipo}</span>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={guardarTodas}
        disabled={guardando}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
      >
        {guardando ? 'Guardando...' : 'Guardar listas'}
      </button>
    </div>
  )
}

// ─── Tab: Tarjetas ────────────────────────────────────────────────────────────
function TabTarjetas({ tarjetas, onReload, onFlash }) {
  async function toggle(id) {
    try {
      await window.api.tarjetas.toggle(id)
      onReload()
    } catch (e) {
      onFlash('error', e.message)
    }
  }

  const credito = tarjetas.filter(t => t.tipo === 'credito')
  const debito  = tarjetas.filter(t => t.tipo === 'debito')

  const CardList = ({ items, titulo }) => (
    <div>
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{titulo}</h4>
      <div className="space-y-2">
        {items.map(t => (
          <div key={t.id} className="flex items-center justify-between rounded-xl bg-[#1e2437] border border-[#2d3348] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${t.activa ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className={`text-sm font-medium ${t.activa ? 'text-slate-100' : 'text-slate-500'}`}>{t.nombre}</span>
            </div>
            <Toggle checked={Boolean(t.activa)} onChange={() => toggle(t.id)} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-white font-semibold">Tarjetas aceptadas</h3>
        <p className="text-xs text-slate-500 mt-0.5">Activá o desactivá los medios de pago con tarjeta.</p>
      </div>
      <div className="grid grid-cols-2 gap-8">
        <CardList items={credito} titulo="Tarjetas de crédito" />
        <CardList items={debito}  titulo="Tarjetas de débito" />
      </div>
    </div>
  )
}

// ─── Tab: Preferencias ────────────────────────────────────────────────────────
function TabPreferencias({ config, onChange, onFlash }) {
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    try {
      await window.api.config.setMany({
        comprobante_predeterminado: config.comprobante_predeterminado ?? 'ticket',
        ticket_ancho:               config.ticket_ancho              ?? '80',
        ticket_pie_texto:           config.ticket_pie_texto          ?? '',
        alertar_stock_minimo:       config.alertar_stock_minimo      ?? '1',
      })
      onFlash('ok', 'Preferencias guardadas')
    } catch (e) {
      onFlash('error', e.message)
    } finally {
      setGuardando(false)
    }
  }

  const f   = (k) => config[k] ?? ''
  const set = (k) => (e) => onChange(k, e.target.value)

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <label className={CLS_LABEL}>Comprobante predeterminado para ventas</label>
        <select value={f('comprobante_predeterminado')} onChange={set('comprobante_predeterminado')} className={CLS_INPUT}>
          <option value="ticket">Ticket / Comprobante interno</option>
          <option value="factura_b">Factura B (Consumidor Final)</option>
          <option value="factura_a">Factura A (Responsable Inscripto)</option>
          <option value="remito">Remito</option>
        </select>
      </div>

      <div>
        <label className={CLS_LABEL}>Ancho de ticket de impresión</label>
        <div className="flex gap-3">
          {[{ v: '58', l: '58 mm (pequeño)' }, { v: '80', l: '80 mm (estándar)' }].map(opt => (
            <button
              key={opt.v}
              type="button"
              onClick={() => onChange('ticket_ancho', opt.v)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                f('ticket_ancho') === opt.v
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                  : 'bg-[#161b2a] border-[#2d3348] text-slate-400 hover:border-slate-500'
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={CLS_LABEL}>Texto al pie del ticket</label>
        <textarea
          value={f('ticket_pie_texto')}
          onChange={set('ticket_pie_texto')}
          rows={3}
          placeholder="¡Gracias por su compra!"
          className={`${CLS_INPUT} resize-none`}
        />
        <p className="text-xs text-slate-600 mt-1">Se imprime al final de cada ticket</p>
      </div>

      <div className="flex items-center gap-3">
        <Toggle
          checked={f('alertar_stock_minimo') === '1'}
          onChange={v => onChange('alertar_stock_minimo', v ? '1' : '0')}
        />
        <div>
          <p className="text-sm text-slate-200 font-medium">Alertar cuando el stock esté bajo</p>
          <p className="text-xs text-slate-500 mt-0.5">Muestra una advertencia al vender productos con stock mínimo</p>
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={guardar}
          disabled={guardando}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar preferencias'}
        </button>
      </div>
    </div>
  )
}

// ─── Tabs config ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'negocio',      label: 'Negocio' },
  { id: 'usuarios',     label: 'Usuarios' },
  { id: 'precios',      label: 'Listas de precios' },
  { id: 'tarjetas',     label: 'Tarjetas' },
  { id: 'preferencias', label: 'Preferencias' },
]

// ─── Main component ───────────────────────────────────────────────────────────
export default function Configuracion() {
  const [activeTab, setActiveTab] = useState('negocio')
  const [config,    setConfig]    = useState({})
  const [usuarios,  setUsuarios]  = useState([])
  const [listas,    setListas]    = useState([])
  const [tarjetas,  setTarjetas]  = useState([])
  const [flash,     setFlash]     = useState(null)

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    const [cfg, usrs, lsts, tjs] = await Promise.all([
      window.api.config.getAll(),
      window.api.usuarios.listar(),
      window.api.listasPrecio.listar(),
      window.api.tarjetas.listar(),
    ])
    setConfig(cfg)
    setUsuarios(usrs)
    setListas(lsts)
    setTarjetas(tjs)
  }

  function showFlash(tipo, texto) {
    setFlash({ tipo, texto })
    setTimeout(() => setFlash(null), 3000)
  }

  function changeConfig(key, value) {
    setConfig(c => ({ ...c, [key]: value }))
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1f2e]">
      <Flash flash={flash} />

      {/* Header */}
      <div className="px-6 pt-5 pb-0 shrink-0">
        <h1 className="text-xl font-bold text-white">Configuración</h1>
        <p className="text-sm text-slate-400 mt-0.5 mb-4">Administrá el sistema, usuarios y preferencias del negocio</p>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-[#2d3348]">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition ${
                activeTab === t.id
                  ? 'text-emerald-400 border-emerald-500'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === 'negocio' && (
          <TabNegocio config={config} onChange={changeConfig} onFlash={showFlash} />
        )}
        {activeTab === 'usuarios' && (
          <TabUsuarios usuarios={usuarios} onReload={cargarTodo} onFlash={showFlash} />
        )}
        {activeTab === 'precios' && (
          <TabListasPrecios listas={listas} onReload={cargarTodo} onFlash={showFlash} />
        )}
        {activeTab === 'tarjetas' && (
          <TabTarjetas tarjetas={tarjetas} onReload={cargarTodo} onFlash={showFlash} />
        )}
        {activeTab === 'preferencias' && (
          <TabPreferencias config={config} onChange={changeConfig} onFlash={showFlash} />
        )}
      </div>
    </div>
  )
}
