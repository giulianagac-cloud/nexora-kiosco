export function registerClientesHandlers(ipcMain, db) {
  ipcMain.handle('clientes:listar', (_, filtros = {}) => {
    let sql = `SELECT * FROM clientes WHERE activo = 1`
    const params = []
    if (filtros.busqueda) {
      sql += ` AND (nombre LIKE ? OR apellido LIKE ? OR nro_documento LIKE ?)`
      const q = `%${filtros.busqueda}%`
      params.push(q, q, q)
    }
    sql += ` ORDER BY apellido ASC, nombre ASC`
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('clientes:get', (_, id) =>
    db.prepare(`SELECT * FROM clientes WHERE id = ?`).get(id) ?? null
  )

  ipcMain.handle('clientes:crear', (_, datos) => {
    const result = db.prepare(`
      INSERT INTO clientes
        (tipo_cuenta, nombre, apellido, tipo_documento, nro_documento,
         telefono, email, calle, numero, localidad, provincia,
         condicion_iva, observaciones,
         cc_habilitada, cc_tipo, cc_limite)
      VALUES
        (@tipo_cuenta, @nombre, @apellido, @tipo_documento, @nro_documento,
         @telefono, @email, @calle, @numero, @localidad, @provincia,
         @condicion_iva, @observaciones,
         @cc_habilitada, @cc_tipo, @cc_limite)
    `).run({
      tipo_cuenta:    datos.tipo_cuenta    ?? 'individuo',
      nombre:         datos.nombre,
      apellido:       datos.apellido       ?? null,
      tipo_documento: datos.tipo_documento ?? 'DNI',
      nro_documento:  datos.nro_documento  ?? null,
      telefono:       datos.telefono       ?? null,
      email:          datos.email          ?? null,
      calle:          datos.calle          ?? null,
      numero:         datos.numero         ?? null,
      localidad:      datos.localidad      ?? null,
      provincia:      datos.provincia      ?? null,
      condicion_iva:  datos.condicion_iva  ?? 'consumidor_final',
      observaciones:  datos.observaciones  ?? null,
      cc_habilitada:  datos.cc_habilitada  ? 1 : 0,
      cc_tipo:        datos.cc_tipo        ?? 'ilimitada',
      cc_limite:      datos.cc_limite      ?? 0,
    })
    return db.prepare(`SELECT * FROM clientes WHERE id = ?`).get(result.lastInsertRowid)
  })

  ipcMain.handle('clientes:actualizar', (_, datos) => {
    db.prepare(`
      UPDATE clientes SET
        tipo_cuenta = @tipo_cuenta, nombre = @nombre, apellido = @apellido,
        tipo_documento = @tipo_documento, nro_documento = @nro_documento,
        telefono = @telefono, email = @email,
        calle = @calle, numero = @numero, localidad = @localidad, provincia = @provincia,
        condicion_iva = @condicion_iva, observaciones = @observaciones,
        cc_habilitada = @cc_habilitada, cc_tipo = @cc_tipo, cc_limite = @cc_limite
      WHERE id = @id
    `).run({
      id:             datos.id,
      tipo_cuenta:    datos.tipo_cuenta    ?? 'individuo',
      nombre:         datos.nombre,
      apellido:       datos.apellido       ?? null,
      tipo_documento: datos.tipo_documento ?? 'DNI',
      nro_documento:  datos.nro_documento  ?? null,
      telefono:       datos.telefono       ?? null,
      email:          datos.email          ?? null,
      calle:          datos.calle          ?? null,
      numero:         datos.numero         ?? null,
      localidad:      datos.localidad      ?? null,
      provincia:      datos.provincia      ?? null,
      condicion_iva:  datos.condicion_iva  ?? 'consumidor_final',
      observaciones:  datos.observaciones  ?? null,
      cc_habilitada:  datos.cc_habilitada  ? 1 : 0,
      cc_tipo:        datos.cc_tipo        ?? 'ilimitada',
      cc_limite:      datos.cc_limite      ?? 0,
    })
    return { ok: true }
  })

  ipcMain.handle('clientes:eliminar', (_, id) => {
    db.prepare(`UPDATE clientes SET activo = 0 WHERE id = ?`).run(id)
    return { ok: true }
  })

  ipcMain.handle('clientes:movimientos', (_, clienteId) =>
    db.prepare(`
      SELECT * FROM movimientos_cuenta_corriente
      WHERE cliente_id = ? ORDER BY fecha ASC, id ASC
    `).all(clienteId)
  )

  ipcMain.handle('clientes:agregar-movimiento', (_, { cliente_id, tipo, monto, descripcion }) => {
    const cliente = db.prepare(`SELECT cc_habilitada, cc_tipo, cc_limite, cc_saldo FROM clientes WHERE id = ?`).get(cliente_id)
    if (!cliente) throw new Error('Cliente no encontrado')
    if (!cliente.cc_habilitada) throw new Error('La cuenta corriente no está habilitada para este cliente')

    if (tipo === 'debito' && cliente.cc_tipo === 'limitada') {
      const nuevoSaldo = cliente.cc_saldo + monto
      if (nuevoSaldo > cliente.cc_limite) {
        throw new Error(`Supera el límite de cuenta corriente ($${cliente.cc_limite.toFixed(2)})`)
      }
    }

    const agregarMovimiento = db.transaction(() => {
      db.prepare(`
        INSERT INTO movimientos_cuenta_corriente (cliente_id, tipo, monto, descripcion)
        VALUES (?, ?, ?, ?)
      `).run(cliente_id, tipo, monto, descripcion ?? null)

      const delta = tipo === 'debito' ? monto : -monto
      db.prepare(`UPDATE clientes SET cc_saldo = cc_saldo + ? WHERE id = ?`).run(delta, cliente_id)

      return db.prepare(`SELECT cc_saldo FROM clientes WHERE id = ?`).get(cliente_id).cc_saldo
    })

    return { saldo: agregarMovimiento() }
  })
}
