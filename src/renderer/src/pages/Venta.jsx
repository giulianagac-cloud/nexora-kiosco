import { useState, useEffect, useRef, useCallback } from 'react'

const MEDIOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'mercadopago', label: 'MercadoPago' },
  { value: 'transferencia', label: 'Transferencia' }
]

function formatPrecio(n) {
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

export default function Venta() {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [carrito, setCarrito] = useState([])
  const [medioPago, setMedioPago] = useState('efectivo')
  const [procesando, setProcesando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const inputRef = useRef(null)

  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const buscar = useCallback(async (texto) => {
    setBusqueda(texto)
    if (texto.length < 2) { setResultados([]); return }
    const res = await window.api.productos.listar({ busqueda: texto })
    setResultados(res)
  }, [])

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const idx = prev.findIndex((i) => i.producto_id === producto.id)
      if (idx >= 0) {
        const copia = [...prev]
        copia[idx] = { ...copia[idx], cantidad: copia[idx].cantidad + 1 }
        return copia
      }
      return [
        ...prev,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: 1
        }
      ]
    })
    setBusqueda('')
    setResultados([])
    inputRef.current?.focus()
  }

  const actualizarCantidad = (idx, cantidad) => {
    if (cantidad < 1) return eliminarItem(idx)
    setCarrito((prev) => {
      const copia = [...prev]
      copia[idx] = { ...copia[idx], cantidad }
      return copia
    })
  }

  const eliminarItem = (idx) => {
    setCarrito((prev) => prev.filter((_, i) => i !== idx))
  }

  const limpiarCarrito = () => {
    setCarrito([])
    setBusqueda('')
    setResultados([])
    inputRef.current?.focus()
  }

  const confirmarVenta = async () => {
    if (carrito.length === 0) return
    setProcesando(true)
    try {
      await window.api.ventas.crear({ items: carrito, total, descuento: 0, medio_pago: medioPago })
      setMensaje({ tipo: 'ok', texto: `Venta confirmada: ${formatPrecio(total)}` })
      limpiarCarrito()
      setTimeout(() => setMensaje(null), 3000)
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message })
      setTimeout(() => setMensaje(null), 4000)
    } finally {
      setProcesando(false)
    }
  }

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter' && busqueda) {
      const exacto = await window.api.productos.buscarCodigo(busqueda)
      if (exacto) { agregarAlCarrito(exacto); return }
      if (resultados.length === 1) agregarAlCarrito(resultados[0])
    }
  }

  return (
    <div className="flex h-full">
      {/* Panel izquierdo: búsqueda + carrito */}
      <div className="flex-1 flex flex-col p-5 gap-4 overflow-hidden">
        {mensaje && (
          <div
            className={`px-4 py-2.5 rounded-lg text-sm font-medium ${
              mensaje.tipo === 'ok'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Búsqueda */}
        <div className="relative">
          <input
            ref={inputRef}
            value={busqueda}
            onChange={(e) => buscar(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar producto por nombre o código de barras..."
            className="input pr-10 text-base"
          />
          {busqueda && (
            <button
              onClick={() => { setBusqueda(''); setResultados([]); inputRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
          {resultados.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
              {resultados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => agregarAlCarrito(p)}
                  className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex justify-between items-center text-sm border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium">{p.nombre}</span>
                  <span className="text-blue-600 font-semibold">{formatPrecio(p.precio)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Carrito */}
        <div className="card flex-1 overflow-auto">
          {carrito.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Agregá productos para comenzar la venta
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium text-center">Cant.</th>
                  <th className="px-4 py-3 font-medium text-right">Precio</th>
                  <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {carrito.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{item.nombre}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => actualizarCantidad(idx, item.cantidad - 1)}
                          className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-sm font-bold"
                        >
                          −
                        </button>
                        <span className="w-8 text-center">{item.cantidad}</span>
                        <button
                          onClick={() => actualizarCantidad(idx, item.cantidad + 1)}
                          className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-sm font-bold"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{formatPrecio(item.precio)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {formatPrecio(item.precio * item.cantidad)}
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        onClick={() => eliminarItem(idx)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Panel derecho: cobro */}
      <div className="w-72 bg-white border-l border-gray-200 flex flex-col p-5 gap-4">
        <h2 className="text-base font-semibold text-gray-700">Resumen</h2>

        <div className="flex-1 space-y-2 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Items</span>
            <span>{carrito.reduce((s, i) => s + i.cantidad, 0)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Productos</span>
            <span>{carrito.length}</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600 font-medium">Total</span>
            <span className="text-2xl font-bold text-gray-900">{formatPrecio(total)}</span>
          </div>

          <p className="text-xs text-gray-500 mb-2 font-medium">Medio de pago</p>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {MEDIOS_PAGO.map((mp) => (
              <button
                key={mp.value}
                onClick={() => setMedioPago(mp.value)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                  medioPago === mp.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {mp.label}
              </button>
            ))}
          </div>

          <button
            onClick={confirmarVenta}
            disabled={carrito.length === 0 || procesando}
            className="btn-success w-full py-3 text-base"
          >
            {procesando ? 'Procesando...' : 'Cobrar'}
          </button>

          {carrito.length > 0 && (
            <button onClick={limpiarCarrito} className="btn-secondary w-full mt-2">
              Cancelar venta
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
