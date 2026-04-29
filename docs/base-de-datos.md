# Base de Datos

La base de datos es un archivo SQLite gestionado por `better-sqlite3`. Se inicializa en `src/main/database/schema.js`.

**Configuración:**
```sql
PRAGMA journal_mode = WAL;   -- Write-Ahead Logging para concurrencia
PRAGMA foreign_keys = ON;    -- Enforce integridad referencial
```

---

## Tablas

### `categorias`

Rubros o categorías de productos.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `nombre` | TEXT | NOT NULL UNIQUE |

---

### `productos`

Catálogo de artículos del negocio.

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `id` | INTEGER | PK AUTOINCREMENT | |
| `nombre` | TEXT | NOT NULL | Nombre del artículo |
| `codigo_barras` | TEXT | UNIQUE nullable | EAN-13 u otro |
| `precio` | REAL | 0 | Precio de venta minorista |
| `precio_costo` | REAL | 0 | Costo de compra |
| `iva` | REAL | 21 | Porcentaje de IVA |
| `utilidad_minorista` | REAL | 0 | % de utilidad minorista |
| `utilidad_mayorista` | REAL | 0 | % de utilidad mayorista |
| `precio_mayorista` | REAL | 0 | Precio de venta mayorista |
| `stock` | INTEGER | 0 | Stock actual |
| `stock_minimo` | INTEGER | 0 | Umbral de alerta |
| `stock_maximo` | INTEGER | 0 | Stock máximo esperado |
| `control_stock` | INTEGER (bool) | 1 | Si 0, no descuenta stock en ventas |
| `unidad_venta` | TEXT | 'UN' | Ej: UN, KG, LT |
| `en_oferta` | INTEGER (bool) | 0 | Flag de oferta activa |
| `categoria_id` | INTEGER | FK nullable | → `categorias.id` |
| `estado` | TEXT | 'activo' | `'activo'` \| `'discontinuado'` |
| `activo` | INTEGER (bool) | 1 | Soft delete (0 = eliminado) |
| `created_at` | TEXT | timestamp | ISO 8601 |
| `updated_at` | TEXT | timestamp | ISO 8601, actualizado en edición |

**Fórmula de precio:**
```
precio = precio_costo × (1 + iva/100) × (1 + utilidad_minorista/100)
```

**Notas:**
- `activo = 0` equivale a eliminado lógico. Las queries de listado filtran `activo = 1`.
- `estado = 'discontinuado'` mantiene el producto visible pero marcado para no reponer.
- Stock bajo se detecta cuando `control_stock = 1 AND stock <= stock_minimo AND stock_minimo > 0`.

---

### `caja_sesiones`

Una sesión de caja representa un turno de trabajo (apertura → cierre).

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `id` | INTEGER | PK AUTOINCREMENT | |
| `fecha_apertura` | TEXT | now() | Timestamp de apertura |
| `fecha_cierre` | TEXT | NULL | Timestamp de cierre |
| `saldo_inicial` | REAL | 0 | Efectivo declarado al abrir |
| `saldo_final` | REAL | NULL | Calculado al cerrar |
| `estado` | TEXT | 'abierta' | `'abierta'` \| `'cerrada'` |

**Regla de negocio:** Solo puede existir una sesión con `estado = 'abierta'` a la vez. El módulo Caja bloquea abrir una nueva si hay una activa.

---

### `ventas`

Encabezado de cada transacción de venta.

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `id` | INTEGER | PK AUTOINCREMENT | Número de transacción |
| `sesion_id` | INTEGER | FK NOT NULL | → `caja_sesiones.id` |
| `total` | REAL | NOT NULL | Total final (con descuento) |
| `descuento` | REAL | 0 | Monto descontado |
| `medio_pago` | TEXT | 'efectivo' | Ver valores abajo |
| `medio_pago_detalle` | TEXT | NULL | JSON cuando es pago mixto |
| `fecha` | TEXT | now() | Timestamp de la venta |
| `anulada` | INTEGER (bool) | 0 | 1 = venta anulada |

**Valores de `medio_pago`:** `'efectivo'` | `'debito'` | `'credito'` | `'mercadopago'` | `'transferencia'` | `'mixto'`

**Formato de `medio_pago_detalle`** (cuando `medio_pago = 'mixto'`):
```json
[
  { "tipo": "efectivo", "monto": 1000 },
  { "tipo": "debito",   "monto": 500  }
]
```

---

### `detalle_ventas`

Ítems de cada venta. Se eliminan en cascada si se elimina la venta.

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| `id` | INTEGER | PK AUTOINCREMENT | |
| `venta_id` | INTEGER | FK NOT NULL, ON DELETE CASCADE | → `ventas.id` |
| `producto_id` | INTEGER | FK nullable | → `productos.id` (NULL si producto fue eliminado) |
| `nombre_producto` | TEXT | NOT NULL | Nombre en el momento de la venta |
| `precio_unitario` | REAL | NOT NULL | Precio en el momento de la venta |
| `cantidad` | INTEGER | NOT NULL | |
| `subtotal` | REAL | NOT NULL | `precio_unitario × cantidad` |

