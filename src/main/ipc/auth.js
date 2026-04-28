import { createHash } from 'crypto'

const sha256 = (t) => createHash('sha256').update(t).digest('hex')

export function registerAuthHandlers(ipcMain, db) {
  ipcMain.handle('auth:login', (_, { usuario, password }) => {
    const user = db
      .prepare(
        `SELECT id, nombre, usuario, rol
         FROM usuarios
         WHERE usuario = ? AND password_hash = ? AND activo = 1`
      )
      .get(usuario, sha256(password))
    if (!user) throw new Error('Usuario o contraseña incorrectos')
    return user
  })
}
