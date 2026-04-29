# Módulos de la Aplicación

## Resumen

| Módulo | Ruta | Archivo renderer | Archivos main |
|--------|------|-----------------|---------------|
| Login | — | `pages/Login.jsx` | `ipc/auth.js` |
| Ventas (PdV) | `/venta` | `pages/Venta.jsx` | `ipc/ventas.js` |
| Artículos | `/articulos` | `pages/Articulos.jsx` | `ipc/productos.js`, `ipc/importar.js` |
| Historial | `/historial` | `pages/Historial.jsx` | `ipc/ventas.js` |
| Caja | `/caja` | `pages/Caja.jsx` | `ipc/caja.js` |
| Configuración | `/configuracion` | `pages/Configuracion.jsx` | `ipc/configuracion.js` |

---

## Login

**Archivo:** `src/renderer/src/pages/Login.jsx`
**IPC:** `ipc/auth.js` → canal `auth:login`

Pantalla de inicio de sesión que bloquea el acceso al resto de la app. La autenticación es manejada por `App.jsx`: si `usuario` es `null` en el estado, se muestra Login en lugar del layout principal.

**Qué hace:**
- Muestra un formulario con campos `usuario` y `password`.
- Llama a `window.api.auth.login({ usuario, password })`.
- Si el login es exitoso, `App.jsx` recibe el objeto usuario y renderiza el sidebar + rutas.
- Si falla (usuario inactivo, password incorrecta), muestra un mensaje de error en pantalla.
- Estado de carga visual mientras procesa.

**Reglas:**
- Solo acepta usuarios con `activo = 1` en la base de datos.
- La contraseña se hashea con SHA-256 en el main process antes de comparar.
- No hay "recordar sesión"; si se cierra la app hay que loguear de nuevo.

---

## Artículos

**Archivo:** `src/renderer/src/pages/Articulos.jsx`
**IPC:** `ipc/productos.js`, `ipc/importar.js`

Gestión completa del catálogo de productos con búsqueda, filtros, CRUD y ajuste de stock.

**Qué hace:**

**Listado:**
- Tabla con columnas: Código de barras, Descripción, Rubro, Precio de venta, Stock, Estado.
- Barra de búsqueda por texto (nombre o código).
- Filtro por categoría y estado (`activo` / `discontinuado`).

**Alta y edición (modal con 3 pestañas):**
- **General:** nombre, código de barras, categoría (con opción de crear nueva), unidad de venta, flag en oferta.
- **Precios:** precio costo, IVA %, utilidad minorista, utilidad mayorista. El precio de venta se calcula automáticamente: `costo × (1 + IVA%) × (1 + utilidad%)`.
- **Stock:** toggle de control de stock, stock actual, mínimo y máximo.

**Otras acciones:**
- **Discontinuar / Reactivar:** cambia `estado` sin eliminar el producto.
- **Eliminar:** soft delete (`activo = 0`), no aparece más en listados.
- **Ajuste de stock:** incremento o decremento manual del stock.
- **Importación Excel:** abre diálogo de archivo, lee `.xlsx`/`.xls`, mapea columnas y hace upsert masivo. Muestra resumen: insertados, actualizados, omitidos, errores por fila.

**Canales IPC usados:**
- `productos:listar`, `productos:buscar-codigo`, `productos:crear`, `productos:actualizar`, `productos:eliminar`
- `productos:discontinuar`, `productos:reactivar`, `productos:ajustar-stock`
- `categorias:listar`
- `importar:excel`

---

## Ventas (PdV)

**Archivo:** `src/renderer/src/pages/Venta.jsx`
**IPC:** `ipc/ventas.js`, `ipc/caja.js`

Módulo de punto de venta en tiempo real. Es el módulo central de la aplicación.

**Layout:**
- **Panel izquierdo:** búsqueda de productos + carrito.
- **Panel derecho:** resumen de totales y botón de cobro.

**Qué hace:**

**Búsqueda de productos:**
- Input de búsqueda por nombre o código de barras.
- Cuando se escribe un código exacto, agrega el producto automáticamente al carrito.
- Si no es código exacto, muestra lista de sugerencias.

**Carrito:**
- Tabla de ítems con nombre, precio unitario, cantidad (botones `+` / `–`), subtotal y botón de eliminar.
- Al modificar cantidad se recalculan subtotal y total en tiempo real.

**Descuentos y recargos:**
- Permite ingresar un descuento o recargo en `$` o `%`.
- Se aplica sobre el subtotal antes de mostrar el total final.

**Cobro (modal `CobroModal`):**
- Selección de medio de pago: efectivo, débito, crédito, MercadoPago, transferencia.
- Pago mixto: permite distribuir el total entre múltiples métodos.
- Botones rápidos de billetes: $1.000, $2.000, $5.000, $10.000, $20.000.
- Calculadora de vuelto en tiempo real (solo aplica para efectivo).

**Post-venta (modal `TicketModal`):**
- Confirmación de venta exitosa.
- Vista previa del ticket con fecha, hora, ítems, total y medio de pago.
- Botón de impresión que activa `window.print()` sobre el componente `PrintTicket` (clase `.print-ticket`, visible solo en impresión vía CSS).

**Requisito:** requiere que haya una sesión de caja abierta. Si no hay sesión activa, muestra un aviso y no permite operar.

