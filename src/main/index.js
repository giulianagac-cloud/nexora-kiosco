import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './database/db'
import { registerProductosHandlers } from './ipc/productos'
import { registerVentasHandlers } from './ipc/ventas'
import { registerCajaHandlers } from './ipc/caja'
import { registerImportarHandlers } from './ipc/importar'
import { registerAuthHandlers } from './ipc/auth'
import { registerConfiguracionHandlers } from './ipc/configuracion'
import { registerClientesHandlers } from './ipc/clientes'
import { registerProveedoresHandlers } from './ipc/proveedores'
import { registerListadosHandlers } from './ipc/listados'
import { registerInformesHandlers } from './ipc/informes'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Nexora Kiosco',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.nexora.kiosco')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const db = initDatabase()
  registerProductosHandlers(ipcMain, db)
  registerVentasHandlers(ipcMain, db)
  registerCajaHandlers(ipcMain, db)
  registerImportarHandlers(ipcMain, db)
  registerAuthHandlers(ipcMain, db)
  registerConfiguracionHandlers(ipcMain, db)
  registerClientesHandlers(ipcMain, db)
  registerProveedoresHandlers(ipcMain, db)
  registerListadosHandlers(ipcMain, db)
  registerInformesHandlers(ipcMain, db)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
