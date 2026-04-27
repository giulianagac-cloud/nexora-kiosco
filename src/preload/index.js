import { contextBridge, ipcRenderer } from 'electron'

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('api', {
  productos: {
    listar: (filtros) => invoke('productos:listar', filtros),
    buscarCodigo: (codigo) => invoke('productos:buscar-codigo', codigo),
    crear: (producto) => invoke('productos:crear', producto),
    actualizar: (producto) => invoke('productos:actualizar', producto),
    eliminar: (id) => invoke('productos:eliminar', id),
    discontinuar: (id) => invoke('productos:discontinuar', id),
    reactivar: (id) => invoke('productos:reactivar', id),
    ajustarStock: (id, delta) => invoke('productos:ajustar-stock', { id, delta }),
    stockBajo: () => invoke('productos:stock-bajo')
  },

  categorias: {
    listar: () => invoke('categorias:listar')
  },

  ventas: {
    crear: (datos) => invoke('ventas:crear', datos),
    listar: (filtros) => invoke('ventas:listar', filtros),
    detalle: (id) => invoke('ventas:detalle', id),
    anular: (id) => invoke('ventas:anular', id),
    resumenHoy: () => invoke('ventas:resumen-hoy')
  },

  caja: {
    estado: () => invoke('caja:estado'),
    abrir: (saldoInicial) => invoke('caja:abrir', saldoInicial),
    cerrar: (sesionId) => invoke('caja:cerrar', sesionId),
    movimiento: (datos) => invoke('caja:movimiento', datos),
    movimientos: (sesionId) => invoke('caja:movimientos', sesionId),
    historial: (limite) => invoke('caja:historial', limite)
  },

  config: {
    get: (clave) => invoke('configuracion:get', clave),
    getAll: () => invoke('configuracion:getAll'),
    set: (clave, valor) => invoke('configuracion:set', { clave, valor })
  }
})
