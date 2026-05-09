export function registerComprasHandlers(ipcMain, db) {
  // Búsqueda por código sin filtrar por estado — permite reabastecer discontinuados
  ipcMain.handle('compras:buscar-codigo', (_, codigo) => {
    return db
      .prepare(`SELECT * FROM productos WHERE codigo_barras = ? AND activo = 1`)
      .get(codigo) ?? null
  })

  ipcMain.handle('compras:crear', (_, { items, proveedor_id, observaciones }) => {
    return db.transaction(() => {
      let total = 0
      const lineas = []

      for (const item of items) {
        let producto_id = item.producto_id

        if (!producto_id) {
          // Producto nuevo: se crea con el stock inicial igual a la cantidad recibida
          const r = db.prepare(`
            INSERT INTO productos
              (nombre, codigo_barras, precio_costo, precio, stock, estado, activo)
            VALUES
              (@nombre, @codigo_barras, @precio_costo, @precio_costo, @stock, 'activo', 1)
          `).run({
            nombre: item.nombre,
            codigo_barras: item.codigo_barras || null,
            precio_costo: item.precio_costo,
            stock: item.cantidad,
          })
          producto_id = r.lastInsertRowid
        } else {
          // Producto existente: incrementa stock y actualiza precio de costo
          db.prepare(`
            UPDATE productos
            SET stock = stock + @cantidad,
                precio_costo = @precio_costo,
                updated_at = datetime('now','localtime')
            WHERE id = @id
          `).run({ cantidad: item.cantidad, precio_costo: item.precio_costo, id: producto_id })
        }

        const subtotal = item.precio_costo * item.cantidad
        total += subtotal
        lineas.push({ ...item, producto_id, subtotal })
      }

      const compra = db.prepare(`
        INSERT INTO compras (proveedor_id, total, observaciones)
        VALUES (@proveedor_id, @total, @observaciones)
      `).run({ proveedor_id: proveedor_id || null, total, observaciones: observaciones || null })

      const compraId = compra.lastInsertRowid

      const insertDetalle = db.prepare(`
        INSERT INTO detalle_compras
          (compra_id, producto_id, nombre_producto, precio_costo_unitario, cantidad, subtotal)
        VALUES
          (@compra_id, @producto_id, @nombre_producto, @precio_costo_unitario, @cantidad, @subtotal)
      `)
      for (const linea of lineas) {
        insertDetalle.run({
          compra_id: compraId,
          producto_id: linea.producto_id,
          nombre_producto: linea.nombre,
          precio_costo_unitario: linea.precio_costo,
          cantidad: linea.cantidad,
          subtotal: linea.subtotal,
        })
      }

      return { id: compraId, total }
    })()
  })

  ipcMain.handle('compras:listar', (_, { limite = 100 } = {}) => {
    return db.prepare(`
      SELECT c.id, c.total, c.observaciones, c.fecha,
             p.razon_social AS proveedor_nombre,
             COUNT(d.id) AS cantidad_items
      FROM compras c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      LEFT JOIN detalle_compras d ON d.compra_id = c.id
      GROUP BY c.id
      ORDER BY c.fecha DESC
      LIMIT ?
    `).all(limite)
  })

  ipcMain.handle('compras:detalle', (_, compraId) => {
    const compra = db.prepare(`
      SELECT c.*, p.razon_social AS proveedor_nombre
      FROM compras c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      WHERE c.id = ?
    `).get(compraId)
    const items = db.prepare(
      'SELECT * FROM detalle_compras WHERE compra_id = ?'
    ).all(compraId)
    return { ...compra, items }
  })
}
