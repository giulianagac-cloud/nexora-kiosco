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
      medio_pago    TEXT NOT NULL DEFAULT 'efectivo' CHECK(medio_pago IN ('efectivo','debito','credito','mercadopago','transferencia','mixto')),
      medio_pago_detalle TEXT,
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

    CREATE TABLE IF NOT EXISTS usuarios (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre        TEXT NOT NULL,
      usuario       TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rol           TEXT NOT NULL DEFAULT 'cajero' CHECK(rol IN ('admin','cajero')),
      activo        INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS listas_precios (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre  TEXT NOT NULL,
      tipo    TEXT NOT NULL DEFAULT 'custom',
      activa  INTEGER NOT NULL DEFAULT 0,
      orden   INTEGER NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS tarjetas (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre  TEXT NOT NULL UNIQUE,
      tipo    TEXT NOT NULL CHECK(tipo IN ('credito','debito')),
      activa  INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo_cuenta     TEXT NOT NULL DEFAULT 'individuo' CHECK(tipo_cuenta IN ('individuo','empresa')),
      nombre          TEXT NOT NULL,
      apellido        TEXT,
      tipo_documento  TEXT NOT NULL DEFAULT 'DNI' CHECK(tipo_documento IN ('DNI','CUIT','CUIL','Pasaporte')),
      nro_documento   TEXT,
      telefono        TEXT,
      email           TEXT,
      calle           TEXT,
      numero          TEXT,
      localidad       TEXT,
      provincia       TEXT,
      condicion_iva   TEXT NOT NULL DEFAULT 'consumidor_final' CHECK(condicion_iva IN ('consumidor_final','monotributo','responsable_inscripto')),
      observaciones   TEXT,
      cc_habilitada   INTEGER NOT NULL DEFAULT 0,
      cc_tipo         TEXT NOT NULL DEFAULT 'ilimitada' CHECK(cc_tipo IN ('ilimitada','limitada')),
      cc_limite       REAL NOT NULL DEFAULT 0,
      cc_saldo        REAL NOT NULL DEFAULT 0,
      activo          INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS movimientos_cuenta_corriente (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id  INTEGER NOT NULL REFERENCES clientes(id),
      tipo        TEXT NOT NULL CHECK(tipo IN ('debito','credito')),
      monto       REAL NOT NULL,
      descripcion TEXT,
      fecha       TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS proveedores (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      razon_social      TEXT NOT NULL,
      nombre_comercial  TEXT,
      cuit              TEXT,
      telefono          TEXT,
      celular           TEXT,
      email             TEXT,
      calle             TEXT,
      numero            TEXT,
      localidad         TEXT,
      contacto          TEXT,
      ingresos_brutos   TEXT,
      condicion_iva     TEXT NOT NULL DEFAULT 'monotributo',
      web               TEXT,
      observaciones     TEXT,
      saldo             REAL NOT NULL DEFAULT 0,
      activo            INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS movimientos_proveedores (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      proveedor_id   INTEGER NOT NULL REFERENCES proveedores(id),
      tipo           TEXT NOT NULL CHECK(tipo IN ('credito','debito')),
      monto          REAL NOT NULL,
      descripcion    TEXT,
      fecha          TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS compras (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      proveedor_id  INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
      total         REAL NOT NULL DEFAULT 0,
      observaciones TEXT,
      anulada       INTEGER NOT NULL DEFAULT 0,
      fecha         TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS detalle_compras (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      compra_id             INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
      producto_id           INTEGER REFERENCES productos(id) ON DELETE SET NULL,
      nombre_producto       TEXT NOT NULL,
      precio_costo_unitario REAL NOT NULL DEFAULT 0,
      cantidad              INTEGER NOT NULL DEFAULT 1,
      subtotal              REAL NOT NULL DEFAULT 0
    );
  `)

  migrateVentas(db)
  migrateProductos(db)
  migrateUsuarios(db)
  migrateCompras(db)
  seedInitialData(db)
}

function migrateUsuarios(db) {
  const info = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='usuarios'").get()
  if (!info || info.sql.includes("'cajero'")) return
  db.exec('BEGIN TRANSACTION')
  try {
    db.exec(`
      CREATE TABLE usuarios_new (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre        TEXT NOT NULL,
        usuario       TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rol           TEXT NOT NULL DEFAULT 'cajero' CHECK(rol IN ('admin','cajero')),
        activo        INTEGER NOT NULL DEFAULT 1,
        created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );
    `)
    db.exec(`
      INSERT INTO usuarios_new (id, nombre, usuario, password_hash, rol, activo, created_at)
      SELECT id, nombre, usuario, password_hash,
             CASE WHEN rol = 'operador' THEN 'cajero' ELSE rol END,
             activo, created_at
      FROM usuarios;
    `)
    db.exec('DROP TABLE usuarios;')
    db.exec('ALTER TABLE usuarios_new RENAME TO usuarios;')
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

function migrateVentas(db) {
  const columnas = db.prepare("PRAGMA table_info(ventas)").all().map((c) => c.name)
  if (!columnas.includes('medio_pago_detalle')) {
    db.exec('BEGIN TRANSACTION')
    try {
      db.exec(`
        CREATE TABLE ventas_new (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          sesion_id     INTEGER REFERENCES caja_sesiones(id),
          total         REAL NOT NULL,
          descuento     REAL NOT NULL DEFAULT 0,
          medio_pago    TEXT NOT NULL DEFAULT 'efectivo' CHECK(medio_pago IN ('efectivo','debito','credito','mercadopago','transferencia','mixto')),
          medio_pago_detalle TEXT,
          fecha         TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          anulada       INTEGER NOT NULL DEFAULT 0
        );
      `)
      db.exec(`
        INSERT INTO ventas_new (id, sesion_id, total, descuento, medio_pago, fecha, anulada)
        SELECT id, sesion_id, total, descuento, medio_pago, fecha, anulada FROM ventas;
      `)
      db.exec('DROP TABLE ventas;')
      db.exec('ALTER TABLE ventas_new RENAME TO ventas;')
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
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

function migrateCompras(db) {
  try { db.exec(`ALTER TABLE compras ADD COLUMN anulada INTEGER NOT NULL DEFAULT 0`) } catch (_) {}
}

function seedInitialData(db) {
  const categorias = ['Golosinas', 'Bebidas', 'Cigarrillos', 'Snacks', 'Lácteos', 'Varios']
  const insertCat = db.prepare('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)')
  for (const cat of categorias) insertCat.run(cat)

  const configDefaults = [
    ['negocio_nombre', 'Mi Kiosco'],
    ['negocio_razon_social', ''],
    ['negocio_nombre_comercial', 'Mi Kiosco'],
    ['negocio_cuit', ''],
    ['negocio_condicion_iva', 'monotributo'],
    ['negocio_domicilio', ''],
    ['negocio_direccion', ''],
    ['negocio_telefono', ''],
    ['negocio_email', ''],
    ['negocio_web', ''],
    ['negocio_logo', ''],
    ['moneda_simbolo', '$'],
    ['imprimir_ticket', '0'],
    ['alertar_stock_minimo', '1'],
    ['ticket_ancho', '80'],
    ['ticket_pie_texto', '¡Gracias por su compra!'],
    ['comprobante_predeterminado', 'ticket'],
  ]
  const insertConf = db.prepare('INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)')
  for (const [clave, valor] of configDefaults) insertConf.run(clave, valor)

  // Limpia el usuario semilla viejo (usuario='admin') si quedó en la base.
  // Cubre el caso en que coexistan 'admin' y 'Administrador' por migraciones fallidas.
  db.prepare(`
    DELETE FROM usuarios
    WHERE usuario = 'admin' AND nombre = 'Administrador' AND rol = 'admin'
  `).run()

  // Admin por defecto — usuario: Administrador, password: admin (SHA-256)
  db.prepare(`
    INSERT OR IGNORE INTO usuarios (nombre, usuario, password_hash, rol)
    VALUES ('Administrador', 'Administrador', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'admin')
  `).run()

  // Listas de precios (10 slots)
  const insertLista = db.prepare('INSERT OR IGNORE INTO listas_precios (nombre, tipo, activa, orden) VALUES (?, ?, ?, ?)')
  const listasDefault = [
    ['Minorista', 'minorista', 1, 1],
    ['Mayorista', 'mayorista', 1, 2],
    ['Lista 3',   'custom', 0, 3], ['Lista 4',  'custom', 0, 4],
    ['Lista 5',   'custom', 0, 5], ['Lista 6',  'custom', 0, 6],
    ['Lista 7',   'custom', 0, 7], ['Lista 8',  'custom', 0, 8],
    ['Lista 9',   'custom', 0, 9], ['Lista 10', 'custom', 0, 10],
  ]
  for (const l of listasDefault) insertLista.run(...l)

  // Tarjetas
  const insertTarjeta = db.prepare('INSERT OR IGNORE INTO tarjetas (nombre, tipo, activa) VALUES (?, ?, ?)')
  const tarjetasDefault = [
    ['Visa Crédito',        'credito', 1], ['Mastercard',           'credito', 1],
    ['Cabal',               'credito', 1], ['Naranja',              'credito', 1],
    ['American Express',    'credito', 0], ['Naranja X',            'credito', 0],
    ['Diners Club',         'credito', 0], ['Visa Débito',          'debito',  1],
    ['Mastercard Débito',   'debito',  1], ['Cabal Débito',         'debito',  0],
    ['Maestro',             'debito',  0],
  ]
  for (const t of tarjetasDefault) insertTarjeta.run(...t)
}
