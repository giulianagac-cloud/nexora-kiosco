# Nexora Kiosco

Sistema de punto de venta (PdV) de escritorio para negocios de retail, construido con Electron + React + SQLite. Permite gestionar productos, realizar ventas, controlar caja y consultar historial.

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework desktop | Electron 33.4.11 |
| Build tool | electron-vite 2.3.0 |
| UI | React 18.3.1 + React Router DOM 6.23.1 |
| Estilos | Tailwind CSS 3.4.4 |
| Base de datos | SQLite via better-sqlite3 11.10.0 |
| Importación | xlsx 0.18.5 |
| Hashing | Node.js crypto (SHA-256) |
| Lenguaje | JavaScript ES6+ (sin TypeScript) |

## Estructura de carpetas

```
nexora-kiosco/
├── src/
│   ├── main/                   # Proceso principal de Electron (Node.js)
│   │   ├── index.js            # Entrada: crea ventana, registra IPC
│   │   ├── database/
│   │   │   ├── db.js           # Inicializa y exporta instancia de SQLite
│   │   │   └── schema.js       # Definición de tablas y datos iniciales
│   │   └── ipc/                # Handlers IPC agrupados por dominio
│   │       ├── auth.js
│   │       ├── productos.js
│   │       ├── ventas.js
│   │       ├── caja.js
│   │       ├── importar.js
│   │       └── configuracion.js
│   ├── preload/
│   │   └── index.js            # contextBridge → expone window.api al renderer
│   └── renderer/
│       └── src/
│           ├── App.jsx         # Router principal + guard de autenticación
│           ├── main.jsx        # Entry point React con HashRouter
│           ├── index.css       # Tailwind base + estilos de impresión
│           ├── components/
│           │   └── Layout/
│           │       └── Sidebar.jsx
│           └── pages/
│               ├── Login.jsx
│               ├── Venta.jsx       # Módulo PdV
│               ├── Articulos.jsx
│               ├── Historial.jsx
│               ├── Caja.jsx
│               └── Configuracion.jsx
├── docs/                       # Documentación técnica del proyecto
├── electron.vite.config.js
├── tailwind.config.js
└── package.json
```

## Comandos principales

```bash
npm run dev        # Levanta el servidor Vite + Electron en modo desarrollo
npm run build      # Compila React + empaqueta el main process
npm run package    # Build completo + genera instalador NSIS (.exe) para Windows x64
npm run postinstall  # Se ejecuta automáticamente: recompila better-sqlite3 para Electron
```

La base de datos se guarda en:
- **Desarrollo:** `<userData>/nexora-kiosco-dev.db`
- **Producción:** `<userData>/nexora-kiosco.db`

## Paleta de colores

El proyecto usa colores hardcodeados con clases Tailwind y valores hexadecimales directos.

| Token | Valor | Uso |
|-------|-------|-----|
| Fondo principal | `#1a1f2e` (`bg-slate-900`) | Body, pantalla de login |
| Cards / paneles | `#242938` | Contenedores de sección |
| Cards oscuras | `#1e2437` / `#161b2a` | Sub-paneles, modales |
| Borde | `#313545` / `#2d3348` | Separadores, inputs |
| Verde Nexora | `emerald-500` / `emerald-600` | Botones primarios, acciones positivas |
| Rojo / error | `rose-500` / `rose-400` | Anular, eliminar, alertas |
| Débito | `blue-400` | Badge de medio de pago |
| Crédito | `violet-400` | Badge de medio de pago |
| MercadoPago | `sky-400` | Badge de medio de pago |
| Transferencia | `amber-400` | Badge de medio de pago |

## Convenciones de código

- Todo el código está en **JavaScript** (sin TypeScript).
- Los componentes React usan **function components** con hooks.
- La comunicación renderer ↔ main se hace **exclusivamente** via `window.api.*` (definida en el preload).
- Los handlers IPC en main usan `ipcMain.handle` (promesas, no callbacks).
- La DB es síncrona (`better-sqlite3`): no hay async/await en las queries.
- El hash de contraseñas usa `crypto.createHash('sha256')` de Node.js.
- El routing usa `HashRouter` (no `BrowserRouter`) para compatibilidad con Electron.
- La autenticación es solo de estado React; no hay sesiones persistentes entre reinicios.

Ver detalles en [docs/convenciones.md](docs/convenciones.md).

## Permisos

Claude Code tiene autorización para operar de forma autónoma en este proyecto:

- **Archivos:** crear, modificar y eliminar archivos sin pedir confirmación.
- **Dependencias:** instalar o desinstalar paquetes con `npm install` / `npm uninstall`.
- **Comandos:** ejecutar scripts del proyecto (`npm run dev`, `npm run build`, etc.) y comandos de shell necesarios para completar una tarea.
- **Git:** hacer commits y push al repositorio sin pedir confirmación en cada paso.

**Sí preguntar antes de proceder cuando:**
- La decisión afecta la arquitectura general (cambiar el sistema de routing, reemplazar una dependencia central, modificar el schema de forma destructiva, etc.).
- Un cambio impacta múltiples módulos de forma transversal.
- Hay más de una forma válida de resolver algo y la elección tiene consecuencias de largo plazo.

## Documentación adicional

- [docs/arquitectura.md](docs/arquitectura.md) — Proceso main vs renderer, IPC y contextBridge
- [docs/base-de-datos.md](docs/base-de-datos.md) — Esquema completo de tablas SQLite
- [docs/modulos.md](docs/modulos.md) — Descripción de cada módulo de la aplicación
- [docs/convenciones.md](docs/convenciones.md) — Guía de nombrado y cómo agregar un módulo nuevo
