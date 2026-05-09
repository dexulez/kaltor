'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCLP } from '@/lib/calculations'

interface RepuestoItem {
  id: string
  nombre: string
  cantidad: number
  precio_costo: number
  costo_envio: number
  product_id: string | null
}

interface Producto {
  id: string
  nombre: string
  sku: string | null
  precio_costo: number
  costo_envio: number
  stock_actual: number
}

export default function RepuestosOT({ otId, repuestosIniciales }: { otId: string; repuestosIniciales: RepuestoItem[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [repuestos, setRepuestos] = useState<RepuestoItem[]>(repuestosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [showBusqueda, setShowBusqueda] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const q = busqueda.toLowerCase().trim()
  const filtrados = q.length >= 1
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      ).slice(0, 8)
    : []

  useEffect(() => {
    if (!showBusqueda) return
    supabase.from('products').select('id, nombre, sku, precio_costo, costo_envio, stock_actual')
      .eq('activo', true).order('nombre').limit(200)
      .then(({ data }) => setProductos((data ?? []) as Producto[]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBusqueda])

  async function agregarProducto(p: Producto) {
    const existe = repuestos.find(r => r.product_id === p.id)
    if (existe) {
      // Incrementar cantidad
      await cambiarCantidad(existe.id, existe.cantidad + 1)
      setBusqueda('')
      return
    }
    setGuardando(true)
    const { data, error } = await supabase.from('repair_items').insert({
      repair_order_id: otId,
      product_id: p.id,
      nombre: p.nombre,
      cantidad: 1,
      precio_costo: p.precio_costo ?? 0,
      costo_envio: p.costo_envio ?? 0,
    }).select().single()
    if (error) { toast.error('Error al agregar repuesto'); setGuardando(false); return }
    setRepuestos(prev => [...prev, data as RepuestoItem])
    setBusqueda('')
    toast.success(`${p.nombre} agregado`)
    setGuardando(false)
    router.refresh()
  }

  async function cambiarCantidad(id: string, nuevaCantidad: number) {
    if (nuevaCantidad < 1) { await eliminar(id); return }
    const { error } = await supabase.from('repair_items').update({ cantidad: nuevaCantidad }).eq('id', id)
    if (error) { toast.error('Error'); return }
    setRepuestos(prev => prev.map(r => r.id === id ? { ...r, cantidad: nuevaCantidad } : r))
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('repair_items').delete().eq('id', id)
    if (error) { toast.error('Error al quitar repuesto'); return }
    setRepuestos(prev => prev.filter(r => r.id !== id))
    toast.success('Repuesto quitado')
    router.refresh()
  }

  const totalRepuestos = repuestos.reduce((s, r) => s + (r.precio_costo + r.costo_envio) * r.cantidad, 0)

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-800">Repuestos utilizados</h2>
          <p className="text-xs text-gray-400">Agrega piezas o materiales usados en la reparación</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowBusqueda(s => !s)} className="gap-1">
          {showBusqueda ? '✕ Cerrar' : '+ Agregar repuesto'}
        </Button>
      </div>

      {/* Buscador de productos */}
      {showBusqueda && (
        <div className="mb-4 relative">
          <Input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o SKU..."
            autoFocus
            className="mb-1"
          />
          {filtrados.length > 0 && (
            <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              {filtrados.map(p => (
                <button
                  key={p.id}
                  onClick={() => agregarProducto(p)}
                  disabled={guardando}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 text-left border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                    <p className="text-xs text-gray-400">{p.sku ?? ''} · Stock: {p.stock_actual}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-700 ml-3 shrink-0">
                    {formatCLP(p.precio_costo)}
                  </span>
                </button>
              ))}
            </div>
          )}
          {busqueda.length >= 1 && filtrados.length === 0 && (
            <p className="text-xs text-gray-400 px-1 mt-1">Sin resultados. Prueba con otro nombre o SKU.</p>
          )}
        </div>
      )}

      {/* Lista de repuestos */}
      {repuestos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Sin repuestos registrados</p>
      ) : (
        <div className="space-y-2">
          {repuestos.map(r => (
            <div key={r.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{r.nombre}</p>
                <p className="text-xs text-gray-400">{formatCLP(r.precio_costo + r.costo_envio)} c/u</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => cambiarCantidad(r.id, r.cantidad - 1)}
                  className="w-7 h-7 rounded border border-gray-300 bg-white hover:bg-gray-100 text-sm font-bold flex items-center justify-center">−</button>
                <span className="text-sm font-semibold w-6 text-center">{r.cantidad}</span>
                <button onClick={() => cambiarCantidad(r.id, r.cantidad + 1)}
                  className="w-7 h-7 rounded border border-gray-300 bg-white hover:bg-gray-100 text-sm font-bold flex items-center justify-center">+</button>
              </div>
              <span className="text-sm font-bold text-gray-700 shrink-0 w-20 text-right">
                {formatCLP((r.precio_costo + r.costo_envio) * r.cantidad)}
              </span>
              <button onClick={() => eliminar(r.id)}
                className="text-red-400 hover:text-red-600 text-sm shrink-0">✕</button>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t text-sm font-semibold text-gray-700">
            <span>Total repuestos</span>
            <span>{formatCLP(totalRepuestos)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
