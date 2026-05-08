export function registerProductosHandlers(ipcMain, db) {
  ipcMain.handle('productos:listar', (_, filtros = {}) => {
    let query = `
      SELECT p.*, c.nombre AS categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = 1
    `
    const params = []

    if (filtros.busqueda) {
      query += ' AND (p.nombre LIKE ? OR p.codigo_barras LIKE ?)'
      params.push(`%${filtros.busqueda}%`, `%${filtros.busqueda}%`)
    }
    if (filtros.categoria_id) {
      query += ' AND p.categoria_id = ?'
      params.push(filtros.categoria_id)
    }
    if (filtros.estado) {
      query += ' AND p.estado = ?'
      params.push(filtros.estado)
    }

    const limite = filtros.busqueda ? 500 : 5000
    query += ` ORDER BY p.nombre ASC LIMIT ${limite}`
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('productos:total', () => {
    return db.prepare('SELECT COUNT(*) as n FROM productos WHERE activo = 1').get()?.n ?? 0
  })

  ipcMain.handle('productos:buscar-codigo', (_, codigo) => {
    return db
      .prepare(`SELECT * FROM productos WHERE codigo_barras = ? AND activo = 1 AND estado = 'activo'`)
      .get(codigo) ?? null
  })

  ipcMain.handle('productos:crear', (_, producto) => {
    const stmt = db.prepare(`
      INSERT INTO productos (
        nombre, codigo_barras, precio, precio_costo, iva,
        utilidad_minorista, utilidad_mayorista, precio_mayorista,
        stock, stock_minimo, stock_maximo, control_stock,
        unidad_venta, en_oferta, categoria_id, estado
      ) VALUES (
        @nombre, @codigo_barras, @precio, @precio_costo, @iva,
        @utilidad_minorista, @utilidad_mayorista, @precio_mayorista,
        @stock, @stock_minimo, @stock_maximo, @control_stock,
        @unidad_venta, @en_oferta, @categoria_id, @estado
      )
    `)
    const result = stmt.run(producto)
    return { id: result.lastInsertRowid, ...producto }
  })

  ipcMain.handle('productos:actualizar', (_, { id, ...datos }) => {
    const campos = Object.keys(datos)
      .map((k) => `${k} = @${k}`)
      .join(', ')
    db.prepare(
      `UPDATE productos SET ${campos}, updated_at = datetime('now','localtime') WHERE id = @id`
    ).run({ ...datos, id })
    return db.prepare('SELECT * FROM productos WHERE id = ?').get(id)
  })

  ipcMain.handle('productos:eliminar', (_, id) => {
    db.prepare("UPDATE productos SET activo = 0 WHERE id = ?").run(id)
    return { ok: true }
  })

  ipcMain.handle('productos:eliminar-lote', (_, ids) => {
    const stmt = db.prepare('UPDATE productos SET activo = 0 WHERE id = ?')
    db.transaction(() => { for (const id of ids) stmt.run(id) })()
    return { ok: true, eliminados: ids.length }
  })

  ipcMain.handle('productos:discontinuar', (_, id) => {
    db.prepare(
      `UPDATE productos SET estado = 'discontinuado', updated_at = datetime('now','localtime') WHERE id = ?`
    ).run(id)
    return { ok: true }
  })

  ipcMain.handle('productos:reactivar', (_, id) => {
    db.prepare(
      `UPDATE productos SET estado = 'activo', updated_at = datetime('now','localtime') WHERE id = ?`
    ).run(id)
    return { ok: true }
  })

  ipcMain.handle('productos:ajustar-stock', (_, { id, delta }) => {
    db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?').run(delta, id)
    return db.prepare('SELECT stock FROM productos WHERE id = ?').get(id)
  })

  ipcMain.handle('categorias:listar', () => {
    return db.prepare('SELECT * FROM categorias ORDER BY nombre ASC').all()
  })

  ipcMain.handle('productos:stock-bajo', () => {
    return db
      .prepare(
        `SELECT * FROM productos
         WHERE activo = 1 AND estado = 'activo'
           AND control_stock = 1 AND stock <= stock_minimo AND stock_minimo > 0`
      )
      .all()
  })
}
