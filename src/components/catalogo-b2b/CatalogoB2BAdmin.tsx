'use client'

import { useState } from 'react'
import ProductoB2BControl from '@/components/inventario/ProductoB2BControl'

interface ProductoInventario {
  id: string
  nombre: string
  sku: string | null
  precioMayorista: number | null
  stock: number
  visible: boolean
  categoria: string | null
}

export default function CatalogoB2BAdmin({ productos, puedeEditar }: { productos: ProductoInventario[]; puedeEditar: boolean }) {
  const [busqueda, setBusqueda] = useState('')

  const q = busqueda.trim().toLowerCase()
  const filtrados = q
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.categoria ?? '').toLowerCase().includes(q)
      )
    : productos

  return (
    <div className="space-y-4">
      <input
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="🔍 Buscar por nombre, SKU o categoría..."
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          <span className="text-4xl block mb-2">📦</span>
          <p className="text-sm">{productos.length === 0 ? 'No hay productos activos en el inventario' : 'Sin resultados para tu búsqueda'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrados.map(p => (
            <div
              key={p.id}
              className={`bg-white rounded-xl border p-4 flex flex-col gap-2 transition-opacity ${p.visible ? 'border-blue-200' : 'opacity-50'}`}
            >
              <div>
                <p className={`font-medium text-sm ${p.visible ? 'text-gray-900' : 'text-gray-400'}`}>{p.nombre}</p>
                <p className="text-xs text-gray-400">{[p.categoria, p.sku].filter(Boolean).join(' · ') || '—'}</p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">Stock: {p.stock}</span>
                <ProductoB2BControl
                  productId={p.id}
                  nombre={p.nombre}
                  precioMayorista={p.precioMayorista}
                  visibleCompradores={p.visible}
                  disabled={!puedeEditar}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
