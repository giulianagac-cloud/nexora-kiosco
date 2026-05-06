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
    title: 'Guardar informe',
    defaultPath: defaultName,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  })
  return canceled || !filePath ? null : filePath
}

const periodo = (d, h) => `Período: ${d} al ${h}`

export function registerInformesHandlers(ipcMain, db) {
  ipcMain.handle('informes:ventas-fecha', async (event, { fecha_desde, fecha_hasta }) => {
    const rows = db.prepare(`
      SELECT date(v.fecha) AS fecha,
             COUNT(*)      AS cantidad_ventas,
             SUM(v.total)  AS total
      FROM ventas v
      WHERE v.anulada = 0
        AND date(v.fecha) >= ? AND date(v.fecha) <= ?
      GROUP BY date(v.fecha)
      ORDER BY fecha ASC
    `).all(fecha_desde, fecha_hasta)

    const filePath = await saveDialog(event, `ventas-por-fecha-${fecha_desde}.xlsx`)
    if (!filePath) return null

    const totV = rows.reduce((s, r) => s + r.cantidad_ventas, 0)
    const totM = rows.reduce((s, r) => s + r.total, 0)

    const data = [
      ['Ventas por Fecha'],
      [periodo(fecha_desde, fecha_hasta)],
      [],
      ['Fecha', 'Cantidad Ventas', 'Total ($)'],
      ...rows.map(r => [r.fecha, r.cantidad_ventas, r.total]),
      [],
      ['TOTAL', totV, totM]
    ]

    XLSX.writeFile(makeWb(data, 'Ventas por Fecha', [14, 18, 15]), filePath)
    return { ok: true }
  })

  ipcMain.handle('informes:ventas-detalle', async (event, { fecha_desde, fecha_hasta }) => {
    const rows = db.prepare(`
      SELECT
        date(v.fecha)                    AS fecha,
        time(v.fecha)                    AS hora,
        v.id                             AS nro_venta,
        v.medio_pago,
        dv.nombre_producto,
        dv.cantidad,
        dv.precio_unitario,
        COALESCE(p.precio_costo, 0)      AS costo_unitario,
        COALESCE(p.iva, 21)              AS iva_pct,
        dv.subtotal,
        (dv.cantidad * COALESCE(p.precio_costo, 0)) AS costo_total,
        CASE
          WHEN COALESCE(p.precio_costo, 0) > 0
          THEN ROUND(
            (dv.precio_unitario - COALESCE(p.precio_costo, 0))
            / COALESCE(p.precio_costo, 0) * 100, 2)
          ELSE NULL
        END AS margen_pct
      FROM detalle_ventas dv
      JOIN ventas v ON dv.venta_id = v.id
      LEFT JOIN productos p ON dv.producto_id = p.id
      WHERE v.anulada = 0
        AND date(v.fecha) >= ? AND date(v.fecha) <= ?
      ORDER BY v.fecha ASC, v.id ASC
    `).all(fecha_desde, fecha_hasta)

    const filePath = await saveDialog(event, `ventas-detalle-${fecha_desde}.xlsx`)
    if (!filePath) return null

    const data = [
      ['Ventas con Detalle'],
      [periodo(fecha_desde, fecha_hasta)],
      [],
      ['Fecha', 'Hora', 'N° Venta', 'Medio Pago', 'Producto', 'Cant.', 'Precio Unit.', 'Costo Unit.', 'IVA %', 'Subtotal', 'Costo Total', 'Margen %'],
      ...rows.map(r => [
        r.fecha, r.hora, r.nro_venta, r.medio_pago,
        r.nombre_producto, r.cantidad, r.precio_unitario,
        r.costo_unitario, r.iva_pct, r.subtotal, r.costo_total,
        r.margen_pct ?? ''
      ])
    ]

    XLSX.writeFile(makeWb(data, 'Ventas Detalle', [12, 10, 10, 14, 35, 8, 13, 13, 8, 12, 12, 10]), filePath)
    return { ok: true }
  })

  ipcMain.handle('informes:ventas-rubros', async (event, { fecha_desde, fecha_hasta }) => {
    const rows = db.prepare(`
      SELECT
        COALESCE(c.nombre, 'Sin rubro') AS rubro,
        SUM(dv.cantidad)                AS unidades,
        SUM(dv.subtotal)                AS total
      FROM detalle_ventas dv
      JOIN ventas v ON dv.venta_id = v.id
      LEFT JOIN productos p ON dv.producto_id = p.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE v.anulada = 0
        AND date(v.fecha) >= ? AND date(v.fecha) <= ?
      GROUP BY COALESCE(c.nombre, 'Sin rubro')
      ORDER BY total DESC
    `).all(fecha_desde, fecha_hasta)

    const filePath = await saveDialog(event, `ventas-rubros-${fecha_desde}.xlsx`)
    if (!filePath) return null

    const totM = rows.reduce((s, r) => s + r.total, 0)
    const data = [
      ['Ventas por Rubro'],
      [periodo(fecha_desde, fecha_hasta)],
      [],
      ['Rubro', 'Unidades Vendidas', 'Total ($)'],
      ...rows.map(r => [r.rubro, r.unidades, r.total]),
      [],
      ['TOTAL', '', totM]
    ]

    XLSX.writeFile(makeWb(data, 'Ventas por Rubro', [30, 18, 15]), filePath)
    return { ok: true }
  })

  ipcMain.handle('informes:ventas-articulos', async (event, { fecha_desde, fecha_hasta }) => {
    const rows = db.prepare(`
      SELECT
        COALESCE(p.codigo_barras, '')    AS codigo,
        dv.nombre_producto               AS descripcion,
        COALESCE(c.nombre, 'Sin rubro') AS rubro,
        SUM(dv.cantidad)                 AS unidades,
        SUM(dv.subtotal)                 AS total_vendido,
        SUM(dv.cantidad * COALESCE(p.precio_costo, 0)) AS costo_total,
        CASE
          WHEN SUM(dv.cantidad * COALESCE(p.precio_costo, 0)) > 0
          THEN ROUND(
            (SUM(dv.subtotal) - SUM(dv.cantidad * COALESCE(p.precio_costo, 0)))
            / SUM(dv.cantidad * COALESCE(p.precio_costo, 0)) * 100, 2)
          ELSE NULL
        END AS margen_pct
      FROM detalle_ventas dv
      JOIN ventas v ON dv.venta_id = v.id
      LEFT JOIN productos p ON dv.producto_id = p.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE v.anulada = 0
        AND date(v.fecha) >= ? AND date(v.fecha) <= ?
      GROUP BY dv.nombre_producto
      ORDER BY total_vendido DESC
    `).all(fecha_desde, fecha_hasta)

    const filePath = await saveDialog(event, `ventas-articulos-${fecha_desde}.xlsx`)
    if (!filePath) return null

    const data = [
      ['Ventas por Artículo'],
      [periodo(fecha_desde, fecha_hasta)],
      [],
      ['Código', 'Descripción', 'Rubro', 'Unidades', 'Total Vendido', 'Costo Total', 'Margen %'],
      ...rows.map(r => [r.codigo, r.descripcion, r.rubro, r.unidades, r.total_vendido, r.costo_total, r.margen_pct ?? ''])
    ]

    XLSX.writeFile(makeWb(data, 'Ventas por Artículo', [15, 38, 20, 10, 15, 14, 10]), filePath)
    return { ok: true }
  })

  ipcMain.handle('informes:ventas-medios-pago', async (event, { fecha_desde, fecha_hasta }) => {
    const rows = db.prepare(`
      SELECT medio_pago,
             COUNT(*) AS cantidad_ventas,
             SUM(total) AS total
      FROM ventas
      WHERE anulada = 0
        AND date(fecha) >= ? AND date(fecha) <= ?
      GROUP BY medio_pago
      ORDER BY total DESC
    `).all(fecha_desde, fecha_hasta)

    const filePath = await saveDialog(event, `ventas-medios-pago-${fecha_desde}.xlsx`)
    if (!filePath) return null

    const labels = {
      efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
      mercadopago: 'MercadoPago', transferencia: 'Transferencia', mixto: 'Mixto'
    }
    const totV = rows.reduce((s, r) => s + r.cantidad_ventas, 0)
    const totM = rows.reduce((s, r) => s + r.total, 0)

    const data = [
      ['Ventas por Medio de Pago'],
      [periodo(fecha_desde, fecha_hasta)],
      [],
      ['Medio de Pago', 'Cantidad Ventas', 'Total ($)'],
      ...rows.map(r => [labels[r.medio_pago] ?? r.medio_pago, r.cantidad_ventas, r.total]),
      [],
      ['TOTAL', totV, totM]
    ]

    XLSX.writeFile(makeWb(data, 'Medios de Pago', [22, 18, 15]), filePath)
    return { ok: true }
  })
}
