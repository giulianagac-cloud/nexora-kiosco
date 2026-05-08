import { workerData, parentPort } from 'worker_threads'
import Database from 'better-sqlite3'

const { mainDbPath, filePath, tabla, mapeo, limpiar } = workerData

const CHUNK = 2000

let mainDb, extDb
try {
  mainDb = new Database(mainDbPath)
  mainDb.pragma('journal_mode = WAL')
  mainDb.pragma('busy_timeout = 30000')
  mainDb.pragma('cache_size = -65536')
  mainDb.pragma('temp_store = MEMORY')

  if (limpiar) {
    mainDb.prepare('DELETE FROM productos WHERE activo = 1').run()
  }

  const catMap = new Map(
    mainDb.prepare('SELECT id, nombre FROM categorias').all().map(c => [c.nombre.toLowerCase(), c.id])
  )
  const insertCat  = mainDb.prepare('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)')
  const getCat     = mainDb.prepare('SELECT id FROM categorias WHERE nombre = ?')
  const insertStmt = mainDb.prepare(`
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

  if (!total) {
    parentPort.postMessage({ type: 'result', insertados: 0, omitidos: 0 })
  } else {
    let insertados = 0, omitidos = 0
    let chunk = []
    let rowIdx = 0

    const processChunk = () => {
      mainDb.transaction(() => {
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
            stock_minimo:  row.sm,
            stock_maximo:  row.sM,
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
        codigo:   mapeo.codigo       ? String(rawRow[mapeo.codigo]       ?? '').trim() || null : null,
        rubroRaw: mapeo.rubro        ? String(rawRow[mapeo.rubro]        ?? '').trim() || null : null,
        pc:       mapeo.precio_costo ? parseFloat(rawRow[mapeo.precio_costo]) || 0  : 0,
        iva:      mapeo.iva          ? parseFloat(rawRow[mapeo.iva])          || 21 : 21,
        pv:       mapeo.precio_venta ? parseFloat(rawRow[mapeo.precio_venta]) || 0  : 0,
        stock:    mapeo.stock        ? parseInt(rawRow[mapeo.stock])        || 0 : 0,
        sm:       mapeo.stock_minimo ? parseInt(rawRow[mapeo.stock_minimo]) || 0 : 0,
        sM:       mapeo.stock_maximo ? parseInt(rawRow[mapeo.stock_maximo]) || 0 : 0,
      })
      rowIdx++

      if (chunk.length >= CHUNK) {
        processChunk()
        chunk = []
        parentPort.postMessage({ type: 'progress', done: rowIdx, total })
      }
    }

    if (chunk.length > 0) {
      processChunk()
      parentPort.postMessage({ type: 'progress', done: rowIdx, total })
    }

    parentPort.postMessage({ type: 'result', insertados, omitidos })
  }
} catch (err) {
  parentPort.postMessage({ type: 'error', message: err.message })
} finally {
  extDb?.close()
  mainDb?.close()
}
