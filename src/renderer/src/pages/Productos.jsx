import { useState, useEffect } from 'react'

function formatPrecio(n) {
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

const FORM_VACIO = {
  nombre: '',
  codigo_barras: '',
  precio: '',
  stock: '',
  stock_minimo: '0',
  categoria_id: ''
}

export default function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null) // null | { modo: 'crear'|'editar', datos }
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const [prods, cats] = await Promise.all([
      window.api.productos.listar(),
      window.api.categorias.listar()
    ])
    setProductos(prods)
    setCategorias(cats)
  }

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.codigo_barras ?? '').includes(busqueda)
  )

  const abrirCrear = () => {
    setForm(FORM_VACIO)
    setError('')
    setModal({ modo: 'crear' })
  }

  const abrirEditar = (p) => {
    setForm({
      nombre: p.nombre,
      codigo_barras: p.codigo_barras ?? '',
      precio: String(p.precio),
      stock: String(p.stock),
      stock_minimo: String(p.stock_minimo),
      categoria_id: p.categoria_id ? String(p.categoria_id) : ''
    })
    setError('')
    setModal({ modo: 'editar', id: p.id })
  }

  const cerrarModal = () => setModal(null)

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.precio || isNaN(Number(form.precio))) { setError('Precio inválido'); return }

    setGuardando(true)
    setError('')
    try {
      const datos = {
        nombre: form.nombre.trim(),
        codigo_barras: form.codigo_barras.trim() || null,
        precio: Number(form.precio),
        stock: Number(form.stock) || 0,
        stock_minimo: Number(form.stock_minimo) || 0,
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null
      }

      if (modal.modo === 'crear') {
        await window.api.productos.crear(datos)
      } else {
        await window.api.productos.actualizar({ id: modal.id, ...datos })
      }

      await cargarDatos()
      cerrarModal()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    await window.api.productos.eliminar(id)
    await cargarDatos()
  }

  return (
    <div className="p-5 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Productos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{productos.length} productos registrados</p>
        </div>
        <button onClick={abrirCrear} className="btn-primary">
          + Nuevo producto
        </button>
      </div>

      {/* Búsqueda */}
      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre o código..."
        className="input max-w-sm"
      />

      {/* Tabla */}
      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 sticky top-0 bg-white">
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium text-right">Precio</th>
              <th className="px-4 py-3 font-medium text-center">Stock</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium">{p.nombre}</td>
                <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{p.codigo_barras ?? '—'}</td>
                <td className="px-4 py-2.5 text-gray-500">{p.categoria_nombre ?? '—'}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-blue-600">
                  {formatPrecio(p.precio)}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span
                    className={`badge ${
                      p.stock <= p.stock_minimo && p.stock_minimo > 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {p.stock}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => abrirEditar(p)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminar(p.id, p.nombre)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {productosFiltrados.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            {busqueda ? 'Sin resultados para la búsqueda' : 'No hay productos registrados'}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">
                {modal.modo === 'crear' ? 'Nuevo producto' : 'Editar producto'}
              </h2>
              <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
                <input name="nombre" value={form.nombre} onChange={handleChange} className="input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Código de barras</label>
                  <input name="codigo_barras" value={form.codigo_barras} onChange={handleChange} className="input font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
                  <select name="categoria_id" value={form.categoria_id} onChange={handleChange} className="input">
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Precio *</label>
                  <input name="precio" type="number" min="0" step="0.01" value={form.precio} onChange={handleChange} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stock</label>
                  <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stock mín.</label>
                  <input name="stock_minimo" type="number" min="0" value={form.stock_minimo} onChange={handleChange} className="input" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t">
              <button onClick={cerrarModal} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={guardar} disabled={guardando} className="btn-primary flex-1">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
