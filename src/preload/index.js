import { contextBridge, ipcRenderer } from 'electron'

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args)

contextBridge.exposeInMainWorld('api', {
  auth: {
    login: (datos) => invoke('auth:login', datos)
  },

  productos: {
    listar: (filtros) => invoke('productos:listar', filtros),
    total: () => invoke('productos:total'),
    buscarCodigo: (codigo) => invoke('productos:buscar-codigo', codigo),
    crear: (producto) => invoke('productos:crear', producto),
    actualizar: (producto) => invoke('productos:actualizar', producto),
    eliminar: (id) => invoke('productos:eliminar', id),
    eliminarLote: (ids) => invoke('productos:eliminar-lote', ids),
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
    resumenHoy: () => invoke('ventas:resumen-hoy'),
    resumenPeriodo: (filtros) => invoke('ventas:resumen-periodo', filtros)
  },

  caja: {
    estado: () => invoke('caja:estado'),
    abrir: (saldoInicial) => invoke('caja:abrir', saldoInicial),
    cerrar: (sesionId) => invoke('caja:cerrar', sesionId),
    movimiento: (datos) => invoke('caja:movimiento', datos),
    movimientos: (sesionId) => invoke('caja:movimientos', sesionId),
    saldoSesion: (sesionId) => invoke('caja:saldo-sesion', sesionId),
    historial: (limite) => invoke('caja:historial', limite)
  },

  importar: {
    excel:          ()       => invoke('importar:excel'),
    inspeccionarDb: ()       => invoke('importar:inspeccionar-db'),
    desdeDb:        (params) => invoke('importar:desde-db', params),
    onProgreso:     (cb)     => {
      ipcRenderer.removeAllListeners('importar:progreso')
      ipcRenderer.on('importar:progreso', (_, data) => cb(data))
    },
    offProgreso: () => ipcRenderer.removeAllListeners('importar:progreso'),
  },

  config: {
    get: (clave) => invoke('configuracion:get', clave),
    getAll: () => invoke('configuracion:getAll'),
    set: (clave, valor) => invoke('configuracion:set', { clave, valor }),
    setMany: (datos) => invoke('configuracion:set-many', datos),
    uploadLogo: () => invoke('configuracion:upload-logo')
  },

  usuarios: {
    listar: () => invoke('usuarios:listar'),
    crear: (datos) => invoke('usuarios:crear', datos),
    actualizar: (datos) => invoke('usuarios:actualizar', datos),
    eliminar: (id) => invoke('usuarios:eliminar', id),
    cambiarPassword: (datos) => invoke('usuarios:cambiar-password', datos),
    toggleActivo: (id) => invoke('usuarios:toggle-activo', id)
  },

  listasPrecio: {
    listar: () => invoke('listas-precios:listar'),
    actualizar: (datos) => invoke('listas-precios:actualizar', datos),
    guardarTodas: (listas) => invoke('listas-precios:guardar-todas', listas)
  },

  tarjetas: {
    listar: () => invoke('tarjetas:listar'),
    toggle: (id) => invoke('tarjetas:toggle', id)
  },

  clientes: {
    listar:            (filtros) => invoke('clientes:listar', filtros),
    get:               (id)      => invoke('clientes:get', id),
    crear:             (datos)   => invoke('clientes:crear', datos),
    actualizar:        (datos)   => invoke('clientes:actualizar', datos),
    eliminar:          (id)      => invoke('clientes:eliminar', id),
    movimientos:       (id)      => invoke('clientes:movimientos', id),
    agregarMovimiento: (datos)   => invoke('clientes:agregar-movimiento', datos),
  },

  proveedores: {
    listar:            (filtros) => invoke('proveedores:listar', filtros),
    get:               (id)      => invoke('proveedores:get', id),
    crear:             (datos)   => invoke('proveedores:crear', datos),
    actualizar:        (datos)   => invoke('proveedores:actualizar', datos),
    eliminar:          (id)      => invoke('proveedores:eliminar', id),
    movimientos:       (id)      => invoke('proveedores:movimientos', id),
    agregarMovimiento: (datos)   => invoke('proveedores:agregar-movimiento', datos),
  },

  listados: {
    listaPrecios:    (tipo) => invoke('listados:lista-precios', tipo),
    reposicion:      ()     => invoke('listados:reposicion'),
    stockValorizado: ()     => invoke('listados:stock-valorizado'),
  },

  informes: {
    ventasFecha:      (params) => invoke('informes:ventas-fecha', params),
    ventasDetalle:    (params) => invoke('informes:ventas-detalle', params),
    ventasRubros:     (params) => invoke('informes:ventas-rubros', params),
    ventasArticulos:  (params) => invoke('informes:ventas-articulos', params),
    ventasMediosPago: (params) => invoke('informes:ventas-medios-pago', params),
  },
})
