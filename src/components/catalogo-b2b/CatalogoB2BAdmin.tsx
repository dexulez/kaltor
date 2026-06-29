'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')

  const q = busqueda.trim().toLowerCase()
  // Sin búsqueda: solo lo ya publicado (lista corta y manejable).
  // Con búsqueda: todo el inventario que coincida, para poder activar productos nuevos.
  const base = q
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.categoria ?? '').toLowerCase().includes(q)
      )
    : productos.filter(p => p.visible)

  const filtrados = [...base].sort((a, b) => Number(b.visible) - Number(a.visible))

  return (
    <div className="space-y-4">
      <input
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="🔍 Buscar por nombre, SKU o categoría..."
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      {!q && (
        <p className="text-xs text-gray-400">Mostrando solo los productos publicados en el catálogo. Escribe para buscar en todo el inventario.</p>
      )}

      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          <span className="text-4xl block mb-2">📦</span>
          <p className="text-sm">{q ? 'Sin resultados para tu búsqueda' : 'Todavía no hay productos publicados — busca para activar alguno'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrados.map(p => (
            <div
              key={p.id}
              onClick={() => router.push(`/inventario/${p.id}/editar`)}
              className={`bg-white rounded-xl border-2 p-4 flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow ${p.visible ? 'border-green-400' : 'border-gray-200'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{p.nombre}</p>
                  <p className="text-xs text-gray-400">{[p.categoria, p.sku].filter(Boolean).join(' · ') || '—'}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${p.visible ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {p.visible ? '✓ EN CATÁLOGO' : 'NO PUBLICADO'}
                </span>
              </div>
              <div
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100"
              >
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
