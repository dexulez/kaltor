'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ProductoCatalogo {
  id: string
  nombre: string
  descripcion: string | null
  sku: string | null
  precio: number
  stock: number
  categoria: string | null
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

export default function CatalogoB2BCarrito({ productos }: { productos: ProductoCatalogo[] }) {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState<Record<string, number>>({})
  const [enviando, setEnviando] = useState(false)

  const q = busqueda.trim().toLowerCase()
  const filtrados = q
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.categoria ?? '').toLowerCase().includes(q)
      )
    : productos

  function setCantidad(id: string, cantidad: number) {
    setCarrito(prev => {
      if (cantidad <= 0) {
        return Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id))
      }
      return { ...prev, [id]: cantidad }
    })
  }

  const itemsCarrito = useMemo(() =>
    Object.entries(carrito)
      .map(([id, cantidad]) => ({ producto: productos.find(p => p.id === id), cantidad }))
      .filter((i): i is { producto: ProductoCatalogo; cantidad: number } => !!i.producto)
  , [carrito, productos])

  const totalCarrito = itemsCarrito.reduce((s, i) => s + i.producto.precio * i.cantidad, 0)

  async function enviarPedido() {
    if (itemsCarrito.length === 0) { toast.error('Agrega al menos un producto'); return }
    setEnviando(true)
    try {
      const res = await fetch('/api/catalogo-b2b/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsCarrito.map(i => ({ productId: i.producto.id, cantidad: i.cantidad })) }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al enviar el pedido'); return }
      toast.success(`Pedido ${data.numero_pedido} enviado correctamente`)
      setCarrito({})
      router.push('/pedidos-b2b')
      router.refresh()
    } catch {
      toast.error('Error de conexión al enviar el pedido')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-4">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre, SKU o categoría..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {filtrados.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
            <span className="text-4xl block mb-2">📦</span>
            <p className="text-sm">{productos.length === 0 ? 'Todavía no hay productos disponibles en el catálogo' : 'Sin resultados para tu búsqueda'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtrados.map(p => {
              const cantidad = carrito[p.id] ?? 0
              return (
                <div key={p.id} className="bg-white rounded-xl border p-4 flex flex-col gap-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{p.nombre}</p>
                    <p className="text-xs text-gray-400">{[p.categoria, p.sku].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  {p.descripcion && <p className="text-xs text-gray-500 line-clamp-2">{p.descripcion}</p>}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div>
                      <p className="font-bold text-blue-700">{formatCLP(p.precio)}</p>
                      <p className={`text-xs ${p.stock > 0 ? 'text-gray-400' : 'text-red-500'}`}>
                        {p.stock > 0 ? `Stock: ${p.stock}` : 'Sin stock'}
                      </p>
                    </div>
                    {cantidad === 0 ? (
                      <Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setCantidad(p.id, 1)}>
                        + Agregar
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-2 py-1">
                        <button type="button" onClick={() => setCantidad(p.id, cantidad - 1)}
                          className="w-6 h-6 rounded-full bg-white border border-blue-300 flex items-center justify-center text-sm font-bold text-blue-700">−</button>
                        <span className="text-sm font-semibold text-blue-700 w-6 text-center">{cantidad}</span>
                        <button type="button" onClick={() => setCantidad(p.id, cantidad + 1)}
                          className="w-6 h-6 rounded-full bg-white border border-blue-300 flex items-center justify-center text-sm font-bold text-blue-700">+</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Carrito */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl border p-5 space-y-4 sticky top-6">
          <h2 className="font-semibold text-gray-800">🛒 Tu pedido</h2>
          {itemsCarrito.length === 0 ? (
            <p className="text-sm text-gray-400">Aún no agregaste productos.</p>
          ) : (
            <div className="space-y-2">
              {itemsCarrito.map(i => (
                <div key={i.producto.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800">{i.producto.nombre}</p>
                    <p className="text-xs text-gray-400">{i.cantidad} × {formatCLP(i.producto.precio)}</p>
                  </div>
                  <p className="font-semibold text-gray-900 shrink-0">{formatCLP(i.producto.precio * i.cantidad)}</p>
                </div>
              ))}
            </div>
          )}
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Total estimado</span>
            <span className="font-bold text-lg text-blue-700">{formatCLP(totalCarrito)}</span>
          </div>
          <Button
            type="button"
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={itemsCarrito.length === 0 || enviando}
            onClick={enviarPedido}
          >
            {enviando ? 'Enviando...' : 'Enviar pedido'}
          </Button>
          <p className="text-xs text-gray-400">El precio final se confirma al revisar tu pedido. Te avisaremos por WhatsApp.</p>
        </div>
      </div>
    </div>
  )
}
