import { dialog, BrowserWindow } from 'electron'
import XLSX from 'xlsx'
import Database from 'better-sqlite3'
import { Worker } from 'worker_threads'
import { join } from 'path'

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
  // Corre en un Worker Thread para que el hilo principal nunca se bloquee.
  ipcMain.handle('importar:desde-db', (event, { filePath, tabla, mapeo, limpiar }) => {
    return new Promise((resolve, reject) => {
      const workerPath = join(__dirname, 'workers', 'importar-db-worker.js')
      const worker = new Worker(workerPath, {
        workerData: { mainDbPath: db.name, filePath, tabla, mapeo, limpiar: limpiar ?? false }
      })

      worker.on('message', (msg) => {
        switch (msg.type) {
          case 'progress':
            if (!event.sender.isDestroyed()) {
              event.sender.send('importar:progreso', { done: msg.done, total: msg.total })
            }
            break
          case 'result':
            resolve({ insertados: msg.insertados, actualizados: 0, omitidos: msg.omitidos, errores: [] })
            break
          case 'error':
            reject(new Error(msg.message))
            break
        }
      })

      worker.on('error', reject)
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker salió con código ${code}`))
      })
    })
  })
}
