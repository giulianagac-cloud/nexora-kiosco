# Skill: Frontend — Componentes y Páginas React

Guía práctica para crear componentes y páginas en el renderer de este proyecto.

---

## Estructura del renderer

```
src/renderer/src/
├── App.jsx              ← router + auth guard
├── main.jsx             ← entry point (HashRouter)
├── index.css            ← clases base + estilos de impresión
├── components/
│   └── Layout/
│       └── Sidebar.jsx  ← único componente compartido actual
└── pages/
    ├── Login.jsx
    ├── Venta.jsx
    ├── Articulos.jsx
    ├── Historial.jsx
    ├── Caja.jsx
    └── Configuracion.jsx
```

Páginas van en `pages/`. Componentes reutilizables van en `components/`.

---

## Anatomía de una página

```jsx
import { useState, useEffect } from 'react'

export default function MiPagina() {
  // 1. Estado local
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [selected, setSelected] = useState(null)
  const [error, setError]       = useState('')

  // 2. Carga inicial
  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    try {
      const data = await window.api.miDominio.listar()
      setItems(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // 3. Handlers
  async function handleGuardar(datos) {
    try {
      if (selected) {
        await window.api.miDominio.actualizar({ id: selected.id, ...datos })
      } else {
        await window.api.miDominio.crear(datos)
      }
      setModal(false)
      setSelected(null)
      await cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  // 4. Render
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Mi Página</h1>
        <button
          onClick={() => { setSelected(null); setModal(true) }}
          className="btn btn-primary"
        >
          Nuevo
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-500/15 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="text-slate-400 text-sm">Cargando...</div>
      ) : (
        <Tabla items={items} onEditar={(i) => { setSelected(i); setModal(true) }} />
      )}

      {/* Modal */}
      {modal && (
        <Modal
          item={selected}
          onGuardar={handleGuardar}
          onCerrar={() => { setModal(false); setSelected(null) }}
        />
      )}
    </div>
  )
}
```

---

## Tokens de color — referencia rápida

### Fondos

```jsx
// Página / pantalla completa
className="bg-[#1a1f2e]"          // o bg-slate-900

// Card / panel
className="bg-[#242938]"

// Sub-panel / modal interior
className="bg-[#1e2437]"

// Panel más oscuro
className="bg-[#161b2a]"
```

### Texto

```jsx
className="text-white"            // títulos principales
className="text-slate-300"        // texto normal
className="text-slate-400"        // texto secundario, placeholders
className="text-slate-500"        // texto deshabilitado
```

### Bordes

```jsx
className="border border-[#313545]"    // borde estándar
className="border border-[#2d3348]"    // borde alternativo
```

### Botones (usar clases globales de index.css)

```jsx
className="btn btn-primary"   // verde emerald — acción principal
className="btn btn-secondary" // gris — acción secundaria
className="btn btn-danger"    // rojo rose — eliminar, anular
className="btn btn-success"   // verde — confirmar positivo
```

### Badges de estado

```jsx
// Activo
<span className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-xs">Activo</span>

// Anulado / error
<span className="bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded text-xs">Anulado</span>

// Medio de pago
<span className="bg-blue-500/15 text-blue-400 ...">Débito</span>
<span className="bg-violet-500/15 text-violet-400 ...">Crédito</span>
<span className="bg-sky-500/15 text-sky-400 ...">MercadoPago</span>
<span className="bg-amber-500/15 text-amber-400 ...">Transferencia</span>
```

---

## Patrón de tabla

```jsx
<div className="bg-[#242938] rounded-xl border border-[#313545] overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-[#313545]">
        <th className="text-left text-slate-400 font-medium px-4 py-3">Columna</th>
        <th className="text-right text-slate-400 font-medium px-4 py-3">Acciones</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-[#313545]">
      {items.map(item => (
        <tr key={item.id} className="hover:bg-[#1e2437] transition-colors">
          <td className="px-4 py-3 text-white">{item.nombre}</td>
          <td className="px-4 py-3 text-right">
            <button
              onClick={() => onEditar(item)}
              className="text-slate-400 hover:text-white transition-colors text-xs"
            >
              Editar
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## Patrón de modal

```jsx
function Modal({ item, onGuardar, onCerrar }) {
  const [form, setForm] = useState({
    nombre: item?.nombre ?? '',
    // ...
  })

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await onGuardar(form)
  }

  return (
    // Overlay
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      {/* Panel */}
      <div className="bg-[#1e2437] border border-[#313545] rounded-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            {item ? 'Editar' : 'Nuevo'}
          </h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nombre</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              className="input w-full"
              required
            />
          </div>

          {/* Footer */}
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

## Patrón de pestañas

```jsx
const TABS = ['General', 'Precios', 'Stock']
const [tab, setTab] = useState('General')

// Tab bar
<div className="flex border-b border-[#313545] mb-6">
  {TABS.map(t => (
    <button
      key={t}
      onClick={() => setTab(t)}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
        tab === t
          ? 'border-emerald-500 text-emerald-400'
          : 'border-transparent text-slate-400 hover:text-white'
      }`}
    >
      {t}
    </button>
  ))}
</div>

// Contenido condicional
{tab === 'General' && <PanelGeneral />}
{tab === 'Precios'  && <PanelPrecios />}
{tab === 'Stock'    && <PanelStock />}
```

---

## Patrón de tarjeta de resumen

```jsx
<div className="bg-[#242938] border border-[#313545] rounded-xl p-4">
  <p className="text-slate-400 text-xs mb-1">Etiqueta</p>
  <p className="text-2xl font-bold text-white">$ 12.500</p>
  <p className="text-slate-500 text-xs mt-1">Descripción secundaria</p>
</div>

// Tarjeta destacada (saldo actual en Caja)
<div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
  <p className="text-emerald-400 text-xs mb-1">Saldo actual</p>
  <p className="text-2xl font-bold text-emerald-400">$ 12.500</p>
</div>
```

---

## Input estándar

La clase global `.input` (definida en `index.css`) aplica el estilo base. Úsarla siempre:

```jsx
<input className="input w-full" type="text" placeholder="Buscar..." />
<input className="input w-full" type="number" min="0" step="0.01" />
<select className="input w-full">
  <option value="">Seleccionar...</option>
</select>
<textarea className="input w-full" rows={3} />
```

---

## Llamadas a la API

Siempre `async/await` con `try/catch`. No asumir que el main process no va a tirar error.

```jsx
// En un handler de formulario
async function handleGuardar() {
  try {
    await window.api.miDominio.crear(form)
    // éxito → cerrar modal, recargar
  } catch (e) {
    setError(e.message)   // mostrar error al usuario
  }
}

// En useEffect para carga inicial
useEffect(() => {
  window.api.miDominio.listar().then(setItems).catch(console.error)
}, [])
```

---

## Routing

Las rutas se definen en `App.jsx`. Para navegar desde un componente:

```jsx
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()
navigate('/mi-ruta')
```

Para links en el Sidebar usar `NavLink` de `react-router-dom`.

---

## Reglas generales

- Un archivo por página. Las sub-secciones (modales, subcomponentes grandes) pueden ir en el mismo archivo como funciones internas si solo se usan allí.
- No usar CSS modules ni styled-components; solo Tailwind y las clases globales de `index.css`.
- No hay Context ni store global (Redux, Zustand, etc.); el estado es local a cada página.
- `window.api` es la única vía de comunicación con el main process. No importar módulos de Node ni de Electron directamente en el renderer.
- El router usa `HashRouter` (URLs del tipo `/#/venta`). No usar `BrowserRouter`.
