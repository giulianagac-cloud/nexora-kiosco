export function registerProveedoresHandlers(ipcMain, db) {
  ipcMain.handle('proveedores:listar', (_, filtros = {}) => {
    let sql = `SELECT * FROM proveedores WHERE activo = 1`
    const params = []
    if (filtros.busqueda) {
      sql += ` AND (razon_social LIKE ? OR cuit LIKE ?)`
      const q = `%${filtros.busqueda}%`
      params.push(q, q)
    }
    sql += ` ORDER BY razon_social ASC`
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('proveedores:get', (_, id) =>
    db.prepare(`SELECT * FROM proveedores WHERE id = ?`).get(id) ?? null
  )

  ipcMain.handle('proveedores:crear', (_, datos) => {
    if (!datos.razon_social?.trim()) throw new Error('La razón social es obligatoria')
    const result = db.prepare(`
      INSERT INTO proveedores
        (razon_social, nombre_comercial, cuit, telefono, celular, email,
         calle, numero, localidad, contacto, ingresos_brutos,
         condicion_iva, web, observaciones)
      VALUES
        (@razon_social, @nombre_comercial, @cuit, @telefono, @celular, @email,
         @calle, @numero, @localidad, @contacto, @ingresos_brutos,
         @condicion_iva, @web, @observaciones)
    `).run({
      razon_social:     datos.razon_social.trim(),
      nombre_comercial: datos.nombre_comercial ?? null,
      cuit:             datos.cuit             ?? null,
      telefono:         datos.telefono         ?? null,
      celular:          datos.celular          ?? null,
      email:            datos.email            ?? null,
      calle:            datos.calle            ?? null,
      numero:           datos.numero           ?? null,
      localidad:        datos.localidad        ?? null,
      contacto:         datos.contacto         ?? null,
      ingresos_brutos:  datos.ingresos_brutos  ?? null,
      condicion_iva:    datos.condicion_iva    ?? 'monotributo',
      web:              datos.web              ?? null,
      observaciones:    datos.observaciones    ?? null,
    })
    return db.prepare(`SELECT * FROM proveedores WHERE id = ?`).get(result.lastInsertRowid)
  })

  ipcMain.handle('proveedores:actualizar', (_, datos) => {
    if (!datos.razon_social?.trim()) throw new Error('La razón social es obligatoria')
    db.prepare(`
      UPDATE proveedores SET
        razon_social = @razon_social, nombre_comercial = @nombre_comercial,
        cuit = @cuit, telefono = @telefono, celular = @celular, email = @email,
        calle = @calle, numero = @numero, localidad = @localidad,
        contacto = @contacto, ingresos_brutos = @ingresos_brutos,
        condicion_iva = @condicion_iva, web = @web, observaciones = @observaciones
      WHERE id = @id
    `).run({
      id:               datos.id,
      razon_social:     datos.razon_social.trim(),
      nombre_comercial: datos.nombre_comercial ?? null,
      cuit:             datos.cuit             ?? null,
      telefono:         datos.telefono         ?? null,
      celular:          datos.celular          ?? null,
      email:            datos.email            ?? null,
      calle:            datos.calle            ?? null,
      numero:           datos.numero           ?? null,
      localidad:        datos.localidad        ?? null,
      contacto:         datos.contacto         ?? null,
      ingresos_brutos:  datos.ingresos_brutos  ?? null,
      condicion_iva:    datos.condicion_iva    ?? 'monotributo',
      web:              datos.web              ?? null,
      observaciones:    datos.observaciones    ?? null,
    })
    return { ok: true }
  })

  ipcMain.handle('proveedores:eliminar', (_, id) => {
    db.prepare(`UPDATE proveedores SET activo = 0 WHERE id = ?`).run(id)
    return { ok: true }
  })

  ipcMain.handle('proveedores:movimientos', (_, proveedorId) =>
    db.prepare(`
      SELECT * FROM movimientos_proveedores
      WHERE proveedor_id = ? ORDER BY fecha ASC, id ASC
    `).all(proveedorId)
  )

  ipcMain.handle('proveedores:agregar-movimiento', (_, { proveedor_id, tipo, monto, descripcion }) => {
    if (!proveedor_id) throw new Error('Proveedor no especificado')
    if (!monto || Number(monto) <= 0) throw new Error('El monto debe ser mayor a cero')

    const agregar = db.transaction(() => {
      db.prepare(`
        INSERT INTO movimientos_proveedores (proveedor_id, tipo, monto, descripcion)
        VALUES (?, ?, ?, ?)
      `).run(proveedor_id, tipo, Number(monto), descripcion ?? null)

      // credito = nos facturan (saldo sube), debito = pagamos (saldo baja)
      const delta = tipo === 'credito' ? Number(monto) : -Number(monto)
      db.prepare(`UPDATE proveedores SET saldo = saldo + ? WHERE id = ?`).run(delta, proveedor_id)

      return db.prepare(`SELECT saldo FROM proveedores WHERE id = ?`).get(proveedor_id).saldo
    })

    return { saldo: agregar() }
  })
}
