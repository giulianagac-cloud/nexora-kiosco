# Arquitectura del Proyecto

## Visión general

Nexora Kiosco es una aplicación Electron. Electron corre dos procesos separados que se comunican por IPC:

```
┌─────────────────────────────────────────────────────────────┐
│  PROCESO MAIN (Node.js)                                     │
│  src/main/index.js                                          │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Ventana    │    │  IPC Handlers│    │  SQLite DB    │  │
│  │  BrowserWin │    │  ipc/*.js    │◄───│  db.js        │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│         │                  ▲                               │
└─────────┼──────────────────┼───────────────────────────────┘
          │                  │ ipcMain.handle / ipcRenderer.invoke
┌─────────┼──────────────────┼───────────────────────────────┐
│  PRELOAD (src/preload/index.js)                             │
│  contextBridge.exposeInMainWorld('api', { ... })            │
└─────────┼──────────────────┼───────────────────────────────┘
          │                  │ window.api.*
┌─────────▼──────────────────┼───────────────────────────────┐
│  PROCESO RENDERER (React)   │                               │
│  src/renderer/src/          │                               │
│                             │                               │
│  App.jsx → HashRouter → Pages → window.api calls           │
└─────────────────────────────────────────────────────────────┘
```

## Proceso Main (`src/main/`)

Corre en Node.js con acceso total al sistema operativo. Sus responsabilidades son:

1. **Crear la ventana** (`index.js`): instancia `BrowserWindow` con 1280×800px (mínimo 1024×600). Carga el renderer vía Vite en desarrollo o el bundle compilado en producción.
2. **Inicializar la base de datos** (`database/db.js`): abre o crea el archivo `.db` en la carpeta `userData` de Electron.
3. **Registrar los handlers IPC** (`ipc/*.js`): cada archivo de la carpeta `ipc/` exporta una función que llama a `ipcMain.handle(canal, handler)`.

### Arranque del main process

```
app.whenReady()
  └─ initDatabase()          ← crea tablas si no existen, corre migraciones
  └─ createWindow()
      └─ registerIpcHandlers()
          ├─ registerAuthHandlers(db)
          ├─ registerProductosHandlers(db)
          ├─ registerVentasHandlers(db)
          ├─ registerCajaHandlers(db)
          ├─ registerImportarHandlers(db)
          └─ registerConfiguracionHandlers(db)
```

### Base de datos (`src/main/database/`)

- **`db.js`**: exporta `initDatabase()` y `getDb()`. El archivo `.db` se guarda en `app.getPath('userData')`.
- **`schema.js`**: define todas las tablas con `CREATE TABLE IF NOT EXISTS`, activa WAL mode (`PRAGMA journal_mode = WAL`) y foreign keys (`PRAGMA foreign_keys = ON`). También contiene migraciones inline que añaden columnas faltantes de forma segura (`ALTER TABLE IF NOT EXISTS`).

La DB es **síncrona** (`better-sqlite3`). No hay `async/await` en ninguna query; todos los handlers IPC resuelven de forma síncrona pero se invocan como promesas desde el renderer.

## Proceso Renderer (`src/renderer/`)

Corre en Chromium. Es una Single Page Application React con routing via `HashRouter`.

### Árbol de componentes

```
main.jsx
└─ HashRouter
   └─ App.jsx  (guard de autenticación por estado)
       ├─ Login.jsx          (si !usuario)
       └─ Layout con Sidebar (si usuario)
           ├─ Sidebar.jsx
           └─ Routes
               ├─ /        → redirect a /venta
               ├─ /venta       → Venta.jsx
               ├─ /articulos   → Articulos.jsx
               ├─ /historial   → Historial.jsx
               ├─ /caja        → Caja.jsx
               └─ /configuracion → Configuracion.jsx
```

### Autenticación

No hay JWT ni localStorage. El usuario logueado se guarda en el estado de `App.jsx` (`useState`). Si se recarga la app, hay que loguear de nuevo.

## Preload y contextBridge (`src/preload/index.js`)

El preload es el único puente entre los dos procesos. Corre con acceso a la API de Electron pero en el contexto del renderer.

```javascript
contextBridge.exposeInMainWorld('api', {
  auth:        { login },
  productos:   { listar, buscarCodigo, crear, actualizar, eliminar, ... },
  categorias:  { listar },
  ventas:      { crear, listar, detalle, anular, resumenHoy, resumenPeriodo },
  caja:        { estado, abrir, cerrar, movimiento, movimientos, saldoSesion, historial },
  importar:    { excel },
  config:      { get, getAll, set, setMany, uploadLogo },
  usuarios:    { listar, crear, actualizar, eliminar, cambiarPassword, toggleActivo },
  listasPrecio:{ listar, actualizar, guardarTodas },
  tarjetas:    { listar, toggle },
})
```

Cada método del preload llama a `ipcRenderer.invoke(canal, ...args)` y retorna la promesa.

### Ejemplo de flujo completo

El renderer llama `window.api.ventas.crear(datos)`:

```
Renderer                    Preload                     Main
─────────────────────────────────────────────────────────────
window.api.ventas.crear(x)
  → ipcRenderer.invoke('ventas:crear', x)
                              ──────────────────────────────►
                                              ipcMain.handle('ventas:crear')
                                                db.transaction(...)
                                                INSERT ventas + detalle_ventas
                                                UPDATE stock
                                                return { id, ... }
                              ◄──────────────────────────────
  ← Promise resolves
```

## Comunicación IPC

### Convención de nombres de canales

Los canales siguen el patrón `dominio:accion`:

| Prefijo | Dominio |
|---------|---------|
| `auth:` | Autenticación |
| `productos:` | Gestión de productos |
| `categorias:` | Categorías de productos |
| `ventas:` | Ventas y punto de venta |
| `caja:` | Sesiones de caja |
| `importar:` | Importación de datos |
| `configuracion:` | Configuración general |
| `usuarios:` | Gestión de usuarios |
| `listas-precios:` | Listas de precios |
| `tarjetas:` | Tarjetas de pago |

Todos los canales usan `ipcMain.handle` (request-response). No hay canales `send`/`on` unidireccionales en este proyecto.

## Construcción y packaging

`electron-vite` compila:
- El **main process** con esbuild (CommonJS)
- El **preload** con esbuild (CommonJS, aislado)
- El **renderer** con Vite (ESM → bundle para Chromium)

`electron-builder` genera:
- Windows: instalador NSIS (`.exe`, solo x64)
- Linux: AppImage

App ID: `com.nexora.kiosco`
