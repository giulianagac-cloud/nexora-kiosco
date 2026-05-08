import { dialog, BrowserWindow } from 'electron'
import XLSX from 'xlsx'
import Database from 'better-sqlite3'

export function registerImportarHandlers(ipcMain, db) {

  // ── Lógica compartida de inserción masiva ──────────────────────────────────
  // filas: [{ nombre, codigo, rubroRaw, precio_costo, iva, utilidad_minorista,
  //           precio, stock, stock_minimo, stock_maximo }]
  function importarProductos(filas) {
    db.pragma('cache_size = -65536')
    db.pragma('temp_store = MEMORY')

    const catMap = new Map(
      db.prepare('SELECT id, nombre FROM categorias').all().map(c => [c.nombre.toLowerCase(), c.id])
    )
    const byCode = new Map(
      db.prepare('SELECT id, codigo_barras FROM productos WHERE codigo_barras IS NOT NULL AND activo = 1')
        .all().map(p => [p.codigo_barras, p.id])
    )
    const byNombre = new Map(
      db.prepare('SELECT id, nombre FROM productos WHERE activo = 1')
        .all().map(p => [p.nombre, p.id])
    )

    const stmts = {
      insertCat: db.prepare('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)'),
      getCat:    db.prepare('SELECT id FROM categorias WHERE nombre = ?'),
      insert: db.prepare(`
        INSERT INTO productos
          (nombre, codigo_barras, categoria_id,
           precio_costo, iva, utilidad_minorista, precio,
           utilidad_mayorista, precio_mayorista,
           stock, stock_minimo, stock_maximo,
           control_stock, unidad_venta, estado)
        VALUES
          (@nombre, @codigo_barras, @categoria_id,
           @precio_costo, @iva, @utilidad_minorista, @precio,
           @utilidad_mayorista, @precio_mayorista,
           @stock, @stock_minimo, @stock_maximo,
           1, 'UN', 'activo')
      `),
      update: db.prepare(`
        UPDATE productos SET
          nombre             = @nombre,
          codigo_barras      = @codigo_barras,
          categoria_id       = @categoria_id,
          precio_costo       = @precio_costo,
          iva                = @iva,
          utilidad_minorista = @utilidad_minorista,
          precio             = @precio,
          stock              = @stock,
          stock_minimo       = @stock_minimo,
          stock_maximo       = @stock_maximo,
          updated_at         = datetime('now','localtime')
        WHERE id = @id
      `)
    }

    let insertados = 0, actualizados = 0, omitidos = 0
    const errores = []

    db.transaction(() => {
      filas.forEach(({ nombre, codigo, rubroRaw, precio_costo, iva, utilidad_minorista, precio, stock, stock_minimo, stock_maximo }, i) => {
        if (!nombre) { omitidos++; return }

        let categoria_id = null
        if (rubroRaw) {
          const key = rubroRaw.toLowerCase()
          if (catMap.has(key)) {
            categoria_id = catMap.get(key)
          } else {
            stmts.insertCat.run(rubroRaw)
            const cat = stmts.getCat.get(rubroRaw)
            if (cat) { catMap.set(key, cat.id); categoria_id = cat.id }
          }
        }

        const datos = {
          nombre,
          codigo_barras:      codigo || null,
          categoria_id,
          precio_costo:       precio_costo       || 0,
          iva:                iva                || 21,
          utilidad_minorista: utilidad_minorista || 0,
          precio:             precio             || 0,
          utilidad_mayorista: 0,
          precio_mayorista:   0,
          stock:              stock        || 0,
          stock_minimo:       stock_minimo || 0,
          stock_maximo:       stock_maximo || 0,
        }

        try {
          const existenteId = (codigo ? byCode.get(codigo) : undefined) ?? byNombre.get(nombre)
          if (existenteId !== undefined) {
            stmts.update.run({ ...datos, id: existenteId })
            actualizados++
            if (codigo) byCode.set(codigo, existenteId)
            byNombre.set(nombre, existenteId)
          } else {
            const result = stmts.insert.run(datos)
            insertados++
            if (codigo) byCode.set(codigo, result.lastInsertRowid)
            byNombre.set(nombre, result.lastInsertRowid)
          }
        } catch (e) {
          errores.push({ fila: i + 2, motivo: e.message })
        }
      })
    })()

    return { insertados, actualizados, omitidos, errores }
  }

  // ── Handler: Importar Excel ────────────────────────────────────────────────
  ipcMain.handle('importar:excel', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Seleccionar archivo Excel',
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths.length) return null

    const workbook = XLSX.readFile(filePaths[0])
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    if (!rawRows.length) return { insertados: 0, actualizados: 0, omitidos: 0, errores: [] }

    const filas = rawRows.map(row => {
      const r = {}
      for (const k of Object.keys(row)) r[k.toLowerCase()] = row[k]
      const precio_costo       = parseFloat(r.preciocosto) || 0
      const iva                = parseFloat(r.iva)         || 21
      const utilidad_minorista = parseFloat(r.utilidad)    || 0
      const precioVentaExcel   = parseFloat(r.precioventa) || 0
      return {
        nombre:             String(r.descripcion ?? '').trim(),
        codigo:             String(r.codigo ?? '').trim()  || null,
        rubroRaw:           String(r.rubro ?? '').trim()   || null,
        precio_costo,
        iva,
        utilidad_minorista,
        precio: precioVentaExcel > 0
          ? precioVentaExcel
          : +(precio_costo * (1 + iva / 100) * (1 + utilidad_minorista / 100)).toFixed(2),
        stock:        parseInt(r.stock)       || 0,
        stock_minimo: parseInt(r.stockminimo) || 0,
        stock_maximo: parseInt(r.stockmaximo) || 0,
      }
    })

    return importarProductos(filas)
  })

  // ── Handler: Inspeccionar DB externa ──────────────────────────────────────
  ipcMain.handle('importar:inspeccionar-db', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Seleccionar base de datos SQLite',
      filters: [{ name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths.length) return null

    const filePath = filePaths[0]
    let extDb
    try {
      extDb = new Database(filePath, { readonly: true })
      const tablas = extDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all()

      const schema = tablas.map(({ name }) => {
        const columnas = extDb.prepare(`PRAGMA table_info("${name}")`).all()
          .map(c => ({ nombre: c.name, tipo: c.type }))
        const total = extDb.prepare(`SELECT COUNT(*) as n FROM "${name}"`).get()?.n ?? 0
        const muestra = extDb.prepare(`SELECT * FROM "${name}" LIMIT 5`).all()
        return { nombre: name, columnas, total, muestra }
      })

      return { filePath, tablas: schema }
    } finally {
      extDb?.close()
    }
  })

  // ── Handler: Importar desde DB externa ────────────────────────────────────
  ipcMain.handle('importar:desde-db', (_, { filePath, tabla, mapeo }) => {
    let extDb
    try {
      extDb = new Database(filePath, { readonly: true })
      const rawRows = extDb.prepare(`SELECT * FROM "${tabla}"`).all()
      if (!rawRows.length) return { insertados: 0, actualizados: 0, omitidos: 0, errores: [] }

      const filas = rawRows.map(row => {
        const precio_costo = mapeo.precio_costo ? parseFloat(row[mapeo.precio_costo]) || 0  : 0
        const iva          = mapeo.iva          ? parseFloat(row[mapeo.iva])          || 21 : 21
        const precioVenta  = mapeo.precio_venta ? parseFloat(row[mapeo.precio_venta]) || 0  : 0
        return {
          nombre:             String(row[mapeo.descripcion] ?? '').trim(),
          codigo:             mapeo.codigo     ? String(row[mapeo.codigo] ?? '').trim()  || null : null,
          rubroRaw:           mapeo.rubro      ? String(row[mapeo.rubro] ?? '').trim()   || null : null,
          precio_costo,
          iva,
          utilidad_minorista: 0,
          precio: precioVenta > 0
            ? precioVenta
            : +(precio_costo * (1 + iva / 100)).toFixed(2),
          stock:        mapeo.stock        ? parseInt(row[mapeo.stock])        || 0 : 0,
          stock_minimo: mapeo.stock_minimo ? parseInt(row[mapeo.stock_minimo]) || 0 : 0,
          stock_maximo: mapeo.stock_maximo ? parseInt(row[mapeo.stock_maximo]) || 0 : 0,
        }
      })

      return importarProductos(filas)
    } finally {
      extDb?.close()
    }
  })
}
