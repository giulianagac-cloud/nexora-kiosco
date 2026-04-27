export function createSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categorias (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS productos (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre              TEXT NOT NULL,
      codigo_barras       TEXT UNIQUE,
      precio              REAL NOT NULL DEFAULT 0,
      precio_costo        REAL NOT NULL DEFAULT 0,
      iva                 REAL NOT NULL DEFAULT 21,
      utilidad_minorista  REAL NOT NULL DEFAULT 0,
      utilidad_mayorista  REAL NOT NULL DEFAULT 0,
      precio_mayorista    REAL NOT NULL DEFAULT 0,
      stock               INTEGER NOT NULL DEFAULT 0,
      stock_minimo        INTEGER NOT NULL DEFAULT 0,
      stock_maximo        INTEGER NOT NULL DEFAULT 0,
      control_stock       INTEGER NOT NULL DEFAULT 1,
      unidad_venta        TEXT NOT NULL DEFAULT 'UN',
      en_oferta           INTEGER NOT NULL DEFAULT 0,
      categoria_id        INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
      estado              TEXT NOT NULL DEFAULT 'activo',
      activo              INTEGER NOT NULL DEFAULT 1,
      created_at          TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS caja_sesiones (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_apertura  TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      fecha_cierre    TEXT,
      saldo_inicial   REAL NOT NULL DEFAULT 0,
      saldo_final     REAL,
      estado          TEXT NOT NULL DEFAULT 'abierta' CHECK(estado IN ('abierta', 'cerrada'))
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      sesion_id     INTEGER REFERENCES caja_sesiones(id),
      total         REAL NOT NULL,
      descuento     REAL NOT NULL DEFAULT 0,
      medio_pago    TEXT NOT NULL DEFAULT 'efectivo' CHECK(medio_pago IN ('efectivo','debito','credito','mercadopago','transferencia')),
      fecha         TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      anulada       INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS detalle_ventas (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id         INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
      producto_id      INTEGER REFERENCES productos(id) ON DELETE SET NULL,
      nombre_producto  TEXT NOT NULL,
      precio_unitario  REAL NOT NULL,
      cantidad         INTEGER NOT NULL,
      subtotal         REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movimientos_caja (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      sesion_id   INTEGER NOT NULL REFERENCES caja_sesiones(id),
      tipo        TEXT NOT NULL CHECK(tipo IN ('ingreso','egreso')),
      monto       REAL NOT NULL,
      descripcion TEXT,
      fecha       TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `)

  migrateProductos(db)
  seedInitialData(db)
}

// Adds new columns to existing DBs — safe to run repeatedly (errors are swallowed)
function migrateProductos(db) {
  const cols = [
    `ALTER TABLE productos ADD COLUMN precio_costo REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE productos ADD COLUMN iva REAL NOT NULL DEFAULT 21`,
    `ALTER TABLE productos ADD COLUMN utilidad_minorista REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE productos ADD COLUMN utilidad_mayorista REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE productos ADD COLUMN precio_mayorista REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE productos ADD COLUMN stock_maximo INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE productos ADD COLUMN control_stock INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE productos ADD COLUMN unidad_venta TEXT NOT NULL DEFAULT 'UN'`,
    `ALTER TABLE productos ADD COLUMN en_oferta INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE productos ADD COLUMN estado TEXT NOT NULL DEFAULT 'activo'`,
  ]
  for (const sql of cols) {
    try { db.exec(sql) } catch (_) { /* column already exists */ }
  }
}

function seedInitialData(db) {
  const categorias = ['Golosinas', 'Bebidas', 'Cigarrillos', 'Snacks', 'Lácteos', 'Varios']
  const insertCat = db.prepare('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)')
  for (const cat of categorias) insertCat.run(cat)

  const configDefaults = [
    ['negocio_nombre', 'Mi Kiosco'],
    ['negocio_direccion', ''],
    ['negocio_telefono', ''],
    ['moneda_simbolo', '$'],
    ['imprimir_ticket', '0'],
    ['alertar_stock_minimo', '1']
  ]
  const insertConf = db.prepare('INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)')
  for (const [clave, valor] of configDefaults) insertConf.run(clave, valor)
}
