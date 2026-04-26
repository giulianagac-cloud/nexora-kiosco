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
      query += ' AND (p.nombre LIKE ? OR p.codigo_barras = ?)'
      params.push(`%${filtros.busqueda}%`, filtros.busqueda)
    }
    if (filtros.categoria_id) {
      query += ' AND p.categoria_id = ?'
      params.push(filtros.categoria_id)
    }

    query += ' ORDER BY p.nombre ASC'
    return db.prepare(query).all(...params)
  })

  ipcMain.handle('productos:buscar-codigo', (_, codigo) => {
    return db
      .prepare('SELECT * FROM productos WHERE codigo_barras = ? AND activo = 1')
      .get(codigo) ?? null
  })

  ipcMain.handle('productos:crear', (_, producto) => {
    const stmt = db.prepare(`
      INSERT INTO productos (nombre, codigo_barras, precio, stock, stock_minimo, categoria_id)
      VALUES (@nombre, @codigo_barras, @precio, @stock, @stock_minimo, @categoria_id)
    `)
    const result = stmt.run(producto)
    return { id: result.lastInsertRowid, ...producto }
  })

  ipcMain.handle('productos:actualizar', (_, { id, ...datos }) => {
    const campos = Object.keys(datos)
      .map((k) => `${k} = @${k}`)
      .join(', ')
    db.prepare(`UPDATE productos SET ${campos}, updated_at = datetime('now','localtime') WHERE id = @id`).run({
      ...datos,
      id
    })
    return db.prepare('SELECT * FROM productos WHERE id = ?').get(id)
  })

  ipcMain.handle('productos:eliminar', (_, id) => {
    db.prepare("UPDATE productos SET activo = 0 WHERE id = ?").run(id)
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
      .prepare('SELECT * FROM productos WHERE activo = 1 AND stock <= stock_minimo AND stock_minimo > 0')
      .all()
  })
}
