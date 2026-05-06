import { dialog, BrowserWindow } from 'electron'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { extname } from 'path'

const sha256 = (t) => createHash('sha256').update(t).digest('hex')

export function registerConfiguracionHandlers(ipcMain, db) {

  // ── Config general ────────────────────────────────────────────────────────
  ipcMain.handle('configuracion:get', (_, clave) =>
    db.prepare('SELECT valor FROM configuracion WHERE clave = ?').get(clave)?.valor ?? null
  )

  ipcMain.handle('configuracion:getAll', () => {
    const rows = db.prepare('SELECT clave, valor FROM configuracion').all()
    return Object.fromEntries(rows.map(r => [r.clave, r.valor]))
  })

  ipcMain.handle('configuracion:set', (_, { clave, valor }) => {
    db.prepare('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)').run(clave, String(valor ?? ''))
    return { ok: true }
  })

  ipcMain.handle('configuracion:set-many', (_, datos) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)')
    db.transaction(() => {
      for (const [clave, valor] of Object.entries(datos)) stmt.run(clave, String(valor ?? ''))
    })()
    return { ok: true }
  })

  ipcMain.handle('configuracion:upload-logo', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Seleccionar logo',
      filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
      properties: ['openFile']
    })
    if (canceled || !filePaths.length) return null
    const ext = extname(filePaths[0]).slice(1).toLowerCase()
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    const b64 = `data:${mime};base64,${readFileSync(filePaths[0]).toString('base64')}`
    db.prepare('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)').run('negocio_logo', b64)
    return b64
  })

  // ── Usuarios ──────────────────────────────────────────────────────────────
  ipcMain.handle('usuarios:listar', () =>
    db.prepare('SELECT id, nombre, usuario, rol, activo, created_at FROM usuarios ORDER BY rol DESC, nombre ASC').all()
  )

  ipcMain.handle('usuarios:crear', (_, { nombre, usuario, password, rol }) => {
    if (!nombre?.trim() || !usuario?.trim() || !password)
      throw new Error('Nombre, usuario y contraseña son obligatorios')
    const result = db.prepare(
      'INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)'
    ).run(nombre.trim(), usuario.trim(), sha256(password), rol ?? 'cajero')
    return { id: result.lastInsertRowid }
  })

  ipcMain.handle('usuarios:actualizar', (_, { id, nombre, usuario, rol }) => {
    db.prepare('UPDATE usuarios SET nombre = ?, usuario = ?, rol = ? WHERE id = ?')
      .run(nombre.trim(), usuario.trim(), rol, id)
    return { ok: true }
  })

  ipcMain.handle('usuarios:eliminar', (_, id) => {
    const u = db.prepare('SELECT rol FROM usuarios WHERE id = ?').get(id)
    if (u?.rol === 'admin') {
      const { count } = db.prepare("SELECT COUNT(*) AS count FROM usuarios WHERE rol = 'admin'").get()
      if (count <= 1) throw new Error('No se puede eliminar el único administrador')
    }
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(id)
    return { ok: true }
  })

  ipcMain.handle('usuarios:cambiar-password', (_, { id, password }) => {
    if (!password) throw new Error('La contraseña no puede estar vacía')
    db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(sha256(password), id)
    return { ok: true }
  })

  ipcMain.handle('usuarios:toggle-activo', (_, id) => {
    const u = db.prepare('SELECT rol, activo FROM usuarios WHERE id = ?').get(id)
    if (u?.rol === 'admin' && u.activo) {
      const { count } = db.prepare("SELECT COUNT(*) AS count FROM usuarios WHERE rol = 'admin' AND activo = 1").get()
      if (count <= 1) throw new Error('No se puede desactivar el único administrador activo')
    }
    db.prepare('UPDATE usuarios SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id)
    return { ok: true }
  })

  // ── Listas de precios ─────────────────────────────────────────────────────
  ipcMain.handle('listas-precios:listar', () =>
    db.prepare('SELECT * FROM listas_precios ORDER BY orden ASC').all()
  )

  ipcMain.handle('listas-precios:actualizar', (_, { id, nombre, activa }) => {
    db.prepare('UPDATE listas_precios SET nombre = ?, activa = ? WHERE id = ?')
      .run(nombre.trim(), activa ? 1 : 0, id)
    return { ok: true }
  })

  ipcMain.handle('listas-precios:guardar-todas', (_, listas) => {
    const stmt = db.prepare('UPDATE listas_precios SET nombre = ?, activa = ? WHERE id = ?')
    db.transaction(() => {
      for (const l of listas) stmt.run(l.nombre.trim(), l.activa ? 1 : 0, l.id)
    })()
    return { ok: true }
  })

  // ── Tarjetas ──────────────────────────────────────────────────────────────
  ipcMain.handle('tarjetas:listar', () =>
    db.prepare('SELECT * FROM tarjetas ORDER BY tipo ASC, nombre ASC').all()
  )

  ipcMain.handle('tarjetas:toggle', (_, id) => {
    db.prepare('UPDATE tarjetas SET activa = CASE WHEN activa = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id)
    return { ok: true }
  })
}
