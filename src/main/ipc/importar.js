import { dialog, BrowserWindow } from 'electron'
import XLSX from 'xlsx'

export function registerImportarHandlers(ipcMain, db) {
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

    // Normalizar claves a minúsculas
    const rows = rawRows.map(row => {
      const n = {}
      for (const k of Object.keys(row)) n[k.toLowerCase()] = row[k]
      return n
    })

    // Cargar categorías existentes en memoria
    const catMap = new Map(
      db.prepare('SELECT id, nombre FROM categorias').all().map(c => [c.nombre.toLowerCase(), c.id])
    )

    const stmts = {
      insertCat:  db.prepare('INSERT OR IGNORE INTO categorias (nombre) VALUES (?)'),
      getCat:     db.prepare('SELECT id FROM categorias WHERE nombre = ?'),
      getByCode:  db.prepare(`SELECT id FROM productos WHERE codigo_barras = ? AND activo = 1`),
      getByNombre:db.prepare(`SELECT id FROM productos WHERE nombre = ? AND activo = 1 LIMIT 1`),
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
          nombre            = @nombre,
          codigo_barras     = @codigo_barras,
          categoria_id      = @categoria_id,
          precio_costo      = @precio_costo,
          iva               = @iva,
          utilidad_minorista= @utilidad_minorista,
          precio            = @precio,
          stock             = @stock,
          stock_minimo      = @stock_minimo,
          stock_maximo      = @stock_maximo,
          updated_at        = datetime('now','localtime')
        WHERE id = @id
      `)
    }

    let insertados = 0, actualizados = 0, omitidos = 0
    const errores = []

    db.transaction(() => {
      rows.forEach((row, i) => {
        const fila = i + 2
        const nombre = String(row.descripcion ?? '').trim()
        if (!nombre) { omitidos++; return }

        const codigo = String(row.codigo ?? '').trim() || null

        // Rubro → categoria_id
        let categoria_id = null
        const rubroRaw = String(row.rubro ?? '').trim()
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

        const precio_costo       = parseFloat(row.preciocosto)   || 0
        const iva                = parseFloat(row.iva)           ?? 21
        const utilidad_minorista = parseFloat(row.utilidad)      || 0
        const precioVentaExcel   = parseFloat(row.precioventa)   || 0
        const precio = precioVentaExcel > 0
          ? precioVentaExcel
          : +(precio_costo * (1 + iva / 100) * (1 + utilidad_minorista / 100)).toFixed(2)

        const datos = {
          nombre,
          codigo_barras:      codigo,
          categoria_id,
          precio_costo,
          iva,
          utilidad_minorista,
          precio,
          utilidad_mayorista: 0,
          precio_mayorista:   0,
          stock:       parseInt(row.stock)       || 0,
          stock_minimo:parseInt(row.stockminimo) || 0,
          stock_maximo:parseInt(row.stockmaximo) || 0
        }

        try {
          const existente = (codigo ? stmts.getByCode.get(codigo) : null)
                         ?? stmts.getByNombre.get(nombre)
          if (existente) {
            stmts.update.run({ ...datos, id: existente.id })
            actualizados++
          } else {
            stmts.insert.run(datos)
            insertados++
          }
        } catch (e) {
          errores.push({ fila, motivo: e.message })
        }
      })
    })()

    return { insertados, actualizados, omitidos, errores }
  })
}
