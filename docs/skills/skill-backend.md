# Skill: Backend — Handlers IPC y Queries SQLite

Guía práctica para agregar lógica en el main process: handlers IPC, queries con `better-sqlite3` y migraciones de schema.

---

## Dónde vive el código

```
src/main/
├── index.js              ← registra los handlers, crea la ventana
├── database/
│   ├── db.js             ← abre/crea el archivo .db, exporta getDb()
│   └── schema.js         ← CREATE TABLE + migraciones + datos iniciales
└── ipc/
    ├── auth.js
    ├── productos.js
    ├── ventas.js
    ├── caja.js
    ├── importar.js
    └── configuracion.js  ← un archivo por dominio de negocio
```

---

## 1. Agregar una tabla nueva

Editar `src/main/database/schema.js`. Agregar el `CREATE TABLE IF NOT EXISTS` dentro de la función que ejecuta el schema inicial:

```javascript
db.exec(`
  CREATE TABLE IF NOT EXISTS proveedores (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre    TEXT NOT NULL,
    telefono  TEXT,
    email     TEXT,
    activo    INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`)
```

**Convenciones de schema:**
- PK siempre: `id INTEGER PRIMARY KEY AUTOINCREMENT`
- Booleanos: `INTEGER NOT NULL DEFAULT 0` o `DEFAULT 1` (SQLite no tiene `BOOLEAN`)
- Timestamps: `TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))`
- FKs: `columna_id INTEGER REFERENCES tabla(id)` — los FK están activados con `PRAGMA foreign_keys = ON`
- Soft delete: columna `activo INTEGER NOT NULL DEFAULT 1`

### Agregar una columna a tabla existente (migración)

`better-sqlite3` no soporta `IF NOT EXISTS` en `ALTER TABLE`. Usar el patrón de try/catch que ya usa el proyecto:

```javascript
// En schema.js, después del CREATE TABLE
try {
  db.exec(`ALTER TABLE proveedores ADD COLUMN notas TEXT`)
} catch {
  // columna ya existe — ignorar
}
```

### Insertar datos iniciales

```javascript
const insertarProveedor = db.prepare(`
  INSERT OR IGNORE INTO proveedores (nombre) VALUES (?)
`)
insertarProveedor.run('Proveedor Ejemplo')
```

`INSERT OR IGNORE` evita duplicar si ya existe (útil para datos semilla).

---

## 2. Crear un archivo de handlers IPC

Crear `src/main/ipc/proveedores.js`:

```javascript
import { ipcMain } from 'electron'

export function registerProveedoresHandlers(db) {
  // --- Listar ---
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

  // --- Obtener uno ---
  ipcMain.handle('proveedores:get', (_event, id) => {
    return db.prepare(`SELECT * FROM proveedores WHERE id = ?`).get(id) ?? null
  })

  // --- Crear ---
  ipcMain.handle('proveedores:crear', (_event, datos) => {
    const stmt = db.prepare(`
      INSERT INTO proveedores (nombre, telefono, email)
      VALUES (@nombre, @telefono, @email)
    `)
    const result = stmt.run({
      nombre:   datos.nombre,
      telefono: datos.telefono ?? null,
      email:    datos.email    ?? null,
    })
    return db.prepare(`SELECT * FROM proveedores WHERE id = ?`).get(result.lastInsertRowid)
  })

  // --- Actualizar ---
  ipcMain.handle('proveedores:actualizar', (_event, datos) => {
    db.prepare(`
      UPDATE proveedores
      SET nombre = @nombre, telefono = @telefono, email = @email
      WHERE id = @id
    `).run({
      id:       datos.id,
      nombre:   datos.nombre,
      telefono: datos.telefono ?? null,
      email:    datos.email    ?? null,
    })
    return { ok: true }
  })

  // --- Eliminar (soft delete) ---
  ipcMain.handle('proveedores:eliminar', (_event, id) => {
    db.prepare(`UPDATE proveedores SET activo = 0 WHERE id = ?`).run(id)
    return { ok: true }
  })
}
```

---

## 3. Registrar los handlers en el main process

En `src/main/index.js`, agregar el import y la llamada:

```javascript
import { registerProveedoresHandlers } from './ipc/proveedores'

// Dentro de app.whenReady() o de la función que registra todos los handlers:
registerProveedoresHandlers(db)
```

---

## 4. Exponer en el preload

En `src/preload/index.js`, agregar dentro del objeto de `contextBridge.exposeInMainWorld`:

```javascript
proveedores: {
  listar:     (filtros) => ipcRenderer.invoke('proveedores:listar', filtros),
  get:        (id)      => ipcRenderer.invoke('proveedores:get', id),
  crear:      (datos)   => ipcRenderer.invoke('proveedores:crear', datos),
  actualizar: (datos)   => ipcRenderer.invoke('proveedores:actualizar', datos),
  eliminar:   (id)      => ipcRenderer.invoke('proveedores:eliminar', id),
},
```

---

## Referencia de la API de `better-sqlite3`

`better-sqlite3` es **síncrono**. No hay `async/await`, no hay callbacks.

### Preparar y ejecutar

```javascript
// .run() — para INSERT, UPDATE, DELETE. Devuelve { changes, lastInsertRowid }
const result = db.prepare('INSERT INTO t (col) VALUES (?)').run('valor')
result.lastInsertRowid  // ID del registro insertado
result.changes          // filas afectadas

// .get() — para SELECT que devuelve una fila o undefined
const row = db.prepare('SELECT * FROM t WHERE id = ?').get(42)

// .all() — para SELECT que devuelve array
const rows = db.prepare('SELECT * FROM t WHERE activo = 1').all()

// .pluck() — para SELECT que devuelve una sola columna como valor escalar
const nombre = db.prepare('SELECT nombre FROM t WHERE id = ?').pluck().get(42)
```

### Parámetros nombrados vs posicionales

```javascript
// Posicionales con ?
db.prepare('INSERT INTO t (a, b) VALUES (?, ?)').run('x', 'y')

// Nombrados con @nombre (recomendado para 3+ columnas)
db.prepare('INSERT INTO t (a, b) VALUES (@a, @b)').run({ a: 'x', b: 'y' })
```

### Transacciones

Usar cuando una operación modifica múltiples tablas y debe ser atómica:

```javascript
const crearVentaConDetalle = db.transaction((datos) => {
  const venta = db.prepare(`
    INSERT INTO ventas (sesion_id, total, medio_pago)
    VALUES (@sesion_id, @total, @medio_pago)
  `).run(datos)

  const ventaId = venta.lastInsertRowid

  const insertItem = db.prepare(`
    INSERT INTO detalle_ventas (venta_id, nombre_producto, precio_unitario, cantidad, subtotal)
    VALUES (@venta_id, @nombre_producto, @precio_unitario, @cantidad, @subtotal)
  `)

  for (const item of datos.items) {
    insertItem.run({ venta_id: ventaId, ...item })

    // Descontar stock si el producto lo controla
    if (item.producto_id) {
      db.prepare(`
        UPDATE productos SET stock = stock - ? WHERE id = ? AND control_stock = 1
      `).run(item.cantidad, item.producto_id)
    }
  }

  return ventaId
})

// Llamar la transacción (se ejecuta en una sola transacción SQLite)
ipcMain.handle('ventas:crear', (_event, datos) => {
  return crearVentaConDetalle(datos)
})
```

Si cualquier línea dentro de `db.transaction` lanza un error, SQLite hace rollback automático.

### JOINs

```javascript
const rows = db.prepare(`
  SELECT
    p.*,
    c.nombre AS categoria_nombre
  FROM productos p
  LEFT JOIN categorias c ON p.categoria_id = c.id
  WHERE p.activo = 1
  ORDER BY p.nombre ASC
`).all()
```

### Agregaciones y resúmenes

```javascript
const resumen = db.prepare(`
  SELECT
    COUNT(*)                          AS total_ventas,
    COALESCE(SUM(total), 0)           AS monto_total,
    COALESCE(SUM(CASE WHEN medio_pago = 'efectivo' THEN total ELSE 0 END), 0) AS efectivo
  FROM ventas
  WHERE date(fecha) = date('now', 'localtime')
    AND anulada = 0
`).get()
```

---

## Manejo de errores

Los errores que se lanzan en un handler IPC se propagan como rejected promises al renderer:

```javascript
ipcMain.handle('proveedores:crear', (_event, datos) => {
  if (!datos.nombre?.trim()) {
    throw new Error('El nombre es obligatorio')
  }
  // ...
})
```

En el renderer, el `await window.api.proveedores.crear(...)` va a rechazar con ese mensaje, que se puede mostrar al usuario.

---

## Convenciones de canales IPC

| Patrón | Uso |
|--------|-----|
| `dominio:listar` | GET all (con filtros opcionales) |
| `dominio:get` | GET one por ID |
| `dominio:crear` | INSERT |
| `dominio:actualizar` | UPDATE por ID |
| `dominio:eliminar` | Soft delete (`activo = 0`) |
| `dominio:toggle-activo` | Toggle booleano |
| `dominio:resumen-periodo` | Agregaciones con filtros de fecha |
| `dominio:accion-especifica` | Acciones de negocio (ej: `caja:cerrar`) |

El handler siempre recibe `(_event, ...args)`. El `_event` nunca se usa; el prefijo `_` lo marca como ignorado.

---

## Acceder a archivos del sistema (diálogos)

Para abrir un selector de archivos (como hace `importar:excel`):

```javascript
import { ipcMain, dialog } from 'electron'

ipcMain.handle('midominio:importar-archivo', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return null
  return filePaths[0]
})
```

Para convertir una imagen a base64 (como hace `configuracion:upload-logo`):

```javascript
import { readFileSync } from 'fs'

const buffer = readFileSync(filePath)
const ext    = path.extname(filePath).slice(1)
const base64 = `data:image/${ext};base64,${buffer.toString('base64')}`
```
