# Convenciones del Proyecto

## Nombrado general

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Componentes React | PascalCase | `CobroModal`, `Sidebar` |
| Archivos de páginas | PascalCase | `Articulos.jsx`, `Venta.jsx` |
| Archivos de handlers IPC | camelCase | `productos.js`, `configuracion.js` |
| Canales IPC | `dominio:accion` | `ventas:crear`, `caja:abrir` |
| Métodos en `window.api` | camelCase | `window.api.ventas.crear()` |
| Columnas en DB | snake_case | `precio_costo`, `fecha_apertura` |
| Tablas en DB | snake_case plural | `detalle_ventas`, `caja_sesiones` |
| Variables JS | camelCase | `saldoInicial`, `mediosPago` |
| Funciones handler | `register<Dominio>Handlers` | `registerVentasHandlers(db)` |

## Canales IPC

El nombre del canal sigue el patrón `dominio:verbo`. El dominio es siempre en español y en singular. El verbo describe la acción.

```
auth:login
productos:listar
productos:buscar-codigo     ← verbos compuestos con guión
ventas:resumen-hoy
caja:saldo-sesion
configuracion:upload-logo   ← acciones especiales en inglés si no hay traducción natural
listas-precios:guardar-todas
```

## Estructura de un handler IPC

Cada archivo en `src/main/ipc/` exporta una función `register<Dominio>Handlers(db)` que registra todos los canales del dominio.

```javascript
// src/main/ipc/ejemplo.js
import { ipcMain } from 'electron'

export function registerEjemploHandlers(db) {
  ipcMain.handle('ejemplo:listar', (_event, filtros = {}) => {
    // Las queries son síncronas (better-sqlite3)
    const stmt = db.prepare(`SELECT * FROM ejemplo WHERE activo = 1`)
    return stmt.all()
  })

  ipcMain.handle('ejemplo:crear', (_event, datos) => {
    const stmt = db.prepare(`INSERT INTO ejemplo (nombre) VALUES (?)`)
    const result = stmt.run(datos.nombre)
    return { id: result.lastInsertRowid, ...datos }
  })
}
```

**Reglas:**
- El primer parámetro del handler siempre es `_event` (ignorado con `_`).
- No usar `async/await`; `better-sqlite3` es síncrono.
- Usar transacciones para operaciones que afectan múltiples tablas: `db.transaction(() => { ... })()`.
- Lanzar errores con `throw new Error('mensaje')` para que el renderer los pueda capturar.

## Exposición en el preload

Cada método del preload mapea un canal IPC via `ipcRenderer.invoke`:

```javascript
// src/preload/index.js
ejemplo: {
  listar: (filtros) => ipcRenderer.invoke('ejemplo:listar', filtros),
  crear: (datos)   => ipcRenderer.invoke('ejemplo:crear', datos),
}
```

## Llamadas desde el renderer

Siempre vía `window.api`:

```javascript
// En cualquier componente React
const items = await window.api.ejemplo.listar({ activo: true })
const nuevo = await window.api.ejemplo.crear({ nombre: 'Test' })
```

Todos los métodos retornan promesas. Usar `try/catch` o `.catch()` para manejar errores del main process.

---

## Cómo agregar un módulo nuevo

Pasos en orden. Se toma como ejemplo un módulo llamado `Proveedores`.

### 1. Crear la tabla en el schema

En `src/main/database/schema.js`, agregar el `CREATE TABLE IF NOT EXISTS` dentro de la función que ejecuta el schema:

```javascript
db.exec(`
  CREATE TABLE IF NOT EXISTS proveedores (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre   TEXT NOT NULL,
    telefono TEXT,
    activo   INTEGER DEFAULT 1
  );
`)
```

### 2. Crear el handler IPC

Crear `src/main/ipc/proveedores.js`:

```javascript
import { ipcMain } from 'electron'

export function registerProveedoresHandlers(db) {
  ipcMain.handle('proveedores:listar', () => {
    return db.prepare('SELECT * FROM proveedores WHERE activo = 1 ORDER BY nombre').all()
  })

  ipcMain.handle('proveedores:crear', (_event, datos) => {
    const stmt = db.prepare('INSERT INTO proveedores (nombre, telefono) VALUES (?, ?)')
    const result = stmt.run(datos.nombre, datos.telefono ?? null)
    return { id: result.lastInsertRowid, ...datos }
  })
}
```

### 3. Registrar el handler en el main process

En `src/main/index.js`, importar y llamar la función de registro:

```javascript
import { registerProveedoresHandlers } from './ipc/proveedores'

// Dentro de app.whenReady():
registerProveedoresHandlers(db)
```

### 4. Exponer en el preload

En `src/preload/index.js`, agregar dentro del objeto de `contextBridge.exposeInMainWorld`:

```javascript
proveedores: {
  listar: ()      => ipcRenderer.invoke('proveedores:listar'),
  crear:  (datos) => ipcRenderer.invoke('proveedores:crear', datos),
},
```

### 5. Crear la página React

Crear `src/renderer/src/pages/Proveedores.jsx`:

```jsx
import { useState, useEffect } from 'react'

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([])

  useEffect(() => {
    window.api.proveedores.listar().then(setProveedores)
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-4">Proveedores</h1>
      {/* ... tabla, modal, etc. */}
    </div>
  )
}
```

### 6. Agregar la ruta en App.jsx

```jsx
import Proveedores from './pages/Proveedores'

// Dentro de <Routes>:
<Route path="/proveedores" element={<Proveedores />} />
```

### 7. Agregar el enlace en el Sidebar

En `src/renderer/src/components/Layout/Sidebar.jsx`, agregar un `NavLink`:

```jsx
<NavLink to="/proveedores" className={navClass}>
  Proveedores
</NavLink>
```

---

## Estilos y UI

- Usar clases Tailwind. No escribir CSS inline salvo para valores que Tailwind no puede expresar.
- El fondo de cards es `bg-[#242938]`. El fondo de la app es `#1a1f2e` / `bg-slate-900`.
- Los botones primarios usan `emerald-500` / `emerald-600`. Los destructivos usan `rose-500`.
- Los modales tienen fondo `bg-[#1e2437]` con borde `border-[#313545]`.
- Los inputs siguen la clase global `.input` definida en `index.css`.

## Impresión de tickets

El ticket se renderiza en el componente `PrintTicket` (dentro de `Venta.jsx`) con clase `.print-ticket`. El CSS en `index.css` oculta todo excepto `.print-ticket` al imprimir. El ancho objetivo es ~280px (ticket de 80mm). Usar `font-mono` para alinear columnas.
