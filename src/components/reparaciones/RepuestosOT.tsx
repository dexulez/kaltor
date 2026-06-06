'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCLP } from '@/lib/calculations'
import SolicitarRepuestoBtn from '@/components/reparaciones/SolicitarRepuestoBtn'
import GenerarOCBtn from '@/components/reparaciones/GenerarOCBtn'
import { soundAdd, soundRemove, soundError } from '@/lib/sounds'

interface RepuestoItem {
  id: string
  nombre: string
  cantidad: number
  precio_costo: number
  precio_venta?: number
  costo_envio: number
  product_id: string | null
}

interface Producto {
  id: string
  nombre: string
  sku: string | null
  precio_costo: number
  precio_venta: number
  costo_envio: number
  stock_actual: number
  product_categories: { nombre: string }[] | { nombre: string } | null
}

export default function RepuestosOT({ otId, otNumero, repuestosIniciales }: { otId: string; otNumero: string; repuestosIniciales: RepuestoItem[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [repuestos, setRepuestos] = useState<RepuestoItem[]>(repuestosIniciales)
  const [busqueda, setBusqueda] = useState('')
  const [filtroStock, setFiltroStock] = useState<'todos' | 'con_stock' | 'sin_stock'>('todos')
  const [productos, setProductos] = useState<Producto[]>([])
  const [showBusqueda, setShowBusqueda] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const q = busqueda.toLowerCase().trim()
  const filtrados = (q.length >= 1
    ? productos.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      )
    : productos
  ).filter(p =>
    filtroStock === 'todos' ? true :
    filtroStock === 'con_stock' ? p.stock_actual > 0 :
    p.stock_actual === 0
  ).slice(0, 10)

  useEffect(() => {
    if (!showBusqueda) return
    supabase.from('products')
      .select('id, nombre, sku, precio_costo, precio_venta, costo_envio, stock_actual, product_categories(nombre)')
      .eq('activo', true).order('nombre').limit(400)
      .then(({ data }) => {
        const todos = (data ?? []) as Producto[]
        // Solo mostrar productos cuya categoría contenga "repuesto" (insensible a mayúsculas)
        const getNombreCat = (cat: Producto['product_categories']) => {
          if (!cat) return ''
          const c = Array.isArray(cat) ? cat[0] : cat
          return c?.nombre ?? ''
        }
        const repuestos = todos.filter(p =>
          getNombreCat(p.product_categories).toLowerCase().includes('repuesto')
        )
        setProductos(repuestos.length > 0 ? repuestos : todos)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBusqueda])

  // Recalcula precio_servicio de la OT = repuestos (precio_venta) + servicios (precio_base)
  async function recalcularPrecioOT(nuevosRepuestos: RepuestoItem[]) {
    const totalItems = nuevosRepuestos.reduce((s, r) => s + (r.precio_venta ?? 0) * r.cantidad, 0)
    const { data: servicios } = await supabase
      .from('repair_order_services')
      .select('repair_services(precio_base)')
      .eq('repair_order_id', otId)
    const totalServicios = (servicios ?? []).reduce((s: number, srv: Record<string, unknown>) => {
      const rs = Array.isArray(srv.repair_services)
        ? (srv.repair_services as Array<{ precio_base: number }>)[0]
        : srv.repair_services as { precio_base: number } | null
      return s + (rs?.precio_base ?? 0)
    }, 0)
    await supabase.from('repair_orders')
      .update({ precio_servicio: totalItems + totalServicios })
      .eq('id', otId)
    router.refresh()
  }

  async function agregarProducto(p: Producto) {
    const existe = repuestos.find(r => r.product_id === p.id)
    if (existe) {
      await cambiarCantidad(existe.id, existe.cantidad + 1)
      setBusqueda('')
      return
    }
    setGuardando(true)

    const basePayload = {
      repair_order_id: otId,
      product_id: p.id,
      nombre: p.nombre,
      cantidad: 1,
      precio_costo: p.precio_costo ?? 0,
      costo_envio: p.costo_envio ?? 0,
    }

    let { data, error } = await supabase.from('repair_items').insert({
      ...basePayload,
      precio_venta: p.precio_venta ?? 0,
    }).select().single()

    // Si falla por precio_venta (columna no existe), reintentar sin ella
    if (error?.message?.includes('precio_venta')) {
      const r2 = await supabase.from('repair_items').insert(basePayload).select().single()
      data = r2.data; error = r2.error
    }

    if (error) { soundError(); toast.error('Error al agregar repuesto: ' + error.message); setGuardando(false); return }
    const nuevos = [...repuestos, data as RepuestoItem]
    setRepuestos(nuevos)
    setBusqueda('')
    soundAdd(); toast.success(`${p.nombre} agregado`)
    setGuardando(false)
    await recalcularPrecioOT(nuevos)
  }

  async function cambiarCantidad(id: string, nuevaCantidad: number) {
    if (nuevaCantidad < 1) { await eliminar(id); return }
    const { error } = await supabase.from('repair_items').update({ cantidad: nuevaCantidad }).eq('id', id)
    if (error) { toast.error('Error'); return }
    const nuevos = repuestos.map(r => r.id === id ? { ...r, cantidad: nuevaCantidad } : r)
    setRepuestos(nuevos)
    await recalcularPrecioOT(nuevos)
  }

  async function eliminar(id: string) {
    const { error } = await supabase.from('repair_items').delete().eq('id', id)
    if (error) { soundError(); toast.error('Error al quitar repuesto'); return }
    const nuevos = repuestos.filter(r => r.id !== id)
    setRepuestos(nuevos)
    soundRemove(); toast.success('Repuesto quitado')
    await recalcularPrecioOT(nuevos)
  }

  const totalRepuestos = repuestos.reduce((s, r) => s + (r.precio_venta ?? r.precio_costo) * r.cantidad, 0)

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-800">Repuestos utilizados</h2>
          <p className="text-xs text-gray-400">Agrega piezas o materiales usados en la reparación</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <GenerarOCBtn otId={otId} otNumero={otNumero} />
          <Link href={`/inventario/nuevo?returnTo=/reparaciones/${otId}`}>
            <Button size="sm" variant="outline" className="gap-1 text-green-700 border-green-300 hover:bg-green-50">
              ➕ Nuevo repuesto
            </Button>
          </Link>
          <Button size="sm" variant="outline" onClick={() => setShowBusqueda(s => !s)} className="gap-1">
            {showBusqueda ? '✕ Cerrar' : '+ Agregar repuesto'}
          </Button>
        </div>
      </div>

      {/* Buscador de productos */}
      {showBusqueda && (
        <div className="mb-4 relative">
          <div className="flex gap-2 mb-1">
            <Input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              autoFocus
              className="flex-1"
            />
            <select
              value={filtroStock}
              onChange={e => setFiltroStock(e.target.value as typeof filtroStock)}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-600 shrink-0"
            >
              <option value="todos">Todos</option>
              <option value="con_stock">Con stock</option>
              <option value="sin_stock">Sin stock</option>
            </select>
          </div>
          {(q.length >= 1 || filtroStock !== 'todos') && filtrados.length > 0 && (
            <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              {filtrados.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0 hover:bg-blue-50">
                  <button
                    onClick={() => agregarProducto(p)}
                    disabled={guardando}
                    className="flex-1 flex items-center justify-between text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                      <p className={`text-xs ${p.stock_actual === 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {p.sku ? `${p.sku} · ` : ''}Stock: {p.stock_actual === 0 ? 'Sin stock' : p.stock_actual}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-blue-700 ml-3 shrink-0">
                      {formatCLP(p.precio_venta)}
                    </span>
                  </button>
                  {p.stock_actual === 0 && (
                    <div className="ml-2 shrink-0">
                      <SolicitarRepuestoBtn
                        otNumero={otNumero}
                        producto={{ id: p.id, nombre: p.nombre, precio_costo: p.precio_costo }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {(q.length >= 1 || filtroStock !== 'todos') && filtrados.length === 0 && (
            <p className="text-xs text-gray-400 px-1 mt-1">Sin resultados. Prueba otro nombre o cambia el filtro.</p>
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
                <p className="text-xs text-gray-400">Venta: {formatCLP(r.precio_venta ?? r.precio_costo)} c/u</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => cambiarCantidad(r.id, r.cantidad - 1)}
                  className="w-7 h-7 rounded border border-gray-300 bg-white hover:bg-gray-100 text-sm font-bold flex items-center justify-center">−</button>
                <span className="text-sm font-semibold w-6 text-center">{r.cantidad}</span>
                <button onClick={() => cambiarCantidad(r.id, r.cantidad + 1)}
                  className="w-7 h-7 rounded border border-gray-300 bg-white hover:bg-gray-100 text-sm font-bold flex items-center justify-center">+</button>
              </div>
              <span className="text-sm font-bold text-gray-700 shrink-0 w-20 text-right">
                {formatCLP((r.precio_venta ?? r.precio_costo) * r.cantidad)}
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