**Canales IPC usados:**
- `ventas:crear`, `ventas:resumen-hoy`
- `productos:listar`, `productos:buscar-codigo`
- `caja:estado`

---

## Historial de Ventas

**Archivo:** `src/renderer/src/pages/Historial.jsx`
**IPC:** `ipc/ventas.js`

Consulta y análisis del historial de ventas con filtros por fecha y detalle por transacción.

**Qué hace:**

**Filtros:**
- Rango de fechas: `desde` / `hasta`.
- Opción de incluir ventas anuladas.

**Tarjetas resumen (se calculan con el período filtrado):**
- Ventas activas (cantidad).
- Total vendido (monto).
- Anuladas (cantidad).
- Ganancia estimada (suma de márgenes de cada ítem).

**Tabla de ventas:**
- Columnas: Fecha/Hora, Nº Transacción, Ítems (cantidad), Total, Medio de pago (badge con color), Estado (activa / anulada), botón Ver detalle.

**Desglose por medio de pago:**
- Totales separados: Efectivo, Débito, Crédito, MercadoPago, Transferencia.

**Detalle de venta (modal):**
- Lista de productos con cantidad, precio unitario y subtotal.
- Total, descuento aplicado y medio de pago.
- Botón **Anular venta**: marca `anulada = 1` y restaura el stock de cada ítem en la DB (dentro de una transacción SQLite).

**Canales IPC usados:**
- `ventas:listar`, `ventas:detalle`, `ventas:anular`, `ventas:resumen-periodo`

---

## Caja

**Archivo:** `src/renderer/src/pages/Caja.jsx`
**IPC:** `ipc/caja.js`

Control de sesiones de caja: apertura, movimientos de efectivo y cierre con balance final.

**Dos estados posibles:**

**Caja cerrada:**
- Input para ingresar el saldo inicial en efectivo.
- Botón para abrir sesión.
- Tabla con historial de sesiones anteriores (fecha apertura, cierre, ventas, facturado, saldo final).

**Caja abierta:**
- Encabezado con número de sesión, hora de apertura e indicador visual "en vivo".
- 5 tarjetas de resumen:
  - Saldo inicial
  - Ventas en efectivo (del día)
  - Total ingresos manuales
  - Total egresos manuales
  - **Saldo actual** (calculado: `inicial + ventas_efectivo + ingresos – egresos`), resaltado en verde.
- Tabla de movimientos cronológica con saldo acumulado por fila (running balance).
- Botones de acción: **Ingreso** (verde), **Egreso** (rojo), **Cerrar caja**.

**Modal de movimiento:**
- Toggle ingreso / egreso.
- Campo de descripción libre.
- Campo de monto.

**Cierre de caja:**
- Calcula `saldo_final` en el main: `saldo_inicial + ventas_efectivo + ingresos – egresos`.
- Guarda `fecha_cierre` y cambia `estado` a `'cerrada'`.

**Canales IPC usados:**
- `caja:estado`, `caja:abrir`, `caja:cerrar`
- `caja:movimiento`, `caja:movimientos`, `caja:saldo-sesion`, `caja:historial`
- `configuracion:get`, `configuracion:getAll`, `configuracion:set`

---

## Configuración

**Archivo:** `src/renderer/src/pages/Configuracion.jsx`
**IPC:** `ipc/configuracion.js`

Panel de administración del sistema dividido en cuatro pestañas.

### Pestaña: Negocio

Datos del local comercial que aparecen en los tickets impresos.

**Campos:**
- Logo (subida de imagen → se guarda como base64 en la tabla `configuracion`).
- Razón social, Nombre comercial, CUIT.
- Condición IVA: Monotributo / Responsable Inscripto / Exento / Consumidor Final.
- Domicilio, Teléfono, Email, Web.

**Canales IPC usados:** `configuracion:getAll`, `configuracion:set-many`, `configuracion:upload-logo`

### Pestaña: Usuarios

Alta, baja y modificación de usuarios del sistema.

**Tabla:** Nombre, Usuario, Rol (admin / operador), Activo (toggle), Acciones (editar, cambiar contraseña, eliminar).

**Modal crear/editar:** nombre, nombre de usuario, contraseña, rol.

**Restricciones:**
- No se puede eliminar ni desactivar al último administrador.
- Cambiar contraseña tiene su propio flujo (modal separado).

**Canales IPC usados:** `usuarios:listar`, `usuarios:crear`, `usuarios:actualizar`, `usuarios:eliminar`, `usuarios:cambiarPassword`, `usuarios:toggleActivo`

### Pestaña: Listas de precios

Configura los 10 slots de listas de precio disponibles en el sistema.

- Las dos primeras (Minorista, Mayorista) son fijas en tipo pero editables en nombre y activa.
- Los 8 restantes son slots custom con nombre libre.
- Toggle de activa por lista.
- Guardado en lote con `listas-precios:guardarTodas`.

**Canales IPC usados:** `listas-precios:listar`, `listas-precios:guardarTodas`

### Pestaña: Tarjetas

Habilitar o deshabilitar las tarjetas de pago que aparecen en el modal de cobro.

- Separadas en dos secciones: Crédito y Débito.
- Toggle por tarjeta (activa / inactiva).

**Canales IPC usados:** `tarjetas:listar`, `tarjetas:toggle`