**Nota:** `nombre_producto` y `precio_unitario` se guardan por valor para preservar el historial aunque el producto cambie de precio o se elimine.

---

### `movimientos_caja`

Ingresos y egresos manuales de efectivo dentro de una sesión.

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `id` | INTEGER | PK AUTOINCREMENT | |
| `sesion_id` | INTEGER | FK NOT NULL | → `caja_sesiones.id` |
| `tipo` | TEXT | NOT NULL | `'ingreso'` \| `'egreso'` |
| `monto` | REAL | NOT NULL | |
| `descripcion` | TEXT | NULL | Concepto libre |
| `fecha` | TEXT | now() | Timestamp del movimiento |

---

### `configuracion`

Pares clave-valor para la configuración del negocio.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `clave` | TEXT | PRIMARY KEY |
| `valor` | TEXT | NOT NULL |

**Claves utilizadas:**

| Clave | Descripción | Ejemplo |
|-------|-------------|---------|
| `negocio_nombre` | Nombre comercial | `"Kiosco El Sol"` |
| `negocio_razon_social` | Razón social legal | `"Juan Pérez"` |
| `negocio_cuit` | CUIT del negocio | `"20-12345678-9"` |
| `negocio_condicion_iva` | Condición tributaria | `"monotributo"` |
| `negocio_domicilio` | Dirección | |
| `negocio_telefono` | Teléfono | |
| `negocio_email` | Email | |
| `negocio_web` | Sitio web | |
| `negocio_logo` | Logo en base64 | `"data:image/png;base64,..."` |
| `moneda_simbolo` | Símbolo monetario | `"$"` |
| `imprimir_ticket` | Auto-imprimir | `"true"` \| `"false"` |
| `alertar_stock_minimo` | Alertas de stock | `"true"` \| `"false"` |
| `ticket_ancho` | Ancho del ticket | `"80"` (mm) |
| `ticket_pie_texto` | Texto pie de ticket | `"Gracias por su compra"` |
| `comprobante_predeterminado` | Tipo de comprobante | |

**Valores válidos de `negocio_condicion_iva`:** `'monotributo'` | `'responsable_inscripto'` | `'exento'` | `'consumidor_final'`

---

### `usuarios`

Usuarios del sistema con autenticación local.

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `id` | INTEGER | PK AUTOINCREMENT | |
| `nombre` | TEXT | NOT NULL | Nombre visible |
| `usuario` | TEXT | UNIQUE NOT NULL | Nombre de usuario para login |
| `password_hash` | TEXT | NOT NULL | SHA-256 en hex |
| `rol` | TEXT | 'operador' | `'admin'` \| `'operador'` |
| `activo` | INTEGER (bool) | 1 | Si 0, no puede iniciar sesión |
| `created_at` | TEXT | timestamp | |

**Usuario por defecto:** `admin` / `admin` (hash SHA-256: `8c6976e5...`)

**Regla de negocio:** El sistema impide eliminar o desactivar al último usuario con `rol = 'admin'`.

---

### `listas_precios`

Configuración de las listas de precios disponibles en el sistema.

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `id` | INTEGER | PK AUTOINCREMENT | |
| `nombre` | TEXT | NOT NULL | Etiqueta visible |
| `tipo` | TEXT | 'custom' | `'minorista'` \| `'mayorista'` \| `'custom'` |
| `activa` | INTEGER (bool) | 0 | Si se muestra en ventas |
| `orden` | INTEGER | UNIQUE NOT NULL | Posición en la lista |

**Datos iniciales:** 10 filas. Las dos primeras son `Minorista` (tipo `'minorista'`) y `Mayorista` (tipo `'mayorista'`). Las 8 restantes son slots custom vacíos.

---

### `tarjetas`

Tarjetas de pago habilitadas para el módulo de cobro.

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `id` | INTEGER | PK AUTOINCREMENT | |
| `nombre` | TEXT | UNIQUE NOT NULL | Ej: `"Visa Crédito"` |
| `tipo` | TEXT | NOT NULL | `'credito'` \| `'debito'` |
| `activa` | INTEGER (bool) | 1 | Si aparece en el cobro |

**Tarjetas de crédito por defecto:** Visa Crédito, Mastercard, Cabal, Naranja, American Express, Naranja X, Diners Club.

**Tarjetas de débito por defecto:** Visa Débito, Mastercard Débito, Cabal Débito, Maestro.

---

## Diagrama de relaciones

```
categorias ──────────────────── productos
    id                              categoria_id (FK, nullable)
    nombre                          ...
                                    activo, estado

caja_sesiones ──┬─────────────── ventas
    id          │                   sesion_id (FK)
    estado      │                   medio_pago
    ...         │                   anulada
                │               └── detalle_ventas
                │                       venta_id (FK CASCADE)
                │                       producto_id (FK nullable)
                │
                └────────────── movimientos_caja
                                    sesion_id (FK)
                                    tipo, monto

configuracion   (tabla independiente, clave-valor)
usuarios        (tabla independiente)
listas_precios  (tabla independiente)
tarjetas        (tabla independiente)
```
