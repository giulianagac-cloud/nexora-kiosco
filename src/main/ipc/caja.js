export function registerCajaHandlers(ipcMain, db) {
  ipcMain.handle('caja:estado', () => {
    return db.prepare("SELECT * FROM caja_sesiones WHERE estado = 'abierta' LIMIT 1").get() ?? null
  })

  ipcMain.handle('caja:abrir', (_, saldo_inicial) => {
    const abierta = db.prepare("SELECT id FROM caja_sesiones WHERE estado = 'abierta'").get()
    if (abierta) throw new Error('Ya hay una caja abierta')
    const result = db.prepare('INSERT INTO caja_sesiones (saldo_inicial) VALUES (?)').run(saldo_inicial)
    return db.prepare('SELECT * FROM caja_sesiones WHERE id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('caja:cerrar', (_, sesionId) => {
    const resumen = db
      .prepare(`
        SELECT COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) AS movimientos
        FROM movimientos_caja WHERE sesion_id = ?
      `)
      .get(sesionId)

    const sesion = db.prepare('SELECT * FROM caja_sesiones WHERE id = ?').get(sesionId)

    const ventasEfectivo = db
      .prepare(`
        SELECT COALESCE(SUM(total), 0) AS total
        FROM ventas WHERE sesion_id = ? AND medio_pago = 'efectivo' AND anulada = 0
      `)
      .get(sesionId)

    const saldoFinal =
      (sesion?.saldo_inicial ?? 0) +
      (ventasEfectivo?.total ?? 0) +
      (resumen?.movimientos ?? 0)

    db.prepare(`
      UPDATE caja_sesiones
      SET estado = 'cerrada', fecha_cierre = datetime('now','localtime'), saldo_final = ?
      WHERE id = ?
    `).run(saldoFinal, sesionId)

    return db.prepare('SELECT * FROM caja_sesiones WHERE id = ?').get(sesionId)
  })

  ipcMain.handle('caja:movimiento', (_, { sesion_id, tipo, monto, descripcion }) => {
    const result = db
      .prepare('INSERT INTO movimientos_caja (sesion_id, tipo, monto, descripcion) VALUES (?, ?, ?, ?)')
      .run(sesion_id, tipo, monto, descripcion ?? '')
    return { id: result.lastInsertRowid }
  })

  // Returns movements in ASC order (oldest first) for running balance calculation
  ipcMain.handle('caja:movimientos', (_, sesionId) => {
    return db
      .prepare('SELECT * FROM movimientos_caja WHERE sesion_id = ? ORDER BY fecha ASC, id ASC')
      .all(sesionId)
  })

  // Returns aggregated totals for a session (for summary cards)
  ipcMain.handle('caja:saldo-sesion', (_, sesionId) => {
    const ventas = db
      .prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN anulada = 0 THEN total ELSE 0 END), 0)                                   AS total_ventas,
          COALESCE(SUM(CASE WHEN anulada = 0 AND medio_pago = 'efectivo' THEN total ELSE 0 END), 0)       AS ventas_efectivo
        FROM ventas WHERE sesion_id = ?
      `)
      .get(sesionId)

    const movs = db
      .prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS total_ingresos,
          COALESCE(SUM(CASE WHEN tipo = 'egreso'  THEN monto ELSE 0 END), 0) AS total_egresos
        FROM movimientos_caja WHERE sesion_id = ?
      `)
      .get(sesionId)

    return {
      total_ventas: ventas.total_ventas,
      ventas_efectivo: ventas.ventas_efectivo,
      total_ingresos: movs.total_ingresos,
      total_egresos: movs.total_egresos,
    }
  })

  ipcMain.handle('caja:historial', (_, limite = 30) => {
    return db
      .prepare(`
        SELECT cs.*,
          (SELECT COUNT(*)               FROM ventas WHERE sesion_id = cs.id AND anulada = 0) AS total_ventas,
          (SELECT COALESCE(SUM(total),0) FROM ventas WHERE sesion_id = cs.id AND anulada = 0) AS monto_ventas
        FROM caja_sesiones cs
        ORDER BY cs.fecha_apertura DESC
        LIMIT ?
      `)
      .all(limite)
  })

  ipcMain.handle('configuracion:get', (_, clave) => {
    const row = db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get(clave)
    return row?.valor ?? null
  })

  ipcMain.handle('configuracion:getAll', () => {
    const rows = db.prepare('SELECT clave, valor FROM configuracion').all()
    return Object.fromEntries(rows.map((r) => [r.clave, r.valor]))
  })

  ipcMain.handle('configuracion:set', (_, { clave, valor }) => {
    db.prepare('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)').run(clave, String(valor))
    return { ok: true }
  })
}
