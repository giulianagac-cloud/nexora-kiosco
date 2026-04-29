# Skill: Agregar un Módulo Nuevo

Checklist completo y ordenado para añadir un módulo nuevo de punta a punta en Nexora Kiosco.

Se usa el módulo **Proveedores** como ejemplo en todos los pasos.

---

## Checklist de pasos

- [ ] 1. Definir la tabla en el schema SQLite
- [ ] 2. Crear el archivo de handlers IPC
- [ ] 3. Registrar los handlers en `index.js`
- [ ] 4. Exponer la API en el preload
- [ ] 5. Crear la página React
- [ ] 6. Registrar la ruta en `App.jsx`
- [ ] 7. Agregar el enlace en `Sidebar.jsx`

---

## Paso 1 — Tabla en el schema

**Archivo:** `src/main/database/schema.js`

Agregar dentro de la función que corre el schema inicial:

```javascript
db.exec(`
  CREATE TABLE IF NOT EXISTS proveedores (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre     TEXT NOT NULL,
    telefono   TEXT,
    email      TEXT,
    notas      TEXT,
    activo     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`)
```

Si más adelante se agrega una columna a esta tabla:

```javascript
try {
  db.exec(`ALTER TABLE proveedores ADD COLUMN cuit TEXT`)
} catch { /* ya existe */ }
```

---

## Paso 2 — Handlers IPC

**Crear:** `src/main/ipc/proveedores.js`

```javascript
import { ipcMain } from 'electron'

export function registerProveedoresHandlers(db) {
  ipcMain.handle('proveedores:listar', (_event, filtros = {}) => {
    let sql = `SELECT * FROM proveedores WHERE activo = 1`
    const params = []
    if (filtros.busqueda) {
      sql += ` AND nombre LIKE ?`
      params.push(`%${filtros.busqueda}%`)
    }
    sql += ` ORDER BY nombre ASC`
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('proveedores:crear', (_event, datos) => {
    const result = db.prepare(`
      INSERT INTO proveedores (nombre, telefono, email, notas)
      VALUES (@nombre, @telefono, @email, @notas)
    `).run({
      nombre:   datos.nombre,
      telefono: datos.telefono ?? null,
      email:    datos.email    ?? null,
      notas:    datos.notas    ?? null,
    })
    return db.prepare(`SELECT * FROM proveedores WHERE id = ?`).get(result.lastInsertRowid)
  })

  ipcMain.handle('proveedores:actualizar', (_event, datos) => {
    db.prepare(`
      UPDATE proveedores
      SET nombre = @nombre, telefono = @telefono, email = @email, notas = @notas
      WHERE id = @id
    `).run({
      id:       datos.id,
      nombre:   datos.nombre,
      telefono: datos.telefono ?? null,
      email:    datos.email    ?? null,
      notas:    datos.notas    ?? null,
    })
    return { ok: true }
  })

  ipcMain.handle('proveedores:eliminar', (_event, id) => {
    db.prepare(`UPDATE proveedores SET activo = 0 WHERE id = ?`).run(id)
    return { ok: true }
  })
}
```

---

## Paso 3 — Registrar en el main process

**Archivo:** `src/main/index.js`

```javascript
// Agregar el import junto a los demás
import { registerProveedoresHandlers } from './ipc/proveedores'

// Agregar la llamada donde se registran todos los handlers
registerProveedoresHandlers(db)
```

---

## Paso 4 — Preload (contextBridge)

**Archivo:** `src/preload/index.js`

Agregar dentro del objeto que se pasa a `contextBridge.exposeInMainWorld('api', { ... })`:

```javascript
proveedores: {
  listar:     (filtros) => ipcRenderer.invoke('proveedores:listar', filtros),
  crear:      (datos)   => ipcRenderer.invoke('proveedores:crear', datos),
  actualizar: (datos)   => ipcRenderer.invoke('proveedores:actualizar', datos),
  eliminar:   (id)      => ipcRenderer.invoke('proveedores:eliminar', id),
},
```

A partir de acá `window.api.proveedores.*` está disponible en el renderer.

---

## Paso 5 — Página React

**Crear:** `src/renderer/src/pages/Proveedores.jsx`

```jsx
import { useState, useEffect } from 'react'

export default function Proveedores() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal]     = useState(false)
  const [selected, setSelected] = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => { cargar() }, [busqueda])

  async function cargar() {
    setLoading(true)
    try {
      const data = await window.api.proveedores.listar({ busqueda })
      setItems(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function abrirNuevo()    { setSelected(null); setModal(true) }
  function abrirEditar(p)  { setSelected(p);    setModal(true) }
  function cerrarModal()   { setModal(false);   setSelected(null) }

  async function handleGuardar(datos) {
    try {
      if (selected) {
        await window.api.proveedores.actualizar({ id: selected.id, ...datos })
      } else {
        await window.api.proveedores.crear(datos)
      }
      cerrarModal()
      await cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar proveedor?')) return
    try {
      await window.api.proveedores.eliminar(id)
      await cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Proveedores</h1>
        <button onClick={abrirNuevo} className="btn btn-primary">
          + Nuevo
        </button>
      </div>

      {/* Búsqueda */}
      <input
        className="input w-full max-w-sm"
        placeholder="Buscar proveedor..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
      />

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
        <div className="bg-[#242938] rounded-xl border border-[#313545] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#313545]">
                <th className="text-left text-slate-400 font-medium px-4 py-3">Nombre</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Teléfono</th>
                <th className="text-left text-slate-400 font-medium px-4 py-3">Email</th>
                <th className="text-right text-slate-400 font-medium px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#313545]">
              {items.map(p => (
                <tr key={p.id} className="hover:bg-[#1e2437] transition-colors">
                  <td className="px-4 py-3 text-white">{p.nombre}</td>
                  <td className="px-4 py-3 text-slate-300">{p.telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{p.email ?? '—'}</td>
                  <td className="px-4 py-3 text-right flex justify-end gap-3">
                    <button
                      onClick={() => abrirEditar(p)}
                      className="text-slate-400 hover:text-white text-xs transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(p.id)}
                      className="text-rose-400 hover:text-rose-300 text-xs transition-colors"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-sm">
                    No hay proveedores cargados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ModalProveedor
          item={selected}
          onGuardar={handleGuardar}
          onCerrar={cerrarModal}
        />
      )}
    </div>
  )
}

function ModalProveedor({ item, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    nombre:   item?.nombre   ?? '',
    telefono: item?.telefono ?? '',
    email:    item?.email    ?? '',
    notas:    item?.notas    ?? '',
  })
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await onGuardar(form)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1e2437] border border-[#313545] rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            {item ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {error && (
          <p className="text-rose-400 text-sm mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange}
              className="input w-full" required />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handleChange}
              className="input w-full" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange}
              className="input w-full" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Notas</label>
            <textarea name="notas" value={form.notas} onChange={handleChange}
              className="input w-full" rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

---

## Paso 6 — Ruta en App.jsx

**Archivo:** `src/renderer/src/App.jsx`

```jsx
// Import
import Proveedores from './pages/Proveedores'

// Dentro de <Routes>
<Route path="/proveedores" element={<Proveedores />} />
```

---

## Paso 7 — Enlace en el Sidebar

**Archivo:** `src/renderer/src/components/Layout/Sidebar.jsx`

Agregar junto a los otros `NavLink`:

```jsx
<NavLink to="/proveedores" className={navClass}>
  Proveedores
</NavLink>
```

Donde `navClass` es la función que ya existe en el archivo para aplicar la clase activa con `emerald`.

---

## Verificación rápida

Una vez completados los 7 pasos, verificar:

1. `npm run dev` inicia sin errores en consola.
2. El enlace aparece en el sidebar.
3. La página carga sin errores (F12 → Console en el renderer).
4. Crear un registro desde el modal y verificar que aparece en la tabla.
5. Editar el registro y verificar que los cambios persisten.
6. Eliminar el registro y verificar que desaparece.
7. Cerrar y reabrir la app: los datos persisten (están en SQLite).

---

## Variantes comunes

### Módulo de solo lectura (sin CRUD)

Si el módulo solo muestra datos calculados (como Historial), omitir los handlers de crear/actualizar/eliminar y el modal. Usar solo `listar` con filtros.

### Módulo con relaciones

Si la tabla nueva referencia otra (ej: `productos`), cargar ambos en el `useEffect` inicial:

```jsx
useEffect(() => {
  Promise.all([
    window.api.proveedores.listar(),
    window.api.productos.listar(),
  ]).then(([provs, prods]) => {
    setProveedores(provs)
    setProductos(prods)
  })
}, [])
```

### Módulo dentro de Configuración

Si la funcionalidad es administrativa (como Tarjetas o Listas de precios), en lugar de una ruta nueva se agrega como una pestaña dentro de `Configuracion.jsx`. Igual necesita sus handlers IPC y su entrada en el preload.
