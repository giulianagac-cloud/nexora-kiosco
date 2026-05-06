import { dialog, BrowserWindow } from 'electron'
import XLSX from 'xlsx'

function makeWb(rows, sheetName, colWidths) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = colWidths.map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

async function saveDialog(event, defaultName) {
  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Guardar listado',
    defaultPath: defaultName,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  })
  return canceled || !filePath ? null : filePath
}

const hoy = () => new Date().toLocaleDateString('es-AR')

export function registerListadosHandlers(ipcMain, db) {
  ipcMain.handle('listados:lista-precios', async (event, tipo) => {
    const esMayorista = tipo === 'mayorista'
    const colPrecio = esMayorista ? 'p.precio_mayorista' : 'p.precio'
    const labelPrecio = esMayorista ? 'Precio Mayorista' : 'Precio Minorista'
    const titulo = esMayorista ? 'Lista de Precios — Mayorista' : 'Lista de Precios — Minorista'

    const productos = db.prepare(`
      SELECT p.codigo_barras, p.nombre, c.nombre AS rubro, ${colPrecio} AS precio
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = 1 AND p.estado = 'activo'
      ORDER BY c.nombre ASC, p.nombre ASC
    `).all()

    const filePath = await saveDialog(event, `lista-precios-${tipo}-${new Date().toISOString().slice(0, 10)}.xlsx`)
    if (!filePath) return null

    const rows = [
      [titulo],
      [`Generado: ${hoy()}  —  ${productos.length} artículo(s)`],
      [],
      ['Código', 'Descripción', 'Rubro', labelPrecio],
      ...productos.map(p => [p.codigo_barras ?? '', p.nombre, p.rubro ?? 'Sin rubro', p.precio ?? 0])
    ]

    XLSX.writeFile(makeWb(rows, 'Lista de Precios', [16, 42, 22, 16]), filePath)
    return { ok: true }
  })

  ipcMain.handle('listados:reposicion', async (event) => {
    const productos = db.prepare(`
      SELECT p.codigo_barras, p.nombre, c.nombre AS rubro,
             p.stock, p.stock_minimo,
             (p.stock_minimo - p.stock) AS faltante
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = 1 AND p.control_stock = 1
        AND p.stock_minimo > 0 AND p.stock <= p.stock_minimo
      ORDER BY faltante DESC, p.nombre ASC
    `).all()

    const filePath = await saveDialog(event, `reposicion-${new Date().toISOString().slice(0, 10)}.xlsx`)
    if (!filePath) return null

    const rows = [
      ['Listado de Reposición'],
      [`Generado: ${hoy()}  —  ${productos.length} artículo(s) bajo stock mínimo`],
      [],
      ['Código', 'Descripción', 'Rubro', 'Stock Actual', 'Stock Mínimo', 'Faltante'],
      ...productos.map(p => [
        p.codigo_barras ?? '', p.nombre, p.rubro ?? 'Sin rubro',
        p.stock, p.stock_minimo, p.faltante
      ])
    ]

    XLSX.writeFile(makeWb(rows, 'Reposición', [16, 42, 22, 13, 13, 10]), filePath)
    return { ok: true }
  })

  ipcMain.handle('listados:stock-valorizado', async (event) => {
    const productos = db.prepare(`
      SELECT p.codigo_barras, p.nombre, c.nombre AS rubro,
             p.stock, p.precio_costo,
             (p.stock * p.precio_costo) AS valor_total
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = 1 AND p.stock > 0
      ORDER BY c.nombre ASC, p.nombre ASC
    `).all()

    const totalValor = productos.reduce((s, p) => s + (p.valor_total ?? 0), 0)

    const filePath = await saveDialog(event, `stock-valorizado-${new Date().toISOString().slice(0, 10)}.xlsx`)
    if (!filePath) return null

    const rows = [
      ['Stock Valorizado'],
      [`Generado: ${hoy()}`],
      [],
      ['Código', 'Descripción', 'Rubro', 'Stock', 'Precio Costo', 'Valor Total'],
      ...productos.map(p => [
        p.codigo_barras ?? '', p.nombre, p.rubro ?? 'Sin rubro',
        p.stock, p.precio_costo ?? 0, p.valor_total ?? 0
      ]),
      [],
      ['', '', '', '', 'TOTAL INVENTARIO', totalValor]
    ]

    XLSX.writeFile(makeWb(rows, 'Stock Valorizado', [16, 42, 22, 10, 14, 15]), filePath)
    return { ok: true }
  })
}
