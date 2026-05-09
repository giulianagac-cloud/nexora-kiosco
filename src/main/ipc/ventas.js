export function registerVentasHandlers(ipcMain, db) {
  ipcMain.handle('ventas:crear', (_, { items, total, descuento, medio_pago, medio_pago_detalle }) => {
    const sesionActiva = db
      .prepare("SELECT id FROM caja_sesiones WHERE estado = 'abierta' LIMIT 1")
      .get()

    if (!sesionActiva) {
      throw new Error('La caja está cerrada. Abre la caja para registrar ventas.')
    }

    const crearVenta = db.transaction(() => {
      const venta = db
        .prepare(`
          INSERT INTO ventas (sesion_id, total, descuento, medio_pago, medio_pago_detalle)
          VALUES (?, ?, ?, ?, ?)
        `)
        .run(
          sesionActiva.id,
          total,
          descuento ?? 0,
          medio_pago,
          medio_pago_detalle ?? null
        )

      const ventaId = venta.lastInsertRowid

      const insertDetalle = db.prepare(`
        INSERT INTO detalle_ventas (venta_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal)
        VALUES (@venta_id, @producto_id, @nombre_producto, @precio_unitario, @cantidad, @subtotal)
      `)

      const updateStock = db.prepare(
        'UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?'
      )

      for (const item of items) {
        insertDetalle.run({
          venta_id: ventaId,
          producto_id: item.producto_id,
          nombre_producto: item.nombre,
          precio_unitario: item.precio,
          cantidad: item.cantidad,
          subtotal: item.precio * item.cantidad
        })
        if (item.producto_id) {
          updateStock.run(item.cantidad, item.producto_id, item.cantidad)
        }
      }

      return db
        .prepare('SELECT * FROM ventas WHERE id = ?')
        .get(ventaId)
    })

    return crearVenta()
  })

  ipcMain.handle('ventas:listar', (_, { fecha_desde, fecha_hasta, limite = 50, incluir_anuladas = false } = {}) => {
    let query = `
      SELECT v.*, COUNT(d.id) AS cantidad_items
      FROM ventas v
      LEFT JOIN detalle_ventas d ON v.id = d.venta_id
      WHERE 1=1
    `
    const params = []

    if (!incluir_anuladas) query += ' AND v.anulada = 0'
    if (fecha_desde) { query += ' AND date(v.fecha) >= ?'; params.push(fecha_desde) }
    if (fecha_hasta) { query += ' AND date(v.fecha) <= ?'; params.push(fecha_hasta) }

    query += ' GROUP BY v.id ORDER BY v.fecha DESC LIMIT ?'
    params.push(limite)

    return db.prepare(query).all(...params)
  })

  ipcMain.handle('ventas:resumen-periodo', (_, { fecha_desde, fecha_hasta } = {}) => {
    const filtroParts = []
    const params = []
    if (fecha_desde) { filtroParts.push("date(v.fecha) >= ?"); params.push(fecha_desde) }
    if (fecha_hasta) { filtroParts.push("date(v.fecha) <= ?"); params.push(fecha_hasta) }
    const filtro = filtroParts.length ? ' AND ' + filtroParts.join(' AND ') : ''

    const resumen = db.prepare(`
      SELECT
        COUNT(CASE WHEN v.anulada = 0 THEN 1 END)                                AS total_ventas,
        COALESCE(SUM(CASE WHEN v.anulada = 0 THEN v.total ELSE 0 END), 0)        AS monto_total,
        COUNT(CASE WHEN v.anulada = 1 THEN 1 END)                                AS total_anuladas
      FROM ventas v
      WHERE 1=1 ${filtro}
    `).get(...params)

    const ganancia = db.prepare(`
      SELECT COALESCE(
        SUM((dv.precio_unitario - COALESCE(p.precio_costo, 0)) * dv.cantidad), 0
      ) AS ganancia
      FROM detalle_ventas dv
      JOIN ventas v ON dv.venta_id = v.id
      LEFT JOIN productos p ON dv.producto_id = p.id
      WHERE v.anulada = 0 ${filtro}
    `).get(...params)

    return { ...resumen, ganancia_estimada: ganancia?.ganancia ?? 0 }
  })

  ipcMain.handle('ventas:detalle', (_, ventaId) => {
    const venta = db.prepare('SELECT * FROM ventas WHERE id = ?').get(ventaId)
    const items = db.prepare(`
      SELECT dv.*, p.codigo_barras
      FROM detalle_ventas dv
      LEFT JOIN productos p ON p.id = dv.producto_id
      WHERE dv.venta_id = ?
    `).all(ventaId)
    return { ...venta, items }
  })

  ipcMain.handle('ventas:anular', (_, ventaId) => {
    db.transaction(() => {
      const items = db
        .prepare('SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = ?')
        .all(ventaId)
      for (const item of items) {
        if (item.producto_id) {
          db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?').run(
            item.cantidad,
            item.producto_id
          )
        }
      }
      db.prepare('UPDATE ventas SET anulada = 1 WHERE id = ?').run(ventaId)
    })()
    return { ok: true }
  })

  ipcMain.handle('ventas:resumen-hoy', () => {
    return db
      .prepare(`
        SELECT
          COUNT(*) AS total_ventas,
          SUM(total) AS monto_total,
          SUM(CASE WHEN medio_pago = 'efectivo' THEN total ELSE 0 END) AS efectivo,
          SUM(CASE WHEN medio_pago != 'efectivo' THEN total ELSE 0 END) AS electronico
        FROM ventas
        WHERE date(fecha) = date('now', 'localtime') AND anulada = 0
      `)
      .get()
  })
}
