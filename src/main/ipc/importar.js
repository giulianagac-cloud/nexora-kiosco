import { dialog, BrowserWindow } from 'electron'
import XLSX from 'xlsx'
import Database from 'better-sqlite3'

export function registerImportarHandlers(ipcMain, db) {

  // ── Contexto compartido: Maps + statements preparados ─────────────────────
  function _crearContexto() {
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

    return { catMap, byCode, byNombre, stmts, insertados: 0, actualizados: 0, omitidos: 0, errores: [] }
  }

  // ── Procesar una fila dentro de un contexto activo ─────────────────────────
  function _procesarFila(ctx, fila, rowIdx) {
    const { nombre, codigo, rubroRaw, precio_costo, iva, utilidad_minorista, precio, stock, stock_minimo, stock_maximo } = fila
    if (!nombre) { ctx.omitidos++; return }

    let categoria_id = null
    if (rubroRaw) {
      const key = rubroRaw.toLowerCase()
      if (ctx.catMap.has(key)) {
        categoria_id = ctx.catMap.get(key)
      } else {
        ctx.stmts.insertCat.run(rubroRaw)
        const cat = ctx.stmts.getCat.get(rubroRaw)
        if (cat) { ctx.catMap.set(key, cat.id); categoria_id = cat.id }
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
      const existenteId = (codigo ? ctx.byCode.get(codigo) : undefined) ?? ctx.byNombre.get(nombre)
      if (existenteId !== undefined) {
        ctx.stmts.update.run({ ...datos, id: existenteId })
        ctx.actualizados++
        if (codigo) ctx.byCode.set(codigo, existenteId)
        ctx.byNombre.set(nombre, existenteId)
      } else {
        const result = ctx.stmts.insert.run(datos)
        ctx.insertados++
        if (codigo) ctx.byCode.set(codigo, result.lastInsertRowid)
        ctx.byNombre.set(nombre, result.lastInsertRowid)
      }
    } catch (e) {
      ctx.errores.push({ fila: rowIdx + 2, motivo: e.message })
    }
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

    const ctx = _crearContexto()
    db.transaction(() => filas.forEach((f, i) => _procesarFila(ctx, f, i)))()
    return { insertados: ctx.insertados, actualizados: ctx.actualizados, omitidos: ctx.omitidos, errores: ctx.errores }
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
  // Usa INSERT OR IGNORE + índice UNIQUE de SQLite para deduplicar.
  // No pre-carga los productos existentes en Maps, evitando el bloqueo inicial.
  ipcMain.handle('importar:desde-db', async (event, { filePath, tabla, mapeo }) => {
    const CHUNK = 5000
    let extDb
    try {
      await new Promise(r => setImmediate(r)) // cede control para que el renderer muestre "Preparando..."

      db.pragma('cache_size = -65536')
      db.pragma('temp_store = MEMORY')

      // Solo categorías — pocas filas, carga instantánea
      const catMap    = new Map(db.prepare('SELECT id, nombre FROM categorias').all().map(c => [c.nombre.toLowerCase(), c.id]))
      const insertCat = db.prepare('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)')
      const getCat    = db.prepare('SELECT id FROM categorias WHERE nombre = ?')
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO productos
          (nombre, codigo_barras, categoria_id,
           precio_costo, iva, utilidad_minorista, precio,
           utilidad_mayorista, precio_mayorista,
           stock, stock_minimo, stock_maximo,
           control_stock, unidad_venta, estado)
        VALUES
          (@nombre, @codigo_barras, @categoria_id,
           @precio_costo, @iva, 0, @precio,
           0, 0,
           @stock, @stock_minimo, @stock_maximo,
           1, 'UN', 'activo')
      `)

      extDb = new Database(filePath, { readonly: true })
      const total = extDb.prepare(`SELECT COUNT(*) as n FROM "${tabla}"`).get()?.n ?? 0
      if (!total) return { insertados: 0, actualizados: 0, omitidos: 0, errores: [] }

      let insertados = 0, omitidos = 0
      const errores = []
      let chunk = []
      let rowIdx = 0

      const processChunk = () => {
        db.transaction(() => {
          for (const row of chunk) {
            let categoria_id = null
            if (row.rubroRaw) {
              const key = row.rubroRaw.toLowerCase()
              if (catMap.has(key)) {
                categoria_id = catMap.get(key)
              } else {
                insertCat.run(row.rubroRaw)
                const cat = getCat.get(row.rubroRaw)
                if (cat) { catMap.set(key, cat.id); categoria_id = cat.id }
              }
            }
            const r = insertStmt.run({
              nombre:        row.nombre,
              codigo_barras: row.codigo,
              categoria_id,
              precio_costo:  row.pc,
              iva:           row.iva,
              precio:        row.pv > 0 ? row.pv : +(row.pc * (1 + row.iva / 100)).toFixed(2),
              stock:         row.stock,
              stock_minimo:  row.stock_minimo,
              stock_maximo:  row.stock_maximo,
            })
            if (r.changes > 0) insertados++
            else omitidos++
          }
        })()
      }

      for (const rawRow of extDb.prepare(`SELECT * FROM "${tabla}"`).iterate()) {
        const nombre = String(rawRow[mapeo.descripcion] ?? '').trim()
        if (!nombre) { omitidos++; rowIdx++; continue }

        chunk.push({
          nombre,
          codigo:       mapeo.codigo ? String(rawRow[mapeo.codigo] ?? '').trim() || null : null,
          rubroRaw:     mapeo.rubro  ? String(rawRow[mapeo.rubro]  ?? '').trim() || null : null,
          pc:           mapeo.precio_costo ? parseFloat(rawRow[mapeo.precio_costo]) || 0  : 0,
          iva:          mapeo.iva          ? parseFloat(rawRow[mapeo.iva])          || 21 : 21,
          pv:           mapeo.precio_venta ? parseFloat(rawRow[mapeo.precio_venta]) || 0  : 0,
          stock:        mapeo.stock        ? parseInt(rawRow[mapeo.stock])        || 0 : 0,
          stock_minimo: mapeo.stock_minimo ? parseInt(rawRow[mapeo.stock_minimo]) || 0 : 0,
          stock_maximo: mapeo.stock_maximo ? parseInt(rawRow[mapeo.stock_maximo]) || 0 : 0,
        })
        rowIdx++

        if (chunk.length >= CHUNK) {
          processChunk()
          chunk = []
          if (!event.sender.isDestroyed()) {
            event.sender.send('importar:progreso', { done: rowIdx, total })
          }
          await new Promise(r => setImmediate(r))
        }
      }

      if (chunk.length > 0) processChunk()

      return { insertados, actualizados: 0, omitidos, errores }
    } finally {
      extDb?.close()
    }
  })
}
