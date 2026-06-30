'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { calcularPrecioMayoristaConDescuento } from '@/lib/calculations'

interface ProductoCatalogo {
  id: string
  nombre: string
  descripcion: string | null
  sku: string | null
  precio: number
  stock: number
  categoria: string | null
  descuentoTipo?: 'porcentaje' | 'monto' | null
  descuentoValor?: number | null
  descuentoDesdeCantidad?: number | null
}

function precioUnitarioPara(p: ProductoCatalogo, cantidad: number) {
  return calcularPrecioMayoristaConDescuento(p.precio, cantidad, {
    tipo: p.descuentoTipo, valor: p.descuentoValor, desdeCantidad: p.descuentoDesdeCantidad,
  })
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
}

export default function CatalogoB2BCarrito({ productos, ivaPct = 19, mostrarStock = true }: { productos: ProductoCatalogo[]; ivaPct?: number; mostrarStock?: boolean }) {
  const router = useRouter()
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState<Record<string, number>>({})
  const [borrador, setBorrador] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [verConIva, setVerConIva] = useState(true)

  function mostrar(valor: number) {
    return verConIva ? valor : Math.round(valor / (1 + ivaPct / 100))
  }

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

  function quitarDelCarrito(id: string) {
    setCantidad(id, 0)
    setBorrador(prev => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id)))
  }

  function confirmarAgregar(id: string) {
    const cantidad = parseInt(borrador[id] ?? '1') || 1
    setCantidad(id, cantidad)
  }

  const itemsCarrito = useMemo(() =>
    Object.entries(carrito)
      .map(([id, cantidad]) => ({ producto: productos.find(p => p.id === id), cantidad }))
      .filter((i): i is { producto: ProductoCatalogo; cantidad: number } => !!i.producto)
  , [carrito, productos])

  const totalCarrito = itemsCarrito.reduce((s, i) => s + precioUnitarioPara(i.producto, i.cantidad) * i.cantidad, 0)

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
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar por nombre, SKU o categoría..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <select
            value={verConIva ? 'con' : 'sin'}
            onChange={e => setVerConIva(e.target.value === 'con')}
            className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="con">Ver precios: con IVA</option>
            <option value="sin">Ver precios: sin IVA</option>
          </select>
        </div>

        {filtrados.length === 0 ? (
          <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
            <span className="text-4xl block mb-2">📦</span>
            <p className="text-sm">{productos.length === 0 ? 'Todavía no hay productos disponibles en el catálogo' : 'Sin resultados para tu búsqueda'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtrados.map(p => {
              const cantidad = carrito[p.id] ?? 0
              const enPedido = cantidad > 0
              const precioActual = precioUnitarioPara(p, cantidad)
              const tieneOferta = !!p.descuentoValor && p.descuentoValor > 0
              const ofertaActiva = tieneOferta && precioActual < p.precio
              const valorInput = borrador[p.id] ?? String(cantidad || 1)
              return (
                <div key={p.id} className={`bg-white rounded-xl border-2 p-4 flex flex-col gap-2 ${enPedido ? 'border-green-400 bg-green-50/40' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{p.nombre}</p>
                      <p className="text-xs text-gray-400">{[p.categoria, p.sku].filter(Boolean).join(' · ') || '—'}</p>
                    </div>
                    {enPedido && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white shrink-0 whitespace-nowrap">
                        ✓ EN TU PEDIDO
                      </span>
                    )}
                  </div>
                  {p.descripcion && <p className="text-xs text-gray-500 line-clamp-2">{p.descripcion}</p>}
                  {tieneOferta && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                      🏷️ Desde {p.descuentoDesdeCantidad ?? 1} unid.: {formatCLP(mostrar(calcularPrecioMayoristaConDescuento(p.precio, p.descuentoDesdeCantidad ?? 1, { tipo: p.descuentoTipo, valor: p.descuentoValor, desdeCantidad: p.descuentoDesdeCantidad })))} c/u
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div>
                      <p className={`font-bold ${ofertaActiva ? 'text-green-700' : 'text-blue-700'}`}>{formatCLP(mostrar(precioActual))}</p>
                      {ofertaActiva && <p className="text-xs text-gray-400 line-through">{formatCLP(mostrar(p.precio))}</p>}
                      {mostrarStock && (
                        <p className={`text-xs ${p.stock > 0 ? 'text-gray-400' : 'text-red-500'}`}>
                          {p.stock > 0 ? `Stock: ${p.stock}` : 'Sin stock'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min={1}
                        value={valorInput}
                        onChange={e => setBorrador(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-14 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <Button
                        type="button" size="sm"
                        className={enPedido ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
                        onClick={() => confirmarAgregar(p.id)}
                      >
                        {enPedido ? 'Actualizar' : '+ Agregar'}
                      </Button>
                      {enPedido && (
                        <button type="button" onClick={() => quitarDelCarrito(p.id)}
                          className="w-7 h-7 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-xs text-red-500 hover:bg-red-100 shrink-0">✕</button>
                      )}
                    </div>
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
              {itemsCarrito.map(i => {
                const precioUnit = precioUnitarioPara(i.producto, i.cantidad)
                return (
                  <div key={i.producto.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-800">{i.producto.nombre}</p>
                      <p className="text-xs text-gray-400">{i.cantidad} × {formatCLP(mostrar(precioUnit))}</p>
                    </div>
                    <p className="font-semibold text-gray-900 shrink-0">{formatCLP(mostrar(precioUnit * i.cantidad))}</p>
                  </div>
                )
              })}
            </div>
          )}
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Total estimado {!verConIva && <span className="text-xs text-gray-400 font-normal">(sin IVA)</span>}</span>
            <span className="font-bold text-lg text-blue-700">{formatCLP(mostrar(totalCarrito))}</span>
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
